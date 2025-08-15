import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { X, ArrowRight, Loader2, CheckCircle, Building2 } from "lucide-react";
import ProgressBar from "./progress-bar";

interface OnboardingWizardProps {
  onComplete: (companyId: number) => void;
  onCancel: () => void;
}

interface WizardFormData {
  firstName: string;
  companyName: string;
  industry: string;
  companySize: string;
  primaryMotivations: string[];
  country: string;
}

export default function OnboardingWizard({ onComplete, onCancel }: OnboardingWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<WizardFormData>({
    firstName: '',
    companyName: '',
    industry: '',
    companySize: '',
    primaryMotivations: [],
    country: '',
  });

  // Company creation mutation
  const createCompanyMutation = useMutation({
    mutationFn: async (data: WizardFormData) => {
      const response = await apiRequest("PATCH", "/api/companies/update-onboarding", {
        primaryMotivation: data.primaryMotivations.join(', '),
        industry: data.industry,
        country: data.country,
        numberOfEmployees: data.companySize,
        onboardingComplete: true
      });
      return response;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/company"] });
      toast({
        title: "Welcome aboard!",
        description: `Setup complete. Welcome to your sustainability dashboard, ${formData.firstName}!`,
      });
      onComplete(response.company?.id || 1);
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Could not complete company setup. Please try again.",
        variant: "destructive",
      });
    },
  });

  const totalSteps = 4;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    createCompanyMutation.mutate(formData);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.firstName.trim().length > 0;
      case 2:
        return formData.companyName.trim().length > 0 && formData.industry.trim().length > 0;
      case 3:
        return formData.companySize.trim().length > 0 && formData.country.trim().length > 0;
      case 4:
        return formData.primaryMotivations.length > 0;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        // Step 1: Personal Welcome
        return (
          <div className="space-y-6 text-center">
            <div className="mb-8">
              <CheckCircle className="w-16 h-16 text-avallen-green mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-gray mb-2">
                Welcome to the Sustainability Tool!
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                We're going to help you measure and manage your brand's impact. 
                First, what should we call you?
              </p>
            </div>
            
            <div className="max-w-sm mx-auto">
              <Label htmlFor="firstName">Your First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="Enter your first name"
                className="text-center text-lg"
              />
            </div>
          </div>
        );
      
      case 2:
        // Step 2: Company Name & Industry
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Building2 className="w-16 h-16 text-avallen-green mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-gray mb-2">
                Great to meet you, {formData.firstName}!
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Tell us about your company so we can personalize your experience.
              </p>
            </div>
            
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Enter company name"
                  className="text-lg"
                />
              </div>
              
              <div>
                <Label htmlFor="industry">Industry</Label>
                <select
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select your industry</option>
                  <option value="alcoholic-beverages">Alcoholic Beverages</option>
                  <option value="non-alcoholic-beverages">Non-Alcoholic Beverages</option>
                  <option value="food-production">Food Production</option>
                  <option value="retail">Retail</option>
                  <option value="hospitality">Hospitality</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
        );
      
      case 3:
        // Step 3: Company Details  
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Building2 className="w-16 h-16 text-avallen-green mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-gray mb-2">
                More about {formData.companyName}
              </h3>
              <p className="text-gray-600 max-w-lg mx-auto">
                A few more details to help us set up your sustainability dashboard.
              </p>
            </div>
            
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <Label htmlFor="companySize">Company Size</Label>
                <select
                  id="companySize"
                  value={formData.companySize}
                  onChange={(e) => setFormData(prev => ({ ...prev, companySize: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select company size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="country">Country</Label>
                <select
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select your country</option>
                  <option value="GB">United Kingdom</option>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="ES">Spain</option>
                  <option value="IT">Italy</option>
                  <option value="NL">Netherlands</option>
                  <option value="SE">Sweden</option>
                  <option value="NO">Norway</option>
                  <option value="DK">Denmark</option>
                  <option value="FI">Finland</option>
                  <option value="IE">Ireland</option>
                  <option value="CH">Switzerland</option>
                  <option value="AT">Austria</option>
                  <option value="BE">Belgium</option>
                  <option value="LU">Luxembourg</option>
                  <option value="PT">Portugal</option>
                  <option value="GR">Greece</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 4:
        // Step 4: Motivation & Goals
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle className="w-12 h-12 text-avallen-green mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-gray mb-2">
                What are your sustainability goals?
              </h3>
              <p className="text-gray-600 max-w-lg mx-auto">
                Help us personalize your experience by selecting your main objectives. Choose all that apply.
              </p>
            </div>
            
            <div className="max-w-lg mx-auto space-y-3">
              {[
                { value: "measure_footprint", label: "Measure my company & product carbon footprint (LCA)" },
                { value: "sustainability_report", label: "Produce a professional annual sustainability report" },
                { value: "compliance", label: "Ensure compliance with new regulations (like DMCC)" },
                { value: "strategy", label: "Get help with my overall sustainability strategy" },
                { value: "net_zero", label: "Set and track progress towards Net Zero targets" }
              ].map(goal => (
                <label key={goal.value} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <Checkbox
                    checked={formData.primaryMotivations.includes(goal.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData(prev => ({
                          ...prev,
                          primaryMotivations: [...prev.primaryMotivations, goal.value]
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          primaryMotivations: prev.primaryMotivations.filter(m => m !== goal.value)
                        }));
                      }
                    }}
                  />
                  <span className="font-medium">{goal.label}</span>
                </label>
              ))}
            </div>
            
            {formData.primaryMotivations.length > 0 && (
              <div className="text-center mt-6">
                <p className="text-sm text-green-600">
                  Great! You've selected {formData.primaryMotivations.length} goal{formData.primaryMotivations.length > 1 ? 's' : ''}.
                </p>
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-gray-200 shadow-xl">
        <CardHeader className="border-b border-light-gray">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-slate-gray">
              Complete Your Setup
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
        </CardHeader>
        
        <CardContent className="p-6">
          {renderStep()}
          
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="border-slate-gray text-slate-gray hover:bg-lightest-gray"
            >
              Back
            </Button>
            
            <div className="flex space-x-2">
              <Button
                onClick={handleNext}
                disabled={!isStepValid() || createCompanyMutation.isPending}
                className="bg-avallen-green hover:bg-avallen-green-light text-white"
              >
                {createCompanyMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Setting up...
                  </>
                ) : currentStep === totalSteps ? (
                  "Complete Setup"
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}