-- Disable RLS on appointments table (for testing purposes)
-- WARNING: This makes the table accessible to all users without restrictions
-- Only use for testing, re-enable RLS in production

ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
