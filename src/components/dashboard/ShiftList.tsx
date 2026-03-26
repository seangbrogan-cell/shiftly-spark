import { useState, useMemo } from 'react';
import { Clock, Pencil, Trash2, Sun, Sunrise, Moon, CalendarOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useDeleteShift, type Shift } from '@/hooks/use-dashboard-data';
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

function ShiftCard({ shift, onEdit, onDelete }: { shift: Shift; onEdit: () => void; onDelete: () => void }) {
  const allDay = isAllDay(shift);
  const color = getShiftColor({ color: (shift as any).color, is_all_day: allDay, start_time: shift.start_time });

  return (
    <div className={`group flex items-center gap-2 rounded-md border ${color.border} ${color.bg} p-2.5 transition-shadow hover:shadow-md`}>
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

export function ShiftList({ shifts, onEdit }: ShiftListProps) {
  const [deletingShift, setDeletingShift] = useState<Shift | null>(null);
  const deleteShift = useDeleteShift();
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
    return groups;
  }, [shifts]);

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
        {(['morning', 'afternoon', 'evening', 'allday'] as Period[]).map((period) => {
          const config = PERIOD_CONFIG[period];
          const Icon = config.icon;
          const periodShifts = grouped[period];

          return (
            <div key={period} className={`w-52 rounded-lg border ${config.borderClass} ${config.bgClass} p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`h-5 w-5 ${config.iconClass}`} />
                <h3 className="text-sm font-semibold text-foreground">{config.label}</h3>
                <span className="text-xs text-muted-foreground ml-auto">{periodShifts.length} shift{periodShifts.length !== 1 ? 's' : ''}</span>
              </div>
              {periodShifts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4 italic">No shifts</p>
              ) : (
                <div className="space-y-2">
                  {periodShifts.map((shift) => (
                    <ShiftCard
                      key={shift.id}
                      shift={shift}
                      onEdit={() => onEdit(shift)}
                      onDelete={() => setDeletingShift(shift)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!deletingShift} onOpenChange={(o) => { if (!o) setDeletingShift(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shift</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <span className="font-semibold text-foreground">{deletingShift?.name}</span>? This will also remove all assignments using this shift.
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
