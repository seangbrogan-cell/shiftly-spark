import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Workplace {
  id: string;
  employer_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export function useWorkplaces(employerId: string | undefined) {
  return useQuery({
    queryKey: ['workplaces', employerId],
    queryFn: async () => {
      if (!employerId) return [];
      const { data, error } = await supabase
        .from('workplaces' as any)
        .select('*')
        .eq('employer_id', employerId)
        .order('created_at');
      if (error) throw error;
      return data as unknown as Workplace[];
    },
    enabled: !!employerId,
  });
}

export function useCreateWorkplace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employerId, name, copyFromWorkplaceId }: { employerId: string; name: string; copyFromWorkplaceId?: string }) => {
      const { data: workplace, error } = await (supabase
        .from('workplaces' as any)
        .insert({ employer_id: employerId, name } as any)
        .select()
        .single() as any);
      if (error) throw error;
      const wp = workplace as Workplace;

      // Copy shifts from another workplace if requested
      if (copyFromWorkplaceId) {
        const { data: sourceShifts, error: shiftErr } = await (supabase
          .from('shifts')
          .select('*')
          .eq('workplace_id' as any, copyFromWorkplaceId) as any);
        if (shiftErr) throw shiftErr;

        if (sourceShifts && sourceShifts.length > 0) {
          const newShifts = sourceShifts.map((s: any) => ({
            employer_id: employerId,
            workplace_id: wp.id,
            name: s.name,
            start_time: s.start_time,
            end_time: s.end_time,
            is_all_day: s.is_all_day,
            color: s.color,
            notes: s.notes,
          }));
          const { error: insertErr } = await supabase.from('shifts').insert(newShifts as any);
          if (insertErr) throw insertErr;
        }
      }

      return wp;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workplaces'] });
      qc.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

export function useUpdateWorkplace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('workplaces' as any)
        .update({ name } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Workplace;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workplaces'] });
    },
  });
}

export function useDeleteWorkplace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workplaces' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workplaces'] });
      qc.invalidateQueries({ queryKey: ['shifts'] });
      qc.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
}
