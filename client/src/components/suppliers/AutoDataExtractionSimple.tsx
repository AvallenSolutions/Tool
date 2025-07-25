import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { 
  Globe, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Info,
  Download
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

interface AutoDataExtractionProps {
  onDataExtracted: (data: ExtractedData) => void;
  disabled?: boolean;
}

export default function AutoDataExtractionSimple({ onDataExtracted, disabled = false }: AutoDataExtractionProps) {
  const [url, setUrl] = useState("");
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  const scrapeMutation = useMutation({
    mutationFn: async (productUrl: string) => {
      const response = await apiRequest("POST", "/api/suppliers/scrape-product", {
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
      }
    }
  });

  const handleScrapeUrl = () => {
    if (!url.trim()) return;
    scrapeMutation.mutate(url.trim());
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
    scrapeMutation.reset();
  };

  return (
    <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="w-5 h-5 text-blue-600" />
          Auto Data Import
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

            {/* Supplier Data */}
            {extractedData.supplierData && (
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-600">Supplier Information</h3>
                <div className="grid grid-cols-2 gap-2 p-3 bg-blue-50 rounded border">
                  <div>
                    <Label className="text-xs font-medium">Company</Label>
                    <div className="text-sm">{extractedData.supplierData.companyName || 'N/A'}</div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Type</Label>
                    <div className="text-sm">{extractedData.supplierData.supplierType || 'N/A'}</div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs font-medium">Website</Label>
                    <div className="text-sm">{extractedData.supplierData.website || 'N/A'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Product Data */}
            {extractedData.productData && (
              <div className="space-y-2">
                <h3 className="font-semibold text-green-600">Product Information</h3>
                <div className="grid grid-cols-2 gap-2 p-3 bg-green-50 rounded border">
                  <div>
                    <Label className="text-xs font-medium">Name</Label>
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
      </CardContent>
    </Card>
  );
}