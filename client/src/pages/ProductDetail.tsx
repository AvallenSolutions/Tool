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

export default function ProductDetail() {
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
                  {product.photos && product.photos.length > 0 ? (
                    <div className="space-y-4">
                      {product.photos.map((photo: string, index: number) => (
                        <img 
                          key={index} 
                          src={photo} 
                          alt={`${product.productName} - Image ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg border"
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
                      <h4 className="font-semibold mb-2 flex items-center">
                        <Info className="w-4 h-4 mr-2" />
                        Description
                      </h4>
                      <p className="text-gray-700">{product.productDescription}</p>
                    </div>
                  )}

                  {product.sku && (
                    <div>
                      <span className="font-semibold">SKU:</span> {product.sku}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Specifications */}
              <Card>
                <CardHeader>
                  <CardTitle>Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {product.materialType && (
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">Material:</span>
                        <span>{product.materialType}</span>
                      </div>
                    )}

                    {product.weight && (
                      <div className="flex items-center gap-2">
                        <Weight className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">Weight:</span>
                        <span>{product.weight}{product.weightUnit || 'g'}</span>
                      </div>
                    )}

                    {product.dimensions && (
                      <div className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">Dimensions:</span>
                        <span>{product.dimensions}</span>
                      </div>
                    )}

                    {(product.recycledContent || product.recycledContent === 0) && (
                      <div className="flex items-center gap-2">
                        <Recycle className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">Recycled Content:</span>
                        <span>{product.recycledContent}%</span>
                      </div>
                    )}

                    {product.category && (
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">Category:</span>
                        <span className="capitalize">{product.category}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Certifications */}
              {product.certifications && product.certifications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      Certifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {product.certifications.map((cert: string, index: number) => (
                        <Badge key={index} variant="outline">{cert}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Supplier Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Supplier Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="font-medium">Company:</span> {product.supplierName}
                  </div>
                  
                  {product.supplierCategory && (
                    <div>
                      <span className="font-medium">Category:</span>{' '}
                      <span className="capitalize">{product.supplierCategory.replace('_', ' ')}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setLocation(`/app/supplier-network/supplier/${product.supplierId}`)}
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      View Supplier Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}