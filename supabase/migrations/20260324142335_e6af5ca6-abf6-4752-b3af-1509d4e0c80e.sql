
-- Allow employees to view their own workplace assignments
CREATE POLICY "Employees can view their own workplaces"
ON public.employee_workplaces
FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);
