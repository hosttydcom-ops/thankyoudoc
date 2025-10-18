-- Update existing appointments with 'scheduled' status to 'pending' for consistency
UPDATE public.appointments 
SET status = 'pending'::appointment_status 
WHERE status = 'scheduled'::appointment_status;

-- Create index for better appointment filtering performance
CREATE INDEX IF NOT EXISTS idx_appointments_status_date ON public.appointments(status, appointment_at);