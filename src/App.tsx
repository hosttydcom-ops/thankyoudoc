import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import SearchPage from "./pages/SearchPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import BookingsPage from "./pages/BookingsPage";
import ProfilePage from "./pages/ProfilePage";
import DoctorProfilePage from "./pages/DoctorProfilePage";
import UserDashboard from "./pages/UserDashboard";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import DoctorAdminDashboard from "./pages/DoctorAdminDashboard";
import AppointmentDetailsPage from "./pages/AppointmentDetailsPage";
import FeedbackPage from "./pages/FeedbackPage";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback"; // Import the new AuthCallback component
import ProtectedRoute from "./components/ProtectedRoute";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { getUserRole } from "@/utils/auth";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // Using useNavigate inside App component

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        }
        setSession(session);
        setLoading(false);
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false); // Still set loading to false to prevent infinite loading
      }
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        // Handle navigation based on auth state changes
        if (event === 'SIGNED_IN' && session?.user) {
          // Check user role and redirect accordingly
          console.log('User signed in, checking role...');
          
          try {
            // Use setTimeout to ensure navigation happens after state is set
            setTimeout(async () => {
              try {
                const userRole = await getUserRole();
                console.log('User role detected:', userRole);
                
                if (userRole === 'admin') {
                  console.log('Redirecting admin to admin dashboard');
                  navigate('/admin/dashboard', { replace: true });
                } else if (userRole === 'moderator') {
                  console.log('Redirecting moderator to superadmin dashboard');
                  navigate('/superadmin/dashboard', { replace: true });
                } else {
                  // Keep regular users on the page they are on; only redirect if they are on auth pages
                  const path = window.location.pathname;
                  if (path === '/login' || path === '/signup' || path.startsWith('/auth')) {
                    console.log('Signed in on auth page, redirecting to home');
                    navigate('/', { replace: true });
                  } else {
                    console.log('Signed in, staying on current page');
                  }
                }
              } catch (error) {
                console.error('Error checking user role:', error);
                // On error, avoid forced redirect; stay or go home if on auth pages
                const path = window.location.pathname;
                if (path === '/login' || path === '/signup' || path.startsWith('/auth')) {
                  navigate('/', { replace: true });
                }
              }
            }, 100); // Small delay to prevent conflicts
          } catch (error) {
            console.error('Error in role check setup:', error);
            // Do not force redirect
          }
        } else if (event === 'SIGNED_OUT') {
          navigate('/login'); // Redirect to login on sign-out
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading application...</p>
          <p className="text-sm text-muted-foreground mt-2">Checking authentication</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="min-h-screen flex flex-col">
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<SearchPage />} />
              <Route path="/search" element={<SearchResultsPage />} />
              <Route path="/search-results" element={<SearchResultsPage />} />
              <Route path="/bookings" element={<BookingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/doctor/:id" element={<DoctorProfilePage />} />
              <Route path="/doctor/:id/book" element={<DoctorProfilePage />} />
              <Route path="/doctor/:id/reviews" element={<DoctorProfilePage />} />
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/superadmin" element={<SuperAdminLogin />} />
              <Route path="/superadmin/dashboard" element={
                <ProtectedRoute requiredRole="moderator" redirectTo="/login">
                  <SuperAdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/doctor/admin" element={<DoctorAdminDashboard />} />
              <Route path="/appointment/:id" element={<AppointmentDetailsPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin" redirectTo="/login">
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/dashboard" element={
                <ProtectedRoute requiredRole="admin" redirectTo="/login">
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              {/* Supabase OAuth Callback Route */}
              <Route path="/auth/v1/callback" element={<AuthCallback />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
