
-- Add new columns to shift_assignments
ALTER TABLE public.shift_assignments
  ADD COLUMN employer_id UUID REFERENCES public.employers(id) ON DELETE CASCADE,
  ADD COLUMN assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN actual_start TIMESTAMP WITH TIME ZONE,
  ADD COLUMN actual_end TIMESTAMP WITH TIME ZONE,
  ADD COLUMN conflict_resolved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Backfill employer_id from the shift's employer_id for existing rows
UPDATE public.shift_assignments sa
SET employer_id = s.employer_id
FROM public.shifts s
WHERE sa.shift_id = s.id;

-- Make employer_id NOT NULL after backfill
ALTER TABLE public.shift_assignments ALTER COLUMN employer_id SET NOT NULL;

-- Drop old unique constraint and add new one including assigned_date
ALTER TABLE public.shift_assignments DROP CONSTRAINT IF EXISTS shift_assignments_shift_id_employee_id_key;
ALTER TABLE public.shift_assignments ADD CONSTRAINT shift_assignments_unique_per_date UNIQUE (shift_id, employee_id, assigned_date);

-- Index for weekly queries
CREATE INDEX idx_shift_assignments_date ON public.shift_assignments(assigned_date);
CREATE INDEX idx_shift_assignments_employer_date ON public.shift_assignments(employer_id, assigned_date);

-- Drop old RLS policies and create new employer_id-based ones
DROP POLICY IF EXISTS "Users can view shift assignments in their employer" ON public.shift_assignments;
DROP POLICY IF EXISTS "Users can insert shift assignments in their employer" ON public.shift_assignments;
DROP POLICY IF EXISTS "Users can delete shift assignments in their employer" ON public.shift_assignments;

CREATE POLICY "Users can view shift assignments in their employer"
  ON public.shift_assignments FOR SELECT
  USING (employer_id = public.get_user_employer_id(auth.uid()));

CREATE POLICY "Users can insert shift assignments in their employer"
  ON public.shift_assignments FOR INSERT
  WITH CHECK (employer_id = public.get_user_employer_id(auth.uid()));

CREATE POLICY "Users can update shift assignments in their employer"
  ON public.shift_assignments FOR UPDATE
  USING (employer_id = public.get_user_employer_id(auth.uid()));

CREATE POLICY "Users can delete shift assignments in their employer"
  ON public.shift_assignments FOR DELETE
  USING (employer_id = public.get_user_employer_id(auth.uid()));

-- Conflict check function
CREATE OR REPLACE FUNCTION public.check_shift_conflict(
  _employee_id UUID,
  _assigned_date DATE,
  _actual_start TIMESTAMPTZ,
  _actual_end TIMESTAMPTZ,
  _exclude_assignment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shift_assignments sa
    WHERE sa.employee_id = _employee_id
      AND sa.assigned_date = _assigned_date
      AND sa.actual_start IS NOT NULL
      AND sa.actual_end IS NOT NULL
      AND sa.actual_start < _actual_end
      AND sa.actual_end > _actual_start
      AND (_exclude_assignment_id IS NULL OR sa.id != _exclude_assignment_id)
  )
$$;

-- Timestamp trigger
CREATE TRIGGER update_shift_assignments_updated_at
  BEFORE UPDATE ON public.shift_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
