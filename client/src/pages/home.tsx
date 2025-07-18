import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

export default function Home() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: company } = useQuery({
    queryKey: ["/api/company"],
    retry: false,
  });

  useEffect(() => {
    if (user && company !== undefined) {
      if (!company) {
        navigate("/app/onboarding");
      } else if (!company.onboardingComplete) {
        navigate("/app/onboarding");
      } else {
        // Company is complete, go to dashboard
        navigate("/app/dashboard");
      }
    }
  }, [user, company, navigate]);

  return (
    <div className="min-h-screen bg-lightest-gray flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-avallen-green border-t-transparent rounded-full" />
    </div>
  );
}
