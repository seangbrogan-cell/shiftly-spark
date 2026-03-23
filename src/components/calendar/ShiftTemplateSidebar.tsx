import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { LayoutGrid, Sunrise, Sun, Moon, CalendarOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Shift } from '@/hooks/use-dashboard-data';
import { DraggableShiftTemplate } from './DraggableShiftTemplate';

interface ShiftTemplateSidebarProps {
  shifts: Shift[];
}

type Period = 'allday' | 'morning' | 'afternoon' | 'evening';

const PERIODS: { key: Period; label: string; icon: typeof Sunrise; iconClass: string; borderClass: string; bgClass: string }[] = [
  { key: 'allday', label: 'All Day', icon: CalendarOff, iconClass: 'text-slate-500', borderClass: 'border-slate-200 dark:border-slate-700', bgClass: 'bg-slate-50/50 dark:bg-slate-950/20' },
  { key: 'morning', label: 'Morning', icon: Sunrise, iconClass: 'text-amber-500', borderClass: 'border-amber-200 dark:border-amber-800', bgClass: 'bg-amber-50/50 dark:bg-amber-950/20' },
  { key: 'afternoon', label: 'Afternoon', icon: Sun, iconClass: 'text-orange-500', borderClass: 'border-orange-200 dark:border-orange-800', bgClass: 'bg-orange-50/50 dark:bg-orange-950/20' },
  { key: 'evening', label: 'Evening', icon: Moon, iconClass: 'text-indigo-500', borderClass: 'border-indigo-200 dark:border-indigo-800', bgClass: 'bg-indigo-50/50 dark:bg-indigo-950/20' },
];

function getStartHour(shift: Shift): number {
  if ((shift as any).is_all_day || !shift.start_time) return -1;
  const d = new Date(shift.start_time);
  return d.getHours() + d.getMinutes() / 60;
}

export function ShiftTemplateSidebar({ shifts }: ShiftTemplateSidebarProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'sidebar-templates' });

  const grouped = useMemo(() => {
    const groups: Record<Period, Shift[]> = { morning: [], afternoon: [], evening: [] };
    shifts.forEach((s) => {
      const h = getStartHour(s);
      if (h >= 6 && h < 12) groups.morning.push(s);
      else if (h >= 12 && h < 18) groups.afternoon.push(s);
      else groups.evening.push(s);
    });
    return groups;
  }, [shifts]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-lg border border-border bg-card p-4 transition-colors',
        isOver && 'border-destructive/50 bg-destructive/5'
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <LayoutGrid className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Shift Templates</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        {isOver ? 'Drop to unassign shift' : 'Drag a shift onto the calendar to assign it.'}
      </p>
      {shifts.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No shifts created yet. Add shifts in the Shifts tab.
        </p>
      ) : (
        <div className="space-y-3">
          {PERIODS.map(({ key, label, icon: Icon, iconClass, borderClass, bgClass }) => {
            const periodShifts = grouped[key];
            return (
              <div key={key} className={`rounded-md border ${borderClass} ${bgClass} p-2.5`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
                  <span className="text-xs font-semibold text-foreground">{label}</span>
                </div>
                {periodShifts.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-1 italic">No shifts</p>
                ) : (
                  <div className="space-y-1.5">
                    {periodShifts.map((shift) => (
                      <DraggableShiftTemplate key={shift.id} shift={shift} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
