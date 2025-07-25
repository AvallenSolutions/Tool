import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { 
  Globe, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Info,
  ExternalLink,
  Download,
  Edit3,
  Image,
  Save,
  X,
  Trash2,
  ArrowUp,
  Plus
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
  selectedImages?: string[]; // Images selected by user after filtering
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

export default function AutoDataExtractionEnhanced({ onDataExtracted, disabled = false }: AutoDataExtractionProps) {
  const [url, setUrl] = useState("");
  const [extractedProductData, setExtractedProductData] = useState<ExtractedProductData | null>(null);
  const [extractedSupplierData, setExtractedSupplierData] = useState<ExtractedSupplierData | null>(null);
  const [editableProductData, setEditableProductData] = useState<ExtractedProductData | null>(null);
  const [editableSupplierData, setEditableSupplierData] = useState<ExtractedSupplierData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [extractionStats, setExtractionStats] = useState<{
    extractedFields: string[];
    totalFields: number;
    extractionRate: string;
  } | null>(null);
  const [extractedImages, setExtractedImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const scrapeMutation = useMutation({
    mutationFn: async (productUrl: string) => {
      const response = await apiRequest("POST", "/api/suppliers/scrape-product", {
        url: productUrl
      });
      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        setExtractedProductData(result.productData || null);
        setExtractedSupplierData(result.supplierData || null);
        setEditableProductData(result.productData || null);
        setEditableSupplierData(result.supplierData || null);
        setExtractionStats({
          extractedFields: result.extractedFields,
          totalFields: result.totalFields,
          extractionRate: result.extractionRate
        });
        setExtractedImages(result.images || []);
        setSelectedImages(result.images || []);
      }
    }
  });

  const handleScrapeUrl = () => {
    if (!url.trim()) return;
    scrapeMutation.mutate(url.trim());
  };

  const handleApplyData = () => {
    if (editableProductData || editableSupplierData) {
      // Combine both product and supplier data
      const combinedData: ExtractedData = {
        productData: editableProductData ? {
          ...editableProductData,
          selectedImages,
          productImage: selectedImages[0], // Primary image is first selected
          additionalImages: selectedImages.slice(1) // Rest are additional
        } : undefined,
        supplierData: editableSupplierData,
        selectedImages
      };
      
      onDataExtracted(combinedData);
      
      // Clear the extraction state after applying
      setExtractedProductData(null);
      setExtractedSupplierData(null);
      setEditableProductData(null);
      setEditableSupplierData(null);
      setExtractionStats(null);
      setExtractedImages([]);
      setSelectedImages([]);
      setUrl("");
      setIsEditing(false);
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditableProductData(extractedProductData); // Reset to original data
    setEditableSupplierData(extractedSupplierData);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
  };

  const handleReset = () => {
    setUrl("");
    setExtractedProductData(null);
    setExtractedSupplierData(null);
    setEditableProductData(null);
    setEditableSupplierData(null);
    setExtractionStats(null);
    setExtractedImages([]);
    setSelectedImages([]);
    setIsEditing(false);
    scrapeMutation.reset();
  };

  const toggleImageSelection = (imageUrl: string) => {
    setSelectedImages(prev => 
      prev.includes(imageUrl) 
        ? prev.filter(img => img !== imageUrl)
        : [...prev, imageUrl]
    );
  };

  const removeImage = (imageUrl: string) => {
    setSelectedImages(prev => prev.filter(img => img !== imageUrl));
  };

  const moveImageUp = (imageUrl: string) => {
    setSelectedImages(prev => {
      const index = prev.indexOf(imageUrl);
      if (index > 0) {
        const newOrder = [...prev];
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        return newOrder;
      }
      return prev;
    });
  };

  const updateEditableProductField = (field: keyof ExtractedProductData, value: any) => {
    if (editableProductData) {
      setEditableProductData({ ...editableProductData, [field]: value });
    }
  };

  const updateEditableSupplierField = (field: keyof ExtractedSupplierData, value: any) => {
    if (editableSupplierData) {
      setEditableSupplierData({ ...editableSupplierData, [field]: value });
    }
  };

  const renderEditableProductField = (label: string, field: keyof ExtractedProductData, type: 'text' | 'number' | 'textarea' = 'text') => {
    const value = editableProductData?.[field];
    if (value === undefined && !isEditing) return null;

    const confidence = extractedProductData?.confidence?.[field as string];
    const confidenceColor = confidence ? (confidence > 0.7 ? 'text-green-600' : confidence > 0.5 ? 'text-yellow-600' : 'text-red-600') : '';

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">{label}</Label>
          {confidence && (
            <Badge variant="outline" className={`text-xs ${confidenceColor}`}>
              {Math.round(confidence * 100)}% confidence
            </Badge>
          )}
        </div>
        {isEditing ? (
          type === 'textarea' ? (
            <Textarea
              value={value?.toString() || ''}
              onChange={(e) => updateEditableProductField(field, e.target.value)}
              className="min-h-[60px]"
            />
          ) : (
            <Input
              type={type}
              value={value?.toString() || ''}
              onChange={(e) => updateEditableProductField(field, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
            />
          )
        ) : (
          <div className="p-2 bg-gray-50 rounded text-sm">
            {value?.toString() || 'Not extracted'}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="w-5 h-5 text-blue-600" />
          Enhanced Auto Data Import with Image Extraction
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!extractedProductData && !extractedSupplierData && (
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
                    Extract Data & Images
                  </>
                )}
              </Button>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                We'll automatically extract product information including specifications, materials, dimensions, and product images. 
                You can edit all extracted data before applying it to your form.
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

        {(extractedProductData || extractedSupplierData) && extractionStats && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Badge variant="secondary" className="text-sm">
                <CheckCircle className="w-4 h-4 mr-1" />
                Data extracted successfully
              </Badge>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-sm">
                  {extractionStats.extractionRate} extraction rate
                </Badge>
                {extractedImages.length > 0 && (
                  <Badge variant="outline" className="text-sm">
                    <Image className="w-3 h-3 mr-1" />
                    {extractedImages.length} images found
                  </Badge>
                )}
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Success!</strong> We found {extractionStats.extractedFields.length} out of {extractionStats.totalFields} possible fields
                {extractedImages.length > 0 && ` and ${extractedImages.length} product images`}. 
                Review and edit the data below before applying.
              </AlertDescription>
            </Alert>

            {/* Product Images */}
            {extractedImages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Extracted Product Images
                      <Badge variant="outline">{extractedImages.length} found</Badge>
                    </div>
                    <Badge variant={selectedImages.length > 0 ? "default" : "secondary"}>
                      {selectedImages.length} selected
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Click images to select/deselect them. Selected images will be saved with the product. 
                      Use the controls to reorder or remove images.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {extractedImages.map((imageUrl, index) => {
                      const isSelected = selectedImages.includes(imageUrl);
                      const selectedIndex = selectedImages.indexOf(imageUrl);
                      
                      return (
                        <div key={index} className="relative group">
                          <div 
                            className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                              isSelected 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => toggleImageSelection(imageUrl)}
                          >
                            <img
                              src={imageUrl}
                              alt={`Product image ${index + 1}`}
                              className="w-full h-32 object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            
                            {isSelected && (
                              <>
                                <div className="absolute inset-0 bg-blue-500 bg-opacity-20" />
                                <Badge className="absolute top-1 left-1 text-xs bg-blue-600">
                                  {selectedIndex === 0 ? 'Primary' : `#${selectedIndex + 1}`}
                                </Badge>
                                <CheckCircle className="absolute top-1 right-1 text-blue-600 bg-white rounded-full" size={20} />
                              </>
                            )}
                          </div>
                          
                          {isSelected && (
                            <div className="flex justify-center gap-1 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveImageUp(imageUrl);
                                }}
                                disabled={selectedIndex === 0}
                                className="px-2"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeImage(imageUrl);
                                }}
                                className="px-2 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {selectedImages.length === 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No images selected. The product will be saved without images. 
                        You can upload custom images after saving the product.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Extracted Data Fields */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Extracted Product Data</CardTitle>
                  <div className="flex gap-2">
                    {!isEditing ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleStartEdit}
                      >
                        <Edit3 className="w-4 h-4 mr-1" />
                        Edit Fields
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Save Changes
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderEditableField('Product Name', 'productName', 'text')}
                  {renderEditableField('SKU', 'sku', 'text')}
                  {renderEditableField('Material Type', 'materialType', 'text')}
                  {renderEditableField('Color', 'color', 'text')}
                  {renderEditableField('Weight', 'weight', 'number')}
                  {renderEditableField('Weight Unit', 'weightUnit', 'text')}
                  {renderEditableField('Capacity', 'capacity', 'number')}
                  {renderEditableField('Capacity Unit', 'capacityUnit', 'text')}
                  {renderEditableField('Recycled Content (%)', 'recycledContent', 'number')}
                  {renderEditableField('Price', 'price', 'number')}
                  {renderEditableField('Currency', 'currency', 'text')}
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  {renderEditableField('Description', 'description', 'textarea')}
                </div>

                {editableData?.dimensions && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Dimensions</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div>
                          <Label className="text-xs">Height</Label>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editableData.dimensions.height?.toString() || ''}
                              onChange={(e) => updateEditableField('dimensions', {
                                ...editableData.dimensions,
                                height: parseFloat(e.target.value) || 0
                              })}
                            />
                          ) : (
                            <div className="p-2 bg-gray-50 rounded text-sm">
                              {editableData.dimensions.height || 'N/A'}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs">Width</Label>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editableData.dimensions.width?.toString() || ''}
                              onChange={(e) => updateEditableField('dimensions', {
                                ...editableData.dimensions,
                                width: parseFloat(e.target.value) || 0
                              })}
                            />
                          ) : (
                            <div className="p-2 bg-gray-50 rounded text-sm">
                              {editableData.dimensions.width || 'N/A'}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs">Depth</Label>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editableData.dimensions.depth?.toString() || ''}
                              onChange={(e) => updateEditableField('dimensions', {
                                ...editableData.dimensions,
                                depth: parseFloat(e.target.value) || 0
                              })}
                            />
                          ) : (
                            <div className="p-2 bg-gray-50 rounded text-sm">
                              {editableData.dimensions.depth || 'N/A'}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs">Unit</Label>
                          {isEditing ? (
                            <Input
                              type="text"
                              value={editableData.dimensions.unit?.toString() || ''}
                              onChange={(e) => updateEditableField('dimensions', {
                                ...editableData.dimensions,
                                unit: e.target.value
                              })}
                            />
                          ) : (
                            <div className="p-2 bg-gray-50 rounded text-sm">
                              {editableData.dimensions.unit || 'N/A'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {editableData?.certifications && editableData.certifications.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Certifications</Label>
                      <div className="flex flex-wrap gap-2">
                        {editableData.certifications.map((cert, index) => (
                          <Badge key={index} variant="outline">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button 
                onClick={handleApplyData}
                disabled={disabled}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Apply Data to Form
              </Button>
              <Button 
                variant="outline" 
                onClick={handleReset}
                disabled={disabled}
              >
                Try Another URL
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}