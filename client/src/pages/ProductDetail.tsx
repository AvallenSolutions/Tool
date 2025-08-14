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
  Weight, Ruler, Recycle, Award, Info, Wheat, Box, Factory, 
  Leaf, Truck, Edit
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect } from 'react';

function ImageDisplay({ photo, productName, index }: { photo: string, productName: string, index: number }) {
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
  
  // Force the exact UUID we know works
  if (photo.includes('b0425006-4efb-456c-897e-140a9f9c741d')) {
    uuid = 'b0425006-4efb-456c-897e-140a9f9c741d';
  }
  
  const imageSrc = `/simple-image/objects/uploads/${uuid}`;
  
  console.log(`🔍 Image ${index + 1} Debug:`);
  console.log(`   Original URL: ${photo}`);
  console.log(`   Extracted UUID: ${uuid}`);
  console.log(`   Final route: ${imageSrc}`);
  
  return (
    <div className="mb-4">
      <div className="text-xs text-gray-500 mb-2">Image {index + 1}</div>
      <img 
        src={imageSrc}
        alt={`${productName} - Image ${index + 1}`}
        className="w-full h-64 object-cover rounded-lg border shadow-sm hover:shadow-md transition-shadow"
        onLoad={() => console.log(`✅ Simple image ${index + 1} loaded successfully`)}
        onError={(e) => {
          console.error(`❌ Simple image ${index + 1} failed to load`);
          const img = e.target as HTMLImageElement;
          img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=';
        }}
      />
    </div>
  );
}

function ProductDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  // Use API endpoint for product data
  const { data: product, isLoading: productLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      console.log('Fetching product with ID:', id);
      const response = await fetch(`/api/products/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product');
      }
      const data = await response.json();
      console.log('Product data from API:', data);
      
      // Map API response to expected format - productImages from API
      console.log('Raw productImages from API:', data.productImages);
      return {
        ...data,
        product_images: data.productImages || []
      };
    },
    enabled: !!id,
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

  // Add debugging information
  console.log('Product data from API:', product);
  console.log('Product ID:', id);
  console.log('Product images to display:', product?.product_images);
  
  if (error) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Error Loading Product" subtitle="There was an issue fetching the product data" />
          <main className="flex-1 p-6 overflow-y-auto">
            <Card>
              <CardContent className="text-center py-12">
                <Package className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Product</h3>
                <p className="text-gray-600 mb-2">Error: {error.message}</p>
                <p className="text-gray-500 mb-6">Check the console for more details</p>
                <Button onClick={() => setLocation('/app/products')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Products
                </Button>
              </CardContent>
            </Card>
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
              <CardContent className="text-center py-12">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Product Not Found</h3>
                <p className="text-gray-600 mb-6">The product you're looking for doesn't exist or has been removed.</p>
                <Button onClick={() => setLocation('/app/products')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Products
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
          title={product.name} 
          subtitle="Product details and environmental impact analysis" 
        />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="mb-6">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setLocation('/app/products')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Products
              </Button>
            </div>
          </div>

          {/* 8-Tab Product Detail Interface matching the creation form */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-8 mb-6">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="ingredients" className="text-xs">Ingredients</TabsTrigger>
              <TabsTrigger value="packaging" className="text-xs">Packaging</TabsTrigger>
              <TabsTrigger value="production" className="text-xs">Production</TabsTrigger>
              <TabsTrigger value="certifications" className="text-xs">Certifications</TabsTrigger>
              <TabsTrigger value="distribution" className="text-xs">Distribution</TabsTrigger>
              <TabsTrigger value="endoflife" className="text-xs">End of Life</TabsTrigger>
              <TabsTrigger value="suppliers" className="text-xs">Suppliers</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
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
                      {product.product_images && product.product_images.length > 0 ? (
                        <div className="space-y-4">
                          <div className="text-sm text-gray-500 mb-2">Found {product.product_images?.length || 0} images</div>
                          {product.product_images.map((photo: string, index: number) => {
                            return <ImageDisplay key={index} photo={photo} productName={product.name} index={index} />;
                          })}
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

                {/* Basic Product Information */}
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-2xl">{product.name}</CardTitle>
                          <CardDescription>Basic Product Information</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          {product.status === 'draft' && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
                              Draft
                            </Badge>
                          )}
                          {product.hasPrecalculatedLca && (
                            <Badge className="bg-green-100 text-green-800 border-green-300">
                              <FileText className="w-3 h-3 mr-1" />
                              LCA Data Available
                            </Badge>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setLocation(`/create-enhanced-product?id=${product.id}`)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Product
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">SKU</label>
                          <p className="text-gray-800">{product.sku || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Type</label>
                          <p className="text-gray-800 capitalize">{product.type}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Volume</label>
                          <p className="text-gray-800">{product.volume || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Status</label>
                          <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                            {product.status}
                          </Badge>
                        </div>
                      </div>
                      
                      {product.description && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Description</label>
                          <p className="text-gray-800 mt-1">{product.description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Ingredients Tab */}
            <TabsContent value="ingredients">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wheat className="w-5 h-5" />
                    Key Ingredients
                  </CardTitle>
                  <CardDescription>Primary ingredients and their specifications</CardDescription>
                </CardHeader>
                <CardContent>
                  {product.ingredients ? (
                    <div className="space-y-4">
                      {(() => {
                        if (Array.isArray(product.ingredients)) return product.ingredients;
                        try {
                          return JSON.parse(product.ingredients);
                        } catch {
                          return []; // Return empty array if parsing fails
                        }
                      })().map((ingredient: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4 space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium text-lg">{ingredient.name}</h4>
                            <Badge variant="outline">{ingredient.type || 'Ingredient'}</Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-600">Amount:</span>
                              <p>{ingredient.amount} {ingredient.unit}</p>
                            </div>
                            {ingredient.origin && (
                              <div>
                                <span className="font-medium text-gray-600">Origin:</span>
                                <p>{ingredient.origin}</p>
                              </div>
                            )}
                            {ingredient.organic && (
                              <div>
                                <Badge className="bg-green-100 text-green-800">Organic</Badge>
                              </div>
                            )}
                            {ingredient.supplier && (
                              <div>
                                <span className="font-medium text-gray-600">Supplier:</span>
                                <p>{ingredient.supplier}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Wheat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No ingredient information available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Packaging Tab */}
            <TabsContent value="packaging">
              <div className="space-y-6">
                {/* Selected Supplier Information */}
                {(product.packagingSupplier || product.packagingSupplierId) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Selected Packaging Supplier
                      </CardTitle>
                      <CardDescription>Supplier information for packaging components</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Supplier Name</label>
                          <p className="text-gray-800">{product.packagingSupplier || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Supplier ID</label>
                          <p className="text-gray-800 font-mono text-sm">{product.packagingSupplierId || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Category</label>
                          <Badge variant="outline" className="capitalize">
                            {product.packagingSupplierCategory?.replace('_', ' ') || 'Not specified'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Packaging Specifications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Box className="w-5 h-5" />
                      Packaging Specifications
                    </CardTitle>
                    <CardDescription>Primary container and packaging materials</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Primary Container */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Primary Container</h4>
                        <div className="space-y-3">
                          {product.bottleMaterial && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Material</label>
                              <p className="text-gray-800 capitalize">{product.bottleMaterial}</p>
                            </div>
                          )}
                          {product.bottleWeight && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Weight</label>
                              <p className="text-gray-800">{product.bottleWeight}g</p>
                            </div>
                          )}
                          {product.bottleRecycledContent && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Recycled Content</label>
                              <p className="text-gray-800">{product.bottleRecycledContent}%</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Closure */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Closure</h4>
                        <div className="space-y-3">
                          {product.closureType && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Type</label>
                              <p className="text-gray-800 capitalize">{product.closureType}</p>
                            </div>
                          )}
                          {product.closureMaterial && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Material</label>
                              <p className="text-gray-800 capitalize">{product.closureMaterial}</p>
                            </div>
                          )}
                          {product.closureWeight && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Weight</label>
                              <p className="text-gray-800">{product.closureWeight}g</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Production Tab */}
            <TabsContent value="production">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Factory className="w-5 h-5" />
                    Production Information
                  </CardTitle>
                  <CardDescription>Manufacturing and production details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Production Model</label>
                        <p className="text-gray-800">{product.productionModel || 'Not specified'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Annual Production Volume</label>
                        <p className="text-gray-800">
                          {product.annualProductionVolume ? `${product.annualProductionVolume.toLocaleString()} ${product.productionUnit || 'units'}` : 'Not specified'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Facility Location</label>
                        <p className="text-gray-800">{product.facilityLocation || 'Not specified'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Energy Source</label>
                        <p className="text-gray-800">{product.energySource || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Certifications Tab */}
            <TabsContent value="certifications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Certifications & Standards
                  </CardTitle>
                  <CardDescription>Quality and environmental certifications</CardDescription>
                </CardHeader>
                <CardContent>
                  {product.certifications ? (
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        if (Array.isArray(product.certifications)) return product.certifications;
                        try {
                          return JSON.parse(product.certifications);
                        } catch {
                          return [product.certifications]; // Treat as single certification if not valid JSON
                        }
                      })().map((cert: string, index: number) => (
                        <Badge key={index} variant="outline" className="bg-green-50 text-green-800 border-green-300">
                          <Award className="w-3 h-3 mr-1" />
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No certifications specified</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Distribution Tab */}
            <TabsContent value="distribution">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Distribution & Logistics
                  </CardTitle>
                  <CardDescription>Transportation and distribution information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {product.averageTransportDistance && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Average Transport Distance</label>
                        <p className="text-gray-800">{product.averageTransportDistance} km</p>
                      </div>
                    )}
                    {product.primaryTransportMode && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Primary Transport Mode</label>
                        <p className="text-gray-800 capitalize">{product.primaryTransportMode}</p>
                      </div>
                    )}
                    {product.coldChainRequired !== null && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Cold Chain Required</label>
                        <Badge variant={product.coldChainRequired ? "default" : "outline"}>
                          {product.coldChainRequired ? "Yes" : "No"}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* End of Life Tab */}
            <TabsContent value="endoflife">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Recycle className="w-5 h-5" />
                    End of Life Management
                  </CardTitle>
                  <CardDescription>Recycling and disposal information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {product.returnableContainer !== null && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Returnable Container</label>
                        <Badge variant={product.returnableContainer ? "default" : "outline"}>
                          {product.returnableContainer ? "Yes" : "No"}
                        </Badge>
                      </div>
                    )}
                    {product.recyclingRate && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Recycling Rate</label>
                        <p className="text-gray-800">{product.recyclingRate}%</p>
                      </div>
                    )}
                    {product.disposalMethod && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Disposal Method</label>
                        <p className="text-gray-800 capitalize">{product.disposalMethod}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Suppliers Tab */}
            <TabsContent value="suppliers">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Supplier Information
                  </CardTitle>
                  <CardDescription>All suppliers associated with this product</CardDescription>
                </CardHeader>
                <CardContent>
                  {(product.packagingSupplier || product.packagingSupplierId) ? (
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-medium text-lg">Packaging Supplier</h4>
                          <Badge variant="outline" className="capitalize">
                            {product.packagingSupplierCategory?.replace('_', ' ') || 'Packaging'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">Name:</span>
                            <p>{product.packagingSupplier}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">ID:</span>
                            <p className="font-mono text-sm">{product.packagingSupplierId}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No supplier information available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

export default ProductDetail;