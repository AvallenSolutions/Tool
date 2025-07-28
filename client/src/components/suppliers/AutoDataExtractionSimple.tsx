import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import EditableDataPreview from "./EditableDataPreview";
import { 
  Globe, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Info,
  Download,
  Package,
  Building2,
  ListChecks
} from "lucide-react";

interface ExtractedSupplierData {
  companyName?: string;
  type?: string; // Changed from supplierType
  address?: string;
  website?: string;
  contactEmail?: string; // Changed from email
  confidence?: {
    [key: string]: number;
  };
}

interface ExtractedProductData {
  name?: string; // Changed from productName
  photos?: string[]; // Changed to photos array
  type?: string; // Product type
  material?: string; // Changed from materialType
  weight?: number;
  weightUnit?: string;
  recycledContent?: number;
  confidence?: {
    [key: string]: number;
  };
}

interface ExtractedData {
  productData?: ExtractedProductData;
  supplierData?: ExtractedSupplierData;
  selectedImages?: string[];
}

interface BulkImportResult {
  suppliersCreated: number;
  productsCreated: number;
  linksScraped: number;
  errors: string[];
  results: any[];
}

interface AutoDataExtractionProps {
  onDataExtracted: (data: ExtractedData) => void;
  disabled?: boolean;
}

export default function AutoDataExtractionSimple({ onDataExtracted, disabled = false }: AutoDataExtractionProps) {
  const [url, setUrl] = useState("");
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [bulkImportResult, setBulkImportResult] = useState<BulkImportResult | null>(null);
  const [activeTab, setActiveTab] = useState("single");
  const [showPreview, setShowPreview] = useState(false);

  const scrapeMutation = useMutation({
    mutationFn: async (productUrl: string) => {
      const response = await apiRequest('POST', "/api/suppliers/scrape-product", {
        url: productUrl
      });
      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        const data: ExtractedData = {
          productData: result.productData || undefined,
          supplierData: result.supplierData || undefined,
          selectedImages: result.images || []
        };
        setExtractedData(data);
        setShowPreview(true);
      }
    }
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (catalogUrl: string) => {
      const response = await apiRequest('POST', "/api/suppliers/bulk-import", { catalogUrl });
      return response.json();
    },
    onSuccess: (data) => {
      setBulkImportResult(data);
    },
    onError: (error) => {
      console.error('Bulk import error:', error);
    },
  });

  const handleScrapeUrl = () => {
    if (!url.trim()) return;
    scrapeMutation.mutate(url.trim());
  };

  const handleBulkImport = () => {
    if (!url.trim()) return;
    setBulkImportResult(null);
    bulkImportMutation.mutate(url.trim());
  };

  const handlePreviewApprove = (approvedData: any) => {
    
    
    // Convert approved data back to ExtractedData format - service now handles both new and old field names
    const convertedData: ExtractedData = {
      supplierData: {
        companyName: approvedData.companyName,
        type: approvedData.type,
        address: approvedData.address,
        website: approvedData.website,
        contactEmail: approvedData.contactEmail,
      },
      productData: {
        name: approvedData.name,
        material: approvedData.material,
        weight: approvedData.weight,
        weightUnit: approvedData.weightUnit,
        recycledContent: approvedData.recycledContent,
        photos: approvedData.selectedPhotos,
      },
      selectedImages: approvedData.selectedPhotos
    };
    
    
    onDataExtracted(convertedData);
    handleReset();
  };

  const handlePreviewCancel = () => {
    setShowPreview(false);
  };

  const handleReset = () => {
    setUrl("");
    setExtractedData(null);
    setBulkImportResult(null);
    setShowPreview(false);
    scrapeMutation.reset();
    bulkImportMutation.reset();
  };

  return (
    <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="w-5 h-5 text-blue-600" />
          Auto Data Import from URL
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Single Product
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Bulk Catalog
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4">
            {!showPreview && (
              <>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://supplier-website.com/product-page"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={disabled || scrapeMutation.isPending}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleScrapeUrl}
                    disabled={disabled || !url.trim() || scrapeMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {scrapeMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Extract Data
                      </>
                    )}
                  </Button>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Extract both supplier and product data automatically from a product page URL.
                  </AlertDescription>
                </Alert>
              </>
            )}

            {scrapeMutation.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {scrapeMutation.error.message}
                </AlertDescription>
              </Alert>
            )}

            {showPreview && extractedData && (
              <EditableDataPreview
                extractedData={extractedData}
                onApprove={handlePreviewApprove}
                onCancel={handlePreviewCancel}
              />
            )}
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://supplier-website.com/product-catalog"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={disabled || bulkImportMutation.isPending}
                className="flex-1"
              />
              <Button
                onClick={handleBulkImport}
                disabled={disabled || !url.trim() || bulkImportMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {bulkImportMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ListChecks className="w-4 h-4 mr-2" />
                    Bulk Import
                  </>
                )}
              </Button>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Process an entire product catalog. This will create multiple suppliers and products from catalog pages.
              </AlertDescription>
            </Alert>

            {bulkImportMutation.isPending && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processing catalog...</span>
                  <span>This may take several minutes</span>
                </div>
                <Progress value={undefined} className="w-full" />
              </div>
            )}

            {bulkImportResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded border">
                    <div className="text-2xl font-bold text-blue-600">{bulkImportResult.suppliersCreated}</div>
                    <div className="text-sm text-gray-600">Suppliers Created</div>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <div className="text-2xl font-bold text-green-600">{bulkImportResult.productsCreated}</div>
                    <div className="text-sm text-gray-600">Products Created</div>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <div className="text-2xl font-bold text-purple-600">{bulkImportResult.linksScraped}</div>
                    <div className="text-sm text-gray-600">Links Processed</div>
                  </div>
                </div>

                {/* Show detailed results */}
                {bulkImportResult.results && bulkImportResult.results.length > 0 && (
                  <div className="bg-white p-4 rounded border">
                    <h4 className="font-semibold mb-3">Created Products:</h4>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {bulkImportResult.results
                        .filter(r => r.success)
                        .map((result, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{result.name}</div>
                              <div className="text-xs text-gray-600 truncate">{result.source}</div>
                            </div>
                            <div className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                              {result.type}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {bulkImportResult.errors && bulkImportResult.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {bulkImportResult.errors.length} errors occurred during import. Check logs for details.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button onClick={() => setBulkImportResult(null)} variant="outline">
                    Clear Results
                  </Button>
                  {bulkImportResult.productsCreated > 0 && (
                    <Button 
                      onClick={() => window.location.href = '/app/suppliers'}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      View Suppliers ({bulkImportResult.suppliersCreated} suppliers, {bulkImportResult.productsCreated} products)
                    </Button>
                  )}
                </div>
              </div>
            )}

            {bulkImportMutation.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {bulkImportMutation.error.message}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}