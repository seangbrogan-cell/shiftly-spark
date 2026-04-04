-- Add indexes on foreign key columns frequently used in RLS policies and queries
-- These columns are referenced by get_user_employer_id() in nearly every RLS check

-- profiles.employer_id - used in RLS SELECT policy
CREATE INDEX IF NOT EXISTS idx_profiles_employer_id ON public.profiles USING btree (employer_id);

-- workplaces.employer_id - queried on every dashboard load
CREATE INDEX IF NOT EXISTS idx_workplaces_employer_id ON public.workplaces USING btree (employer_id);

-- notifications - queried by employee_id and employer_id
CREATE INDEX IF NOT EXISTS idx_notifications_employer_id ON public.notifications USING btree (employer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_employee_id ON public.notifications USING btree (employee_id);

-- shifts.workplace_id - filtered in useShifts query
CREATE INDEX IF NOT EXISTS idx_shifts_workplace_id ON public.shifts USING btree (workplace_id);

-- shift_assignments.workplace_id - filtered in useWeeklyAssignments
CREATE INDEX IF NOT EXISTS idx_shift_assignments_workplace_id ON public.shift_assignments USING btree (workplace_id);

-- role_types.employer_id - queried on dashboard load
CREATE INDEX IF NOT EXISTS idx_role_types_employer_id ON public.role_types USING btree (employer_id);

-- publish_history.employer_id - queried for publish panel
CREATE INDEX IF NOT EXISTS idx_publish_history_employer_id ON public.publish_history USING btree (employer_id);

-- notification_config - already has unique on employer_id, skip

-- Composite index for time_off_requests employer + status (common filter)
CREATE INDEX IF NOT EXISTS idx_time_off_employer_status ON public.time_off_requests USING btree (employer_id, status);

-- Composite index for shift_assignments conflict check
CREATE INDEX IF NOT EXISTS idx_shift_assignments_conflict ON public.shift_assignments USING btree (employee_id, assigned_date, actual_start, actual_end);