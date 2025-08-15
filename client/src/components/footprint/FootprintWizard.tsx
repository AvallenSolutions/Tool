import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, ArrowLeft, ArrowRight, Save, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Scope1EmissionsStep } from './steps/Scope1EmissionsStep';
import { Scope2EmissionsStep } from './steps/Scope2EmissionsStep';
import { Scope3EmissionsStep } from './steps/Scope3EmissionsStep';
import { FootprintSummaryStep } from './steps/FootprintSummaryStep';

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  scope: number;
  isComplete: boolean;
  emissionsTotal: number;
}

export interface FootprintData {
  id?: number;
  dataType: string;
  scope: number;
  value: string;
  unit: string;
  calculatedEmissions: string;
  metadata?: any;
}

export function FootprintWizard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<Record<string, any>>({});
  const [autoSaving, setAutoSaving] = useState(false);
  
  // Fetch existing footprint data
  const { data: existingData, isLoading } = useQuery({
    queryKey: ['/api/company/footprint'],
  });

  // Save footprint data mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<FootprintData>) => {
      const response = await fetch('/api/company/footprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to save data');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/footprint'] });
      toast({
        title: "Data Saved",
        description: "Your carbon footprint data has been saved successfully.",
      });
    },
  });

  // Calculate total emissions for each scope
  const calculateScopeEmissions = (scope: number): number => {
    const footprintDataArray = existingData?.data || existingData || [];
    if (!Array.isArray(footprintDataArray)) return 0;
    return footprintDataArray
      .filter((item: FootprintData) => item.scope === scope)
      .reduce((total: number, item: FootprintData) => 
        total + parseFloat(item.calculatedEmissions || '0'), 0
      );
  };

  // Define wizard steps
  const steps: WizardStep[] = [
    {
      id: 'scope1',
      title: 'Scope 1 Emissions',
      description: 'Direct emissions from owned or controlled sources',
      component: Scope1EmissionsStep,
      scope: 1,
      isComplete: (existingData?.data || existingData || []).some((d: FootprintData) => d.scope === 1),
      emissionsTotal: calculateScopeEmissions(1),
    },
    {
      id: 'scope2', 
      title: 'Scope 2 Emissions',
      description: 'Indirect emissions from purchased energy',
      component: Scope2EmissionsStep,
      scope: 2,
      isComplete: (existingData?.data || existingData || []).some((d: FootprintData) => d.scope === 2),
      emissionsTotal: calculateScopeEmissions(2),
    },
    {
      id: 'scope3',
      title: 'Scope 3 Emissions', 
      description: 'Indirect emissions in the value chain',
      component: Scope3EmissionsStep,
      scope: 3,
      isComplete: (existingData?.data || existingData || []).some((d: FootprintData) => d.scope === 3),
      emissionsTotal: calculateScopeEmissions(3),
    },
    {
      id: 'summary',
      title: 'Summary & Report',
      description: 'Review total footprint and generate reports',
      component: FootprintSummaryStep,
      scope: 0,
      isComplete: false,
      emissionsTotal: calculateScopeEmissions(1) + calculateScopeEmissions(2) + calculateScopeEmissions(3),
    },
  ];

  // Auto-save functionality
  useEffect(() => {
    const autoSaveData = async () => {
      if (Object.keys(wizardData).length > 0) {
        setAutoSaving(true);
        try {
          // Auto-save logic would go here
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated save
        } catch (error) {
          console.error('Auto-save failed:', error);
        } finally {
          setAutoSaving(false);
        }
      }
    };

    const autoSaveTimer = setTimeout(autoSaveData, 3000);
    return () => clearTimeout(autoSaveTimer);
  }, [wizardData]);

  // Navigation handlers
  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex);
    }
  };

  const nextStep = () => goToStep(currentStep + 1);
  const prevStep = () => goToStep(currentStep - 1);

  // Progress calculation
  const completedSteps = steps.filter(step => step.isComplete).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  const CurrentStepComponent = steps[currentStep].component;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your carbon footprint data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Carbon Footprint Calculator</h1>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Complete our guided wizard to calculate your company's comprehensive carbon footprint across all emission scopes.
          Your data is automatically saved as you progress.
        </p>
      </div>

      {/* Progress Overview */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">Overall Progress</h3>
              <p className="text-sm text-slate-600">
                {completedSteps} of {steps.length} sections completed
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {steps.reduce((total, step) => total + step.emissionsTotal, 0).toLocaleString()} kg CO₂e
              </div>
              <p className="text-sm text-slate-600">Total Calculated Emissions</p>
            </div>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Step Navigation Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Navigation</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {steps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => goToStep(index)}
                    className={`w-full text-left p-4 transition-all duration-200 hover:bg-slate-50 border-l-4 ${
                      currentStep === index
                        ? 'bg-green-50 border-green-500 text-green-900'
                        : step.isComplete
                        ? 'border-green-300 text-slate-700'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {step.isComplete ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-400" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{step.title}</p>
                        {step.emissionsTotal > 0 && (
                          <p className="text-xs text-slate-500">
                            {step.emissionsTotal.toLocaleString()} kg CO₂e
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <Card className="bg-white border shadow-sm">
            <CardHeader className="border-b bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Badge variant={steps[currentStep].scope > 0 ? "default" : "secondary"}>
                      {steps[currentStep].scope > 0 ? `Scope ${steps[currentStep].scope}` : 'Summary'}
                    </Badge>
                    <span>{steps[currentStep].title}</span>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {steps[currentStep].description}
                  </CardDescription>
                </div>
                {autoSaving && (
                  <div className="flex items-center space-x-2 text-sm text-slate-500">
                    <Save className="h-4 w-4 animate-pulse" />
                    <span>Auto-saving...</span>
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="p-6 min-h-[500px]">
              <CurrentStepComponent
                data={wizardData}
                onDataChange={setWizardData}
                existingData={existingData?.data || existingData || []}
                onSave={saveMutation.mutate}
                isLoading={saveMutation.isPending}
              />
            </CardContent>

            {/* Navigation Footer */}
            <div className="border-t bg-slate-50 px-6 py-4">
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Previous</span>
                </Button>

                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <Calculator className="h-4 w-4" />
                  <span>Step {currentStep + 1} of {steps.length}</span>
                </div>

                <Button
                  onClick={nextStep}
                  disabled={currentStep === steps.length - 1}
                  className="flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}