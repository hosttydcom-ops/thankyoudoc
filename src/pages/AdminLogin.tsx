import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, EyeOff, AlertCircle } from "lucide-react";

const AdminLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("tyd_isAdmin") === "true") {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const DEMO_USERNAME = "admin@admin.com";
    const DEMO_PASSWORD = "123456789";

    const inputUsername = formData.username.trim().toLowerCase();
    const inputPassword = formData.password.trim();

    if (inputUsername === DEMO_USERNAME && inputPassword === DEMO_PASSWORD) {
      localStorage.setItem("tyd_isAdmin", "true");
      localStorage.setItem("tyd_adminEmail", inputUsername);
      navigate("/admin/dashboard", { replace: true });
    } else {
      setError("Invalid credentials. Please check your username and password.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in bg-gradient-to-br from-background to-muted/30">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Shield className="h-10 w-10 text-primary animate-pulse-medical" />
            <div>
              <h1 className="text-2xl font-bold text-primary">Admin</h1>
              <p className="text-sm text-muted-foreground">ThankYouDoc</p>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Admin Access</h2>
            <p className="text-muted-foreground">Secure portal for clinic administration</p>
          </div>
        </div>

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
                <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                <Input
                  id="username"
                  name="username"
                  type="email"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="medical-input"
                  placeholder="admin@admin.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    className="medical-input pr-10"
                    placeholder="Enter password"
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

              <div className="mt-6 p-4 bg-primary/5 rounded-md border border-primary/20">
                <h4 className="text-sm font-medium text-primary mb-2">Demo Credentials</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Username:</strong> admin@admin.com</p>
                  <p><strong>Password:</strong> 123456789</p>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
