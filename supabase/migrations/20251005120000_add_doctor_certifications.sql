-- Add certifications column to doctors table
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS certifications TEXT;

-- Optional index if searching certifications later
-- CREATE INDEX IF NOT EXISTS idx_doctors_certifications ON public.doctors USING gin (to_tsvector('english', certifications));

