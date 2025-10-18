import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  // The main App component will now handle session processing and navigation
  // This component acts purely as a landing page for the OAuth redirect.

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <p>Processing authentication...</p>
    </div>
  );
};

export default AuthCallback;
