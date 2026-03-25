import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type Status = 'draft' | 'published' | 'changes_pending' | 'no_schedule';

interface StatusBadgeProps {
  status: Status;
  publishedAt: string | null;
  hideTimestamp?: boolean;
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

export function StatusBadge({ status, publishedAt, hideTimestamp }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center justify-center h-7 px-2.5 text-xs font-medium rounded-md border ${config.className}`}>
      {config.label}
    </span>
  );
}

export function PublishedTimestamp({ publishedAt }: { publishedAt: string | null }) {
  if (!publishedAt) return null;
  return (
    <span className="text-[10px] sm:text-xs text-muted-foreground">
      Last published {format(new Date(publishedAt), 'MMM d, h:mm a')}
    </span>
  );
}