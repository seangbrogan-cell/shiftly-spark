
CREATE OR REPLACE FUNCTION public.seed_default_shifts(_employer_id uuid, _workplace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only seed if this workplace has no shifts yet
  IF EXISTS (SELECT 1 FROM public.shifts WHERE employer_id = _employer_id AND workplace_id = _workplace_id LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.shifts (employer_id, workplace_id, name, start_time, end_time, is_all_day) VALUES
    -- Morning shifts
    (_employer_id, _workplace_id, '6am 6HR',  '2000-01-01 06:00:00+00', '2000-01-01 12:00:00+00', false),
    (_employer_id, _workplace_id, '6am 7HR',  '2000-01-01 06:00:00+00', '2000-01-01 13:00:00+00', false),
    (_employer_id, _workplace_id, '6am 8HR',  '2000-01-01 06:00:00+00', '2000-01-01 14:00:00+00', false),
    (_employer_id, _workplace_id, '6am 9HR',  '2000-01-01 06:00:00+00', '2000-01-01 15:00:00+00', false),
    (_employer_id, _workplace_id, '6am 10HR', '2000-01-01 06:00:00+00', '2000-01-01 16:00:00+00', false),
    (_employer_id, _workplace_id, '7am 6HR',  '2000-01-01 07:00:00+00', '2000-01-01 13:00:00+00', false),
    (_employer_id, _workplace_id, '7am 7HR',  '2000-01-01 07:00:00+00', '2000-01-01 14:00:00+00', false),
    (_employer_id, _workplace_id, '7am 8HR',  '2000-01-01 07:00:00+00', '2000-01-01 15:00:00+00', false),
    (_employer_id, _workplace_id, '7am 9HR',  '2000-01-01 07:00:00+00', '2000-01-01 16:00:00+00', false),
    (_employer_id, _workplace_id, '7am 10HR', '2000-01-01 07:00:00+00', '2000-01-01 17:00:00+00', false),
    -- Afternoon shifts
    (_employer_id, _workplace_id, '12pm 6hr',  '2000-01-01 12:00:00+00', '2000-01-01 18:00:00+00', false),
    (_employer_id, _workplace_id, '12pm 7hr',  '2000-01-01 12:00:00+00', '2000-01-01 19:00:00+00', false),
    (_employer_id, _workplace_id, '12pm 8hr',  '2000-01-01 12:00:00+00', '2000-01-01 20:00:00+00', false),
    (_employer_id, _workplace_id, '12pm 9hr',  '2000-01-01 12:00:00+00', '2000-01-01 21:00:00+00', false),
    (_employer_id, _workplace_id, '12pm 10hr', '2000-01-01 12:00:00+00', '2000-01-01 22:00:00+00', false),
    -- Evening shifts
    (_employer_id, _workplace_id, '3pm 6hr',  '2000-01-01 15:00:00+00', '2000-01-01 21:00:00+00', false),
    (_employer_id, _workplace_id, '3pm 7hr',  '2000-01-01 15:00:00+00', '2000-01-01 22:00:00+00', false),
    (_employer_id, _workplace_id, '3pm 8hr',  '2000-01-01 15:00:00+00', '2000-01-01 23:00:00+00', false),
    (_employer_id, _workplace_id, '3pm 9hr',  '2000-01-01 15:00:00+00', '2000-01-02 00:00:00+00', false),
    (_employer_id, _workplace_id, '3pm 10hr', '2000-01-01 15:00:00+00', '2000-01-02 01:00:00+00', false),
    (_employer_id, _workplace_id, '6pm 6hr',  '2000-01-01 18:00:00+00', '2000-01-02 00:00:00+00', false),
    (_employer_id, _workplace_id, '6pm 7hr',  '2000-01-01 18:00:00+00', '2000-01-02 01:00:00+00', false),
    (_employer_id, _workplace_id, '6pm 8hr',  '2000-01-01 18:00:00+00', '2000-01-02 02:00:00+00', false),
    (_employer_id, _workplace_id, '7pm 6hr',  '2000-01-01 19:00:00+00', '2000-01-02 01:00:00+00', false),
    (_employer_id, _workplace_id, '7pm 7hr',  '2000-01-01 19:00:00+00', '2000-01-02 02:00:00+00', false),
    -- Off Work / All-day shifts
    (_employer_id, _workplace_id, 'Day Off Req', NULL, NULL, true),
    (_employer_id, _workplace_id, 'Holiday',     NULL, NULL, true),
    (_employer_id, _workplace_id, 'Sick Leave',  NULL, NULL, true),
    (_employer_id, _workplace_id, 'Maternity',   NULL, NULL, true),
    (_employer_id, _workplace_id, 'Paternity',   NULL, NULL, true),
    (_employer_id, _workplace_id, 'Bereavement', NULL, NULL, true);
END;
$$;
