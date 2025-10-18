import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Stethoscope, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar, 
  Users, 
  MapPin,
  Edit,
  Save,
  Plus,
  Trash2,
  LogOut,
  User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const DoctorAdminDashboard = () => {
  const [selectedTab, setSelectedTab] = useState("appointments");
  const [editProfile, setEditProfile] = useState(false);
  const [actionModal, setActionModal] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [newClinic, setNewClinic] = useState({ name: "", address: "", phone: "" });
  const [notesModal, setNotesModal] = useState<{ open: boolean; appointmentId: string | number | null }>({ open: false, appointmentId: null });
  const [notesForm, setNotesForm] = useState({ diagnosis: "", prescription: "", precautions: "", consultationType: "online" });

  // Mock doctor profile data
  const [doctorProfile, setDoctorProfile] = useState({
    name: "Dr. Sarah Johnson",
    specialization: "Cardiologist",
    qualification: "MBBS, MD (Cardiology), FACC",
    phone: "+1 (555) 123-4567",
    email: "sarah.johnson@example.com",
    about: "Dr. Sarah Johnson is a renowned cardiologist with over 15 years of experience in treating heart conditions.",
    photo: "/placeholder.svg"
  });

  const [clinics, setClinics] = useState([
    {
      id: 1,
      name: "New York Heart Center",
      address: "123 Medical Plaza, New York, NY 10001",
      phone: "+1 (555) 123-4567"
    },
    {
      id: 2,
      name: "Downtown Cardiology Clinic",
      address: "456 Healthcare Ave, New York, NY 10002", 
      phone: "+1 (555) 987-6543"
    }
  ]);

  // Mock appointments data
  const appointments = [
    {
      id: 1,
      patient: "John Doe",
      date: "2024-01-20",
      time: "10:00 AM",
      type: "Online",
      status: "pending",
      problem: "Chest pain and shortness of breath"
    },
    {
      id: 2,
      patient: "Jane Smith",
      date: "2024-01-22",
      time: "2:30 PM",
      type: "Offline",
      status: "pending",
      problem: "Follow-up appointment for heart medication"
    },
    {
      id: 3,
      patient: "Bob Wilson",
      date: "2024-01-25",
      time: "11:00 AM",
      type: "Offline",
      status: "confirmed",
      problem: "Regular cardiac checkup"
    }
  ];

  const handleAppointmentAction = (appointment: any, action: string) => {
    setActionModal({ appointment, action });
    setReason("");
  };

  const confirmAction = () => {
    // TODO: Connect to database to update appointment status
    console.log("Action confirmed:", {
      appointmentId: actionModal.appointment.id,
      action: actionModal.action,
      reason: reason
    });
    setActionModal(null);
    setReason("");
  };

  const openNotes = (appointmentId: string | number) => {
    setNotesModal({ open: true, appointmentId });
    setNotesForm({ diagnosis: "", prescription: "", precautions: "", consultationType: "online" });
  };

  const saveNotes = async () => {
    try {
      if (!notesModal.appointmentId) return;
      const payload = {
        notes: {
          diagnosis: notesForm.diagnosis,
          prescription: notesForm.prescription,
          precautions: notesForm.precautions,
          consultationType: notesForm.consultationType,
          updatedAt: new Date().toISOString(),
        }
      };
      const { error } = await supabase
        .from('appointments')
        .update({ notes: payload.notes })
        .eq('id', notesModal.appointmentId);
      if (error) throw error;
      toast({ title: 'Saved', description: 'Medical notes saved to appointment.' });
      setNotesModal({ open: false, appointmentId: null });
    } catch (e) {
      console.error('Failed to save notes', e);
      toast({ title: 'Error', description: 'Failed to save notes', variant: 'destructive' });
    }
  };

  const saveProfile = () => {
    // TODO: Connect to database to update doctor profile
    console.log("Profile updated:", doctorProfile);
    setEditProfile(false);
  };

  const addClinic = () => {
    if (newClinic.name && newClinic.address && newClinic.phone) {
      const clinic = {
        id: clinics.length + 1,
        ...newClinic
      };
      setClinics([...clinics, clinic]);
      setNewClinic({ name: "", address: "", phone: "" });
    }
  };

  const removeClinic = (id: number) => {
    setClinics(clinics.filter(clinic => clinic.id !== id));
  };

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
              <Stethoscope className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-primary">Doctor Dashboard</h1>
                <p className="text-sm text-muted-foreground">{doctorProfile.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-primary/20 text-primary-foreground">
                <User className="h-3 w-3 mr-1" />
                Doctor Admin
              </Badge>
              <Button variant="ghost" size="sm">
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
                  <p className="text-sm text-muted-foreground">Today's Appointments</p>
                  <p className="text-2xl font-bold text-primary">8</p>
                </div>
                <Calendar className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                  <p className="text-2xl font-bold text-warning">3</p>
                </div>
                <Clock className="h-8 w-8 text-warning/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Patients</p>
                  <p className="text-2xl font-bold text-success">247</p>
                </div>
                <Users className="h-8 w-8 text-success/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Clinic Locations</p>
                  <p className="text-2xl font-bold text-primary">{clinics.length}</p>
                </div>
                <MapPin className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="animate-slide-up">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="clinics">Clinics</TabsTrigger>
          </TabsList>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-6">
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span>Appointment Requests</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <Card key={appointment.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold">{appointment.patient}</h4>
                            <p className="text-sm text-muted-foreground">{appointment.date} at {appointment.time}</p>
                            <p className="text-sm text-muted-foreground">{appointment.type} consultation</p>
                            <p className="text-sm mt-2"><strong>Problem:</strong> {appointment.problem}</p>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(appointment.status)}
                          </div>
                        </div>
                        
                        {appointment.status === "pending" && (
                          <div className="flex space-x-2">
                            <Button
                              variant="medical"
                              size="sm"
                              onClick={() => handleAppointmentAction(appointment, "accept")}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleAppointmentAction(appointment, "reject")}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {appointment.status === "completed" && (
                          <div className="mt-3">
                            <Button variant="outline" size="sm" onClick={() => openNotes(appointment.id)}>
                              Write Medical Notes
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="medical-card">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-primary" />
                    <span>Doctor Profile</span>
                  </CardTitle>
                  <Button 
                    variant={editProfile ? "medical" : "outline"}
                    onClick={() => editProfile ? saveProfile() : setEditProfile(true)}
                  >
                    {editProfile ? (
                      <>
                        <Save className="h-4 w-4 mr-1" />
                        Save Changes
                      </>
                    ) : (
                      <>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit Profile
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={doctorProfile.name}
                        onChange={(e) => setDoctorProfile({...doctorProfile, name: e.target.value})}
                        disabled={!editProfile}
                      />
                    </div>
                    <div>
                      <Label htmlFor="specialization">Specialization</Label>
                      <Input
                        id="specialization"
                        value={doctorProfile.specialization}
                        onChange={(e) => setDoctorProfile({...doctorProfile, specialization: e.target.value})}
                        disabled={!editProfile}
                      />
                    </div>
                    <div>
                      <Label htmlFor="qualification">Qualification</Label>
                      <Input
                        id="qualification"
                        value={doctorProfile.qualification}
                        onChange={(e) => setDoctorProfile({...doctorProfile, qualification: e.target.value})}
                        disabled={!editProfile}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={doctorProfile.phone}
                        onChange={(e) => setDoctorProfile({...doctorProfile, phone: e.target.value})}
                        disabled={!editProfile}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={doctorProfile.email}
                        onChange={(e) => setDoctorProfile({...doctorProfile, email: e.target.value})}
                        disabled={!editProfile}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <Label htmlFor="about">About</Label>
                  <Textarea
                    id="about"
                    value={doctorProfile.about}
                    onChange={(e) => setDoctorProfile({...doctorProfile, about: e.target.value})}
                    disabled={!editProfile}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clinics Tab */}
          <TabsContent value="clinics" className="space-y-6">
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="h-5 w-5 text-primary" />
                  <span>Add New Clinic</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="clinic-name">Clinic Name</Label>
                    <Input
                      id="clinic-name"
                      value={newClinic.name}
                      onChange={(e) => setNewClinic({...newClinic, name: e.target.value})}
                      placeholder="Enter clinic name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clinic-address">Address</Label>
                    <Input
                      id="clinic-address"
                      value={newClinic.address}
                      onChange={(e) => setNewClinic({...newClinic, address: e.target.value})}
                      placeholder="Enter full address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clinic-phone">Phone</Label>
                    <Input
                      id="clinic-phone"
                      value={newClinic.phone}
                      onChange={(e) => setNewClinic({...newClinic, phone: e.target.value})}
                      placeholder="Clinic phone number"
                    />
                  </div>
                </div>
                <Button variant="medical" className="mt-4" onClick={addClinic}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Clinic
                </Button>
              </CardContent>
            </Card>

            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span>Your Clinic Locations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clinics.map((clinic) => (
                    <Card key={clinic.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold">{clinic.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{clinic.address}</p>
                            <p className="text-sm text-muted-foreground">{clinic.phone}</p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeClinic(clinic.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Modal */}
        {actionModal && (
          <Dialog open={!!actionModal} onOpenChange={() => setActionModal(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {actionModal.action === "accept" && "Accept Appointment"}
                  {actionModal.action === "reject" && "Reject Appointment"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-md">
                  <p><strong>Patient:</strong> {actionModal.appointment.patient}</p>
                  <p><strong>Date:</strong> {actionModal.appointment.date} at {actionModal.appointment.time}</p>
                  <p><strong>Type:</strong> {actionModal.appointment.type} consultation</p>
                  <p><strong>Problem:</strong> {actionModal.appointment.problem}</p>
                </div>
                
                {actionModal.action === "reject" && (
                  <div>
                    <Label htmlFor="reason">Reason for rejection</Label>
                    <Textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Please provide a reason for rejection..."
                      rows={3}
                    />
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setActionModal(null)} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    variant={actionModal.action === "accept" ? "medical" : "destructive"} 
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

        {/* Notes Modal */}
        <Dialog open={notesModal.open} onOpenChange={(open) => setNotesModal({ open, appointmentId: open ? notesModal.appointmentId : null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Write Medical Notes</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Consultation Type</Label>
                <Select value={notesForm.consultationType} onValueChange={(v) => setNotesForm({ ...notesForm, consultationType: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes-diagnosis">Diagnosis</Label>
                <Textarea id="notes-diagnosis" rows={3} value={notesForm.diagnosis} onChange={(e) => setNotesForm({ ...notesForm, diagnosis: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="notes-prescription">Prescription</Label>
                <Textarea id="notes-prescription" rows={3} value={notesForm.prescription} onChange={(e) => setNotesForm({ ...notesForm, prescription: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="notes-precautions">Precautions</Label>
                <Textarea id="notes-precautions" rows={3} value={notesForm.precautions} onChange={(e) => setNotesForm({ ...notesForm, precautions: e.target.value })} />
              </div>
              <div className="flex space-x-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setNotesModal({ open: false, appointmentId: null })}>Cancel</Button>
                <Button className="flex-1" onClick={saveNotes}>Save Notes</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DoctorAdminDashboard;