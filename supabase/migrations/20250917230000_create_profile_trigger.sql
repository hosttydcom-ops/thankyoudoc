-- Create a function to automatically create user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'given_name',  -- Google OAuth
      NEW.raw_user_meta_data->>'first_name',  -- Manual signup
      SPLIT_PART(NEW.raw_user_meta_data->>'name', ' ', 1), -- Full name fallback (first part)
      SPLIT_PART(NEW.raw_user_meta_data->>'full_name', ' ', 1), -- Another fallback
      ''
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'family_name', -- Google OAuth
      NEW.raw_user_meta_data->>'last_name',   -- Manual signup
      CASE 
        WHEN array_length(string_to_array(NEW.raw_user_meta_data->>'name', ' '), 1) > 1 
        THEN array_to_string(
          (string_to_array(NEW.raw_user_meta_data->>'name', ' '))[2:], 
          ' '
        ) -- Full name fallback (everything after first part)
        ELSE ''
      END,
      ''
    ),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Update existing Google users who might not have names
-- This will run once to fix existing users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Find users with empty names but have metadata
    FOR user_record IN 
        SELECT 
            au.id,
            au.email,
            au.raw_user_meta_data,
            p.first_name,
            p.last_name
        FROM auth.users au
        LEFT JOIN public.profiles p ON au.id = p.id
        WHERE p.first_name IS NULL OR p.first_name = '' OR p.last_name IS NULL OR p.last_name = ''
    LOOP
        -- Update the profile with proper name extraction
        UPDATE public.profiles 
        SET 
            first_name = COALESCE(
                user_record.raw_user_meta_data->>'given_name',  -- Google OAuth
                user_record.raw_user_meta_data->>'first_name',  -- Manual signup
                SPLIT_PART(user_record.raw_user_meta_data->>'name', ' ', 1), -- Full name fallback
                SPLIT_PART(user_record.raw_user_meta_data->>'full_name', ' ', 1), -- Another fallback
                ''
            ),
            last_name = COALESCE(
                user_record.raw_user_meta_data->>'family_name', -- Google OAuth
                user_record.raw_user_meta_data->>'last_name',   -- Manual signup
                CASE 
                    WHEN array_length(string_to_array(user_record.raw_user_meta_data->>'name', ' '), 1) > 1 
                    THEN array_to_string(
                        (string_to_array(user_record.raw_user_meta_data->>'name', ' '))[2:], 
                        ' '
                    )
                    ELSE ''
                END,
                ''
            ),
            email = COALESCE(user_record.email, '')
        WHERE id = user_record.id;
    END LOOP;
END $$;
