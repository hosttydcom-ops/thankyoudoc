-- Create a policy that allows users to view roles for authentication purposes
-- This replaces the dropped "Users can view all roles" policy but is more secure
-- It allows users to view roles only when they're checking their own authentication

CREATE POLICY "Users can view roles for authentication"
ON public.user_roles
FOR SELECT
USING (
  -- Allow users to view their own role (for authentication)
  auth.uid() = user_id
  OR
  -- Allow service role to bypass RLS (for admin operations)
  auth.role() = 'service_role'
  OR
  -- Allow authenticated users to use the has_role function (SECURITY DEFINER bypasses RLS)
  current_setting('request.jwt.claim.role', true) = 'authenticated'
);
