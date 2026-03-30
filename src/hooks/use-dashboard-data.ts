import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Employee = Tables<'employees'>;
export type EmployeeInsert = TablesInsert<'employees'>;
export type EmployeeUpdate = TablesUpdate<'employees'>;
export type Shift = Tables<'shifts'>;
export type ShiftInsert = TablesInsert<'shifts'>;
export type ShiftUpdate = TablesUpdate<'shifts'>;

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employees').select('*').order('name');
      if (error) throw error;
      return data as Employee[];
    },
  });
}

export function useShifts(workplaceId?: string) {
  return useQuery({
    queryKey: ['shifts', workplaceId],
    queryFn: async () => {
      let query: any = supabase.from('shifts').select('*');
      if (workplaceId) {
        query = query.eq('workplace_id', workplaceId);
      }
      const { data, error } = await query;
      if (error) throw error;
      // All-day shifts first, then sort by time-of-day
      return (data as Shift[]).sort((a, b) => {
        const aAllDay = (a as any).is_all_day === true;
        const bAllDay = (b as any).is_all_day === true;
        if (aAllDay && !bAllDay) return -1;
        if (!aAllDay && bAllDay) return 1;
        if (aAllDay && bAllDay) return a.name.localeCompare(b.name);
        const timeA = new Date(a.start_time).getHours() * 60 + new Date(a.start_time).getMinutes();
        const timeB = new Date(b.start_time).getHours() * 60 + new Date(b.start_time).getMinutes();
        return timeA - timeB;
      });
    },
  });
}

export function useShiftAssignmentCounts() {
  return useQuery({
    queryKey: ['shift-assignment-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('shift_assignments').select('employee_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((a) => {
        counts[a.employee_id] = (counts[a.employee_id] || 0) + 1;
      });
      return counts;
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.from('profiles').select('*, employers(name)').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (employee: Omit<EmployeeInsert, 'employer_id'> & { employer_id: string; availability?: string[] }) => {
      const normalizedEmail = employee.email.trim();
      const { data: existing, error: existingError } = await supabase
        .from('employees')
        .select('id')
        .eq('employer_id', employee.employer_id)
        .ilike('email', normalizedEmail)
        .limit(1);

      if (existingError) throw existingError;
      if (existing.length > 0) {
        throw new Error('An employee with this email already exists. Please edit the existing profile instead.');
      }

      const { data, error } = await supabase
        .from('employees')
        .insert({ ...employee, email: normalizedEmail } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: EmployeeUpdate & { id: string; availability?: string[] }) => {
      const { data, error } = await supabase.from('employees').update(updates as any).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['shift-assignment-counts'] });
    },
  });
}

export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shift: Omit<ShiftInsert, 'employer_id'> & { employer_id: string }) => {
      const { data, error } = await supabase.from('shifts').insert(shift).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

export function useUpdateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: ShiftUpdate & { id: string }) => {
      const { data, error } = await supabase.from('shifts').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

export function useDeleteShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shifts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      qc.invalidateQueries({ queryKey: ['weekly-assignments'] });
    },
  });
}
