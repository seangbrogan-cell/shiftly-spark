import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { X, GripVertical, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AssignmentWithDetails } from '@/hooks/use-calendar-data';

// Color palette for shifts based on shift name hash
const SHIFT_COLORS = [
  { bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  { bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  { bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  { bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
  { bg: 'bg-cyan-50 dark:bg-cyan-950/40', border: 'border-cyan-200 dark:border-cyan-800', text: 'text-cyan-700 dark:text-cyan-300', dot: 'bg-cyan-500' },
];

function getColorForShift(shiftId: string) {
  let hash = 0;
  for (let i = 0; i < shiftId.length; i++) {
    hash = ((hash << 5) - hash + shiftId.charCodeAt(i)) | 0;
  }
  return SHIFT_COLORS[Math.abs(hash) % SHIFT_COLORS.length];
}

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-md border ${color.bg} ${color.border} p-2 cursor-pointer transition-shadow hover:shadow-md ${isDragging ? 'shadow-lg ring-2 ring-primary/30' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-1.5">
        <button
          {...listeners}
          {...attributes}
          className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
          aria-label="Drag to reassign"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className={`h-1.5 w-1.5 rounded-full ${color.dot} shrink-0`} />
            <p className={`text-xs font-semibold truncate ${color.text}`}>
              {assignment.shifts?.name ?? 'Shift'}
            </p>
          </div>
          {assignment.actual_start && assignment.actual_end && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {format(new Date(assignment.actual_start), 'h:mm a')} – {format(new Date(assignment.actual_end), 'h:mm a')}
            </p>
          )}
          {assignment.conflict_resolved && (
            <AlertTriangle className="h-3 w-3 text-warning mt-0.5" />
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label="Delete assignment"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
