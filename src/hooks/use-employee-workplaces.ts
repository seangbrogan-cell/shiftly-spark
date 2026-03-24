import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EmployeeWorkplace {
  id: string;
  employee_id: string;
  workplace_id: string;
  created_at: string;
}

export function useEmployeeWorkplaces(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee-workplaces', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from('employee_workplaces' as any)
        .select('*')
        .eq('employee_id', employeeId);
      if (error) throw error;
      return data as unknown as EmployeeWorkplace[];
    },
    enabled: !!employeeId,
  });
}

export function useSaveEmployeeWorkplaces() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, workplaceIds }: { employeeId: string; workplaceIds: string[] }) => {
      // Delete all existing
      const { error: delErr } = await (supabase
        .from('employee_workplaces' as any)
        .delete()
        .eq('employee_id', employeeId) as any);
      if (delErr) throw delErr;

      // Insert new
      if (workplaceIds.length > 0) {
        const rows = workplaceIds.map(wid => ({ employee_id: employeeId, workplace_id: wid }));
        const { error: insErr } = await supabase
          .from('employee_workplaces' as any)
          .insert(rows as any);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee-workplaces'] });
    },
  });
}
