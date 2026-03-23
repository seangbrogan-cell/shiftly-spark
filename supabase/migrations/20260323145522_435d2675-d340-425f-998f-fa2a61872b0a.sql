DROP POLICY IF EXISTS "Users can view profiles in their employer" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view profiles in their employer" ON public.profiles FOR SELECT USING (employer_id = get_user_employer_id(auth.uid()));