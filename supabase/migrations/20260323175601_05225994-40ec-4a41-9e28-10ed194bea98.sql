CREATE TABLE public.role_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employer_id, name)
);

ALTER TABLE public.role_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view role types in their employer"
  ON public.role_types FOR SELECT
  USING (employer_id = get_user_employer_id(auth.uid()));

CREATE POLICY "Users can insert role types in their employer"
  ON public.role_types FOR INSERT
  WITH CHECK (employer_id = get_user_employer_id(auth.uid()));

CREATE POLICY "Users can update role types in their employer"
  ON public.role_types FOR UPDATE
  USING (employer_id = get_user_employer_id(auth.uid()));

CREATE POLICY "Users can delete role types in their employer"
  ON public.role_types FOR DELETE
  USING (employer_id = get_user_employer_id(auth.uid()));