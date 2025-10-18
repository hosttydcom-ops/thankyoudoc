import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import QRPayment from "@/components/QRPayment";
import { initiateQRPayment, QrPaymentResponse } from "@/utils/payment";

import { Stethoscope, Search, Heart, Calendar, Home, User, Menu, Star, Shield, Crown, CheckCircle, Sparkles, ArrowLeft, Clock, MessageSquare, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import BottomNavigation from "@/components/BottomNavigation";

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMembershipOpen, setIsMembershipOpen] = useState(false);
  const [qrPaymentData, setQrPaymentData] = useState<QrPaymentResponse | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [membershipStep, setMembershipStep] = useState(1);
  const [membershipDetails, setMembershipDetails] = useState({
    name: "",
    email: "",
    contact: "",
    age: "",
    gender: ""
  });
  const [userMembershipStatus, setUserMembershipStatus] = useState<'none' | 'pending' | 'active' | 'cancelled' | 'expired'>('none');
  const [isLoadingMembershipStatus, setIsLoadingMembershipStatus] = useState(true);
  const [showMembershipDetails, setShowMembershipDetails] = useState(false);
  const [membershipInfo, setMembershipInfo] = useState<{
    validUntil: string;
    appointmentsIncluded: number;
    freeAppointmentsUsed: number;
    freeAppointmentsRemaining: number;
    upcomingCount: number;
    confirmedCount: number;
    completedCount: number;
    pendingCount: number;
  } | null>(null);
  const [isLoadingMembershipDetails, setIsLoadingMembershipDetails] = useState(false);
  const navigate = useNavigate();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Check user's membership status
  const checkUserMembershipStatus = async () => {
    try {
      setIsLoadingMembershipStatus(true);
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        setUserMembershipStatus('none');
        setIsLoadingMembershipStatus(false);
        return;
      }

      // Check if user has an active or pending membership
      const { data: membershipData, error } = await supabase
        .from('memberships')
        .select('status, valid_until')
        .eq('user_id', session.user.id)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error checking membership status:', error);
        setUserMembershipStatus('none');
      } else if (membershipData) {
        // Check if membership is expired
        if (membershipData.status === 'active' && membershipData.valid_until) {
          const validUntil = new Date(membershipData.valid_until);
          const now = new Date();
          
          if (validUntil < now) {
            setUserMembershipStatus('expired');
          } else {
            setUserMembershipStatus(membershipData.status);
          }
        } else {
          setUserMembershipStatus(membershipData.status);
        }
      } else {
        setUserMembershipStatus('none');
      }
    } catch (error) {
      console.error('Error checking membership status:', error);
      setUserMembershipStatus('none');
    } finally {
      setIsLoadingMembershipStatus(false);
    }
  };

  // Refresh membership status when component becomes visible (user returns to this page)
  useEffect(() => {
    const refreshMembershipStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await checkUserMembershipStatus();
      }
    };

    // Refresh membership status when component mounts or becomes visible
    refreshMembershipStatus();

    // Also listen for visibility changes (when user returns to tab/window)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshMembershipStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Membership Purchase Functions
  const handleMembershipPurchase = () => {
    setMembershipStep(2); // Go to user details step
  };

  const handleProceedToPayment = () => {
    // Validate user details
    if (!membershipDetails.name || !membershipDetails.email || !membershipDetails.contact) {
      toast({
        title: "Missing details",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    setMembershipStep(3); // Go to payment step
  };

  const handleMembershipConfirm = () => {
    handleQRPayment();
  };

  const handleQRPayment = () => {
    const amount = 3500; // ₹3,500 for membership
    initiateQRPayment({
      amount: amount,
      doctorName: "ThankYouDoc", // Use service name instead of doctor
      patientName: membershipDetails.name, // Use the member's name
      onSuccess: (response: QrPaymentResponse) => {
        setQrPaymentData(response);
        setShowQRModal(true);
      },
      onFailure: (error) => {
        console.error("QR payment failed:", error);
        toast({ title: "Payment failed", description: "Please try again.", variant: "destructive" });
      },
      onDismiss: () => {
        console.log("QR payment cancelled by user");
      }
    });
  };

  const confirmMembershipPurchase = async (paymentId?: string) => {
    try {
      console.log('Starting membership purchase confirmation with paymentId:', paymentId);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        console.error('Session error:', sessionError);
        toast({ 
          title: "Login required", 
          description: "Please log in to purchase membership.", 
          variant: "destructive" 
        });
        navigate('/login');
        return;
      }

      // Check if user already has a pending or active membership
      const { data: existingMembership, error: checkError } = await supabase
        .from('memberships')
        .select('id, status')
        .eq('user_id', session.user.id)
        .in('status', ['pending', 'active'])
        .limit(1);

      if (checkError) {
        console.error('Error checking existing membership:', checkError);
      } else if (existingMembership && existingMembership.length > 0) {
        toast({
          title: "Membership Already Exists",
          description: "You already have an active or pending membership.",
          variant: "destructive"
        });
        return;
      }
      
      // Validate membership details
      if (!membershipDetails.name || !membershipDetails.email || !membershipDetails.contact) {
        toast({
          title: "Missing details",
          description: "Please provide all required information.",
          variant: "destructive"
        });
        return;
      }
      
      // Get the first available doctor for membership purchases (for backward compatibility)
      const { data: doctors, error: doctorError } = await supabase
        .from('doctors')
        .select('id')
        .limit(1)
        .single();
      
      if (doctorError || !doctors) {
        console.error('No doctors found:', doctorError);
        toast({
          title: "System Error",
          description: "Unable to process membership. Please try again later.",
          variant: "destructive"
        });
        return;
      }
      
      // Calculate validity dates
      const validFrom = new Date();
      const validUntil = new Date();
      validUntil.setMonth(validUntil.getMonth() + 6); // 6 months validity
      
      // Create membership record in the new memberships table
      const membershipData = {
        user_id: session.user.id,
        membership_type: 'premium',
        amount: 3500,
        duration_months: 6,
        appointments_included: 4,
        status: 'pending', // Always pending for admin approval
        payment_reference: paymentId || `TXD-${Date.now()}`,
        payment_method: 'online',
        member_details: membershipDetails,
        valid_from: validFrom.toISOString(),
        valid_until: validUntil.toISOString()
      };

      console.log('Creating membership record:', membershipData);
      
      const { data: membershipResult, error: membershipError } = await supabase
        .from('memberships')
        .insert(membershipData)
        .select()
        .single();

      if (membershipError) {
        console.error('Membership creation error:', membershipError);
        console.error('Error details:', membershipError.message, membershipError.details, membershipError.hint);
        throw membershipError;
      }

      console.log('Membership created successfully:', membershipResult);
      
      // Also create a record in appointments table for backward compatibility and admin workflow
      const appointmentData = {
        user_id: session.user.id,
        doctor_id: doctors.id, // Use existing doctor ID
        appointment_at: new Date(Date.now() + 60000).toISOString(), // 1 minute in future
        status: 'pending', // Always pending for admin approval
        notes: JSON.stringify({ 
          type: 'membership_purchase',
          membership_id: membershipResult.id, // Link to new membership record
          membershipType: 'premium',
          duration: '6_months',
          appointmentsIncluded: 4,
          amount: 3500,
          paymentReference: paymentId || membershipResult.payment_reference,
          paymentMethod: 'online',
          memberDetails: membershipDetails,
          created_at: new Date().toISOString()
        })
      };

      console.log('Creating appointment record for membership:', appointmentData);
      
      const { data: appointmentResult, error: appointmentError } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select();

      if (appointmentError) {
        console.error('Appointment creation error:', appointmentError);
        // Don't throw here as membership is already created successfully
        console.warn('Appointment record creation failed, but membership was created. Membership ID:', membershipResult.id);
      } else {
        console.log('Appointment record created:', appointmentResult);
      }
      
      toast({ 
        title: paymentId ? 'Membership request sent!' : 'Membership submitted',
        description: paymentId 
          ? 'Your membership request has been submitted with payment.' 
          : 'Your membership is pending admin approval.'
      });
      
      setIsMembershipOpen(false);
      setMembershipStep(1);
      setShowQRModal(false);
      setMembershipDetails({ name: "", email: "", contact: "", age: "", gender: "" });
      
      // Navigate to bookings to show the membership request
      navigate('/bookings?tab=pending');
      
    } catch (err) {
      console.error('Membership purchase failed:', err);
      
      // More detailed error message
      let errorMessage = 'Please check your details and try again.';
      let errorTitle = 'Membership purchase failed';
      
      if (err && typeof err === 'object' && 'message' in err) {
        const error = err as any;
        if (error.message?.includes('duplicate key')) {
          errorTitle = 'Membership Already Exists';
          errorMessage = 'You already have an active membership request.';
        } else if (error.message?.includes('permission denied')) {
          errorTitle = 'Permission Error';
          errorMessage = 'Unable to create membership. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({ 
        title: errorTitle, 
        description: errorMessage,
        variant: 'destructive' 
      });
    }
  };

  // Handle membership cancellation
  const handleCancelMembership = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to cancel your membership.",
          variant: "destructive"
        });
        return;
      }

      // Get the user's active membership
      const { data: membershipData, error: membershipError } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .single();

      if (membershipError || !membershipData) {
        toast({
          title: "Error",
          description: "Could not find your active membership.",
          variant: "destructive"
        });
        return;
      }

      // Cancel the membership
      const { error: cancelError } = await supabase
        .from('memberships')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', membershipData.id);

      if (cancelError) {
        console.error('Error canceling membership:', cancelError);
        toast({
          title: "Error",
          description: "Failed to cancel membership. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Update local state
      setUserMembershipStatus('cancelled');

      toast({
        title: "Membership Cancelled",
        description: "Your premium membership has been cancelled successfully."
      });

      // Refresh membership status after a short delay
      setTimeout(() => {
        checkUserMembershipStatus();
      }, 1000);

    } catch (error) {
      console.error('Error canceling membership:', error);
      toast({
        title: "Error",
        description: "Failed to cancel membership. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle getting support
  const handleGetSupport = () => {
    // You can customize this to open a support chat, email, or redirect to a support page
    const supportEmail = "support@thankyou.doc";
    const supportSubject = "Premium Member Support Request";
    const supportBody = "Hello, I need assistance with my premium membership.";
    
    const mailtoLink = `mailto:${supportEmail}?subject=${encodeURIComponent(supportSubject)}&body=${encodeURIComponent(supportBody)}`;
    
    // Try to open email client, fallback to showing contact info
    try {
      window.open(mailtoLink, '_blank');
    } catch (error) {
      // Fallback: Copy email to clipboard
      navigator.clipboard.writeText(supportEmail).then(() => {
        toast({
          title: "Support Email Copied",
          description: `Contact us at ${supportEmail} for premium member support.`
        });
      }).catch(() => {
        toast({
          title: "Support Contact",
          description: `Please email us at ${supportEmail} for premium member support.`
        });
      });
    }
  };

  // Handle membership details modal
  const handleMembershipDetails = async () => {
    try {
      // Reset state first
      setShowMembershipDetails(true);
      setIsLoadingMembershipDetails(true);
      setMembershipInfo(null); // Clear previous data to ensure fresh load

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: "Login required",
          description: "Please log in to view membership details.",
          variant: "destructive"
        });
        setShowMembershipDetails(false);
        setIsLoadingMembershipDetails(false);
        return;
      }

      // Get membership details
      const { data: membershipData, error: membershipError } = await supabase
        .from('memberships')
        .select('valid_until, appointments_included')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .single();

      if (membershipError || !membershipData) {
        toast({
          title: "Error",
          description: "Could not load membership details.",
          variant: "destructive"
        });
        setShowMembershipDetails(false);
        setIsLoadingMembershipDetails(false);
        return;
      }

      // Count free appointments used (including confirmed appointments as upcoming)
      console.log('[DEBUG] Counting free appointments in SearchPage...');

      // Method 1: JSON casting approach
      const { data: freeAppointmentsUsed1, error: countError1 } = await supabase
        .from('appointments')
        .select('id, status')
        .eq('user_id', session.user.id)
        .in('status', ['pending', 'confirmed', 'completed'])
        .eq('notes::jsonb->>isFreeAppointment', 'true');

      // Method 2: Text matching approach
      const { data: freeAppointmentsUsed2, error: countError2 } = await supabase
        .from('appointments')
        .select('id, status')
        .eq('user_id', session.user.id)
        .in('status', ['pending', 'confirmed', 'completed'])
        .like('notes', '%"isFreeAppointment":"true"%');

      // Method 3: Get all appointments and filter manually
      const { data: allAppointments, error: countError3 } = await supabase
        .from('appointments')
        .select('id, status, notes')
        .eq('user_id', session.user.id)
        .in('status', ['pending', 'confirmed', 'completed']);

      console.log('[DEBUG] SearchPage count methods:', {
        method1: freeAppointmentsUsed1?.length || 0,
        method2: freeAppointmentsUsed2?.length || 0,
        totalAppointments: allAppointments?.length || 0
      });

      // Use the best available result
      let freeAppointmentsUsed = freeAppointmentsUsed1 || freeAppointmentsUsed2 || [];

      // If both methods return empty, try manual filtering as fallback
      if ((!freeAppointmentsUsed1 || freeAppointmentsUsed1.length === 0) &&
          (!freeAppointmentsUsed2 || freeAppointmentsUsed2.length === 0) &&
          allAppointments) {

        freeAppointmentsUsed = allAppointments.filter(apt => {
          try {
            const notes = typeof apt.notes === 'string' ? JSON.parse(apt.notes) : apt.notes;
            return notes && (notes.isFreeAppointment === 'true' || notes.isFreeAppointment === true);
          } catch (e) {
            console.log('[DEBUG] Error parsing notes in SearchPage:', apt.notes, e);
            return false;
          }
        });

        console.log('[DEBUG] SearchPage manual filter result:', freeAppointmentsUsed.length);
      }

      console.log('Free appointments query result:', {
        freeAppointmentsUsed: freeAppointmentsUsed.length,
        countError: countError1 || countError2 || countError3,
        userId: session.user.id
      });

      // Separate counts for different statuses
      const upcomingCount = freeAppointmentsUsed ? freeAppointmentsUsed.filter(apt => apt.status === 'upcoming').length : 0;
      const confirmedCount = freeAppointmentsUsed ? freeAppointmentsUsed.filter(apt => apt.status === 'confirmed').length : 0;
      const completedCount = freeAppointmentsUsed ? freeAppointmentsUsed.filter(apt => apt.status === 'completed').length : 0;
      const pendingCount = freeAppointmentsUsed ? freeAppointmentsUsed.filter(apt => apt.status === 'pending').length : 0;

      // Total used count (all appointments that consume free slots)
      const usedCount = upcomingCount + confirmedCount + completedCount + pendingCount;
      const remainingCount = membershipData.appointments_included - usedCount;

      console.log('Detailed appointment counts:', {
        upcomingCount: 0, // No 'upcoming' status in database, confirmed appointments are shown as 'upcoming' in UI
        confirmedCount,
        completedCount,
        pendingCount,
        usedCount,
        remainingCount
      });

      setMembershipInfo({
        validUntil: membershipData.valid_until,
        appointmentsIncluded: membershipData.appointments_included,
        freeAppointmentsUsed: usedCount,
        freeAppointmentsRemaining: Math.max(0, remainingCount),
        upcomingCount,
        confirmedCount,
        completedCount,
        pendingCount
      });

      setIsLoadingMembershipDetails(false);
    } catch (error) {
      console.error('Error loading membership details:', error);
      toast({
        title: "Error",
        description: "Failed to load membership details.",
        variant: "destructive"
      });
      setShowMembershipDetails(false);
      setIsLoadingMembershipDetails(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Branding Header */}
      <div className="sticky top-0 z-50 glass-effect border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                  <Heart className="h-5 w-5 text-white" />
                </div>
                <Stethoscope className="h-3 w-3 text-secondary-accent absolute -bottom-0.5 -right-0.5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">ThankYouDoc</h1>
                <p className="text-xs text-muted-foreground">Find Your Doctor</p>
                {userMembershipStatus === 'active' && (
                  <div className="mt-1">
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/bookings")}>
                  <Calendar className="h-4 w-4 mr-2" />
                  My Bookings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/feedback")}>
                  <Star className="h-4 w-4 mr-2" />
                  Feedback
                </DropdownMenuItem>
                
                {/* Premium User Menu Items */}
                {userMembershipStatus === 'active' && (
                  <>
                    <DropdownMenuItem 
                      onClick={() => handleMembershipDetails()} 
                      className="text-primary font-medium"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Membership Details
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        // Handle cancel membership
                        if (confirm('Are you sure you want to cancel your premium membership? This action cannot be undone.')) {
                          handleCancelMembership();
                        }
                      }} 
                      className="text-destructive font-medium"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel Membership
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleGetSupport()} 
                      className="text-blue-600 font-medium"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Get Support
                    </DropdownMenuItem>
                  </>
                )}

                {/* Non-Premium User Menu Item */}
                {userMembershipStatus !== 'active' && (
                  <DropdownMenuItem onClick={() => setIsMembershipOpen(true)} className="text-primary font-medium">
                    <Crown className="h-4 w-4 mr-2" />
                    Premium Membership
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex-1 flex">
        {/* Main Search Content */}
        <div className="flex-1 flex flex-col justify-center px-4 py-6">
          <Card className="medical-card w-full max-w-2xl mx-auto">
            <CardContent className="p-6">
              {/* Search Bar moved to top */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  placeholder="Search doctors, specializations, hospitals, area..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-12 pr-12 h-14 text-base medical-input rounded-xl"
                />
                <Button 
                  onClick={handleSearch}
                  disabled={!searchQuery.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-lg medical-button-primary p-0"
                  size="icon"
                >
                  <Search className="h-5 w-5" />
                </Button>
              </div>

              {/* Premium Enhanced Tagline moved below with info boxes */}
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-2xl"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_50%)] rounded-2xl"></div>
                
                <div className="relative text-center space-y-4 p-6">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-8 h-px bg-gradient-to-r from-transparent to-primary/30"></div>
                    <Stethoscope className="h-5 w-5 text-primary/60" />
                    <div className="w-8 h-px bg-gradient-to-l from-transparent to-primary/30"></div>
                  </div>

                  {/* Headline */}
                  <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">Your health is our priority.</span> Connect with the best doctors in your area.
                  </p>

                  {/* Info Boxes */}
                  {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                    <div className="bg-card/70 backdrop-blur-sm border border-primary/10 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">Verified Doctors</span>
                      </div>
                      <p className="text-xs text-muted-foreground">All profiles are reviewed and verified.</p>
                    </div>
                    <div className="bg-card/70 backdrop-blur-sm border border-primary/10 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />
                        <span className="text-sm font-semibold">Top Rated</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Find doctors trusted by patients.</p>
                    </div>
                    <div className="bg-card/70 backdrop-blur-sm border border-primary/10 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Heart className="h-4 w-4 text-secondary-accent" />
                        <span className="text-sm font-semibold">Personalized Care</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Tailored recommendations for you.</p>
                    </div>
                  </div> */}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Membership Sidebar - Conditional based on user status */}
        <div className="hidden lg:block w-96 p-6">
          <div className="sticky top-24">
            {isLoadingMembershipStatus ? (
              // Loading state
              <Card className="medical-card border-2 border-primary/30 shadow-2xl overflow-hidden">
                <CardContent className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-sm text-muted-foreground">Checking membership status...</p>
                </CardContent>
              </Card>
            ) : userMembershipStatus === 'active' ? (
              // Premium Account Indicator - Subtle version
              <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl p-4 border border-primary/20">
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-1">
                    <Crown className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Premium Member</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enjoy all premium benefits
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full text-xs border-primary/30 text-primary hover:bg-primary/5"
                    onClick={() => navigate('/bookings')}
                  >
                    View Bookings
                  </Button>
                </div>
              </div>
            ) : userMembershipStatus === 'pending' ? (
              // Pending Membership Indicator - Subtle version
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200">
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-1">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-700">Pending Review</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your membership is under review
                  </p>
                </div>
              </div>
            ) : (
              // Membership Advertisement (for users without membership)
              <Card className="medical-card border-2 border-primary/30 shadow-2xl overflow-hidden">
                {/* Header with Crown */}
                <div className="bg-gradient-to-r from-primary to-primary-glow p-4 text-center">
                  <div className="flex items-center justify-center space-x-2 text-white">
                    <Crown className="h-6 w-6" />
                    <h3 className="text-lg font-bold">Premium Membership</h3>
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <p className="text-primary-foreground/90 text-sm mt-1">Unlock Exclusive Benefits</p>
                </div>

                {/* Main Content */}
                <CardContent className="p-6 space-y-4">
                  {/* Price Highlight */}
                  <div className="text-center bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg p-4 border border-primary/20">
                    <div className="text-3xl font-bold text-primary mb-1">₹3,500</div>
                    <div className="text-sm text-muted-foreground">Valid for 6 months</div>
                    <div className="text-sm font-medium text-primary">4 Appointments included</div>
                  </div>

                  {/* Key Benefits */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-center text-primary">Premium Benefits:</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                        <span>Priority appointment booking</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                        <span>Video consultations</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                        <span>20% off lab tests</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                        <span>Free medicine delivery</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                        <span>24/7 doctor chat support</span>
                      </div>
                    </div>
                  </div>

                  {/* Call to Action */}
                  <div className="space-y-3">
                    <Button 
                      className="w-full medical-gradient text-primary-foreground shadow-lg py-3" 
                      size="lg"
                      onClick={() => setIsMembershipOpen(true)}
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Get Premium Now
                    </Button>
                    
                    <div className="text-center">
                      <Badge variant="secondary" className="text-xs">
                        ⭐ Limited Time Offer
                      </Badge>
                    </div>
                  </div>

                  {/* Trust Indicators */}
                  <div className="border-t border-primary/10 pt-4">
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 text-yellow-500 fill-yellow-400" />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Join 10,000+ satisfied members
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Additional Promotional Element - Only show for non-premium users */}
            {userMembershipStatus === 'none' && (
              <div className="mt-4 text-center">
                <div className="bg-gradient-to-r from-secondary/10 to-primary/10 rounded-lg p-3 border border-primary/20">
                  <p className="text-xs text-muted-foreground">
                    🎯 <strong>Save 40%</strong> on your first membership!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Premium Membership Popup */}
      <Dialog open={isMembershipOpen} onOpenChange={(open) => {
        setIsMembershipOpen(open);
        if (!open) {
          setMembershipStep(1);
          setMembershipDetails({ name: "", email: "", contact: "", age: "", gender: "" });
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Crown className="h-6 w-6 text-primary" />
                Premium Membership
                <Sparkles className="h-5 w-5 text-primary/70" />
              </DialogTitle>
              {membershipStep > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMembershipStep(membershipStep - 1)}
                  className="flex items-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-center space-x-4">
              <div className={`flex items-center space-x-2 ${membershipStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${membershipStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  1
                </div>
                <span className="text-sm">Plan</span>
              </div>
              <div className={`w-8 h-0.5 ${membershipStep >= 2 ? 'bg-primary' : 'bg-muted'}`}></div>
              <div className={`flex items-center space-x-2 ${membershipStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${membershipStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  2
                </div>
                <span className="text-sm">Details</span>
              </div>
              <div className={`w-8 h-0.5 ${membershipStep >= 3 ? 'bg-primary' : 'bg-muted'}`}></div>
              <div className={`flex items-center space-x-2 ${membershipStep >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${membershipStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  3
                </div>
                <span className="text-sm">Payment</span>
              </div>
            </div>

            {/* Step Content */}
            {membershipStep === 1 && (
              <>
                {/* Hero Section */}
                <div className="text-center space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary-accent/20 rounded-2xl blur-xl"></div>
                    <div className="relative bg-gradient-to-r from-primary/10 to-secondary-accent/10 rounded-2xl p-6 border border-primary/20">
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        Unlock Premium Healthcare Benefits
                      </h3>
                      <p className="text-muted-foreground">
                        Get priority access to top doctors, exclusive discounts, and personalized care
                      </p>
                    </div>
                  </div>
                </div>

                {/* Membership Plans */}
                <div className="grid md:grid-cols-1 gap-6 max-w-2xl mx-auto">
                  {/* Premium Plan */}
                  <Card className="relative border-2 border-primary medical-shadow scale-105">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground px-3 py-1">
                        Premium Membership
                      </Badge>
                    </div>
                    <CardContent className="p-8 space-y-6">
                      <div className="text-center space-y-4">
                        <div className="flex items-center justify-center gap-2">
                          <Crown className="h-6 w-6 text-primary" />
                          <h4 className="text-2xl font-bold text-primary">Premium Plan</h4>
                        </div>
                        <div className="space-y-2">
                          <div className="text-4xl font-bold text-primary">₹3,500</div>
                          <div className="text-lg font-medium text-muted-foreground">Valid for 6 months</div>
                          <div className="text-lg font-medium text-primary">4 Appointments included</div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg p-4 border border-primary/20">
                        <h5 className="font-semibold text-center mb-4 text-primary">What's Included:</h5>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                            <span className="text-sm font-medium">4 Appointment bookings with top doctors</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                            <span className="text-sm font-medium">Priority appointment scheduling</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                            <span className="text-sm font-medium">Video consultations</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                            <span className="text-sm font-medium">Home visit booking</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                            <span className="text-sm font-medium">Lab test discounts (20% off)</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                            <span className="text-sm font-medium">Free medicine delivery</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                            <span className="text-sm font-medium">Medical records storage</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                            <span className="text-sm font-medium">24/7 doctor chat support</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                            <span className="text-sm font-medium">Health reminders & notifications</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                            <span className="text-sm font-medium">Family member profiles (3)</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-center space-y-3">
                        <Button className="w-full medical-gradient text-primary-foreground shadow-lg text-lg py-3" size="lg" onClick={handleMembershipPurchase}>
                          Continue to Details
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Valid for 6 months from activation date • Auto-renewal available
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {membershipStep === 2 && (
              <>
                {/* User Details Form */}
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Member Information
                    </h3>
                    <p className="text-muted-foreground">
                      Please provide your details for membership registration
                    </p>
                  </div>

                  <Card className="medical-card">
                    <CardContent className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="member-name" className="text-sm font-medium">Full Name *</Label>
                          <Input
                            id="member-name"
                            value={membershipDetails.name}
                            onChange={(e) => setMembershipDetails({...membershipDetails, name: e.target.value})}
                            placeholder="Enter your full name"
                            className="medical-input"
                          />
                        </div>
                        <div>
                          <Label htmlFor="member-age" className="text-sm font-medium">Age</Label>
                          <Input
                            id="member-age"
                            value={membershipDetails.age}
                            onChange={(e) => setMembershipDetails({...membershipDetails, age: e.target.value})}
                            placeholder="25"
                            className="medical-input"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="member-gender" className="text-sm font-medium">Gender</Label>
                        <Select value={membershipDetails.gender} onValueChange={(value) => setMembershipDetails({...membershipDetails, gender: value})}>
                          <SelectTrigger className="medical-input">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="member-email" className="text-sm font-medium">Email Address *</Label>
                        <Input
                          id="member-email"
                          type="email"
                          value={membershipDetails.email}
                          onChange={(e) => setMembershipDetails({...membershipDetails, email: e.target.value})}
                          placeholder="john@example.com"
                          className="medical-input"
                        />
                      </div>

                      <div>
                        <Label htmlFor="member-contact" className="text-sm font-medium">Contact Number *</Label>
                        <Input
                          id="member-contact"
                          value={membershipDetails.contact}
                          onChange={(e) => setMembershipDetails({...membershipDetails, contact: e.target.value})}
                          placeholder="+1 (555) 123-4567"
                          className="medical-input"
                        />
                      </div>

                      <div className="text-center space-y-3 pt-4">
                        <Button className="w-full medical-gradient text-primary-foreground shadow-lg text-lg py-3" size="lg" onClick={handleProceedToPayment}>
                          Proceed to Payment
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          * Required fields
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {membershipStep === 3 && (
              <>
                {/* Payment Confirmation */}
                <div className="text-center space-y-6">
                  <div className="bg-gradient-to-r from-primary/10 to-secondary-accent/10 rounded-2xl p-6 border border-primary/20">
                    <h3 className="text-xl font-semibold text-foreground mb-4">
                      Payment Details
                    </h3>
                    <div className="space-y-2">
                      <p className="text-lg"><strong>Name:</strong> {membershipDetails.name}</p>
                      <p className="text-lg"><strong>Email:</strong> {membershipDetails.email}</p>
                      <p className="text-lg"><strong>Contact:</strong> {membershipDetails.contact}</p>
                      <p className="text-lg"><strong>Amount:</strong> ₹3,500</p>
                      <p className="text-lg"><strong>Plan:</strong> Premium Membership (6 months)</p>
                    </div>
                  </div>

                  <div className="text-center space-y-3">
                    <Button className="w-full medical-gradient text-primary-foreground shadow-lg text-lg py-3" size="lg" onClick={handleMembershipConfirm}>
                      Confirm & Pay ₹3,500
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      You will be redirected to QR payment
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Additional Benefits */}
            {membershipStep === 1 && (
              <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-6 border border-primary/10">
                <h4 className="text-lg font-semibold mb-4 text-center">Additional Membership Benefits</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h5 className="font-medium">Secure & Private</h5>
                      <p className="text-sm text-muted-foreground">HIPAA compliant data protection</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                      <Star className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <h5 className="font-medium">Top Rated Doctors</h5>
                      <p className="text-sm text-muted-foreground">Access to verified specialists</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary-accent/10 flex items-center justify-center">
                      <Heart className="h-5 w-5 text-secondary-accent" />
                    </div>
                    <div>
                      <h5 className="font-medium">Personalized Care</h5>
                      <p className="text-sm text-muted-foreground">Customized health recommendations</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-glow/20 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary-glow" />
                    </div>
                    <div>
                      <h5 className="font-medium">24/7 Support</h5>
                      <p className="text-sm text-muted-foreground">Round-the-clock assistance</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Call to Action */}
            {membershipStep === 1 && (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Join thousands of satisfied patients who trust ThankYouDoc for their healthcare needs
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="outline" onClick={() => setIsMembershipOpen(false)}>
                    Maybe Later
                  </Button>
                  <Button className="medical-gradient text-primary-foreground px-8">
                    Start Free Trial
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Payment Modal for Membership */}
      {showQRModal && qrPaymentData && (
        <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Membership Payment</DialogTitle>
            </DialogHeader>
            <QRPayment
              paymentDetails={qrPaymentData}
              onPaymentComplete={() => confirmMembershipPurchase(qrPaymentData.referenceNumber)}
              onCancel={() => setShowQRModal(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Membership Details Modal */}
      {showMembershipDetails && (
        <Dialog open={showMembershipDetails} onOpenChange={(open) => {
          setShowMembershipDetails(open);
          if (!open) {
            setMembershipInfo(null); // Clear state when modal closes
            setIsLoadingMembershipDetails(false); // Reset loading state
          }
        }}>
          <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Premium Membership Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 overflow-y-auto pr-2 -mr-4">
              {isLoadingMembershipDetails ? (
                // Loading State
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading membership details...</p>
                </div>
              ) : membershipInfo ? (
                <>
                  {/* Membership Status Card */}
                  <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-6 border border-primary/20">
                    <div className="text-center space-y-4">
                      <div className="flex items-center justify-center space-x-2">
                        <Crown className="h-6 w-6 text-primary" />
                        <span className="text-lg font-semibold text-primary">Premium Member</span>
                      </div>

                      {/* Validity Period */}
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Valid Until</div>
                        <div className="text-lg font-semibold text-foreground">
                          {new Date(membershipInfo.validUntil).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            const now = new Date();
                            const validUntil = new Date(membershipInfo.validUntil);
                            const daysLeft = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            return `${daysLeft} days remaining`;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Free Appointments Status */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-center">Free Appointments</h4>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Appointments Used */}
                      <div className="bg-red-50 rounded-lg p-4 border border-red-200 text-center">
                        <div className="text-2xl font-bold text-red-600">{membershipInfo.freeAppointmentsUsed}</div>
                        <div className="text-sm text-red-700">Total Used</div>
                      </div>

                      {/* Appointments Remaining */}
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200 text-center">
                        <div className="text-2xl font-bold text-green-600">{membershipInfo.freeAppointmentsRemaining}</div>
                        <div className="text-sm text-green-700">Remaining</div>
                      </div>
                    </div>

                    {/* Detailed Status Breakdown */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h5 className="font-medium text-gray-800 mb-3 text-center">Appointment Status</h5>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pending:</span>
                          <span className="font-medium">{membershipInfo.pendingCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Confirmed:</span>
                          <span className="font-medium text-blue-600">{membershipInfo.confirmedCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Completed:</span>
                          <span className="font-medium text-green-600">{membershipInfo.completedCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Progress</span>
                        <span>{membershipInfo.freeAppointmentsUsed}/{membershipInfo.appointmentsIncluded}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-primary to-primary-glow h-3 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min((membershipInfo.freeAppointmentsUsed / membershipInfo.appointmentsIncluded) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Status Message */}
                    <div className="text-center">
                      {membershipInfo.freeAppointmentsRemaining > 0 ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-green-800 font-medium">
                            🎉 You have {membershipInfo.freeAppointmentsRemaining} free appointment{membershipInfo.freeAppointmentsRemaining !== 1 ? 's' : ''} remaining!
                          </div>
                          <div className="text-sm text-green-600 mt-1">Use them before your membership expires</div>
                        </div>
                      ) : (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="text-orange-800 font-medium">⚠️ All free appointments used</div>
                          <div className="text-sm text-orange-600 mt-1">Additional appointments will be charged at regular rates</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Membership Benefits Reminder */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <h5 className="font-semibold text-blue-800 mb-2">Premium Benefits:</h5>
                    <div className="grid grid-cols-1 gap-2 text-sm text-blue-700">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        <span>Priority appointment booking</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        <span>20% off lab tests</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        <span>Free medicine delivery</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session?.user) {
                          // Method 1: JSON casting
                          const { count: count1 } = await supabase
                            .from('appointments')
                            .select('*', { count: 'exact' })
                            .eq('user_id', session.user.id)
                            .eq('notes::jsonb->>isFreeAppointment', 'true')
                            .in('status', ['pending', 'confirmed', 'completed']);

                          // Method 2: Text matching
                          const { count: count2 } = await supabase
                            .from('appointments')
                            .select('*', { count: 'exact' })
                            .eq('user_id', session.user.id)
                            .like('notes', '%"isFreeAppointment":"true"%')
                            .in('status', ['pending', 'confirmed', 'completed']);

                          // Method 3: Manual filtering
                          const { data: all } = await supabase
                            .from('appointments')
                            .select('id, status, notes')
                            .eq('user_id', session.user.id)
                            .in('status', ['pending', 'confirmed', 'completed']);

                          let manual = 0;
                          if (all) {
                            manual = all.filter(apt => {
                              try {
                                const notes = typeof apt.notes === 'string' ? JSON.parse(apt.notes) : apt.notes;
                                return notes && (notes.isFreeAppointment === 'true' || notes.isFreeAppointment === true);
                              } catch (e) {
                                return false;
                              }
                            }).length;
                          }

                          const finalCount = Math.max(count1 || 0, count2 || 0, manual);

                          alert(`Membership Details Count:\nFinal Count: ${finalCount}/4\nMethod 1 (JSON): ${count1}\nMethod 2 (Text): ${count2}\nMethod 3 (Manual): ${manual}\n\nTotal Appointments: ${all?.length || 0}`);
                        }
                      }}
                      className="text-xs"
                    >
                      Debug Count
                    </Button>

                    <Button
                      variant="medical"
                      className="w-full"
                      onClick={() => {
                        setShowMembershipDetails(false);
                        navigate('/bookings');
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      View My Bookings
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowMembershipDetails(false)}
                    >
                      Close
                    </Button>
                  </div>
                </>
              ) : (
                // Error State
                <div className="text-center py-8">
                  <div className="text-red-500 mb-4">⚠️</div>
                  <p className="text-muted-foreground">Failed to load membership details.</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowMembershipDetails(false)}
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
            <div className="pt-4 border-t mt-auto">
              <Button 
                onClick={() => setShowMembershipDetails(false)}
                variant="outline"
                className="w-full"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation currentPage="search" />
    </div>
  );
};

export default SearchPage;