import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type Status = 'draft' | 'published' | 'changes_pending' | 'no_schedule';

interface StatusBadgeProps {
  status: Status;
  publishedAt: string | null;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  no_schedule: {
    label: 'No Schedule',
    className: 'bg-muted text-muted-foreground border-border',
  },
  draft: {
    label: 'Draft',
    className: 'bg-warning/15 text-warning border-warning/30',
  },
  published: {
    label: 'Published',
    className: 'bg-success/15 text-success border-success/30',
  },
  changes_pending: {
    label: 'Changes Pending',
    className: 'bg-warning/15 text-warning border-warning/30',
  },
};

export function StatusBadge({ status, publishedAt }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center justify-center h-7 px-2.5 text-xs font-medium rounded-md border ${config.className}`}>
        {config.label}
      </span>
      {publishedAt && (
        <span className="text-xs text-muted-foreground">
          Last published {format(new Date(publishedAt), 'MMM d, h:mm a')}
        </span>
      )}
    </div>
  );
}
