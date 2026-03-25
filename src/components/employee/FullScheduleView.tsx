import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { getWeekDays } from '@/hooks/use-calendar-data';
import { getShiftColor } from '@/lib/shift-colors';
import { cn } from '@/lib/utils';

interface FullScheduleViewProps {
  workplaceId: string;
  weekStart: Date;
}

interface FullAssignment {
  id: string;
  assigned_date: string;
  actual_start: string | null;
  actual_end: string | null;
  employee_id: string;
  shift_id: string;
  shifts: { name: string; start_time: string | null; end_time: string | null; color: string | null; is_all_day: boolean } | null;
  employees: { name: string; role: string } | null;
}

export function FullScheduleView({ workplaceId, weekStart }: FullScheduleViewProps) {
  const start = format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const end = format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekDays = getWeekDays(weekStart);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['full-schedule', workplaceId, start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_assignments')
        .select('id, assigned_date, actual_start, actual_end, employee_id, shift_id, shifts(name, start_time, end_time, color, is_all_day), employees(name, role)')
        .eq('workplace_id', workplaceId)
        .gte('assigned_date', start)
        .lte('assigned_date', end)
        .order('actual_start', { ascending: true });
      if (error) throw error;
      return data as unknown as FullAssignment[];
    },
    enabled: !!workplaceId,
  });

  // Group by employee
  const employees = useMemo(() => {
    const employeeMap = new Map<string, { name: string; role: string; assignments: FullAssignment[] }>();
    assignments.forEach((a) => {
      const name = a.employees?.name ?? 'Unknown';
      const role = a.employees?.role ?? '';
      if (!employeeMap.has(a.employee_id)) {
        employeeMap.set(a.employee_id, { name, role, assignments: [] });
      }
      employeeMap.get(a.employee_id)!.assignments.push(a);
    });
    return Array.from(employeeMap.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [assignments]);

  // Build assignment map: empId:date -> assignments[]
  const assignmentMap = useMemo(() => {
    const map: Record<string, FullAssignment[]> = {};
    assignments.forEach((a) => {
      const key = `${a.employee_id}:${a.assigned_date}`;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [assignments]);

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

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (employees.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No shifts scheduled this week.</p>;
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-x-auto">
      {/* Day Headers - matching dashboard grid */}
      <div className="grid grid-cols-[80px_repeat(7,1fr)_36px] sm:grid-cols-[110px_repeat(7,1fr)_46px] border-b border-border sticky top-0 bg-card z-10">
        <div className="px-1 sm:px-2 py-1 sm:py-1.5 border-r border-border flex items-center">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Employee</span>
        </div>
        {weekDays.map((day) => (
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
        <div className="px-0.5 sm:px-1 py-1 sm:py-1.5 text-center flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground/50">Hrs</span>
        </div>
      </div>

      {/* Employee Rows */}
      {employees.map(([empId, { name, role }]) => (
        <div key={empId} className="grid grid-cols-[80px_repeat(7,1fr)_36px] sm:grid-cols-[110px_repeat(7,1fr)_46px]">
          {/* Employee Name Cell */}
          <div className="px-1 sm:px-2 py-1 border-r border-b border-border flex items-start min-w-0">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-foreground truncate">{name}</p>
              {role && <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{role}</p>}
            </div>
          </div>

          {/* Day Cells */}
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const cellId = `${empId}:${dateStr}`;
            const dayShifts = assignmentMap[cellId] ?? [];
            return (
              <div
                key={dateStr}
                className={cn(
                  'px-0.5 py-0.5 border-r border-b border-border min-h-[2.5rem] flex flex-col gap-0.5 min-w-0 overflow-hidden',
                  isToday(day) && 'bg-primary-light/10'
                )}
              >
                {dayShifts.map((s) => {
                  const colorDef = getShiftColor({
                    color: s.shifts?.color ?? null,
                    is_all_day: s.shifts?.is_all_day ?? false,
                    start_time: s.shifts?.start_time ?? null,
                  });
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        'rounded border px-0.5 sm:px-1.5 py-1 flex-1',
                        colorDef.bg,
                        colorDef.border
                      )}
                    >
                      <div className={cn('text-[9px] sm:text-xs leading-tight', colorDef.text)}>
                        {s.actual_start && s.actual_end ? (
                          <div className="font-bold lg:whitespace-nowrap">
                            <span className="sm:hidden">{formatTime(s.actual_start, true)} – {formatTime(s.actual_end, true)}</span>
                            <span className="hidden sm:inline">{formatTime(s.actual_start)} – {formatTime(s.actual_end)}</span>
                          </div>
                        ) : (
                          <span className="font-medium truncate">{s.shifts?.name ?? 'Shift'}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Total Hours Cell */}
          <div className="px-2 py-1 border-b border-border flex items-center justify-center">
            {(() => {
              let totalMinutes = 0;
              weekDays.forEach((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const cellAssignments = assignmentMap[`${empId}:${dateStr}`] ?? [];
                cellAssignments.forEach((a) => {
                  if (a.actual_start && a.actual_end) {
                    totalMinutes += (new Date(a.actual_end).getTime() - new Date(a.actual_start).getTime()) / 60000;
                  }
                });
              });
              const hours = Math.floor(totalMinutes / 60);
              const mins = Math.round(totalMinutes % 60);
              return (
                <span className="text-[10px] text-muted-foreground/50">
                  {totalMinutes > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}` : '0h'}
                </span>
              );
            })()}
          </div>
        </div>
      ))}
    </div>
  );
}
