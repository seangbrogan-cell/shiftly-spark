import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDroppable } from '@dnd-kit/core';
import { LayoutGrid, Sunrise, Sun, Moon, CalendarOff, PanelRightClose, PanelRight, ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Shift } from '@/hooks/use-dashboard-data';
import { DraggableShiftTemplate } from './DraggableShiftTemplate';

interface ShiftTemplateSidebarProps {
  shifts: Shift[];
}

type Period = 'allday' | 'morning' | 'afternoon' | 'evening';

const PERIODS_CONFIG: Record<Period, { label: string; icon: typeof Sunrise; iconClass: string; borderClass: string; bgClass: string }> = {
  morning: { label: 'Morning', icon: Sunrise, iconClass: 'text-amber-500', borderClass: 'border-amber-300 dark:border-amber-700', bgClass: 'bg-amber-50 dark:bg-amber-950/30' },
  afternoon: { label: 'Afternoon', icon: Sun, iconClass: 'text-amber-500', borderClass: 'border-amber-300 dark:border-amber-700', bgClass: 'bg-amber-50 dark:bg-amber-950/30' },
  evening: { label: 'Evening', icon: Moon, iconClass: 'text-amber-500', borderClass: 'border-amber-300 dark:border-amber-700', bgClass: 'bg-amber-50 dark:bg-amber-950/30' },
  allday: { label: 'Off Work', icon: CalendarOff, iconClass: 'text-amber-500', borderClass: 'border-amber-300 dark:border-amber-700', bgClass: 'bg-amber-50 dark:bg-amber-950/30' },
};

const DEFAULT_ORDER: Period[] = ['morning', 'afternoon', 'evening', 'allday'];
const STORAGE_KEY = 'shift-sidebar-period-order';
const COLLAPSED_KEY = 'shift-sidebar-collapsed-periods';
const SHIFT_ORDER_KEY = 'shift-list-order';
function loadOrder(): Period[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Period[];
      if (parsed.length === 4 && DEFAULT_ORDER.every(p => parsed.includes(p))) return parsed;
    }
  } catch {}
  return DEFAULT_ORDER;
}

function getStartHour(shift: Shift): number {
  if ((shift as any).is_all_day || !shift.start_time) return -1;
  const d = new Date(shift.start_time);
  return d.getHours() + d.getMinutes() / 60;
}

function loadCollapsedPeriods(): Set<Period> {
  try {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored) return new Set(JSON.parse(stored) as Period[]);
  } catch {}
  // Default: all periods start collapsed
  return new Set<Period>(['morning', 'afternoon', 'evening', 'allday']);
}

export function ShiftTemplateSidebar({ shifts }: ShiftTemplateSidebarProps) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [periodOrder, setPeriodOrder] = useState<Period[]>(loadOrder);
  const [collapsedPeriods, setCollapsedPeriods] = useState<Set<Period>>(loadCollapsedPeriods);
  const { setNodeRef, isOver } = useDroppable({ id: 'sidebar-templates' });

  const movePeriod = useCallback((index: number, direction: -1 | 1) => {
    setPeriodOrder(prev => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const togglePeriodCollapsed = useCallback((period: Period) => {
    setCollapsedPeriods(prev => {
      const next = new Set(prev);
      if (next.has(period)) next.delete(period); else next.add(period);
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const grouped = useMemo(() => {
    const groups: Record<Period, Shift[]> = { allday: [], morning: [], afternoon: [], evening: [] };
    shifts.forEach((s) => {
      if ((s as any).is_all_day || !s.start_time) { groups.allday.push(s); return; }
      const h = getStartHour(s);
      if (h >= 6 && h < 12) groups.morning.push(s);
      else if (h >= 12 && h < 18) groups.afternoon.push(s);
      else groups.evening.push(s);
    });

    // Apply saved sort order from Shifts tab
    try {
      const stored = localStorage.getItem(SHIFT_ORDER_KEY);
      if (stored) {
        const sortOrder = JSON.parse(stored) as Record<string, string[]>;
        for (const period of Object.keys(groups) as Period[]) {
          const savedIds = sortOrder[period];
          if (savedIds && savedIds.length > 0) {
            const shiftMap = new Map(groups[period].map(s => [s.id, s]));
            const sorted: Shift[] = [];
            for (const id of savedIds) {
              const s = shiftMap.get(id);
              if (s) { sorted.push(s); shiftMap.delete(id); }
            }
            shiftMap.forEach(s => sorted.push(s));
            groups[period] = sorted;
          }
        }
      }
    } catch {}

    return groups;
  }, [shifts]);

  return (
    <aside
      ref={setNodeRef}
      className={cn(
        'hidden lg:flex flex-col shrink-0 border-l border-border bg-card overflow-y-auto overflow-x-hidden transition-all duration-200 print:hidden',
        collapsed ? 'w-12' : 'w-52',
        isOver && 'border-destructive/50 bg-destructive/5'
      )}
    >
      <div className="p-3 border-b border-border flex items-center justify-between gap-2">
        {!collapsed && (
          <Button size="sm" variant="default" className="w-full" onClick={() => navigate('/dashboard?tab=shifts')}>
            <LayoutGrid className="h-4 w-4 mr-1.5" /> Shifts
          </Button>
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
          {shifts.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No shifts created yet. Add shifts in the Shifts tab.
            </p>
          ) : (
            <div className="space-y-3">
              {periodOrder.map((key, index) => {
                const config = PERIODS_CONFIG[key];
                const Icon = config.icon;
                const periodShifts = grouped[key];
                const isPeriodCollapsed = collapsedPeriods.has(key);
                return (
                  <div key={key} className={`rounded-md border ${config.borderClass} ${config.bgClass} p-2.5`}>
                    <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => togglePeriodCollapsed(key)}>
                      <ChevronRight className={cn('h-3 w-3 text-muted-foreground transition-transform', !isPeriodCollapsed && 'rotate-90')} />
                      <Icon className={`h-3.5 w-3.5 ${config.iconClass}`} />
                      <span className="text-xs font-semibold text-foreground flex-1">{config.label}</span>
                      <span className="text-[10px] text-muted-foreground">{periodShifts.length}</span>
                      <div className="flex" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => movePeriod(index, -1)}
                          disabled={index === 0}
                          className="p-0.5 rounded hover:bg-foreground/10 disabled:opacity-25 disabled:cursor-not-allowed transition-opacity"
                          aria-label={`Move ${config.label} up`}
                        >
                          <ChevronUp className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => movePeriod(index, 1)}
                          disabled={index === periodOrder.length - 1}
                          className="p-0.5 rounded hover:bg-foreground/10 disabled:opacity-25 disabled:cursor-not-allowed transition-opacity"
                          aria-label={`Move ${config.label} down`}
                        >
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                    {!isPeriodCollapsed && (
                      <div className="mt-2">
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
