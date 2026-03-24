
-- Junction table for employee-workplace assignments
CREATE TABLE public.employee_workplaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  workplace_id uuid NOT NULL REFERENCES public.workplaces(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, workplace_id)
);

ALTER TABLE public.employee_workplaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view employee workplaces in their employer"
  ON public.employee_workplaces FOR SELECT
  USING (employee_id IN (SELECT id FROM employees WHERE employer_id = get_user_employer_id(auth.uid())));

CREATE POLICY "Users can insert employee workplaces in their employer"
  ON public.employee_workplaces FOR INSERT
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE employer_id = get_user_employer_id(auth.uid())));

CREATE POLICY "Users can delete employee workplaces in their employer"
  ON public.employee_workplaces FOR DELETE
  USING (employee_id IN (SELECT id FROM employees WHERE employer_id = get_user_employer_id(auth.uid())));

-- Seed: assign all existing employees to all existing workplaces
INSERT INTO public.employee_workplaces (employee_id, workplace_id)
SELECT e.id, w.id
FROM public.employees e
CROSS JOIN public.workplaces w
WHERE e.employer_id = w.employer_id
ON CONFLICT DO NOTHING;
