import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday, isSameDay } from 'date-fns';
import { Clock, X } from 'lucide-react';
import type { EmployeeAssignment } from '@/hooks/use-employee-data';

interface EmployeeMonthlyViewProps {
  assignments: EmployeeAssignment[];
  monthDate: Date;
}

// Same color logic as EmployeeWeeklyView
const SHIFT_COLORS = [
  { bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  { bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  { bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  { bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
  { bg: 'bg-cyan-50 dark:bg-cyan-950/40', border: 'border-cyan-200 dark:border-cyan-800', text: 'text-cyan-700 dark:text-cyan-300', dot: 'bg-cyan-500' },
];

function getColor(shiftId: string) {
  let hash = 0;
  for (let i = 0; i < shiftId.length; i++) hash = ((hash << 5) - hash + shiftId.charCodeAt(i)) | 0;
  return SHIFT_COLORS[Math.abs(hash) % SHIFT_COLORS.length];
}

export function EmployeeMonthlyView({ assignments, monthDate }: EmployeeMonthlyViewProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weeks: Date[][] = useMemo(() => {
    const result: Date[][] = [];
    let current = calendarStart;
    while (current <= calendarEnd) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(addDays(current, i));
      }
      result.push(week);
      current = addDays(current, 7);
    }
    return result;
  }, [calendarStart, calendarEnd]);

  const byDate = useMemo(() => {
    const map: Record<string, EmployeeAssignment[]> = {};
    assignments.forEach((a) => {
      if (!map[a.assigned_date]) map[a.assigned_date] = [];
      map[a.assigned_date].push(a);
    });
    return map;
  }, [assignments]);

  const selectedAssignments = selectedDay
    ? byDate[format(selectedDay, 'yyyy-MM-dd')] ?? []
    : [];

  return (
    <div>
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-3">
        {weeks.flat().map((day, idx) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayAssignments = byDate[dateStr] ?? [];
          const inMonth = isSameMonth(day, monthDate);
          const today = isToday(day);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const isFirstRow = idx < 7;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`
                rounded-lg border border-border p-2 min-h-[100px] text-left transition-colors
                ${!inMonth ? 'opacity-40' : ''}
                ${today ? 'bg-primary-light/30 border-primary/30' : 'bg-card'}
                ${isSelected ? 'ring-2 ring-primary/40' : ''}
                hover:bg-muted/50
              `}
            >
              <div className="text-center mb-1.5">
                {isFirstRow && (
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">{format(day, 'EEE')}</p>
                )}
                <p className={`text-sm font-bold ${today ? 'text-primary' : 'text-foreground'}`}>
                  {format(day, 'd')}
                </p>
              </div>
              {dayAssignments.length > 0 && (
                <div className="space-y-1">
                  {dayAssignments.slice(0, 2).map((a) => {
                    const color = getColor(a.shift_id);
                    return (
                      <div
                        key={a.id}
                        className={`rounded-md border ${color.bg} ${color.border} p-1`}
                      >
                        <div className="flex items-center gap-1">
                          <div className={`h-1.5 w-1.5 rounded-full ${color.dot} shrink-0`} />
                          <span className={`text-[9px] font-semibold leading-tight truncate ${color.text}`}>
                            {a.shifts?.name ?? 'Shift'}
                          </span>
                        </div>
                        {a.actual_start && a.actual_end && (
                          <div className="flex items-center gap-0.5 mt-0.5 pl-2.5">
                            <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                            <p className="text-[8px] leading-tight text-muted-foreground truncate">
                              {format(new Date(a.actual_start), 'h:mma')}–{format(new Date(a.actual_end), 'h:mma')}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {dayAssignments.length > 2 && (
                    <span className="text-[9px] text-muted-foreground pl-1">+{dayAssignments.length - 2} more</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail panel */}
      {selectedDay && (
        <div className="mt-4 rounded-lg border border-border bg-card p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">
              {format(selectedDay, 'EEEE, MMMM d')}
            </h3>
            <button onClick={() => setSelectedDay(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          {selectedAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shifts scheduled.</p>
          ) : (
            <div className="space-y-2">
              {selectedAssignments.map((a) => {
                const color = getColor(a.shift_id);
                return (
                  <div key={a.id} className={`flex items-center gap-3 rounded-md border ${color.bg} ${color.border} p-3`}>
                    <div className={`h-2.5 w-2.5 rounded-full ${color.dot} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${color.text}`}>{a.shifts?.name ?? 'Shift'}</p>
                      {a.actual_start && a.actual_end && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(a.actual_start), 'h:mm a')} – {format(new Date(a.actual_end), 'h:mm a')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
