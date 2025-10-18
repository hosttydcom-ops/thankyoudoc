-- Create the set_user_role function
CREATE OR REPLACE FUNCTION public.set_user_role(
  user_id uuid,
  role_name text
) RETURNS json AS $$
DECLARE
  existing_role text;
BEGIN
  -- Check if user already has a role
  SELECT role INTO existing_role
  FROM public.user_roles
  WHERE user_roles.user_id = set_user_role.user_id;

  IF existing_role IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User already has role: ' || existing_role
    );
  END IF;

  -- Insert the new role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (set_user_role.user_id, role_name::app_role);

  RETURN json_build_object(
    'success', true,
    'message', 'Role ' || role_name || ' assigned to user ' || set_user_role.user_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
