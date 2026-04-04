import { useState, useMemo, useCallback } from 'react';
import { Pencil, Trash2, Sun, Sunrise, Moon, CalendarOff, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { useDeleteShift, useBulkUpdateShiftOrder, type Shift } from '@/hooks/use-dashboard-data';
import { getShiftColor } from '@/lib/shift-colors';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ShiftListProps {
  shifts: Shift[];
  onEdit: (shift: Shift) => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function isAllDay(shift: Shift): boolean {
  return (shift as any).is_all_day === true;
}

function getStartHour(shift: Shift): number {
  if (!shift.start_time) return -1;
  const d = new Date(shift.start_time);
  return d.getHours() + d.getMinutes() / 60;
}

type Period = 'morning' | 'afternoon' | 'evening' | 'allday';

const PERIOD_CONFIG: Record<Period, { label: string; icon: typeof Sunrise; iconClass: string; borderClass: string; bgClass: string }> = {
  allday: { label: 'Off Work', icon: CalendarOff, iconClass: 'text-slate-500', borderClass: 'border-slate-200 dark:border-slate-700', bgClass: 'bg-slate-50 dark:bg-slate-950/30' },
  morning: { label: 'Morning', icon: Sunrise, iconClass: 'text-amber-500', borderClass: 'border-amber-200 dark:border-amber-800', bgClass: 'bg-amber-50 dark:bg-amber-950/30' },
  afternoon: { label: 'Afternoon', icon: Sun, iconClass: 'text-orange-500', borderClass: 'border-orange-200 dark:border-orange-800', bgClass: 'bg-orange-50 dark:bg-orange-950/30' },
  evening: { label: 'Evening', icon: Moon, iconClass: 'text-indigo-500', borderClass: 'border-indigo-200 dark:border-indigo-800', bgClass: 'bg-indigo-50 dark:bg-indigo-950/30' },
};

function SortableShiftCard({ shift, onEdit, onDelete }: { shift: Shift; onEdit: () => void; onDelete: () => void }) {
  const allDay = isAllDay(shift);
  const color = getShiftColor({ color: (shift as any).color, is_all_day: allDay, start_time: shift.start_time });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: shift.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 rounded-md border ${color.border} ${color.bg} p-2.5 transition-shadow hover:shadow-md ${isDragging ? 'shadow-lg ring-2 ring-primary/30' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <div className={`h-2 w-2 rounded-full ${color.dot} shrink-0`} />
          <p className={`text-xs font-semibold truncate ${color.text}`}>{shift.name}</p>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {allDay ? 'All Day' : `${formatTime(shift.start_time)} – ${formatTime(shift.end_time)}`}
        </p>
        {shift.notes && (
          <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{shift.notes}</p>
        )}
      </div>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function SortablePeriodGroup({
  period,
  shifts,
  onEdit,
  onDelete,
  onReorder,
}: {
  period: Period;
  shifts: Shift[];
  onEdit: (shift: Shift) => void;
  onDelete: (shift: Shift) => void;
  onReorder: (period: Period, oldIndex: number, newIndex: number) => void;
}) {
  const config = PERIOD_CONFIG[period];
  const Icon = config.icon;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = shifts.findIndex(s => s.id === active.id);
    const newIndex = shifts.findIndex(s => s.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(period, oldIndex, newIndex);
    }
  };

  return (
    <div className={`w-52 rounded-lg border ${config.borderClass} ${config.bgClass} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-5 w-5 ${config.iconClass}`} />
        <h3 className="text-sm font-semibold text-foreground">{config.label}</h3>
        <span className="text-xs text-muted-foreground ml-auto">{shifts.length} shift{shifts.length !== 1 ? 's' : ''}</span>
      </div>
      {shifts.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4 italic">No shifts</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={shifts.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {shifts.map((shift) => (
                <SortableShiftCard
                  key={shift.id}
                  shift={shift}
                  onEdit={() => onEdit(shift)}
                  onDelete={() => onDelete(shift)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

export function ShiftList({ shifts, onEdit }: ShiftListProps) {
  const [deletingShift, setDeletingShift] = useState<Shift | null>(null);
  const deleteShift = useDeleteShift();
  const bulkUpdateOrder = useBulkUpdateShiftOrder();
  const { toast } = useToast();

  const grouped = useMemo(() => {
    const groups: Record<Period, Shift[]> = { allday: [], morning: [], afternoon: [], evening: [] };
    shifts.forEach((s) => {
      if (isAllDay(s)) { groups.allday.push(s); return; }
      const h = getStartHour(s);
      if (h >= 6 && h < 12) groups.morning.push(s);
      else if (h >= 12 && h < 18) groups.afternoon.push(s);
      else groups.evening.push(s);
    });

    // Sort by sort_order from database
    for (const period of Object.keys(groups) as Period[]) {
      groups[period].sort((a, b) => ((a as any).sort_order ?? 0) - ((b as any).sort_order ?? 0));
    }

    return groups;
  }, [shifts]);

  const handleReorder = useCallback((period: Period, oldIndex: number, newIndex: number) => {
    const periodShifts = grouped[period];
    const reordered = arrayMove(periodShifts, oldIndex, newIndex);
    // Persist new sort_order to database
    const updates = reordered.map((s, i) => ({ id: s.id, sort_order: i }));
    bulkUpdateOrder.mutate(updates);
  }, [grouped, bulkUpdateOrder]);

  const handleDelete = async () => {
    if (!deletingShift) return;
    try {
      await deleteShift.mutateAsync(deletingShift.id);
      toast({ title: 'Shift deleted' });
      setDeletingShift(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (shifts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-muted-foreground">No shifts created yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-4">
        {(['morning', 'afternoon', 'evening', 'allday'] as Period[]).map((period) => (
          <SortablePeriodGroup
            key={period}
            period={period}
            shifts={grouped[period]}
            onEdit={onEdit}
            onDelete={setDeletingShift}
            onReorder={handleReorder}
          />
        ))}
      </div>

      <AlertDialog open={!!deletingShift} onOpenChange={(o) => { if (!o) setDeletingShift(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shift</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <span className="font-semibold text-foreground">{deletingShift?.name}</span>? This will also remove all assignments using this shift. <span className="font-bold text-destructive">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteShift.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
