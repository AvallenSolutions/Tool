import { useEffect, useState } from "react";
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
import DashboardTour from "@/components/dashboard/dashboard-tour";
import GuidedProductCreation from "@/components/dashboard/guided-product-creation";
import { WhatsNextModule } from "@/components/dashboard/WhatsNextModule";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { KPITracking } from "@/components/dashboard/KPITracking";
import { SMARTGoals } from "@/components/dashboard/SMARTGoals";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [showTour, setShowTour] = useState(false);
  const [showProductGuide, setShowProductGuide] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Fetch company data for reporting period
  const { data: company } = useQuery({
    queryKey: ["/api/company"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Check if user should see onboarding or tour (first time visiting dashboard)
  useEffect(() => {
    if (company) {
      // Check if onboarding is complete
      if (!company.onboardingComplete) {
        setShowOnboarding(true);
      } else if (!localStorage.getItem('dashboard-tour-completed')) {
        setShowTour(true);
      }
    }
  }, [company]);

  // Auto-start tour for testing
  useEffect(() => {
    if (company) {
      const timer = setTimeout(() => {
        if (!localStorage.getItem('dashboard-tour-completed')) {
          setShowTour(true);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [company]);

  // Development helper - reset tour state
  const resetTour = () => {
    localStorage.removeItem('dashboard-tour-completed');
    localStorage.removeItem('product-guide-completed');
    window.location.reload();
  };

  // Development helper - test onboarding flow
  const testOnboardingFlow = () => {
    // Clear all onboarding states
    localStorage.removeItem('dashboard-tour-completed');
    localStorage.removeItem('product-guide-completed');
    
    // Force show onboarding by setting the state directly
    setShowOnboarding(true);
    setShowTour(false);
    setShowProductGuide(false);
  };

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

  const handleTourComplete = () => {
    localStorage.setItem('dashboard-tour-completed', 'true');
    setShowTour(false);
    setShowProductGuide(true);
  };

  const handleTourSkip = () => {
    localStorage.setItem('dashboard-tour-completed', 'true');
    setShowTour(false);
  };

  const handleProductGuideComplete = () => {
    localStorage.setItem('product-guide-completed', 'true');
    setShowProductGuide(false);
  };

  const handleProductGuideSkip = () => {
    localStorage.setItem('product-guide-completed', 'true');
    setShowProductGuide(false);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Optionally start the tour after onboarding
    setTimeout(() => {
      if (!localStorage.getItem('dashboard-tour-completed')) {
        setShowTour(true);
      }
    }, 500);
  };

  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Dashboard" subtitle={getReportingPeriod()} />
        
        {/* Development helper - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="p-2 bg-yellow-100 text-yellow-800 text-sm flex gap-4">
            <button onClick={resetTour} className="underline">
              Reset Tour (Dev Only)
            </button>
            <button onClick={testOnboardingFlow} className="underline">
              Test Onboarding Flow
            </button>
          </div>
        )}
        <main className="flex-1 p-6 overflow-y-auto" id="dashboard-main">
          <div id="metrics-cards">
            <MetricsCards />
          </div>
          
          {/* Phase 2 & 3: Advanced UX Features - Most Frequently Used (Moved to Top) */}
          <div className="grid grid-cols-1 gap-6 mb-8">
            <div id="whats-next-section">
              <WhatsNextModule />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 mb-8">
            <div id="kpi-tracking-section">
              <KPITracking />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 mb-8">
            <div id="smart-goals-section">
              <SMARTGoals />
            </div>
          </div>

          {/* Standard Dashboard Sections */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <div id="emissions-chart">
              <EmissionsChart />
            </div>
            <div id="reports-section">
              <ReportStatus />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <div id="products-section">
              <ProductsSection />
            </div>
            <div id="suppliers-section">
              <SupplierList />
            </div>
          </div>
        </main>
      </div>

      {/* Tour components */}
      {showTour && (
        <DashboardTour
          onComplete={handleTourComplete}
          onSkip={handleTourSkip}
        />
      )}
      
      {showProductGuide && (
        <GuidedProductCreation
          onComplete={handleProductGuideComplete}
          onSkip={handleProductGuideSkip}
        />
      )}

      {/* Phase 2: Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingWizard
          isOpen={showOnboarding}
          onComplete={handleOnboardingComplete}
        />
      )}
    </div>
  );
}
