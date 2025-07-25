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
  supplierType?: string;
  description?: string;
  address?: string;
  website?: string;
  email?: string;
  confidence?: {
    [key: string]: number;
  };
}

interface ExtractedProductData {
  productName?: string;
  description?: string;
  materialType?: string;
  weight?: number;
  weightUnit?: string;
  dimensions?: {
    height?: number;
    width?: number;
    depth?: number;
    unit?: string;
  };
  recycledContent?: number;
  capacity?: number;
  capacityUnit?: string;
  color?: string;
  certifications?: string[];
  price?: number;
  currency?: string;
  sku?: string;
  productImage?: string;
  additionalImages?: string[];
  selectedImages?: string[];
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

  const scrapeMutation = useMutation({
    mutationFn: async (productUrl: string) => {
      const response = await apiRequest('POST', "/api/suppliers/scrape-product", {
        url: productUrl
      });
      return response;
    },
    onSuccess: (result) => {
      if (result.success) {
        const data: ExtractedData = {
          productData: result.productData || undefined,
          supplierData: result.supplierData || undefined,
          selectedImages: result.images || []
        };
        setExtractedData(data);
      }
    }
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (catalogUrl: string) => {
      const response = await apiRequest('POST', "/api/suppliers/bulk-import", { catalogUrl });
      return response;
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

  const handleApplyData = () => {
    if (extractedData) {
      onDataExtracted(extractedData);
      // Clear state after applying
      setExtractedData(null);
      setUrl("");
      scrapeMutation.reset();
    }
  };

  const handleReset = () => {
    setUrl("");
    setExtractedData(null);
    setBulkImportResult(null);
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
            {!extractedData && (
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

            {extractedData && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-sm">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Data extracted successfully
                  </Badge>
                </div>

                {extractedData.supplierData && (
                  <div className="bg-white p-3 rounded border">
                    <Label className="text-sm font-medium mb-2 block">Supplier Information</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium">Company</Label>
                        <div className="text-sm">{extractedData.supplierData.companyName || 'N/A'}</div>
                      </div>
                      <div>
                        <Label className="text-xs font-medium">Type</Label>
                        <div className="text-sm">{extractedData.supplierData.supplierType || 'N/A'}</div>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs font-medium">Description</Label>
                        <div className="text-sm">{extractedData.supplierData.description?.substring(0, 100) || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                )}

                {extractedData.productData && (
                  <div className="bg-white p-3 rounded border">
                    <Label className="text-sm font-medium mb-2 block">Product Information</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium">Product Name</Label>
                        <div className="text-sm">{extractedData.productData.productName || 'N/A'}</div>
                      </div>
                      <div>
                        <Label className="text-xs font-medium">Material</Label>
                        <div className="text-sm">{extractedData.productData.materialType || 'N/A'}</div>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs font-medium">Description</Label>
                        <div className="text-sm">{extractedData.productData.description?.substring(0, 100) || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleApplyData}
                    className="bg-green-600 hover:bg-green-700 text-white flex-1"
                  >
                    Apply Extracted Data
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="text-gray-600"
                  >
                    Reset
                  </Button>
                </div>
              </div>
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

                {bulkImportResult.errors.length > 0 && (
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