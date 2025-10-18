-- Create a test appointment for debugging
-- Replace '71a6423a-d6a3-45bf-8ad7-32c6bed0e9d5' with your user ID
-- Replace the doctor_id with an actual doctor ID from your database

INSERT INTO public.appointments (
  user_id,
  doctor_id,
  appointment_at,
  status,
  notes
) VALUES (
  '71a6423a-d6a3-45bf-8ad7-32c6bed0e9d5',
  (SELECT id FROM public.doctors LIMIT 1),
  NOW() + INTERVAL '1 hour',
  'pending',
  '{"type": "regular_appointment", "reason": "Test appointment for debugging"}'
);
