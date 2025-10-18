import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar, 
  Users, 
  DollarSign, 
  Bell,
  Settings,
  Trash2,
  Edit,
  UserPlus,
  LogOut,
  AlertTriangle,
  Upload,
  FileSpreadsheet,
  Download,
  Globe,
  CheckCircle2,
  UserCheck,
  Filter,
  Search,
  Loader2,
  Eye,
  Crown
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { hasRole, getUserRole } from "@/utils/auth";

// Add Doctor Form Component
function AddDoctorForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    full_name: "",
    specialty: "",
    bio: "",
    location: "",
    photo_url: "",
    consultation_fee: "",
    rating: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const submit = async () => {
    if (!form.full_name || !form.specialty) return toast.error("Name and Specialty are required");
    setSubmitting(true);
    try {
      const payload: any = {
        full_name: form.full_name,
        specialty: form.specialty,
        bio: form.bio || null,
        location: form.location || null,
        photo_url: form.photo_url || null,
        consultation_fee: form.consultation_fee ? Number(form.consultation_fee) : null,
        rating: form.rating ? Number(form.rating) : null,
      };
      const { error } = await supabase.functions.invoke('admin-doctors', {
        body: { action: 'create', data: payload }
      });
      if (error) throw error;
      toast.success('Doctor added');
      setForm({ full_name: "", specialty: "", bio: "", location: "", photo_url: "", consultation_fee: "", rating: "" });
      onCreated();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add doctor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="full_name">Full Name</Label>
        <Input id="full_name" name="full_name" value={form.full_name} onChange={handleChange} />
      </div>
      <div>
        <Label htmlFor="specialty">Specialty</Label>
        <Input id="specialty" name="specialty" value={form.specialty} onChange={handleChange} placeholder="e.g., Cardiologist" />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" name="bio" value={form.bio} onChange={handleChange} />
      </div>
      <div>
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" value={form.location} onChange={handleChange} />
      </div>
      <div>
        <Label htmlFor="photo_url">Photo URL</Label>
        <Input id="photo_url" name="photo_url" value={form.photo_url} onChange={handleChange} />
      </div>
      <div>
        <Label htmlFor="consultation_fee">Consultation Fee</Label>
        <Input id="consultation_fee" name="consultation_fee" type="number" value={form.consultation_fee} onChange={handleChange} />
      </div>
      <div>
        <Label htmlFor="rating">Rating</Label>
        <Input id="rating" name="rating" type="number" step="0.1" value={form.rating} onChange={handleChange} />
      </div>
      <div className="md:col-span-2">
        <Button onClick={submit} disabled={submitting}>
          {submitting ? 'Adding...' : 'Add Doctor'}
        </Button>
      </div>
    </div>
  );
}
const SuperAdminDashboard = () => {
  const [selectedTab, setSelectedTab] = useState("manage-doctors");
  const [actionModal, setActionModal] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", role: "admin" });
  const [notification, setNotification] = useState({ users: "", message: "" });
  // Removed appointment filter - showing all appointments without filtering
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [scrapingUrl, setScrapingUrl] = useState("");
  
  // Doctor management states
  const [doctors, setDoctors] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<any>(null);
  
  // Available users state for role assignment
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Membership management states
  const [memberships, setMemberships] = useState<any[]>([]);
  const [membershipPlans, setMembershipPlans] = useState<any[]>([]);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  
  // Scraping states
  const [scrapingStatus, setScrapingStatus] = useState<any>({});
  const [scrapingInProgress, setScrapingInProgress] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");

  const navigate = useNavigate();

  const loadAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data: allProfiles, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .order('first_name')
        .limit(50);
      
      if (error) {
        toast.error("Failed to fetch users");
        return;
      }
      
      setAvailableUsers(allProfiles || []);
      toast.success(`Loaded ${allProfiles?.length || 0} users`);
    } catch (error) {
      toast.error("Error fetching users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const copyToClipboard = (text: string, userName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`Copied ${userName}'s User ID`);
    }).catch(() => {
      toast.error("Failed to copy to clipboard");
    });
  };

  const createAdmin = async () => {
    if (!newAdmin.email || !newAdmin.role) {
      toast.error("Please fill in User ID and role fields");
      return;
    }

    try {
      // Since profiles table doesn't store email, treat the "email" field as User ID
      const userId = newAdmin.email; // Using email input as User ID
      
      // Check if user exists in profiles table
      const { data: existingUser, error: userError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('id', userId)
        .single();

      if (userError || !existingUser) {
        toast.error("User with this ID doesn't exist in profiles. Please check the User ID.");
        return;
      }

      // Check if user already has a role
      const { data: existingRole, error: roleCheckError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (existingRole) {
        toast.error(`User already has role: ${existingRole.role}. Cannot assign multiple roles.`);
        return;
      }

      // Assign the new role using the set_user_role function (bypasses RLS)
      const { error: roleError } = await supabase.rpc('set_user_role', {
        user_id: userId,
        role_name: newAdmin.role
      });

      if (roleError) {
        console.error('Error assigning role:', roleError);
        toast.error(`Failed to assign role: ${roleError.message}`);
        return;
      }

      // Reset form
      setNewAdmin({ name: "", email: "", role: "admin" });
      toast.success(`${newAdmin.role === 'admin' ? 'Admin' : 'Moderator'} role assigned successfully to user ${existingUser.first_name} ${existingUser.last_name}!`);

    } catch (error) {
      console.error('Unexpected error creating admin:', error);
      toast.error("An unexpected error occurred");
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      // Check if user is authenticated with Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('Auth session check:', session ? 'Authenticated' : 'Not authenticated');
      if (session) {
        console.log('User ID:', session.user.id);
        console.log('User email:', session.user.email);
      }
      
      if (!session) {
        // If not authenticated with Supabase, check for legacy superadmin
        if (localStorage.getItem("tyd_isSuperAdmin") !== "true") {
          navigate("/superadmin");
          return;
        }
      } else {
        // If authenticated with Supabase, check for moderator role ONLY
        console.log('User authenticated with Supabase, checking moderator role...');
        const userRole = await getUserRole();
        console.log('User role:', userRole);
        
        const isModeratorUser = await hasRole('moderator');
        console.log('Is moderator:', isModeratorUser);
        
        if (!isModeratorUser) {
          // User doesn't have required permissions
          toast.error("Access denied. Only moderators can access this dashboard.");
          navigate("/");
          return;
        }
        
        console.log('Moderator access granted, loading data...');
      }
      
      // User is authorized, load data
      loadAppointments();
      loadDoctors();
      loadMemberships();
      loadMembershipPlans();
    };

    checkAuth();
  }, [navigate]);

  const loadDoctors = async () => {
    try {
      const response = await supabase.functions.invoke('admin-doctors', {
        body: { action: 'search', query: '', limit: 500 }
      });
      
      if (response.error) throw response.error;
      setDoctors(response.data.doctors || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
      toast.error('Failed to load doctors');
    }
  };

  const loadAppointments = async () => {
    try {
      console.log('Loading appointments for moderator...');
      
      // First, fetch all appointments
      const { data: appointmentsData, error } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching appointments:', error);
        throw error;
      }

      console.log(`Fetched ${appointmentsData?.length || 0} appointments from database`);

      // Debug: Log first few appointments to see their structure
      if (appointmentsData && appointmentsData.length > 0) {
        console.log('Sample appointment data:', appointmentsData.slice(0, 3));
        console.log('Sample appointment notes:', appointmentsData.slice(0, 3).map(apt => ({ id: apt.id, notes: apt.notes })));
      }

      if (!appointmentsData || appointmentsData.length === 0) {
        setAppointments([]);
        return;
      }

      // Filter out membership purchases in application code
      const filteredAppointmentsData = appointmentsData.filter(apt => {
        try {
          // Parse notes if it's a string
          let notesObj = apt.notes;
          if (typeof apt.notes === 'string') {
            try {
              notesObj = JSON.parse(apt.notes);
            } catch (parseError) {
              console.warn('Failed to parse appointment notes:', apt.notes, parseError);
              // If we can't parse notes, include the appointment to be safe
              return true;
            }
          }

          // Skip if this is a membership purchase
          if (notesObj && typeof notesObj === 'object' && notesObj.type === 'membership_purchase') {
            console.log('Filtering out membership purchase appointment:', apt.id);
            return false;
          }

          return true;
        } catch (error) {
          console.error('Error processing appointment notes:', error, apt.notes);
          // If there's any error processing, include the appointment to be safe
          return true;
        }
      });

      console.log(`After filtering: ${filteredAppointmentsData.length} appointments remain (filtered ${appointmentsData.length - filteredAppointmentsData.length})`);
      
      // Debug: Check if we have any appointments after filtering
      if (filteredAppointmentsData.length === 0) {
        console.warn('All appointments were filtered out! This might indicate an issue with the filtering logic.');
        console.log('Original appointments:', appointmentsData);
      }

      // Use filtered data for further processing
      const appointmentsDataToUse = filteredAppointmentsData;

      // Get unique user IDs and doctor IDs from filtered appointments
      const userIds = [...new Set(appointmentsDataToUse.map(apt => apt.user_id))];
      const doctorIds = [...new Set(appointmentsDataToUse.map(apt => apt.doctor_id))];

      // Fetch user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      } else {
        console.log(`Fetched ${profiles?.length || 0} user profiles`);
      }

      // Fetch doctor profiles
      const { data: doctors, error: doctorsError } = await supabase
        .from('doctors')
        .select('id, full_name, specialty, phone')
        .in('id', doctorIds);

      if (doctorsError) {
        console.error('Error fetching doctors:', doctorsError);
      } else {
        console.log(`Fetched ${doctors?.length || 0} doctor profiles`);
      }

      // Create lookup maps
      const profileMap = (profiles || []).reduce((acc: any, profile: any) => {
        acc[profile.id] = profile;
        return acc;
      }, {});

      const doctorMap = (doctors || []).reduce((acc: any, doctor: any) => {
        acc[doctor.id] = doctor;
        return acc;
      }, {});
      
      const formattedAppointments = appointmentsDataToUse.map(apt => {
        const profile = profileMap[apt.user_id];
        const doctor = doctorMap[apt.doctor_id];
        return {
          id: apt.id,
          patient: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Unknown Patient',
          doctor: doctor?.full_name || 'Unknown Doctor',
          date: new Date(apt.appointment_at).toISOString().split('T')[0],
          time: new Date(apt.appointment_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          type: "Online",
          status: apt.status,
          paymentStatus: "pending", // Default for now
          phone: doctor?.phone || profile?.phone
        };
      });
      
      console.log(`Formatted ${formattedAppointments.length} appointments for display`);
      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('Error loading appointments:', error);
      setAppointments([]);
    }
  };

  const loadMemberships = async () => {
    try {
      console.log('Loading memberships for moderator...');

      // Fetch all memberships
      const { data: membershipsData, error } = await supabase
        .from('memberships')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching memberships:', error);
        throw error;
      }

      console.log(`Fetched ${membershipsData?.length || 0} memberships from database`);

      if (!membershipsData || membershipsData.length === 0) {
        setMemberships([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(membershipsData.map(membership => membership.user_id))];

      // Fetch user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles for memberships:', profilesError);
      } else {
        console.log(`Fetched ${profiles?.length || 0} user profiles for memberships`);
      }

      // Create lookup map
      const profileMap = (profiles || []).reduce((acc: any, profile: any) => {
        acc[profile.id] = profile;
        return acc;
      }, {});

      const formattedMemberships = membershipsData.map(membership => {
        const profile = profileMap[membership.user_id];
        return {
          id: membership.id,
          user: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Unknown User',
          email: membership.member_details?.email || 'N/A',
          phone: membership.member_details?.contact || profile?.phone || 'N/A',
          amount: membership.amount,
          duration: membership.duration_months,
          appointments: membership.appointments_included,
          status: membership.status,
          validFrom: new Date(membership.valid_from).toLocaleDateString(),
          validUntil: new Date(membership.valid_until).toLocaleDateString(),
          paymentReference: membership.payment_reference,
          createdAt: new Date(membership.created_at).toLocaleDateString()
        };
      });

      console.log(`Formatted ${formattedMemberships.length} memberships for display`);
      setMemberships(formattedMemberships);
    } catch (error) {
      console.error('Error loading memberships:', error);
      setMemberships([]);
    }
  };

  const loadMembershipPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMembershipPlans(data || []);
    } catch (e) {
      console.error('Failed to load membership plans', e);
      toast.error('Failed to load membership plans');
    }
  };

  const handleMembershipAction = async (membership: any, action: string) => {
    try {
      let newStatus = membership.status;

      if (action === "approve") {
        newStatus = "active";
      } else if (action === "reject" || action === "cancel") {
        newStatus = "cancelled";
      }

      const { error } = await supabase
        .from('memberships')
        .update({ status: newStatus })
        .eq('id', membership.id);

      if (error) throw error;

      const actionText = action === "approve" ? "approved" : (action === "cancel" ? "cancelled" : "rejected");
      toast.success(`Membership ${actionText} successfully`);
      loadMemberships(); // Reload memberships
    } catch (error) {
      console.error('Error updating membership:', error);
      toast.error("Failed to update membership status");
    }
  };

  const handleAppointmentAction = async (appointment: any, action: string) => {
    try {
      let newStatus = appointment.status;
      
      if (action === "approve") {
        newStatus = "confirmed";
      } else if (action === "reject" || action === "cancel") {
        newStatus = "cancelled";
      } else if (action === "approve_user_cancellation") {
        newStatus = "cancelled";
      } else if (action === "deny_user_cancellation") {
        newStatus = "confirmed";
      } else if (action === "approve_doctor_cancellation") {
        newStatus = "cancelled";
      } else if (action === "deny_doctor_cancellation") {
        newStatus = "confirmed";
      }

      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointment.id);

      if (error) throw error;

      const actionText = action.includes("approve") ? "approved" : (action.includes("cancel") || action.includes("reject") ? "cancelled" : "processed");
      toast.success(`Appointment ${actionText} successfully`);
      loadAppointments(); // Reload appointments
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error("Failed to update appointment status");
    }
  };

  // Fetch doctors from database
  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to fetch doctors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  // Filter doctors based on search
  const filteredDoctors = doctors.filter(doctor =>
    doctor.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const reviews = [
    {
      id: 1,
      patient: "John D.",
      doctor: "Dr. Sarah Johnson",
      rating: 5,
      comment: "Excellent doctor! Very thorough examination.",
      date: "2024-01-15",
      status: "approved"
    },
    {
      id: 2,
      patient: "Anonymous",
      doctor: "Dr. Michael Chen", 
      rating: 1,
      comment: "This doctor is terrible and unprofessional!",
      date: "2024-01-16",
      status: "flagged"
    }
  ];

  const payments = [
    {
      id: 1,
      patient: "John Doe",
      doctor: "Dr. Sarah Johnson",
      amount: 150,
      type: "Online",
      status: "completed",
      date: "2024-01-15"
    },
    {
      id: 2,
      patient: "Jane Smith",
      doctor: "Dr. Michael Chen",
      amount: 200,
      type: "Offline",
      status: "pending",
      date: "2024-01-18"
    }
  ];

  const confirmAction = () => {
    if (actionModal) {
      handleAppointmentAction(actionModal.appointment, actionModal.action);
      setActionModal(null);
      setReason("");
    }
  };

  // createAdmin function moved above - now fully implemented

  const sendNotification = () => {
    // TODO: Connect to notification service
    console.log("Sending notification:", notification);
    setNotification({ users: "", message: "" });
  };

  // Doctor management functions
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedDoctors(filteredDoctors.map(doctor => doctor.id));
    } else {
      setSelectedDoctors([]);
    }
  };

  const handleSelectDoctor = (doctorId: string, checked: boolean) => {
    if (checked) {
      setSelectedDoctors([...selectedDoctors, doctorId]);
    } else {
      setSelectedDoctors(selectedDoctors.filter(id => id !== doctorId));
      setSelectAll(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDoctors.length === 0) return;
    try {
      const { data, error } = await supabase.functions.invoke('admin-doctors', {
        body: { action: 'bulkDelete', ids: selectedDoctors }
      });
      if (error) throw error;
      toast.success(`Deleted ${selectedDoctors.length} doctor(s) successfully`);
      setSelectedDoctors([]);
      setSelectAll(false);
      fetchDoctors();
    } catch (error) {
      console.error('Error deleting doctors:', error);
      toast.error('Failed to delete doctors');
    }
  };

  const handleDeleteDoctor = async (doctorId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-doctors', {
        body: { action: 'delete', id: doctorId }
      });
      if (error) throw error;
      toast.success('Doctor deleted successfully');
      fetchDoctors();
    } catch (error) {
      console.error('Error deleting doctor:', error);
      toast.error('Failed to delete doctor');
    }
  };

  const handleEditDoctor = (doctor: any) => {
    setEditingDoctor(doctor);
  };

  const handleSaveDoctor = async (doctorData: any) => {
    try {
      const { error } = await supabase.functions.invoke('admin-doctors', {
        body: { action: 'update', data: doctorData }
      });
      if (error) throw error;
      toast.success('Doctor updated successfully');
      setEditingDoctor(null);
      fetchDoctors();
    } catch (error) {
      console.error('Error updating doctor:', error);
      toast.error('Failed to update doctor');
    }
  };

  // Scraping functions
  const handleStartScraping = async () => {
    if (!selectedCategory) {
      toast.error('Please select a category to scrape');
      return;
    }
    
    setScrapingInProgress(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-practo-doctors', {
        body: { 
          category: selectedCategory,
          baseUrl: 'https://www.practo.com/hyderabad',
          limit: 200
        }
      });
      if (error) throw error;
      toast.success('Scraping completed');
      setScrapingStatus(data);
      // Refresh list after scrape
      fetchDoctors();
    } catch (error) {
      console.error('Error starting scraping:', error);
      toast.error('Failed to start scraping');
    } finally {
      setScrapingInProgress(false);
    }
  };

  const categories = [
    'cardiologist', 'dermatologist', 'pediatrician', 'orthopedic', 
    'neurologist', 'psychiatrist', 'gynecologist', 'general-physician',
    'dentist', 'ophthalmologist', 'urologist', 'gastroenterologist'
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-warning/20 text-warning-foreground"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "confirmed":
        return <Badge variant="secondary" className="bg-success/20 text-success-foreground"><CheckCircle className="h-3 w-3 mr-1" />Confirmed</Badge>;
      case "cancelled":
        return <Badge variant="secondary" className="bg-destructive/20 text-destructive-foreground"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      case "completed":
        return <Badge variant="secondary" className="bg-primary/20 text-primary-foreground"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "user_cancellation_requested":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-700"><AlertTriangle className="h-3 w-3 mr-1" />User Cancellation Request</Badge>;
      case "doctor_cancellation_requested":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-700"><AlertTriangle className="h-3 w-3 mr-1" />Doctor Cancellation Request</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-primary">Super Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-success/20 text-success-foreground">
                <Shield className="h-3 w-3 mr-1" />
                Admin Access
              </Badge>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={async () => {
                  // Clear legacy localStorage
                  localStorage.removeItem("tyd_isSuperAdmin");
                  localStorage.removeItem("tyd_adminEmail");
                  
                  // Sign out from Supabase if authenticated
                  const { data: { session } } = await supabase.auth.getSession();
                  if (session) {
                    await supabase.auth.signOut();
                    navigate("/");
                  } else {
                    navigate("/superadmin");
                  }
                }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-fade-in">
          <Card className="medical-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Appointments</p>
                  <p className="text-2xl font-bold text-primary">{appointments.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Approval</p>
                  <p className="text-2xl font-bold text-warning">
                    {appointments.filter(apt => apt.status === 'pending').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-warning/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Doctors</p>
                  <p className="text-2xl font-bold text-success">{doctors.length}</p>
                </div>
                <Users className="h-8 w-8 text-success/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Memberships</p>
                  <p className="text-2xl font-bold text-primary">{memberships.length}</p>
                </div>
                <Crown className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="animate-slide-up">
          <TabsList className="flex flex-col gap-2 mb-8 bg-transparent">
            <div className="flex gap-1">
              <TabsTrigger value="manage-doctors" className="px-4 py-2 text-sm font-medium rounded-full data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200 transition-all">
                Manage Doctors
              </TabsTrigger>
              <TabsTrigger value="appointments" className="px-4 py-2 text-sm font-medium rounded-full data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200 transition-all">
                Appointments
              </TabsTrigger>
              <TabsTrigger value="doctors" className="px-4 py-2 text-sm font-medium rounded-full data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200 transition-all">
                Add Doctor
              </TabsTrigger>
              <TabsTrigger value="bulk-upload" className="px-4 py-2 text-sm font-medium rounded-full data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200 transition-all">
                Scrape Doctors
              </TabsTrigger>
            </div>
            <div className="flex gap-1">
              <TabsTrigger value="payments" className="px-4 py-2 text-sm font-medium rounded-full data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200 transition-all">
                Payments
              </TabsTrigger>
              <TabsTrigger value="admins" className="px-4 py-2 text-sm font-medium rounded-full data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200 transition-all">
                Admins
              </TabsTrigger>
              <TabsTrigger value="memberships" className="px-4 py-2 text-sm font-medium rounded-full data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200 transition-all">
                Memberships
              </TabsTrigger>
              <TabsTrigger value="membership-plans" className="px-4 py-2 text-sm font-medium rounded-full data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200 transition-all">
                Membership Plans
              </TabsTrigger>
            </div>
          </TabsList>

          {/* Manage Doctors Tab */}
          <TabsContent value="manage-doctors" className="space-y-6">
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span>Doctor Management</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search doctors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    {selectedDoctors.length > 0 && (
                      <Button
                        variant="destructive"
                        onClick={handleDeleteSelected}
                        className="flex items-center space-x-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete Selected ({selectedDoctors.length})</span>
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading doctors...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectAll}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Photo</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Specialty</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Fee</TableHead>
                          <TableHead>Rating</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDoctors.map((doctor) => (
                          <TableRow key={doctor.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedDoctors.includes(doctor.id)}
                                onCheckedChange={(checked) => handleSelectDoctor(doctor.id, checked as boolean)}
                              />
                            </TableCell>
                            <TableCell>
                              {doctor.photo_url ? (
                                <img 
                                  src={doctor.photo_url} 
                                  alt={doctor.full_name}
                                  className="w-12 h-12 rounded-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                  <Users className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{doctor.full_name}</p>
                                {doctor.bio && <p className="text-sm text-muted-foreground">{String(doctor.bio).substring(0, 50)}...</p>}
                              </div>
                            </TableCell>
                            <TableCell>{doctor.specialty}</TableCell>
                            <TableCell>{doctor.location}</TableCell>
                            <TableCell>
                              {doctor.consultation_fee ? `₹${doctor.consultation_fee}` : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                {doctor.rating && (
                                  <Badge variant="secondary">
                                    ⭐ {doctor.rating}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditDoctor(doctor)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteDoctor(doctor.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredDoctors.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No doctors found
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-6">
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span>Appointment Management</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-muted-foreground">Showing All Appointments</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    console.log('Total appointments in state:', appointments.length);
                    console.log('Appointments data:', appointments);
                    
                    // No filtering - show ALL appointments
                    return appointments.map((appointment) => (
                    <Card key={appointment.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold">{appointment.patient}</h4>
                            <p className="text-sm text-muted-foreground">with {appointment.doctor}</p>
                            <p className="text-sm text-muted-foreground">{appointment.date} at {appointment.time}</p>
                            <p className="text-sm text-muted-foreground">{appointment.type} consultation</p>
                          </div>
                          <div className="text-right space-y-2">
                            {(() => {
                              console.log(`Appointment ${appointment.id} status:`, appointment.status);
                              return getStatusBadge(appointment.status);
                            })()}
                            {appointment.status !== "cancelled" && (
                              <Badge variant={appointment.paymentStatus === "paid" ? "secondary" : "outline"} className="block">
                                {appointment.paymentStatus === "paid" ? "Paid" : "Pending"}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                         <div className="flex space-x-2 flex-wrap gap-2">
                          {appointment.status === "pending" && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleAppointmentAction(appointment, "approve")}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleAppointmentAction(appointment, "reject")}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}

                          {appointment.status === "confirmed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAppointmentAction(appointment, "cancel")}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancel Request
                            </Button>
                          )}
                          
                          {appointment.status === "user_cancellation_requested" && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleAppointmentAction(appointment, "approve_user_cancellation")}
                                className="bg-orange-600 hover:bg-orange-700 text-white"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve User Cancellation
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAppointmentAction(appointment, "deny_user_cancellation")}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Deny Cancellation
                              </Button>
                            </>
                          )}
                          
                          {appointment.status === "doctor_cancellation_requested" && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleAppointmentAction(appointment, "approve_doctor_cancellation")}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve Doctor Cancellation
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAppointmentAction(appointment, "deny_doctor_cancellation")}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Deny Cancellation
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ));
                  })()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Add Doctor Tab */}
          <TabsContent value="doctors" className="space-y-6">
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  <span>Add Doctor</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AddDoctorForm onCreated={fetchDoctors} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scrape Doctors Tab */}
          <TabsContent value="bulk-upload" className="space-y-6">
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <span>Scrape Doctors from Practo</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="category-select">Select Category</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose doctor category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      onClick={handleStartScraping}
                      disabled={!selectedCategory || scrapingInProgress}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {scrapingInProgress ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Scraping in Progress...
                        </>
                      ) : (
                        <>
                          <Globe className="h-4 w-4 mr-2" />
                          Start Scraping (200 profiles)
                        </>
                      )}
                    </Button>
                  </div>

                  <Card className="bg-muted/50 p-4">
                    <h4 className="font-semibold text-sm mb-3">Scraping Information</h4>
                    <div className="text-sm space-y-2">
                      <p>• <strong>Source:</strong> Practo.com (Hyderabad)</p>
                      <p>• <strong>Data per category:</strong> ~200 doctor profiles</p>
                      <p>• <strong>Includes:</strong> Photos, contact info, specialties, ratings</p>
                      <p>• <strong>Processing time:</strong> 3-5 minutes per category</p>
                      <p>• <strong>Categories available:</strong> {categories.length}</p>
                    </div>
                  </Card>
                </div>

                {/* Category-wise Scraping Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {categories.map((category) => (
                    <Card key={category} className="p-4 cursor-pointer border hover:border-primary transition-colors"
                          onClick={() => setSelectedCategory(category)}>
                      <div className="text-center">
                        <h4 className="font-medium text-sm mb-1">
                          {category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h4>
                        <Badge 
                          variant={selectedCategory === category ? "default" : "secondary"}
                          className="text-xs"
                        >
                          ~200 profiles
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Scraping Status */}
                {Object.keys(scrapingStatus).length > 0 && (
                  <Card className="bg-blue-50 border-blue-200 p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Latest Scraping Results</h4>
                    <div className="text-sm space-y-1 text-blue-800">
                      <p>Category: {scrapingStatus.category}</p>
                      <p>Profiles Scraped: {scrapingStatus.profilesScraped || 0}</p>
                      <p>Success Rate: {scrapingStatus.successRate || 0}%</p>
                      <p>Status: {scrapingStatus.status}</p>
                    </div>
                  </Card>
                )}
              </CardContent>
            </Card>

            {/* Original Bulk Upload Section */}
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  <span>Add Single Doctor Profile</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <form className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary border-b pb-2">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="doctor-name">Full Name *</Label>
                        <Input id="doctor-name" placeholder="Dr. John Smith" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doctor-email">Email Address *</Label>
                        <Input id="doctor-email" type="email" placeholder="doctor@hospital.com" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doctor-phone">Phone Number *</Label>
                        <Input id="doctor-phone" type="tel" placeholder="+1234567890" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doctor-specialization">Specialization *</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select specialization" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cardiology">Cardiology</SelectItem>
                            <SelectItem value="dermatology">Dermatology</SelectItem>
                            <SelectItem value="pediatrics">Pediatrics</SelectItem>
                            <SelectItem value="orthopedics">Orthopedics</SelectItem>
                            <SelectItem value="neurology">Neurology</SelectItem>
                            <SelectItem value="psychiatry">Psychiatry</SelectItem>
                            <SelectItem value="gynecology">Gynecology</SelectItem>
                            <SelectItem value="general">General Medicine</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doctor-experience">Years of Experience *</Label>
                        <Input id="doctor-experience" type="number" placeholder="5" min="0" max="50" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doctor-license">Medical License Number *</Label>
                        <Input id="doctor-license" placeholder="MD123456789" required />
                      </div>
                    </div>
                  </div>

                  {/* Professional Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary border-b pb-2">Professional Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="doctor-qualifications">Qualifications *</Label>
                        <Textarea id="doctor-qualifications" placeholder="MBBS, MD - Cardiology, Fellowship in Interventional Cardiology" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doctor-about">About Doctor *</Label>
                        <Textarea id="doctor-about" placeholder="Brief description about the doctor's expertise and approach..." required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doctor-languages">Languages Spoken</Label>
                        <Input id="doctor-languages" placeholder="English, Spanish, French" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doctor-awards">Awards & Certifications</Label>
                        <Textarea id="doctor-awards" placeholder="Board certified in Cardiology, Best Doctor Award 2023..." />
                      </div>
                    </div>
                  </div>

                  {/* Clinic & Practice Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary border-b pb-2">Clinic & Practice Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="clinic-name">Clinic/Hospital Name</Label>
                        <Input id="clinic-name" placeholder="City General Hospital" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clinic-address">Clinic Address</Label>
                        <Textarea id="clinic-address" placeholder="123 Medical Street, Health City, HC 12345" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="consultation-fee">Consultation Fee (INR)</Label>
                        <Input id="consultation-fee" type="number" placeholder="150" min="0" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="consultation-types">Consultation Types</Label>
                        <div className="flex space-x-4">
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">Online</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">In-Person</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">Home Visit</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Availability & Schedule */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary border-b pb-2">Availability & Schedule</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="working-days">Working Days</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                            <label key={day} className="flex items-center space-x-2">
                              <input type="checkbox" className="rounded" />
                              <span className="text-sm">{day.slice(0, 3)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="working-hours">Working Hours</Label>
                        <div className="flex items-center space-x-2">
                          <Input type="time" placeholder="09:00" className="flex-1" />
                          <span className="text-muted-foreground">to</span>
                          <Input type="time" placeholder="17:00" className="flex-1" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profile Image Upload */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary border-b pb-2">Profile Image</h3>
                    <div className="space-y-2">
                      <Label htmlFor="doctor-image">Upload Profile Photo</Label>
                      <Input id="doctor-image" type="file" accept="image/*" />
                      <p className="text-sm text-muted-foreground">Recommended: 300x300px, JPG or PNG format</p>
                    </div>
                  </div>

                  {/* Account Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary border-b pb-2">Account Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Account Status</Label>
                        <div className="flex space-x-4">
                          <label className="flex items-center space-x-2">
                            <input type="radio" name="status" value="active" className="rounded" />
                            <span className="text-sm">Active</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="radio" name="status" value="pending" className="rounded" defaultChecked />
                            <span className="text-sm">Pending Verification</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="radio" name="status" value="inactive" className="rounded" />
                            <span className="text-sm">Inactive</span>
                          </label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Verification Badges</Label>
                        <div className="flex space-x-4">
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">Verified Doctor</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">Trusted Provider</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex space-x-4 pt-6 border-t">
                    <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Doctor Profile
                    </Button>
                    <Button type="button" variant="outline">
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* File Upload Section */}
              <Card className="medical-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Upload className="h-5 w-5 text-primary" />
                    <span>Bulk Upload Doctors</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulk-upload">Upload CSV or XLSX File</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="bulk-upload"
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => setBulkUploadFile(e.target.files?.[0] || null)}
                        className="flex-1"
                      />
                      <Button 
                        onClick={() => console.log("Upload file:", bulkUploadFile)}
                        disabled={!bulkUploadFile}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Upload
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Sample Files</Label>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => console.log("Download CSV sample")}>
                        <FileSpreadsheet className="h-4 w-4 mr-1" />
                        Download CSV Sample
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => console.log("Download XLSX sample")}>
                        <Download className="h-4 w-4 mr-1" />
                        Download XLSX Sample
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>Required fields: Name, Specialization, Email, Phone, Experience, Qualifications, About</p>
                    <p>Optional fields: Clinic Address, Fees, Availability</p>
                  </div>
                </CardContent>
              </Card>

              {/* Web Scraping Section */}
              <Card className="medical-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Globe className="h-5 w-5 text-primary" />
                    <span>Web Scraping</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="scraping-url">Website URL to Scrape</Label>
                    <Input
                      id="scraping-url"
                      type="url"
                      placeholder="https://example-medical-directory.com"
                      value={scrapingUrl}
                      onChange={(e) => setScrapingUrl(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    onClick={() => console.log("Start scraping:", scrapingUrl)}
                    disabled={!scrapingUrl}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Globe className="h-4 w-4 mr-1" />
                    Start Scraping (100 profiles/batch)
                  </Button>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>• Scrapes doctor profiles from medical directories</p>
                    <p>• Processes 100 profiles per batch</p>
                    <p>• Automatically adds to verification queue</p>
                    <p>• Supports most medical directory formats</p>
                  </div>
                  
                  <Card className="bg-muted/50 p-3">
                    <h4 className="font-semibold text-sm mb-2">Scraping Status</h4>
                    <div className="text-sm space-y-1">
                      <p>Last Batch: Not started</p>
                      <p>Profiles Scraped: 0</p>
                      <p>Success Rate: 0%</p>
                    </div>
                  </Card>
                </CardContent>
              </Card>
            </div>

            {/* Upload History */}
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span>Upload History</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">doctors_batch_1.csv</p>
                      <p className="text-sm text-muted-foreground">Uploaded 2 hours ago • 50 profiles</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700">Completed</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">Scraping: medicaldirectory.com</p>
                      <p className="text-sm text-muted-foreground">Started 1 hour ago • 25/100 profiles</p>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-700">Processing</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span>Payment Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex space-x-4">
                  <Select>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payments</SelectItem>
                      <SelectItem value="online">Online Payments</SelectItem>
                      <SelectItem value="offline">Offline Payments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <Card key={payment.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold">{payment.patient}</h4>
                            <p className="text-sm text-muted-foreground">to {payment.doctor}</p>
                            <p className="text-sm text-muted-foreground">{payment.date}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">₹{payment.amount}</p>
                            <Badge variant={payment.type === "Online" ? "secondary" : "outline"}>
                              {payment.type}
                            </Badge>
                            <Badge 
                              variant={payment.status === "completed" ? "secondary" : "outline"}
                              className={payment.status === "completed" ? "bg-success/20 text-success-foreground ml-2" : "ml-2"}
                            >
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admins Tab */}
          <TabsContent value="admins" className="space-y-6">
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  <span>Assign Admin/Moderator Role</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Assign admin or moderator role to existing users. <strong>Note:</strong> You need the User ID (UUID) from the profiles table since emails aren't stored there.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="admin-email">User ID (UUID)</Label>
                      <Input
                        id="admin-email"
                        type="text"
                        value={newAdmin.email}
                        onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                        placeholder="12345678-1234-1234-1234-123456789abc"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Get this from the profiles table in your database
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="admin-role">Assign Role</Label>
                      <Select onValueChange={(value) => setNewAdmin({...newAdmin, role: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button variant="medical" className="mt-4" onClick={createAdmin}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign Role
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Helper: Show Available Users */}
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span>Available Users</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={loadAvailableUsers}
                    disabled={loadingUsers}
                  >
                    {loadingUsers ? "Loading..." : "Load Users"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availableUsers.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Click "Copy ID" to copy the User ID, then paste it in the form above:
                    </p>
                    <div className="max-h-64 overflow-y-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>User ID</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availableUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">
                                {`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'No Name'}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {user.id.length > 12 ? `${user.id.substring(0, 8)}...${user.id.slice(-4)}` : user.id}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyToClipboard(user.id, `${user.first_name || ''} ${user.last_name || ''}`.trim())}
                                >
                                  Copy ID
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Click "Load Users" to see available users for role assignment.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Memberships Tab */}
          <TabsContent value="memberships" className="space-y-6">
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <span>Membership Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    console.log('Total memberships in state:', memberships.length);
                    console.log('Memberships data:', memberships);

                    // No filtering - show ALL memberships
                    return memberships.map((membership) => (
                    <Card key={membership.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold">{membership.user}</h4>
                            <p className="text-sm text-muted-foreground">{membership.email}</p>
                            <p className="text-sm text-muted-foreground">{membership.phone}</p>
                            <p className="text-sm text-muted-foreground">Valid: {membership.validFrom} to {membership.validUntil}</p>
                          </div>
                          <div className="text-right space-y-2">
                            <p className="text-lg font-bold text-primary">₹{membership.amount}</p>
                            <p className="text-sm text-muted-foreground">{membership.duration} months</p>
                            <p className="text-sm text-muted-foreground">{membership.appointments} appointments</p>
                            {(() => {
                              console.log(`Membership ${membership.id} status:`, membership.status);
                              return getStatusBadge(membership.status);
                            })()}
                          </div>
                        </div>

                         <div className="flex space-x-2 flex-wrap gap-2">
                          {membership.status === "pending" && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleMembershipAction(membership, "approve")}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleMembershipAction(membership, "reject")}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}

                          {membership.status === "active" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMembershipAction(membership, "cancel")}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ));
                  })()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Membership Plans Tab */}
          <TabsContent value="membership-plans" className="space-y-6">
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Crown className="h-5 w-5 text-primary" />
                    <span>Membership Plans</span>
                  </div>
                  <Button onClick={() => setEditingPlan({ name: '', description: '', price_in_inr: 0, duration_months: 6, appointments_included: 0, benefits: [], is_active: true })}>
                    Create Plan
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Price (INR)</TableHead>
                        <TableHead>Duration (months)</TableHead>
                        <TableHead>Appointments</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {membershipPlans.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell className="font-medium">{plan.name}</TableCell>
                          <TableCell>₹{Number(plan.price_in_inr).toFixed(2)}</TableCell>
                          <TableCell>{plan.duration_months}</TableCell>
                          <TableCell>{plan.appointments_included}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={plan.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                              {plan.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button variant="outline" size="sm" onClick={() => setEditingPlan(plan)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={async () => {
                                try {
                                  const { error } = await supabase.from('membership_plans').delete().eq('id', plan.id);
                                  if (error) throw error;
                                  toast.success('Plan deleted');
                                  loadMembershipPlans();
                                } catch (e) {
                                  console.error('Delete failed', e);
                                  toast.error('Failed to delete plan');
                                }
                              }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {membershipPlans.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">No plans yet</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {editingPlan && (
              <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingPlan.id ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="plan-name">Name</Label>
                      <Input id="plan-name" value={editingPlan.name} onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="plan-desc">Description</Label>
                      <Textarea id="plan-desc" value={editingPlan.description || ''} onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="plan-price">Price (INR)</Label>
                        <Input id="plan-price" type="number" value={editingPlan.price_in_inr} onChange={(e) => setEditingPlan({ ...editingPlan, price_in_inr: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label htmlFor="plan-duration">Duration</Label>
                        <Input id="plan-duration" type="number" value={editingPlan.duration_months} onChange={(e) => setEditingPlan({ ...editingPlan, duration_months: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label htmlFor="plan-appointments">Appointments</Label>
                        <Input id="plan-appointments" type="number" value={editingPlan.appointments_included} onChange={(e) => setEditingPlan({ ...editingPlan, appointments_included: Number(e.target.value) })} />
                      </div>
                    </div>
                    <div>
                      <Label>Active</Label>
                      <div className="mt-2">
                        <Checkbox checked={!!editingPlan.is_active} onCheckedChange={(v) => setEditingPlan({ ...editingPlan, is_active: Boolean(v) })} />
                      </div>
                    </div>
                    <div className="flex space-x-2 pt-2">
                      <Button variant="outline" onClick={() => setEditingPlan(null)} className="flex-1">Cancel</Button>
                      <Button className="flex-1" onClick={async () => {
                        try {
                          if (!editingPlan.name || !editingPlan.duration_months) {
                            toast.error('Name and duration are required');
                            return;
                          }
                          if (editingPlan.id) {
                            const { error } = await supabase.from('membership_plans').update({
                              name: editingPlan.name,
                              description: editingPlan.description,
                              price_in_inr: editingPlan.price_in_inr,
                              duration_months: editingPlan.duration_months,
                              appointments_included: editingPlan.appointments_included,
                              benefits: editingPlan.benefits || [],
                              is_active: editingPlan.is_active,
                            }).eq('id', editingPlan.id);
                            if (error) throw error;
                            toast.success('Plan updated');
                          } else {
                            const { error } = await supabase.from('membership_plans').insert({
                              name: editingPlan.name,
                              description: editingPlan.description,
                              price_in_inr: editingPlan.price_in_inr,
                              duration_months: editingPlan.duration_months,
                              appointments_included: editingPlan.appointments_included,
                              benefits: editingPlan.benefits || [],
                              is_active: editingPlan.is_active,
                            });
                            if (error) throw error;
                            toast.success('Plan created');
                          }
                          setEditingPlan(null);
                          loadMembershipPlans();
                        } catch (e) {
                          console.error('Save failed', e);
                          toast.error('Failed to save plan');
                        }
                      }}>Save</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Modal */}
        {actionModal && (
          <Dialog open={!!actionModal} onOpenChange={() => setActionModal(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {actionModal.action === "approve" && "Approve Appointment"}
                  {actionModal.action === "reject" && "Reject Appointment"}
                  {actionModal.action === "cancel" && "Request Cancellation"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-md">
                  <p><strong>Patient:</strong> {actionModal.appointment.patient}</p>
                  <p><strong>Doctor:</strong> {actionModal.appointment.doctor}</p>
                  <p><strong>Date:</strong> {actionModal.appointment.date} at {actionModal.appointment.time}</p>
                </div>
                
                {(actionModal.action === "reject" || actionModal.action === "cancel") && (
                  <div>
                    <Label htmlFor="reason">Reason</Label>
                    <Textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Please provide a reason..."
                      rows={3}
                    />
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setActionModal(null)} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    variant={actionModal.action === "approve" ? "default" : "destructive"} 
                    onClick={confirmAction} 
                    className="flex-1"
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Doctor Edit Modal */}
        {editingDoctor && (
          <Dialog open={!!editingDoctor} onOpenChange={() => setEditingDoctor(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Doctor Profile</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Full Name</Label>
                    <Input
                      id="edit-name"
                      value={editingDoctor.full_name}
                      onChange={(e) => setEditingDoctor({...editingDoctor, full_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-specialty">Specialty</Label>
                    <Input
                      id="edit-specialty"
                      value={editingDoctor.specialty}
                      onChange={(e) => setEditingDoctor({...editingDoctor, specialty: e.target.value})}
                    />
                  </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    type="tel"
                    value={editingDoctor.phone || ''}
                    onChange={(e) => setEditingDoctor({...editingDoctor, phone: e.target.value})}
                  />
                </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-location">Location</Label>
                    <Input
                      id="edit-location"
                      value={editingDoctor.location || ''}
                      onChange={(e) => setEditingDoctor({...editingDoctor, location: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-fee">Consultation Fee</Label>
                    <Input
                      id="edit-fee"
                      type="number"
                      value={editingDoctor.consultation_fee || ''}
                      onChange={(e) => setEditingDoctor({...editingDoctor, consultation_fee: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-rating">Rating</Label>
                    <Input
                      id="edit-rating"
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={editingDoctor.rating || ''}
                      onChange={(e) => setEditingDoctor({...editingDoctor, rating: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-photo">Photo URL</Label>
                    <Input
                      id="edit-photo"
                      type="url"
                      value={editingDoctor.photo_url || ''}
                      onChange={(e) => setEditingDoctor({...editingDoctor, photo_url: e.target.value})}
                    />
                  </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-qualifications">Education / Qualifications</Label>
                  <Textarea
                    id="edit-qualifications"
                    value={editingDoctor.qualifications || ''}
                    onChange={(e) => setEditingDoctor({...editingDoctor, qualifications: e.target.value})}
                    rows={2}
                  />
                </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bio">Bio</Label>
                  <Textarea
                    id="edit-bio"
                    value={editingDoctor.bio || ''}
                    onChange={(e) => setEditingDoctor({...editingDoctor, bio: e.target.value})}
                    rows={3}
                  />
                </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Textarea
                  id="edit-address"
                  value={editingDoctor.address || ''}
                  onChange={(e) => setEditingDoctor({...editingDoctor, address: e.target.value})}
                  rows={3}
                />
              </div>
                
                <div className="flex space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setEditingDoctor(null)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={() => handleSaveDoctor(editingDoctor)} className="flex-1">
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;