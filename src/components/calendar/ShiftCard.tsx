import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { X, GripVertical, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AssignmentWithDetails } from '@/hooks/use-calendar-data';
import { getShiftColor } from '@/lib/shift-colors';

interface ShiftCardProps {
  assignment: AssignmentWithDetails;
  onDelete: () => void;
}

export function ShiftCard({ assignment, onDelete }: ShiftCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: assignment.id,
    data: { assignment },
  });

  const color = getShiftColor(assignment.shifts ?? {});

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const formatTime = (ts: string, short = false) => {
    try {
      const d = new Date(ts);
      const minutes = d.getMinutes();
      const formatted = minutes === 0
        ? format(d, 'ha').toLowerCase()
        : format(d, 'h:mma').toLowerCase();
      return short ? formatted.replace('am', 'a').replace('pm', 'p') : formatted;
    } catch { return ''; }
  };

  const hasTime = assignment.actual_start && assignment.actual_end;
  const shiftName = assignment.shifts?.name ?? 'Shift';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`group relative rounded border ${color.bg} ${color.border} px-0.5 sm:px-1.5 py-1 @container cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${isDragging ? 'shadow-lg ring-2 ring-primary/30' : ''}`}
    >
      <div className="flex items-center gap-1">
        <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0 hidden @[80px]:block" />

        <div className={`text-xs leading-tight flex-1 ${color.text}`}>
          {hasTime ? (
            <div className="font-bold lg:whitespace-nowrap">
              <span className="sm:hidden">{formatTime(assignment.actual_start!, true)} – {formatTime(assignment.actual_end!, true)}</span>
              <span className="hidden sm:inline">{formatTime(assignment.actual_start!)} – {formatTime(assignment.actual_end!)}</span>
            </div>
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
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Delete assignment"
        >
          <X className="h-2.5 w-2.5" />
        </Button>
      </div>
    </div>
  );
}
