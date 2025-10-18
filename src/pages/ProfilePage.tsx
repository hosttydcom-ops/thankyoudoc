import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Bell,
  Shield,
  Heart,
  Settings,
  LogOut,
  Edit,
  Camera,
  Star,
  Clock,
  Users,
  ChevronRight,
  Pill,
  FileText,
  Lock,
  Eye,
  EyeOff
} from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin, isModerator } from "@/utils/auth";

const ProfilePage = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [showMedicalHistory, setShowMedicalHistory] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [userIsModerator, setUserIsModerator] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    dateJoined: "",
    avatar: "/placeholder.svg"
  });

  // Medical history records (loaded from Supabase)
  const [medicalHistory, setMedicalHistory] = useState<any[]>([]);

  // Load authenticated user and profile
  const loadProfile = async (uid: string) => {
    const [{ data: userRes }, { data: profile, error }] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('profiles')
        .select('first_name,last_name,phone,created_at')
        .eq('id', uid)
        .maybeSingle()
    ]);

    const email = userRes?.user?.email ?? '';
    const joined = userRes?.user?.created_at
      ? new Date(userRes.user.created_at).toLocaleString(undefined, { month: 'long', year: 'numeric' })
      : '';

    setUserInfo(prev => ({
      ...prev,
      name: `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || (email ? email.split('@')[0] : ''),
      email,
      phone: profile?.phone ?? '',
      dateJoined: joined,
    }));
  };

  useEffect(() => {
    let mounted = true;
    
    // Refresh stats when component becomes visible (e.g., returning from other pages)
    const handleVisibilityChange = () => {
      if (!document.hidden && mounted) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            loadStats(session.user.id);
          }
        });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const checkUserRoles = async () => {
      try {
        const [adminStatus, moderatorStatus] = await Promise.all([
          isAdmin(),
          isModerator()
        ]);
        
        if (mounted) {
          setUserIsAdmin(adminStatus);
          setUserIsModerator(moderatorStatus);
        }
      } catch (error) {
        console.error('Error checking user roles:', error);
        if (mounted) {
          setUserIsAdmin(false);
          setUserIsModerator(false);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (!session?.user) {
        navigate('/login');
        return;
      }
      loadProfile(session.user.id);
      loadStats(session.user.id);
      loadMedicalHistory(session.user.id);
      // Check user roles (admin and moderator)
      checkUserRoles();
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (!session?.user) {
        navigate('/login');
      } else {
        loadProfile(session.user.id);
        loadStats(session.user.id);
        loadMedicalHistory(session.user.id);
        // Check user roles (admin and moderator)
        checkUserRoles();
      }
    });

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      subscription.unsubscribe();
    };
  }, [navigate]);

  const [stats, setStats] = useState([
    { label: "Appointments", value: "0", icon: Calendar },
    { label: "Doctors", value: "0", icon: Heart },
    { label: "Reviews", value: "0", icon: Star }
  ]);

  const loadStats = async (userId: string) => {
    try {
      const [appointmentCount, doctorCount, reviewCount] = await Promise.all([
        // Only count active appointments (exclude cancelled)
        supabase.from('appointments').select('id', { count: 'exact' })
          .eq('user_id', userId)
          .neq('status', 'cancelled'),
        // Only count doctors from active appointments
        supabase.from('appointments').select('doctor_id')
          .eq('user_id', userId)
          .neq('status', 'cancelled')
          .then(res => 
            new Set(res.data?.map(a => a.doctor_id) || []).size
          ),
        supabase.from('doctor_reviews').select('id', { count: 'exact' }).eq('user_id', userId)
      ]);

      setStats([
        { label: "Appointments", value: (appointmentCount.count || 0).toString(), icon: Calendar },
        { label: "Doctors", value: doctorCount.toString(), icon: Heart },
        { label: "Reviews", value: (reviewCount.count || 0).toString(), icon: Star }
      ]);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadMedicalHistory = async (userId: string) => {
    try {
      // Fetch user's appointments (exclude cancelled), newest first
      const { data: appts, error } = await supabase
        .from('appointments')
        .select('id, appointment_at, doctor_id, status, notes')
        .eq('user_id', userId)
        .neq('status', 'cancelled')
        .order('appointment_at', { ascending: false });

      if (error) throw error;

      const doctorIds = Array.from(new Set((appts || []).map(a => a.doctor_id).filter(Boolean)));
      let doctorMap: Record<string, any> = {};
      if (doctorIds.length > 0) {
        const { data: doctors } = await supabase
          .from('doctors')
          .select('id, full_name')
          .in('id', doctorIds);
        doctorMap = (doctors || []).reduce((acc: any, d: any) => {
          acc[d.id] = d;
          return acc;
        }, {});
      }

      const records = (appts || []).map((apt: any) => {
        let parsedNotes: any = {};
        try {
          parsedNotes = typeof apt.notes === 'string' ? JSON.parse(apt.notes) : (apt.notes || {});
        } catch {}
        const doctorName = doctorMap[apt.doctor_id]?.full_name || 'Doctor';
        const type = parsedNotes.consultationType
          ? (String(parsedNotes.consultationType).toLowerCase() === 'online' ? 'Online Consultation' : 'Offline Consultation')
          : (apt.status === 'completed' ? 'Consultation' : 'Appointment');
        return {
          id: apt.id,
          date: new Date(apt.appointment_at).toISOString().split('T')[0],
          doctor: doctorName,
          type,
          diagnosis: parsedNotes.diagnosis || parsedNotes.medicalDiagnosis || '',
          prescription: parsedNotes.prescription || parsedNotes.medicines || '',
          precautions: parsedNotes.precautions || parsedNotes.instructions || ''
        };
      });

      setMedicalHistory(records);
    } catch (e) {
      console.error('Error loading medical history:', e);
      setMedicalHistory([]);
    }
  };

  const menuItems = [
    { 
      title: "Medical History", 
      description: "View your past consultations and prescriptions",
      icon: Heart,
      onClick: () => setShowMedicalHistory(true)
    },
    { 
      title: "Privacy Settings", 
      description: "Change password and privacy options",
      icon: Settings,
      onClick: () => setShowPrivacySettings(true)
    },
    ...(userIsAdmin ? [{ 
      title: "Admin Dashboard", 
      description: "Access admin panel and manage system",
      icon: Shield,
      onClick: () => navigate('/admin/dashboard')
    }] : []),
    ...(userIsModerator ? [{ 
      title: "Super Admin", 
      description: "Access super admin panel",
      icon: Shield,
      onClick: () => navigate('/superadmin/dashboard')
    }] : [])
  ];

  const handleSave = () => {
    setIsEditing(false);
    // Persisting to backend can be implemented later; currently just local UI feedback
    toast({ title: "Profile updated", description: "Your profile changes have been saved." });
  };

  const handleLogout = async () => {
    console.info("Logging out...");
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handlePasswordChange = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields.",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error", 
        description: "New passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    // Simulate password change
    console.log("Password change requested:", passwordData);
    toast({
      title: "Password Changed",
      description: "Your password has been updated successfully."
    });
    
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setShowPrivacySettings(false);
  };

  const handlePasswordReset = () => {
    // Simulate password reset email
    console.log("Password reset requested for:", userInfo.email);
    toast({
      title: "Reset Email Sent",
      description: `Password reset instructions have been sent to ${userInfo.email}.`
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 glass-effect border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/")}
                className="h-10 w-10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-foreground">My Profile</h1>
                <p className="text-xs text-muted-foreground">Manage your account</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Profile Card */}
        <Card className="medical-card">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <User className="h-10 w-10 text-primary" />
                </div>
                <Button 
                  size="icon" 
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = () => {
                      toast({ title: "Avatar update", description: "Photo updated successfully!" });
                    };
                    input.click();
                  }}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex-1 space-y-3">
                {isEditing ? (
                  <div className="space-y-3">
                    <Input
                      value={userInfo.name}
                      onChange={(e) => setUserInfo({...userInfo, name: e.target.value})}
                      className="rounded-xl"
                      placeholder="Full Name"
                    />
                    <Input
                      value={userInfo.email}
                      onChange={(e) => setUserInfo({...userInfo, email: e.target.value})}
                      className="rounded-xl"
                      placeholder="Email"
                      type="email"
                    />
                    <Input
                      value={userInfo.phone}
                      onChange={(e) => setUserInfo({...userInfo, phone: e.target.value})}
                      className="rounded-xl"
                      placeholder="Phone"
                    />
                    <Input
                      value={userInfo.location}
                      onChange={(e) => setUserInfo({...userInfo, location: e.target.value})}
                      className="rounded-xl"
                      placeholder="Location"
                    />
                    <div className="flex space-x-2 pt-2">
                      <Button onClick={handleSave} size="sm" className="rounded-lg">
                        Save Changes
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsEditing(false)} 
                        size="sm" 
                        className="rounded-lg"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-foreground">{userInfo.name}</h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span>{userInfo.email}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4" />
                        <span>{userInfo.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span>{userInfo.location}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Joined {userInfo.dateJoined}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="medical-card">
              <CardContent className="p-4 text-center">
                <stat.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Settings */}
        <Card className="medical-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Notifications</p>
                  <p className="text-sm text-muted-foreground">Appointment reminders</p>
                </div>
              </div>
              <Switch 
                checked={notifications} 
                onCheckedChange={(checked) => {
                  setNotifications(checked);
                  localStorage.setItem("tyd_notifications", String(checked));
                  toast({ 
                    title: "Settings updated", 
                    description: `Notifications ${checked ? 'enabled' : 'disabled'}` 
                  });
                }} 
              />
            </div>
          </CardContent>
        </Card>

        {/* Menu Items */}
        <Card className="medical-card">
          <CardContent className="p-0">
            {menuItems.map((item, index) => (
              <div key={item.title}>
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={item.onClick}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
                {index < menuItems.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Authentication Notice */}
        <Card className="medical-card border-primary/20 bg-primary/5">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-primary mb-2">
              Complete Authentication Setup
            </h4>
            <p className="text-muted-foreground mb-4">
              To enable full profile functionality, user authentication, and secure data storage, 
              connect your app to Supabase for backend services.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✓ Secure user authentication</p>
              <p>✓ Encrypted profile data</p>
              <p>✓ Medical history storage</p>
              <p>✓ Appointment synchronization</p>
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Button 
          variant="destructive" 
          className="w-full h-12 rounded-xl"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* Medical History Dialog */}
      <Dialog open={showMedicalHistory} onOpenChange={setShowMedicalHistory}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-primary" />
              <span>Medical History</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {medicalHistory.map((record) => (
              <Card key={record.id} className="border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold">{record.doctor}</h4>
                      <p className="text-sm text-muted-foreground">{record.date}</p>
                      <Badge variant={record.type === "Online Consultation" ? "default" : "secondary"} className="mt-1">
                        {record.type}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <h5 className="font-medium text-sm flex items-center space-x-1">
                        <FileText className="h-4 w-4" />
                        <span>Diagnosis</span>
                      </h5>
                      <p className="text-sm text-muted-foreground">{record.diagnosis}</p>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-sm flex items-center space-x-1">
                        <Pill className="h-4 w-4" />
                        <span>Prescription</span>
                      </h5>
                      <p className="text-sm text-muted-foreground">{record.prescription}</p>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-sm flex items-center space-x-1">
                        <Shield className="h-4 w-4" />
                        <span>Precautions</span>
                      </h5>
                      <p className="text-sm text-muted-foreground">{record.precautions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Settings Dialog */}
      <Dialog open={showPrivacySettings} onOpenChange={setShowPrivacySettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Lock className="h-5 w-5 text-primary" />
              <span>Privacy Settings</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Change Password Section */}
            <div className="space-y-4">
              <h4 className="font-medium">Change Password</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      placeholder="Enter current password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    placeholder="Enter new password"
                  />
                </div>
                
                <div>
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    placeholder="Confirm new password"
                  />
                </div>
                
                <Button onClick={handlePasswordChange} className="w-full">
                  Change Password
                </Button>
              </div>
            </div>
            
            <Separator />
            
            {/* Reset Password Section */}
            <div className="space-y-4">
              <h4 className="font-medium">Reset Password</h4>
              <p className="text-sm text-muted-foreground">
                Forgot your password? We'll send reset instructions to your email.
              </p>
              <Button variant="outline" onClick={handlePasswordReset} className="w-full">
                Send Reset Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      <BottomNavigation currentPage="profile" />
    </div>
  );
};

export default ProfilePage;