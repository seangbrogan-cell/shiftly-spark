import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AppNotification {
  id: string;
  employee_id: string;
  employer_id: string;
  type: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

export function useEmployeeNotifications(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AppNotification[];
    },
    enabled: !!employeeId,
  });
}

export function useUnreadCount(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['notifications-unread', employeeId],
    queryFn: async () => {
      if (!employeeId) return 0;
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('employee_id', employeeId)
        .is('read_at', null);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!employeeId,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('employee_id', employeeId)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });
}

export function useRealtimeNotifications(employeeId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!employeeId) return;

    const channel = supabase
      .channel(`notifications:${employeeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `employee_id=eq.${employeeId}`,
        },
        (payload) => {
          const notification = payload.new as AppNotification;
          qc.invalidateQueries({ queryKey: ['notifications', employeeId] });
          qc.invalidateQueries({ queryKey: ['notifications-unread', employeeId] });

          toast({
            title: notification.title,
            description: notification.message,
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId, qc, toast]);
}
