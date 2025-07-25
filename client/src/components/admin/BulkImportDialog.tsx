import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Globe, 
  Package, 
  Building2,
  X,
  Play
} from "lucide-react";

interface BulkImportResult {
  suppliersCreated: number;
  productsCreated: number;
  pdfsProcessed: number;
  linksScraped: number;
  errors: string[];
  results: Array<{
    type: 'supplier' | 'product';
    name: string;
    source: string;
    success: boolean;
    error?: string;
  }>;
}

interface BulkImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BulkImportDialog({ isOpen, onClose }: BulkImportDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [catalogUrl, setCatalogUrl] = useState("https://uk.verallia.com/catalogue-range/spirits-range/");
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [results, setResults] = useState<BulkImportResult | null>(null);

  const bulkImportMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/suppliers/bulk-import", { catalogUrl: url });
      return response.json();
    },
    onSuccess: (result) => {
      setResults(result);
      setIsImporting(false);
      setProgress(100);
      setCurrentStep("Import completed");
      
      queryClient.invalidateQueries({ queryKey: ['/api/verified-suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/supplier-products'] });
      
      toast({
        title: "Bulk import completed",
        description: `Created ${result.suppliersCreated} suppliers and ${result.productsCreated} products`,
      });
    },
    onError: (error: any) => {
      setIsImporting(false);
      setProgress(0);
      setCurrentStep("");
      toast({
        title: "Bulk import failed",
        description: error.message || "An error occurred during import",
        variant: "destructive",
      });
    },
  });

  const handleStartImport = () => {
    if (!catalogUrl.trim()) return;
    
    setIsImporting(true);
    setProgress(0);
    setCurrentStep("Initializing import...");
    setResults(null);
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + Math.random() * 15;
      });
    }, 1000);

    // Update step messages
    setTimeout(() => setCurrentStep("Scanning catalog page..."), 1000);
    setTimeout(() => setCurrentStep("Finding product links..."), 3000);
    setTimeout(() => setCurrentStep("Downloading PDFs..."), 6000);
    setTimeout(() => setCurrentStep("Extracting product data..."), 10000);
    setTimeout(() => setCurrentStep("Creating suppliers and products..."), 15000);
    
    bulkImportMutation.mutate(catalogUrl.trim());
  };

  const handleClose = () => {
    if (!isImporting) {
      onClose();
      // Reset state
      setProgress(0);
      setCurrentStep("");
      setResults(null);
      setCatalogUrl("https://uk.verallia.com/catalogue-range/spirits-range/");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Bulk Supplier & Product Import
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!isImporting && !results && (
            <>
              <Alert>
                <Globe className="h-4 w-4" />
                <AlertDescription>
                  <strong>Advanced Multi-Page Scraping:</strong> This system will:
                  <ul className="mt-2 space-y-1 list-disc list-inside text-sm">
                    <li>Scan the catalog page for product links</li>
                    <li>Follow each link to extract product information</li>
                    <li>Download and process PDF specifications</li>
                    <li>Create suppliers and products automatically</li>
                    <li>Handle deduplication and data validation</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="catalogUrl">Catalog URL</Label>
                <Input
                  id="catalogUrl"
                  type="url"
                  value={catalogUrl}
                  onChange={(e) => setCatalogUrl(e.target.value)}
                  placeholder="https://supplier-website.com/product-catalog"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  Enter the URL of a product catalog or range page. The system will automatically discover and process all linked products.
                </p>
              </div>

              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Example: Verallia Spirits Range</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-blue-700">
                    The Verallia spirits range contains multiple bottle types with PDF specifications. 
                    This import will process all products, extract technical data from PDFs, and create a complete supplier profile.
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {isImporting && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Import in Progress</h3>
                <Badge variant="secondary" className="animate-pulse">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Processing
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{currentStep}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please wait while the system processes the catalog. This may take several minutes for large catalogs with PDFs.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Import Results</h3>
                <Badge variant="secondary">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Completed
                </Badge>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Building2 className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-2xl font-bold">{results.suppliersCreated}</div>
                    <div className="text-sm text-gray-500">Suppliers</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Package className="w-6 h-6 mx-auto mb-2 text-green-600" />
                    <div className="text-2xl font-bold">{results.productsCreated}</div>
                    <div className="text-sm text-gray-500">Products</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <FileText className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                    <div className="text-2xl font-bold">{results.pdfsProcessed}</div>
                    <div className="text-sm text-gray-500">PDFs</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Globe className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                    <div className="text-2xl font-bold">{results.linksScraped}</div>
                    <div className="text-sm text-gray-500">Links</div>
                  </CardContent>
                </Card>
              </div>

              {/* Errors */}
              {results.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{results.errors.length} Error(s):</strong>
                    <ul className="mt-2 space-y-1 list-disc list-inside text-sm">
                      {results.errors.slice(0, 3).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {results.errors.length > 3 && (
                        <li>... and {results.errors.length - 3} more errors</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Detailed results */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detailed Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {results.results.map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded border">
                        <div className="flex items-center gap-2">
                          {result.type === 'supplier' ? (
                            <Building2 className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Package className="w-4 h-4 text-green-600" />
                          )}
                          <div>
                            <div className="font-medium text-sm">{result.name}</div>
                            <div className="text-xs text-gray-500">{result.source}</div>
                          </div>
                        </div>
                        <div>
                          {result.success ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            {isImporting && "Import in progress - please wait"}
            {results && `Import completed at ${new Date().toLocaleTimeString()}`}
          </div>
          <div className="flex gap-2">
            {!isImporting && (
              <Button
                variant="outline"
                onClick={handleClose}
              >
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
            )}
            {!isImporting && !results && (
              <Button
                onClick={handleStartImport}
                disabled={!catalogUrl.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Import
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}