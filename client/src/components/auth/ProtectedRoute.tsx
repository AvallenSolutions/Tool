import { useAuthContext } from './AuthProvider';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isInitialized } = useAuthContext();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isInitialized && requireAuth && !isAuthenticated && !isLoading) {
      navigate(redirectTo);
    }
  }, [isInitialized, requireAuth, isAuthenticated, isLoading, navigate, redirectTo]);

  // Still loading authentication status
  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lightest-gray via-white to-avallen-green/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-avallen-green" />
          <h2 className="text-xl font-semibold text-slate-gray mb-2">Verifying access...</h2>
          <p className="text-gray-600">Please wait while we check your permissions.</p>
        </div>
      </div>
    );
  }

  // Authentication required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lightest-gray via-white to-avallen-green/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-gray">
              Authentication Required
            </CardTitle>
            <CardDescription>
              You need to be logged in to access this page
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => navigate('/login')}
              className="bg-avallen-green hover:bg-avallen-green-light text-white"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is authenticated or authentication is not required
  return <>{children}</>;
}