import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EmployeeAvailabilityRow {
  id: string;
  employee_id: string;
  day_of_week: string;
  start_time: string; // HH:mm format
  end_time: string;
  created_at: string;
}

export interface DayTimeRange {
  day: string;
  enabled: boolean;
  start_time: string;
  end_time: string;
}

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function useEmployeeAvailability(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee-availability', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from('employee_availability' as any)
        .select('*')
        .eq('employee_id', employeeId);
      if (error) throw error;
      return data as EmployeeAvailabilityRow[];
    },
    enabled: !!employeeId,
  });
}

export function useAllEmployeeAvailability() {
  return useQuery({
    queryKey: ['all-employee-availability'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_availability' as any)
        .select('*');
      if (error) throw error;
      return data as EmployeeAvailabilityRow[];
    },
  });
}

export function useSaveEmployeeAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, availability, dayAvailability }: {
      employeeId: string;
      availability: string[];
      dayAvailability: DayTimeRange[];
    }) => {
      // First delete existing availability rows
      await (supabase.from('employee_availability' as any) as any).delete().eq('employee_id', employeeId);

      // Insert rows for each enabled day that has custom times
      const rows = dayAvailability
        .filter(d => availability.includes(d.day))
        .map(d => ({
          employee_id: employeeId,
          day_of_week: d.day,
          start_time: d.start_time + ':00',
          end_time: d.end_time + ':00',
        }));

      if (rows.length > 0) {
        const { error } = await (supabase.from('employee_availability' as any) as any).insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee-availability'] });
      qc.invalidateQueries({ queryKey: ['all-employee-availability'] });
    },
  });
}

/** Build default DayTimeRange array from existing data */
export function buildDayTimeRanges(
  availability: string[],
  rows: EmployeeAvailabilityRow[]
): DayTimeRange[] {
  return ALL_DAYS.map(day => {
    const row = rows.find(r => r.day_of_week === day);
    return {
      day,
      enabled: availability.includes(day),
      start_time: row ? row.start_time.slice(0, 5) : '00:00',
      end_time: row ? row.end_time.slice(0, 5) : '23:59',
    };
  });
}
