-- Re-enable RLS for memberships table and create proper policies
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- Users can view their own memberships
CREATE POLICY "Users can view their own memberships"
ON public.memberships
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own memberships
CREATE POLICY "Users can create their own memberships"
ON public.memberships
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own memberships
CREATE POLICY "Users can update their own memberships"
ON public.memberships
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can view all memberships
CREATE POLICY "Admins can view all memberships"
ON public.memberships
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can update any membership
CREATE POLICY "Admins can update any membership"
ON public.memberships
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));
