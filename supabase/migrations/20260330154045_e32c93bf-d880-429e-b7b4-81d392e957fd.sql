
DELETE FROM public.employee_workplaces WHERE employee_id IN (
  SELECT id FROM public.employees WHERE user_id = 'b87f294e-59da-41bf-9e1c-5fc360895117'
);
DELETE FROM public.employees WHERE user_id = 'b87f294e-59da-41bf-9e1c-5fc360895117';
DELETE FROM public.profiles WHERE user_id = 'b87f294e-59da-41bf-9e1c-5fc360895117';
DELETE FROM auth.users WHERE id = 'b87f294e-59da-41bf-9e1c-5fc360895117';
