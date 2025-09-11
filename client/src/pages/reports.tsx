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
import { FileText, Download, Clock, CheckCircle, XCircle, AlertCircle, Plus, BarChart3, TrendingUp, Calendar, Award, Leaf, Trash2 } from "lucide-react";
import { InlineEditableTitle } from "@/components/ui/inline-editable-title";
import { EnhancedReportButton } from "@/components/EnhancedReportButton";
import { ReportProgressTracker } from "@/components/reports/ReportProgressTracker";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Reports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingReportId, setGeneratingReportId] = useState<number | null>(null);

  const { data: reports, isLoading: reportsLoading, error: reportsError } = useQuery({
    queryKey: ["/api/reports"],
    retry: false,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache data
    enabled: isAuthenticated, // Only run when authenticated
  });


  // Fetch guided sustainability reports
  const { data: guidedReports, isLoading: guidedReportsLoading } = useQuery({
    queryKey: ["/api/reports/guided"],
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch report templates (drafts)
  const { data: reportTemplates, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/report-templates"],
    retry: false,
    staleTime: 0,
    gcTime: 0,
    enabled: isAuthenticated,
  });

  // Ensure reports is always an array to prevent TypeScript errors
  const reportsData = Array.isArray(reports) ? reports : [];

  // Filter different report types from the main reports data
  const lcaReports = reportsData.filter((report: any) => report.reportType === 'lca');
  const lcaReportsData = lcaReports; // For compatibility with existing code

  // Filter published report templates for Sustainability Reports section
  const publishedTemplates = Array.isArray(reportTemplates) 
    ? reportTemplates.filter((template: any) => template.status === 'published')
    : [];
  
  // Filter draft templates only
  const draftTemplates = Array.isArray(reportTemplates) 
    ? reportTemplates.filter((template: any) => template.status === 'draft')
    : [];


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

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      const response = await apiRequest("DELETE", `/api/reports/${reportId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({
        title: "Report Deleted",
        description: "The report has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      console.error('Error deleting report:', error);
      toast({
        title: "Delete Failed",
        description: "There was an error deleting the report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteReport = (reportId: number) => {
    if (window.confirm("Are you sure you want to delete this report? This action cannot be undone.")) {
      deleteReportMutation.mutate(reportId);
    }
  };

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await apiRequest("DELETE", `/api/report-templates/${templateId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      toast({
        title: "Draft Deleted",
        description: "The draft report has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      console.error('Error deleting template:', error);
      toast({
        title: "Delete Failed",
        description: "There was an error deleting the draft. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteTemplate = (templateId: number) => {
    if (window.confirm("Are you sure you want to delete this draft? This action cannot be undone.")) {
      deleteTemplateMutation.mutate(templateId);
    }
  };

  // Update template title mutation with optimistic updates
  const updateTemplateTitle = useMutation({
    mutationFn: async ({ templateId, newTitle }: { templateId: number; newTitle: string }) => {
      const response = await apiRequest("PATCH", `/api/report-templates/${templateId}`, {
        reportTitle: newTitle
      });
      return response.json();
    },
    onMutate: async ({ templateId, newTitle }) => {
      // Cancel outgoing refetches to avoid optimistic update conflicts
      await queryClient.cancelQueries({ queryKey: ["/api/report-templates"] });
      
      // Snapshot previous value for rollback
      const previousTemplates = queryClient.getQueryData(["/api/report-templates"]);
      
      // Optimistically update the cache
      queryClient.setQueryData(["/api/report-templates"], (old: any) => {
        if (!Array.isArray(old)) return old;
        
        return old.map((template: any) => {
          if (template.id === templateId) {
            return {
              ...template,
              reportTitle: newTitle,
              lastSaved: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
          }
          return template;
        });
      });
      
      // Return context with previous data for potential rollback
      return { previousTemplates };
    },
    onError: (error: any, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousTemplates) {
        queryClient.setQueryData(["/api/report-templates"], context.previousTemplates);
      }
      
      console.error('Error updating template title:', error);
      toast({
        title: "Update Failed",
        description: "There was an error updating the report title. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Title Updated",
        description: "The report title has been successfully updated.",
      });
    },
    onSettled: () => {
      // Always invalidate to ensure we have the latest server state
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
    },
  });

  const handleUpdateTitle = async (templateId: number, newTitle: string) => {
    await updateTemplateTitle.mutateAsync({ templateId, newTitle });
  };





  const handleProgressComplete = () => {
    setGeneratingReportId(null);
    queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    toast({
      title: "Report Generated Successfully",
      description: "Your sustainability report has been completed using live data from your account.",
    });
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
  const guidedReportsData = Array.isArray(guidedReports) ? guidedReports : [];
  

  return (
    <div className="flex min-h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="Reports" subtitle="Manage your sustainability and LCA reports" />
        <main className="flex-1 p-6 space-y-8">
          
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Award className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-600">Sustainability Reports</p>
                    <p className="text-2xl font-bold text-green-900">{guidedReportsData.length + publishedTemplates.length}</p>
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
                    <p className="text-2xl font-bold text-blue-900">{lcaReports.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center">
            <Button 
              onClick={() => setLocation('/app/reports/create')}
              className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Report
            </Button>
          </div>

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
            
            {guidedReportsLoading || templatesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="grid gap-4">
                {/* Show guided reports first */}
                {guidedReportsData.map((report: any) => (
                  <Card key={`guided-${report.id}`} className="group hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-green-300">
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
                        <Badge className="bg-green-100 text-green-700 border-green-200">Published</Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-4">
                        <p className="mb-2">Report Type: <span className="font-medium text-gray-800">Guided Sustainability</span></p>
                        {report.selectedInitiatives && report.selectedInitiatives.length > 0 && (
                          <p>Selected Initiatives: <span className="font-medium text-gray-800">{report.selectedInitiatives.length}</span></p>
                        )}
                      </div>

                      <div className="flex space-x-2 pt-4 border-t border-gray-100">
                        <Button
                          onClick={() => setLocation(`/app/guided-report/${report.id}`)}
                          variant="outline"
                          size="sm"
                          className="border-green-500 text-green-600 hover:bg-green-50"
                        >
                          View Report
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Show published dynamic reports */}
                {publishedTemplates.map((template: any) => (
                  <Card key={`published-${template.id}`} className="group hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-green-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-green-50 rounded-full">
                            <FileText className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <InlineEditableTitle
                              title={template.reportTitle || template.templateName}
                              onSave={(newTitle) => handleUpdateTitle(template.id, newTitle)}
                              isLoading={updateTemplateTitle.isPending}
                              templateId={template.id}
                              className="font-semibold text-lg text-gray-900"
                            />
                            <p className="text-sm text-gray-500 flex items-center mt-1">
                              <Calendar className="w-4 h-4 mr-1" />
                              Published {new Date(template.updatedAt || template.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Audience: {template.audienceType} • {template.blocks?.length || 0} blocks
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-700 border-green-200">Published</Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-4">
                        <p>Report Type: <span className="font-medium text-gray-800">Dynamic Report Builder</span></p>
                      </div>

                      <div className="flex space-x-2 pt-4 border-t border-gray-100">
                        <Button
                          onClick={() => setLocation(`/app/report-builder?template=${template.id}&mode=view`)}
                          variant="outline"
                          size="sm"
                          className="border-green-500 text-green-600 hover:bg-green-50"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          View Report
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Show empty state only if no reports at all */}
                {guidedReportsData.length === 0 && publishedTemplates.length === 0 && (
                  <Card className="border-2 border-dashed border-gray-300">
                    <CardContent className="py-12 text-center">
                      <div className="p-4 bg-green-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                        <Award className="w-10 h-10 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sustainability Reports Yet</h3>
                      <p className="text-gray-600 mb-4">
                        Create your first sustainability report to showcase your environmental impact.
                      </p>
                      <Button
                        onClick={() => setLocation('/app/report-builder')}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Report
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Draft Templates Section */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-amber-100 rounded-lg">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Draft Reports</h2>
            </div>
            
            {templatesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="grid gap-4">
                {draftTemplates.length > 0 ? (
                  draftTemplates.map((template: any) => (
                    <Card key={template.id} className="group hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-amber-300">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-amber-50 rounded-full">
                              <FileText className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <InlineEditableTitle
                                title={template.reportTitle || template.templateName}
                                onSave={(newTitle) => handleUpdateTitle(template.id, newTitle)}
                                isLoading={updateTemplateTitle.isPending}
                                templateId={template.id}
                                className="font-semibold text-lg text-gray-900"
                              />
                              <p className="text-sm text-gray-500 flex items-center mt-1">
                                <Calendar className="w-4 h-4 mr-1" />
                                Last saved {new Date(template.lastSaved || template.createdAt).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                Audience: {template.audienceType} • {template.blocks?.length || 0} blocks
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                            Draft
                          </Badge>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex space-x-2 pt-4 border-t border-gray-100">
                          <Button
                            onClick={() => setLocation(`/app/report-builder?template=${template.id}`)}
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Continue Editing
                          </Button>
                          <Button
                            onClick={() => handleDeleteTemplate(template.id)}
                            variant="outline"
                            size="sm"
                            className="border-red-500 text-red-600 hover:bg-red-50"
                            disabled={deleteTemplateMutation?.isPending}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Draft
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="border-2 border-dashed border-gray-300">
                    <CardContent className="py-12 text-center">
                      <div className="p-4 bg-amber-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                        <FileText className="w-10 h-10 text-amber-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Draft Reports Yet</h3>
                      <p className="text-gray-600 mb-4">
                        Create and save draft reports using the Report Builder to see them here.
                      </p>
                      <Button
                        onClick={() => setLocation('/app/report-builder')}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Draft Report
                      </Button>
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
            
            {reportsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="grid gap-4">
                {lcaReports.length > 0 ? (
                  lcaReports.map((report: any) => (
                    <Card key={report.id} className="group hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-blue-300">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-blue-50 rounded-full">
                              <BarChart3 className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-gray-900">
                                LCA Report #{report.id}
                              </h3>
                              <p className="text-sm text-gray-500 flex items-center mt-1">
                                <Calendar className="w-4 h-4 mr-1" />
                                Created {new Date(report.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(report.status)}
                        </div>

                        {/* Environmental Metrics */}
                        {report.status === 'completed' && (
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                              <div className="text-lg font-bold text-green-700">
                                {parseFloat(report.totalCarbonFootprint || 0).toFixed(2)}
                              </div>
                              <div className="text-sm text-green-600">tonnes CO₂e</div>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <div className="text-lg font-bold text-blue-700">
                                {Math.round(parseFloat(report.totalWaterUsage || 0)).toLocaleString()}
                              </div>
                              <div className="text-sm text-blue-600">L water</div>
                            </div>
                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                              <div className="text-lg font-bold text-amber-700">
                                {Math.round(parseFloat(report.totalWasteGenerated || 0)).toLocaleString()}
                              </div>
                              <div className="text-sm text-amber-600">kg waste</div>
                            </div>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="flex space-x-2 pt-4 border-t border-gray-100">
                          {report.status === 'completed' && report.pdfFilePath && (
                            <Button
                              onClick={() => window.open(`/api/reports/${report.id}/download-lca`, '_blank')}
                              variant="outline"
                              size="sm"
                              className="border-blue-500 text-blue-600 hover:bg-blue-50"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download PDF
                            </Button>
                          )}
                          <Button
                            onClick={() => handleDeleteReport(report.id)}
                            variant="outline"
                            size="sm"
                            className="border-red-500 text-red-600 hover:bg-red-50"
                            disabled={deleteReportMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {deleteReportMutation.isPending ? 'Deleting...' : 'Delete'}
                          </Button>
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
                      <Button
                        onClick={() => setLocation('/app/reports/create')}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First LCA Report
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}