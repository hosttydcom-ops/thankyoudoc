import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { Stethoscope, Search, MapPin, Star, Heart, Calendar, ArrowLeft, Filter, SortAsc, Phone } from "lucide-react";
import { HYDERABAD_LOCALITIES } from "@/config/locations";
import BottomNavigation from "@/components/BottomNavigation";

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [sortBy, setSortBy] = useState("rating");
  const [filters, setFilters] = useState({
    specializations: [] as string[],
    availableToday: false,
    consultationType: 'all' as 'all' | 'online' | 'offline',
    gender: 'all' as 'all' | 'male' | 'female',
    minRating: 0,
    experienceRange: [0, 30],
    feeRange: [0, 500],
    languages: [] as string[],
    insurance: [] as string[],
    location: 'all' as 'all' | string
  });
  const navigate = useNavigate();

  // Check if this is a category search or direct access
  const categoryParam = searchParams.get("category");
  const queryParam = searchParams.get("q");
  const isDirectAccess = !categoryParam && !queryParam;

  const handleDoctorClick = (doctorId: number) => {
    navigate(`/doctor/${doctorId}`);
  };

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

  // Load doctors from Supabase
  const [allDoctors, setAllDoctors] = useState<any[]>([]);
  useEffect(() => {
    const q = (searchParams.get("q") || "").trim();
    const load = async () => {
      let query = supabase.from('doctors').select('*');

      // Server-side filtering to avoid client truncation and improve relevance
      if (q) {
        query = query.or(
          `full_name.ilike.%${q}%,specialty.ilike.%${q}%,location.ilike.%${q}%`
        );
      }

      // Raise the fetch cap to avoid truncation; consider real pagination later
      const { data, error } = await query.limit(2000);
      if (!error && data) {
        const mapped = data.map((d) => ({
          id: d.id,
          name: d.full_name,
          specialization: d.specialty,
          hospital: d.location || 'Hyderabad',
          rating: Number(d.rating || 0),
          reviews: d.total_reviews || 0,
          experience: d.experience_years || 0,
          consultationFee: Number(d.consultation_fee || 0),
          availableToday: true,
          gender: 'all',
          consultationType: 'both',
          languages: [],
          insurance: [],
          // New scraped fields
          isVerified: d.is_verified || false,
          successRate: d.success_rate || null,
          timings: d.timings_json || null,
          qualifications: d.qualifications || null,
          phone: d.phone || null,
          bio: d.bio || null,
        }));
        setAllDoctors(mapped);
      }
    };
    load();
  }, [searchParams]);

  // Keep input field in sync with URL query changes
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setSearchQuery(q);
  }, [searchParams]);

  // Locations derived from Hyderabad localities with dynamic doctor locations merged in
  const locations = (() => {
    const dynamic = Array.from(new Set(allDoctors.map(d => d.hospital))).filter(Boolean);
    const base = HYDERABAD_LOCALITIES;
    return Array.from(new Set([...(base || []), ...dynamic]));
  })();


  // Apply filters and sorting
  const applyFiltersAndSort = (doctors: any[]) => {
    let filtered = doctors.filter(doctor => {
      if (filters.specializations.length > 0 && !filters.specializations.includes(doctor.specialization)) return false;
      if (filters.availableToday && !doctor.availableToday) return false;
      if (filters.consultationType !== 'all' && doctor.consultationType !== 'both' && doctor.consultationType !== filters.consultationType) return false;
      if (filters.gender !== 'all' && doctor.gender !== filters.gender) return false;
      if (doctor.rating < filters.minRating) return false;
      if (doctor.experience < filters.experienceRange[0] || doctor.experience > filters.experienceRange[1]) return false;
      if (doctor.consultationFee < filters.feeRange[0] || doctor.consultationFee > filters.feeRange[1]) return false;
      if (filters.languages.length > 0 && !filters.languages.some(lang => doctor.languages.includes(lang))) return false;
      if (filters.insurance.length > 0 && !filters.insurance.some(ins => doctor.insurance.includes(ins))) return false;
      if (filters.location !== 'all' && doctor.hospital !== filters.location) return false;
      return true;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating': return b.rating - a.rating;
        case 'experience': return b.experience - a.experience;
        case 'fee-low': return a.consultationFee - b.consultationFee;
        case 'fee-high': return b.consultationFee - a.consultationFee;
        case 'reviews': return b.reviews - a.reviews;
        case 'name': return a.name.localeCompare(b.name);
        default: return b.rating - a.rating;
      }
    });
    return filtered;
  };

  // Build result sections
  let matchingDoctors: any[] = [];
  let topRatedDoctors: any[] = [];
  let sectionTitle = "Top Rated Doctors";

  if (queryParam) {
    const q = queryParam.toLowerCase();
    sectionTitle = "Matching Doctors";
    matchingDoctors = allDoctors.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.specialization.toLowerCase().includes(q) ||
      d.hospital.toLowerCase().includes(q)
    );
    topRatedDoctors = allDoctors
      .filter(d => !(
        d.name.toLowerCase().includes(q) ||
        d.specialization.toLowerCase().includes(q) ||
        d.hospital.toLowerCase().includes(q)
      ))
      .sort((a, b) => b.rating - a.rating);
  } else if (categoryParam) {
    const c = categoryParam.toLowerCase();
    sectionTitle = `${categoryParam} Doctors`;
    matchingDoctors = allDoctors.filter(d => d.specialization.toLowerCase().includes(c));
    topRatedDoctors = allDoctors
      .filter(d => !d.specialization.toLowerCase().includes(c))
      .sort((a, b) => b.rating - a.rating);
  } else {
    // Direct access: only show top rated
    matchingDoctors = [];
    topRatedDoctors = [...allDoctors].sort((a, b) => b.rating - a.rating);
  }

  const specializations = [...new Set(allDoctors.map(d => d.specialization))];
  const languages = [...new Set(allDoctors.flatMap(d => d.languages))];
  const insuranceOptions = [...new Set(allDoctors.flatMap(d => d.insurance))];

  // Apply final filters and sorting
  const visibleMatchingDoctors = applyFiltersAndSort(matchingDoctors);
  const visibleTopRatedDoctors = applyFiltersAndSort(topRatedDoctors);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 glass-effect border-b">
        <div className="px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-10 w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search doctors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10 h-10 medical-input rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pb-20 px-4 py-4 space-y-6">
        {/* Top-right Filters Bar */}
        <div className="flex items-center justify-between">
          <div></div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-sm text-muted-foreground">Filter by Location</div>
            <Select
              value={filters.location}
              onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}
            >
              <SelectTrigger className="w-44 medical-input">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filter by Location" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Matching Section (name/category) */}
        {(!isDirectAccess && visibleMatchingDoctors.length > 0) && (
          <div className="space-y-3">
            <div>
              <h2 className="text-xl font-bold text-foreground">{sectionTitle}</h2>
              <p className="text-sm text-muted-foreground">Found {visibleMatchingDoctors.length} doctors</p>
            </div>
            <div className="space-y-3">
              {visibleMatchingDoctors.map((doctor) => (
                <Card key={doctor.id} className="medical-card cursor-pointer" onClick={() => handleDoctorClick(doctor.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <Stethoscope className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-foreground">{doctor.name}</h4>
                              {doctor.isVerified && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  ✓ Verified
                                </Badge>
                              )}
                            </div>
                            <Badge variant="secondary" className="mt-1 text-xs">{doctor.specialization}</Badge>
                            {doctor.qualifications && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {doctor.qualifications}
                              </div>
                            )}
                            <div className="flex items-center space-x-1 mt-2 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{doctor.hospital}</span>
                            </div>
                            <div className="flex items-center space-x-1 mt-1 text-xs text-muted-foreground">
                              <span>{doctor.experience} years exp</span>
                              <span>•</span>
                              <span>{doctor.reviews} reviews</span>
                              {doctor.successRate && (
                                <>
                                  <span>•</span>
                                  <span className="text-green-600 font-medium">{doctor.successRate} success</span>
                                </>
                              )}
                            </div>
                            {doctor.timings && doctor.timings.working_hours && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {doctor.timings.working_hours.slice(0, 2).join(' | ')}
                              </div>
                            )}
                            {doctor.phone && (
                              <div className="flex items-center space-x-1 mt-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{doctor.phone}</span>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs font-medium">{doctor.rating}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">₹{doctor.consultationFee}</p>
                            <Button variant="outline" size="sm" className="h-8 px-3 text-xs mt-2">
                              <Calendar className="h-3 w-3 mr-1" />Book
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Top Rated Section (always shown) */}
        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">Top Rated Doctors</h2>
            {isDirectAccess && (
              <p className="text-sm text-muted-foreground">Showing {visibleTopRatedDoctors.length} doctors</p>
            )}
          </div>
          <div className="space-y-3">
            {visibleTopRatedDoctors.map((doctor) => (
              <Card key={doctor.id} className="medical-card cursor-pointer" onClick={() => handleDoctorClick(doctor.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <Stethoscope className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-foreground">{doctor.name}</h4>
                            {doctor.isVerified && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                ✓ Verified
                              </Badge>
                            )}
                          </div>
                          <Badge variant="secondary" className="mt-1 text-xs">{doctor.specialization}</Badge>
                          {doctor.qualifications && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {doctor.qualifications}
                            </div>
                          )}
                          <div className="flex items-center space-x-1 mt-2 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{doctor.hospital}</span>
                          </div>
                          <div className="flex items-center space-x-1 mt-1 text-xs text-muted-foreground">
                            <span>{doctor.experience} years exp</span>
                            <span>•</span>
                            <span>{doctor.reviews} reviews</span>
                            {doctor.successRate && (
                              <>
                                <span>•</span>
                                <span className="text-green-600 font-medium">{doctor.successRate} success</span>
                              </>
                            )}
                          </div>
                          {doctor.timings && doctor.timings.working_hours && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {doctor.timings.working_hours.slice(0, 2).join(' | ')}
                            </div>
                          )}
                          {doctor.phone && (
                            <div className="flex items-center space-x-1 mt-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{doctor.phone}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-medium">{doctor.rating}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">₹{doctor.consultationFee}</p>
                          <Button variant="outline" size="sm" className="h-8 px-3 text-xs mt-2">
                            <Calendar className="h-3 w-3 mr-1" />Book
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation currentPage="search" />
    </div>
  );
};

export default SearchResultsPage;