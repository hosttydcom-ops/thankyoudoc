import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  Users, 
  Phone,
  ArrowLeft,
  Star,
  MessageSquare,
  X,
  AlertTriangle,
  Crown,
  Sparkles
} from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";

const BookingsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pending");
  const [cancelReason, setCancelReason] = useState("");
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  // Helper function to get membership details
  const getMembershipDetails = (appointment: any) => {
    try {
      const notes = appointment.notes;
      if (notes && typeof notes === 'string') {
        return JSON.parse(notes);
      } else if (notes && typeof notes === 'object') {
        return notes;
      }
    } catch (e) {
      console.warn('Failed to parse membership details:', appointment.notes, e);
    }
    return null;
  };

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && ['pending','upcoming','past'].includes(t)) {
      setActiveTab(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  const [appointments, setAppointments] = useState({
    pending: [],
    upcoming: [],
    past: []
  });
  const [loading, setLoading] = useState(true);

  const loadAppointments = async (userId: string) => {
    try {
      setLoading(true);

      // Load regular appointments (excluding membership purchases)
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          doctors(full_name, specialty, photo_url)
        `)
        .eq('user_id', userId)
        .order('appointment_at', { ascending: true });

      if (appointmentError) throw appointmentError;

      console.log('Raw appointment data:', appointmentData);

      // Filter out membership purchases in application code
      const filteredAppointmentData = appointmentData?.filter(apt => {
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
            console.log('Filtering out membership purchase appointment in bookings:', apt.id);
            return false;
          }

          return true;
        } catch (error) {
          console.error('Error processing appointment notes in bookings:', error, apt.notes);
          return true; // Include appointment if we can't process notes
        }
      }) || [];

      console.log(`After filtering in bookings: ${filteredAppointmentData.length} appointments remain (filtered ${appointmentData?.length || 0 - filteredAppointmentData.length})`);

      // Use filtered data for processing
      const appointmentDataToUse = filteredAppointmentData;
      const { data: membershipData, error: membershipError } = await supabase
        .from('memberships')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (membershipError) {
        console.warn('Error loading memberships:', membershipError);
        // Continue without memberships if error
      }

      const now = new Date();
      const formatted = {
        pending: [],
        upcoming: [],
        past: []
      };

      // Process regular appointments
      console.log('Processing appointments:', appointmentDataToUse);
      appointmentDataToUse.forEach(apt => {
        console.log('Processing appointment:', apt);

        const aptDate = new Date(apt.appointment_at);
        console.log('Appointment date:', aptDate);

        const appointment = {
          id: apt.id,
          doctorName: (apt.doctors?.full_name || 'Unknown Doctor'),
          specialization: (apt.doctors?.specialty || 'General'),
          date: aptDate.toISOString().split('T')[0],
          time: aptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          type: 'online',
          status: apt.status,
          location: 'Video Call',
          avatar: (apt.doctors?.photo_url || "/placeholder.svg"),
          isMembership: false,
          membershipDetails: null
        };

        console.log('Created appointment object:', appointment);

        // Simple status-based categorization
        if (apt.status === 'pending') {
          console.log('Adding to pending array');
          formatted.pending.push(appointment);
        } else if (apt.status === 'confirmed' || apt.status === 'scheduled') {
          if (aptDate > now) {
            console.log('Adding to upcoming array');
            formatted.upcoming.push(appointment);
          } else {
            console.log('Adding to past array');
            formatted.past.push(appointment);
          }
        } else {
          console.log('Adding to past array (other status)');
          formatted.past.push(appointment);
        }
      });

      // Process memberships from dedicated table
      membershipData?.forEach(membership => {
        const validFrom = new Date(membership.valid_from);
        const validUntil = new Date(membership.valid_until);
        
        const membershipAppointment = {
          id: membership.id,
          doctorName: 'Premium Membership',
          specialization: 'Membership Plan',
          date: validFrom.toISOString().split('T')[0],
          time: validFrom.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          type: 'membership',
          status: membership.status,
          location: 'Premium Benefits',
          avatar: "/placeholder.svg",
          isMembership: true,
          membershipDetails: {
            type: 'membership_purchase',
            membershipType: membership.membership_type,
            duration: `${membership.duration_months}_months`,
            appointmentsIncluded: membership.appointments_included,
            amount: membership.amount,
            valid_until: membership.valid_until,
            memberDetails: membership.member_details
          }
        };

        if (membership.status === 'pending') {
          formatted.pending.push(membershipAppointment);
        } else if (membership.status === 'active') {
          // Active memberships should NOT appear in upcoming - they're ongoing subscriptions
          // They can be viewed separately in a dedicated section or not shown at all
          // formatted.upcoming.push(membershipAppointment); // Commented out
        } else if (membership.status === 'expired' || (membership.status === 'active' && validUntil < now)) {
          formatted.past.push(membershipAppointment);
        } else if (membership.status === 'cancelled') {
          formatted.past.push(membershipAppointment);
        }
      });

      console.log('Final formatted appointments:', formatted);
      setAppointments(formatted);
    } catch (error) {
      console.error('Error loading appointments:', error);
      setAppointments({ pending: [], upcoming: [], past: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (session?.user) {
        loadAppointments(session.user.id);
      } else {
        setAppointments({ pending: [], upcoming: [], past: [] });
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        loadAppointments(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleCancelAppointment = async (appointmentId: number, isMembershipItem = false) => {
    console.log('[CANCEL DEBUG] Starting cancellation for appointment:', appointmentId, 'isMembership:', isMembershipItem);

    if (!cancelReason.trim() && !isMembershipItem) {
      toast({ title: "Error", description: "Please provide a cancellation reason." });
      return;
    }

    try {
      if (isMembershipItem) {
        console.log('[CANCEL DEBUG] Cancelling membership:', appointmentId);

        // Cancel membership in memberships table
        const { error } = await supabase
          .from('memberships')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', appointmentId.toString());

        console.log('[CANCEL DEBUG] Membership update result:', error ? 'ERROR' : 'SUCCESS');

        if (error) {
          console.error('Error canceling membership:', error);
          toast({ 
            title: "Error", 
            description: "Failed to cancel membership. Please try again.",
            variant: "destructive"
          });
          return;
        }

        // Get current session to update appointment record
        const { data: { session } } = await supabase.auth.getSession();

        // Also update the corresponding appointment record if it exists
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({ 
            status: 'cancelled',
            notes: JSON.stringify({
              cancelled: true,
              cancelled_at: new Date().toISOString(),
              reason: 'Membership cancelled'
            })
          })
          .eq('user_id', session?.user.id)
          .like('notes', '%"type":"membership_purchase"%')
          .like('notes', `%${appointmentId}%`);

        if (appointmentError) {
          console.warn('Error updating appointment record:', appointmentError);
        }

        toast({ 
          title: "Membership Cancelled", 
          description: "Your membership has been cancelled successfully." 
        });
      } else {
        // Cancel regular appointment - First get existing notes to preserve them
        console.log('[CANCEL DEBUG] Cancelling regular appointment:', appointmentId);

        const { data: existingAppointment, error: fetchError } = await supabase
          .from('appointments')
          .select('notes')
          .eq('id', appointmentId.toString())
          .single();

        console.log('[CANCEL DEBUG] Fetch existing appointment result:', existingAppointment ? 'SUCCESS' : 'FAILED', fetchError);

        if (fetchError) {
          console.error('Error fetching appointment:', fetchError);
          toast({
            title: "Error",
            description: "Failed to fetch appointment details.",
            variant: "destructive"
          });
          return;
        }

        // Parse existing notes and merge with cancellation info
        let existingNotes = {};
        try {
          existingNotes = existingAppointment?.notes ? JSON.parse(existingAppointment.notes) : {};
          console.log('[CANCEL DEBUG] Existing notes parsed successfully');
        } catch (e) {
          console.warn('Failed to parse existing notes, using empty object');
        }

        const updatedNotes = {
          ...existingNotes,
          cancelled: true,
          cancelled_at: new Date().toISOString(),
          cancel_reason: cancelReason
        };

        console.log('[CANCEL DEBUG] Updated notes:', updatedNotes);

        const { error } = await supabase
          .from('appointments')
          .update({
            status: 'cancelled',
            notes: JSON.stringify(updatedNotes)
          })
          .eq('id', appointmentId.toString());

        console.log('[CANCEL DEBUG] Appointment update result:', error ? 'ERROR' : 'SUCCESS');

        if (error) {
          console.error('Error requesting cancellation:', error);
          toast({ 
            title: "Error", 
            description: "Failed to send cancellation request. Please try again.",
            variant: "destructive"
          });
          return;
        }

        toast({ 
          title: "Cancellation Requested", 
          description: "Your cancellation request has been sent to the admin." 
        });
      }
      
      setCancellingId(null);
      setCancelReason("");

      // Reload appointments to get updated data
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        loadAppointments(session.user.id);
      }
    } catch (error) {
      console.error('Error requesting cancellation:', error);
      toast({ 
        title: "Error", 
        description: "Failed to send cancellation request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAppointmentClick = (appointment: any, type: string) => {
    navigate(`/appointment/${appointment.id}?type=${type}&tab=${activeTab}`);
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-blue-100 text-blue-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  };

  const openWhatsApp = (appointment: any) => {
    const phone = (appointment.phone || '').replace(/[^\d]/g, '');
    if (!phone) {
      toast({ title: 'WhatsApp unavailable', description: "Doctor's WhatsApp number is missing." });
      return;
    }
    const text = `Hi Dr. ${appointment.doctorName}, I am ready for my appointment on ${formatDate(appointment.date)} at ${appointment.time}.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const openMaps = (appointment: any) => {
    const query = appointment.location || '';
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
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
                <h1 className="text-lg font-bold text-foreground">My Appointments</h1>
                <p className="text-xs text-muted-foreground">Manage your bookings</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Tabs for Pending/Upcoming/Past */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-xl h-11">
            <TabsTrigger value="pending" className="rounded-lg">
              Pending ({appointments.pending?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="rounded-lg">
              Upcoming ({appointments.upcoming?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="past" className="rounded-lg">
              Past ({appointments.past?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Pending Appointments Tab */}
          <TabsContent value="pending" className="space-y-4 mt-6">
            {appointments.pending?.length === 0 ? (
              <Card className="medical-card">
                <CardContent className="p-8 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No pending appointments
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    All your appointments have been confirmed or completed
                  </p>
                </CardContent>
              </Card>
            ) : (
              appointments.pending?.map((appointment) => {
                const isMembership = appointment.isMembership;
                const membershipDetails = appointment.membershipDetails;
                
                return (
                  <Card 
                    key={appointment.id} 
                    className={`medical-card cursor-pointer hover:shadow-lg transition-all duration-300 relative overflow-hidden ${
                      isMembership 
                        ? 'border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-white to-secondary/5 shadow-md' 
                        : ''
                    }`}
                    onClick={() => !isMembership && handleAppointmentClick(appointment, 'pending')}
                  >
                    {/* Premium Background Pattern for Membership */}
                    {isMembership && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-50"></div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
                      </>
                    )}

                    <CardContent className="p-5 relative">
                      <div className="flex items-start space-x-4">
                        {/* Enhanced Avatar/Icon Section */}
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 relative shadow-lg ${
                          isMembership 
                            ? 'bg-gradient-to-br from-primary/20 to-primary-glow/30' 
                            : 'bg-gradient-to-br from-warning/20 to-warning/10'
                        }`}>
                          {isMembership ? (
                            <>
                              <Crown className="h-7 w-7 text-primary animate-pulse" />
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary/20 rounded-full flex items-center justify-center">
                                <Sparkles className="h-2 w-2 text-primary" />
                              </div>
                            </>
                          ) : (
                            <Clock className="h-7 w-7 text-warning" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Enhanced Header Section */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className={`font-bold text-foreground flex items-center gap-2 ${
                                isMembership ? 'text-lg' : 'text-base'
                              }`}>
                                {isMembership ? 'Premium Membership' : appointment.doctorName}
                                {isMembership && (
                                  <div className="flex items-center gap-1">
                                    <Crown className="h-4 w-4 text-primary animate-pulse" />
                                    <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                                      VIP
                                    </Badge>
                                  </div>
                                )}
                              </h4>
                              <Badge variant="secondary" className={`text-xs mt-1 ${
                                isMembership ? 'bg-primary/10 text-primary border-primary/20' : ''
                              }`}>
                                {isMembership ? 'Membership Plan' : appointment.specialization}
                              </Badge>
                            </div>

                            {/* Enhanced Status Badge */}
                            <Badge className={`text-xs px-3 py-1 ${
                              isMembership 
                                ? 'bg-gradient-to-r from-primary/20 to-primary-glow/20 text-primary-foreground border border-primary/30' 
                                : 'bg-warning/20 text-warning-foreground'
                            }`}>
                              {isMembership ? (
                                <>
                                  <Crown className="h-3 w-3 mr-1" />
                                  Membership
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pending Approval
                                </>
                              )}
                            </Badge>
                          </div>

                          {/* Premium Membership Benefits Section */}
                          {isMembership && membershipDetails && (
                            <div className="mb-4 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl border border-primary/20">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                    <span className="text-sm font-bold text-primary">₹</span>
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold text-primary">{membershipDetails.amount}</div>
                                    <div className="text-xs text-muted-foreground">for 6 months</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
                                    <Calendar className="h-4 w-4 text-secondary-accent" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold text-secondary-accent">{membershipDetails.appointmentsIncluded}</div>
                                    <div className="text-xs text-muted-foreground">appointments</div>
                                  </div>
                                </div>
                              </div>
                              
                              {membershipDetails.valid_until && (
                                <div className="mt-3 pt-3 border-t border-primary/10">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>Valid until: {new Date(membershipDetails.valid_until).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Enhanced Date/Time & Location */}
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-primary/60" />
                              <span className="font-medium">{formatDate(appointment.date)}</span>
                              <Clock className="h-4 w-4 ml-2 text-primary/60" />
                              <span className="font-medium">{appointment.time}</span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {isMembership ? (
                                <>
                                  <Crown className="h-4 w-4 text-primary" />
                                  <span className="font-medium text-primary">Premium Benefits Package</span>
                                </>
                              ) : appointment.type === "online" ? (
                                <>
                                  <Video className="h-4 w-4 text-primary/60" />
                                  <span className="truncate">{appointment.location}</span>
                                </>
                              ) : (
                                <>
                                  <MapPin className="h-4 w-4 text-primary/60" />
                                  <span className="truncate">{appointment.location}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Enhanced Action Buttons */}
                          <div className="flex space-x-2 mt-5">
                            {isMembership ? (
                              // Enhanced Membership Cancel Button
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="flex-1 h-10 rounded-lg border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCancellingId(appointment.id);
                                    }}
                                  >
                                    <X className="h-4 w-4 mr-2 text-red-500" />
                                    <span className="text-red-600 font-medium">Cancel Membership</span>
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center space-x-2">
                                      <AlertTriangle className="h-5 w-5 text-destructive" />
                                      <span>Cancel Premium Membership</span>
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-100">
                                      <p className="text-sm text-red-700 font-medium mb-2">
                                        ⚠️ Membership Cancellation Notice
                                      </p>
                                      <p className="text-sm text-red-600">
                                        Cancelling your membership will immediately revoke access to premium benefits and remaining appointments.
                                      </p>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Are you sure you want to cancel your Premium Membership?
                                    </p>
                                    <div className="flex space-x-2">
                                      <Button
                                        variant="destructive"
                                        onClick={() => handleCancelAppointment(appointment.id, true)}
                                        className="flex-1"
                                      >
                                        Yes, Cancel Membership
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        onClick={() => {
                                          setCancellingId(null);
                                          setCancelReason("");
                                        }}
                                        className="flex-1"
                                      >
                                        Keep Membership
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            ) : (
                              // Regular appointment - existing cancel dialog
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="destructive" 
                                    size="sm" 
                                    className="flex-1 h-9 rounded-lg"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCancellingId(appointment.id);
                                    }}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel Booking
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center space-x-2">
                                      <AlertTriangle className="h-5 w-5 text-destructive" />
                                      <span>Cancel Appointment</span>
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                      Please provide a reason for canceling your appointment with {appointment.doctorName}.
                                    </p>
                                    <div>
                                      <Label htmlFor="cancel-reason">Cancellation Reason</Label>
                                      <Textarea
                                        id="cancel-reason"
                                        placeholder="e.g., Schedule conflict, emergency, feeling better..."
                                        value={cancelReason}
                                        onChange={(e) => setCancelReason(e.target.value)}
                                        rows={3}
                                      />
                                    </div>
                                    <div className="flex space-x-2">
                                      <Button
                                        variant="destructive"
                                        onClick={() => handleCancelAppointment(appointment.id)}
                                        className="flex-1"
                                      >
                                        Confirm Cancellation
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        onClick={() => {
                                          setCancellingId(null);
                                          setCancelReason("");
                                        }}
                                        className="flex-1"
                                      >
                                        Keep Appointment
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4 mt-6">
            {appointments.upcoming?.length === 0 ? (
              <Card className="medical-card">
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No upcoming appointments
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Book your next appointment with a trusted doctor
                  </p>
                  <Button onClick={() => navigate("/")} className="rounded-xl">
                    Find Doctors
                  </Button>
                </CardContent>
              </Card>
            ) : (
              appointments.upcoming?.map((appointment) => (
                <Card 
                  key={appointment.id} 
                  className="medical-card cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleAppointmentClick(appointment, 'upcoming')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-foreground">
                              {appointment.doctorName}
                            </h4>
                            <Badge variant="secondary" className="text-xs mt-1">
                              {appointment.specialization}
                            </Badge>
                          </div>
                          <Badge className={`text-xs ${getStatusColor(appointment.status)}`}>
                            {appointment.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(appointment.date)}</span>
                            <Clock className="h-4 w-4 ml-2" />
                            <span>{appointment.time}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {appointment.type === "online" ? (
                              <Video className="h-4 w-4" />
                            ) : (
                              <MapPin className="h-4 w-4" />
                            )}
                            <span className="truncate">{appointment.location}</span>
                          </div>
                          
                          {(() => {
                            const membershipDetails = getMembershipDetails(appointment);
                            if (membershipDetails?.paymentMethod) {
                              const paymentMethod = membershipDetails.paymentMethod;
                              return (
                                <div className="flex items-center space-x-2">
                                  <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
                                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                                  </div>
                                  <span className="text-xs">
                                    {paymentMethod === 'membership_free' ? 'Free (Membership)' :
                                     paymentMethod === 'pay_at_clinic' ? 'Pay at Clinic' :
                                     paymentMethod === 'online' ? 'Paid Online' : 'Payment Pending'}
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        
                        <div className="flex space-x-2 mt-4">
                          {appointment.type === "online" ? (
                            <Button 
                              variant="medical" 
                              size="sm" 
                              className="flex-1 h-9 rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                openWhatsApp(appointment);
                              }}
                            >
                              <Video className="h-4 w-4 mr-1" />
                              Join Call
                            </Button>
                          ) : (
                            <Button 
                              variant="medical" 
                              size="sm" 
                              className="flex-1 h-9 rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                openMaps(appointment);
                              }}
                            >
                              <MapPin className="h-4 w-4 mr-1" />
                              Get Directions
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4 mt-6">
            {appointments.past?.map((appointment) => (
                <Card 
                  key={appointment.id} 
                  className="medical-card cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleAppointmentClick(appointment, 'past')}
                >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-foreground">
                            {appointment.doctorName}
                          </h4>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {appointment.specialization}
                          </Badge>
                        </div>
                        <Badge className={`text-xs ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(appointment.date)}</span>
                          <Clock className="h-4 w-4 ml-2" />
                          <span>{appointment.time}</span>
                        </div>
                      </div>
                      
                        <div className="flex space-x-2 mt-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 h-9 rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/appointment/${appointment.id}?type=past&tab=past#rate`);
                            }}
                          >
                            <Star className="h-4 w-4 mr-1" />
                            Rate Doctor
                          </Button>
                        </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-3">
            <Card className="medical-card cursor-pointer active:scale-95 transition-transform" onClick={() => navigate("/")}>
              <CardContent className="p-4 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center mx-auto">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-medium text-sm text-foreground">Book New</h4>
                <p className="text-xs text-muted-foreground">Find doctors</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation currentPage="bookings" />
    </div>
  );
};

export default BookingsPage;