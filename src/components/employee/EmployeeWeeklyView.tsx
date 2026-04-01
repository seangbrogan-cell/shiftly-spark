import { useMemo } from 'react';
import { format, isToday, startOfWeek, addDays, differenceInMinutes } from 'date-fns';
import { Palmtree } from 'lucide-react';
import { getShiftColor } from '@/lib/shift-colors';
import { cn } from '@/lib/utils';
import type { EmployeeAssignment } from '@/hooks/use-employee-data';

interface EmployeeWeeklyViewProps {
  assignments: EmployeeAssignment[];
  weekStart: Date;
  timeOffDates?: Map<string, string>;
}

const formatTime = (ts: string | null, short = false) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (short) {
    const minutes = d.getMinutes();
    const formatted = minutes === 0
      ? format(d, 'ha').toLowerCase()
      : format(d, 'h:mma').toLowerCase();
    return formatted.replace('am', 'a').replace('pm', 'p');
  }
  return format(d, 'h:mma').toLowerCase();
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

export function EmployeeWeeklyView({ assignments, weekStart, timeOffDates }: EmployeeWeeklyViewProps) {
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
          const isOnLeave = timeOffDates?.has(dateStr);

          return (
            <div
              key={dateStr}
              className={cn(
                'px-0.5 py-0.5 border-r border-border min-h-[4rem] flex flex-col gap-0.5',
                isToday(day) && 'bg-primary-light/10',
                isOnLeave && 'bg-amber-50/60 dark:bg-amber-950/20'
              )}
            >
              {isOnLeave ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-0.5 py-2">
                  <Palmtree className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                  <span className="text-[9px] sm:text-[10px] font-medium text-amber-600 dark:text-amber-400">
                    Time Off
                  </span>
                </div>
              ) : (
                dayAssignments.map((a) => {
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
                      <div className={cn('text-[9px] sm:text-xs leading-tight', color.text)}>
                        {a.actual_start && a.actual_end ? (
                          <div className="font-bold">
                            <span className="sm:hidden">{formatTime(a.actual_start, true)} – {formatTime(a.actual_end, true)}</span>
                            <span className="hidden sm:inline">{formatTime(a.actual_start)} – {formatTime(a.actual_end)}</span>
                          </div>
                        ) : (
                          <span className="font-medium truncate">{a.shifts?.name ?? 'Shift'}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
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
