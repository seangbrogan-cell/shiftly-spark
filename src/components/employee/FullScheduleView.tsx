import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { getWeekDays } from '@/hooks/use-calendar-data';
import { getShiftColor } from '@/lib/shift-colors';

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
  shifts: { name: string; start_time: string; end_time: string } | null;
  employees: { name: string } | null;
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
        .select('id, assigned_date, actual_start, actual_end, employee_id, shifts(name, start_time, end_time), employees(name)')
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
  const employeeMap = new Map<string, { name: string; assignments: FullAssignment[] }>();
  assignments.forEach((a) => {
    const name = a.employees?.name ?? 'Unknown';
    if (!employeeMap.has(a.employee_id)) {
      employeeMap.set(a.employee_id, { name, assignments: [] });
    }
    employeeMap.get(a.employee_id)!.assignments.push(a);
  });

  const employees = Array.from(employeeMap.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name));

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

  const formatTime = (ts: string | null) => {
    if (!ts) return '';
    return format(new Date(ts), 'h:mm a');
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left p-2 border-b border-border font-medium text-muted-foreground w-36">Employee</th>
            {weekDays.map((d) => (
              <th key={d.toISOString()} className="text-center p-2 border-b border-border font-medium text-muted-foreground">
                {format(d, 'EEE d')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map(([empId, { name, assignments: empAssignments }]) => (
            <tr key={empId} className="border-b border-border/50">
              <td className="p-2 font-medium text-foreground whitespace-nowrap">{name}</td>
              {weekDays.map((d) => {
                const dateStr = format(d, 'yyyy-MM-dd');
                const dayShifts = empAssignments.filter((a) => a.assigned_date === dateStr);
                return (
                  <td key={dateStr} className="p-1 text-center align-top">
                    {dayShifts.map((s) => {
                      const color = getShiftColor(s.shifts?.name ?? '');
                      return (
                        <div
                          key={s.id}
                          className="rounded px-1.5 py-0.5 text-xs mb-0.5"
                          style={{ backgroundColor: `${color}20`, color, borderLeft: `3px solid ${color}` }}
                        >
                          <div className="font-medium truncate">{s.shifts?.name}</div>
                          {s.actual_start && s.actual_end && (
                            <div className="text-[10px] opacity-75">{formatTime(s.actual_start)} – {formatTime(s.actual_end)}</div>
                          )}
                        </div>
                      );
                    })}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
