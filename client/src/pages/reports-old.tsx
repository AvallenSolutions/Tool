import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Clock, CheckCircle, XCircle, AlertCircle, Plus, BarChart3, TrendingUp, Calendar, Award, Leaf } from "lucide-react";
import { EnhancedReportButton } from "@/components/EnhancedReportButton";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Reports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ["/api/reports"],
    retry: false,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache data
  });

  // Fetch LCA calculation reports
  const { data: lcaReports, isLoading: lcaReportsLoading } = useQuery({
    queryKey: ["/api/lca/reports"],
    retry: false,
  });

  // Generate new report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (reportType: 'sustainability' | 'lca') => {
      const response = await apiRequest("POST", "/api/reports/generate", { reportType });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({
        title: "Report Generation Started",
        description: "Your sustainability report is being generated. This may take a few minutes.",
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
    },
  });

  const handleGenerateReport = async (reportType: 'sustainability' | 'lca' = 'sustainability') => {
    setIsGenerating(true);
    generateReportMutation.mutate(reportType);
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
        return <CheckCircle className="w-5 h-5 text-success-green" />;
      case 'generating':
      case 'under_review':
        return <Clock className="w-5 h-5 text-muted-gold" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-error-red" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success-green/20 text-success-green">Completed</Badge>;
      case 'approved':
        return <Badge className="bg-success-green/20 text-success-green">Approved</Badge>;
      case 'generating':
        return <Badge className="bg-muted-gold/20 text-muted-gold">Generating</Badge>;
      case 'under_review':
        return <Badge className="bg-muted-gold/20 text-muted-gold">Under Review</Badge>;
      case 'rejected':
        return <Badge className="bg-error-red/20 text-error-red">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  // Separate reports by type
  const annualReports = reports?.filter((report: any) => report.reportType === 'annual') || [];
  const lcaReportsData = reports?.filter((report: any) => report.reportType === 'lca') || [];
  const productLcaReports = lcaReports || [];

  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Reports" subtitle="Manage your sustainability and LCA reports" />
        <main className="flex-1 p-6 overflow-y-auto space-y-8">
          
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Award className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-600">Annual Reports</p>
                    <p className="text-2xl font-bold text-green-900">{annualReports.length}</p>
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
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={() => handleGenerateReport('sustainability')}
              disabled={isGenerating || generateReportMutation.isPending}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Clock className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Award className="w-5 h-5 mr-2" />
                  Generate Annual Report
                </>
              )}
            </Button>
            <Button 
              onClick={() => handleGenerateReport('lca')}
              disabled={isGenerating || generateReportMutation.isPending}
              variant="outline"
              className="border-2 border-blue-500 text-blue-600 hover:bg-blue-50 shadow-md hover:shadow-lg transition-all duration-200"
              size="lg"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              Generate LCA Report
            </Button>
          </div>

          {reportsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-avallen-green border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="grid gap-6">
              {reports && Array.isArray(reports) && reports.length > 0 ? (
                reports.map((report: any) => (
                  <Card key={report.id} className="border-light-gray">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(report.status)}
                          <div>
                            <CardTitle className="text-slate-gray">
                              {report.reportType === 'quarterly' ? 'Quarterly' : 'Annual'} Report
                            </CardTitle>
                            <p className="text-sm text-gray-500">
                              {report.reportingPeriodStart} - {report.reportingPeriodEnd}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(report.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-4 bg-lightest-gray rounded-lg">
                          <div className="text-2xl font-bold text-slate-gray">
                            {report.totalScope1 + report.totalScope2 + report.totalScope3 || 0}
                          </div>
                          <div className="text-sm text-gray-600">Total CO2e (tonnes)</div>
                        </div>
                        <div className="text-center p-4 bg-lightest-gray rounded-lg">
                          <div className="text-2xl font-bold text-slate-gray">
                            {report.totalWaterUsage || 0}
                          </div>
                          <div className="text-sm text-gray-600">Water Usage (L)</div>
                        </div>
                        <div className="text-center p-4 bg-lightest-gray rounded-lg">
                          <div className="text-2xl font-bold text-slate-gray">
                            {report.totalWasteGenerated || 0}
                          </div>
                          <div className="text-sm text-gray-600">Waste Generated (kg)</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Created: {new Date(report.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex space-x-2">
                          {report.status === 'approved' && (
                            <Button size="sm" className="bg-avallen-green hover:bg-avallen-green-light text-white">
                              <Download className="w-4 h-4 mr-2" />
                              Download PDF
                            </Button>
                          )}
                          {report.status === 'completed' && !report.reviewRequested && (
                            <Button size="sm" variant="outline" className="border-slate-gray text-slate-gray">
                              Request Review
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Enhanced Report Section */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <EnhancedReportButton 
                          reportId={report.id} 
                          reportStatus={report.status} 
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="border-light-gray">
                  <CardContent className="py-12 text-center">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-gray mb-2">No reports yet</h3>
                    <p className="text-gray-600 mb-4">
                      Generate your first sustainability report to get started.
                    </p>
                    <Button 
                      onClick={() => handleGenerateReport('sustainability')}
                      disabled={isGenerating || generateReportMutation.isPending}
                      className="bg-avallen-green hover:bg-avallen-green-light text-white"
                    >
                      {isGenerating ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Generate Report
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* LCA Calculation Reports Section */}
              {lcaReports && Array.isArray(lcaReports) && lcaReports.length > 0 && (
                <div className="mt-8">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-slate-gray mb-2">LCA Calculation Reports</h2>
                    <p className="text-gray-600">Product-specific environmental impact calculations</p>
                  </div>
                  <div className="grid gap-4">
                    {lcaReports.map((lcaReport: any) => (
                      <Card key={lcaReport.jobId} className="border-light-gray">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {getStatusIcon(lcaReport.status)}
                              <div>
                                <CardTitle className="text-slate-gray">
                                  {lcaReport.productName || `Product ID: ${lcaReport.productId}`}
                                </CardTitle>
                                <p className="text-sm text-gray-500">
                                  LCA Calculation • Job ID: {lcaReport.jobId}
                                </p>
                              </div>
                            </div>
                            {getStatusBadge(lcaReport.status)}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {lcaReport.results && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="text-center p-4 bg-green-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">
                                  {lcaReport.results.carbonFootprint?.toFixed(2) || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-600">kg CO₂e</div>
                              </div>
                              <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">
                                  {lcaReport.results.waterFootprint?.toFixed(2) || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-600">Liters</div>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                              Calculated: {new Date(lcaReport.createdAt).toLocaleDateString()}
                            </div>
                            <div className="flex space-x-2">
                              {lcaReport.status === 'completed' && (
                                <Button size="sm" className="bg-avallen-green hover:bg-avallen-green-light text-white">
                                  <Download className="w-4 h-4 mr-2" />
                                  Download PDF
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
