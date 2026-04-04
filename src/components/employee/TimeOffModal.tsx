import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCreateTimeOffRequest } from '@/hooks/use-employee-data';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';

interface TimeOffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employerId: string;
}

export function TimeOffModal({ open, onOpenChange, employeeId, employerId }: TimeOffModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const createRequest = useCreateTimeOffRequest();

  // Fetch employer's all-day shifts as time-off reason options
  const { data: timeOffTypes = [] } = useQuery({
    queryKey: ['time-off-types', employerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('id, name')
        .eq('employer_id', employerId)
        .eq('is_all_day', true)
        .order('sort_order');
      if (error) throw error;
      // Deduplicate by name (shifts exist per-workplace)
      const unique = Array.from(new Map((data || []).map(s => [s.name, s])).values());
      return unique;
    },
    enabled: !!employerId && open,
  });

  const resetForm = () => {
    setStartDate('');
    setEndDate('');
    setReason('');
    setCustomReason('');
    setNotes('');
    setErrors({});
  };

  const finalReason = reason === '__other__' ? customReason.trim() : reason.trim();

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!startDate) errs.startDate = 'Start date is required';
    if (!endDate) errs.endDate = 'End date is required';
    if (startDate && endDate && endDate < startDate) errs.endDate = 'End date must be on or after start date';
    if (!finalReason) errs.reason = 'Reason is required';
    else if (finalReason.length > 500) errs.reason = 'Reason must be under 500 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const result = await createRequest.mutateAsync({
        employee_id: employeeId,
        employer_id: employerId,
        start_date: startDate,
        end_date: endDate,
        reason: finalReason,
        notes: notes.trim() || null,
        status: 'pending',
      });

      // Send email notifications (best-effort)
      try {
        const empRes = await supabase.from('employees').select('name, email').eq('id', employeeId).single();
        const employeeName = empRes.data?.name || 'An employee';
        const employeeEmail = empRes.data?.email;

        const formattedStart = format(parseISO(startDate), 'MMM d, yyyy');
        const formattedEnd = format(parseISO(endDate), 'MMM d, yyyy');
        const trimmedReason = finalReason;

        // Send confirmation to employee
        if (employeeEmail) {
          supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'time-off-confirmation',
              recipientEmail: employeeEmail,
              idempotencyKey: `time-off-confirm-${result.id}`,
              templateData: {
                employeeName,
                startDate: formattedStart,
                endDate: formattedEnd,
                reason: trimmedReason,
              },
            },
          }).catch(err => console.error('Failed to send employee confirmation email:', err));
        }

        // Send notification to employer
        const emailRes = await supabase.rpc('get_employer_email', { _employer_id: employerId });
        const employerEmail = emailRes.data;
        if (employerEmail) {
          supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'time-off-request',
              recipientEmail: employerEmail,
              idempotencyKey: `time-off-${result.id}`,
              templateData: {
                employeeName,
                startDate: formattedStart,
                endDate: formattedEnd,
                reason: trimmedReason,
                notes: notes.trim() || undefined,
              },
            },
          }).catch(err => console.error('Failed to send employer notification email:', err));
        }
      } catch (emailErr) {
        console.error('Failed to send time-off notification emails:', emailErr);
      }

      toast({ title: 'Request submitted', description: 'Your time-off request is pending approval.' });
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Time Off</DialogTitle>
          <DialogDescription>Submit a time-off request for approval.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tor-start">Start Date *</Label>
              <Input id="tor-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              {errors.startDate && <p className="text-sm text-error">{errors.startDate}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tor-end">End Date *</Label>
              <Input id="tor-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || undefined} />
              {errors.endDate && <p className="text-sm text-error">{errors.endDate}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tor-reason">Reason *</Label>
            {timeOffTypes.length > 0 ? (
              <Select value={reason} onValueChange={(v) => { setReason(v); if (v !== '__other__') setCustomReason(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {timeOffTypes.map((t) => (
                    <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                  ))}
                  <SelectItem value="__other__">Other</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input id="tor-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Vacation, Personal day" />
            )}
            {reason === '__other__' && (
              <Input
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Please specify your reason..."
                className="mt-2"
              />
            )}
            {errors.reason && <p className="text-sm text-error">{errors.reason}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tor-notes">Notes</Label>
            <Textarea id="tor-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional additional details..." rows={3} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={createRequest.isPending}>
              {createRequest.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
