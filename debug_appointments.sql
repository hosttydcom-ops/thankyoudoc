-- Debug: Check all appointments in the database
SELECT
  a.id,
  a.user_id,
  a.doctor_id,
  a.appointment_at,
  a.status,
  a.notes,
  d.full_name as doctor_name
FROM public.appointments a
LEFT JOIN public.doctors d ON a.doctor_id = d.id
ORDER BY a.created_at DESC
LIMIT 10;
