import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuthContext();
  const [, navigate] = useLocation();
  
  const { data: company, isLoading: companyLoading, error } = useQuery({
    queryKey: ['/api/companies'],
    queryFn: getQueryFn,
    enabled: isAuthenticated,
    retry: 1,
  });

  useEffect(() => {
    if (authLoading || companyLoading) return;

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // If company query fails, we might need to create one during onboarding
    if (error && !company) {
      // Allow onboarding to proceed - it will handle company creation
      return;
    }

    if (company && company.onboardingComplete) {
      // Onboarding is complete, redirect to dashboard
      navigate('/app/dashboard');
      return;
    }

    // Either no company exists or onboarding is incomplete - stay on onboarding
  }, [authLoading, companyLoading, isAuthenticated, company, error, navigate]);

  if (authLoading || companyLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lightest-gray via-white to-avallen-green/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-avallen-green" />
          <h2 className="text-xl font-semibold text-slate-gray mb-2">Loading your profile...</h2>
          <p className="text-gray-600">We're checking your onboarding status.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}