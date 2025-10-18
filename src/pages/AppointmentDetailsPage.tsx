import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Video,
  Phone,
  MessageSquare,
  Star,
  Mic,
  Send,
  User,
  Stethoscope
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AppointmentDetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'upcoming';
  
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  // Mock appointment data based on ID and type
  const getAppointmentData = () => {
    const appointments = {
      pending: {
        1: {
          id: 1,
          doctorName: "Dr. Sarah Johnson",
          specialization: "Cardiologist",
          date: "2024-01-20",
          time: "10:30 AM",
          type: "online",
          status: "pending",
          location: "Video Call",
          avatar: "/placeholder.svg",
          bookingDate: "2024-01-10",
          fees: "₹150",
          duration: "30 minutes",
          notes: "Regular checkup and consultation",
          phone: "+1 (555) 123-4567"
        }
      },
      upcoming: {
        3: {
          id: 3,
          doctorName: "Dr. Emily Rodriguez", 
          specialization: "Pediatrician",
          date: "2024-01-25",
          time: "11:00 AM",
          type: "online",
          status: "confirmed",
          location: "Video Call",
          avatar: "/placeholder.svg",
          fees: "₹120",
          duration: "45 minutes", 
          notes: "Child wellness checkup",
          phone: "+1 (555) 987-6543"
        }
      },
      past: {
        4: {
          id: 4,
          doctorName: "Dr. David Kim",
          specialization: "Dermatologist", 
          date: "2024-01-05",
          time: "3:30 PM",
          type: "offline",
          status: "completed",
          location: "Skin & Wellness Clinic",
          avatar: "/placeholder.svg",
          fees: "₹200",
          duration: "30 minutes",
          notes: "Skin condition treatment",
          phone: "+1 (555) 456-7890"
        }
      }
    };
    return appointments[type as keyof typeof appointments]?.[Number(id) as keyof typeof appointments.pending] || null;
  };

  const appointment = getAppointmentData();

  if (!appointment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Appointment not found</h2>
          <Button onClick={() => navigate('/bookings')}>Back to Bookings</Button>
        </div>
      </div>
    );
  }

  const handleJoinCall = () => {
    const whatsappUrl = `https://wa.me/${appointment.phone.replace(/[^\d]/g, '')}?text=Hi Dr. ${appointment.doctorName}, I'm ready for my appointment scheduled at ${appointment.time} today.`;
    window.open(whatsappUrl, '_blank');
  };

  const handleGetDirections = () => {
    const mapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(appointment.location)}`;
    window.open(mapsUrl, '_blank');
  };

  const handleSubmitReview = () => {
    if (rating === 0) {
      toast({ title: "Error", description: "Please select a rating" });
      return;
    }
    
    toast({ 
      title: "Review submitted", 
      description: "Thank you for your feedback!" 
    });
    setFeedback("");
    setRating(0);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      toast({ title: "Recording started", description: "Speak your feedback" });
      setTimeout(() => {
        setIsRecording(false);
        toast({ title: "Recording stopped", description: "Voice message saved" });
      }, 3000);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
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
                onClick={() => navigate("/bookings")}
                className="h-10 w-10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-foreground">Appointment Details</h1>
                <p className="text-xs text-muted-foreground capitalize">{type} appointment</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Doctor Info Card */}
        <Card className="medical-card">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
                <Stethoscope className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{appointment.doctorName}</h3>
                    <Badge variant="secondary" className="mt-1">{appointment.specialization}</Badge>
                  </div>
                  <Badge className={`${
                    appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    appointment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {appointment.status}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointment Details */}
        <Card className="medical-card">
          <CardHeader>
            <CardTitle>Appointment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">{formatDate(appointment.date)}</p>
                <p className="text-sm text-muted-foreground">Date</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">{appointment.time}</p>
                <p className="text-sm text-muted-foreground">Time ({appointment.duration})</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center space-x-3">
              {appointment.type === "online" ? (
                <Video className="h-5 w-5 text-primary" />
              ) : (
                <MapPin className="h-5 w-5 text-primary" />
              )}
              <div>
                <p className="font-medium text-foreground">{appointment.location}</p>
                <p className="text-sm text-muted-foreground">
                  {appointment.type === "online" ? "Online consultation" : "In-person visit"}
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">{appointment.fees}</p>
                <p className="text-sm text-muted-foreground">Consultation fee</p>
              </div>
            </div>
            
            {appointment.notes && (
              <>
                <Separator />
                <div>
                  <p className="font-medium text-foreground mb-1">Notes</p>
                  <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {type === 'upcoming' && (
          <div className="space-y-3">
            {appointment.type === "online" ? (
              <Button 
                onClick={handleJoinCall}
                className="w-full h-12 rounded-xl medical-button-primary"
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                Join Call via WhatsApp
              </Button>
            ) : (
              <Button 
                onClick={handleGetDirections}
                className="w-full h-12 rounded-xl medical-button-primary"
              >
                <MapPin className="h-5 w-5 mr-2" />
                Get Directions
              </Button>
            )}
          </div>
        )}

        {/* Rate Doctor (Past appointments only) */}
        {type === 'past' && (
          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Rate Your Experience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Star Rating */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Rating</Label>
                <div className="flex space-x-2">
                  {Array.from({ length: 5 }, (_, index) => (
                    <button
                      key={index}
                      onClick={() => setRating(index + 1)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          index < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Written Feedback */}
              <div>
                <Label htmlFor="feedback" className="text-sm font-medium mb-2 block">
                  Written Feedback
                </Label>
                <Textarea
                  id="feedback"
                  placeholder="Share your experience with Dr. Johnson..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  className="rounded-xl"
                />
              </div>

              {/* Voice Message */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Voice Message (Optional)</Label>
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  onClick={toggleRecording}
                  className="w-full h-12 rounded-xl"
                >
                  <Mic className={`h-5 w-5 mr-2 ${isRecording ? 'animate-pulse' : ''}`} />
                  {isRecording ? 'Recording...' : 'Record Voice Message'}
                </Button>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmitReview}
                className="w-full h-12 rounded-xl medical-button-primary"
                disabled={rating === 0}
              >
                <Send className="h-5 w-5 mr-2" />
                Submit Review
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AppointmentDetailsPage;