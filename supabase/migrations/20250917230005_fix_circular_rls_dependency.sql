-- Fix circular dependency in user_roles RLS policies
-- The issue is that policies are creating circular references when trying to check user roles

-- Enable RLS on user_roles table (if not already enabled)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Moderators can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Moderators and admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Moderators can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Moderators can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Moderators can delete roles" ON public.user_roles;

-- Allow authenticated users to view their own role (essential for authentication)
-- This policy allows users to see their own roles without circular dependencies
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
USING (
  auth.uid() = user_id
);

-- Allow moderators and admins to view all roles (for management purposes)
-- Use the SECURITY DEFINER function to avoid circular dependencies
CREATE POLICY "Moderators and admins can view all roles"
ON public.user_roles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'moderator'::app_role) OR
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow moderators to insert new roles
CREATE POLICY "Moderators can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'moderator'::app_role)
);

-- Allow moderators to update roles
CREATE POLICY "Moderators can update roles"
ON public.user_roles
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'moderator'::app_role)
);

-- Allow moderators to delete roles (if needed)
CREATE POLICY "Moderators can delete roles"
ON public.user_roles
FOR DELETE
USING (
  public.has_role(auth.uid(), 'moderator'::app_role)
);
