import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import OnboardingWizard from "@/components/onboarding/onboarding-wizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";

export default function Onboarding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [showWizard, setShowWizard] = useState(false);

  const handleGetStarted = () => {
    setShowWizard(true);
  };

  const handleOnboardingComplete = (companyId: number) => {
    // Navigate directly to dashboard since the wizard already handles completion
    navigate("/app/dashboard");
  };

  if (showWizard) {
    return (
      <OnboardingWizard
        onComplete={handleOnboardingComplete}
        onCancel={() => setShowWizard(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-lightest-gray flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-light-gray">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-avallen-green rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-gray">
            Welcome to Avallen Solutions, {user?.firstName}!
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Let's get your sustainability platform set up in just a few steps.
          </p>
          
          {/* Debug/bypass button */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 mb-2">
              Already completed onboarding? 
            </p>
            <Button
              onClick={() => navigate("/app/dashboard")}
              className="bg-avallen-green text-white hover:bg-avallen-green-light"
            >
              Go to Dashboard
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-gray">What we'll set up:</h3>
            <div className="grid gap-3">
              <div className="flex items-center space-x-3 p-3 bg-lightest-gray rounded-lg">
                <div className="w-2 h-2 bg-avallen-green rounded-full" />
                <span className="text-slate-gray">Company profile and reporting period</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-lightest-gray rounded-lg">
                <div className="w-2 h-2 bg-avallen-green rounded-full" />
                <span className="text-slate-gray">Operational footprint data collection</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-lightest-gray rounded-lg">
                <div className="w-2 h-2 bg-avallen-green rounded-full" />
                <span className="text-slate-gray">Product information and footprint setup</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-lightest-gray rounded-lg">
                <div className="w-2 h-2 bg-avallen-green rounded-full" />
                <span className="text-slate-gray">Supplier collaboration setup</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">💡 Pro Tip</h4>
            <p className="text-blue-800 text-sm">
              Have your utility bills, product information, and supplier contact details ready. 
              This will help you complete the setup faster.
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={handleGetStarted}
              className="bg-avallen-green hover:bg-avallen-green-light text-white px-8 py-3 text-lg"
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              This should take about 10-15 minutes to complete.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
