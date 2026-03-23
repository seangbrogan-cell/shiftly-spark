
-- Publish history table
CREATE TABLE public.publish_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  action text NOT NULL DEFAULT 'publish',
  published_at timestamptz NOT NULL DEFAULT now(),
  employee_count integer NOT NULL DEFAULT 0,
  notification_channels text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.publish_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view publish history in their employer" ON public.publish_history
  FOR SELECT TO public USING (employer_id = get_user_employer_id(auth.uid()));

CREATE POLICY "Users can insert publish history in their employer" ON public.publish_history
  FOR INSERT TO public WITH CHECK (employer_id = get_user_employer_id(auth.uid()));

-- Notification config table
CREATE TABLE public.notification_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE UNIQUE,
  on_publish boolean NOT NULL DEFAULT true,
  on_change boolean NOT NULL DEFAULT true,
  daily_reminder boolean NOT NULL DEFAULT false,
  weekly_reminder boolean NOT NULL DEFAULT false,
  channels text[] NOT NULL DEFAULT '{in_app}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notification config in their employer" ON public.notification_config
  FOR SELECT TO public USING (employer_id = get_user_employer_id(auth.uid()));

CREATE POLICY "Users can insert notification config in their employer" ON public.notification_config
  FOR INSERT TO public WITH CHECK (employer_id = get_user_employer_id(auth.uid()));

CREATE POLICY "Users can update notification config in their employer" ON public.notification_config
  FOR UPDATE TO public USING (employer_id = get_user_employer_id(auth.uid()));

-- Notifications table (in-app notifications for employees)
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notifications in their employer" ON public.notifications
  FOR SELECT TO public USING (employer_id = get_user_employer_id(auth.uid()));

CREATE POLICY "Users can insert notifications in their employer" ON public.notifications
  FOR INSERT TO public WITH CHECK (employer_id = get_user_employer_id(auth.uid()));

CREATE POLICY "Users can update notifications in their employer" ON public.notifications
  FOR UPDATE TO public USING (employer_id = get_user_employer_id(auth.uid()));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Add published_at to shift_assignments
ALTER TABLE public.shift_assignments ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Allow employers to update their own record (for schedule_updated_at)
CREATE POLICY "Users can update their own employer" ON public.employers
  FOR UPDATE TO public USING (id = get_user_employer_id(auth.uid()));
