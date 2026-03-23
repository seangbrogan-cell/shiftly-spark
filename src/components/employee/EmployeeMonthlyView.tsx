import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday, isSameDay } from 'date-fns';
import { Clock, X } from 'lucide-react';
import type { EmployeeAssignment } from '@/hooks/use-employee-data';

const SHIFT_COLORS = [
  { dot: 'bg-blue-500' },
  { dot: 'bg-emerald-500' },
  { dot: 'bg-amber-500' },
  { dot: 'bg-purple-500' },
  { dot: 'bg-rose-500' },
  { dot: 'bg-cyan-500' },
];

function getColor(shiftId: string) {
  let hash = 0;
  for (let i = 0; i < shiftId.length; i++) hash = ((hash << 5) - hash + shiftId.charCodeAt(i)) | 0;
  return SHIFT_COLORS[Math.abs(hash) % SHIFT_COLORS.length];
}

interface EmployeeMonthlyViewProps {
  assignments: EmployeeAssignment[];
  monthDate: Date;
}

export function EmployeeMonthlyView({ assignments, monthDate }: EmployeeMonthlyViewProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Build array of weeks
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
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="text-center py-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">{d}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="border border-border rounded-lg overflow-hidden">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
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
                  className={`
                    p-2 min-h-[72px] border-r border-b border-border last:border-r-0 text-left transition-colors
                    ${!inMonth ? 'opacity-40' : ''}
                    ${today ? 'bg-primary-light/30' : 'bg-card'}
                    ${isSelected ? 'ring-2 ring-inset ring-primary/40' : ''}
                    hover:bg-muted/50
                  `}
                >
                  <p className={`text-sm font-medium ${today ? 'text-primary' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </p>
                  {dayAssignments.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {dayAssignments.slice(0, 3).map((a) => (
                        <div key={a.id} className={`h-2 w-2 rounded-full ${getColor(a.shift_id).dot}`} />
                      ))}
                      {dayAssignments.length > 3 && (
                        <span className="text-[9px] text-muted-foreground">+{dayAssignments.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
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
              {selectedAssignments.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${getColor(a.shift_id).dot} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.shifts?.name ?? 'Shift'}</p>
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
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
