import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { 
  Heart, 
  LogOut, 
  User, 
  Calendar as CalendarIcon, 
  MapPin, 
  Clock, 
  Users,
  CheckCircle,
  XCircle,
  Edit,
  Plus,
  Trash2,
  Phone,
  Crown
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("appointments");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState<"accept" | "reject" | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [newClinic, setNewClinic] = useState({ name: "", address: "", phone: "" });

  // Mock admin/doctor profile
  const [profile, setProfile] = useState({
    name: "Dr. Admin Johnson",
    email: "admin@admin.com",
    phone: "+1 (555) 123-4567",
    specialization: "System Administrator",
    about: "Managing healthcare platform operations and doctor consultations.",
    experience: "10+ years",
    qualification: "MD, Healthcare Administration"
  });

  // Mock clinics
  const [clinics, setClinics] = useState([
    { id: 1, name: "Main Medical Center", address: "123 Healthcare Ave", phone: "+1 (555) 111-2222" },
    { id: 2, name: "Downtown Clinic", address: "456 Medical Plaza", phone: "+1 (555) 333-4444" }
  ]);

// Real appointments from Supabase
const [appointments, setAppointments] = useState<any[]>([]);
const [isLoading, setIsLoading] = useState(true);

// Memberships state
const [memberships, setMemberships] = useState<any[]>([]);
const [isLoadingMemberships, setIsLoadingMemberships] = useState(true);
const [todayAppointments, setTodayAppointments] = useState(0);
const [pendingRequests, setPendingRequests] = useState(0);
const [totalPatients, setTotalPatients] = useState(0);
const [totalClinics, setTotalClinics] = useState(0);
const [totalMemberships, setTotalMemberships] = useState(0);
const [pendingMemberships, setPendingMemberships] = useState(0);

// Load all appointments from all users
useEffect(() => {
  const loadAllAppointments = async () => {
    try {
      setIsLoading(true);
      
      // First, fetch all appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_at', { ascending: false });

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
        toast({
          title: "Error",
          description: "Failed to load appointments.",
          variant: "destructive"
        });
        return;
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
              return true; // Include appointment if we can't parse notes
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
          return true; // Include appointment if we can't process notes
        }
      });

      console.log(`After filtering: ${filteredAppointmentsData.length} appointments remain (filtered ${appointmentsData.length - filteredAppointmentsData.length})`);

      // Use filtered data for further processing
      const appointmentsDataToUse = filteredAppointmentsData;
      const userIds = [...new Set(appointmentsDataToUse.map(apt => apt.user_id))];
      const doctorIds = [...new Set(appointmentsDataToUse.map(apt => apt.doctor_id))];

      // Fetch user profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .in('id', userIds);

      // Fetch doctor profiles
      const { data: doctorsData } = await supabase
        .from('doctors')
        .select('id, full_name, specialty, consultation_fee')
        .in('id', doctorIds);

      // Create lookup maps
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const doctorsMap = new Map(doctorsData?.map(d => [d.id, d]) || []);

      // Transform the data to match the expected format
      const transformedAppointments = appointmentsDataToUse.map(apt => {
        const profile = profilesMap.get(apt.user_id);
        const doctor = doctorsMap.get(apt.doctor_id);
        
        return {
          id: apt.id,
          patientName: profile 
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Patient'
            : 'Unknown Patient',
          doctorName: doctor?.full_name || 'Unknown Doctor',
          specialty: doctor?.specialty || 'General',
          date: new Date(apt.appointment_at).toISOString().split('T')[0],
          time: new Date(apt.appointment_at).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          }),
          type: apt.appointment_type_id || 'Consultation',
          status: apt.status,
          notes: apt.notes,
          contact: profile?.phone || 'No contact',
          amount: doctor?.consultation_fee || 0,
          appointment_at: apt.appointment_at,
          user_id: apt.user_id,
          doctor_id: apt.doctor_id,
          // Additional details for better display
          patientPhone: profile?.phone,
          patientEmail: profile?.id, // This is actually the user's auth ID, we might need email separately
          doctorSpecialty: doctor?.specialty
        };
      });

      setAppointments(transformedAppointments);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast({
        title: "Error",
        description: "Failed to load appointments.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMemberships = async () => {
    try {
      setIsLoadingMemberships(true);

      // Fetch all memberships
      const { data: membershipsData, error } = await supabase
        .from('memberships')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching memberships:', error);
        toast({
          title: "Error",
          description: "Failed to load memberships.",
          variant: "destructive"
        });
        return;
      }

      if (!membershipsData || membershipsData.length === 0) {
        setMemberships([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(membershipsData.map(membership => membership.user_id))];

      // Fetch user profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .in('id', userIds);

      // Create lookup map
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const formattedMemberships = membershipsData.map(membership => {
        const profile = profilesMap.get(membership.user_id);
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

      setMemberships(formattedMemberships);
    } catch (error) {
      console.error('Error loading memberships:', error);
      toast({
        title: "Error",
        description: "Failed to load memberships.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingMemberships(false);
    }
  };

  loadAllAppointments();
  loadMemberships();
}, []);

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
      toast({
        title: "Membership Updated",
        description: `Membership ${actionText} successfully`
      });

      // Reload memberships
      const { data: membershipsData } = await supabase
        .from('memberships')
        .select('*')
        .order('created_at', { ascending: false });

      if (membershipsData) {
        const userIds = [...new Set(membershipsData.map(m => m.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, phone')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

        const formattedMemberships = membershipsData.map(membership => {
          const profile = profilesMap.get(membership.user_id);
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

        setMemberships(formattedMemberships);
      }
    } catch (error) {
      console.error('Error updating membership:', error);
      toast({
        title: "Error",
        description: "Failed to update membership status",
        variant: "destructive"
      });
    }
  };

  const handleAppointmentAction = (appointment: any, action: "accept" | "reject") => {
    setSelectedAppointment(appointment);
    setModalAction(action);
    setShowModal(true);
    setReason("");
  };

  const confirmAction = async () => {
    if (selectedAppointment && modalAction) {
      try {
        const newStatus = modalAction === "accept" ? "confirmed" : "cancelled";
        
        // Update appointment status in Supabase
        const { error } = await supabase
          .from('appointments')
          .update({ 
            status: newStatus,
            notes: modalAction === "reject" ? reason : selectedAppointment.notes
          })
          .eq('id', selectedAppointment.id);

        if (error) {
          console.error('Error updating appointment:', error);
          toast({
            title: "Error",
            description: "Failed to update appointment status.",
            variant: "destructive"
          });
          return;
        }

        // Update local state
        setAppointments(prev => 
          prev.map(apt => 
            apt.id === selectedAppointment.id 
              ? { ...apt, status: newStatus, notes: modalAction === "reject" ? reason : apt.notes }
              : apt
          )
        );
        
        toast({
          title: `Appointment ${modalAction === "accept" ? "Accepted" : "Rejected"}`,
          description: `Appointment with ${selectedAppointment.patientName} has been ${newStatus}.`
        });
      } catch (error) {
        console.error('Error updating appointment:', error);
        toast({
          title: "Error",
          description: "Failed to update appointment status.",
          variant: "destructive"
        });
      }
    }
    setShowModal(false);
    setSelectedAppointment(null);
    setModalAction(null);
  };

  const saveProfile = () => {
    setIsEditingProfile(false);
    toast({
      title: "Profile Updated",
      description: "Your profile information has been saved successfully."
    });
  };

  const addClinic = () => {
    if (newClinic.name && newClinic.address && newClinic.phone) {
      setClinics(prev => [...prev, { ...newClinic, id: Date.now() }]);
      setNewClinic({ name: "", address: "", phone: "" });
      toast({
        title: "Clinic Added",
        description: "New clinic location has been added successfully."
      });
    }
  };

  const removeClinic = (id: number) => {
    setClinics(prev => prev.filter(clinic => clinic.id !== id));
    toast({
      title: "Clinic Removed",
      description: "Clinic location has been removed."
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-500", text: "Pending" },
      confirmed: { color: "bg-green-500", text: "Confirmed" },
      cancelled: { color: "bg-red-500", text: "Cancelled" },
      completed: { color: "bg-blue-500", text: "Completed" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    );
  };

  const handleLogout = () => {
    localStorage.removeItem("currentAdminUser");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 glass-effect border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Heart className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Welcome, {profile.name}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="medical-card">
            <CardContent className="p-4 text-center">
              <CalendarIcon className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{todayAppointments}</p>
              <p className="text-sm text-muted-foreground">Today's Appointments</p>
            </CardContent>
          </Card>
          <Card className="medical-card">
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{pendingRequests}</p>
              <p className="text-sm text-muted-foreground">Pending Requests</p>
            </CardContent>
          </Card>
          <Card className="medical-card">
            <CardContent className="p-4 text-center">
              <Crown className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{memberships.length}</p>
              <p className="text-sm text-muted-foreground">Total Memberships</p>
            </CardContent>
          </Card>
          <Card className="medical-card">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{totalPatients}</p>
              <p className="text-sm text-muted-foreground">Total Patients</p>
            </CardContent>
          </Card>
          <Card className="medical-card">
            <CardContent className="p-4 text-center">
              <MapPin className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{totalClinics}</p>
              <p className="text-sm text-muted-foreground">Clinic Locations</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
<TabsList className="grid w-full grid-cols-6">
  <TabsTrigger value="appointments">Appointments</TabsTrigger>
  <TabsTrigger value="memberships">Memberships</TabsTrigger>
  <TabsTrigger value="profile">Profile</TabsTrigger>
  <TabsTrigger value="availability">Availability</TabsTrigger>
  <TabsTrigger value="clinics">Clinics</TabsTrigger>
  <TabsTrigger value="payments">Payments</TabsTrigger>
</TabsList>

          <TabsContent value="appointments" className="space-y-4">
            <Card className="medical-card">
              <CardHeader>
                <CardTitle>Appointment Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="ml-2">Loading appointments...</span>
                    </div>
                  ) : appointments.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                      <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No appointments found</p>
                    </div>
                  ) : (
                    appointments.map((appointment) => (
                      <div key={appointment.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h4 className="font-semibold text-lg">{appointment.patientName}</h4>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <CalendarIcon className="h-4 w-4" />
                              <span>{appointment.date} at {appointment.time}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                              <User className="h-4 w-4" />
                              <span>{appointment.doctorName}</span>
                              {appointment.specialty && (
                                <Badge variant="secondary" className="text-xs">
                                  {appointment.specialty}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span>{appointment.contact}</span>
                            </div>
                            {appointment.notes && (
                              <div className="text-sm text-muted-foreground">
                                <strong>Notes:</strong> {appointment.notes}
                              </div>
                            )}
                          </div>
                          <div className="text-right space-y-2">
                            {getStatusBadge(appointment.status)}
                            <p className="text-lg font-bold text-primary">
                              ₹{appointment.amount || 0}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {appointment.type}
                            </p>
                          </div>
                        </div>
                        {appointment.status === "pending" && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleAppointmentAction(appointment, "accept")}
                              className="bg-green-500 hover:bg-green-600"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAppointmentAction(appointment, "reject")}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {appointment.status === "cancellation_requested" && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAppointmentAction(appointment, "reject")}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Accept Cancellation
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="memberships" className="space-y-4">
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <span>Membership Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoadingMemberships ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="ml-2">Loading memberships...</span>
                    </div>
                  ) : memberships.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                      <Crown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No memberships found</p>
                    </div>
                  ) : (
                    memberships.map((membership) => (
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
                                const statusConfig = {
                                  pending: { color: "bg-yellow-500", text: "Pending" },
                                  active: { color: "bg-green-500", text: "Active" },
                                  cancelled: { color: "bg-red-500", text: "Cancelled" },
                                  expired: { color: "bg-gray-500", text: "Expired" }
                                };
                                const config = statusConfig[membership.status as keyof typeof statusConfig] || statusConfig.pending;
                                return <Badge className={`${config.color} text-white`}>{config.text}</Badge>;
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
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <Card className="medical-card">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Profile Information</CardTitle>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    {isEditingProfile ? "Cancel" : "Edit"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingProfile ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Full Name</Label>
                      <Input
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Specialization</Label>
                      <Input
                        value={profile.specialization}
                        onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>About</Label>
                      <Textarea
                        value={profile.about}
                        onChange={(e) => setProfile({ ...profile, about: e.target.value })}
                      />
                    </div>
                    <Button onClick={saveProfile}>Save Changes</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div><strong>Name:</strong> {profile.name}</div>
                    <div><strong>Email:</strong> {profile.email}</div>
                    <div><strong>Phone:</strong> {profile.phone}</div>
                    <div><strong>Specialization:</strong> {profile.specialization}</div>
                    <div><strong>About:</strong> {profile.about}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="availability" className="space-y-4">
            <Card className="medical-card">
              <CardHeader>
                <CardTitle>Manage Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Select Available/Blocked Dates</Label>
                    <Calendar
                      mode="multiple"
                      selected={selectedDates}
                      onSelect={(dates) => setSelectedDates(dates || [])}
                      className="rounded-md border p-3 pointer-events-auto"
                    />
                  </div>
                  <Button onClick={() => toast({ title: "Availability Updated", description: "Your availability has been saved." })}>
                    Update Availability
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clinics" className="space-y-4">
            <Card className="medical-card">
              <CardHeader>
                <CardTitle>Clinic Locations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add New Clinic */}
                <div className="p-4 border rounded-lg space-y-3">
                  <h4 className="font-medium">Add New Clinic</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      placeholder="Clinic Name"
                      value={newClinic.name}
                      onChange={(e) => setNewClinic({ ...newClinic, name: e.target.value })}
                    />
                    <Input
                      placeholder="Address"
                      value={newClinic.address}
                      onChange={(e) => setNewClinic({ ...newClinic, address: e.target.value })}
                    />
                    <Input
                      placeholder="Phone"
                      value={newClinic.phone}
                      onChange={(e) => setNewClinic({ ...newClinic, phone: e.target.value })}
                    />
                  </div>
                  <Button onClick={addClinic} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Clinic
                  </Button>
                </div>

                {/* Existing Clinics */}
                {clinics.map((clinic) => (
                  <div key={clinic.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{clinic.name}</h4>
                        <p className="text-sm text-muted-foreground">{clinic.address}</p>
                        <p className="text-sm text-muted-foreground">{clinic.phone}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeClinic(clinic.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Action Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalAction === "accept" ? "Accept Appointment" : "Reject Appointment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to {modalAction} the appointment with {selectedAppointment?.patientName}?
            </p>
            {modalAction === "reject" && (
              <div>
                <Label>Reason for rejection (optional)</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide a reason..."
                />
              </div>
            )}
            <div className="flex space-x-2">
              <Button onClick={confirmAction}>Confirm</Button>
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
