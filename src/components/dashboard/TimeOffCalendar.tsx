import { useState, useMemo } from 'react';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, addDays, isToday, parseISO, isWithinInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Palmtree, Clock, X as XIcon, Ban, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAllEmployeeAvailability, type EmployeeAvailabilityRow } from '@/hooks/use-employee-availability';
import type { Employee } from '@/hooks/use-dashboard-data';

interface TimeOffCalendarProps {
  employees: Employee[];
  weekOverride?: Date;
  onWeekChange?: (week: Date) => void;
  employerId: string;
}

interface TimeOffRow {
  employee_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDays(weekStart: Date): Date[] {
  const monday = startOfWeek(weekStart, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function TimeOffCalendar({ employees, employerId, weekOverride, onWeekChange }: TimeOffCalendarProps) {
  const [internalWeek, setInternalWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [searchQuery, setSearchQuery] = useState('');
  const currentWeek = weekOverride ?? internalWeek;
  const setCurrentWeek = (w: Date) => { setInternalWeek(w); onWeekChange?.(w); };
  const days = getWeekDays(currentWeek);

  const start = format(days[0], 'yyyy-MM-dd');
  const end = format(days[6], 'yyyy-MM-dd');

  // Fetch all time-off requests overlapping this week (all statuses)
  const { data: timeOffRequests = [] } = useQuery({
    queryKey: ['time-off-calendar', employerId, start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_off_requests')
        .select('employee_id, start_date, end_date, reason, status')
        .eq('employer_id', employerId)
        .lte('start_date', end)
        .gte('end_date', start);
      if (error) throw error;
      return data as TimeOffRow[];
    },
    enabled: !!employerId,
  });

  const { data: availabilityRows = [] } = useAllEmployeeAvailability();

  // Build availability map: employee_id -> set of available day abbreviations
  const availabilityMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    employees.forEach(emp => {
      // Default: employee.availability array
      const avail = new Set(emp.availability ?? DAY_NAMES);
      map.set(emp.id, avail);
    });
    // Override with explicit availability rows if they exist
    const byEmployee = new Map<string, EmployeeAvailabilityRow[]>();
    availabilityRows.forEach(r => {
      if (!byEmployee.has(r.employee_id)) byEmployee.set(r.employee_id, []);
      byEmployee.get(r.employee_id)!.push(r);
    });
    byEmployee.forEach((rows, empId) => {
      map.set(empId, new Set(rows.map(r => r.day_of_week)));
    });
    return map;
  }, [employees, availabilityRows]);

  // Build time-off lookup: employee_id -> date -> TimeOffRow[]
  const timeOffMap = useMemo(() => {
    const map = new Map<string, Map<string, TimeOffRow[]>>();
    timeOffRequests.forEach(req => {
      if (!map.has(req.employee_id)) map.set(req.employee_id, new Map());
      const empMap = map.get(req.employee_id)!;
      // Fill each day in range
      const s = parseISO(req.start_date);
      const e = parseISO(req.end_date);
      for (let d = s; d <= e; d = addDays(d, 1)) {
        const key = format(d, 'yyyy-MM-dd');
        if (!empMap.has(key)) empMap.set(key, []);
        empMap.get(key)!.push(req);
      }
    });
    return map;
  }, [timeOffRequests]);

  // Search highlight
  const highlightedIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase();
    return new Set(employees.filter(e => e.name.toLowerCase().includes(q)).map(e => e.id));
  }, [searchQuery, employees]);

  return (
    <div className="space-y-3">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Time Off Schedule</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-44 text-xs"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className={cn(
              days.some(d => isToday(d))
                ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
            )}
          >
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground ml-2 hidden sm:inline">
            {format(days[0], 'MMM d')} – {format(days[6], 'MMM d, yyyy')}
          </span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full table-fixed text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-2 font-medium text-muted-foreground w-[140px] min-w-[120px]">Employee</th>
              {days.map((day, i) => (
                <th
                  key={i}
                  className={cn(
                    'p-2 text-center font-medium text-muted-foreground',
                    isToday(day) && 'bg-primary/10 text-primary'
                  )}
                >
                  <div>{DAY_NAMES[i]}</div>
                  <div className="text-[10px]">{format(day, 'MMM d')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-muted-foreground py-8">No employees</td>
              </tr>
            ) : (
              employees.map(emp => {
                const empAvail = availabilityMap.get(emp.id) ?? new Set(DAY_NAMES);
                const empTimeOff = timeOffMap.get(emp.id);
                const isHighlighted = highlightedIds.size > 0 && highlightedIds.has(emp.id);
                const isDimmed = highlightedIds.size > 0 && !highlightedIds.has(emp.id);

                return (
                  <tr key={emp.id} className={cn(
                    "border-b border-border last:border-b-0",
                    isHighlighted && "bg-primary/10 ring-1 ring-primary/30",
                    isDimmed && "opacity-40",
                    !isHighlighted && !isDimmed && "hover:bg-muted/30"
                  )}>
                    <td className={cn("p-2 font-medium truncate", isHighlighted ? "text-primary" : "text-foreground")}>{emp.name}</td>
                    {days.map((day, i) => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      const dayAbbr = DAY_NAMES[i];
                      const isAvailable = empAvail.has(dayAbbr);
                      const requests = empTimeOff?.get(dateKey) ?? [];

                      const approved = requests.filter(r => r.status === 'approved');
                      const pending = requests.filter(r => r.status === 'pending');
                      const denied = requests.filter(r => r.status === 'denied' || r.status === 'rejected');

                      return (
                        <td
                          key={i}
                          className={cn(
                            'p-1 text-center align-top min-h-[40px] h-[40px]',
                            isToday(day) && 'bg-primary/5',
                            !isAvailable && requests.length === 0 && 'bg-muted/40'
                          )}
                        >
                          <div className="flex flex-col gap-0.5">
                            {approved.map((r, idx) => (
                              <div
                                key={`a-${idx}`}
                                className="flex items-center justify-center gap-0.5 rounded bg-amber-100 text-amber-800 px-1 py-0.5 text-[10px] font-medium truncate"
                                title={`Approved: ${r.reason}`}
                              >
                                <Palmtree className="h-3 w-3 shrink-0" />
                                <span className="truncate hidden sm:inline">{r.reason}</span>
                              </div>
                            ))}
                            {pending.map((r, idx) => (
                              <div
                                key={`p-${idx}`}
                                className="flex items-center justify-center gap-0.5 rounded bg-amber-50 border border-amber-300 text-amber-700 px-1 py-0.5 text-[10px] font-medium truncate"
                                title={`Pending: ${r.reason}`}
                              >
                                <Clock className="h-3 w-3 shrink-0" />
                                <span className="truncate hidden sm:inline">{r.reason}</span>
                              </div>
                            ))}
                            {denied.map((r, idx) => (
                              <div
                                key={`d-${idx}`}
                                className="flex items-center justify-center gap-0.5 rounded bg-red-50 border border-red-200 text-red-600 px-1 py-0.5 text-[10px] font-medium truncate line-through"
                                title={`Denied: ${r.reason}`}
                              >
                                <XIcon className="h-3 w-3 shrink-0" />
                                <span className="truncate hidden sm:inline">{r.reason}</span>
                              </div>
                            ))}
                            {!isAvailable && requests.length === 0 && (
                              <span className="text-[10px] text-muted-foreground/60" title="Not available">N/A</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
          <span>Approved</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-50 border border-amber-300" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-50 border border-red-200" />
          <span>Denied</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-muted/40 border border-border" />
          <span>Not Available</span>
        </div>
      </div>
    </div>
  );
}
