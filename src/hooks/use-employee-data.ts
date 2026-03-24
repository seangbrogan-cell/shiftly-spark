import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export type TimeOffRequest = Tables<'time_off_requests'>;
export type TimeOffRequestInsert = TablesInsert<'time_off_requests'>;

export interface EmployeeAssignment {
  id: string;
  assigned_date: string;
  actual_start: string | null;
  actual_end: string | null;
  shift_id: string;
  employee_id: string;
  workplace_id: string | null;
  shifts: { name: string; start_time: string; end_time: string; color: string | null; is_all_day: boolean } | null;
  workplaces: { name: string } | null;
}

export function useEmployeeWeeklySchedule(employeeId: string | undefined, weekStart: Date, workplaceId?: string) {
  const start = format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const end = format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['employee-schedule-week', employeeId, start, workplaceId],
    queryFn: async () => {
      if (!employeeId) return [];
      let query = supabase
        .from('shift_assignments')
        .select('id, assigned_date, actual_start, actual_end, shift_id, employee_id, workplace_id, shifts(name, start_time, end_time, color, is_all_day), workplaces(name)')
        .eq('employee_id', employeeId)
        .gte('assigned_date', start)
        .lte('assigned_date', end)
        .order('actual_start', { ascending: true });
      if (workplaceId) query = query.eq('workplace_id', workplaceId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as EmployeeAssignment[];
    },
    enabled: !!employeeId,
  });
}

export function useEmployeeMonthlySchedule(employeeId: string | undefined, monthDate: Date, workplaceId?: string) {
  const start = format(startOfMonth(monthDate), 'yyyy-MM-dd');
  const end = format(endOfMonth(monthDate), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['employee-schedule-month', employeeId, start, workplaceId],
    queryFn: async () => {
      if (!employeeId) return [];
      let query = supabase
        .from('shift_assignments')
        .select('id, assigned_date, actual_start, actual_end, shift_id, employee_id, workplace_id, shifts(name, start_time, end_time, color, is_all_day), workplaces(name)')
        .eq('employee_id', employeeId)
        .gte('assigned_date', start)
        .lte('assigned_date', end)
        .order('actual_start', { ascending: true });
      if (workplaceId) query = query.eq('workplace_id', workplaceId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as EmployeeAssignment[];
    },
    enabled: !!employeeId,
  });
}

export function useTimeOffRequests(employeeId: string | undefined, statusFilter?: string) {
  return useQuery({
    queryKey: ['time-off-requests', employeeId, statusFilter],
    queryFn: async () => {
      if (!employeeId) return [];
      let query = supabase
        .from('time_off_requests')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as TimeOffRequest[];
    },
    enabled: !!employeeId,
  });
}

export function useCreateTimeOffRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (request: TimeOffRequestInsert) => {
      const { data, error } = await supabase
        .from('time_off_requests')
        .insert(request)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-off-requests'] });
    },
  });
}

export function useScheduleLastUpdated(employerId: string | undefined) {
  return useQuery({
    queryKey: ['schedule-updated', employerId],
    queryFn: async () => {
      if (!employerId) return null;
      const { data, error } = await supabase
        .from('employers')
        .select('schedule_updated_at')
        .eq('id', employerId)
        .single();
      if (error) throw error;
      return data?.schedule_updated_at;
    },
    enabled: !!employerId,
  });
}

// Find the employee record linked to the current auth user
export function useCurrentEmployee() {
  return useQuery({
    queryKey: ['current-employee'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      // Try matching by user_id first, then fall back to email
      const { data: byUserId, error: e1 } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (e1) throw e1;
      if (byUserId) return byUserId;
      const { data: byEmail, error: e2 } = await supabase
        .from('employees')
        .select('*')
        .eq('email', user.email!)
        .maybeSingle();
      if (e2) throw e2;
      return byEmail;
    },
  });
}

// Fetch workplaces available to the current employee
export function useEmployeeWorkplacesList(employeeId: string | undefined, employerId?: string) {
  return useQuery({
    queryKey: ['employee-workplaces-list', employeeId, employerId],
    queryFn: async () => {
      if (!employeeId) return [];

      const workplaceMap = new Map<string, { id: string; name: string }>();

      // 1) Explicit employee-workplace links
      const { data: linkedRows, error: linkedErr } = await supabase
        .from('employee_workplaces')
        .select('workplaces(id, name)')
        .eq('employee_id', employeeId);
      if (linkedErr) throw linkedErr;

      (linkedRows ?? []).forEach((row: any) => {
        const wp = row.workplaces;
        if (wp?.id) workplaceMap.set(wp.id, { id: wp.id, name: wp.name });
      });

      // 2) Workplaces where the employee actually has scheduled shifts
      const { data: scheduledRows, error: scheduledErr } = await supabase
        .from('shift_assignments')
        .select('workplaces(id, name)')
        .eq('employee_id', employeeId)
        .not('workplace_id', 'is', null);
      if (scheduledErr) throw scheduledErr;

      (scheduledRows ?? []).forEach((row: any) => {
        const wp = row.workplaces;
        if (wp?.id) workplaceMap.set(wp.id, { id: wp.id, name: wp.name });
      });

      if (workplaceMap.size > 0) {
        return Array.from(workplaceMap.values());
      }

      // 3) Last fallback: employer workplaces
      if (employerId) {
        const { data: allWp, error } = await supabase
          .from('workplaces')
          .select('id, name')
          .eq('employer_id', employerId)
          .order('created_at');
        if (error) throw error;
        return (allWp ?? []).map((w) => ({ id: w.id, name: w.name }));
      }

      return [];
    },
    enabled: !!employeeId,
  });
}
