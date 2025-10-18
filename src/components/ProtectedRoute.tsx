import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getUserRole } from "@/utils/auth";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
  redirectTo?: string;
}

const ProtectedRoute = ({ 
  children, 
  requiredRole = "user", 
  redirectTo = "/login" 
}: ProtectedRouteProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Allow local quick-login flags (superadmin/admin) to pass without Supabase session
        const isSuperAdminLS = typeof window !== 'undefined' && localStorage.getItem('tyd_isSuperAdmin') === 'true';
        const isAdminLS = typeof window !== 'undefined' && localStorage.getItem('tyd_isAdmin') === 'true';

        if (isSuperAdminLS || isAdminLS) {
          setIsAuthenticated(true);
          if ((requiredRole === 'moderator' && isSuperAdminLS) || (requiredRole === 'admin' && isAdminLS) || requiredRole === 'user') {
            setIsAuthorized(true);
          } else {
            setIsAuthorized(false);
          }
          setIsLoading(false);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAuthenticated(false);
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        setIsAuthenticated(true);

        // Check user role first
        const userRole = await getUserRole();
        
        // Simplified logic for now - just check if user has required role
        if (requiredRole === "user") {
          // For user routes, allow if user is authenticated
          setIsAuthorized(true);
        } else {
          // For admin/moderator routes, check exact role match
          if (userRole === requiredRole) {
            setIsAuthorized(true);
          } else {
            setIsAuthorized(false);
          }
        }
      } catch (error) {
        console.error("Error checking authorization:", error);
        setIsAuthenticated(false);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [requiredRole]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-muted-foreground">
            Required role: {requiredRole}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
