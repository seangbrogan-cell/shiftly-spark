import { useMemo } from 'react';
import { format, isToday, startOfWeek, addDays } from 'date-fns';
import { getShiftColor } from '@/lib/shift-colors';
import { cn } from '@/lib/utils';
import type { EmployeeAssignment } from '@/hooks/use-employee-data';

interface EmployeeWeeklyViewProps {
  assignments: EmployeeAssignment[];
  weekStart: Date;
}

const formatTime = (ts: string | null) => {
  if (!ts) return '';
  return format(new Date(ts), 'h:mma').toLowerCase();
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

  return (
    <div className="rounded-lg border border-border bg-card overflow-x-auto">
      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-border sticky top-0 bg-card z-10">
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              'px-0.5 sm:px-1 py-1 sm:py-1.5 text-center border-r border-border last:border-r-0',
              isToday(day) && 'bg-primary-light/30'
            )}
          >
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">{format(day, 'EEE')}</p>
            <p className={cn('text-xs font-bold', isToday(day) ? 'text-primary' : 'text-foreground')}>
              {format(day, 'd')}
            </p>
          </div>
        ))}
      </div>

      {/* Day Cells */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayAssignments = byDate[dateStr] ?? [];

          return (
            <div
              key={dateStr}
              className={cn(
                'px-0.5 py-0.5 border-r border-border last:border-r-0 min-h-[4rem] align-top',
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
                      'rounded px-1 py-0.5 text-xs mb-0.5 border',
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
