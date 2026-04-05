import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, isToday, isWithinInterval, parseISO } from 'date-fns';
import { Palmtree } from 'lucide-react';
import { getWeekDays } from '@/hooks/use-calendar-data';
import { getShiftColor } from '@/lib/shift-colors';
import { cn } from '@/lib/utils';
import { useRoleTypes } from '@/hooks/use-role-types';
import { buildRoleSortPriority } from '@/lib/roles';

interface FullScheduleViewProps {
  workplaceId: string;
  weekStart: Date;
  employerId?: string;
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

export function FullScheduleView({ workplaceId, weekStart, employerId }: FullScheduleViewProps) {
  const start = format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const end = format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekDays = getWeekDays(weekStart);
  const { data: dbRoles = [] } = useRoleTypes(employerId);
  const roleSortPriority = useMemo(() => buildRoleSortPriority(dbRoles), [dbRoles]);

  // Fetch all employees linked to this workplace
  const { data: workplaceEmployees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['full-schedule-employees', workplaceId, employerId],
    queryFn: async () => {
      // Fetch workplace-linked employees
      const { data: wpData, error: wpError } = await supabase
        .from('employee_workplaces')
        .select('employee_id, employees(name, role, status, availability)')
        .eq('workplace_id', workplaceId);
      if (wpError) throw wpError;

      const empMap = new Map<string, { employee_id: string; name: string; role: string; availability: string[] }>();
      (wpData ?? [])
        .filter((r: any) => r.employees && r.employees.status === 'active')
        .forEach((r: any) => {
          empMap.set(r.employee_id, {
            employee_id: r.employee_id,
            name: r.employees.name,
            role: r.employees.role,
            availability: r.employees.availability ?? [],
          });
        });

      // Only show employees linked to this workplace (no fallback to all employer employees)

      return Array.from(empMap.values());
    },
    enabled: !!workplaceId,
  });

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

  // Fetch approved time-off requests for all employees in this date range
  const { data: timeOffRequests = [] } = useQuery({
    queryKey: ['full-schedule-time-off', employerId, start],
    queryFn: async () => {
      if (!employerId) return [];
      const { data, error } = await supabase
        .from('time_off_requests')
        .select('employee_id, start_date, end_date, reason, employees!time_off_requests_employee_id_fkey(name, role)')
        .eq('employer_id', employerId)
        .eq('status', 'approved')
        .lte('start_date', end)
        .gte('end_date', start);
      if (error) throw error;
      return data as unknown as { employee_id: string; start_date: string; end_date: string; reason: string; employees: { name: string; role: string } | null }[];
    },
    enabled: !!employerId,
  });

  // Fetch employee availability restrictions
  const { data: availabilityData = [] } = useQuery({
    queryKey: ['full-schedule-availability', employerId],
    queryFn: async () => {
      if (!employerId) return [];
      const { data, error } = await supabase
        .from('employee_availability')
        .select('employee_id, day_of_week, start_time, end_time');
      if (error) throw error;
      return data as { employee_id: string; day_of_week: string; start_time: string; end_time: string }[];
    },
    enabled: !!employerId,
  });

  // Build availability map: empId -> set of restricted day names
  const availabilityMap = useMemo(() => {
    const map = new Map<string, Map<string, { start: string; end: string }>>();
    availabilityData.forEach((a) => {
      if (!map.has(a.employee_id)) map.set(a.employee_id, new Map());
      map.get(a.employee_id)!.set(a.day_of_week, { start: a.start_time, end: a.end_time });
    });
    return map;
  }, [availabilityData]);

  // Build a set of empId:date keys that are on approved time-off
  const timeOffMap = useMemo(() => {
    const map = new Map<string, string>(); // key -> reason
    timeOffRequests.forEach((req) => {
      const s = parseISO(req.start_date);
      const e = parseISO(req.end_date);
      weekDays.forEach((day) => {
        if (isWithinInterval(day, { start: s, end: e })) {
          map.set(`${req.employee_id}:${format(day, 'yyyy-MM-dd')}`, req.reason);
        }
      });
    });
    return map;
  }, [timeOffRequests, weekDays]);

  // Group by employee — start with all workplace employees, then merge in assignment/time-off data
  const employees = useMemo(() => {
    const employeeMap = new Map<string, { name: string; role: string; availability: string[]; assignments: FullAssignment[] }>();
    // Start with all workplace employees
    workplaceEmployees.forEach((emp) => {
      employeeMap.set(emp.employee_id, { name: emp.name, role: emp.role, availability: emp.availability, assignments: [] });
    });
    // Add assignments
    assignments.forEach((a) => {
      const name = a.employees?.name ?? 'Unknown';
      const role = a.employees?.role ?? '';
      if (!employeeMap.has(a.employee_id)) {
        employeeMap.set(a.employee_id, { name, role, availability: [], assignments: [] });
      }
      employeeMap.get(a.employee_id)!.assignments.push(a);
    });
    // Time-off employees only show if they're already assigned to this workplace
    // (no cross-workplace leaking)
    return Array.from(employeeMap.entries()).sort((a, b) => {
      const priorityDiff = roleSortPriority(a[1].role) - roleSortPriority(b[1].role);
      if (priorityDiff !== 0) return priorityDiff;
      return a[1].name.localeCompare(b[1].name);
    });
  }, [assignments, timeOffRequests, workplaceEmployees]);

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

  if (isLoading || loadingEmployees) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (employees.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No employees assigned to this workplace.</p>;
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
      {employees.map(([empId, { name, role, availability }]) => (
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
            const timeOffReason = timeOffMap.get(cellId);
            const isOnLeave = !!timeOffReason;
            const dayName = format(day, 'EEE'); // Mon, Tue, etc.
            const isUnavailable = availability.length > 0 && !availability.includes(dayName);
            const empAvailability = availabilityMap.get(empId);
            const dayAvail = empAvailability?.get(dayName);
            const hasRestriction = dayAvail && !(dayAvail.start === '00:00:00' && dayAvail.end === '23:59:00');

            return (
              <div
                key={dateStr}
                className={cn(
                  'min-h-[28px] sm:min-h-[40px] px-0.5 py-0.5 border-r border-b border-border flex flex-col gap-0.5 min-w-0 overflow-hidden',
                  isToday(day) && 'bg-primary-light/10',
                  isOnLeave && 'bg-amber-50/60 dark:bg-amber-950/20',
                  !isOnLeave && isUnavailable && 'bg-muted/60'
                )}
              >
                {isOnLeave ? (
                  <div className="flex flex-col items-center justify-center flex-1 gap-0.5 py-1">
                    <Palmtree className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                    <span className="text-[8px] sm:text-[10px] font-medium text-amber-600 dark:text-amber-400 text-center leading-tight truncate max-w-full px-0.5">
                      {timeOffReason?.toLowerCase() === 'holiday' ? 'Holiday' : 'Time Off'}
                    </span>
                  </div>
                ) : isUnavailable && dayShifts.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-[10px] text-muted-foreground/50 select-none">N/A</span>
                  </div>
                ) : (
                  <>
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
                            'group relative rounded border px-0.5 sm:px-1.5 py-1 @container flex-1 flex items-center transition-shadow hover:shadow-md',
                            colorDef.bg,
                            colorDef.border
                          )}
                        >
                          <div className="flex items-center gap-1">
                            <div className={cn('text-[9px] sm:text-xs leading-tight flex-1', colorDef.text)}>
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
                        </div>
                      );
                    })}
                    {hasRestriction && dayShifts.length === 0 && (
                      <div className="flex items-center justify-center flex-1">
                        <span className="text-[8px] sm:text-[9px] text-muted-foreground/60 text-center leading-tight">
                          {dayAvail.start.slice(0, 5)}–{dayAvail.end.slice(0, 5)}
                        </span>
                      </div>
                    )}
                  </>
                )}
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
