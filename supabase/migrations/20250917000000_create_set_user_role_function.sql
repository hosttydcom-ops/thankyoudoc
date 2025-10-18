
CREATE OR REPLACE FUNCTION public.set_user_role(user_id UUID, role_name TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (user_id, role_name::public.app_role)
  ON CONFLICT (user_id) DO UPDATE
  SET role = role_name::public.app_role,
      created_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
