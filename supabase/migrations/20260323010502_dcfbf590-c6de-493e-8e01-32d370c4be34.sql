
-- Create time_off_requests table
CREATE TABLE public.time_off_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  suggested_replacement_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT time_off_status_check CHECK (status IN ('pending', 'approved', 'denied')),
  CONSTRAINT time_off_date_check CHECK (end_date >= start_date)
);

-- Enable RLS
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies scoped by employer_id
CREATE POLICY "Users can view time-off requests in their employer"
  ON public.time_off_requests FOR SELECT
  USING (employer_id = public.get_user_employer_id(auth.uid()));

CREATE POLICY "Users can insert time-off requests in their employer"
  ON public.time_off_requests FOR INSERT
  WITH CHECK (employer_id = public.get_user_employer_id(auth.uid()));

CREATE POLICY "Users can update time-off requests in their employer"
  ON public.time_off_requests FOR UPDATE
  USING (employer_id = public.get_user_employer_id(auth.uid()));

CREATE POLICY "Users can delete time-off requests in their employer"
  ON public.time_off_requests FOR DELETE
  USING (employer_id = public.get_user_employer_id(auth.uid()));

-- Indexes
CREATE INDEX idx_time_off_employee ON public.time_off_requests(employee_id);
CREATE INDEX idx_time_off_employer ON public.time_off_requests(employer_id);
CREATE INDEX idx_time_off_status ON public.time_off_requests(status);
CREATE INDEX idx_time_off_dates ON public.time_off_requests(start_date, end_date);

-- Timestamp trigger
CREATE TRIGGER update_time_off_requests_updated_at
  BEFORE UPDATE ON public.time_off_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add schedule_updated_at to employers for "last updated" tracking
ALTER TABLE public.employers ADD COLUMN schedule_updated_at TIMESTAMP WITH TIME ZONE;
