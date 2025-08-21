import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import OnboardingWizard from "@/components/onboarding/clean-onboarding-wizard";
import EnhancedOnboardingWizard from "@/components/onboarding/enhanced-onboarding-wizard";
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Sparkles } from "lucide-react";

export default function Onboarding() {
  return (
    <OnboardingGuard>
      <OnboardingContent />
    </OnboardingGuard>
  );
}

function OnboardingContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [showWizard, setShowWizard] = useState(false);

  const handleGetStarted = () => {
    setShowWizard(true);
  };

  const handleOnboardingComplete = () => {
    // Navigate directly to dashboard since the wizard already handles completion
    navigate("/app/dashboard");
  };

  if (showWizard) {
    return (
      <EnhancedOnboardingWizard
        onComplete={handleOnboardingComplete}
        onCancel={() => setShowWizard(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-lightest-gray via-white to-avallen-green/5 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border shadow-xl bg-white">
        <CardHeader className="text-center space-y-4">
          <div className="w-20 h-20 bg-gradient-to-br from-avallen-green to-avallen-green-light rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-slate-gray mb-2">
              Welcome to Avallen Solutions, {user?.firstName}!
            </CardTitle>
            <p className="text-xl text-gray-600">
              Join our beta program and set up your sustainability platform
            </p>
          </div>
          
          {/* Beta program highlight */}
          <div className="bg-avallen-green/10 border border-avallen-green/20 rounded-lg p-4">
            <h3 className="font-semibold text-avallen-green mb-2">Beta Program Participant</h3>
            <p className="text-sm text-gray-700">
              You're part of our exclusive beta program! Help us perfect our platform 
              with real-world data and receive priority support.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-gray">What we'll set up:</h3>
            <div className="grid gap-3">
              <div className="flex items-center space-x-3 p-3 bg-lightest-gray rounded-lg">
                <div className="w-2 h-2 bg-avallen-green rounded-full" />
                <span className="text-slate-gray">Basic company profile setup</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-lightest-gray rounded-lg">
                <div className="w-2 h-2 bg-avallen-green rounded-full" />
                <span className="text-slate-gray">Sustainability goals and priorities</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-lightest-gray rounded-lg">
                <div className="w-2 h-2 bg-avallen-green rounded-full" />
                <span className="text-slate-gray">Reporting period configuration</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">💡 Pro Tip</h4>
            <p className="text-blue-800 text-sm">
              Have your company details ready. You can add products, suppliers, and detailed operational data later from the dashboard.
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
              This should take about 3-5 minutes to complete.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
