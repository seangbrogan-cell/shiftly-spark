
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _account_type text;
  _company_name text;
  _employer_id uuid;
  _employee_record record;
BEGIN
  _account_type := NEW.raw_user_meta_data ->> 'account_type';
  _company_name := NEW.raw_user_meta_data ->> 'company_name';

  IF _account_type = 'employee' AND _company_name IS NOT NULL AND _company_name != '' THEN
    -- Try to find the employer by company name (case-insensitive)
    SELECT id INTO _employer_id
    FROM public.employers
    WHERE lower(trim(name)) = lower(trim(_company_name))
    LIMIT 1;

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
      VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)), _employer_id, 'employee');

      -- Link employee record if found
      IF _employee_record.id IS NOT NULL THEN
        UPDATE public.employees SET user_id = NEW.id WHERE id = _employee_record.id;
      END IF;
    ELSE
      -- Company not found, create unlinked profile
      INSERT INTO public.profiles (user_id, display_name)
      VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)));
    END IF;
  ELSE
    -- Employer signup or no account type - create basic profile
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)));
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
