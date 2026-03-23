import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RoleType {
  id: string;
  employer_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export function useRoleTypes(employerId: string | undefined) {
  return useQuery({
    queryKey: ['role-types', employerId],
    queryFn: async () => {
      if (!employerId) return [];
      const { data, error } = await supabase
        .from('role_types' as any)
        .select('*')
        .eq('employer_id', employerId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data as any[]) as RoleType[];
    },
    enabled: !!employerId,
  });
}

export function useCreateRoleType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employer_id, name, sort_order }: { employer_id: string; name: string; sort_order: number }) => {
      const { data, error } = await supabase
        .from('role_types' as any)
        .insert({ employer_id, name, sort_order } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['role-types', vars.employer_id] });
    },
  });
}

export function useUpdateRoleTypes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ roles, employer_id }: { roles: { id: string; sort_order: number }[]; employer_id: string }) => {
      // Update each role's sort_order
      for (const role of roles) {
        const { error } = await supabase
          .from('role_types' as any)
          .update({ sort_order: role.sort_order } as any)
          .eq('id', role.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['role-types', vars.employer_id] });
    },
  });
}

export function useDeleteRoleType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, employer_id }: { id: string; employer_id: string }) => {
      const { error } = await supabase
        .from('role_types' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['role-types', vars.employer_id] });
    },
  });
}
