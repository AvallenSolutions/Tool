import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  isInitialized: boolean;
  isAuthenticated: boolean;
  user: any;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const { user, isLoading, isAuthenticated, error } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    // Mark as initialized once auth check is complete
    if (!isLoading) {
      setIsInitialized(true);
    }
  }, [isLoading]);

  // Handle authentication errors
  useEffect(() => {
    if (error && !isLoading && isInitialized) {
      // If there's an auth error and we're not in development mode
      if (process.env.NODE_ENV !== 'development') {
        navigate('/login');
      }
    }
  }, [error, isLoading, isInitialized, navigate]);

  const value = {
    isInitialized,
    isAuthenticated,
    user,
    isLoading,
  };

  // Show loading screen during initial auth check
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lightest-gray via-white to-avallen-green/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-avallen-green" />
          <h2 className="text-xl font-semibold text-slate-gray mb-2">Initializing your session...</h2>
          <p className="text-gray-600">Please wait while we verify your authentication.</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}