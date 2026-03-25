import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';

export type ShiftAssignment = Tables<'shift_assignments'>;
export type ShiftAssignmentInsert = TablesInsert<'shift_assignments'>;

export interface AssignmentWithDetails extends ShiftAssignment {
  shifts: { name: string; start_time: string; end_time: string; is_all_day: boolean; color: string | null } | null;
  employees: { name: string } | null;
}

export function useWeeklyAssignments(weekStart: Date, workplaceId?: string) {
  const start = format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const end = format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['assignments', start, workplaceId],
    queryFn: async () => {
      let query: any = supabase
        .from('shift_assignments')
        .select('*, shifts(name, start_time, end_time, is_all_day, color), employees(name)')
        .gte('assigned_date', start)
        .lte('assigned_date', end)
        .order('actual_start', { ascending: true });
      if (workplaceId) {
        query = query.eq('workplace_id', workplaceId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as AssignmentWithDetails[];
    },
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignment: ShiftAssignmentInsert) => {
      const { data, error } = await supabase
        .from('shift_assignments')
        .insert(assignment)
        .select('*, shifts(name, start_time, end_time, is_all_day, color), employees(name)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
      qc.invalidateQueries({ queryKey: ['shift-assignment-counts'] });
    },
  });
}

export function useUpdateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<ShiftAssignmentInsert>) => {
      const { data, error } = await supabase
        .from('shift_assignments')
        .update(updates)
        .eq('id', id)
        .select('*, shifts(name, start_time, end_time, is_all_day, color), employees(name)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
      qc.invalidateQueries({ queryKey: ['shift-assignment-counts'] });
    },
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shift_assignments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
      qc.invalidateQueries({ queryKey: ['shift-assignment-counts'] });
    },
  });
}

export async function checkConflict(
  employeeId: string,
  assignedDate: string,
  actualStart: string,
  actualEnd: string,
  excludeId?: string
): Promise<boolean> {
  // First check via RPC
  const { data, error } = await supabase.rpc('check_shift_conflict', {
    _employee_id: employeeId,
    _assigned_date: assignedDate,
    _actual_start: actualStart,
    _actual_end: actualEnd,
    _exclude_assignment_id: excludeId ?? null,
  });
  if (error) throw error;

  // If RPC reports a conflict, verify with a direct query to avoid stale results
  if (data) {
    let query = supabase
      .from('shift_assignments')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('assigned_date', assignedDate)
      .not('actual_start', 'is', null)
      .not('actual_end', 'is', null)
      .lt('actual_start', actualEnd)
      .gt('actual_end', actualStart);
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    const { data: rows, error: verifyErr } = await query.limit(1);
    if (verifyErr) throw verifyErr;
    return (rows?.length ?? 0) > 0;
  }

  return false;
}

export function getWeekDays(weekStart: Date): Date[] {
  const monday = startOfWeek(weekStart, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

// Fetch approved time-off requests that overlap a given week
export function useApprovedTimeOff(weekStart: Date) {
  const start = format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const end = format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['approved-time-off', start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_off_requests')
        .select('employee_id, start_date, end_date')
        .eq('status', 'approved')
        .lte('start_date', end)
        .gte('end_date', start);
      if (error) throw error;
      return data as { employee_id: string; start_date: string; end_date: string }[];
    },
  });
}
