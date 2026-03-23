CREATE TABLE public.employee_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  day_of_week text NOT NULL,
  start_time time NOT NULL DEFAULT '00:00',
  end_time time NOT NULL DEFAULT '23:59',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, day_of_week)
);

ALTER TABLE public.employee_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view employee availability in their employer"
ON public.employee_availability FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE employer_id = get_user_employer_id(auth.uid())
  )
);

CREATE POLICY "Users can insert employee availability in their employer"
ON public.employee_availability FOR INSERT
WITH CHECK (
  employee_id IN (
    SELECT id FROM public.employees WHERE employer_id = get_user_employer_id(auth.uid())
  )
);

CREATE POLICY "Users can update employee availability in their employer"
ON public.employee_availability FOR UPDATE
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE employer_id = get_user_employer_id(auth.uid())
  )
);

CREATE POLICY "Users can delete employee availability in their employer"
ON public.employee_availability FOR DELETE
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE employer_id = get_user_employer_id(auth.uid())
  )
);