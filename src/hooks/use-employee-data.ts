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
  shifts: { name: string; start_time: string; end_time: string } | null;
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
        .select('id, assigned_date, actual_start, actual_end, shift_id, employee_id, workplace_id, shifts(name, start_time, end_time), workplaces(name)')
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
        .select('id, assigned_date, actual_start, actual_end, shift_id, employee_id, workplace_id, shifts(name, start_time, end_time), workplaces(name)')
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
export function useEmployeeWorkplacesList(employeeId: string | undefined, employerId: string | undefined) {
  return useQuery({
    queryKey: ['employee-workplaces-list', employeeId, employerId],
    queryFn: async () => {
      if (!employeeId || !employerId) return [];

      // 1) Preferred source: explicit employee↔workplace assignments
      const { data: assignedRows, error: assignedErr } = await supabase
        .from('employee_workplaces')
        .select('workplace_id')
        .eq('employee_id', employeeId);
      if (assignedErr) throw assignedErr;

      let workplaceIds = Array.from(
        new Set((assignedRows ?? []).map((r) => r.workplace_id).filter(Boolean))
      ) as string[];

      // 2) Fallback source: workplaces where this employee actually has shifts
      if (workplaceIds.length === 0) {
        const { data: shiftRows, error: shiftErr } = await supabase
          .from('shift_assignments')
          .select('workplace_id')
          .eq('employee_id', employeeId)
          .not('workplace_id', 'is', null);
        if (shiftErr) throw shiftErr;

        workplaceIds = Array.from(
          new Set((shiftRows ?? []).map((r) => r.workplace_id).filter(Boolean))
        ) as string[];
      }

      if (workplaceIds.length > 0) {
        const { data: scopedWorkplaces, error: scopedErr } = await supabase
          .from('workplaces')
          .select('id, name, created_at')
          .eq('employer_id', employerId)
          .in('id', workplaceIds)
          .order('created_at');
        if (scopedErr) throw scopedErr;
        return (scopedWorkplaces ?? []).map((w) => ({ id: w.id, name: w.name }));
      }

      // 3) Last fallback: all employer workplaces (avoids empty selector)
      const { data: allWp, error } = await supabase
        .from('workplaces')
        .select('id, name')
        .eq('employer_id', employerId)
        .order('created_at');
      if (error) throw error;
      return (allWp ?? []).map((w) => ({ id: w.id, name: w.name }));
    },
    enabled: !!employeeId && !!employerId,
  });
}
