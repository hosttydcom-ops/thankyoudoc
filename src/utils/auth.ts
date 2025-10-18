import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

/**
 * Check if the current user has a specific role
 * @param role - The role to check for ('admin', 'moderator', 'user')
 * @returns Promise<boolean> - True if user has the role, false otherwise
 */
export const hasRole = async (role: AppRole): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return false;
    }

    return data.role === role;
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
};

/**
 * Check if the current user is an admin
 * @returns Promise<boolean> - True if user is admin, false otherwise
 */
export const isAdmin = async (): Promise<boolean> => {
  return hasRole('admin');
};

/**
 * Check if the current user is a moderator
 * @returns Promise<boolean> - True if user is moderator, false otherwise
 */
export const isModerator = async (): Promise<boolean> => {
  return hasRole('moderator');
};

/**
 * Get the current user's role
 * @returns Promise<AppRole | null> - The user's role or null if not found
 */
export const getUserRole = async (): Promise<AppRole | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return null;
    }

    return data.role;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};
