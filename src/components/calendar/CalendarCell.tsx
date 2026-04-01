import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface CalendarCellProps {
  id: string;
  children: React.ReactNode;
  isToday?: boolean;
  unavailable?: boolean;
  unavailableLabel?: string;
  timeRestriction?: string;
  onClick?: () => void;
}

export function CalendarCell({ id, children, isToday, unavailable, unavailableLabel, timeRestriction, onClick }: CalendarCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: unavailable });

  return (
    <div
      ref={setNodeRef}
      onClick={unavailable ? undefined : onClick}
      className={cn(
        'min-h-[36px] sm:min-h-[46px] print:min-h-[38px] border-r border-b border-border p-0.5 transition-colors',
        unavailable
          ? 'bg-muted/60 cursor-not-allowed'
          : 'cursor-pointer',
        !unavailable && isOver && 'bg-primary/5 ring-2 ring-inset ring-primary/20',
        !unavailable && isToday && 'bg-primary-light/30'
      )}
    >
      {unavailable ? (
        <div className="flex items-center justify-center h-full">
          <span className="text-[10px] text-muted-foreground/50 select-none">{unavailableLabel ?? 'N/A'}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5 h-full">
          {timeRestriction && (
            <div className="text-[8px] sm:text-[9px] text-muted-foreground/70 text-center leading-tight font-medium truncate">
              {timeRestriction}
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
