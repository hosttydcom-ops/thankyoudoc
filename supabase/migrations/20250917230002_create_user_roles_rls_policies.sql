-- Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might conflict
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Moderators can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

-- Allow users to view their own roles
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
USING ((auth.jwt() ->> 'sub')::uuid = user_id);

-- Allow moderators and admins to view all roles (for management purposes)
CREATE POLICY "Moderators can view all roles"
ON public.user_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (auth.jwt() ->> 'sub')::uuid
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
    WHERE ur.user_id = (auth.jwt() ->> 'sub')::uuid
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
    WHERE ur.user_id = (auth.jwt() ->> 'sub')::uuid
    AND ur.role = 'moderator'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (auth.jwt() ->> 'sub')::uuid
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
    WHERE ur.user_id = (auth.jwt() ->> 'sub')::uuid
    AND ur.role = 'moderator'
  )
);
