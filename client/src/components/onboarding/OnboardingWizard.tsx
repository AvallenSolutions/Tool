import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, ChevronLeft, Target, Building2, Users, Globe } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Onboarding form schema
const onboardingSchema = z.object({
  primaryMotivation: z.string().min(1, 'Please select your primary motivation'),
  productCategory: z.string().min(1, 'Please select your product category'),
  numberOfEmployees: z.string().min(1, 'Please select company size'),
  industry: z.string().min(1, 'Please select your industry'),
  country: z.string().min(1, 'Please select your country'),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

interface OnboardingWizardProps {
  isOpen: boolean;
  onComplete: () => void;
}

const STEPS = [
  { id: 1, title: 'Welcome', description: 'Let\'s get started' },
  { id: 2, title: 'Motivation', description: 'Your primary goal' },
  { id: 3, title: 'Company Details', description: 'Tell us about your business' },
  { id: 4, title: 'Industry & Location', description: 'Business context' },
  { id: 5, title: 'Ready to Begin', description: 'Complete setup' },
];

const MOTIVATION_OPTIONS = [
  {
    value: 'measure_footprint',
    label: 'Measure my carbon footprint',
    description: 'Track and calculate environmental impact'
  },
  {
    value: 'prepare_certification',
    label: 'Prepare for a certification',
    description: 'Meet regulatory or industry standards'
  },
  {
    value: 'answer_retailers',
    label: 'Answer retailer questions',
    description: 'Provide sustainability data to customers'
  }
];

export function OnboardingWizard({ isOpen, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      primaryMotivation: '',
      productCategory: '',
      numberOfEmployees: '',
      industry: '',
      country: '',
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: Partial<OnboardingFormData>) => {
      const response = await fetch('/api/companies/update-onboarding', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update company: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
      toast({
        title: 'Welcome aboard!',
        description: 'Your company profile has been set up successfully.',
      });
      onComplete();
    },
    onError: (error: any) => {
      console.error('Onboarding error:', error);
      toast({
        title: 'Setup incomplete',
        description: `Error: ${error.message || 'There was an error completing your setup. Please try again.'}`,
        variant: 'destructive',
      });
    },
  });

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = (data: OnboardingFormData) => {
    updateCompanyMutation.mutate({
      ...data,
      // Mark onboarding as complete
      onboardingComplete: true,
    } as any);
  };

  const progress = (currentStep / STEPS.length) * 100;

  const getActionUrl = (motivation: string) => {
    switch (motivation) {
      case 'measure_footprint':
        return '/products/create';
      case 'prepare_certification':
        return '/reports/create';
      case 'answer_retailers':
        return '/dashboard#goals';
      default:
        return '/dashboard';
    }
  };

  const getActionText = (motivation: string) => {
    switch (motivation) {
      case 'measure_footprint':
        return 'Great! Let\'s start by adding your first product';
      case 'prepare_certification':
        return 'Perfect! Let\'s begin with creating your compliance report';
      case 'answer_retailers':
        return 'Excellent! Let\'s set up your sustainability goals';
      default:
        return 'Let\'s explore your dashboard';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="bg-white border shadow-lg max-w-2xl" aria-describedby="onboarding-description">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-center">
            {STEPS[currentStep - 1].title}
          </DialogTitle>
          <div className="text-center text-gray-600" id="onboarding-description">
            {STEPS[currentStep - 1].description}
          </div>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="mb-6">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2 text-sm text-gray-500">
            <span>Step {currentStep} of {STEPS.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <Target className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Welcome to Your Sustainability Journey</h3>
                <p className="text-gray-600">
                  In just a few steps, we'll set up your account to help you track, measure, and improve 
                  your environmental impact. This should take about 5 minutes.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Motivation */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">What's the main reason you're here today?</h3>
                <p className="text-gray-600">This helps us customize your experience</p>
              </div>
              
              <RadioGroup
                value={form.watch('primaryMotivation')}
                onValueChange={(value) => form.setValue('primaryMotivation', value)}
                className="space-y-4"
              >
                {MOTIVATION_OPTIONS.map((option) => (
                  <Card key={option.value} className="cursor-pointer hover:bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value={option.value} id={option.value} />
                        <div className="flex-1">
                          <Label htmlFor={option.value} className="text-base font-medium cursor-pointer">
                            {option.label}
                          </Label>
                          <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Step 3: Company Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">Tell us about your business</h3>
                <p className="text-gray-600">This helps us provide relevant insights</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="productCategory">Primary Product Category</Label>
                  <Select
                    value={form.watch('productCategory')}
                    onValueChange={(value) => form.setValue('productCategory', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spirits">Spirits</SelectItem>
                      <SelectItem value="wine">Wine</SelectItem>
                      <SelectItem value="beer">Beer</SelectItem>
                      <SelectItem value="non-alcoholic">Non-Alcoholic</SelectItem>
                      <SelectItem value="cider">Cider</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="numberOfEmployees">Company Size</Label>
                  <Select
                    value={form.watch('numberOfEmployees')}
                    onValueChange={(value) => form.setValue('numberOfEmployees', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="500+">500+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Industry & Location */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">Industry & Location</h3>
                <p className="text-gray-600">Final details to complete your profile</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select
                    value={form.watch('industry')}
                    onValueChange={(value) => form.setValue('industry', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alcoholic-beverages">Alcoholic Beverages</SelectItem>
                      <SelectItem value="non-alcoholic-beverages">Non-Alcoholic Beverages</SelectItem>
                      <SelectItem value="food-production">Food Production</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="hospitality">Hospitality</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={form.watch('country')}
                    onValueChange={(value) => form.setValue('country', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      <SelectItem value="AF">Afghanistan</SelectItem>
                      <SelectItem value="AL">Albania</SelectItem>
                      <SelectItem value="DZ">Algeria</SelectItem>
                      <SelectItem value="AD">Andorra</SelectItem>
                      <SelectItem value="AO">Angola</SelectItem>
                      <SelectItem value="AG">Antigua and Barbuda</SelectItem>
                      <SelectItem value="AR">Argentina</SelectItem>
                      <SelectItem value="AM">Armenia</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                      <SelectItem value="AT">Austria</SelectItem>
                      <SelectItem value="AZ">Azerbaijan</SelectItem>
                      <SelectItem value="BS">Bahamas</SelectItem>
                      <SelectItem value="BH">Bahrain</SelectItem>
                      <SelectItem value="BD">Bangladesh</SelectItem>
                      <SelectItem value="BB">Barbados</SelectItem>
                      <SelectItem value="BY">Belarus</SelectItem>
                      <SelectItem value="BE">Belgium</SelectItem>
                      <SelectItem value="BZ">Belize</SelectItem>
                      <SelectItem value="BJ">Benin</SelectItem>
                      <SelectItem value="BT">Bhutan</SelectItem>
                      <SelectItem value="BO">Bolivia</SelectItem>
                      <SelectItem value="BA">Bosnia and Herzegovina</SelectItem>
                      <SelectItem value="BW">Botswana</SelectItem>
                      <SelectItem value="BR">Brazil</SelectItem>
                      <SelectItem value="BN">Brunei</SelectItem>
                      <SelectItem value="BG">Bulgaria</SelectItem>
                      <SelectItem value="BF">Burkina Faso</SelectItem>
                      <SelectItem value="BI">Burundi</SelectItem>
                      <SelectItem value="KH">Cambodia</SelectItem>
                      <SelectItem value="CM">Cameroon</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="CV">Cape Verde</SelectItem>
                      <SelectItem value="CF">Central African Republic</SelectItem>
                      <SelectItem value="TD">Chad</SelectItem>
                      <SelectItem value="CL">Chile</SelectItem>
                      <SelectItem value="CN">China</SelectItem>
                      <SelectItem value="CO">Colombia</SelectItem>
                      <SelectItem value="KM">Comoros</SelectItem>
                      <SelectItem value="CG">Congo</SelectItem>
                      <SelectItem value="CD">Congo (Democratic Republic)</SelectItem>
                      <SelectItem value="CR">Costa Rica</SelectItem>
                      <SelectItem value="CI">Côte d'Ivoire</SelectItem>
                      <SelectItem value="HR">Croatia</SelectItem>
                      <SelectItem value="CU">Cuba</SelectItem>
                      <SelectItem value="CY">Cyprus</SelectItem>
                      <SelectItem value="CZ">Czech Republic</SelectItem>
                      <SelectItem value="DK">Denmark</SelectItem>
                      <SelectItem value="DJ">Djibouti</SelectItem>
                      <SelectItem value="DM">Dominica</SelectItem>
                      <SelectItem value="DO">Dominican Republic</SelectItem>
                      <SelectItem value="EC">Ecuador</SelectItem>
                      <SelectItem value="EG">Egypt</SelectItem>
                      <SelectItem value="SV">El Salvador</SelectItem>
                      <SelectItem value="GQ">Equatorial Guinea</SelectItem>
                      <SelectItem value="ER">Eritrea</SelectItem>
                      <SelectItem value="EE">Estonia</SelectItem>
                      <SelectItem value="SZ">Eswatini</SelectItem>
                      <SelectItem value="ET">Ethiopia</SelectItem>
                      <SelectItem value="FJ">Fiji</SelectItem>
                      <SelectItem value="FI">Finland</SelectItem>
                      <SelectItem value="FR">France</SelectItem>
                      <SelectItem value="GA">Gabon</SelectItem>
                      <SelectItem value="GM">Gambia</SelectItem>
                      <SelectItem value="GE">Georgia</SelectItem>
                      <SelectItem value="DE">Germany</SelectItem>
                      <SelectItem value="GH">Ghana</SelectItem>
                      <SelectItem value="GR">Greece</SelectItem>
                      <SelectItem value="GD">Grenada</SelectItem>
                      <SelectItem value="GT">Guatemala</SelectItem>
                      <SelectItem value="GN">Guinea</SelectItem>
                      <SelectItem value="GW">Guinea-Bissau</SelectItem>
                      <SelectItem value="GY">Guyana</SelectItem>
                      <SelectItem value="HT">Haiti</SelectItem>
                      <SelectItem value="HN">Honduras</SelectItem>
                      <SelectItem value="HU">Hungary</SelectItem>
                      <SelectItem value="IS">Iceland</SelectItem>
                      <SelectItem value="IN">India</SelectItem>
                      <SelectItem value="ID">Indonesia</SelectItem>
                      <SelectItem value="IR">Iran</SelectItem>
                      <SelectItem value="IQ">Iraq</SelectItem>
                      <SelectItem value="IE">Ireland</SelectItem>
                      <SelectItem value="IT">Italy</SelectItem>
                      <SelectItem value="JM">Jamaica</SelectItem>
                      <SelectItem value="JP">Japan</SelectItem>
                      <SelectItem value="JO">Jordan</SelectItem>
                      <SelectItem value="KZ">Kazakhstan</SelectItem>
                      <SelectItem value="KE">Kenya</SelectItem>
                      <SelectItem value="KI">Kiribati</SelectItem>
                      <SelectItem value="KP">Korea (North)</SelectItem>
                      <SelectItem value="KR">Korea (South)</SelectItem>
                      <SelectItem value="KW">Kuwait</SelectItem>
                      <SelectItem value="KG">Kyrgyzstan</SelectItem>
                      <SelectItem value="LA">Laos</SelectItem>
                      <SelectItem value="LV">Latvia</SelectItem>
                      <SelectItem value="LB">Lebanon</SelectItem>
                      <SelectItem value="LS">Lesotho</SelectItem>
                      <SelectItem value="LR">Liberia</SelectItem>
                      <SelectItem value="LY">Libya</SelectItem>
                      <SelectItem value="LI">Liechtenstein</SelectItem>
                      <SelectItem value="LT">Lithuania</SelectItem>
                      <SelectItem value="LU">Luxembourg</SelectItem>
                      <SelectItem value="MG">Madagascar</SelectItem>
                      <SelectItem value="MW">Malawi</SelectItem>
                      <SelectItem value="MY">Malaysia</SelectItem>
                      <SelectItem value="MV">Maldives</SelectItem>
                      <SelectItem value="ML">Mali</SelectItem>
                      <SelectItem value="MT">Malta</SelectItem>
                      <SelectItem value="MH">Marshall Islands</SelectItem>
                      <SelectItem value="MR">Mauritania</SelectItem>
                      <SelectItem value="MU">Mauritius</SelectItem>
                      <SelectItem value="MX">Mexico</SelectItem>
                      <SelectItem value="FM">Micronesia</SelectItem>
                      <SelectItem value="MD">Moldova</SelectItem>
                      <SelectItem value="MC">Monaco</SelectItem>
                      <SelectItem value="MN">Mongolia</SelectItem>
                      <SelectItem value="ME">Montenegro</SelectItem>
                      <SelectItem value="MA">Morocco</SelectItem>
                      <SelectItem value="MZ">Mozambique</SelectItem>
                      <SelectItem value="MM">Myanmar</SelectItem>
                      <SelectItem value="NA">Namibia</SelectItem>
                      <SelectItem value="NR">Nauru</SelectItem>
                      <SelectItem value="NP">Nepal</SelectItem>
                      <SelectItem value="NL">Netherlands</SelectItem>
                      <SelectItem value="NZ">New Zealand</SelectItem>
                      <SelectItem value="NI">Nicaragua</SelectItem>
                      <SelectItem value="NE">Niger</SelectItem>
                      <SelectItem value="NG">Nigeria</SelectItem>
                      <SelectItem value="MK">North Macedonia</SelectItem>
                      <SelectItem value="NO">Norway</SelectItem>
                      <SelectItem value="OM">Oman</SelectItem>
                      <SelectItem value="PK">Pakistan</SelectItem>
                      <SelectItem value="PW">Palau</SelectItem>
                      <SelectItem value="PS">Palestine</SelectItem>
                      <SelectItem value="PA">Panama</SelectItem>
                      <SelectItem value="PG">Papua New Guinea</SelectItem>
                      <SelectItem value="PY">Paraguay</SelectItem>
                      <SelectItem value="PE">Peru</SelectItem>
                      <SelectItem value="PH">Philippines</SelectItem>
                      <SelectItem value="PL">Poland</SelectItem>
                      <SelectItem value="PT">Portugal</SelectItem>
                      <SelectItem value="QA">Qatar</SelectItem>
                      <SelectItem value="RO">Romania</SelectItem>
                      <SelectItem value="RU">Russia</SelectItem>
                      <SelectItem value="RW">Rwanda</SelectItem>
                      <SelectItem value="KN">Saint Kitts and Nevis</SelectItem>
                      <SelectItem value="LC">Saint Lucia</SelectItem>
                      <SelectItem value="VC">Saint Vincent and the Grenadines</SelectItem>
                      <SelectItem value="WS">Samoa</SelectItem>
                      <SelectItem value="SM">San Marino</SelectItem>
                      <SelectItem value="ST">São Tomé and Príncipe</SelectItem>
                      <SelectItem value="SA">Saudi Arabia</SelectItem>
                      <SelectItem value="SN">Senegal</SelectItem>
                      <SelectItem value="RS">Serbia</SelectItem>
                      <SelectItem value="SC">Seychelles</SelectItem>
                      <SelectItem value="SL">Sierra Leone</SelectItem>
                      <SelectItem value="SG">Singapore</SelectItem>
                      <SelectItem value="SK">Slovakia</SelectItem>
                      <SelectItem value="SI">Slovenia</SelectItem>
                      <SelectItem value="SB">Solomon Islands</SelectItem>
                      <SelectItem value="SO">Somalia</SelectItem>
                      <SelectItem value="ZA">South Africa</SelectItem>
                      <SelectItem value="SS">South Sudan</SelectItem>
                      <SelectItem value="ES">Spain</SelectItem>
                      <SelectItem value="LK">Sri Lanka</SelectItem>
                      <SelectItem value="SD">Sudan</SelectItem>
                      <SelectItem value="SR">Suriname</SelectItem>
                      <SelectItem value="SE">Sweden</SelectItem>
                      <SelectItem value="CH">Switzerland</SelectItem>
                      <SelectItem value="SY">Syria</SelectItem>
                      <SelectItem value="TW">Taiwan</SelectItem>
                      <SelectItem value="TJ">Tajikistan</SelectItem>
                      <SelectItem value="TZ">Tanzania</SelectItem>
                      <SelectItem value="TH">Thailand</SelectItem>
                      <SelectItem value="TL">Timor-Leste</SelectItem>
                      <SelectItem value="TG">Togo</SelectItem>
                      <SelectItem value="TO">Tonga</SelectItem>
                      <SelectItem value="TT">Trinidad and Tobago</SelectItem>
                      <SelectItem value="TN">Tunisia</SelectItem>
                      <SelectItem value="TR">Turkey</SelectItem>
                      <SelectItem value="TM">Turkmenistan</SelectItem>
                      <SelectItem value="TV">Tuvalu</SelectItem>
                      <SelectItem value="UG">Uganda</SelectItem>
                      <SelectItem value="UA">Ukraine</SelectItem>
                      <SelectItem value="AE">United Arab Emirates</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="UY">Uruguay</SelectItem>
                      <SelectItem value="UZ">Uzbekistan</SelectItem>
                      <SelectItem value="VU">Vanuatu</SelectItem>
                      <SelectItem value="VA">Vatican City</SelectItem>
                      <SelectItem value="VE">Venezuela</SelectItem>
                      <SelectItem value="VN">Vietnam</SelectItem>
                      <SelectItem value="YE">Yemen</SelectItem>
                      <SelectItem value="ZM">Zambia</SelectItem>
                      <SelectItem value="ZW">Zimbabwe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Ready to Begin */}
          {currentStep === 5 && (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <ChevronRight className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">You're all set!</h3>
                <p className="text-gray-600 mb-4">
                  {getActionText(form.watch('primaryMotivation'))}
                </p>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    Your personalized dashboard is ready with recommendations based on your goals.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={
                  (currentStep === 2 && !form.watch('primaryMotivation')) ||
                  (currentStep === 3 && (!form.watch('productCategory') || !form.watch('numberOfEmployees'))) ||
                  (currentStep === 4 && (!form.watch('industry') || !form.watch('country')))
                }
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={updateCompanyMutation.isPending}
                className="flex items-center gap-2"
              >
                {updateCompanyMutation.isPending ? 'Completing Setup...' : 'Complete Setup'}
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}