-- Add phone number field to doctors table
ALTER TABLE public.doctors ADD COLUMN phone TEXT;

-- Update appointment status enum to include pending status
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'confirmed';

-- Update the default appointment status to pending instead of scheduled
ALTER TABLE public.appointments ALTER COLUMN status SET DEFAULT 'pending'::appointment_status;

-- Create index on appointment status for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- Create index on doctors phone for better search performance
CREATE INDEX IF NOT EXISTS idx_doctors_phone ON public.doctors(phone) WHERE phone IS NOT NULL;