import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, startOfWeek } from 'date-fns';
import { Check, X, Clock, ChevronRight, ChevronLeft, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TimeOffCalendar } from './TimeOffCalendar';
import { useEmployees } from '@/hooks/use-dashboard-data';

interface TimeOffRequest {
  id: string;
  employee_id: string;
  employer_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  notes: string | null;
  status: string;
  created_at: string;
  suggested_replacement_id: string | null;
  employees: { name: string; email: string } | null;
  replacement: { name: string } | null;
}

interface Props {
  employerId: string;
}

function statusBadge(status: string) {
  switch (status) {
    case 'approved':
      return <Badge className="bg-green-600 hover:bg-green-700 text-white">Approved</Badge>;
    case 'denied':
      return <Badge variant="destructive">Denied</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200">Pending</Badge>;
  }
}

export function TimeOffRequestsManager({ employerId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<TimeOffRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [calendarWeek, setCalendarWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const { data: employees = [] } = useEmployees();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['employer-time-off-requests', employerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_off_requests')
        .select('*, employees!time_off_requests_employee_id_fkey(name, email), replacement:employees!time_off_requests_suggested_replacement_id_fkey(name)')
        .eq('employer_id', employerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as TimeOffRequest[];
    },
    enabled: !!employerId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, request, explanation }: { id: string; status: string; request: TimeOffRequest; explanation?: string }) => {
      const updateData: Record<string, string> = { status };
      if (explanation) {
        updateData.notes = explanation;
      }
      const { error } = await supabase
        .from('time_off_requests')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;

      try {
        const employeeEmail = request.employees?.email;
        const employeeName = request.employees?.name;
        if (employeeEmail) {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'time-off-decision',
              recipientEmail: employeeEmail,
              idempotencyKey: `time-off-decision-${id}-${status}`,
              templateData: {
                employeeName: employeeName || undefined,
                startDate: format(parseISO(request.start_date), 'MMM d, yyyy'),
                endDate: format(parseISO(request.end_date), 'MMM d, yyyy'),
                reason: request.reason,
                decision: status === 'approved' ? 'approved' : 'rejected',
                explanation: explanation || undefined,
              },
            },
          });
        }
      } catch (emailErr) {
        console.error('Failed to send time-off decision email:', emailErr);
      }
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ['employer-time-off-requests'] });
      qc.invalidateQueries({ queryKey: ['pending-time-off-count'] });
      qc.invalidateQueries({ queryKey: ['time-off-calendar'] });
      const label = status === 'approved' ? 'approved' : 'denied';
      toast({ title: `Request ${label}`, description: `The time-off request has been ${label}.` });
      setRejectTarget(null);
      setRejectReason('');
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update request.', variant: 'destructive' });
    },
  });

  const handleReject = () => {
    if (!rejectTarget) return;
    updateStatus.mutate({ id: rejectTarget.id, status: 'denied', request: rejectTarget, explanation: rejectReason || undefined });
  };

  const pending = requests.filter(r => r.status === 'pending');
  const resolved = requests.filter(r => r.status !== 'pending');

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex gap-0">
      {/* Main content */}
      <div className="flex-1 space-y-8 min-w-0">
        {/* Pending */}
        <section>
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Pending Requests ({pending.length})
          </h3>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending requests.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {pending.map(r => (
                <RequestCard
                  key={r.id}
                  request={r}
                  onApprove={() => updateStatus.mutate({ id: r.id, status: 'approved', request: r })}
                  onReject={() => { setRejectTarget(r); setRejectReason(''); }}
                  onDateClick={(date) => setCalendarWeek(startOfWeek(date, { weekStartsOn: 1 }))}
                />
              ))}
            </div>
          )}
        </section>

        {/* Time Off Calendar */}
        <section>
          <TimeOffCalendar employees={employees} employerId={employerId} weekOverride={calendarWeek} onWeekChange={setCalendarWeek} />
        </section>
      </div>

      {/* Past Requests Sidebar Toggle */}
      <div className="flex flex-col items-start ml-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-2 mt-1"
          title={sidebarOpen ? 'Hide past requests' : 'Show past requests'}
        >
          <History className="h-4 w-4" />
          {sidebarOpen ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
      </div>

      {/* Past Requests Sidebar */}
      {sidebarOpen && (
        <aside className="w-72 xl:w-80 shrink-0 border-l border-border pl-4 ml-2 hidden md:block">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            Past Requests ({resolved.length})
          </h3>
          {resolved.length === 0 ? (
            <p className="text-xs text-muted-foreground">No past requests.</p>
          ) : (
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="space-y-2 pr-2">
                {resolved.map(r => (
                  <RequestCard key={r.id} request={r} compact onDateClick={(date) => setCalendarWeek(startOfWeek(date, { weekStartsOn: 1 }))} />
                ))}
              </div>
            </ScrollArea>
          )}
        </aside>
      )}

      {/* Reject Modal */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deny Time-Off Request</DialogTitle>
            <DialogDescription>
              Denying request from <span className="font-semibold">{rejectTarget?.employees?.name}</span> for{' '}
              {rejectTarget && format(new Date(rejectTarget.start_date), 'MMM d')} – {rejectTarget && format(new Date(rejectTarget.end_date), 'MMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Explanation (optional)</Label>
            <Textarea
              id="reject-reason"
              placeholder="Provide a reason for denying this request..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? 'Denying...' : 'Deny Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestCard({ request: r, onApprove, onReject, onDateClick, compact }: { request: TimeOffRequest; onApprove?: () => void; onReject?: () => void; onDateClick?: (date: Date) => void; compact?: boolean }) {
  if (compact) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-sm text-foreground truncate">{r.employees?.name ?? 'Unknown'}</p>
            {statusBadge(r.status)}
          </div>
          {onDateClick ? (
            <button
              className="text-xs text-primary hover:underline cursor-pointer text-left"
              onClick={() => onDateClick(new Date(r.start_date))}
            >
              {format(new Date(r.start_date), 'MMM d')} – {format(new Date(r.end_date), 'MMM d, yyyy')}
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">
              {format(new Date(r.start_date), 'MMM d')} – {format(new Date(r.end_date), 'MMM d, yyyy')}
            </p>
          )}
          <p className="text-xs mt-1 truncate"><span className="font-medium">Reason:</span> {r.reason}</p>
          {r.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.notes}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-sm text-foreground truncate">{r.employees?.name ?? 'Unknown'}</p>
          {statusBadge(r.status)}
        </div>
        {onDateClick ? (
          <button
            className="text-xs text-primary hover:underline cursor-pointer text-left"
            onClick={() => onDateClick(new Date(r.start_date))}
          >
            {format(new Date(r.start_date), 'MMM d')} – {format(new Date(r.end_date), 'MMM d, yyyy')}
          </button>
        ) : (
          <p className="text-xs text-muted-foreground">
            {format(new Date(r.start_date), 'MMM d')} – {format(new Date(r.end_date), 'MMM d, yyyy')}
          </p>
        )}
        <p className="text-xs mt-1 truncate"><span className="font-medium">Reason:</span> {r.reason}</p>
        {r.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.notes}</p>}
        {r.replacement?.name && (
          <p className="text-xs text-muted-foreground mt-1 truncate">Replacement: {r.replacement.name}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">Submitted {format(new Date(r.created_at), 'MMM d, h:mm a')}</p>
        {onApprove && onReject && r.status === 'pending' && (
          <div className="flex gap-2 mt-2">
            <Button size="sm" className="gap-1 flex-1 h-7 text-xs" onClick={onApprove}>
              <Check className="h-3 w-3" /> Approve
            </Button>
            <Button size="sm" variant="destructive" className="gap-1 flex-1 h-7 text-xs" onClick={onReject}>
              <X className="h-3 w-3" /> Deny
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
