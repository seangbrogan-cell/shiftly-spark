import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { X, GripVertical, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AssignmentWithDetails } from '@/hooks/use-calendar-data';
import { getShiftColor } from '@/lib/shift-colors';

interface ShiftCardProps {
  assignment: AssignmentWithDetails;
  onClick: () => void;
  onDelete: () => void;
}

export function ShiftCard({ assignment, onClick, onDelete }: ShiftCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: assignment.id,
    data: { assignment },
  });

  const color = getColorForShift(assignment.shift_id);

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const formatTime = (ts: string) => {
    try { return format(new Date(ts), 'h:mma'); } catch { return ''; }
  };

  const hasTime = assignment.actual_start && assignment.actual_end;
  const shiftName = assignment.shifts?.name ?? 'Shift';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded border ${color.bg} ${color.border} px-1.5 py-1 @container cursor-pointer transition-shadow hover:shadow-md ${isDragging ? 'shadow-lg ring-2 ring-primary/30' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1">
        <button
          {...listeners}
          {...attributes}
          className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground hidden @[80px]:block"
          onClick={(e) => e.stopPropagation()}
          aria-label="Drag to reassign"
        >
          <GripVertical className="h-3 w-3" />
        </button>

        <div className={`h-1.5 w-1.5 rounded-full ${color.dot} shrink-0`} />

        <div className={`text-[10px] leading-tight truncate flex-1 ${color.text}`}>
          {hasTime ? (
            <>
              <span className="hidden @[80px]:inline">
                {formatTime(assignment.actual_start!)}<br/>{formatTime(assignment.actual_end!)}
              </span>
              <span className="@[80px]:hidden">
                {formatTime(assignment.actual_start!)}
              </span>
            </>
          ) : (
            <span className="font-medium">{shiftName}</span>
          )}
        </div>

        {assignment.conflict_resolved && (
          <AlertTriangle className="h-2.5 w-2.5 text-warning shrink-0" />
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label="Delete assignment"
        >
          <X className="h-2.5 w-2.5" />
        </Button>
      </div>
    </div>
  );
}
