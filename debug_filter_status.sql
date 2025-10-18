-- Check what the notes field contains for filtering
SELECT
  a.id,
  a.notes,
  a.notes->>'type' as note_type,
  CASE
    WHEN a.notes->>'type' = 'membership_purchase' THEN 'FILTERED_OUT'
    WHEN a.notes->>'type' IS NULL OR a.notes->>'type' != 'membership_purchase' THEN 'SHOULD_SHOW'
    ELSE 'UNKNOWN'
  END as filter_status
FROM public.appointments a
WHERE a.user_id = '71a6423a-d6a3-45bf-8ad7-32c6bed0e9d5'
ORDER BY a.created_at DESC;
