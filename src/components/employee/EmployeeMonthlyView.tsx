import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday, isSameDay, differenceInMinutes } from 'date-fns';
import { Clock, X } from 'lucide-react';
import { getShiftColor } from '@/lib/shift-colors';
import { cn } from '@/lib/utils';
import type { EmployeeAssignment } from '@/hooks/use-employee-data';

interface EmployeeMonthlyViewProps {
  assignments: EmployeeAssignment[];
  monthDate: Date;
}

const formatTime = (ts: string | null) => {
  if (!ts) return '';
  return format(new Date(ts), 'h:mma').toLowerCase();
};

const formatHours = (h: number) => {
  if (h === 0) return '—';
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`;
};

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

  const weekHours = useMemo(() => {
    return weeks.map((week) => {
      let totalMin = 0;
      week.forEach((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        (byDate[dateStr] ?? []).forEach((a) => {
          if (a.actual_start && a.actual_end) {
            totalMin += differenceInMinutes(new Date(a.actual_end), new Date(a.actual_start));
          }
        });
      });
      return totalMin / 60;
    });
  }, [weeks, byDate]);

  const selectedAssignments = selectedDay
    ? byDate[format(selectedDay, 'yyyy-MM-dd')] ?? []
    : [];

  return (
    <div>
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-[repeat(7,1fr)_36px] sm:grid-cols-[repeat(7,1fr)_46px] border-b border-border sticky top-0 bg-card z-10">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="px-0.5 sm:px-1 py-1 sm:py-1.5 text-center border-r border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">{d}</p>
            </div>
          ))}
          <div className="px-0.5 py-1 sm:py-1.5 text-center flex items-center justify-center">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Hrs</span>
          </div>
        </div>

        {/* Calendar cells */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-[repeat(7,1fr)_36px] sm:grid-cols-[repeat(7,1fr)_46px]">
            {week.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayAssignments = byDate[dateStr] ?? [];
              const inMonth = isSameMonth(day, monthDate);
              const today = isToday(day);
              const isSelected = selectedDay && isSameDay(day, selectedDay);

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={cn(
                    'px-0.5 py-0.5 border-r border-b border-border min-h-[4rem] text-left transition-colors flex flex-col',
                    !inMonth && 'opacity-40',
                    today && 'bg-primary-light/10',
                    isSelected && 'ring-2 ring-primary/40',
                    'hover:bg-muted/50'
                  )}
                >
                  <div className="text-center mb-0.5">
                    <p className={cn('text-xs font-bold', today ? 'text-primary' : 'text-foreground')}>
                      {format(day, 'd')}
                    </p>
                  </div>
                  {dayAssignments.length > 0 && (
                    <div className="flex flex-col gap-0.5 flex-1">
                      {dayAssignments.slice(0, 2).map((a) => {
                        const color = getShiftColor({
                          color: a.shifts?.color ?? null,
                          is_all_day: a.shifts?.is_all_day ?? false,
                          start_time: a.shifts?.start_time ?? null,
                        });
                        return (
                          <div
                            key={a.id}
                            className={cn(
                              'rounded px-1 py-0.5 text-xs border flex-1',
                              color.bg,
                              color.border,
                              color.text
                            )}
                          >
                            {a.actual_start && a.actual_end ? (
                              <span className="text-[10px] font-bold">{formatTime(a.actual_start)} – {formatTime(a.actual_end)}</span>
                            ) : (
                              <span className="font-medium truncate text-[10px]">{a.shifts?.name ?? 'Shift'}</span>
                            )}
                          </div>
                        );
                      })}
                      {dayAssignments.length > 2 && (
                        <span className="text-[10px] text-muted-foreground pl-1">+{dayAssignments.length - 2} more</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
            <div className="px-0.5 py-0.5 border-b border-border min-h-[4rem] flex items-start justify-center pt-2">
              <span className="text-xs font-bold text-foreground">{formatHours(weekHours[wi])}</span>
            </div>
          </div>
        ))}
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
                const color = getShiftColor({
                  color: a.shifts?.color ?? null,
                  is_all_day: a.shifts?.is_all_day ?? false,
                  start_time: a.shifts?.start_time ?? null,
                });
                return (
                  <div key={a.id} className={cn('flex items-center gap-3 rounded-md border p-3', color.bg, color.border)}>
                    <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', color.dot)} />
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-semibold', color.text)}>{a.shifts?.name ?? 'Shift'}</p>
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
