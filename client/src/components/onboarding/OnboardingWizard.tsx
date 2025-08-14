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
      return await apiRequest('/api/companies/update-onboarding', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
      toast({
        title: 'Welcome aboard!',
        description: 'Your company profile has been set up successfully.',
      });
      onComplete();
    },
    onError: () => {
      toast({
        title: 'Setup incomplete',
        description: 'There was an error completing your setup. Please try again.',
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
                    <SelectContent>
                      <SelectItem value="UK">United Kingdom</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                      <SelectItem value="DE">Germany</SelectItem>
                      <SelectItem value="FR">France</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
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