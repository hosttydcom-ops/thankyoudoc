-- Ensure doctors table has phone, qualifications, and address columns
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS qualifications TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;


