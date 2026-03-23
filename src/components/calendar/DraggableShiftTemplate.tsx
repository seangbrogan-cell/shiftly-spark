import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { GripVertical } from 'lucide-react';
import type { Shift } from '@/hooks/use-dashboard-data';
import { getShiftColor } from '@/lib/shift-colors';

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

  const allDay = (shift as any).is_all_day === true;

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
          {allDay ? 'All Day' : `${formatTime(shift.start_time)} – ${formatTime(shift.end_time)}`}
        </p>
      </div>
    </div>
  );
}
