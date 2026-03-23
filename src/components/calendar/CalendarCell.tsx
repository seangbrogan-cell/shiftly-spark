import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface CalendarCellProps {
  id: string;
  children: React.ReactNode;
  isToday?: boolean;
  onClick?: () => void;
}

export function CalendarCell({ id, children, isToday, onClick }: CalendarCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        'min-h-[40px] sm:min-h-[52px] border-r border-b border-border p-0.5 transition-colors cursor-pointer',
        isOver && 'bg-primary/5 ring-2 ring-inset ring-primary/20',
        isToday && 'bg-primary-light/30'
      )}
    >
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}
