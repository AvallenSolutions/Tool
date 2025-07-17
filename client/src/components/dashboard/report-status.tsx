import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Clock, CheckCircle, Download, UserCheck } from "lucide-react";

export default function ReportStatus() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ["/api/reports"],
    retry: false,
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/reports", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({
        title: "Report Generation Started",
        description: "Your report is being generated. This may take a few minutes.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    },
  });

  const handleGenerateReport = () => {
    generateReportMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card className="border-light-gray">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-gray">
            Report Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
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
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-success-green/20 text-success-green">
            Complete
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-success-green/20 text-success-green">
            Approved
          </Badge>
        );
      case 'generating':
        return (
          <Badge className="bg-muted-gold/20 text-muted-gold">
            Generating
          </Badge>
        );
      case 'under_review':
        return (
          <Badge className="bg-muted-gold/20 text-muted-gold">
            Under Review
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted-gold/20 text-muted-gold">
            In Progress
          </Badge>
        );
    }
  };

  const recentReports = reports?.slice(0, 2) || [];

  return (
    <Card className="border-light-gray">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-gray">
          Report Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentReports.length > 0 ? (
            recentReports.map((report: any) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 bg-lightest-gray rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    {getStatusIcon(report.status)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-gray">
                      {report.reportType === 'quarterly' ? 'Quarterly' : 'Annual'} Report
                    </p>
                    <p className="text-sm text-gray-500">
                      {report.status === 'approved' ? 'Approved' : 
                       report.status === 'generating' ? 'Generating' : 'Pending Review'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(report.status)}
                  {report.status === 'approved' && (
                    <Button
                      size="sm"
                      className="bg-avallen-green text-white hover:bg-avallen-green-light"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No reports generated yet</p>
              <Button
                onClick={handleGenerateReport}
                disabled={generateReportMutation.isPending}
                className="bg-avallen-green text-white hover:bg-avallen-green-light"
              >
                {generateReportMutation.isPending ? "Generating..." : "Generate First Report"}
              </Button>
            </div>
          )}

          {recentReports.length > 0 && (
            <div className="pt-4 border-t border-light-gray">
              <Button
                variant="outline"
                className="w-full border-light-gray text-slate-gray hover:bg-lightest-gray"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Request Expert Review
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
