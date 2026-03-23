import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';

export type ShiftAssignment = Tables<'shift_assignments'>;
export type ShiftAssignmentInsert = TablesInsert<'shift_assignments'>;

export interface AssignmentWithDetails extends ShiftAssignment {
  shifts: { name: string; start_time: string; end_time: string; is_all_day: boolean } | null;
  employees: { name: string } | null;
}

export function useWeeklyAssignments(weekStart: Date) {
  const start = format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const end = format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['assignments', start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_assignments')
.select('*, shifts(name, start_time, end_time, is_all_day), employees(name)')
        .gte('assigned_date', start)
        .lte('assigned_date', end)
        .order('actual_start', { ascending: true });
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
        .select('*, shifts(name, start_time, end_time), employees(name)')
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
        .select('*, shifts(name, start_time, end_time), employees(name)')
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
  const { data, error } = await supabase.rpc('check_shift_conflict', {
    _employee_id: employeeId,
    _assigned_date: assignedDate,
    _actual_start: actualStart,
    _actual_end: actualEnd,
    _exclude_assignment_id: excludeId ?? null,
  });
  if (error) throw error;
  return data as boolean;
}

export function getWeekDays(weekStart: Date): Date[] {
  const monday = startOfWeek(weekStart, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
