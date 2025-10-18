-- Allow moderators to view and update all appointments (same as admins)
-- This enables moderators to access the SuperAdmin dashboard and manage appointments

-- Update the existing admin policy to also include moderators
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;

CREATE POLICY "Admins and moderators can view all appointments"
ON public.appointments
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'moderator'::app_role)
);

-- Update the existing admin update policy to also include moderators  
DROP POLICY IF EXISTS "Admins can update any appointment" ON public.appointments;

CREATE POLICY "Admins and moderators can update any appointment"
ON public.appointments
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'moderator'::app_role)
);
