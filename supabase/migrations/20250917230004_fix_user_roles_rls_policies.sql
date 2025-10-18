-- Fix user_roles RLS policies to allow proper role checking for authentication
-- This migration addresses the issue where users cannot check their own roles

-- Enable RLS on user_roles table (if not already enabled)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Moderators can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Moderators can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Moderators can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Moderators can delete roles" ON public.user_roles;

-- Allow authenticated users to view their own role (essential for authentication)
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
USING (
  auth.uid() = user_id
);

-- Allow moderators and admins to view all roles (for management purposes)
CREATE POLICY "Moderators and admins can view all roles"
ON public.user_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('moderator', 'admin')
  )
);

-- Allow moderators to insert new roles
CREATE POLICY "Moderators can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'moderator'
  )
);

-- Allow moderators to update roles
CREATE POLICY "Moderators can update roles"
ON public.user_roles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'moderator'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'moderator'
  )
);

-- Allow moderators to delete roles (if needed)
CREATE POLICY "Moderators can delete roles"
ON public.user_roles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'moderator'
  )
);
