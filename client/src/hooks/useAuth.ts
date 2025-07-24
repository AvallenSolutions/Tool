import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  // Temporary bypass for development to test GreenwashGuardian
  // TODO: Fix auth endpoint routing issue
  return {
    user: {
      id: "dev-user",
      email: "demo@avallen.com",
      firstName: "Demo",
      lastName: "User"
    },
    isLoading: false,
    isAuthenticated: true,
  };
}
