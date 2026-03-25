import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDroppable } from '@dnd-kit/core';
import { LayoutGrid, Sunrise, Sun, Moon, CalendarOff, Plus, PanelRightClose, PanelRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Shift } from '@/hooks/use-dashboard-data';
import { DraggableShiftTemplate } from './DraggableShiftTemplate';

interface ShiftTemplateSidebarProps {
  shifts: Shift[];
  onAssignShift?: () => void;
}

type Period = 'allday' | 'morning' | 'afternoon' | 'evening';

const PERIODS: { key: Period; label: string; icon: typeof Sunrise; iconClass: string; borderClass: string; bgClass: string }[] = [
  { key: 'morning', label: 'Morning', icon: Sunrise, iconClass: 'text-amber-500', borderClass: 'border-amber-300 dark:border-amber-700', bgClass: 'bg-amber-50 dark:bg-amber-950/30' },
  { key: 'afternoon', label: 'Afternoon', icon: Sun, iconClass: 'text-amber-500', borderClass: 'border-amber-300 dark:border-amber-700', bgClass: 'bg-amber-50 dark:bg-amber-950/30' },
  { key: 'evening', label: 'Evening', icon: Moon, iconClass: 'text-amber-500', borderClass: 'border-amber-300 dark:border-amber-700', bgClass: 'bg-amber-50 dark:bg-amber-950/30' },
  { key: 'allday', label: 'Off Work', icon: CalendarOff, iconClass: 'text-amber-500', borderClass: 'border-amber-300 dark:border-amber-700', bgClass: 'bg-amber-50 dark:bg-amber-950/30' },
];

function getStartHour(shift: Shift): number {
  if ((shift as any).is_all_day || !shift.start_time) return -1;
  const d = new Date(shift.start_time);
  return d.getHours() + d.getMinutes() / 60;
}

export function ShiftTemplateSidebar({ shifts, onAssignShift }: ShiftTemplateSidebarProps) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: 'sidebar-templates' });

  const grouped = useMemo(() => {
    const groups: Record<Period, Shift[]> = { allday: [], morning: [], afternoon: [], evening: [] };
    shifts.forEach((s) => {
      if ((s as any).is_all_day || !s.start_time) { groups.allday.push(s); return; }
      const h = getStartHour(s);
      if (h >= 6 && h < 12) groups.morning.push(s);
      else if (h >= 12 && h < 18) groups.afternoon.push(s);
      else groups.evening.push(s);
    });
    return groups;
  }, [shifts]);

  return (
    <aside
      ref={setNodeRef}
      className={cn(
        'hidden lg:flex flex-col shrink-0 border-l border-border bg-card overflow-y-auto transition-all duration-200 print:hidden',
        collapsed ? 'w-12' : 'w-52',
        isOver && 'border-destructive/50 bg-destructive/5'
      )}
    >
      <div className="p-3 border-b border-border flex items-center justify-between gap-2">
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <LayoutGrid className="h-5 w-5 text-primary shrink-0" />
            <h3 className="font-semibold text-foreground truncate text-sm">Shift Templates</h3>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8 shrink-0', collapsed && 'mx-auto')}
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelRight className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
        </Button>
      </div>

      {!collapsed && (
        <div className="p-3 flex-1">
          <p className="text-xs text-muted-foreground mb-3">
            {isOver ? 'Drop to unassign shift' : 'Drag a shift onto the calendar to assign it.'}
          </p>
          {onAssignShift && (
            <Button size="sm" className="w-full mb-3" onClick={onAssignShift}>
              <Plus className="h-4 w-4 mr-1.5" /> Assign Shift
            </Button>
          )}
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
      )}
    </aside>
  );
}
