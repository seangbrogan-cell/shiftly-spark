import { useMemo } from 'react';
import { format, isToday, startOfWeek, addDays } from 'date-fns';
import { Clock } from 'lucide-react';
import type { EmployeeAssignment } from '@/hooks/use-employee-data';

interface EmployeeWeeklyViewProps {
  assignments: EmployeeAssignment[];
  weekStart: Date;
}

// Same color logic as employer calendar
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
    <div className="grid grid-cols-7 gap-3">
      {days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayAssignments = byDate[dateStr] ?? [];
        const today = isToday(day);

        return (
          <div
            key={dateStr}
            className={`rounded-lg border border-border p-3 min-h-[140px] transition-colors ${today ? 'bg-primary-light/30 border-primary/30' : 'bg-card'}`}
          >
            <div className="text-center mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">{format(day, 'EEE')}</p>
              <p className={`text-lg font-bold ${today ? 'text-primary' : 'text-foreground'}`}>
                {format(day, 'd')}
              </p>
            </div>

            {dayAssignments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center mt-4">No shifts</p>
            ) : (
              <div className="space-y-2">
                {dayAssignments.map((a) => {
                  const color = getColor(a.shift_id);
                  return (
                    <div key={a.id} className={`rounded-md border ${color.bg} ${color.border} p-2`}>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${color.dot} shrink-0`} />
                        <p className={`text-xs font-semibold truncate ${color.text}`}>
                          {a.shifts?.name ?? 'Shift'}
                        </p>
                      </div>
                      {a.workplaces?.name && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5 pl-3">
                          {a.workplaces.name}
                        </p>
                      )}
                      </div>
                      {a.actual_start && a.actual_end && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(a.actual_start), 'h:mm a')} – {format(new Date(a.actual_end), 'h:mm a')}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
