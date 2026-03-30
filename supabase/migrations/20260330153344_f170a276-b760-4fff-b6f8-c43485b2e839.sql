
-- Remove profile for jax_247@msn.com
DELETE FROM public.profiles WHERE user_id = '67d3ea5d-4b41-41a6-8529-ca824e57c668';

-- Remove any employee_workplaces links
DELETE FROM public.employee_workplaces WHERE employee_id IN (
  SELECT id FROM public.employees WHERE user_id = '67d3ea5d-4b41-41a6-8529-ca824e57c668'
);

-- Remove any employee records
DELETE FROM public.employees WHERE user_id = '67d3ea5d-4b41-41a6-8529-ca824e57c668';

-- Remove the auth user
DELETE FROM auth.users WHERE id = '67d3ea5d-4b41-41a6-8529-ca824e57c668';
