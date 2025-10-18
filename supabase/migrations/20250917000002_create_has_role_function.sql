
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, role_name public.app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = has_role.user_id AND user_roles.role = has_role.role_name
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

