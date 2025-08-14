import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  Award, Package, Building, MapPin, Clock, DollarSign, Truck, CheckCircle,
  FileText, Download, Weight, Ruler, Recycle, Factory, Leaf
} from "lucide-react";

interface SupplierProduct {
  id: string;
  supplierId: string;
  productName: string;
  productDescription?: string;
  sku?: string;
  hasPrecalculatedLca: boolean;
  lcaDataJson?: any;
  productAttributes?: any;
  basePrice?: number;
  currency?: string;
  minimumOrderQuantity?: number;
  leadTimeDays?: number;
  certifications?: string[];
  supplierName: string;
  supplierCategory: string;
}

interface SupplierProductDetailProps {
  product: SupplierProduct;
  showLcaData?: boolean;
}

export default function SupplierProductDetail({ product, showLcaData = true }: SupplierProductDetailProps) {
  const formatPrice = (price?: number, currency?: string) => {
    if (!price) return "Price on request";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
  };

  // Image processing function similar to ProductDetail.tsx
  const ImageDisplay = ({ photo, productName, index }: { photo: string, productName: string, index: number }) => {
    // Handle full Google Cloud Storage URLs - extract the UUID from the path
    let uuid = '';
    if (photo.includes('storage.googleapis.com')) {
      // Extract UUID from full URL: https://storage.googleapis.com/bucket/.private/uploads/UUID
      const parts = photo.split('/');
      uuid = parts[parts.length - 1].split('?')[0]; // Remove query params if present
    } else if (photo.includes('uploads/')) {
      uuid = photo.split('uploads/')[1] || photo.split('uploads/').pop();
    } else {
      uuid = photo.split('/').pop();
    }
    
    const imageSrc = `/objects/uploads/${uuid}`;
    
    return (
      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-2">Image {index + 1}</div>
        <img 
          src={imageSrc}
          alt={`${productName} - Image ${index + 1}`}
          className="w-full h-64 object-cover rounded-lg border shadow-sm hover:shadow-md transition-shadow"
          onError={(e) => {
            console.error(`❌ Supplier product image ${index + 1} failed to load`);
            const img = e.target as HTMLImageElement;
            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=';
          }}
        />
      </div>
    );
  };

  const renderProductImages = () => {
    const imageUrls = product.productAttributes?.imageUrls;
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return (
        <div className="text-center py-8">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No product images available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="text-sm text-gray-500 mb-2">Found {imageUrls.length} image(s)</div>
        {imageUrls.map((photo: string, index: number) => (
          <ImageDisplay key={index} photo={photo} productName={product.productName} index={index} />
        ))}
      </div>
    );
  };

  const renderLcaDocument = () => {
    const lcaDocumentPath = product.productAttributes?.lcaDocumentPath;
    if (!lcaDocumentPath) return null;

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          LCA Document
        </h4>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            // Create download link for LCA document
            window.open(`/objects/uploads/${lcaDocumentPath}`, '_blank');
          }}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Download LCA Document
        </Button>
      </div>
    );
  };

  const renderProductAttributes = () => {
    if (!product.productAttributes) return null;

    const attributes = product.productAttributes;
    
    // Filter out imageUrls and lcaDocumentPath as they're handled separately
    const filteredEntries = Object.entries(attributes).filter(([key]) => 
      key !== 'imageUrls' && key !== 'lcaDocumentPath'
    );

    if (filteredEntries.length === 0) return null;

    return (
      <div className="space-y-4">
        <h4 className="font-medium text-lg flex items-center gap-2">
          <Package className="h-5 w-5" />
          Product Specifications
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntries.map(([key, value]) => {
            // Format specific fields with icons
            const formatSpecField = (key: string, value: any) => {
              const keyLower = key.toLowerCase();
              let icon = null;
              let displayValue = value;
              
              if (keyLower.includes('weight')) {
                icon = <Weight className="h-4 w-4 text-muted-foreground" />;
                displayValue = `${value}g`;
              } else if (keyLower.includes('volume')) {
                icon = <Ruler className="h-4 w-4 text-muted-foreground" />;
                displayValue = `${value}ml`;
              } else if (keyLower.includes('co2') || keyLower.includes('emission')) {
                icon = <Leaf className="h-4 w-4 text-green-600" />;
                displayValue = `${value} kg CO₂e`;
              } else if (keyLower.includes('recycled')) {
                icon = <Recycle className="h-4 w-4 text-blue-600" />;
                displayValue = `${value}%`;
              } else if (keyLower.includes('material')) {
                icon = <Factory className="h-4 w-4 text-muted-foreground" />;
              }
              
              return (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-sm text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}:
                    </span>
                  </div>
                  <span className="font-medium text-sm">
                    {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : displayValue}
                  </span>
                </div>
              );
            };
            
            return (
              <div key={key}>
                {formatSpecField(key, value)}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderLcaData = () => {
    if (!showLcaData || !product.hasPrecalculatedLca || !product.lcaDataJson) return null;

    const lca = product.lcaDataJson;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-green-600" />
          <h4 className="font-medium text-sm">Verified LCA Data</h4>
          <Badge variant="secondary" className="text-xs">
            {lca.calculation_method || 'Verified'}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Carbon Footprint:</span>
              <span className="font-medium">
                {lca.carbon_footprint_kg_co2_eq?.toFixed(3)} kg CO₂e
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Water Footprint:</span>
              <span className="font-medium">
                {lca.water_footprint_liters?.toFixed(2)} L
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Energy Consumption:</span>
              <span className="font-medium">
                {lca.energy_consumption_mj?.toFixed(2)} MJ
              </span>
            </div>
          </div>
          
          {lca.verification_body && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Verified by:</span>
                <span className="font-medium">{lca.verification_body}</span>
              </div>
              {lca.valid_until && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valid until:</span>
                  <span className="font-medium">
                    {new Date(lca.valid_until).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Images */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Product Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderProductImages()}
            </CardContent>
          </Card>
        </div>

        {/* Basic Product Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{product.productName}</CardTitle>
                  <CardDescription className="flex items-center gap-2 text-lg mt-2">
                    <Building className="h-5 w-5" />
                    {product.supplierName}
                    {product.sku && (
                      <>
                        <span>•</span>
                        <span>SKU: {product.sku}</span>
                      </>
                    )}
                  </CardDescription>
                </div>
                {product.hasPrecalculatedLca && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Verified LCA
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Description */}
              {product.productDescription && (
                <div>
                  <p className="text-gray-600 leading-relaxed">
                    {product.productDescription}
                  </p>
                </div>
              )}

              {/* Commercial Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="text-sm text-gray-500">Price</div>
                    <div className="font-medium">{formatPrice(product.basePrice, product.currency)}</div>
                  </div>
                </div>
                
                {product.leadTimeDays && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-sm text-gray-500">Lead Time</div>
                      <div className="font-medium">{product.leadTimeDays} days</div>
                    </div>
                  </div>
                )}
                
                {product.minimumOrderQuantity && (
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-purple-600" />
                    <div>
                      <div className="text-sm text-gray-500">MOQ</div>
                      <div className="font-medium">{product.minimumOrderQuantity}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Certifications */}
              {product.certifications && product.certifications.length > 0 && (
                <div>
                  <h4 className="font-medium text-lg mb-2 flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Certifications
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {product.certifications.map((cert, index) => (
                      <Badge key={index} variant="outline" className="text-sm">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Specifications */}
          {product.productAttributes && (
            <Card>
              <CardContent className="pt-6">
                {renderProductAttributes()}
              </CardContent>
            </Card>
          )}

          {/* LCA Document */}
          {product.productAttributes?.lcaDocumentPath && (
            <Card>
              <CardContent className="pt-6">
                {renderLcaDocument()}
              </CardContent>
            </Card>
          )}

          {/* LCA Data */}
          {showLcaData && renderLcaData()}
        </div>
      </div>
    </div>
  );
}