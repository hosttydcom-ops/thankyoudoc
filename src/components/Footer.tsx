import { Link } from "react-router-dom";
import { Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="mt-12 border-t border-border bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Heart className="h-6 w-6 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">ThankYouDoc</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Your trusted platform to find verified doctors, book appointments, and manage your health journey with confidence.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">Quick Links</h3>
              <nav className="flex flex-col space-y-2 text-sm">
                <Link className="text-muted-foreground hover:text-primary transition-colors" to="/search">
                  Find Doctors
                </Link>
                <Link className="text-muted-foreground hover:text-primary transition-colors" to="/bookings">
                  My Bookings
                </Link>
                <Link className="text-muted-foreground hover:text-primary transition-colors" to="/feedback">
                  Feedback
                </Link>
                <Link className="text-muted-foreground hover:text-primary transition-colors" to="/profile">
                  My Profile
                </Link>
              </nav>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">Support</h3>
              <nav className="flex flex-col space-y-2 text-sm">
                <Link className="text-muted-foreground hover:text-primary transition-colors" to="/admin">
                  Admin Portal
                </Link>
                <a className="text-muted-foreground hover:text-primary transition-colors" href="#" onClick={(e) => e.preventDefault()}>
                  Help Center
                </a>
                <a className="text-muted-foreground hover:text-primary transition-colors" href="#" onClick={(e) => e.preventDefault()}>
                  Contact Us
                </a>
              </nav>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">Legal</h3>
            <nav className="flex flex-col space-y-2 text-sm">
              <a className="text-muted-foreground hover:text-primary transition-colors" href="#" onClick={(e) => e.preventDefault()}>
                Privacy Policy
              </a>
              <a className="text-muted-foreground hover:text-primary transition-colors" href="#" onClick={(e) => e.preventDefault()}>
                Terms of Service
              </a>
              <a className="text-muted-foreground hover:text-primary transition-colors" href="#" onClick={(e) => e.preventDefault()}>
                Medical Disclaimer
              </a>
            </nav>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ThankYouDoc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;