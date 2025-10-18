import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { 
  Heart, 
  Star, 
  Clock, 
  Calendar,
  MapPin,
  CheckCircle,
  XCircle,
  User,
  LogOut
} from "lucide-react";

const UserDashboard = () => {
  const navigate = useNavigate();
  const [feedbackModal, setFeedbackModal] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [showPostConsultationPopup, setShowPostConsultationPopup] = useState(false);
  const [appointments, setAppointments] = useState({
    pending: [
      {
        id: 1,
        doctor: "Dr. Sarah Johnson",
        specialization: "Cardiologist",
        date: "2024-01-20",
        time: "10:00 AM",
        type: "Online",
        status: "pending"
      },
      {
        id: 2,
        doctor: "Dr. Michael Chen",
        specialization: "Neurologist", 
        date: "2024-01-22",
        time: "2:30 PM",
        type: "Offline",
        status: "pending"
      }
    ],
    confirmed: [
      {
        id: 3,
        doctor: "Dr. Emily Rodriguez",
        specialization: "Pediatrician",
        date: "2024-01-25",
        time: "11:00 AM",
        type: "Online",
        status: "confirmed"
      }
    ],
    cancelled: [
      {
        id: 4,
        doctor: "Dr. James Wilson",
        specialization: "Dermatologist",
        date: "2024-01-15",
        time: "3:00 PM",
        type: "Offline",
        status: "cancelled",
        reason: "Doctor unavailable due to emergency"
      }
    ],
    completed: [
      {
        id: 5,
        doctor: "Dr. Lisa Thompson",
        specialization: "Orthopedist",
        date: "2024-01-18",
        time: "9:00 AM",
        type: "Offline",
        status: "completed",
        hasReview: true
      },
      {
        id: 6,
        doctor: "Dr. Ahmed Hassan",
        specialization: "Cardiologist",
        date: "2024-01-19",
        time: "4:00 PM",
        type: "Online",
        status: "completed",
        hasReview: false,
        showFeedbackPrompt: true // Recently completed, show popup
      }
    ]
  });

  // Mock user data
  const user = {
    name: "John Doe",
    email: "john@example.com",
    phone: "+1 (555) 123-4567"
  };

  useEffect(() => {
    // Show post-consultation feedback popup for recently completed appointments
    const recentlyCompleted = appointments.completed.find(apt => 
      apt.status === "completed" && 
      apt.showFeedbackPrompt && 
      !apt.hasReview
    );
    
    if (recentlyCompleted) {
      const timer = setTimeout(() => {
        setShowPostConsultationPopup(true);
        setFeedbackModal(recentlyCompleted);
      }, 2000); // Show popup 2 seconds after page load
      
      return () => clearTimeout(timer);
    }
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-500", text: "Pending", icon: Clock },
      confirmed: { color: "bg-green-500", text: "Confirmed", icon: CheckCircle },
      cancelled: { color: "bg-red-500", text: "Cancelled", icon: XCircle },
      completed: { color: "bg-blue-500", text: "Completed", icon: CheckCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;
    
    return (
      <Badge className={`${config.color} text-white flex items-center space-x-1`}>
        <IconComponent className="h-3 w-3" />
        <span>{config.text}</span>
      </Badge>
    );
  };

  const handleFeedback = (appointment: any) => {
    setFeedbackModal(appointment);
    setRating(5);
    setReview("");
    setShowPostConsultationPopup(false);
  };

  const submitFeedback = () => {
    console.log("Feedback submitted:", { 
      appointmentId: feedbackModal.id,
      doctor: feedbackModal.doctor,
      rating, 
      review 
    });

    // Update appointment to mark as reviewed
    setAppointments(prev => ({
      ...prev,
      completed: prev.completed.map(apt => 
        apt.id === feedbackModal.id 
          ? { ...apt, hasReview: true, showFeedbackPrompt: false }
          : apt
      )
    }));

    setFeedbackModal(null);
    setRating(5);
    setReview("");
    setShowPostConsultationPopup(false);

    toast({
      title: "Thank you for your feedback!",
      description: "Your review has been submitted successfully."
    });
  };

  const renderStars = (rating: number, interactive = false, onRate?: (rate: number) => void) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        } ${interactive ? "cursor-pointer hover:text-yellow-400" : ""}`}
        onClick={() => interactive && onRate && onRate(index + 1)}
      />
    ));
  };

  const AppointmentCard = ({ appointment, showReason = false, showFeedback = false }: any) => (
    <Card className="medical-card">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h4 className="font-semibold text-foreground">{appointment.doctor}</h4>
            <p className="text-sm text-muted-foreground">{appointment.specialization}</p>
          </div>
          {getStatusBadge(appointment.status)}
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{appointment.date}</span>
            <Clock className="h-4 w-4 ml-2" />
            <span>{appointment.time}</span>
          </div>
          <div className="flex items-center space-x-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{appointment.type} Consultation</span>
          </div>
        </div>

        {showReason && appointment.reason && (
          <div className="mt-3 p-3 bg-destructive/10 rounded-md">
            <p className="text-sm text-destructive-foreground">
              <strong>Reason:</strong> {appointment.reason}
            </p>
          </div>
        )}

        {showFeedback && !appointment.hasReview && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={() => handleFeedback(appointment)}
          >
            <Star className="h-4 w-4 mr-1" />
            Write Review
          </Button>
        )}

        {showFeedback && appointment.hasReview && (
          <div className="mt-3 text-center">
            <Badge variant="secondary" className="bg-success/20 text-success-foreground">
              <CheckCircle className="h-3 w-3 mr-1" />
              Review Submitted
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Heart className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-primary">ThankYouDoc</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => navigate("/search")}>
                Find Doctors
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Welcome Section */}
        <Card className="medical-card mb-8 animate-fade-in">
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Welcome back, {user.name}!</h2>
              <p className="text-muted-foreground">Manage your appointments and health journey</p>
            </div>
          </CardContent>
        </Card>

        {/* Appointments Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending" className="text-sm">
              Pending ({appointments.pending.length})
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="text-sm">
              Confirmed ({appointments.confirmed.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-sm">
              Completed ({appointments.completed.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="text-sm">
              Cancelled ({appointments.cancelled.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {appointments.pending.length > 0 ? (
              appointments.pending.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))
            ) : (
              <Card className="medical-card">
                <CardContent className="p-6 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending appointments</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="confirmed" className="space-y-4">
            {appointments.confirmed.length > 0 ? (
              appointments.confirmed.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))
            ) : (
              <Card className="medical-card">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No confirmed appointments</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {appointments.completed.length > 0 ? (
              appointments.completed.map((appointment) => (
                <AppointmentCard 
                  key={appointment.id} 
                  appointment={appointment} 
                  showFeedback={true}
                />
              ))
            ) : (
              <Card className="medical-card">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No completed appointments</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4">
            {appointments.cancelled.length > 0 ? (
              appointments.cancelled.map((appointment) => (
                <AppointmentCard 
                  key={appointment.id} 
                  appointment={appointment} 
                  showReason={true}
                />
              ))
            ) : (
              <Card className="medical-card">
                <CardContent className="p-6 text-center">
                  <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No cancelled appointments</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card className="medical-card mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-12"
              onClick={() => navigate("/search")}
            >
              <Heart className="h-4 w-4 mr-2" />
              Book New Appointment
            </Button>
            <Button 
              variant="outline" 
              className="h-12"
              onClick={() => navigate("/profile")}
            >
              <User className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </CardContent>
        </Card>

        {/* Post-Consultation Feedback Modal */}
        <Dialog open={!!feedbackModal} onOpenChange={(open) => {
          if (!open) {
            setFeedbackModal(null);
            setRating(5);
            setReview("");
            setShowPostConsultationPopup(false);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-primary" />
                <span>
                  {showPostConsultationPopup ? "How was your consultation?" : "Write Review"}
                </span>
              </DialogTitle>
            </DialogHeader>
            {feedbackModal && (
              <div className="space-y-4">
                {showPostConsultationPopup && (
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <Heart className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Your consultation with {feedbackModal.doctor} has been completed.
                      Please share your experience to help other patients.
                    </p>
                  </div>
                )}
                
                <div className="text-center">
                  <p className="text-sm font-medium mb-2">Rate your experience</p>
                  <div className="text-center space-y-2">
                    <div className="flex justify-center space-x-1">
                      {renderStars(rating, true, setRating)}
                    </div>
                    {rating > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {rating === 1 ? "Poor" : rating === 2 ? "Fair" : rating === 3 ? "Good" : rating === 4 ? "Very Good" : "Excellent"}
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm">Write your review (optional)</Label>
                  <Textarea
                    placeholder="Share your experience with the doctor..."
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={submitFeedback}
                    disabled={rating === 0}
                    className="flex-1"
                  >
                    Submit Review
                  </Button>
                  {showPostConsultationPopup && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setFeedbackModal(null);
                        setShowPostConsultationPopup(false);
                        setRating(5);
                        setReview("");
                      }}
                      className="flex-1"
                    >
                      Maybe Later
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default UserDashboard;