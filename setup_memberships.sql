-- Complete Memberships Table Setup Script
-- Run this in your Supabase SQL Editor

-- Step 1: Create memberships table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_type TEXT NOT NULL DEFAULT 'premium',
  amount INTEGER NOT NULL DEFAULT 3500,
  duration_months INTEGER NOT NULL DEFAULT 6,
  appointments_included INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'expired')),
  payment_reference TEXT,
  payment_method TEXT DEFAULT 'online',
  member_details JSONB,
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 2: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON public.memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_valid_until ON public.memberships(valid_until);

-- Step 3: Enable RLS (Row Level Security)
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can create their own memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can update their own memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can view all memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can update any membership" ON public.memberships;

-- Create new policies
CREATE POLICY "Users can view their own memberships"
ON public.memberships
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own memberships"
ON public.memberships
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memberships"
ON public.memberships
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admin policies (if has_role function exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'has_role'
    AND pg_get_function_identity_arguments(oid) = 'uuid, app_role'
  ) THEN
    CREATE POLICY "Admins can view all memberships"
    ON public.memberships
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::app_role));

    CREATE POLICY "Admins can update any membership"
    ON public.memberships
    FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Step 5: Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_memberships_updated_at ON public.memberships;
CREATE TRIGGER update_memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Step 6: Grant necessary permissions
GRANT ALL ON public.memberships TO authenticated;
GRANT ALL ON public.memberships TO anon;
GRANT ALL ON public.memberships TO service_role;

-- Verification queries (uncomment to check)
-- SELECT * FROM public.memberships LIMIT 1;
-- SELECT schemaname, tablename FROM pg_tables WHERE tablename = 'memberships';

-- Add index for free appointment tracking
CREATE INDEX IF NOT EXISTS idx_appointments_free ON appointments
((notes::jsonb->>'isFreeAppointment'))
WHERE (notes::jsonb->>'isFreeAppointment') = 'true';

-- Add comment for clarity
COMMENT ON INDEX idx_appointments_free IS 'Optimizes queries counting free appointments';

-- Create function to get membership with appointment count
CREATE OR REPLACE FUNCTION get_membership_with_count(user_id uuid)
RETURNS TABLE (
  id uuid,
  status text,
  valid_until timestamptz,
  appointments_included integer,
  free_appointments_used bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.status,
    m.valid_until,
    m.appointments_included,
    COUNT(a.id)::bigint as free_appointments_used
  FROM memberships m
  LEFT JOIN appointments a ON
    a.user_id = user_id AND
    a.status IN ('pending', 'confirmed', 'completed') AND
    a.notes::jsonb->>'isFreeAppointment' = 'true'
  WHERE
    m.user_id = user_id AND
    m.status = 'active'
  GROUP BY m.id;
END;
$$ LANGUAGE plpgsql;
