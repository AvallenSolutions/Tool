import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { 
  FileText, 
  Upload, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Info,
  X,
  Download
} from "lucide-react";

interface ExtractedPDFData {
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
  minimumOrderQuantity?: number;
  leadTimeDays?: number;
  specifications?: Record<string, any>;
  confidence?: {
    [key: string]: number;
  };
}

interface PDFUploadExtractionProps {
  onDataExtracted: (data: ExtractedPDFData) => void;
  disabled?: boolean;
}

export default function PDFUploadExtraction({ onDataExtracted, disabled = false }: PDFUploadExtractionProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedPDFData | null>(null);
  const [extractionStats, setExtractionStats] = useState<{
    extractedFields: string[];
    totalFields: number;
    extractionRate: string;
    documentType?: string;
    confidence?: number;
  } | null>(null);

  const extractMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch('/api/suppliers/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process PDF');
      }

      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        setExtractedData(result.extractedData);
        setExtractionStats({
          extractedFields: result.extractedFields,
          totalFields: result.totalFields,
          extractionRate: result.extractionRate,
          documentType: result.documentType,
          confidence: result.confidence
        });
      }
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        return;
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        return;
      }
      
      setUploadedFile(file);
      setExtractedData(null);
      setExtractionStats(null);
      extractMutation.reset();
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: disabled || extractMutation.isPending
  });

  const handleExtract = () => {
    if (uploadedFile) {
      extractMutation.mutate(uploadedFile);
    }
  };

  const handleApplyData = () => {
    if (extractedData) {
      onDataExtracted(extractedData);
      // Clear the extraction state after applying
      setExtractedData(null);
      setExtractionStats(null);
      setUploadedFile(null);
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
    setExtractedData(null);
    setExtractionStats(null);
    extractMutation.reset();
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="border-2 border-dashed border-orange-300 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="w-5 h-5 text-orange-600" />
          Have a product PDF or catalog? Let us extract the data automatically.
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!uploadedFile && !extractedData && (
          <>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive 
                  ? 'border-orange-400 bg-orange-100' 
                  : 'border-orange-300 hover:border-orange-400 hover:bg-orange-100'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              {isDragActive ? (
                <p className="text-orange-700 font-medium">Drop your PDF here...</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-orange-700 font-medium">
                    Drag & drop a PDF file here, or click to browse
                  </p>
                  <p className="text-sm text-orange-600">
                    Supports product catalogs, specification sheets, and technical documents
                  </p>
                  <p className="text-xs text-orange-500">
                    Maximum file size: 10MB
                  </p>
                </div>
              )}
            </div>

            {fileRejections.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {fileRejections[0].errors[0].message}
                </AlertDescription>
              </Alert>
            )}

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Our AI will analyze your PDF and extract product specifications, dimensions, materials, 
                certifications, and pricing information. All extracted data will be reviewed before saving.
              </AlertDescription>
            </Alert>
          </>
        )}

        {uploadedFile && !extractedData && (
          <div className="space-y-4">
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-orange-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">{uploadedFile.name}</h4>
                    <p className="text-sm text-gray-600">
                      {formatFileSize(uploadedFile.size)} • PDF Document
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={extractMutation.isPending}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {extractMutation.isPending && (
              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
                  <span className="font-medium">Analyzing PDF with AI...</span>
                </div>
                <Progress value={undefined} className="w-full mb-2" />
                <p className="text-sm text-gray-600">
                  This may take 30-60 seconds depending on document complexity
                </p>
              </div>
            )}

            {extractMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {extractMutation.error?.message || "Failed to extract data from PDF. Please try again or use manual entry."}
                </AlertDescription>
              </Alert>
            )}

            {!extractMutation.isPending && !extractMutation.isError && (
              <Button
                onClick={handleExtract}
                disabled={disabled}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Extract Product Data from PDF
              </Button>
            )}
          </div>
        )}

        {extractedData && extractionStats && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="font-medium">
                Successfully extracted data from <strong>{uploadedFile?.name}</strong>
                <br />
                <span className="text-sm text-gray-600">
                  Extracted {extractionStats.extractedFields.length} out of {extractionStats.totalFields} possible fields ({extractionStats.extractionRate})
                  {extractionStats.confidence && (
                    <> • Overall confidence: {Math.round(extractionStats.confidence * 100)}%</>
                  )}
                </span>
              </AlertDescription>
            </Alert>

            <div className="bg-white border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 mb-3">Extracted Product Information</h4>
                {extractionStats.documentType && (
                  <Badge variant="secondary">
                    {extractionStats.documentType.replace('_', ' ').toUpperCase()}
                  </Badge>
                )}
              </div>
              
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

                {extractedData.price && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Price:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{extractedData.currency || '$'}{extractedData.price}</span>
                      <Badge variant="outline" className={`text-${getConfidenceColor(extractedData.confidence?.price)}-600`}>
                        {getConfidenceLabel(extractedData.confidence?.price)}
                      </Badge>
                    </div>
                  </div>
                )}

                {extractedData.minimumOrderQuantity && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Min Order:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{extractedData.minimumOrderQuantity} units</span>
                      <Badge variant="outline" className={`text-${getConfidenceColor(extractedData.confidence?.minimumOrderQuantity)}-600`}>
                        {getConfidenceLabel(extractedData.confidence?.minimumOrderQuantity)}
                      </Badge>
                    </div>
                  </div>
                )}

                {extractedData.leadTimeDays && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Lead Time:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{extractedData.leadTimeDays} days</span>
                      <Badge variant="outline" className={`text-${getConfidenceColor(extractedData.confidence?.leadTimeDays)}-600`}>
                        {getConfidenceLabel(extractedData.confidence?.leadTimeDays)}
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

              {extractedData.specifications && Object.keys(extractedData.specifications).length > 0 && (
                <div className="pt-2 border-t">
                  <span className="text-sm font-medium">Additional Specifications:</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {Object.entries(extractedData.specifications).map(([key, value]) => (
                      <div key={key} className="text-xs">
                        <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        <span className="ml-1 text-gray-600">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="font-medium">
                Please review all extracted data for accuracy. AI extraction may not be 100% perfect.
                <br />
                <span className="text-sm font-normal text-gray-600">
                  Confidence levels: High (≥80%), Medium (60-79%), Low (&lt;60% - verify carefully)
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
                Try Different PDF
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}