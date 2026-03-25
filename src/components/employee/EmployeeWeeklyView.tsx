import { useMemo } from 'react';
import { format, isToday, startOfWeek, addDays, differenceInMinutes } from 'date-fns';
import { getShiftColor } from '@/lib/shift-colors';
import { cn } from '@/lib/utils';
import type { EmployeeAssignment } from '@/hooks/use-employee-data';

interface EmployeeWeeklyViewProps {
  assignments: EmployeeAssignment[];
  weekStart: Date;
}

const formatTime = (ts: string | null, short = false) => {
  if (!ts) return '';
  const d = new Date(ts);
  const minutes = d.getMinutes();
  const formatted = minutes === 0
    ? format(d, 'ha').toLowerCase()
    : format(d, 'h:mma').toLowerCase();
  return short ? formatted.replace('am', 'a').replace('pm', 'p') : formatted;
};

const calcTotalHours = (assignments: EmployeeAssignment[]) => {
  let totalMin = 0;
  assignments.forEach((a) => {
    if (a.actual_start && a.actual_end) {
      totalMin += differenceInMinutes(new Date(a.actual_end), new Date(a.actual_start));
    }
  });
  return totalMin / 60;
};

const formatHours = (h: number) => {
  if (h === 0) return '—';
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`;
};

export function EmployeeWeeklyView({ assignments, weekStart }: EmployeeWeeklyViewProps) {
  const monday = startOfWeek(weekStart, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const byDate = useMemo(() => {
    const map: Record<string, EmployeeAssignment[]> = {};
    assignments.forEach((a) => {
      if (!map[a.assigned_date]) map[a.assigned_date] = [];
      map[a.assigned_date].push(a);
    });
    return map;
  }, [assignments]);

  const totalHours = useMemo(() => calcTotalHours(assignments), [assignments]);

  return (
    <div className="rounded-lg border border-border bg-card overflow-x-auto">
      {/* Day Headers */}
      <div className="grid grid-cols-[repeat(7,1fr)_36px] sm:grid-cols-[repeat(7,1fr)_46px] border-b border-border sticky top-0 bg-card z-10">
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              'px-0.5 sm:px-1 py-1 sm:py-1.5 text-center border-r border-border',
              isToday(day) && 'bg-primary-light/30'
            )}
          >
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">{format(day, 'EEE')}</p>
            <p className={cn('text-xs font-bold', isToday(day) ? 'text-primary' : 'text-foreground')}>
              {format(day, 'd')}
            </p>
          </div>
        ))}
        <div className="px-0.5 py-1 sm:py-1.5 text-center flex items-center justify-center">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Hrs</span>
        </div>
      </div>

      {/* Day Cells */}
      <div className="grid grid-cols-[repeat(7,1fr)_36px] sm:grid-cols-[repeat(7,1fr)_46px]">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayAssignments = byDate[dateStr] ?? [];

          return (
            <div
              key={dateStr}
              className={cn(
                'px-0.5 py-0.5 border-r border-border min-h-[4rem] flex flex-col gap-0.5',
                isToday(day) && 'bg-primary-light/10'
              )}
            >
              {dayAssignments.map((a) => {
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
                      <>
                        <span className="text-[10px] font-bold sm:hidden">{formatTime(a.actual_start, true)} – {formatTime(a.actual_end, true)}</span>
                        <span className="text-[10px] font-bold hidden sm:inline">{formatTime(a.actual_start)} – {formatTime(a.actual_end)}</span>
                      </>
                    ) : (
                      <span className="font-medium truncate text-[10px]">{a.shifts?.name ?? 'Shift'}</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        <div className="px-0.5 py-0.5 min-h-[4rem] flex items-start justify-center pt-2">
          <span className="text-xs font-bold text-foreground">{formatHours(totalHours)}</span>
        </div>
      </div>
    </div>
  );
}
