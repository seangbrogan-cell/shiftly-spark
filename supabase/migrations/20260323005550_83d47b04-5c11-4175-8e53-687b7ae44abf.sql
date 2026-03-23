
-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'Staff',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT employees_role_check CHECK (role IN ('Manager', 'Staff'))
);

-- Create shifts table
CREATE TABLE public.shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shift_assignments junction table
CREATE TABLE public.shift_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shift_id, employee_id)
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;

-- Employees policies (employer_id scoped)
CREATE POLICY "Users can view employees in their employer"
  ON public.employees FOR SELECT
  USING (employer_id = public.get_user_employer_id(auth.uid()));

CREATE POLICY "Users can insert employees in their employer"
  ON public.employees FOR INSERT
  WITH CHECK (employer_id = public.get_user_employer_id(auth.uid()));

CREATE POLICY "Users can update employees in their employer"
  ON public.employees FOR UPDATE
  USING (employer_id = public.get_user_employer_id(auth.uid()));

CREATE POLICY "Users can delete employees in their employer"
  ON public.employees FOR DELETE
  USING (employer_id = public.get_user_employer_id(auth.uid()));

-- Shifts policies (employer_id scoped)
CREATE POLICY "Users can view shifts in their employer"
  ON public.shifts FOR SELECT
  USING (employer_id = public.get_user_employer_id(auth.uid()));

CREATE POLICY "Users can insert shifts in their employer"
  ON public.shifts FOR INSERT
  WITH CHECK (employer_id = public.get_user_employer_id(auth.uid()));

CREATE POLICY "Users can update shifts in their employer"
  ON public.shifts FOR UPDATE
  USING (employer_id = public.get_user_employer_id(auth.uid()));

CREATE POLICY "Users can delete shifts in their employer"
  ON public.shifts FOR DELETE
  USING (employer_id = public.get_user_employer_id(auth.uid()));

-- Shift assignments policies (via shift's employer_id)
CREATE POLICY "Users can view shift assignments in their employer"
  ON public.shift_assignments FOR SELECT
  USING (
    shift_id IN (
      SELECT id FROM public.shifts WHERE employer_id = public.get_user_employer_id(auth.uid())
    )
  );

CREATE POLICY "Users can insert shift assignments in their employer"
  ON public.shift_assignments FOR INSERT
  WITH CHECK (
    shift_id IN (
      SELECT id FROM public.shifts WHERE employer_id = public.get_user_employer_id(auth.uid())
    )
  );

CREATE POLICY "Users can delete shift assignments in their employer"
  ON public.shift_assignments FOR DELETE
  USING (
    shift_id IN (
      SELECT id FROM public.shifts WHERE employer_id = public.get_user_employer_id(auth.uid())
    )
  );

-- Indexes
CREATE INDEX idx_employees_employer_id ON public.employees(employer_id);
CREATE INDEX idx_shifts_employer_id ON public.shifts(employer_id);
CREATE INDEX idx_shift_assignments_shift_id ON public.shift_assignments(shift_id);
CREATE INDEX idx_shift_assignments_employee_id ON public.shift_assignments(employee_id);

-- Timestamp trigger for employees
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
