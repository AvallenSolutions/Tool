import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import ProductsSection from "@/components/dashboard/products-section";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

export default function Products() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-lightest-gray flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-avallen-green border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header 
          title="Products" 
          subtitle="Manage your product catalog and track individual footprints" 
        />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="mb-6 p-4 bg-gradient-to-r from-avallen-green/10 to-avallen-green/5 border border-avallen-green/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-gray mb-2">Enhanced Product Data Collection</h3>
                <p className="text-sm text-gray-600">
                  Collect 10x more detailed environmental data with our comprehensive 6-tab form for accurate LCA calculations
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => navigate('/app/products/create/enhanced')}
                  className="bg-avallen-green hover:bg-avallen-green-light text-white font-medium px-6 py-2"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Try Enhanced Form
                </Button>
              </div>
            </div>
          </div>
          <ProductsSection />
        </main>
      </div>
    </div>
  );
}