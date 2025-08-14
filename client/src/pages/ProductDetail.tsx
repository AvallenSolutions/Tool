import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, Package, Building2, FileText, Globe, Mail,
  Weight, Ruler, Recycle, Award, Info
} from 'lucide-react';

function ProductDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['/api/supplier-products', id],
    queryFn: async () => {
      const response = await fetch(`/api/supplier-products/${id}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load product');
      return response.json();
    },
  });

  if (productLoading) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Product Details" subtitle="Loading product information..." />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Product Not Found" subtitle="The requested product could not be found" />
          <main className="flex-1 p-6 overflow-y-auto">
            <Card>
              <CardContent className="pt-6 text-center">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Product Not Found</h2>
                <p className="text-gray-600 mb-4">The product you're looking for doesn't exist or has been removed.</p>
                <Button onClick={() => setLocation('/app/supplier-network')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Supplier Network
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header 
          title={product.productName} 
          subtitle={`Product details from ${product.supplierName}`} 
        />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="mb-6">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setLocation('/app/supplier-network')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Network
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setLocation(`/app/supplier-network/supplier/${product.supplierId}`)}
              >
                <Building2 className="w-4 h-4 mr-2" />
                View Supplier
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product Images */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Product Images</CardTitle>
                </CardHeader>
                <CardContent>
                  {product.productImages && product.productImages.length > 0 ? (
                    <div className="space-y-4">
                      {product.productImages.map((photo: string, index: number) => (
                        <img 
                          key={index} 
                          src={photo.startsWith('/objects/') ? photo : `/objects/${photo.split('/uploads/')[1]}`}
                          alt={`${product.name} - Image ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg border"
                          onError={(e) => {
                            console.error('Image failed to load:', photo);
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No product images available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Product Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl">{product.productName}</CardTitle>
                      <CardDescription>
                        by <span className="font-medium">{product.supplierName}</span>
                      </CardDescription>
                    </div>
                    {product.hasPrecalculatedLca && (
                      <Badge className="bg-green-100 text-green-800 border-green-300">
                        <FileText className="w-3 h-3 mr-1" />
                        LCA Data Available
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {product.productDescription && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Description</label>
                      <p className="text-gray-800">{product.productDescription}</p>
                    </div>
                  )}

                  {/* LCA Document */}
                  {product.productAttributes?.lcaDocumentPath && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <label className="text-sm font-medium text-blue-800">LCA Document Available</label>
                          </div>
                          <p className="text-sm text-blue-600">
                            View detailed Life Cycle Assessment data for this product
                          </p>
                        </div>
                        <Button variant="outline" asChild className="text-blue-600 hover:text-blue-800">
                          <a
                            href={`/uploads/${product.productAttributes.lcaDocumentPath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            View LCA Document
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* CO2 Emissions Highlight */}
                  {product.productAttributes?.co2Emissions && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <label className="text-sm font-medium text-green-800">Environmental Impact Data</label>
                      </div>
                      <p className="text-2xl font-bold text-green-800">
                        {product.productAttributes.co2Emissions}g CO2e
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        Supplier-verified carbon footprint per unit
                      </p>
                    </div>
                  )}

                  {product.sku && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">SKU</label>
                      <p className="font-mono text-sm">{product.sku}</p>
                    </div>
                  )}

                  {/* Product Specifications */}
                  {product.productAttributes && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 mb-3 block">Product Specifications</label>
                      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                        {product.productAttributes.material && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Material</span>
                            <p className="font-medium text-lg">{product.productAttributes.material}</p>
                          </div>
                        )}
                        {product.productAttributes.weight && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Weight</span>
                            <p className="font-medium text-lg">
                              {product.productAttributes.weight}{product.productAttributes.weightUnit || 'g'}
                            </p>
                          </div>
                        )}
                        {product.productAttributes.recycledContent !== undefined && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Recycled Content</span>
                            <p className="font-medium text-lg">{product.productAttributes.recycledContent}%</p>
                          </div>
                        )}
                        {product.productAttributes.co2Emissions && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">CO2 Emissions</span>
                            <p className="font-medium text-lg text-green-700">
                              {product.productAttributes.co2Emissions}g CO2e
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {product.productAttributes.type && (
                        <div className="mt-4">
                          <span className="text-xs font-medium text-gray-500">Product Type</span>
                          <p className="font-medium">{product.productAttributes.type}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pricing & Availability */}
                  {(product.basePrice || product.minimumOrderQuantity || product.leadTimeDays) && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 mb-3 block">Pricing & Availability</label>
                      <div className="grid grid-cols-3 gap-4">
                        {product.basePrice && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Base Price</span>
                            <p className="font-medium">{product.basePrice} {product.currency || 'USD'}</p>
                          </div>
                        )}
                        {product.minimumOrderQuantity && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Minimum Order</span>
                            <p className="font-medium">{product.minimumOrderQuantity} units</p>
                          </div>
                        )}
                        {product.leadTimeDays && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Lead Time</span>
                            <p className="font-medium">{product.leadTimeDays} days</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {product.certifications && product.certifications.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 mb-3 block">Certifications</label>
                      <div className="flex flex-wrap gap-2">
                        {product.certifications.map((cert: string, index: number) => (
                          <Badge key={index} variant="outline">{cert}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ProductDetail;