import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Award, Package, Building, MapPin, Clock, DollarSign, Truck, CheckCircle } from "lucide-react";

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

  const renderProductAttributes = () => {
    if (!product.productAttributes) return null;

    const attributes = product.productAttributes;
    const entries = Object.entries(attributes);

    if (entries.length === 0) return null;

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Product Specifications</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {entries.map(([key, value]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-muted-foreground capitalize">
                {key.replace(/_/g, ' ')}:
              </span>
              <span className="font-medium">
                {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
              </span>
            </div>
          ))}
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
    <div className="h-full max-h-[75vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
      <Card className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <CardHeader className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Package className="h-5 w-5" />
              {product.productName}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Building className="h-4 w-4" />
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

      <CardContent className="space-y-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {/* Product Description */}
        {product.productDescription && (
          <div>
            <h4 className="font-medium text-sm mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">{product.productDescription}</p>
          </div>
        )}

        {/* Commercial Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>{formatPrice(product.basePrice, product.currency)}</span>
          </div>
          
          {product.leadTimeDays && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{product.leadTimeDays} days lead time</span>
            </div>
          )}
          
          {product.minimumOrderQuantity && (
            <div className="flex items-center gap-2 text-sm">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span>MOQ: {product.minimumOrderQuantity}</span>
            </div>
          )}
        </div>

        {/* Certifications */}
        {product.certifications && product.certifications.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Certifications</h4>
            <div className="flex flex-wrap gap-2">
              {product.certifications.map((cert, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {cert}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Product Attributes */}
        {renderProductAttributes()}

        {product.productAttributes && product.hasPrecalculatedLca && <Separator />}

        {/* LCA Data */}
        {renderLcaData()}
      </CardContent>
      </Card>
    </div>
  );
}