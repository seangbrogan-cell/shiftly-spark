
-- Add status column to employees (active = normal, pending = self-signup awaiting approval)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Update the handle_new_user trigger to auto-create a pending employee record
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _account_type text;
  _company_name text;
  _display_name text;
  _employer_id uuid;
  _workplace_id uuid;
  _employee_record record;
  _new_employee_id uuid;
BEGIN
  _account_type := NEW.raw_user_meta_data ->> 'account_type';
  _company_name := NEW.raw_user_meta_data ->> 'company_name';
  _display_name := COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1));

  IF _account_type = 'employee' AND _company_name IS NOT NULL AND _company_name != '' THEN
    -- First try to find the employer by company name
    SELECT id INTO _employer_id
    FROM public.employers
    WHERE lower(trim(name)) = lower(trim(_company_name))
    LIMIT 1;

    -- If not found, try to find a workplace by name
    IF _employer_id IS NULL THEN
      SELECT w.employer_id, w.id INTO _employer_id, _workplace_id
      FROM public.workplaces w
      WHERE lower(trim(w.name)) = lower(trim(_company_name))
      LIMIT 1;
    END IF;

    IF _employer_id IS NOT NULL THEN
      -- Try to find an existing employee record matching this email
      SELECT id INTO _employee_record
      FROM public.employees
      WHERE employer_id = _employer_id
        AND lower(trim(email)) = lower(trim(NEW.email))
        AND user_id IS NULL
      LIMIT 1;

      -- Create profile linked to employer
      INSERT INTO public.profiles (user_id, display_name, employer_id, role)
      VALUES (NEW.id, _display_name, _employer_id, 'employee');

      IF _employee_record.id IS NOT NULL THEN
        -- Link existing employee record
        UPDATE public.employees SET user_id = NEW.id WHERE id = _employee_record.id;

        IF _workplace_id IS NOT NULL THEN
          INSERT INTO public.employee_workplaces (employee_id, workplace_id)
          VALUES (_employee_record.id, _workplace_id)
          ON CONFLICT DO NOTHING;
        END IF;
      ELSE
        -- No pre-existing employee record: create one with status='pending'
        INSERT INTO public.employees (employer_id, name, email, phone, user_id, status)
        VALUES (
          _employer_id,
          _display_name,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data ->> 'phone', NULL),
          NEW.id,
          'pending'
        )
        RETURNING id INTO _new_employee_id;

        -- If matched via workplace, link to that workplace
        IF _workplace_id IS NOT NULL AND _new_employee_id IS NOT NULL THEN
          INSERT INTO public.employee_workplaces (employee_id, workplace_id)
          VALUES (_new_employee_id, _workplace_id)
          ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    ELSE
      INSERT INTO public.profiles (user_id, display_name)
      VALUES (NEW.id, _display_name);
    END IF;
  ELSE
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (NEW.id, _display_name);
  END IF;

  RETURN NEW;
END;
$function$;
