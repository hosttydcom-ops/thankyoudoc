-- Remove RLS policies from memberships table as per requirement

-- Drop all existing RLS policies for memberships table
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can create their own memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can update their own memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can view all memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can update any membership" ON public.memberships;

-- Disable RLS on memberships table
ALTER TABLE public.memberships DISABLE ROW LEVEL SECURITY;
