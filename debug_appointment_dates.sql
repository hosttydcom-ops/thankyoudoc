-- Check if appointment_at field has valid dates
SELECT
  a.id,
  a.appointment_at,
  a.status,
  CASE
    WHEN a.appointment_at IS NULL THEN 'NULL_DATE'
    WHEN a.appointment_at < NOW() THEN 'PAST_DATE'
    WHEN a.appointment_at > NOW() THEN 'FUTURE_DATE'
    ELSE 'INVALID_DATE'
  END as date_status
FROM public.appointments a
WHERE a.user_id = '71a6423a-d6a3-45bf-8ad7-32c6bed0e9d5'
ORDER BY a.created_at DESC;
