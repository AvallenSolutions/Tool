import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { EnhancedReportButton } from "@/components/EnhancedReportButton";

export default function Reports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ["/api/reports"],
    retry: false,
  });

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

  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Reports" subtitle="Manage your sustainability reports" />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="mb-6">
            <Button className="bg-avallen-green hover:bg-avallen-green-light text-white">
              <FileText className="w-4 h-4 mr-2" />
              Generate New Report
            </Button>
          </div>

          {reportsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-avallen-green border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="grid gap-6">
              {reports && reports.length > 0 ? (
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
                    <Button className="bg-avallen-green hover:bg-avallen-green-light text-white">
                      Generate Report
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
