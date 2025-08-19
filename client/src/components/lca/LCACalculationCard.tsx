import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Calculator, 
  Leaf, 
  Droplets, 
  Clock, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  BarChart3,
  Settings,
  Download
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Product } from "@shared/schema";

interface LCACalculationCardProps {
  product: Product;
}

interface LCAJob {
  id: string;
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  results?: {
    total_co2e: number; // ISO-compliant total
    totalCarbonFootprint: number; // Legacy field
    totalWaterFootprint: number;
    ghg_breakdown: Array<{
      gas_name: string;
      mass_kg: number;
      gwp_factor: number;
      co2e: number;
    }>;
    impactsByCategory: Array<{
      category: string;
      impact: number;
      unit: string;
    }>;
    water_footprint: {
      total_liters: number;
      agricultural_water: number;
      processing_water: number;
    };
    waste_output: {
      total_kg: number;
      recyclable_kg: number;
      hazardous_kg: number;
    };
    metadata?: {
      iso_compliant?: boolean;
      lci_flows_count?: number;
      gwp_factors_used?: string[];
    };
    calculationDate: string;
  };
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  estimatedTimeRemaining?: number;
}

export default function LCACalculationCard({ product }: LCACalculationCardProps) {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch LCA history for this product with aggressive cache invalidation
  const { data: lcaHistory = [], isLoading: historyLoading } = useQuery<LCAJob[]>({
    queryKey: ["/api/lca/product", product.id, "history"],
    refetchInterval: currentJobId ? 2000 : 5000, // Poll every 5 seconds to catch sync updates
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale for real-time sync
    retry: false,
  });

  // Fetch current job status
  const { data: currentJob } = useQuery({
    queryKey: ["/api/lca/calculation", currentJobId],
    enabled: !!currentJobId,
    refetchInterval: currentJobId ? 2000 : false,
    retry: false,
  });

  // Fetch product validation with proper error handling
  const { data: validation } = useQuery({
    queryKey: ["/api/lca/product", product.id, "validate"],
    enabled: true,
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    meta: {
      errorMessage: false
    }
  });

  // Provide safe default validation object with proper typing
  const safeValidation = validation || { valid: true, errors: [], warnings: [] };
  
  // Type-safe accessors for validation
  const validationErrors = (safeValidation as any)?.errors || [];
  const validationWarnings = (safeValidation as any)?.warnings || [];
  const isValidationValid = (safeValidation as any)?.valid !== false;

  // Start LCA calculation
  const startCalculationMutation = useMutation({
    mutationFn: async (options?: any) => {
      const response = await apiRequest("POST", `/api/lca/calculate/${product.id}`, { options });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentJobId(data.jobId);
      toast({
        title: "LCA Calculation Started",
        description: `Environmental impact calculation for ${product.name} is now in progress.`,
      });
    },
    onError: (error) => {
      console.error("Error starting LCA calculation:", error);
      toast({
        title: "Calculation Failed",
        description: "Failed to start LCA calculation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Cancel LCA calculation
  const cancelCalculationMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await apiRequest("DELETE", `/api/lca/calculation/${jobId}`, {});
      return response.json();
    },
    onSuccess: () => {
      setCurrentJobId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/lca/product", product.id, "history"] });
      toast({
        title: "Calculation Cancelled",
        description: "LCA calculation has been cancelled.",
      });
    },
  });

  // Download PDF report
  const downloadPDFMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await fetch(`/api/lca/product/${productId}/download-pdf`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }
      
      return response.blob();
    },
    onSuccess: (blob) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LCA_Report_${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "PDF Downloaded",
        description: "Your LCA report has been downloaded successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Download Failed",
        description: "Failed to download PDF report. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Get latest completed job
  const latestCompletedJob = lcaHistory?.find((job: LCAJob) => job.status === 'completed');
  const activeJob = lcaHistory?.find((job: LCAJob) => 
    job.status === 'pending' || job.status === 'processing'
  );

  // Update current job ID if there's an active job
  useEffect(() => {
    if (activeJob && !currentJobId) {
      setCurrentJobId(activeJob.jobId);
    }
  }, [activeJob, currentJobId]);

  const handleStartCalculation = () => {
    startCalculationMutation.mutate({});
  };

  const handleCancelCalculation = () => {
    if (currentJobId) {
      cancelCalculationMutation.mutate(currentJobId);
    }
  };

  const handleDownloadPDF = () => {
    downloadPDFMutation.mutate(product.id);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'processing':
        return <Play className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-avallen-green" />
          LCA Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation Status */}
        {safeValidation && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Product Validation</span>
            </div>
            {validationErrors?.length > 0 && (
              <div className="space-y-1">
                {validationErrors.map((error: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-red-600">
                    <XCircle className="w-3 h-3" />
                    {error}
                  </div>
                ))}
              </div>
            )}
            {validationWarnings?.length > 0 && (
              <div className="space-y-1">
                {validationWarnings.map((warning: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-yellow-600">
                    <AlertCircle className="w-3 h-3" />
                    {warning}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Current Job Status */}
        {(currentJob || activeJob) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon((currentJob as any)?.status || (activeJob as any)?.status)}
                <span className="text-sm font-medium">Current Calculation</span>
              </div>
              <Badge className={getStatusColor((currentJob as any)?.status || (activeJob as any)?.status)}>
                {(currentJob as any)?.status || (activeJob as any)?.status}
              </Badge>
            </div>

            {((currentJob as any)?.status === 'processing' || (activeJob as any)?.status === 'processing') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span>{(currentJob as any)?.progress || (activeJob as any)?.progress || 0}%</span>
                </div>
                <Progress value={(currentJob as any)?.progress || (activeJob as any)?.progress || 0} className="h-2" />
                {(currentJob as any)?.estimatedTimeRemaining && (
                  <div className="text-sm text-gray-500">
                    Estimated time remaining: {formatDuration((currentJob as any).estimatedTimeRemaining)}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelCalculation}
                disabled={cancelCalculationMutation.isPending}
              >
                <Pause className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Latest Results */}
        {latestCompletedJob?.results && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-avallen-green" />
                <span className="text-sm font-medium">Latest Results</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResults(!showResults)}
              >
                {showResults ? 'Hide' : 'Show'} Details
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <Leaf className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Carbon Footprint</p>
                  <p className="text-lg font-bold text-green-900">
                    {latestCompletedJob.results.totalCarbonFootprint.toFixed(2)} kg CO₂e
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <Droplets className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Water Footprint</p>
                  <p className="text-lg font-bold text-blue-900">
                    {latestCompletedJob.results.totalWaterFootprint.toFixed(2)} L
                  </p>
                </div>
              </div>
            </div>

            {showResults && latestCompletedJob.results.impactsByCategory && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Impact by Category</h4>
                <div className="space-y-2">
                  {latestCompletedJob.results.impactsByCategory.map((impact, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">{impact.category}</span>
                      <span className="text-sm font-medium">
                        {impact.impact.toFixed(4)} {impact.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Last calculated: {new Date(latestCompletedJob.results.calculationDate).toLocaleDateString()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={downloadPDFMutation.isPending}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {downloadPDFMutation.isPending ? 'Generating...' : 'Download PDF'}
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!activeJob && (
          <div className="flex gap-2">
            <Button
              onClick={handleStartCalculation}
              disabled={startCalculationMutation.isPending || !isValidationValid}
              className="flex-1"
            >
              <Calculator className="w-4 h-4 mr-2" />
              {latestCompletedJob ? 'Recalculate LCA' : 'Calculate LCA'}
            </Button>
            {latestCompletedJob && (
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={downloadPDFMutation.isPending}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                PDF
              </Button>
            )}
          </div>
        )}

        {/* Validation Errors */}
        {!isValidationValid && (
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600 font-medium">
              Cannot calculate LCA: Please fix the validation errors above.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}