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
  Leaf, Truck, Edit, Droplets, CheckCircle, Beaker, BarChart3
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect } from 'react';
import LCACalculationCard from '@/components/lca/LCACalculationCard';
import { Link } from 'wouter';
import LcaHeader from '@/components/lca/LcaHeader';
import PrimaryBreakdownCharts from '@/components/lca/PrimaryBreakdownCharts';
import DetailedAnalysisTabs from '@/components/lca/DetailedAnalysisTabs';
import ActionableInsights from '@/components/lca/ActionableInsights';
import ProductSustainabilityHeader from '@/components/lca/ProductSustainabilityHeader';
import ProductPDFExport from '@/components/lca/ProductPDFExport';

interface Product {
  id: number;
  name: string;
  [key: string]: any;
}

function ImageDisplay({ photo, productName, index }: { photo: string, productName: string, index: number }) {
  // Handle full Google Cloud Storage URLs - extract the UUID from the path
  let uuid = '';
  if (photo.includes('storage.googleapis.com')) {
    // Extract UUID from full URL: https://storage.googleapis.com/bucket/.private/uploads/UUID
    const parts = photo.split('/');
    uuid = parts[parts.length - 1].split('?')[0]; // Remove query params if present
  } else if (photo.includes('uploads/')) {
    uuid = photo.split('uploads/')[1] || photo.split('uploads/').pop() || '';
  } else {
    uuid = photo.split('/').pop() || '';
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
              <TabsTrigger value="lca" className="text-xs">LCA</TabsTrigger>
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
                          
                          {/* Agriculture & Sourcing Details */}
                          {(ingredient.yieldPerHectare || ingredient.farmingPractice || ingredient.dieselUsage || ingredient.transportDistance) && (
                            <div className="mt-4 p-3 bg-green-50 rounded-lg">
                              <h5 className="font-medium text-green-900 mb-2">Agriculture & Sourcing Details</h5>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                {ingredient.yieldPerHectare > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-600">Yield:</span>
                                    <p>{ingredient.yieldPerHectare} tons/hectare</p>
                                  </div>
                                )}
                                {ingredient.farmingPractice && (
                                  <div>
                                    <span className="font-medium text-gray-600">Farming:</span>
                                    <p className="capitalize">{ingredient.farmingPractice}</p>
                                  </div>
                                )}
                                {ingredient.dieselUsage > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-600">Diesel:</span>
                                    <p>{ingredient.dieselUsage} L/hectare</p>
                                  </div>
                                )}
                                {ingredient.transportDistance > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-600">Transport:</span>
                                    <p>{ingredient.transportDistance} km</p>
                                  </div>
                                )}
                                {ingredient.waterUsage > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-600">Water:</span>
                                    <p>{ingredient.waterUsage} m³/ton</p>
                                  </div>
                                )}
                                {ingredient.biodiversityImpact > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-600">Biodiversity:</span>
                                    <p>{ingredient.biodiversityImpact}/10</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Wheat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No ingredient information available</p>
                    </div>
                  )}
                  
                  {/* Water Dilution Section */}
                  {product.waterDilution && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                        <Droplets className="w-4 h-4" />
                        Water Dilution
                      </h4>
                      <div className="text-sm">
                        <span className="font-medium text-gray-600">Amount: </span>
                        {(() => {
                          const dilution = typeof product.waterDilution === 'string' 
                            ? JSON.parse(product.waterDilution) 
                            : product.waterDilution;
                          return `${dilution.amount} ${dilution.unit}`;
                        })()}
                      </div>
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
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Supplier Name</label>
                          <p className="text-gray-800">{product.packagingSupplier || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Supplier Product</label>
                          <p className="text-gray-800">{product.packagingSelectedProductName || 'Not specified'}</p>
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
                    {/* Supplier Product Information - Move to top of specifications */}
                    {product.packagingSelectedProductName && (
                      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Selected Supplier Product: {product.packagingSelectedProductName}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-blue-700">Supplier</label>
                            <p className="text-blue-900">{product.packagingSupplier || 'Not specified'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-blue-700">Category</label>
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                              {product.packagingSupplierCategory?.replace('_', ' ') || 'Not specified'}
                            </Badge>
                          </div>
                        </div>
                        {/* TODO: Add supplier product image here when available */}
                        <div className="mt-3 text-xs text-blue-600">
                          📦 Bottle specifications below are from this supplier product
                        </div>
                      </div>
                    )}
                    
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

                {/* Labels & Printing */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-avallen-green" />
                      Labels & Printing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {product.labelMaterial && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Label Material</label>
                        <p className="font-medium text-slate-gray capitalize">{product.labelMaterial}</p>
                      </div>
                    )}
                    {product.labelWeight && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Label Weight</label>
                        <p className="font-medium text-slate-gray">{product.labelWeight} g</p>
                      </div>
                    )}
                    {!product.labelMaterial && !product.labelWeight && (
                      <p className="text-sm text-gray-500">No label information recorded</p>
                    )}
                  </CardContent>
                </Card>

                {/* Secondary Packaging */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-avallen-green" />
                      Secondary Packaging
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {product.hasSecondaryPackaging && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Has Secondary Packaging</label>
                        <p className="font-medium text-slate-gray">Yes</p>
                      </div>
                    )}
                    {product.boxMaterial && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Box Material</label>
                        <p className="font-medium text-slate-gray capitalize">{product.boxMaterial}</p>
                      </div>
                    )}
                    {product.boxWeight && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Box Weight</label>
                        <p className="font-medium text-slate-gray">{product.boxWeight} g</p>
                      </div>
                    )}
                    {!product.hasSecondaryPackaging && !product.boxMaterial && !product.boxWeight && (
                      <p className="text-sm text-gray-500">No secondary packaging recorded</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Production Tab */}
            <TabsContent value="production">
              {(() => {
                // Parse production methods JSON data
                let productionData: any = {};
                try {
                  if (product.productionMethods) {
                    productionData = typeof product.productionMethods === 'string' 
                      ? JSON.parse(product.productionMethods) 
                      : product.productionMethods;
                  }
                } catch (e) {
                  console.warn('Failed to parse production methods:', e);
                }

                return (
                  <div className="space-y-6">
                    {/* Basic Production Information */}
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
                              <p className="text-gray-800 capitalize">{product.productionModel || productionData.productionModel || 'Not specified'}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">Annual Production Volume</label>
                              <p className="text-gray-800">
                                {product.annualProductionVolume || productionData.annualProductionVolume ? 
                                  `${(product.annualProductionVolume || productionData.annualProductionVolume).toLocaleString()} ${product.productionUnit || productionData.productionUnit || 'units'}` : 
                                  'Not specified'}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">Facility Location</label>
                              <p className="text-gray-800">{productionData.facilityLocation || 'Not specified'}</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-gray-600">Energy Source</label>
                              <p className="text-gray-800">{productionData.energySource || 'Not specified'}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">Water Source Type</label>
                              <p className="text-gray-800">{productionData.waterSourceType || 'Not specified'}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">Waste Management</label>
                              <p className="text-gray-800">{productionData.wasteManagement || 'Not specified'}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Energy Consumption */}
                    {productionData.energyConsumption && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Factory className="w-5 h-5" />
                            Energy Consumption
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {productionData.energyConsumption.electricityKwh > 0 && (
                              <div>
                                <label className="text-sm font-medium text-gray-600">Electricity</label>
                                <p className="text-gray-800">{productionData.energyConsumption.electricityKwh} kWh</p>
                              </div>
                            )}
                            {productionData.energyConsumption.gasM3 > 0 && (
                              <div>
                                <label className="text-sm font-medium text-gray-600">Gas</label>
                                <p className="text-gray-800">{productionData.energyConsumption.gasM3} m³</p>
                              </div>
                            )}
                            {productionData.energyConsumption.steamKg > 0 && (
                              <div>
                                <label className="text-sm font-medium text-gray-600">Steam</label>
                                <p className="text-gray-800">{productionData.energyConsumption.steamKg} kg</p>
                              </div>
                            )}
                            {productionData.energyConsumption.fuelLiters > 0 && (
                              <div>
                                <label className="text-sm font-medium text-gray-600">Fuel</label>
                                <p className="text-gray-800">{productionData.energyConsumption.fuelLiters} L</p>
                              </div>
                            )}
                            {productionData.energyConsumption.renewableEnergyPercent > 0 && (
                              <div>
                                <label className="text-sm font-medium text-gray-600">Renewable Energy</label>
                                <p className="text-gray-800">{productionData.energyConsumption.renewableEnergyPercent}%</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Water Usage */}
                    {productionData.waterUsage && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Droplets className="w-5 h-5" />
                            Water Usage
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {productionData.waterUsage.processWaterLiters > 0 && (
                              <div>
                                <label className="text-sm font-medium text-gray-600">Process Water</label>
                                <p className="text-gray-800">{productionData.waterUsage.processWaterLiters} L</p>
                              </div>
                            )}
                            {productionData.waterUsage.cleaningWaterLiters > 0 && (
                              <div>
                                <label className="text-sm font-medium text-gray-600">Cleaning Water</label>
                                <p className="text-gray-800">{productionData.waterUsage.cleaningWaterLiters} L</p>
                              </div>
                            )}
                            {productionData.waterUsage.coolingWaterLiters > 0 && (
                              <div>
                                <label className="text-sm font-medium text-gray-600">Cooling Water</label>
                                <p className="text-gray-800">{productionData.waterUsage.coolingWaterLiters} L</p>
                              </div>
                            )}
                            <div>
                              <label className="text-sm font-medium text-gray-600">Waste Water Treatment</label>
                              <p className="text-gray-800">{productionData.waterUsage.wasteWaterTreatment ? 'Yes' : 'No'}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Process Specific Data */}
                    {productionData.processing && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Factory className="w-5 h-5" />
                            Processing Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {productionData.processing.electricityKwhPerTonCrop > 0 && (
                              <div>
                                <label className="text-sm font-medium text-gray-600">Electricity per Ton Crop</label>
                                <p className="text-gray-800">{productionData.processing.electricityKwhPerTonCrop} kWh/ton</p>
                              </div>
                            )}
                            {productionData.processing.lpgKgPerLAlcohol > 0 && (
                              <div>
                                <label className="text-sm font-medium text-gray-600">LPG per L Alcohol</label>
                                <p className="text-gray-800">{productionData.processing.lpgKgPerLAlcohol} kg/L</p>
                              </div>
                            )}
                            {productionData.processing.angelsSharePercentage > 0 && (
                              <div>
                                <label className="text-sm font-medium text-gray-600">Angels' Share</label>
                                <p className="text-gray-800">{productionData.processing.angelsSharePercentage}%</p>
                              </div>
                            )}
                            {productionData.processing.waterM3PerTonCrop > 0 && (
                              <div>
                                <label className="text-sm font-medium text-gray-600">Water per Ton Crop</label>
                                <p className="text-gray-800">{productionData.processing.waterM3PerTonCrop} m³/ton</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Fermentation & Distillation */}
                    {(productionData.fermentation || productionData.distillation) && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Factory className="w-5 h-5" />
                            Fermentation & Distillation
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {productionData.fermentation && (
                              <div className="space-y-3">
                                <h4 className="font-medium text-gray-900">Fermentation</h4>
                                {productionData.fermentation.fermentationTime && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">Fermentation Time</label>
                                    <p className="text-gray-800">{productionData.fermentation.fermentationTime} days</p>
                                  </div>
                                )}
                                {productionData.fermentation.yeastType && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">Yeast Type</label>
                                    <p className="text-gray-800">{productionData.fermentation.yeastType}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            {productionData.distillation && (
                              <div className="space-y-3">
                                <h4 className="font-medium text-gray-900">Distillation</h4>
                                {productionData.distillation.distillationRounds && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">Distillation Rounds</label>
                                    <p className="text-gray-800">{productionData.distillation.distillationRounds}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* If no production data available */}
                    {!productionData || Object.keys(productionData).length === 0 && (
                      <Card>
                        <CardContent className="text-center py-8">
                          <Factory className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">No production information available</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                );
              })()}
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
              {(() => {
                // Parse LCA data for distribution information
                let distributionData: any = {};
                try {
                  if (product.lcaData && product.lcaData.distribution) {
                    distributionData = product.lcaData.distribution;
                  }
                } catch (e) {
                  console.warn('Failed to parse distribution data:', e);
                }

                return (
                  <div className="space-y-6">
                    {/* Basic Distribution Information */}
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
                          {(product.averageTransportDistance || distributionData.avgDistanceToDcKm) && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Average Transport Distance</label>
                              <p className="text-gray-800">{product.averageTransportDistance || distributionData.avgDistanceToDcKm} km</p>
                            </div>
                          )}
                          {(product.primaryTransportMode || distributionData.primaryTransportMode) && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Primary Transport Mode</label>
                              <p className="text-gray-800 capitalize">{product.primaryTransportMode || distributionData.primaryTransportMode}</p>
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
                          {distributionData.palletizationEfficiency && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Palletization Efficiency</label>
                              <p className="text-gray-800">{distributionData.palletizationEfficiency}%</p>
                            </div>
                          )}
                          {product.distributionCenters && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Distribution Centers</label>
                              <p className="text-gray-800">{product.distributionCenters}</p>
                            </div>
                          )}
                          {product.packagingEfficiency && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Packaging Efficiency</label>
                              <p className="text-gray-800">{product.packagingEfficiency}%</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Temperature Control */}
                    {distributionData.temperatureRangeCelsius && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Truck className="w-5 h-5" />
                            Temperature Control
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-600">Minimum Temperature</label>
                              <p className="text-gray-800">{distributionData.temperatureRangeCelsius.min}°C</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">Maximum Temperature</label>
                              <p className="text-gray-800">{distributionData.temperatureRangeCelsius.max}°C</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* If no distribution data available */}
                    {!product.averageTransportDistance && !product.primaryTransportMode && !distributionData.avgDistanceToDcKm && (
                      <Card>
                        <CardContent className="text-center py-8">
                          <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">No distribution information available</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                );
              })()}
            </TabsContent>

            {/* End of Life Tab */}
            <TabsContent value="endoflife">
              <div className="space-y-6">
                {/* Recycling & Disposal */}
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

                {/* Consumer Education */}
                {product.consumerEducation && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Info className="w-5 h-5" />
                        Consumer Education
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-800">{product.consumerEducation}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Environmental Impact Summary */}
                {(product.carbonFootprint || product.waterFootprint) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Leaf className="w-5 h-5" />
                        Environmental Impact Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {product.carbonFootprint && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Carbon Footprint</label>
                            <p className="text-gray-800">{product.carbonFootprint} kg CO₂e</p>
                          </div>
                        )}
                        {product.waterFootprint && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Water Footprint</label>
                            <p className="text-gray-800">{product.waterFootprint} L</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* If no end-of-life data available */}
                {!product.returnableContainer && !product.recyclingRate && !product.disposalMethod && !product.consumerEducation && (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Recycle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No end-of-life information available</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* LCA Tab */}
            <TabsContent value="lca">
              <LCATabContent product={product} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

// LCA Tab Content Component
function LCATabContent({ product }: { product: Product }) {
  const { data: lcaData, isLoading, error } = useQuery({
    queryKey: [`/api/products/${product.id}/lca-visual-data`],
    enabled: !!product,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-avallen-green border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading comprehensive LCA analysis...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-600 mb-4">Failed to load LCA analysis data</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-avallen-green text-white rounded-lg hover:bg-avallen-green/90"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Product Sustainability Header with Key Metrics */}
      {lcaData && (lcaData as any).product && (lcaData as any).metrics && (
        <ProductSustainabilityHeader 
          product={(lcaData as any).product}
          metrics={(lcaData as any).metrics}
        />
      )}

      {/* LCA Calculation Card - Real-time LCA Results */}
      <LCACalculationCard product={product} />
      
      {/* Enhanced OpenLCA Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            OpenLCA Integration Status
            <Badge variant="secondary" className="ml-2 text-xs">ISO 14040/14044 Compliant</Badge>
          </CardTitle>
          <CardDescription>
            Automated environmental impact calculations using ecoinvent v3.9 LCI database with IPCC AR5 GWP factors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium text-green-800">Agriculture Data</span>
              </div>
              <p className="text-sm text-green-700">Automated yield, water, and carbon calculations from ingredient selection</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="font-medium text-blue-800">7-Gas GHG Analysis</span>
              </div>
              <p className="text-sm text-blue-700">ISO 14064-1 compliant greenhouse gas breakdown with IPCC AR5 factors</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="font-medium text-purple-800">Impact Categories</span>
              </div>
              <p className="text-sm text-purple-700">Comprehensive environmental impact assessment across multiple categories</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed LCA Analysis Components */}
      {lcaData && (lcaData as any).breakdown ? (
        <>
          {/* Section 2: Primary Breakdown Charts */}
          <PrimaryBreakdownCharts 
            carbonBreakdown={(lcaData as any).breakdown.carbon}
            waterBreakdown={(lcaData as any).breakdown.water}
          />

          {/* Section 3: Detailed Analysis Tabs */}
          <DetailedAnalysisTabs 
            detailedAnalysis={(lcaData as any).detailedAnalysis}
          />

          {/* Section 4: Actionable Insights */}
          <ActionableInsights 
            insights={(lcaData as any).insights}
          />
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Comprehensive Analysis Loading</h3>
            <p className="text-gray-600 mb-4">
              Environmental impact analysis will appear here once data is available.
            </p>
            <p className="text-sm text-gray-500">
              Run LCA calculation above to generate detailed breakdown charts and insights.
            </p>
          </CardContent>
        </Card>
      )}

      {/* PDF Export Section - Always visible at bottom */}
      <ProductPDFExport product={product} />

      {/* Raw Materials & Ingredients Impact - Supporting Detail */}
      {(() => {
        let ingredients: any[] = [];
        try {
          if (product.ingredients) {
            ingredients = Array.isArray(product.ingredients) ? product.ingredients : JSON.parse(product.ingredients || '[]');
          }
        } catch (e) {
          console.warn('Failed to parse ingredients:', e);
        }

        const toNum = (val: any) => val ? (typeof val === 'string' ? parseFloat(val) : val) : 0;

        return ingredients.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wheat className="w-5 h-5" />
                Raw Materials Environmental Impact
                <Badge variant="outline" className="ml-2 text-xs">OpenLCA Enhanced</Badge>
              </CardTitle>
              <CardDescription>
                OpenLCA ecoinvent database provides automated environmental calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ingredients.map((ingredient: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 bg-green-50">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-lg">{ingredient.name}</h4>
                      <div className="text-sm text-green-600 font-medium">
                        {toNum(ingredient.amount)} {ingredient.unit}
                        <Badge variant="secondary" className="ml-2 text-xs">OpenLCA Validated</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <label className="text-gray-600">Origin Country</label>
                        <p className="font-medium">{ingredient.origin || 'Not specified'}</p>
                      </div>
                      <div>
                        <label className="text-gray-600">Transport Distance</label>
                        <p className="font-medium">{toNum(ingredient.transportDistance)} km</p>
                      </div>
                      <div>
                        <label className="text-gray-600">Water Usage</label>
                        <p className="font-medium">{toNum(ingredient.waterUsage)} L</p>
                      </div>
                      <div>
                        <label className="text-gray-600">Processing Energy</label>
                        <p className="font-medium">{toNum(ingredient.processingEnergy)} kWh</p>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-green-600 bg-green-100 p-2 rounded">
                      <strong>OpenLCA Automation:</strong> Carbon footprint, water usage, and land use data 
                      calculated automatically from ecoinvent LCI database. Manual agriculture field entry no longer required.
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null;
      })()}
    </div>
  );
}

export default ProductDetail;
