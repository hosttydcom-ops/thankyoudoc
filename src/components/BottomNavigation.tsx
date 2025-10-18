import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { Home, Search, Calendar, User } from "lucide-react";

interface BottomNavigationProps {
  currentPage?: string;
}

const BottomNavigation = ({ currentPage }: BottomNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine current page from location if not provided
  const activePage = currentPage || location.pathname;

  const navItems = [
    {
      id: "home",
      label: "Home",
      icon: Home,
      path: "/",
      isActive: activePage === "/" || activePage === "/search"
    },
    {
      id: "search",
      label: "Search", 
      icon: Search,
      path: "/search",
      isActive: activePage === "/search" || activePage.startsWith("/search-results")
    },
    {
      id: "bookings",
      label: "Bookings",
      icon: Calendar,
      path: "/bookings",
      isActive: activePage === "/bookings"
    },
    {
      id: "profile",
      label: "Profile",
      icon: User,
      path: "/profile",
      isActive: activePage === "/profile"
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass-effect border-t">
      <div className="grid grid-cols-4 px-2 py-2">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={`flex flex-col items-center space-y-1 h-14 transition-all duration-200 hover:bg-primary/10 hover:scale-105 ${
                item.isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-primary"
              }`}
              onClick={() => navigate(item.path)}
            >
              <IconComponent className="h-5 w-5" />
              <span className={`text-xs ${item.isActive ? "font-medium" : ""}`}>
                {item.label}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;
