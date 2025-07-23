import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Download, FileText, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EnhancedReportButtonProps {
  reportId: number;
  reportStatus: string;
}

interface EnhancedReportStatus {
  status: 'not_generated' | 'generating' | 'completed' | 'failed';
  filePath?: string;
}

export function EnhancedReportButton({ reportId, reportStatus }: EnhancedReportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query enhanced report status
  const { data: enhancedStatus, refetch } = useQuery<EnhancedReportStatus>({
    queryKey: ['/api/reports', reportId, 'enhanced-status'],
    refetchInterval: (data) => {
      // Refetch every 3 seconds if generating
      return data?.status === 'generating' ? 3000 : false;
    },
  });

  // Generate enhanced report mutation
  const generateMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/reports/${reportId}/generate-enhanced`),
    onSuccess: () => {
      setIsGenerating(true);
      toast({
        title: "Enhanced Report Generation Started",
        description: "Professional LCA report generation in progress. The system is aggregating your LCA data, calculating carbon footprints, and generating charts. This typically takes 2-3 minutes.",
        variant: "default",
      });
      // Start polling for status
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to start enhanced report generation",
        variant: "destructive",
      });
    },
  });

  // Download enhanced report
  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/reports/${reportId}/download-enhanced`);
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Enhanced_LCA_Report_${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Started",
        description: "Your enhanced LCA report is downloading.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to download the enhanced report",
        variant: "destructive",
      });
    }
  };

  const canGenerate = reportStatus === 'completed' || reportStatus === 'approved';
  const status = enhancedStatus?.status || 'not_generated';

  const getStatusBadge = () => {
    switch (status) {
      case 'not_generated':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Not Generated</Badge>;
      case 'generating':
        return <Badge variant="default"><Clock className="w-3 h-3 mr-1" />Generating...</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Ready</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <Card className="border-green-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center">
            <FileText className="w-5 h-5 mr-2 text-green-600" />
            Enhanced LCA Report
          </div>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Professional multi-page LCA report with detailed analysis, charts, and ISO-compliant formatting. 
          {status === 'not_generated' && canGenerate && (
            <span className="block mt-1 text-green-600 font-medium">Ready to generate</span>
          )}
          {!canGenerate && status === 'not_generated' && (
            <span className="block mt-1 text-amber-600 font-medium">Complete your LCA report first</span>
          )}
        </p>

        {status === 'generating' && (
          <div className="space-y-3 p-4 bg-blue-50 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2 text-blue-600 animate-spin" />
                <span className="font-medium text-blue-900">Report Generation in Progress</span>
              </div>
              <span className="text-sm text-blue-700">~3 min remaining</span>
            </div>
            <Progress value={75} className="w-full" />
            <div className="text-sm text-blue-700 space-y-1">
              <p>• Aggregating LCA data from products and suppliers</p>
              <p>• Calculating carbon footprint contributions by lifecycle stage</p>
              <p>• Generating professional charts and analysis</p>
              <p>• Formatting ISO 14040/14044 compliant report</p>
            </div>
            <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
              <strong>Admin Note:</strong> Background job processing with Bull Queue. Check server logs for detailed progress.
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          {status === 'not_generated' && (
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={!canGenerate || generateMutation.isPending}
              className="flex-1"
            >
              <FileText className="w-4 h-4 mr-2" />
              {generateMutation.isPending ? 'Starting...' : 'Generate Enhanced Report'}
            </Button>
          )}

          {status === 'generating' && (
            <Button disabled className="flex-1">
              <Clock className="w-4 h-4 mr-2" />
              Generating...
            </Button>
          )}

          {status === 'completed' && (
            <>
              <Button onClick={handleDownload} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download Enhanced Report
              </Button>
              <Button
                onClick={() => generateMutation.mutate()}
                variant="outline"
                disabled={generateMutation.isPending}
              >
                Regenerate
              </Button>
            </>
          )}

          {status === 'failed' && (
            <Button
              onClick={() => generateMutation.mutate()}
              variant="outline"
              disabled={!canGenerate || generateMutation.isPending}
              className="flex-1"
            >
              <FileText className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>

        {!canGenerate && (
          <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
            Enhanced reports can only be generated for completed or approved reports.
          </p>
        )}
      </CardContent>
    </Card>
  );
}