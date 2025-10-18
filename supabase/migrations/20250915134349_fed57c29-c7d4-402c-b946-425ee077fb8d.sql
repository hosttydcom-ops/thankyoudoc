-- Allow admins to view and update all appointments so they can approve bookings
-- (Users already have policies to manage their own appointments)

-- Enable RLS (no-op if already enabled)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all appointments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'appointments' AND policyname = 'Admins can view all appointments'
  ) THEN
    CREATE POLICY "Admins can view all appointments"
    ON public.appointments
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END$$;

-- Policy: Admins can update any appointment (to confirm/cancel)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'appointments' AND policyname = 'Admins can update any appointment'
  ) THEN
    CREATE POLICY "Admins can update any appointment"
    ON public.appointments
    FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END$$;

-- Optional: speed up filtering by status/date on BookingsPage
CREATE INDEX IF NOT EXISTS idx_appointments_status_date ON public.appointments(status, appointment_at);
