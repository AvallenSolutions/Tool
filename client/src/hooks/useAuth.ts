import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string;
  role: 'user' | 'admin';
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Development fallback when user query fails
  const developmentUser = {
    id: "44886248",
    email: "tim@avallen.solutions",
    firstName: "Tim",
    lastName: "Admin",
    profileImageUrl: "",
    role: "admin" as const
  };

  // Always use development user in development mode for admin access
  const finalUser = import.meta.env.MODE === 'development' ? developmentUser : user;
  const isAuthenticated = !!finalUser;
  const isAdmin = finalUser?.role === 'admin';
  
  console.log('🔐 Auth Debug:', { 
    mode: import.meta.env.MODE, 
    hasUser: !!user, 
    finalUser: finalUser?.email, 
    isAdmin, 
    error: error?.message 
  });

  return {
    user: finalUser,
    isLoading,
    isAuthenticated,
    isAdmin,
    error
  };
}
