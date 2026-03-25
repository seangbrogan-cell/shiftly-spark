import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek } from 'date-fns';

export interface PublishHistory {
  id: string;
  employer_id: string;
  start_date: string;
  end_date: string;
  action: string;
  published_at: string;
  employee_count: number;
  notification_channels: string[];
  created_at: string;
}

export interface NotificationConfig {
  id: string;
  employer_id: string;
  on_publish: boolean;
  on_change: boolean;
  daily_reminder: boolean;
  weekly_reminder: boolean;
  channels: string[];
  created_at: string;
  updated_at: string;
}

export function useWeekPublishStatus(weekStart: Date) {
  const start = format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const end = format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['publish-status', start],
    queryFn: async () => {
      // Get latest publish record for this week
      const { data, error } = await supabase
        .from('publish_history')
        .select('*')
        .lte('start_date', end)
        .gte('end_date', start)
        .order('published_at', { ascending: false })
        .limit(1);
      if (error) throw error;

      if (!data || data.length === 0) {
        // Check if there are any assignments this week
        const { data: assignments } = await supabase
          .from('shift_assignments')
          .select('id, published_at, updated_at')
          .gte('assigned_date', start)
          .lte('assigned_date', end)
          .limit(1);

        if (!assignments || assignments.length === 0) return { status: 'no_schedule' as const, publishedAt: null };
        return { status: 'draft' as const, publishedAt: null };
      }

      const lastPublish = data[0] as PublishHistory;
      if (lastPublish.action === 'unpublish') {
        return { status: 'draft' as const, publishedAt: null };
      }

      // Check if any assignments changed after publish
      const { data: changed } = await supabase
        .from('shift_assignments')
        .select('id')
        .gte('assigned_date', start)
        .lte('assigned_date', end)
        .gt('updated_at', lastPublish.published_at)
        .limit(1);

      if (changed && changed.length > 0) {
        return { status: 'changes_pending' as const, publishedAt: lastPublish.published_at };
      }

      return { status: 'published' as const, publishedAt: lastPublish.published_at };
    },
  });
}

export function usePublishHistory() {
  return useQuery({
    queryKey: ['publish-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('publish_history')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as PublishHistory[];
    },
  });
}

export function useNotificationConfig(employerId: string | undefined) {
  return useQuery({
    queryKey: ['notification-config', employerId],
    queryFn: async () => {
      if (!employerId) return null;
      const { data, error } = await supabase
        .from('notification_config')
        .select('*')
        .eq('employer_id', employerId)
        .maybeSingle();
      if (error) throw error;
      return data as NotificationConfig | null;
    },
    enabled: !!employerId,
  });
}

export function useUpsertNotificationConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: {
      employer_id: string;
      on_publish: boolean;
      on_change: boolean;
      daily_reminder: boolean;
      weekly_reminder: boolean;
      channels: string[];
    }) => {
      // Try update first, then insert
      const { data: existing } = await supabase
        .from('notification_config')
        .select('id')
        .eq('employer_id', config.employer_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('notification_config')
          .update({
            on_publish: config.on_publish,
            on_change: config.on_change,
            daily_reminder: config.daily_reminder,
            weekly_reminder: config.weekly_reminder,
            channels: config.channels,
          })
          .eq('employer_id', config.employer_id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('notification_config')
          .insert(config)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-config'] });
    },
  });
}

export function usePublishSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      employerId,
      startDate,
      endDate,
      channels,
    }: {
      employerId: string;
      startDate: string;
      endDate: string;
      channels: string[];
    }) => {
      // Get affected employees
      const { data: assignments, error: aErr } = await supabase
        .from('shift_assignments')
        .select('employee_id')
        .gte('assigned_date', startDate)
        .lte('assigned_date', endDate);
      if (aErr) throw aErr;

      const uniqueEmployeeIds = [...new Set(assignments?.map((a) => a.employee_id) ?? [])];
      const now = new Date().toISOString();

      // Mark assignments as published
      const { error: updateErr } = await supabase
        .from('shift_assignments')
        .update({ published_at: now })
        .gte('assigned_date', startDate)
        .lte('assigned_date', endDate);
      if (updateErr) throw updateErr;

      // Update employer's schedule_updated_at
      const { error: empErr } = await supabase
        .from('employers')
        .update({ schedule_updated_at: now })
        .eq('id', employerId);
      if (empErr) throw empErr;

      // Create publish history record
      const { error: phErr } = await supabase
        .from('publish_history')
        .insert({
          employer_id: employerId,
          start_date: startDate,
          end_date: endDate,
          action: 'publish',
          employee_count: uniqueEmployeeIds.length,
          notification_channels: channels,
        });
      if (phErr) throw phErr;

      // Create in-app notifications for affected employees
      if (channels.includes('in_app') && uniqueEmployeeIds.length > 0) {
        const notifications = uniqueEmployeeIds.map((empId) => ({
          employee_id: empId,
          employer_id: employerId,
          type: 'schedule_published',
          title: 'Schedule Published',
          message: `Your schedule for ${startDate} to ${endDate} has been published.`,
        }));
        const { error: nErr } = await supabase.from('notifications').insert(notifications);
        if (nErr) throw nErr;
      }

      return { employeeCount: uniqueEmployeeIds.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['publish-status'] });
      qc.invalidateQueries({ queryKey: ['publish-history'] });
      qc.invalidateQueries({ queryKey: ['assignments'] });
      qc.invalidateQueries({ queryKey: ['schedule-updated'] });
    },
  });
}
