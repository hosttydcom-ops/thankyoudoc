import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, Eye, EyeOff, Heart } from "lucide-react";
import { FaGoogle } from "react-icons/fa"; // Import Google icon
import { supabase } from "@/integrations/supabase/client";

const LoginPage = () => {
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // Check if there's a success message from signup
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
    }
  }, [location]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!formData.username) {
      newErrors.username = "Email is required";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const username = formData.username.trim().toLowerCase();
    const password = formData.password.trim();

    // Super Admin quick access via normal login
    if (username === "superadmin@superadmin.com" && password === "123456789") {
      localStorage.setItem("tyd_isSuperAdmin", "true");
      localStorage.setItem("tyd_adminEmail", username);
      console.info("SuperAdmin login via /login. Redirecting to dashboard...");
      window.location.href = "/SuperAdmin/dashboard";
      return;
    }

    // Admin quick access via normal login
    if (username === "admin@admin.com" && password === "123456789") {
      localStorage.setItem("tyd_isAdmin", "true");
      localStorage.setItem("tyd_adminEmail", username);
      console.info("Admin login via /login. Redirecting to dashboard...");
      window.location.href = "/admin/dashboard";
      return;
    }

    // Supabase auth login
    const { error } = await supabase.auth.signInWithPassword({
      email: username,
      password,
    });

    if (error) {
      setErrors({ general: error.message });
      return;
    }

    window.location.href = "/";
  };

  // Supabase Google Sign-In handler
  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        setErrors({ general: error.message });
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'An unexpected error occurred during Google Sign-In.' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="relative">
              <Heart className="h-8 w-8 text-primary animate-pulse-medical" />
              <Stethoscope className="h-6 w-6 text-secondary-accent absolute -top-1 -right-1" />
            </div>
            <h1 className="text-2xl font-bold text-primary">ThankYouDoc</h1>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Welcome Back</h2>
            <p className="text-muted-foreground">Sign in to find your perfect doctor</p>
          </div>
        </div>

        {/* Login Form */}
        <Card className="medical-card animate-slide-up">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-lg text-primary">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {successMessage && (
                <div className="p-3 bg-success/10 border border-success/20 rounded-md">
                  <p className="text-success text-sm text-center">{successMessage}</p>
                </div>
              )}
              {errors.general && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-destructive text-sm text-center">{errors.general}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Username
                </Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="medical-input"
                  placeholder="Enter your username"
                />
                {errors.username && (
                  <p className="text-destructive text-sm animate-fade-in">
                    {errors.username}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    className="medical-input pr-10"
                    placeholder="Enter your password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-destructive text-sm animate-fade-in">
                    {errors.password}
                  </p>
                )}
              </div>

              <Button type="submit" variant="medical" className="w-full mt-6">
                Sign In
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleGoogleSignIn}
            >
              <FaGoogle className="h-5 w-5" />
              Sign In with Google
            </Button>

            <div className="mt-6 text-center space-y-4">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:text-primary-glow transition-colors"
              >
                Forgot your password?
              </Link>

              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link
                    to="/signup"
                    className="text-primary hover:text-primary-glow font-medium transition-colors"
                  >
                    Sign up here
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trust Indicators */}
        <div className="text-center space-y-2 animate-scale-in">
          <p className="text-xs text-muted-foreground flex items-center justify-center space-x-1">
            <Stethoscope className="h-3 w-3" />
            <span>Trusted by thousands of patients</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Your health information is secure and protected
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;