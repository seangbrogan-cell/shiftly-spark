ALTER TABLE public.shifts 
  ADD COLUMN is_all_day boolean NOT NULL DEFAULT false,
  ALTER COLUMN start_time DROP NOT NULL,
  ALTER COLUMN end_time DROP NOT NULL;