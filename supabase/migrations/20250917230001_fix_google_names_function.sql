-- Create a function to fix existing Google users' names
CREATE OR REPLACE FUNCTION public.fix_google_user_names()
RETURNS json AS $$
DECLARE
    updated_count integer := 0;
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
        WHERE (p.first_name IS NULL OR p.first_name = '' OR p.last_name IS NULL OR p.last_name = '')
        AND au.raw_user_meta_data IS NOT NULL
    LOOP
        -- Update the profile with proper name extraction
        UPDATE public.profiles 
        SET 
            first_name = COALESCE(
                user_record.raw_user_meta_data->>'given_name',  -- Google OAuth
                user_record.raw_user_meta_data->>'first_name',  -- Manual signup
                SPLIT_PART(user_record.raw_user_meta_data->>'name', ' ', 1), -- Full name fallback
                SPLIT_PART(user_record.raw_user_meta_data->>'full_name', ' ', 1), -- Another fallback
                'User'
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
            email = COALESCE(user_record.email, ''),
            updated_at = NOW()
        WHERE id = user_record.id;
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'updated_count', updated_count,
        'message', 'Fixed ' || updated_count || ' user profiles'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
