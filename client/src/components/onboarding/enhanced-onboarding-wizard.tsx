import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowLeft, ArrowRight, CheckCircle, Building2, Users, Globe, Target, Calendar as CalendarLucide } from 'lucide-react';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import avallenLogo from "@assets/White Background-Winner-Avallen Solutions_1755804696792.jpg";

interface OnboardingData {
  userName: string;
  companyName: string;
  industry: string;
  companySize: string;
  country: string;
  primaryMotivations: string[];
  financialYear: string;
  reportingFrequency: string;
}

interface EnhancedOnboardingWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

const industries = [
  "Alcoholic Beverages", "Soft Drinks", "Coffee & Tea", "Dairy Products", 
  "Energy Drinks", "Functional Beverages", "Juices & Smoothies", 
  "Water & Enhanced Water", "Other"
];

const companySizes = [
  "1-10 employees", "11-50 employees", "51-200 employees", 
  "201-1000 employees", "1000+ employees"
];

const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon",
  "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador",
  "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
  "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland",
  "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait",
  "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico",
  "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru",
  "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey",
  "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu",
  "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const motivations = [
  "Regulatory Compliance",
  "Customer Demand", 
  "Cost Reduction",
  "Brand Differentiation",
  "Investor Requirements",
  "Environmental Responsibility",
  "Supply Chain Transparency",
  "Market Access"
];

const financialYears = [
  "January - December",
  "April - March", 
  "July - June",
  "October - September"
];

const reportingFrequencies = [
  "Quarterly",
  "Every 6 months", 
  "Annually"
];

const steps = [
  { id: 1, title: "Company Details", icon: Building2, description: "Tell us about your company" },
  { id: 2, title: "Industry & Size", icon: Users, description: "Business specifics" },
  { id: 3, title: "Location", icon: Globe, description: "Where you operate" },
  { id: 4, title: "Sustainability Goals", icon: Target, description: "Your motivations" },
  { id: 5, title: "Reporting Setup", icon: CalendarLucide, description: "Financial year & frequency" }
];

export default function EnhancedOnboardingWizard({ onComplete, onCancel }: EnhancedOnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>({
    userName: '',
    companyName: '',
    industry: '',
    companySize: '',
    country: '',
    primaryMotivations: [],
    financialYear: '',
    reportingFrequency: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createCompanyMutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      return apiRequest('PATCH', '/api/companies/update-onboarding', {
        industry: data.industry,
        numberOfEmployees: data.companySize,
        country: data.country,
        primaryMotivation: data.primaryMotivations.join(', '),
        financialYear: data.financialYear,
        reportingFrequency: data.reportingFrequency,
        onboardingComplete: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      toast({
        title: "Welcome to Avallen Solutions! 🎉",
        description: "Your company profile has been created successfully. Let's start measuring your impact!",
      });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Setup Error",
        description: "Failed to create company profile. Please try again.",
        variant: "destructive",
      });
      console.error('Onboarding error:', error);
    }
  });

  const handleNext = () => {
    if (currentStep < 5) {
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
        return formData.companyName.trim().length > 0;
      case 2:
        return formData.industry && formData.companySize;
      case 3:
        return formData.country;
      case 4:
        return formData.primaryMotivations.length > 0;
      case 5:
        return formData.financialYear && formData.reportingFrequency;
      default:
        return false;
    }
  };

  const toggleMotivation = (motivation: string) => {
    setFormData(prev => ({
      ...prev,
      primaryMotivations: prev.primaryMotivations.includes(motivation)
        ? prev.primaryMotivations.filter(m => m !== motivation)
        : [...prev.primaryMotivations, motivation]
    }));
  };

  const progress = (currentStep / 5) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-lightest-gray via-white to-avallen-green/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src={avallenLogo} 
              alt="Avallen Solutions" 
              className="h-20 w-auto"
            />
          </div>
          <div className="flex justify-center mb-4">
            <Badge className="bg-avallen-green/10 text-avallen-green border-avallen-green/20 px-4 py-2">
              Beta Program Setup
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-slate-gray mb-2">Welcome to Avallen Solutions</h1>
          <p className="text-gray-600">Let's set up your sustainability platform in just a few steps</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-slate-gray">Step {currentStep} of 5</span>
            <span className="text-sm text-gray-600">{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between items-center mb-8 overflow-x-auto">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex flex-col items-center min-w-0 flex-1">
                <div className={cn(
                  "w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2",
                  isActive && "border-avallen-green bg-avallen-green text-white",
                  isCompleted && "border-avallen-green bg-avallen-green text-white",
                  !isActive && !isCompleted && "border-gray-300 text-gray-400"
                )}>
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <StepIcon className="w-6 h-6" />
                  )}
                </div>
                <div className="text-center">
                  <p className={cn(
                    "text-sm font-medium",
                    (isActive || isCompleted) ? "text-slate-gray" : "text-gray-400"
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500 hidden sm:block">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Form Content */}
        <Card className="bg-white border shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-gray">
              {steps[currentStep - 1].title}
            </CardTitle>
            <CardDescription>
              {steps[currentStep - 1].description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Step 1: Company Details */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Enter your company name"
                    className="mt-1"
                  />
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    This will be used across all your sustainability reports and communications.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Industry & Size */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="industry">Industry *</Label>
                  <Select onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map(industry => (
                        <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="companySize">Company Size *</Label>
                  <Select onValueChange={(value) => setFormData(prev => ({ ...prev, companySize: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent>
                      {companySizes.map(size => (
                        <SelectItem key={size} value={size}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 3: Location */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="country">Primary Country of Operations *</Label>
                  <Select onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map(country => (
                        <SelectItem key={country} value={country}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    This helps us provide region-specific emission factors and compliance guidelines.
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Motivations */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <Label>What are your primary motivations for sustainability reporting? *</Label>
                  <p className="text-sm text-gray-600 mb-4">Select all that apply</p>
                  <div className="grid grid-cols-2 gap-3">
                    {motivations.map(motivation => (
                      <div key={motivation} className="flex items-center space-x-2">
                        <Checkbox
                          id={motivation}
                          checked={formData.primaryMotivations.includes(motivation)}
                          onCheckedChange={() => toggleMotivation(motivation)}
                        />
                        <Label htmlFor={motivation} className="text-sm cursor-pointer">
                          {motivation}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Reporting Setup */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div>
                  <Label>Configure Your Reporting Schedule *</Label>
                  <p className="text-sm text-gray-600 mb-4">Set your financial year and reporting frequency</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="financial-year">Financial Year</Label>
                      <Select 
                        value={formData.financialYear} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, financialYear: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select your financial year" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border shadow-lg">
                          {financialYears.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="reporting-frequency">Reporting Frequency</Label>
                      <Select 
                        value={formData.reportingFrequency} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, reportingFrequency: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="How often will you report?" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border shadow-lg">
                          {reportingFrequencies.map((frequency) => (
                            <SelectItem key={frequency} value={frequency}>
                              {frequency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    Most companies align their sustainability reporting with their financial year. 
                    Choose a frequency that matches your business review cycles and stakeholder expectations.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={currentStep === 1 ? onCancel : handleBack}
                disabled={createCompanyMutation.isPending}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {currentStep === 1 ? 'Cancel' : 'Back'}
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={!isStepValid() || createCompanyMutation.isPending}
                className="bg-avallen-green hover:bg-avallen-green-light"
              >
                {createCompanyMutation.isPending ? (
                  "Setting up..."
                ) : currentStep === 5 ? (
                  "Complete Setup"
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}