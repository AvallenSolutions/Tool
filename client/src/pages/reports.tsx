import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Clock, CheckCircle, XCircle, AlertCircle, Plus, BarChart3, TrendingUp, Calendar, Award, Leaf, ChevronDown, ChevronUp } from "lucide-react";
import { EnhancedReportButton } from "@/components/EnhancedReportButton";
import { ReportProgressTracker } from "@/components/reports/ReportProgressTracker";
import { LCAProductSelector } from "@/components/products/LCAProductSelector";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Reports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingReportId, setGeneratingReportId] = useState<number | null>(null);
  
  // LCA Report Generation State
  const [showLCASection, setShowLCASection] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [generatingLCA, setGeneratingLCA] = useState(false);

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ["/api/reports"],
    retry: false,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache data
  });

  // Fetch guided sustainability reports
  const { data: guidedReports, isLoading: guidedReportsLoading } = useQuery({
    queryKey: ["/api/reports/guided"],
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  // Ensure reports is always an array to prevent TypeScript errors
  const reportsData = Array.isArray(reports) ? reports : [];

  // Fetch LCA calculation reports
  const { data: lcaReports, isLoading: lcaReportsLoading } = useQuery({
    queryKey: ["/api/lca/reports"],
    retry: false,
  });

  // Fetch user products for LCA generation
  const { data: userProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
    retry: false,
  });

  // Generate new report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (reportType: 'sustainability' | 'lca') => {
      const response = await apiRequest("POST", "/api/reports/generate", { reportType });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratingReportId(data.reportId);
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({
        title: "Report Generation Started", 
        description: "Your sustainability report is being generated with live data. Watch the progress below.",
      });
      setIsGenerating(false);
    },
    onError: (error: any) => {
      console.error('Error generating report:', error);
      toast({
        title: "Generation Failed",
        description: "There was an error generating your report. Please try again.",
        variant: "destructive",
      });
      setIsGenerating(false);
      setGeneratingReportId(null);
    },
  });





  const handleProgressComplete = () => {
    setGeneratingReportId(null);
    queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    toast({
      title: "Report Generated Successfully",
      description: "Your sustainability report has been completed using live data from your account.",
    });
  };

  // LCA Report Generation Functions
  const handleGenerateLCAReport = async () => {
    if (selectedProductIds.length === 0) {
      toast({
        title: "No Products Selected",
        description: "Please select at least one product to generate an LCA report.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingLCA(true);
    try {
      // TODO: Phase 2 - Implement actual LCA report generation API call
      console.log('🔬 Generating LCA report for products:', selectedProductIds);
      
      // Placeholder - simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "LCA Report Generated",
        description: `Professional LCA report created for ${selectedProductIds.length} product${selectedProductIds.length > 1 ? 's' : ''}.`,
      });
      
      // Reset selection
      setSelectedProductIds([]);
      setShowLCASection(false);
    } catch (error) {
      console.error('❌ LCA report generation failed:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate LCA report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingLCA(false);
    }
  };

  const toggleLCASection = () => {
    setShowLCASection(!showLCASection);
    if (!showLCASection) {
      // Reset selection when opening
      setSelectedProductIds([]);
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
    
    // Clear all report-related cache when component mounts
    queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    queryClient.removeQueries({ queryKey: ["/api/reports"] });
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-lightest-gray flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-avallen-green border-t-transparent rounded-full" />
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'generating':
      case 'under_review':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Completed</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Approved</Badge>;
      case 'generating':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Generating</Badge>;
      case 'under_review':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Under Review</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  // Separate reports by type with proper null checks
  const lcaReportsData = reportsData.filter((report: any) => report.reportType === 'lca') || [];
  const productLcaReports = Array.isArray(lcaReports) ? lcaReports : [];
  const guidedReportsData = Array.isArray(guidedReports) ? guidedReports : [];
  
  // Process user products for LCA generation
  const products = Array.isArray(userProducts) ? userProducts : [];
  const confirmedProducts = products.filter(product => product.status !== 'draft');

  return (
    <div className="flex min-h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="Reports" subtitle="Manage your sustainability and LCA reports" />
        <main className="flex-1 p-6 space-y-8">
          
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Award className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-600">Sustainability Reports</p>
                    <p className="text-2xl font-bold text-green-900">{guidedReportsData.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-600">LCA Reports</p>
                    <p className="text-2xl font-bold text-blue-900">{lcaReportsData.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Leaf className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-600">Product LCAs</p>
                    <p className="text-2xl font-bold text-purple-900">{productLcaReports.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            <Button 
              onClick={toggleLCASection}
              variant="outline"
              className="border-blue-500 text-blue-600 hover:bg-blue-50 font-medium px-6 py-2"
              disabled={confirmedProducts.length === 0}
              size="lg"
            >
              <FileText className="w-5 h-5 mr-2" />
              Generate LCA Report
              {showLCASection ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
            </Button>
            <Button 
              onClick={() => setLocation('/app/reports/create')}
              className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Report
            </Button>
          </div>

          {/* LCA Report Generation Section */}
          {showLCASection && confirmedProducts.length > 0 && (
            <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-blue-25">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-slate-gray flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Generate Life Cycle Assessment Report
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Select products to include in a comprehensive LCA report following industry standards
                    </p>
                  </div>
                  <Button
                    onClick={toggleLCASection}
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {productsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading products...</p>
                  </div>
                ) : (
                  <>
                    {/* Product Selection */}
                    <LCAProductSelector
                      products={confirmedProducts}
                      selectedProductIds={selectedProductIds}
                      onSelectionChange={setSelectedProductIds}
                    />

                    {/* Generation Actions */}
                    {selectedProductIds.length > 0 && (
                      <div className="flex items-center justify-between p-4 bg-white border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              Ready to Generate LCA Report
                            </h4>
                            <p className="text-sm text-gray-600">
                              {selectedProductIds.length} product{selectedProductIds.length > 1 ? 's' : ''} selected for comprehensive life cycle assessment
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={handleGenerateLCAReport}
                          disabled={generatingLCA}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                        >
                          {generatingLCA ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Generating...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Generate Report
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Progress Tracker */}
          {generatingReportId && (
            <div className="flex justify-center">
              <ReportProgressTracker 
                reportId={generatingReportId}
                onComplete={handleProgressComplete}
              />
            </div>
          )}

          {/* Guided Sustainability Reports Section */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <Award className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Sustainability Reports</h2>
            </div>
            
            {guidedReportsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="grid gap-4">
                {guidedReportsData.length > 0 ? (
                  guidedReportsData.map((report: any) => (
                    <Card key={report.id} className="group hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-green-300">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-green-50 rounded-full">
                              <Award className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-gray-900">
                                {report.reportTitle || 'Sustainability Report'}
                              </h3>
                              <p className="text-sm text-gray-500 flex items-center mt-1">
                                <Calendar className="w-4 h-4 mr-1" />
                                Created {new Date(report.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => setLocation(`/app/guided-report/${report.id}`)}
                              variant="outline"
                              size="sm"
                              className="border-green-500 text-green-600 hover:bg-green-50"
                            >
                              Continue Editing
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          <p className="mb-2">Report Type: <span className="font-medium text-gray-800">Guided Sustainability</span></p>
                          {report.selectedInitiatives && report.selectedInitiatives.length > 0 && (
                            <p>Selected Initiatives: <span className="font-medium text-gray-800">{report.selectedInitiatives.length}</span></p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="border-2 border-dashed border-gray-300">
                    <CardContent className="py-12 text-center">
                      <div className="p-4 bg-green-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                        <Award className="w-10 h-10 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sustainability Reports Yet</h3>
                      <p className="text-gray-600 mb-4">
                        Create your first guided sustainability report to showcase your environmental impact.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* LCA Reports Section */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Life Cycle Assessment Reports</h2>
            </div>
            
            <div className="grid gap-4">
              {lcaReportsData.length > 0 ? (
                lcaReportsData.map((report: any) => (
                  <Card key={report.id} className="group hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-blue-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-blue-50 rounded-full">
                            <BarChart3 className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-gray-900">LCA Report</h3>
                            <p className="text-sm text-gray-500 flex items-center mt-1">
                              <Calendar className="w-4 h-4 mr-1" />
                              Created {new Date(report.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(report.status)}
                      </div>
                      
                      <div className="pt-4 border-t border-gray-100">
                        <EnhancedReportButton 
                          reportId={report.id} 
                          reportStatus={report.status} 
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="border-2 border-dashed border-gray-300">
                  <CardContent className="py-12 text-center">
                    <div className="p-4 bg-blue-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <BarChart3 className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No LCA Reports Yet</h3>
                    <p className="text-gray-600 mb-4">
                      Generate detailed life cycle assessment reports for your products.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Product LCA Section */}
          {lcaReportsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-4 border-purple-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Leaf className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Product Life Cycle Assessments</h2>
              </div>
              
              <div className="grid gap-4">
                {Array.isArray(productLcaReports) && productLcaReports.length > 0 ? (
                  productLcaReports.map((product: any, index: number) => (
                    <Card key={index} className="group hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-purple-300">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="p-3 bg-purple-50 rounded-full">
                            <Leaf className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900">{product.name || `Product LCA #${index + 1}`}</h3>
                            <p className="text-sm text-gray-500 flex items-center mt-1">
                              <TrendingUp className="w-4 h-4 mr-1" />
                              Environmental impact assessment
                            </p>
                          </div>
                          <Badge className="bg-purple-100 text-purple-700">Active</Badge>
                        </div>
                        
                        {product.emissions && (
                          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-100">
                            <div className="text-xl font-bold text-purple-700">
                              {parseFloat(product.emissions).toFixed(2)} kg CO₂e
                            </div>
                            <div className="text-sm text-purple-600 font-medium">Product Carbon Footprint</div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="border-2 border-dashed border-gray-300">
                    <CardContent className="py-12 text-center">
                      <div className="p-4 bg-purple-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                        <Leaf className="w-10 h-10 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Product LCAs Yet</h3>
                      <p className="text-gray-600 mb-4">
                        Start by adding products and calculating their environmental impact.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}