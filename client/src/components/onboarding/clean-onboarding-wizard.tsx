import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  User,
  Building2,
  CheckCircle,
  ArrowRight,
  X,
  Loader2
} from 'lucide-react';

interface OnboardingData {
  userName: string;
  companyName: string;
  industry: string;
  companySize: string;
  country: string;
  primaryMotivations: string[];
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
}

interface CleanOnboardingWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

const ProgressBar = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
  return (
    <div className="flex items-center space-x-2 mt-4">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 rounded-full ${
            i + 1 <= currentStep ? 'bg-avallen-green' : 'bg-gray-200'
          }`}
        />
      ))}
      <span className="text-sm text-gray-500 ml-2">
        {currentStep} of {totalSteps}
      </span>
    </div>
  );
};

// Comprehensive country list (excluding Israel, including Palestine)
const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda",
  "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain",
  "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria",
  "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros",
  "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus",
  "Czech Republic", "Democratic Republic of the Congo", "Denmark", "Djibouti",
  "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador",
  "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji",
  "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana",
  "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Holy See", "Honduras", "Hungary", "Iceland", "India", "Indonesia",
  "Iran", "Iraq", "Ireland", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan",
  "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon",
  "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands",
  "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco",
  "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia",
  "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger",
  "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan",
  "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru",
  "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines",
  "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal",
  "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia",
  "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan",
  "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga",
  "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States",
  "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela", "Vietnam", "Yemen", "Zambia",
  "Zimbabwe"
];

function CleanOnboardingWizard({ onComplete, onCancel }: CleanOnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>({
    userName: '',
    companyName: '',
    industry: '',
    companySize: '',
    country: '',
    primaryMotivations: [],
    reportingPeriodStart: '',
    reportingPeriodEnd: ''
  });

  const totalSteps = 5;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createCompanyMutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      return apiRequest('PATCH', '/api/companies/update-onboarding', {
        industry: data.industry,
        numberOfEmployees: data.companySize,
        country: data.country,
        primaryMotivation: data.primaryMotivations.join(', '),
        currentReportingPeriodStart: data.reportingPeriodStart,
        currentReportingPeriodEnd: data.reportingPeriodEnd,
        onboardingComplete: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      toast({
        title: "Welcome!",
        description: "Your company profile has been created successfully.",
      });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create company profile. Please try again.",
        variant: "destructive",
      });
      console.error('Onboarding error:', error);
    }
  });

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      createCompanyMutation.mutate(formData);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.userName.trim().length > 0;
      case 2:
        return formData.companyName.trim().length > 0 && formData.industry.length > 0;
      case 3:
        return formData.companySize.length > 0 && formData.country.length > 0;
      case 4:
        return formData.primaryMotivations.length > 0;
      case 5:
        return formData.reportingPeriodStart && formData.reportingPeriodEnd;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        // Step 1: Personal Welcome
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <User className="w-16 h-16 text-avallen-green mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-gray mb-2">
                Welcome to your sustainability journey!
              </h3>
              <p className="text-gray-600 max-w-lg mx-auto">
                Let's start by setting up your basic company profile. This will help us personalize your sustainability tools and reporting.
              </p>
            </div>
            
            <div className="max-w-md mx-auto">
              <Label htmlFor="userName">What should we call you?</Label>
              <Input
                id="userName"
                value={formData.userName}
                onChange={(e) => setFormData(prev => ({ ...prev, userName: e.target.value }))}
                placeholder="Enter your name"
                className="text-lg mt-2"
              />
            </div>
          </div>
        );

      case 2:
        // Step 2: Company Information
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Building2 className="w-16 h-16 text-avallen-green mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-gray mb-2">
                Tell us about your company
              </h3>
              <p className="text-gray-600 max-w-lg mx-auto">
                We'll set up your basic company profile for sustainability tracking and reporting.
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
                A few more details to complete your basic company profile setup.
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
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
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

      case 5:
        // Step 5: Reporting Period
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <CheckCircle className="w-16 h-16 text-avallen-green mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-gray mb-2">
                Set your reporting period
              </h3>
              <p className="text-gray-600 max-w-lg mx-auto">
                Choose the time period for your sustainability reporting and LCA assessments. This will be used for all your environmental impact measurements.
              </p>
            </div>
            
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <Label htmlFor="reportingPeriodStart">Reporting Period Start Date</Label>
                <Input
                  id="reportingPeriodStart"
                  type="date"
                  value={formData.reportingPeriodStart}
                  onChange={(e) => setFormData(prev => ({ ...prev, reportingPeriodStart: e.target.value }))}
                  className="text-lg mt-2"
                />
              </div>
              
              <div>
                <Label htmlFor="reportingPeriodEnd">Reporting Period End Date</Label>
                <Input
                  id="reportingPeriodEnd"
                  type="date"
                  value={formData.reportingPeriodEnd}
                  onChange={(e) => setFormData(prev => ({ ...prev, reportingPeriodEnd: e.target.value }))}
                  className="text-lg mt-2"
                />
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  💡 <strong>Tip:</strong> Most companies choose a 12-month period that aligns with their financial year or calendar year for easier data collection and reporting.
                </p>
              </div>
            </div>
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

export default CleanOnboardingWizard;