import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  FileCheck, 
  AlertCircle, 
  CheckCircle, 
  Building2, 
  Calendar,
  TrendingUp,
  Activity
} from "lucide-react";

interface PendingReport {
  id: number;
  companyId: number;
  productName: string;
  status: string;
  totalCarbonFootprint?: number;
  createdAt: string;
  updatedAt: string;
  companyName?: string;
  companyOwner?: string;
}

export default function LCAApprovals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<PendingReport | null>(null);

  const { data: pendingReports, isLoading } = useQuery<PendingReport[]>({
    queryKey: ['/api/admin/reports/pending'],
    refetchInterval: 30000,
  });

  const approveReportMutation = useMutation({
    mutationFn: (reportId: number) => 
      apiRequest('PUT', `/api/admin/reports/${reportId}/approve`),
    onSuccess: () => {
      toast({
        title: "Report Approved",
        description: "LCA report has been successfully approved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reports/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
      setSelectedReport(null);
    },
    onError: (error) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve report.",
        variant: "destructive",
      });
    },
  });

  const formatCarbonFootprint = (footprint?: number) => {
    if (!footprint) return 'Not calculated';
    return `${footprint.toFixed(2)} kg CO₂eq`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_review':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Pending Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">LCA Report Approval Queue</h1>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">LCA Report Approval Queue</h1>
          <p className="text-muted-foreground">
            Review and approve pending LCA reports for publication
          </p>
        </div>
        <Badge variant={pendingReports && pendingReports.length > 0 ? "destructive" : "secondary"}>
          {pendingReports?.length || 0} pending approval
        </Badge>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {pendingReports && pendingReports.length > 0 ? (
          pendingReports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <h3 className="text-lg font-semibold">{report.productName}</h3>
                      </div>
                      {getStatusBadge(report.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>{report.companyName || 'Unknown Company'}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        <span>{formatCarbonFootprint(report.totalCarbonFootprint)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Submitted {new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        <span>Updated {new Date(report.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {report.companyOwner && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Company owner: {report.companyOwner}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedReport(report)}>
                          <FileCheck className="h-4 w-4 mr-2" />
                          Review Report
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl bg-gradient-to-br from-white to-gray-50 border shadow-2xl">
                        <DialogHeader className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6 -m-6 mb-0 rounded-t-lg">
                          <DialogTitle className="flex items-center gap-2 text-white font-bold">
                            <FileCheck className="h-5 w-5" />
                            Review LCA Report: {selectedReport?.productName}
                          </DialogTitle>
                        </DialogHeader>
                        
                        {selectedReport && (
                          <div className="space-y-6">
                            {/* Report Overview */}
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <label className="text-sm font-medium">Product Name</label>
                                <p className="mt-1 text-sm">{selectedReport.productName}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Company</label>
                                <p className="mt-1 text-sm">{selectedReport.companyName || 'Unknown'}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Status</label>
                                <div className="mt-1">
                                  {getStatusBadge(selectedReport.status)}
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Carbon Footprint</label>
                                <p className="mt-1 text-sm font-mono">
                                  {formatCarbonFootprint(selectedReport.totalCarbonFootprint)}
                                </p>
                              </div>
                            </div>

                            {/* Timeline */}
                            <div className="space-y-3">
                              <h4 className="font-medium">Report Timeline</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <span>Report Created</span>
                                  <span className="text-muted-foreground">
                                    {new Date(selectedReport.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <span>Last Updated</span>
                                  <span className="text-muted-foreground">
                                    {new Date(selectedReport.updatedAt).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Company Information */}
                            <div className="space-y-3">
                              <h4 className="font-medium">Company Information</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <label className="font-medium">Company Name</label>
                                  <p className="text-muted-foreground">{selectedReport.companyName || 'Not specified'}</p>
                                </div>
                                <div>
                                  <label className="font-medium">Company Owner</label>
                                  <p className="text-muted-foreground">{selectedReport.companyOwner || 'Not specified'}</p>
                                </div>
                              </div>
                            </div>

                            {/* LCA Metrics */}
                            <div className="space-y-3">
                              <h4 className="font-medium">LCA Assessment Summary</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 border rounded-lg">
                                  <div className="text-2xl font-bold text-green-600">
                                    {selectedReport.totalCarbonFootprint?.toFixed(2) || '0.00'}
                                  </div>
                                  <div className="text-sm text-muted-foreground">kg CO₂eq</div>
                                  <div className="text-xs text-muted-foreground mt-1">Carbon Footprint</div>
                                </div>
                                <div className="p-4 border rounded-lg">
                                  <div className="text-2xl font-bold text-blue-600">
                                    {selectedReport.status === 'pending_review' ? 'Ready' : 'N/A'}
                                  </div>
                                  <div className="text-sm text-muted-foreground">for Review</div>
                                  <div className="text-xs text-muted-foreground mt-1">Assessment Status</div>
                                </div>
                                <div className="p-4 border rounded-lg">
                                  <div className="text-2xl font-bold text-purple-600">
                                    {new Date(selectedReport.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                  </div>
                                  <div className="text-sm text-muted-foreground">Reporting Period</div>
                                  <div className="text-xs text-muted-foreground mt-1">Assessment Date</div>
                                </div>
                              </div>
                            </div>

                            {/* Review Notes */}
                            <div className="space-y-3">
                              <h4 className="font-medium">Review Guidelines</h4>
                              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                                <ul className="space-y-1 text-blue-800">
                                  <li>• Verify that carbon footprint calculations appear reasonable</li>
                                  <li>• Ensure company and product information is complete</li>
                                  <li>• Check that LCA methodology follows industry standards</li>
                                  <li>• Confirm data quality and completeness</li>
                                </ul>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2 border-t pt-4">
                              <Button
                                variant="outline"
                                onClick={() => setSelectedReport(null)}
                              >
                                Close Review
                              </Button>
                              <Button
                                onClick={() => approveReportMutation.mutate(selectedReport.id)}
                                disabled={approveReportMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                {approveReportMutation.isPending ? 'Approving...' : 'Approve Report'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <Button
                      size="sm"
                      onClick={() => approveReportMutation.mutate(report.id)}
                      disabled={approveReportMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {approveReportMutation.isPending ? 'Approving...' : 'Approve'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No pending reports</h3>
              <p className="text-muted-foreground">
                All LCA reports have been reviewed and approved. Great work!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}