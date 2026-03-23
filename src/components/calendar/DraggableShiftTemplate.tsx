import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { GripVertical } from 'lucide-react';
import type { Shift } from '@/hooks/use-dashboard-data';

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

interface DraggableShiftTemplateProps {
  shift: Shift;
}

export function DraggableShiftTemplate({ shift }: DraggableShiftTemplateProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `template:${shift.id}`,
    data: { shiftTemplate: shift },
  });

  const color = getColorForShift(shift.id);

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const formatTime = (ts: string) => {
    try {
      return format(new Date(ts), 'h:mm a');
    } catch {
      return ts;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 rounded-md border ${color.bg} ${color.border} p-2.5 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${isDragging ? 'shadow-lg ring-2 ring-primary/30' : ''}`}
    >
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <div className={`h-2 w-2 rounded-full ${color.dot} shrink-0`} />
          <p className={`text-xs font-semibold truncate ${color.text}`}>{shift.name}</p>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
        </p>
      </div>
    </div>
  );
}
