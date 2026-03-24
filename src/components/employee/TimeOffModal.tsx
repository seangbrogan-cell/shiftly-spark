import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const createRequest = useCreateTimeOffRequest();

  const resetForm = () => {
    setStartDate('');
    setEndDate('');
    setReason('');
    setNotes('');
    setErrors({});
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!startDate) errs.startDate = 'Start date is required';
    if (!endDate) errs.endDate = 'End date is required';
    if (startDate && endDate && endDate < startDate) errs.endDate = 'End date must be on or after start date';
    if (!reason.trim()) errs.reason = 'Reason is required';
    if (reason.trim().length > 500) errs.reason = 'Reason must be under 500 characters';
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
        reason: reason.trim(),
        notes: notes.trim() || null,
        status: 'pending',
      });

      // Send email notification to employer (best-effort)
      try {
        const [empRes, emailRes] = await Promise.all([
          supabase.from('employees').select('name').eq('id', employeeId).single(),
          supabase.rpc('get_employer_email', { _employer_id: employerId }),
        ]);

        const employeeName = empRes.data?.name || 'An employee';
        const employerEmail = emailRes.data;

        if (employerEmail) {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'time-off-request',
              recipientEmail: employerEmail,
              idempotencyKey: `time-off-${result.id}`,
              templateData: {
                employeeName,
                startDate: format(parseISO(startDate), 'MMM d, yyyy'),
                endDate: format(parseISO(endDate), 'MMM d, yyyy'),
                reason: reason.trim(),
                notes: notes.trim() || undefined,
              },
            },
          });
        }
      } catch (emailErr) {
        console.error('Failed to send time-off notification email:', emailErr);
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
            <Input id="tor-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Vacation, Personal day" />
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
