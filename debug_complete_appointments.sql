-- Check complete appointment details to see if there are missing fields
SELECT
  a.id,
  a.user_id,
  a.doctor_id,
  a.appointment_at,
  a.status,
  a.notes,
  a.created_at,
  d.full_name,
  d.specialty,
  d.photo_url
FROM public.appointments a
LEFT JOIN public.doctors d ON a.doctor_id = d.id
WHERE a.user_id = '71a6423a-d6a3-45bf-8ad7-32c6bed0e9d5'
ORDER BY a.created_at DESC;
