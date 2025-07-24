import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ExternalLink,
  Download
} from "lucide-react";

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
  confidence?: {
    [key: string]: number;
  };
}

interface AutoDataExtractionProps {
  onDataExtracted: (data: ExtractedProductData) => void;
  disabled?: boolean;
}

export default function AutoDataExtraction({ onDataExtracted, disabled = false }: AutoDataExtractionProps) {
  const [url, setUrl] = useState("");
  const [extractedData, setExtractedData] = useState<ExtractedProductData | null>(null);
  const [extractionStats, setExtractionStats] = useState<{
    extractedFields: string[];
    totalFields: number;
    extractionRate: string;
  } | null>(null);

  const scrapeMutation = useMutation({
    mutationFn: async (productUrl: string) => {
      const response = await apiRequest("POST", "/api/suppliers/scrape-product", {
        url: productUrl
      });
      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        setExtractedData(result.extractedData);
        setExtractionStats({
          extractedFields: result.extractedFields,
          totalFields: result.totalFields,
          extractionRate: result.extractionRate
        });
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
      // Clear the extraction state after applying
      setExtractedData(null);
      setExtractionStats(null);
      setUrl("");
    }
  };

  const handleReset = () => {
    setUrl("");
    setExtractedData(null);
    setExtractionStats(null);
    scrapeMutation.reset();
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return "gray";
    if (confidence >= 0.8) return "green";
    if (confidence >= 0.6) return "yellow";
    return "orange";
  };

  const getConfidenceLabel = (confidence?: number) => {
    if (!confidence) return "Unknown";
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  };

  return (
    <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="w-5 h-5 text-blue-600" />
          Want to speed things up? Let us try to import your product data automatically.
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!extractedData && (
          <>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://your-website.com/product-page"
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
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Import from URL
                  </>
                )}
              </Button>
            </div>

            {scrapeMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {scrapeMutation.error?.message || "Failed to extract data from the provided URL. Please check the URL and try again."}
                </AlertDescription>
              </Alert>
            )}

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                We'll attempt to extract product information like materials, weights, dimensions, and certifications from your product page. You'll be able to review and edit all imported data before saving.
              </AlertDescription>
            </Alert>
          </>
        )}

        {extractedData && extractionStats && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="font-medium">
                We've imported the following data from <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                  {url} <ExternalLink className="w-3 h-3" />
                </a>
                <br />
                <span className="text-sm text-gray-600">
                  Extracted {extractionStats.extractedFields.length} out of {extractionStats.totalFields} possible fields ({extractionStats.extractionRate})
                </span>
              </AlertDescription>
            </Alert>

            <div className="bg-white border rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-gray-900 mb-3">Extracted Product Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {extractedData.productName && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Product Name:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{extractedData.productName}</span>
                      <Badge variant="outline" className={`text-${getConfidenceColor(extractedData.confidence?.productName)}-600`}>
                        {getConfidenceLabel(extractedData.confidence?.productName)}
                      </Badge>
                    </div>
                  </div>
                )}

                {extractedData.materialType && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Material:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm capitalize">{extractedData.materialType}</span>
                      <Badge variant="outline" className={`text-${getConfidenceColor(extractedData.confidence?.materialType)}-600`}>
                        {getConfidenceLabel(extractedData.confidence?.materialType)}
                      </Badge>
                    </div>
                  </div>
                )}

                {extractedData.weight && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Weight:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{extractedData.weight} {extractedData.weightUnit}</span>
                      <Badge variant="outline" className={`text-${getConfidenceColor(extractedData.confidence?.weight)}-600`}>
                        {getConfidenceLabel(extractedData.confidence?.weight)}
                      </Badge>
                    </div>
                  </div>
                )}

                {extractedData.capacity && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Capacity:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{extractedData.capacity} {extractedData.capacityUnit}</span>
                      <Badge variant="outline" className={`text-${getConfidenceColor(extractedData.confidence?.capacity)}-600`}>
                        {getConfidenceLabel(extractedData.confidence?.capacity)}
                      </Badge>
                    </div>
                  </div>
                )}

                {extractedData.recycledContent && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Recycled Content:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{extractedData.recycledContent}%</span>
                      <Badge variant="outline" className={`text-${getConfidenceColor(extractedData.confidence?.recycledContent)}-600`}>
                        {getConfidenceLabel(extractedData.confidence?.recycledContent)}
                      </Badge>
                    </div>
                  </div>
                )}

                {extractedData.sku && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">SKU:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{extractedData.sku}</span>
                      <Badge variant="outline" className={`text-${getConfidenceColor(extractedData.confidence?.sku)}-600`}>
                        {getConfidenceLabel(extractedData.confidence?.sku)}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              {extractedData.dimensions && (
                <div className="pt-2 border-t">
                  <span className="text-sm font-medium">Dimensions:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm">
                      {extractedData.dimensions.height && `H: ${extractedData.dimensions.height}`}
                      {extractedData.dimensions.width && ` × W: ${extractedData.dimensions.width}`}
                      {extractedData.dimensions.depth && ` × D: ${extractedData.dimensions.depth}`}
                      {extractedData.dimensions.unit && ` ${extractedData.dimensions.unit}`}
                    </span>
                    <Badge variant="outline" className={`text-${getConfidenceColor(extractedData.confidence?.dimensions)}-600`}>
                      {getConfidenceLabel(extractedData.confidence?.dimensions)}
                    </Badge>
                  </div>
                </div>
              )}

              {extractedData.certifications && extractedData.certifications.length > 0 && (
                <div className="pt-2 border-t">
                  <span className="text-sm font-medium">Certifications:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {extractedData.certifications.map((cert, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {cert}
                      </Badge>
                    ))}
                    <Badge variant="outline" className={`text-${getConfidenceColor(extractedData.confidence?.certifications)}-600 text-xs`}>
                      {getConfidenceLabel(extractedData.confidence?.certifications)}
                    </Badge>
                  </div>
                </div>
              )}

              {extractedData.description && (
                <div className="pt-2 border-t">
                  <span className="text-sm font-medium">Description:</span>
                  <p className="text-sm text-gray-600 mt-1">{extractedData.description}</p>
                </div>
              )}
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="font-medium">
                Please review the imported data for accuracy and fill in any missing fields. 
                <br />
                <span className="text-sm font-normal text-gray-600">
                  Confidence levels: High (reliable), Medium (likely correct), Low (needs verification)
                </span>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                onClick={handleApplyData}
                className="bg-green-600 hover:bg-green-700 text-white flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Apply This Data
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1"
              >
                Try Different URL
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}