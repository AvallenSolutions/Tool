import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Eye, 
  FileText, 
  Building2, 
  BarChart3, 
  Leaf, 
  Target, 
  TrendingUp, 
  CheckCircle2 
} from "lucide-react";

// Step configuration
const WIZARD_STEPS = [
  {
    id: 1,
    key: "introduction",
    title: "Introduction",
    subtitle: "Set the tone for your sustainability report",
    icon: FileText,
    description: "Introduce your company's sustainability journey and commitment"
  },
  {
    id: 2,
    key: "company_info_narrative",
    title: "Company Information",
    subtitle: "Tell your company's story",
    icon: Building2,
    description: "Share your mission, vision, and sustainability approach"
  },
  {
    id: 3,
    key: "key_metrics_narrative",
    title: "Key Metrics",
    subtitle: "Highlight your environmental impact",
    icon: BarChart3,
    description: "Present your carbon footprint, water usage, and waste data"
  },
  {
    id: 4,
    key: "carbon_footprint_narrative",
    title: "Carbon Footprint Analysis",
    subtitle: "Detail your emissions breakdown",
    icon: Leaf,
    description: "Explain your Scope 1, 2, and 3 emissions in context"
  },
  {
    id: 5,
    key: "initiatives_narrative",
    title: "Sustainability Initiatives",
    subtitle: "Showcase your impact projects",
    icon: Target,
    description: "Describe your environmental projects and their outcomes"
  },
  {
    id: 6,
    key: "kpi_tracking_narrative",
    title: "KPI Tracking",
    subtitle: "Present your progress metrics",
    icon: TrendingUp,
    description: "Show how you measure and track sustainability progress"
  },
  {
    id: 7,
    key: "summary",
    title: "Summary & Future Goals",
    subtitle: "Conclude with next steps",
    icon: CheckCircle2,
    description: "Summarize achievements and outline future commitments"
  }
];

interface GuidedReportWizardProps {}

export default function GuidedReportWizard({}: GuidedReportWizardProps) {
  const [match, params] = useRoute("/guided-report/:reportId");
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [stepContent, setStepContent] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  const reportId = params?.reportId;

  // Query to get wizard data
  const { data: wizardData, isLoading } = useQuery({
    queryKey: [`/api/reports/guided/${reportId}/wizard-data`],
    enabled: !!reportId
  });

  // Initialize step content from existing report data
  useEffect(() => {
    if (wizardData && typeof wizardData === 'object' && 'success' in wizardData && 'data' in wizardData && wizardData.success && wizardData.data && typeof wizardData.data === 'object' && 'report' in wizardData.data && wizardData.data.report && typeof wizardData.data.report === 'object' && 'reportContent' in wizardData.data.report) {
      setStepContent(wizardData.data.report.reportContent);
    }
  }, [wizardData]);

  // Mutation to save step content
  const saveStepMutation = useMutation({
    mutationFn: async ({ stepKey, content }: { stepKey: string; content: string }) => {
      const response = await fetch(`/api/reports/guided/${reportId}/save-step`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepKey, content }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to save step content');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Progress Saved",
        description: "Your content has been saved successfully."
      });
      queryClient.invalidateQueries({ queryKey: [`/api/reports/guided/${reportId}/wizard-data`] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save your progress.",
        variant: "destructive"
      });
    }
  });

  const handleStepContentChange = (stepKey: string, content: string) => {
    setStepContent(prev => ({
      ...prev,
      [stepKey]: content
    }));
  };

  const handleSaveStep = (stepKey: string) => {
    const content = stepContent[stepKey] || "";
    saveStepMutation.mutate({ stepKey, content });
  };

  const currentStepData = WIZARD_STEPS.find(step => step.id === currentStep);
  const currentStepKey = currentStepData?.key || "";
  const progress = (currentStep / WIZARD_STEPS.length) * 100;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-slate-50">
        <div className="text-center space-y-4">
          <div className="animate-pulse text-green-600">
            <FileText className="w-12 h-12 mx-auto mb-4" />
          </div>
          <p className="text-slate-600">Loading report wizard...</p>
        </div>
      </div>
    );
  }

  if (!wizardData || typeof wizardData !== 'object' || !('success' in wizardData) || !wizardData.success || !('data' in wizardData) || !wizardData.data || typeof wizardData.data !== 'object' || !('report' in wizardData.data) || !wizardData.data.report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-slate-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <FileText className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Report Not Found</h2>
            <p className="text-slate-600 mb-4">The requested report could not be loaded.</p>
            <Button onClick={() => setLocation("/reports")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-slate-50">
      {/* Full-screen wizard interface */}
      <div className="flex flex-col h-screen">
        
        {/* Top header */}
        <div className="bg-white border-b border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation("/reports")}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Reports
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  {(wizardData && typeof wizardData === 'object' && 'data' in wizardData && wizardData.data && typeof wizardData.data === 'object' && 'report' in wizardData.data && wizardData.data.report && typeof wizardData.data.report === 'object' && 'reportTitle' in wizardData.data.report) ? wizardData.data.report.reportTitle : 'Sustainability Report'}
                </h1>
                <p className="text-sm text-slate-600">
                  {(wizardData && typeof wizardData === 'object' && 'data' in wizardData && wizardData.data && typeof wizardData.data === 'object' && 'company' in wizardData.data && wizardData.data.company && typeof wizardData.data.company === 'object' && 'name' in wizardData.data.company) ? wizardData.data.company.name : 'Company'} - Guided Report Builder
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <span>Step {currentStep} of {WIZARD_STEPS.length}</span>
                <Progress value={progress} className="w-24 h-2" />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="hidden md:flex"
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? "Hide" : "Preview"}
              </Button>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left sidebar - Step navigation */}
          <div className="w-80 bg-white border-r border-slate-200 overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Report Sections</h2>
              <div className="space-y-3">
                {WIZARD_STEPS.map((step) => {
                  const IconComponent = step.icon;
                  const isActive = step.id === currentStep;
                  const isCompleted = stepContent[step.key]?.trim().length > 0;
                  
                  return (
                    <div
                      key={step.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        isActive 
                          ? "border-green-500 bg-green-50 shadow-sm" 
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      onClick={() => setCurrentStep(step.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${
                          isActive ? "bg-green-100" : "bg-slate-100"
                        }`}>
                          <IconComponent className={`w-5 h-5 ${
                            isActive ? "text-green-600" : "text-slate-600"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className={`font-medium text-sm ${
                              isActive ? "text-green-900" : "text-slate-900"
                            }`}>
                              {step.title}
                            </h3>
                            {isCompleted && (
                              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {step.description}
                          </p>
                          {isActive && (
                            <Badge variant="secondary" className="mt-2 text-xs">
                              Current Step
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center content area - Two-panel layout */}
          <div className={`flex-1 flex ${showPreview ? "border-r border-slate-200" : ""}`}>
            
            {/* Editor panel */}
            <div className={`${showPreview ? "w-1/2" : "w-full"} flex flex-col bg-white`}>
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                      {currentStepData?.title}
                    </h2>
                    <p className="text-slate-600">
                      {currentStepData?.subtitle}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleSaveStep(currentStepKey)}
                    disabled={saveStepMutation.isPending}
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveStepMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
              
              {/* Textarea for content editing */}
              <div className="flex-1 p-6">
                <textarea
                  value={stepContent[currentStepKey] || ""}
                  onChange={(e) => handleStepContentChange(currentStepKey, e.target.value)}
                  placeholder={`Write your ${currentStepData?.title.toLowerCase()} content here...`}
                  className="w-full h-full resize-none border border-slate-200 rounded-lg p-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Preview panel */}
            {showPreview && (
              <div className="w-1/2 bg-slate-50 overflow-y-auto">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Preview</h3>
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h4 className="text-lg font-semibold text-slate-900 mb-3">
                      {currentStepData?.title}
                    </h4>
                    <div className="prose prose-slate max-w-none">
                      {stepContent[currentStepKey] ? (
                        <p className="whitespace-pre-wrap text-slate-700">
                          {stepContent[currentStepKey]}
                        </p>
                      ) : (
                        <p className="text-slate-400 italic">
                          Start writing to see your content preview...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom navigation */}
        <div className="bg-white border-t border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">
                {WIZARD_STEPS.filter(step => stepContent[step.key]?.trim().length > 0).length} of {WIZARD_STEPS.length} sections completed
              </span>
            </div>

            <Button
              onClick={() => setCurrentStep(Math.min(WIZARD_STEPS.length, currentStep + 1))}
              disabled={currentStep === WIZARD_STEPS.length}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}