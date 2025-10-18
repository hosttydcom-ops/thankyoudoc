import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, EyeOff, AlertCircle } from "lucide-react";

const SuperAdminLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("tyd_isSuperAdmin") === "true") {
      navigate("/superadmin/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(""); // Clear error when user starts typing
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Fixed credentials for super admin
    const ADMIN_USERNAME = "superadmin@superadmin.com";
    const ADMIN_PASSWORD = "123456789";

    const inputUsername = formData.username.trim().toLowerCase();
    const inputPassword = formData.password.trim();

    if (inputUsername === ADMIN_USERNAME.toLowerCase() && inputPassword === ADMIN_PASSWORD) {
      // Persist simple session
      localStorage.setItem("tyd_isSuperAdmin", "true");
      localStorage.setItem("tyd_adminEmail", inputUsername);
      console.log("Super admin login successful");
      try {
        navigate("/superadmin/dashboard", { replace: true });
      } catch (e) {
        // Fallback
        window.location.assign("/superadmin/dashboard");
      }
    } else {
      setError("Invalid credentials. Please check your username and password.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in bg-gradient-to-br from-background to-muted/30">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Shield className="h-10 w-10 text-primary animate-pulse-medical" />
            <div>
              <h1 className="text-2xl font-bold text-primary">Super Admin</h1>
              <p className="text-sm text-muted-foreground">ThankYouDoc</p>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Admin Access</h2>
            <p className="text-muted-foreground">Secure portal for system administration</p>
          </div>
        </div>

        {/* Login Form */}
        <Card className="medical-card animate-slide-up border-primary/20">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-lg text-primary flex items-center justify-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Admin Login</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center space-x-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md animate-fade-in">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Username
                </Label>
                <Input
                  id="username"
                  name="username"
                  type="email"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="medical-input"
                  placeholder="superadmin@superadmin.com"
                  required
                />
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
                    placeholder="Enter admin password"
                    required
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
              </div>

              <Button type="submit" variant="medical" className="w-full mt-6">
                <Shield className="h-4 w-4 mr-2" />
                Access Admin Dashboard
              </Button>
            </form>

            {/* Demo Credentials Info */}
            <div className="mt-6 p-4 bg-primary/5 rounded-md border border-primary/20">
              <h4 className="text-sm font-medium text-primary mb-2">Demo Credentials</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Username:</strong> superadmin@superadmin.com</p>
                <p><strong>Password:</strong> 123456789</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center space-y-2 animate-scale-in">
          <p className="text-xs text-muted-foreground flex items-center justify-center space-x-1">
            <Shield className="h-3 w-3" />
            <span>Secure admin access with role-based permissions</span>
          </p>
          <p className="text-xs text-muted-foreground">
            All admin activities are logged and monitored
          </p>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;