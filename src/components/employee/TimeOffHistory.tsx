import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TimeOffRequest } from '@/hooks/use-employee-data';

const statusConfig = {
  pending: { label: 'Pending', className: 'bg-warning/15 text-warning border-warning/30' },
  approved: { label: 'Approved', className: 'bg-success/15 text-success border-success/30' },
  denied: { label: 'Denied', className: 'bg-error/15 text-error border-error/30' },
} as const;

interface TimeOffHistoryProps {
  requests: TimeOffRequest[];
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  isLoading: boolean;
}

export function TimeOffHistory({ requests, statusFilter, onStatusFilterChange, isLoading }: TimeOffHistoryProps) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Time-Off Requests</h2>
          <p className="text-sm text-muted-foreground mt-1">View your submitted requests and their status.</p>
        </div>
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">
            {statusFilter === 'all' ? 'No time-off requests yet.' : `No ${statusFilter} requests.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {requests.map((req) => {
            const config = statusConfig[req.status as keyof typeof statusConfig] ?? statusConfig.pending;
            return (
              <div key={req.id} className="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-medium text-foreground text-sm truncate">{req.reason}</p>
                  <Badge variant="outline" className={config.className}>
                    {config.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(req.start_date), 'MMM d, yyyy')}
                  {req.start_date !== req.end_date && ` – ${format(new Date(req.end_date), 'MMM d, yyyy')}`}
                </p>
                {req.notes && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{req.notes}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Submitted {format(new Date(req.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
