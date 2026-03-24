
-- 1. Create workplaces table
CREATE TABLE public.workplaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.workplaces ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies scoped by employer
CREATE POLICY "Users can view workplaces in their employer"
  ON public.workplaces FOR SELECT
  USING (employer_id = get_user_employer_id(auth.uid()));

CREATE POLICY "Users can insert workplaces in their employer"
  ON public.workplaces FOR INSERT
  WITH CHECK (employer_id = get_user_employer_id(auth.uid()));

CREATE POLICY "Users can update workplaces in their employer"
  ON public.workplaces FOR UPDATE
  USING (employer_id = get_user_employer_id(auth.uid()));

CREATE POLICY "Users can delete workplaces in their employer"
  ON public.workplaces FOR DELETE
  USING (employer_id = get_user_employer_id(auth.uid()));

-- 4. Add workplace_id to shifts (nullable for migration)
ALTER TABLE public.shifts ADD COLUMN workplace_id UUID REFERENCES public.workplaces(id) ON DELETE CASCADE;

-- 5. Add workplace_id to shift_assignments (nullable for migration)
ALTER TABLE public.shift_assignments ADD COLUMN workplace_id UUID REFERENCES public.workplaces(id) ON DELETE CASCADE;

-- 6. Migrate existing data: create a default workplace per employer from employer name
INSERT INTO public.workplaces (id, employer_id, name)
SELECT gen_random_uuid(), e.id, e.name
FROM public.employers e;

-- 7. Assign existing shifts to their employer's default workplace
UPDATE public.shifts s
SET workplace_id = w.id
FROM public.workplaces w
WHERE w.employer_id = s.employer_id;

-- 8. Assign existing shift_assignments to their employer's default workplace
UPDATE public.shift_assignments sa
SET workplace_id = w.id
FROM public.workplaces w
WHERE w.employer_id = sa.employer_id;

-- 9. Updated_at trigger for workplaces
CREATE TRIGGER update_workplaces_updated_at
  BEFORE UPDATE ON public.workplaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
