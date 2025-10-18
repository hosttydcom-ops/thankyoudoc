-- Check the notes field for these appointments to see if they're being filtered out
SELECT
  a.id,
  a.user_id,
  a.status,
  a.notes,
  a.notes->>'type' as note_type,
  d.full_name as doctor_name
FROM public.appointments a
LEFT JOIN public.doctors d ON a.doctor_id = d.id
WHERE a.user_id = '71a6423a-d6a3-45bf-8ad7-32c6bed0e9d5'
ORDER BY a.created_at DESC;
