import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import MetricsCards from "@/components/dashboard/metrics-cards";
import EmissionsChart from "@/components/dashboard/emissions-chart";
import ReportStatus from "@/components/dashboard/report-status";
import SupplierList from "@/components/dashboard/supplier-list";
import ProductsSection from "@/components/dashboard/products-section";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Fetch company data for reporting period
  const { data: company } = useQuery({
    queryKey: ["/api/company"],
    retry: false,
    enabled: isAuthenticated,
  });

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

  // Format reporting period from company data
  const getReportingPeriod = () => {
    if (company?.currentReportingPeriodStart && company?.currentReportingPeriodEnd) {
      const start = new Date(company.currentReportingPeriodStart).toLocaleDateString();
      const end = new Date(company.currentReportingPeriodEnd).toLocaleDateString();
      return `Reporting Period: ${start} - ${end}`;
    }
    return "Reporting Period: Not set";
  };

  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Dashboard" subtitle={getReportingPeriod()} />
        <main className="flex-1 p-6 overflow-y-auto">
          <MetricsCards />
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <EmissionsChart />
            <ReportStatus />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <ProductsSection />
            <SupplierList />
          </div>
        </main>
      </div>
    </div>
  );
}
