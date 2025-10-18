-- Ensure appointments table has a JSONB notes column for medical history
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '{}'::jsonb;


