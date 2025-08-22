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
    queryFn: getQueryFn,
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

  const finalUser = user || (process.env.NODE_ENV === 'development' ? developmentUser : null);
  const isAuthenticated = !!finalUser;
  const isAdmin = finalUser?.role === 'admin';

  return {
    user: finalUser,
    isLoading,
    isAuthenticated,
    isAdmin,
    error
  };
}
