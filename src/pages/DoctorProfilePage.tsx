import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isSameDay, isBefore } from "date-fns";
import { initiateQRPayment, QrPaymentResponse } from "@/utils/payment";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import QRPayment from "@/components/QRPayment";
import {
  Shield,
  Heart,
  Eye,
  EyeOff,
  ArrowLeft,
  Monitor,
  Users,
  X,
  QrCode,
  Star,
  Stethoscope,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Phone
} from "lucide-react";

const DoctorProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine the view based on the URL path
  const isBookingPage = location.pathname.includes('/book');
  const isReviewsPage = location.pathname.includes('/reviews');
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [consultationType, setConsultationType] = useState<"online" | "offline">("offline");
  const [paymentMethod, setPaymentMethod] = useState<"offline">("offline");
  const [notifyMe, setNotifyMe] = useState(true);
  const [hasBookedConsultation, setHasBookedConsultation] = useState(false);
  const bookingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showBookingForm && bookingRef.current) {
      bookingRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showBookingForm]);
  
  const [patientDetails, setPatientDetails] = useState({
    name: "",
    age: "",
    gender: "",
    problem: "",
    email: "",
    contact: ""
  });

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const handleSubmitReview = () => {
    if (reviewRating === 0) {
      toast({ title: "Rating required", description: "Please select a star rating.", variant: "destructive" });
      return;
    }
    toast({ title: "Review submitted", description: "Thank you for your feedback." });
    setReviewRating(0);
    setReviewText("");
  };

// Load real doctor from Supabase
const [doctor, setDoctor] = useState<any>({
  id: id || "",
  name: "",
  specialization: "",
  qualification: "",
  certifications: "",
  photo: "/placeholder.svg",
  rating: 0,
  totalReviews: 0,
  isVerified: true,
  about: "",
  clinics: [],
  location: "",
  whatsapp: "",
  reviews: [] as any[],
  consultation_fee: 0 // Added consultation_fee to the doctor state
});
const [loadingDoctor, setLoadingDoctor] = useState(true);

useEffect(() => {
  const fetchDoctor = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setDoctor({
        id: data.id,
        name: data.full_name || "",
        specialization: data.specialty || "",
        qualification: data.qualifications || "",
        certifications: data.certifications || "",
        photo: data.photo_url || "/placeholder.svg",
        rating: Number(data.rating || 0),
        totalReviews: data.total_reviews || 0,
        isVerified: data.is_verified || false,
        about: data.bio || "",
        clinics: [],
        location: data.location || "",
        whatsapp: data.phone || "",
        reviews: [] as any[], // Ensure reviews is an array
        consultation_fee: Number(data.consultation_fee || 0), // Set consultation_fee
        // New scraped fields
        success_rate: data.success_rate || null,
        timings: data.timings_json || null,
        experience_years: data.experience_years || 0,
      });
    } catch (err) {
      console.error('Failed to load doctor', err);
      toast({ title: 'Error', description: 'Failed to load doctor profile.' });
    } finally {
      setLoadingDoctor(false);
    }
  };
  fetchDoctor();
}, [id]);

  // Load membership status when component mounts and when user session changes
  useEffect(() => {
    const loadMembershipStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await checkUserMembershipStatus();
      }
    };

    loadMembershipStatus();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await checkUserMembershipStatus();
      } else {
        // Reset membership info when user logs out
        setUserMembershipInfo({
          isPremiumMember: false,
          completedAppointmentsCount: 0,
          isEligibleForFreeAppointment: false
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const startMinutes = 9 * 60; // 9:00 AM
    const endMinutes = 22 * 60; // 10:00 PM
    const step = 30; // 30-minute interval

    for (let m = startMinutes; m <= endMinutes; m += step) {
      const hours24 = Math.floor(m / 60);
      const minutes = m % 60;
      const meridiem = hours24 >= 12 ? 'PM' : 'AM';
      const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
      const hh = String(hours12).padStart(2, '0');
      const mm = String(minutes).padStart(2, '0');
      slots.push(`${hh}:${mm} ${meridiem}`);
    }

    return slots;
  }, []);

  const [qrPaymentData, setQrPaymentData] = useState<QrPaymentResponse | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [userMembershipInfo, setUserMembershipInfo] = useState<{
    isPremiumMember: boolean;
    completedAppointmentsCount: number;
    isEligibleForFreeAppointment: boolean;
    membershipData?: any;
  }>({
    isPremiumMember: false,
    completedAppointmentsCount: 0,
    isEligibleForFreeAppointment: false
  });

  const checkUserMembershipStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Try the SQL function first, fallback to manual query if it fails
      let membershipData = null;
      try {
        const { data, error } = await supabase.rpc('get_membership_with_count', {
          user_id: session.user.id
        });

        if (data && data.length > 0) {
          membershipData = data[0];
          console.log('[DEBUG] Using SQL function result:', membershipData);
        }
      } catch (rpcError) {
        console.warn('[DEBUG] SQL function failed, using fallback query:', rpcError);
      }

      // Fallback: Manual query if SQL function fails
      if (!membershipData) {
        const { data: membershipResult, error: membershipError } = await supabase
          .from('memberships')
          .select('id, status, valid_until, appointments_included')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .single();

        if (membershipResult && !membershipError) {
          // Count free appointments using multiple methods
          const { count: cnt1 } = await supabase
            .from('appointments')
            .select('*', { count: 'exact' })
            .eq('user_id', session.user.id)
            .eq('notes::jsonb->>isFreeAppointment', 'true')
            .in('status', ['pending', 'confirmed', 'completed']);

          const { count: cnt2 } = await supabase
            .from('appointments')
            .select('*', { count: 'exact' })
            .eq('user_id', session.user.id)
            .like('notes', '%"isFreeAppointment":"true"%')
            .in('status', ['pending', 'confirmed', 'completed']);

          const { data: allAppts } = await supabase
            .from('appointments')
            .select('id, status, notes')
            .eq('user_id', session.user.id)
            .in('status', ['pending', 'confirmed', 'completed']);

          let cnt3 = 0;
          if (allAppts) {
            cnt3 = allAppts.filter(apt => {
              try {
                const notes = typeof apt.notes === 'string' ? JSON.parse(apt.notes) : apt.notes;
                return notes && (notes.isFreeAppointment === 'true' || notes.isFreeAppointment === true);
              } catch (e) {
                return false;
              }
            }).length;
          }

          const freeCount = Math.max(cnt1 || 0, cnt2 || 0, cnt3);

          membershipData = {
            ...membershipResult,
            free_appointments_used: freeCount
          };
          console.log('[DEBUG] Fallback query counts:', { cnt1, cnt2, cnt3, final: freeCount });
        }
      }

      if (membershipData) {
        setUserMembershipInfo({
          isPremiumMember: true,
          completedAppointmentsCount: membershipData.free_appointments_used || 0,
          isEligibleForFreeAppointment: (membershipData.free_appointments_used || 0) < (membershipData.appointments_included || 4),
          membershipData: membershipData
        });
        console.log('[DEBUG] Final membership state set:', {
          count: membershipData.free_appointments_used || 0,
          included: membershipData.appointments_included || 4
        });
      } else {
        // No active membership
        setUserMembershipInfo({
          isPremiumMember: false,
          completedAppointmentsCount: 0,
          isEligibleForFreeAppointment: false
        });
        console.log('[DEBUG] No active membership found');
      }
    } catch (error) {
      console.error('Error checking membership status:', error);
      setUserMembershipInfo({
        isPremiumMember: false,
        completedAppointmentsCount: 0,
        isEligibleForFreeAppointment: false
      });
    }
  };


  const handleQRPayment = async () => {
    if (doctor.consultation_fee === undefined || doctor.consultation_fee === null) {
      toast({ title: "Error", description: "Doctor's consultation fee is not available.", variant: "destructive" });
      return;
    }

    // Check if user is eligible for free appointment
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: membershipData, error: membershipError } = await supabase
      .from('memberships')
      .select('id, status, valid_until, appointments_included')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single();

    let isEligibleForFreeAppointment = false;
    if (membershipData && !membershipError) {
      const validUntil = new Date(membershipData.valid_until);
      const now = new Date();
      
      if (validUntil > now) {
        const { data: completedAppointments, error: countError } = await supabase
          .from('appointments')
          .select('id, status')
          .eq('user_id', session.user.id)
          .in('status', ['pending', 'confirmed', 'completed'])
          .eq('notes->>isFreeAppointment', 'true');

        if (completedAppointments && !countError) {
          // Separate counts for different statuses
          const upcomingCount = completedAppointments.filter(apt => apt.status === 'upcoming').length; // Will be 0
          const confirmedCount = completedAppointments.filter(apt => apt.status === 'confirmed').length;
          const completedCount = completedAppointments.filter(apt => apt.status === 'completed').length;
          const pendingCount = completedAppointments.filter(apt => apt.status === 'pending').length;

          // Total used count (all appointments that consume free slots)
          const totalUsed = upcomingCount + confirmedCount + completedCount + pendingCount;
          isEligibleForFreeAppointment = totalUsed < (membershipData.appointments_included || 4);
        }
      }
    }

    // If eligible for free appointment, proceed directly to booking without payment
    if (isEligibleForFreeAppointment) {
      toast({ 
        title: "Free Premium Appointment", 
        description: "Enjoy your complimentary appointment as a premium member!" 
      });
      
      // Update the state immediately for the free appointment
      const { data: freeAppointmentsUsed, error: freeCountError } = await supabase
        .from('appointments')
        .select('id, status')
        .eq('user_id', session.user.id)
        .in('status', ['pending', 'confirmed', 'completed'])
        .eq('notes->>isFreeAppointment', 'true');

      if (freeAppointmentsUsed && !freeCountError) {
        // Separate counts for different statuses
        const upcomingCount = freeAppointmentsUsed.filter(apt => apt.status === 'upcoming').length; // Will be 0
        const confirmedCount = freeAppointmentsUsed.filter(apt => apt.status === 'confirmed').length;
        const completedCount = freeAppointmentsUsed.filter(apt => apt.status === 'completed').length;
        const pendingCount = freeAppointmentsUsed.filter(apt => apt.status === 'pending').length;

        // Total used count (all appointments that consume free slots)
        const totalUsed = upcomingCount + confirmedCount + completedCount + pendingCount;
        setUserMembershipInfo(prev => ({
          ...prev,
          completedAppointmentsCount: totalUsed,
          isEligibleForFreeAppointment: totalUsed < (membershipData?.appointments_included || 4)
        }));
      }
      
      confirmBooking('FREE');
      return;
    }

    // Otherwise proceed with normal payment
    const amount = doctor.consultation_fee;
    initiateQRPayment({
      amount: amount,
      doctorName: doctor.name,
      patientName: patientDetails.name,
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

  const handleConfirmBooking = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // 1. Check current free appointment count - try multiple approaches
      console.log('[DEBUG] Checking current free appointment count...');

      // First try: JSON casting approach
      const { count: freeCount1, error: error1 } = await supabase
        .from('appointments')
        .select('*', { count: 'exact' })
        .eq('user_id', session.user.id)
        .eq('notes::jsonb->>isFreeAppointment', 'true')
        .in('status', ['pending', 'confirmed', 'completed']);

      console.log('[DEBUG] Method 1 (JSON cast):', freeCount1, 'Error:', error1);

      // Second try: Text matching approach
      const { count: freeCount2, error: error2 } = await supabase
        .from('appointments')
        .select('*', { count: 'exact' })
        .eq('user_id', session.user.id)
        .like('notes', '%"isFreeAppointment":"true"%')
        .in('status', ['pending', 'confirmed', 'completed']);

      console.log('[DEBUG] Method 2 (text match):', freeCount2, 'Error:', error2);

      // Third try: Get all appointments and filter manually
      const { data: allAppointments, error: error3 } = await supabase
        .from('appointments')
        .select('id, status, notes')
        .eq('user_id', session.user.id)
        .in('status', ['pending', 'confirmed', 'completed']);

      console.log('[DEBUG] All user appointments:', allAppointments);

      let manualCount = 0;
      if (allAppointments) {
        manualCount = allAppointments.filter(apt => {
          try {
            const notes = typeof apt.notes === 'string' ? JSON.parse(apt.notes) : apt.notes;
            console.log('[DEBUG] Appointment notes:', apt.notes, 'Parsed:', notes);
            const isFree = notes && (notes.isFreeAppointment === 'true' || notes.isFreeAppointment === true);
            console.log('[DEBUG] isFreeAppointment check:', isFree);
            return isFree;
          } catch (e) {
            console.log('[DEBUG] Error parsing notes:', apt.notes, e);
            return false;
          }
        }).length;
      }

      console.log('[DEBUG] Manual count from all appointments:', manualCount);

      // Use the highest count found
      const freeAppointmentsUsed = Math.max(freeCount1 || 0, freeCount2 || 0, manualCount);
      console.log(`[DEBUG] Final count used: ${freeAppointmentsUsed}/4`);

      // 2. Check if user is eligible for free appointment
      if (freeAppointmentsUsed < 4) {
        // User has free appointments available
        await confirmBooking('FREE');
        return;
      }

      // 3. User has used all free appointments, proceed with payment
      if (paymentMethod === "online") {
        // Online payment - initiate QR payment
        return initiateQRPayment({
          amount: doctor.consultation_fee,
          doctorName: doctor.name,
          patientName: patientDetails.name,
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
      } else {
        // Offline payment - pay at clinic
        await confirmBooking('PAY_AT_CLINIC');
      }

    } catch (error) {
      console.error('Booking error:', error);
    }
  };

  const confirmBooking = async (paymentId?: string) => {
    // TEMPORARY: Add this button to test RLS
    const testRLS = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Test 1: Can we access appointments table at all?
      const { data: allAppts, error: allErr } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', session.user.id);

      console.log('[RLS TEST] All appointments query:', { count: allAppts?.length, error: allErr });

      // Test 2: Check if any appointments have isFreeAppointment
      if (allAppts) {
        allAppts.forEach((apt, index) => {
          console.log(`[RLS TEST] Appointment ${index}:`, {
            id: apt.id,
            status: apt.status,
            notes: apt.notes,
            user_id: apt.user_id
          });
        });
      }
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();

      // 1. Get current count before booking - use same multi-method approach
      console.log('[DEBUG] Getting current count in confirmBooking...');

      // First try: JSON casting approach
      const { count: count1, error: err1 } = await supabase
        .from('appointments')
        .select('*', { count: 'exact' })
        .eq('user_id', session.user.id)
        .eq('notes::jsonb->>isFreeAppointment', 'true');

      // Second try: Text matching approach
      const { count: count2, error: err2 } = await supabase
        .from('appointments')
        .select('*', { count: 'exact' })
        .eq('user_id', session.user.id)
        .like('notes', '%"isFreeAppointment":"true"%');

      // Third try: Get all appointments and filter manually
      const { data: allAppts } = await supabase
        .from('appointments')
        .select('id, status, notes')
        .eq('user_id', session.user.id);

      let manualCnt = 0;
      if (allAppts) {
        manualCnt = allAppts.filter(apt => {
          try {
            const notes = typeof apt.notes === 'string' ? JSON.parse(apt.notes) : apt.notes;
            return notes && (notes.isFreeAppointment === 'true' || notes.isFreeAppointment === true);
          } catch (e) {
            return false;
          }
        }).length;
      }

      const currentFreeCount = Math.max(count1 || 0, count2 || 0, manualCnt);
      console.log(`[DEBUG] Current free count before booking: ${currentFreeCount}`);

      // 2. Create booking
      // Parse appointment time
      const [timePart, meridiem] = selectedTime.split(' ');
      const [hh, mm] = timePart.split(':').map(Number);
      let hours = hh % 12;
      if ((meridiem || '').toUpperCase() === 'PM') hours += 12;

      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(hours, mm || 0, 0, 0);

      const bookingData = {
        user_id: session.user.id,
        doctor_id: id,
        appointment_at: appointmentDate.toISOString(),
        status: 'pending',
        notes: JSON.stringify({
          consultationType,
          paymentMethod: paymentId === 'FREE' ? 'membership_free' : (paymentId === 'PAY_AT_CLINIC' ? 'pay_at_clinic' : paymentMethod),
          paymentReference: paymentId === 'FREE' ? 'MEMBERSHIP_FREE' : (paymentId === 'PAY_AT_CLINIC' ? 'PAY_AT_CLINIC' : paymentId),
          patientDetails,
          notifyMe,
          isFreeAppointment: paymentId === 'FREE'
        })
      };

      const { data, error } = await supabase
        .from('appointments')
        .insert(bookingData)
        .select();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      // 3. Update UI state
      const newCount = (currentFreeCount || 0) + (paymentId === 'FREE' ? 1 : 0);
      console.log(`[DEBUG] Updating UI: ${currentFreeCount} + 1 = ${newCount}`);

      setUserMembershipInfo(prev => ({
        ...prev,
        completedAppointmentsCount: newCount,
        isEligibleForFreeAppointment: newCount < 4
      }));

      // 4. Show user feedback
      console.log(`[DEBUG] Showing toast for count: ${newCount}/4`);
      
      let title, description;
      if (paymentId === 'FREE') {
        title = `Free Appointment Booked (${newCount}/4 used)`;
        description = `You have ${4 - newCount} free appointments remaining`;
      } else if (paymentId === 'PAY_AT_CLINIC') {
        title = 'Appointment Booked - Pay at Clinic';
        description = 'Please bring payment when you visit the clinic';
      } else {
        title = 'Paid Appointment Booked';
        description = 'Your appointment has been booked with online payment';
      }
      
      toast({
        title,
        description,
        variant: paymentId === 'FREE' && newCount >= 4 ? 'destructive' : 'default'
      });

      // 5. Refresh data after 1 second
      setTimeout(() => checkUserMembershipStatus(), 1000);

      setHasBookedConsultation(true);
      setBookingStep(3);
      setShowQRModal(false);
      navigate('/bookings?tab=pending');

    } catch (error) {
      console.error('Booking confirmation failed:', error);
      toast({
        title: 'Booking failed',
        description: 'Please check your details and try again.',
        variant: "destructive"
      });
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link to={isBookingPage || isReviewsPage ? `/doctor/${id}` : "/search"}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back{isBookingPage ? ' to Profile' : isReviewsPage ? ' to Profile' : ''}
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <Heart className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-primary">ThankYouDoc</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {isReviewsPage ? (
          // Reviews Page
          <>
            <Card className="medical-card mb-8 animate-fade-in">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start space-y-4 md:space-y-0 md:space-x-6">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="h-16 w-16 text-primary" />
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div>
                      <h1 className="text-2xl font-bold text-foreground">{doctor.name}</h1>
                      <Badge variant="secondary" className="text-lg px-3 py-1 mt-2">
                        {doctor.specialization}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        {renderStars(Math.floor(doctor.rating))}
                        <span className="font-medium ml-2">{doctor.rating}</span>
                        <span className="text-muted-foreground">({doctor.totalReviews} reviews)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Write Review Form */}
            <Card className="medical-card mb-6" id="write">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-primary" />
                  <span>Write a Review</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center space-x-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setReviewRating(index + 1)}
                      className="p-1"
                    >
                      <Star className={`h-5 w-5 ${index < reviewRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder={`Share your experience with ${doctor.name}...`}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="min-h-24 medical-input"
                />
                <Button onClick={handleSubmitReview} disabled={reviewRating === 0} className="w-full">
                  Submit Review
                </Button>
              </CardContent>
            </Card>

            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span>All Patient Reviews ({doctor.totalReviews})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {doctor.reviews.map((review) => (
                  <div key={review.id} className="border-b border-border pb-4 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{review.patientName}</span>
                        <div className="flex">{renderStars(review.rating)}</div>
                      </div>
                      <span className="text-sm text-muted-foreground">{review.date}</span>
                    </div>
                    <p className="text-muted-foreground">{review.comment}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        ) : isBookingPage ? (
          // Booking Page
          <>
            <Card className="medical-card mb-8 animate-fade-in">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start space-y-4 md:space-y-0 md:space-x-6">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="h-16 w-16 text-primary" />
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div>
                      <h1 className="text-2xl font-bold text-foreground">{doctor.name}</h1>
                      <Badge variant="secondary" className="text-lg px-3 py-1 mt-2">
                        {doctor.specialization}
                      </Badge>
                      <p className="text-muted-foreground mt-2">{doctor.qualification}</p>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        {renderStars(Math.floor(doctor.rating))}
                        <span className="font-medium ml-2">{doctor.rating}</span>
                        <span className="text-muted-foreground">({doctor.totalReviews} reviews)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  <span>Book Appointment</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Select Date</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border medical-input p-3 pointer-events-auto"
                    disabled={(date) => date < new Date()}
                  />
                </div>

                {selectedDate && (
                  <div className="animate-slide-up">
                    <Label className="text-sm font-medium mb-2 block">Available Time Slots</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {timeSlots.map((time) => {
                        const [timePart, meridiem] = time.split(' ');
                        let [hh, mm] = timePart.split(':').map(Number);
                        let hours = hh % 12;
                        if ((meridiem || '').toUpperCase() === 'PM') hours += 12;
  
                        const slotDateTime = new Date(selectedDate);
                        slotDateTime.setHours(hours, mm || 0, 0, 0);
  
                        const now = new Date();
                        const isPastTime = isSameDay(selectedDate, now) && isBefore(slotDateTime, now);

                        return (
                          <Button
                            key={time}
                            variant={selectedTime === time ? "medical" : "outline"}
                            size="sm"
                            onClick={() => setSelectedTime(time)}
                            className="text-sm"
                            disabled={isPastTime} // Disable past time slots for today
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            {time}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedDate && selectedTime && (
                  <Button 
                    variant="medical" 
                    className="w-full animate-scale-in"
                    onClick={() => setShowBookingForm(true)}
                  >
                    Proceed to Patient Details
                  </Button>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          // Default Profile Page
          <>
            <Card className="medical-card mb-8 animate-fade-in">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start space-y-4 md:space-y-0 md:space-x-6">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {doctor.photo && doctor.photo !== "/placeholder.svg" ? (
                      <img 
                        src={doctor.photo} 
                        alt={doctor.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                          if (nextElement) nextElement.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="flex items-center justify-center w-full h-full" style={{ display: doctor.photo && doctor.photo !== "/placeholder.svg" ? 'none' : 'flex' }}>
                      <Stethoscope className="h-16 w-16 text-primary" />
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <h1 className="text-2xl font-bold text-foreground">{doctor.name}</h1>
                        {doctor.isVerified && (
                          <Badge className="bg-success text-success-foreground">
                            <Shield className="h-3 w-3 mr-1" />
                            Trusted & Verified
                          </Badge>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-lg px-3 py-1">
                        {doctor.specialization}
                      </Badge>
                      <p className="text-muted-foreground mt-2">{doctor.qualification}</p>
                      {doctor.certifications && (
                        <p className="text-muted-foreground mt-1 text-sm">{doctor.certifications}</p>
                      )}
                      {doctor.location && (
                        <div className="flex items-center space-x-1 text-muted-foreground text-sm mt-1">
                          <MapPin className="h-3 w-3" />
                          <span>{doctor.location}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        {renderStars(Math.floor(doctor.rating))}
                        <span className="font-medium ml-2">{doctor.rating}</span>
                        <span className="text-muted-foreground">({doctor.totalReviews} reviews)</span>
                      </div>
                      {doctor.success_rate && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <span className="text-sm font-medium">{doctor.success_rate} success rate</span>
                        </div>
                      )}
                      {doctor.experience_years > 0 && (
                        <div className="flex items-center space-x-1 text-muted-foreground">
                          <span className="text-sm">{doctor.experience_years} years experience</span>
                        </div>
                      )}
                    </div>
                    {doctor.timings && doctor.timings.working_hours && (
                      <div className="mt-2">
                        <h4 className="text-sm font-medium text-foreground mb-1">Working Hours:</h4>
                        <div className="text-sm text-muted-foreground">
                          {doctor.timings.working_hours.map((timing: string, index: number) => (
                            <div key={index}>{timing}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Clinics */}
            <Card className="medical-card animate-slide-up mb-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span>Clinic Locations</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {doctor.clinics.map((clinic, index) => (
                  <div key={index} className="border-l-4 border-primary/20 pl-4">
                    <h4 className="font-semibold text-foreground">{clinic.name}</h4>
                    <p className="text-muted-foreground text-sm">{clinic.address}</p>
                    <p className="text-muted-foreground text-sm flex items-center space-x-1">
                      <Phone className="h-3 w-3" />
                      <span>{hasBookedConsultation ? clinic.phone : "+1 (*** ) ***-****"}</span>
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Contact Number - Reveal after booking */}
            <Card className="medical-card mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-5 w-5 text-success" />
                    <span className="font-medium">Contact Number</span>
                  </div>
                  {!hasBookedConsultation ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-muted-foreground">••••••••••</span>
                      <Badge variant="outline" className="text-xs">Book to reveal</Badge>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-success">{doctor.whatsapp}</span>
                      <Badge className="bg-success text-success-foreground text-xs">Available</Badge>
                    </div>
                  )}
                </div>
                {!hasBookedConsultation && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Contact number will be visible after booking confirmation
                  </p>
                )}
              </CardContent>
            </Card>

            {/* About Doctor */}
            <Card className="medical-card mb-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  <span>About Doctor</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{doctor.about}</p>
              </CardContent>
            </Card>

            {/* Patient Reviews with Write Review Option */}
            <Card className="medical-card mb-6">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span>Patient Reviews ({doctor.totalReviews})</span>
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/doctor/${doctor.id}/reviews#write`)}
                  >
                    Write Review
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {doctor.reviews.slice(0, 2).map((review) => (
                  <div key={review.id} className="border-b border-border pb-4 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{review.patientName}</span>
                        <div className="flex">{renderStars(review.rating)}</div>
                      </div>
                      <span className="text-sm text-muted-foreground">{review.date}</span>
                    </div>
                    <p className="text-muted-foreground">{review.comment}</p>
                  </div>
                ))}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/doctor/${doctor.id}/reviews`)}>
                      Read more reviews
                    </Button>
                    <Button size="sm" onClick={() => navigate(`/doctor/${doctor.id}/reviews#write`)}>
                      Write Review
                    </Button>
                  </div>
              </CardContent>
            </Card>

            {/* Book Appointment CTA */}
            <Card className="medical-card">
              <CardContent className="p-6 text-center">
                <Button 
                  variant="medical" 
                  size="lg"
                  onClick={() => navigate(`/doctor/${doctor.id}/book`)}
                  className="w-full animate-scale-in"
                >
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  Book Your Appointment
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Schedule your consultation with {doctor.name}
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Booking Dialog - Show on all pages */}
        {showBookingForm && (
          <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {bookingStep === 1 && "Appointment Details"}
                  {bookingStep === 2 && "Patient Information"}
                  {bookingStep === 3 && "Booking Confirmed"}
                </DialogTitle>
              </DialogHeader>

              {bookingStep === 1 && (
                <div className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-md">
                    <p><strong>Doctor:</strong> {doctor.name}</p>
                    <p><strong>Date:</strong> {selectedDate?.toLocaleDateString()}</p>
                    <p><strong>Time:</strong> {selectedTime}</p>
                  </div>
                  <Button 
                    variant="medical" 
                    className="w-full"
                    onClick={() => setBookingStep(2)}
                  >
                    Continue
                  </Button>
                </div>
              )}

              {bookingStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Patient Name</Label>
                      <Input
                        id="name"
                        value={patientDetails.name}
                        onChange={(e) => setPatientDetails({...patientDetails, name: e.target.value})}
                        placeholder="Full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        value={patientDetails.age}
                        onChange={(e) => setPatientDetails({...patientDetails, age: e.target.value})}
                        placeholder="25"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={patientDetails.gender} onValueChange={(value) => setPatientDetails({...patientDetails, gender: value})}>
                      <SelectTrigger>
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
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={patientDetails.email}
                      onChange={(e) => setPatientDetails({...patientDetails, email: e.target.value})}
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="contact">Contact Number</Label>
                    <Input
                      id="contact"
                      value={patientDetails.contact}
                      onChange={(e) => setPatientDetails({...patientDetails, contact: e.target.value})}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <Label htmlFor="problem">Problem Description</Label>
                    <Textarea
                      id="problem"
                      value={patientDetails.problem}
                      onChange={(e) => setPatientDetails({...patientDetails, problem: e.target.value})}
                      placeholder="Describe your symptoms or concerns..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Consultation Type</Label>
                    <div className="flex space-x-2 mt-2">
                      <Button
                        variant={consultationType === "online" ? "medical" : "outline"}
                        size="sm"
                        onClick={() => {
                          setConsultationType("online");
                          setPaymentMethod("online"); // Online consultation only supports online payment
                        }}
                        className="flex-1"
                      >
                        <Monitor className="h-4 w-4 mr-1" />
                        Online
                      </Button>
                      <Button
                        variant={consultationType === "offline" ? "medical" : "outline"}
                        size="sm"
                        onClick={() => {
                          setConsultationType("offline");
                          setPaymentMethod("online"); // Default to online payment for offline consultation
                        }}
                        className="flex-1"
                      >
                        <Users className="h-4 w-4 mr-1" />
                        In-Person
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Payment Method</Label>
                    <div className="flex space-x-2 mt-2">
                      <Button
                        variant={paymentMethod === "offline" ? "medical" : "outline"}
                        size="sm"
                        onClick={() => setPaymentMethod("offline")}
                        className="flex-1"
                      >
                        <MapPin className="h-4 w-4 mr-1" />
                        Pay at Clinic
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Payment will be collected at the clinic during your visit.
                    </p>
                  </div>

                  {/* Pricing Information */}
                  <div className="bg-gradient-to-r from-primary/5 to-secondary/5 p-4 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-primary">Consultation Fee</h4>
                        <p className="text-sm text-muted-foreground">Standard appointment charge</p>
                      </div>
                      <div className="text-right">
                        {userMembershipInfo.isEligibleForFreeAppointment ? (
                          <div className="text-center">
                            <div className="text-2xl font-bold text-success">FREE</div>
                            <div className="text-xs text-success font-medium">Premium Member</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Complimentary appointment ({userMembershipInfo.completedAppointmentsCount + 1}/4)
                            </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">₹{doctor.consultation_fee}</div>
                            <div className="text-xs text-muted-foreground">One-time payment</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

					<div className="flex space-x-2">

                    <Button
                      variant="medical"
                      className="w-full relative"
                      onClick={handleConfirmBooking}
                      disabled={!patientDetails.name || !patientDetails.email || !patientDetails.contact}
                    >
                      <div className="flex items-center justify-center">
                        Confirm Booking
                        {userMembershipInfo.completedAppointmentsCount !== undefined && (
                          <span className="ml-2 bg-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {userMembershipInfo.completedAppointmentsCount}/4
                          </span>
                        )}
                      </div>
                    </Button>
                  </div>
                </div>
              )}

              {bookingStep === 3 && (
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-success">Booking Confirmed!</h3>
                  <p className="text-muted-foreground">
                    Your appointment with {doctor.name} has been successfully booked.
                  </p>
                  <div className="bg-muted/50 p-4 rounded-md text-left">
                    <p><strong>Date:</strong> {selectedDate?.toLocaleDateString()}</p>
                    <p><strong>Time:</strong> {selectedTime}</p>
                    <p><strong>Type:</strong> {consultationType}</p>
                    <p><strong>Payment:</strong> {userMembershipInfo.isEligibleForFreeAppointment ? "FREE (Premium Member)" : `₹${doctor.consultation_fee} (${paymentMethod === "online" ? "Paid Online" : "Pay at Clinic"})`}</p>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={notifyMe}
                      onChange={(e) => setNotifyMe(e.target.checked)}
                      className="rounded"
                    />
                    <label>Notify me 1 hour before appointment</label>
                  </div>
                  <Link to="/bookings">
                    <Button variant="medical" className="w-full">
                      View My Bookings
                    </Button>
                  </Link>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}

        {/* QR Modal */}
        {showQRModal && qrPaymentData && (
          <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Scan QR to Pay</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center space-y-4">
                <img 
                  src={qrPaymentData.qrCodeUrl} 
                  alt="Payment QR Code" 
                  className="w-64 h-64 object-contain"
                />
                <div className="text-center">
                  <p className="font-medium">Amount: ₹{(qrPaymentData.amount ).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Reference: {qrPaymentData.referenceNumber}</p>
                  <p className="text-sm text-muted-foreground">UPI ID: {qrPaymentData.upiId}</p>
                </div>
                <Button 
                  variant="medical" 
                  className="w-full"
                  onClick={async () => {
                    try {
                      if (!qrPaymentData) return;
                      await confirmBooking(qrPaymentData.referenceNumber);
                      setShowQRModal(false);
                      toast({ 
                        title: 'Booking request sent!', 
                        description: 'Your appointment request has been submitted with payment.' 
                      });
                      navigate('/bookings?tab=pending');
                    } catch (err) {
                      console.error('Confirmation failed:', err);
                    }
                  }}
                >
                  I've Paid
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default DoctorProfilePage;