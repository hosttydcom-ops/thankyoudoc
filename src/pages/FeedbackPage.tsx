import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Star, Heart, ThumbsUp, MessageSquare, TrendingUp, Calendar, User, ChevronDown, ChevronUp, Search, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const FeedbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const doctorName = searchParams.get("doctor") || "";
  const appointmentId = searchParams.get("appointmentId") || "";
  
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState<Set<number>>(new Set());
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [doctorSearchOpen, setDoctorSearchOpen] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [userReviews, setUserReviews] = useState<any[]>([]);

  // Fetch doctors for search
  useEffect(() => {
    const fetchDoctors = async () => {
      const { data, error } = await supabase
        .from('doctors')
        .select('id, full_name, specialty, rating')
        .limit(20);
      
      if (!error && data) {
        setDoctors(data);
      }
    };
    fetchDoctors();
  }, []);

  // Fetch user's reviews (mock for now - will need authentication)
  useEffect(() => {
    // TODO: Replace with real user reviews from database when auth is implemented
    setUserReviews([
      {
        id: 1,
        doctor: "Dr. Sarah Johnson",
        rating: 5,
        review: "Excellent doctor! Very thorough examination and clear explanation of my condition. She took time to answer all my questions and provided a comprehensive treatment plan.",
        date: "2024-01-15",
        category: "Consultation Quality"
      },
      {
        id: 2,
        doctor: "Dr. Michael Chen",
        rating: 4,
        review: "Professional service, good treatment plan. The appointment was on time and the staff was courteous.",
        date: "2024-01-10",
        category: "Treatment Effectiveness"
      }
    ]);
  }, []);

  // Mock user feedback history - updated to use state
  const userFeedbackHistory = {
    given: userReviews,
    pending: [
      {
        id: 3,
        doctorId: "1", // Add doctorId for navigation
        doctor: "Dr. Emily Rodriguez",
        appointmentDate: "2024-01-20",
        type: "Follow-up Consultation"
      },
      {
        id: 4,
        doctorId: "4", // Add doctorId for navigation  
        doctor: "Dr. James Wilson",
        appointmentDate: "2024-01-18",
        type: "Initial Consultation"
      }
    ]
  };

  const feedbackCategories = [
    { name: "Consultation Quality", count: 12, color: "bg-blue-100 text-blue-800" },
    { name: "Treatment Effectiveness", count: 8, color: "bg-green-100 text-green-800" },
    { name: "Staff Behavior", count: 15, color: "bg-purple-100 text-purple-800" },
    { name: "Facility & Hygiene", count: 6, color: "bg-yellow-100 text-yellow-800" },
    { name: "Wait Time", count: 10, color: "bg-red-100 text-red-800" },
    { name: "Overall Experience", count: 20, color: "bg-indigo-100 text-indigo-800" }
  ];

  const handleStarClick = (starRating: number) => {
    setRating(starRating);
  };

  const handleSubmit = async () => {
    const currentDoctor = selectedDoctor || (doctorName ? { full_name: doctorName } : null);
    
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating before submitting.",
        variant: "destructive"
      });
      return;
    }

    if (!currentDoctor) {
      toast({
        title: "Doctor Required",
        description: "Please select a doctor to review.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // TODO: Replace with actual user ID when authentication is implemented
      const { error } = await supabase
        .from('doctor_reviews')
        .insert({
          doctor_id: selectedDoctor?.id || 'demo-doctor-id',
          rating,
          comment: review,
          user_id: 'demo-user-id' // Replace with actual user ID
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Thank you for your feedback!",
        description: "Your review has been submitted successfully."
      });

      // Reset form
      setRating(0);
      setReview("");
      setSelectedDoctor(null);
      
      // Refresh reviews
      // TODO: Refetch user reviews from database
      
    } catch (error) {
      console.error('Error submitting review:', error);
      // Fallback: Save locally so the UI is functional without auth
      setUserReviews(prev => [
        ...prev,
        {
          id: Date.now(),
          doctor: selectedDoctor?.full_name || doctorName,
          rating,
          review,
          date: new Date().toISOString().slice(0,10),
          category: "Overall Experience"
        }
      ]);
      toast({
        title: "Saved locally",
        description: "Review stored locally (sign in to sync to your account).",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (currentRating: number, interactive = false) => {
    return Array.from({ length: 5 }, (_, index) => (
      <button
        key={index}
        onClick={() => interactive && handleStarClick(index + 1)}
        className={`transition-colors ${interactive ? 'hover:scale-110 focus:outline-none' : ''}`}
        disabled={!interactive}
      >
        <Star
          className={`h-4 w-4 ${
            index < currentRating 
              ? "fill-yellow-400 text-yellow-400" 
              : "text-gray-300"
          }`}
        />
      </button>
    ));
  };

  const toggleReviewExpansion = (reviewId: number) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId);
    } else {
      newExpanded.add(reviewId);
    }
    setExpandedReviews(newExpanded);
  };

  const handlePendingFeedback = (appointment: any) => {
    // Navigate to doctor profile page with reviews section open
    navigate(`/doctor/${appointment.doctorId}/reviews#write`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 glass-effect border-b">
        <div className="px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/")}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <Heart className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg font-bold text-foreground">Feedback Center</h1>
                <p className="text-xs text-muted-foreground">Share your experience</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-4xl mx-auto">
        <Tabs defaultValue={doctorName ? "write" : "overview"} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="write">Write Review</TabsTrigger>
            <TabsTrigger value="history">My Reviews</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span>Feedback Statistics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{userFeedbackHistory.given.length}</p>
                    <p className="text-sm text-muted-foreground">Reviews Given</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-100 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{userFeedbackHistory.pending.length}</p>
                    <p className="text-sm text-muted-foreground">Pending Reviews</p>
                  </div>
                  <div className="text-center p-4 bg-green-100 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">4.5</p>
                    <p className="text-sm text-muted-foreground">Avg Rating Given</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="medical-card">
              <CardHeader>
                <CardTitle>Feedback Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {feedbackCategories.map((category) => (
                    <div key={category.name} className={`p-3 rounded-lg ${category.color}`}>
                      <h4 className="font-medium text-sm">{category.name}</h4>
                      <p className="text-xs opacity-80">{category.count} reviews</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Write Review Tab */}
          <TabsContent value="write" className="space-y-6">
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ThumbsUp className="h-5 w-5 text-primary" />
                  <span>Write a Review</span>
                </CardTitle>
                {doctorName && (
                  <p className="text-sm text-muted-foreground">
                    Share your experience with {doctorName}
                  </p>
                )}
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Doctor Selection */}
                {!doctorName && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Select Doctor</label>
                    <Popover open={doctorSearchOpen} onOpenChange={setDoctorSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={doctorSearchOpen}
                          className="w-full justify-between"
                        >
                          {selectedDoctor ? selectedDoctor.full_name : "Search and select doctor..."}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search doctors..." />
                          <CommandList>
                            <CommandEmpty>No doctor found.</CommandEmpty>
                            <CommandGroup>
                              {doctors.map((doctor) => (
                                <CommandItem
                                  key={doctor.id}
                                  value={doctor.full_name}
                                  onSelect={() => {
                                    setSelectedDoctor(doctor);
                                    setDoctorSearchOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedDoctor?.id === doctor.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">{doctor.full_name}</div>
                                    <div className="text-sm text-muted-foreground">{doctor.specialty}</div>
                                  </div>
                                  {doctor.rating && (
                                    <div className="flex items-center text-xs text-muted-foreground">
                                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                                      {doctor.rating}
                                    </div>
                                  )}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {doctorName && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">Writing review for:</p>
                    <p className="text-primary font-semibold">{doctorName}</p>
                  </div>
                )}

                {/* Rating Section */}
                <div className="text-center space-y-4">
                  <div className="flex justify-center space-x-2">
                    {renderStars(rating, true)}
                  </div>
                  {rating > 0 && (
                    <p className="text-sm text-muted-foreground">
                      You rated {rating} out of 5 stars
                    </p>
                  )}
                </div>

                {/* Review Section */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">
                    Write your review (optional)
                  </label>
                  <Textarea
                    placeholder="Share details about your experience, the doctor's expertise, consultation quality, etc..."
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    className="min-h-32 medical-input"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {review.length}/500 characters
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={rating === 0 || isSubmitting || (!doctorName && !selectedDoctor)}
                  className="w-full medical-button-primary"
                >
                  {isSubmitting ? "Submitting..." : "Submit Review"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <span>My Reviews ({userFeedbackHistory.given.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {userFeedbackHistory.given.map((feedback) => {
                  const isExpanded = expandedReviews.has(feedback.id);
                  const reviewPreview = feedback.review.length > 100 
                    ? feedback.review.substring(0, 100) + "..." 
                    : feedback.review;
                    
                  return (
                    <div 
                      key={feedback.id} 
                      className="border rounded-lg p-4 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleReviewExpansion(feedback.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{feedback.doctor}</h4>
                            {feedback.review.length > 100 && (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="flex">{renderStars(feedback.rating)}</div>
                            <Badge variant="outline" className="text-xs">
                              {feedback.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {feedback.date}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {isExpanded ? feedback.review : reviewPreview}
                      </p>
                      {feedback.review.length > 100 && (
                        <p className="text-xs text-primary">
                          Click to {isExpanded ? 'collapse' : 'read more'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Tab */}
          <TabsContent value="pending" className="space-y-6">
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span>Pending Reviews ({userFeedbackHistory.pending.length})</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Complete your feedback for recent appointments
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {userFeedbackHistory.pending.map((appointment) => (
                  <div key={appointment.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold">{appointment.doctor}</h4>
                        <p className="text-sm text-muted-foreground">{appointment.type}</p>
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {appointment.appointmentDate}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handlePendingFeedback(appointment)}
                        className="flex items-center space-x-1"
                      >
                        <Star className="h-3 w-3" />
                        <span>Write Review</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Additional Info */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Your feedback helps other patients make informed decisions
          </p>
          <p className="text-xs text-muted-foreground">
            Reviews are posted with your name and help improve our services
          </p>
        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;