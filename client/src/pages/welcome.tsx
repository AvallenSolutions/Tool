import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import avallenLogo from "@assets/White Background-Winner-Avallen Solutions_1755804696792.jpg";

export default function Welcome() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  
  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['/api/companies'],
    queryFn: getQueryFn,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (authLoading || companyLoading) return;

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (!company) {
      // No company exists, go to onboarding
      navigate("/app/onboarding");
    } else if (!company.onboardingComplete) {
      // Company exists but onboarding not complete
      navigate("/app/onboarding");
    } else {
      // Everything is set up, go to dashboard
      navigate("/app/dashboard");
    }
  }, [authLoading, companyLoading, isAuthenticated, company, navigate]);

  if (authLoading || companyLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lightest-gray via-white to-green-500/5 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img 
              src={avallenLogo} 
              alt="Avallen Solutions" 
              className="h-16 w-auto"
            />
          </div>
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-500" />
          <h2 className="text-xl font-semibold text-slate-gray mb-2">Setting up your account...</h2>
          <p className="text-gray-600">This should only take a moment.</p>
        </div>
      </div>
    );
  }

  return null;
}