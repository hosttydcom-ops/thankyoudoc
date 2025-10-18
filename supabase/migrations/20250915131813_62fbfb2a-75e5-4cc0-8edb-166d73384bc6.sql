-- Add phone number field to doctors table
ALTER TABLE public.doctors ADD COLUMN phone TEXT;

-- Create index on doctors phone for better search performance
CREATE INDEX IF NOT EXISTS idx_doctors_phone ON public.doctors(phone) WHERE phone IS NOT NULL;