import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wand2, BarChart3, Award, Clock, Sparkles, FileText, Target } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ReportsCreate() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);

  // Create guided report mutation
  const createGuidedReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/reports/guided/create", {});
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Guided report creation response:', data);
      toast({
        title: "Guided Report Created",
        description: "Your guided report wizard is ready. Start building your sustainability report.",
      });
      setLocation(`/app/guided-report/${data.data.id}`);
    },
    onError: (error: any) => {
      console.error('Error creating guided report:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create guided report. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate LCA report mutation
  const generateLcaReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/reports/generate", { reportType: 'lca' });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "LCA Report Generation Started", 
        description: "Your LCA report is being generated with live data.",
      });
      setIsGenerating(false);
      // Redirect to view reports to see the generated report
      setLocation('/app/reports');
    },
    onError: (error: any) => {
      console.error('Error generating LCA report:', error);
      toast({
        title: "Generation Failed",
        description: "There was an error generating your LCA report. Please try again.",
        variant: "destructive",
      });
      setIsGenerating(false);
    },
  });

  const handleGenerateLcaReport = async () => {
    setIsGenerating(true);
    generateLcaReportMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-lightest-gray flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-avallen-green border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="Create Reports" subtitle="Generate new sustainability and LCA reports" />
        <main className="flex-1 p-6 overflow-y-auto space-y-8">
          
          {/* Hero Section */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-8 border border-green-200">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-bold text-green-900 mb-4">Create Professional Reports</h1>
              <p className="text-lg text-green-700 mb-6">
                Generate comprehensive sustainability reports and Life Cycle Assessments using our guided tools and real environmental data.
              </p>
            </div>
          </div>

          {/* Report Creation Options */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Guided Sustainability Report */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-2 border-purple-200 hover:border-purple-400">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Wand2 className="w-8 h-8 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-purple-900">Guided Sustainability Report</CardTitle>
                    <CardDescription className="text-purple-600">
                      Step-by-step wizard with templates and AI assistance
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span>Multiple professional templates</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Target className="w-4 h-4 text-purple-500" />
                    <span>SMART Goals integration</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4 text-purple-500" />
                    <span>PDF, PowerPoint & Google Slides export</span>
                  </div>
                </div>
                
                <Button 
                  onClick={() => createGuidedReportMutation.mutate()}
                  disabled={createGuidedReportMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  size="lg"
                >
                  {createGuidedReportMutation.isPending ? (
                    <>
                      <Clock className="w-5 h-5 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5 mr-2" />
                      Start Guided Report
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* LCA Report */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-2 border-blue-200 hover:border-blue-400">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <BarChart3 className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-blue-900">Life Cycle Assessment</CardTitle>
                    <CardDescription className="text-blue-600">
                      Detailed environmental impact analysis
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <span>Comprehensive impact assessment</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Award className="w-4 h-4 text-blue-500" />
                    <span>ISO-compliant methodology</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span>Professional PDF export</span>
                  </div>
                </div>
                
                <Button 
                  onClick={handleGenerateLcaReport}
                  disabled={isGenerating || generateLcaReportMutation.isPending}
                  variant="outline"
                  className="w-full border-2 border-blue-500 text-blue-600 hover:bg-blue-50 shadow-md hover:shadow-lg transition-all duration-200"
                  size="lg"
                >
                  {isGenerating || generateLcaReportMutation.isPending ? (
                    <>
                      <Clock className="w-5 h-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Generate LCA Report
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

          </div>

          {/* Information Section */}
          <Card className="bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Guided Reports</h4>
                  <p>Perfect for comprehensive sustainability reporting with multiple templates, narrative writing assistance, and professional export options.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">LCA Reports</h4>
                  <p>Ideal for detailed environmental impact assessments using your product data and ISO-compliant calculation methods.</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </main>
      </div>
    </div>
  );
}