import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import OptimizedProductForm from '@/components/products/OptimizedProductForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Package, Plus, Edit, Trash2, Factory, ExternalLink, Leaf, Users, Layers, Eye } from 'lucide-react';
import { useLocation } from 'wouter';
import { ProductLCAMetricsDisplay } from '@/components/products/ProductLCAMetricsDisplay';

interface ClientProduct {
  id: number;
  name: string;
  sku?: string;
  type: string;
  volume: string;
  description?: string;
  productionModel: string;
  annualProductionVolume: number;
  productionUnit: string;
  carbonFootprint?: number;
  waterFootprint?: number;
  status: string;
  isMainProduct: boolean;
  createdAt: string;
  componentCount?: number;
}

export default function ProductsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();


  const { data: rawProducts, isLoading, error } = useQuery<ClientProduct[]>({
    queryKey: ['/api/products'],
    retry: false,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      console.log('🔄 Fetching products...');
      const response = await fetch('/api/products', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Products fetch failed:', response.status, errorText);
        throw new Error(`Failed to fetch products: ${response.status} ${errorText}`);
      }
      
      const data = await response.json() as ClientProduct[];
      console.log('✅ Products received:', data.length, 'products');
      console.log('📦 Raw product data:', data);
      return data;
    }
  });

  const products: ClientProduct[] = rawProducts || [];

  console.log('🔍 Current products state:', products, 'Loading:', isLoading, 'Error:', error);
  console.log('🔍 Products array length:', products.length);
  console.log('🔍 Products array contents:', JSON.stringify(products, null, 2));

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Product Deleted",
        description: "Product has been successfully removed from your catalog.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      deleteProductMutation.mutate(id);
    }
  };

  const handleCreateSuccess = () => {
    // Invalidate queries to refresh the products list
    console.log('🔄 Invalidating products cache after create success');
    queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    queryClient.refetchQueries({ queryKey: ['/api/products'] });
    toast({
      title: "Success",
      description: "Product created successfully",
    });
  };

  // Add manual refresh function for debugging
  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    await queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    await queryClient.refetchQueries({ queryKey: ['/api/products'] });
    
    // Force a hard refresh by clearing cache and re-fetching
    queryClient.removeQueries({ queryKey: ['/api/products'] });
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header 
          title="Products" 
          subtitle="Manage your product catalog and track environmental footprints" 
        />
        <main className="flex-1 p-6">
          {/* Header Section */}
          <div className="mb-6 p-4 bg-gradient-to-r from-avallen-green/10 to-avallen-green/5 border border-avallen-green/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-gray mb-2">Product Management</h3>
                <p className="text-sm text-gray-600">
                  Create and manage your products by combining supplier components for comprehensive environmental impact assessment
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => navigate('/app/products/create/enhanced')}
                  style={{ backgroundColor: '#209d50', borderColor: '#209d50' }}
                  className="hover:bg-green-600 text-white font-medium px-6 py-2 shadow-md border-2"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Create Product
                </Button>
              </div>
            </div>
          </div>

          {/* Products Section */}
          <Card className="border-light-gray">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold text-slate-gray flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Products
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Your products built from supplier components with complete environmental impact tracking
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {products.length} {products.length === 1 ? 'product' : 'products'}
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefresh}
                    className="text-xs"
                  >
                    Refresh
                  </Button>
                  {error && (
                    <Badge variant="destructive" className="text-xs">
                      Error loading
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-avallen-green mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-gray mb-2">No Products Yet</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Create your first product by selecting supplier components like bottles, ingredients, labels, and packaging to build a complete environmental impact profile.
                  </p>
                  <Button 
                    onClick={() => navigate('/app/products/create/enhanced')}
                    className="bg-avallen-green hover:bg-avallen-green-light text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Product
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Main Product (if any) */}
                  {products.filter(p => p.isMainProduct).map((product) => (
                    <Card key={product.id} className="border-2 border-avallen-green bg-gradient-to-r from-green-50 to-green-25 overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex">
                          {/* Product Image */}
                          <div className="w-40 h-40 bg-gradient-to-br from-avallen-green/10 to-avallen-green/5 flex items-center justify-center flex-shrink-0 relative overflow-hidden rounded-l-lg m-4 ml-6">
                            {product.productImages && product.productImages.length > 0 && (
                              <img 
                                src={`/simple-image/objects/uploads/${product.productImages[0].split('/').pop()}`}
                                alt={product.name}
                                className="w-full h-full object-contain rounded-lg shadow-sm"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const fallback = target.parentElement?.querySelector('.fallback-icon');
                                  if (fallback) fallback.classList.remove('hidden');
                                }}
                              />
                            )}
                            <div className={`fallback-icon flex flex-col items-center ${product.productImages && product.productImages.length > 0 ? 'hidden' : ''}`}>
                              <Package className="w-12 h-12 text-avallen-green mb-2" />
                              <span className="text-xs text-avallen-green font-medium">No Image</span>
                            </div>
                          </div>
                          
                          {/* Product Details */}
                          <div className="flex-1 p-6">
                            <div className="flex justify-between h-full">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h3 className="text-xl font-bold text-slate-gray">{product.name}</h3>
                                  <Badge className="bg-avallen-green text-white">Main Product</Badge>
                                  <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                                    {product.status}
                                  </Badge>
                                </div>
                                
                                {product.description && (
                                  <p className="text-sm text-gray-600 mb-2 max-w-md">
                                    {product.description}
                                  </p>
                                )}
                                
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div className="text-center bg-green-50 rounded-lg p-3 border border-green-200">
                                    <span className="block text-xs font-medium text-green-700 mb-1">CO₂ Footprint</span>
                                    <span className="block text-lg font-bold text-green-800">
                                      {product.carbonFootprint && (typeof product.carbonFootprint === 'number' || typeof product.carbonFootprint === 'string') ? `${Number(product.carbonFootprint).toFixed(2)} kg` : 'TBD'}
                                    </span>
                                    <span className="text-xs text-green-600">per unit</span>
                                  </div>
                                  <div className="text-center bg-blue-50 rounded-lg p-3 border border-blue-200">
                                    <span className="block text-xs font-medium text-blue-700 mb-1">Water Usage</span>
                                    <span className="block text-lg font-bold text-blue-800">
                                      {product.waterFootprint && (typeof product.waterFootprint === 'number' || typeof product.waterFootprint === 'string') ? `${Number(product.waterFootprint).toFixed(1)} L` : 'TBD'}
                                    </span>
                                    <span className="text-xs text-blue-600">per unit</span>
                                  </div>
                                  <div className="text-center bg-orange-50 rounded-lg p-3 border border-orange-200">
                                    <span className="block text-xs font-medium text-orange-700 mb-1">Waste Generated</span>
                                    <span className="block text-lg font-bold text-orange-800">
                                      {product.wasteFootprint && (typeof product.wasteFootprint === 'number' || typeof product.wasteFootprint === 'string') ? `${Number(product.wasteFootprint).toFixed(2)} kg` : 'TBD'}
                                    </span>
                                    <span className="text-xs text-orange-600">per unit</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex flex-col items-end justify-end ml-6">
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate(`/app/products/${product.id}`)}
                                    className="bg-white/80"
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate(`/app/products/${product.id}/enhanced`)}
                                    className="bg-white/80"
                                  >
                                    <Edit className="w-4 h-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(product.id, product.name)}
                                    className="text-red-600 hover:text-red-700 hover:border-red-200 bg-white/80"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Other Products */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {products.filter(p => !p.isMainProduct).map((product) => (
                      <Card key={product.id} className="border border-light-gray hover:shadow-md transition-all duration-200 overflow-hidden">
                        <CardContent className="p-0">
                          <div className="flex">
                            {/* Product Thumbnail */}
                            <div className="w-28 h-28 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center flex-shrink-0 relative overflow-hidden rounded-l-lg m-3 ml-4">
                              {product.productImages && product.productImages.length > 0 && (
                                <img 
                                  src={`/simple-image/objects/uploads/${product.productImages[0].split('/').pop()}`}
                                  alt={product.name}
                                  className="w-full h-full object-contain rounded-lg shadow-sm"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = target.parentElement?.querySelector('.fallback-icon');
                                    if (fallback) fallback.classList.remove('hidden');
                                  }}
                                />
                              )}
                              <div className={`fallback-icon flex flex-col items-center ${product.productImages && product.productImages.length > 0 ? 'hidden' : ''}`}>
                                {product.productionModel === 'in-house' ? (
                                  <Factory className="w-8 h-8 text-gray-400 mb-1" />
                                ) : (
                                  <ExternalLink className="w-8 h-8 text-gray-400 mb-1" />
                                )}
                                <span className="text-xs text-gray-400">No Image</span>
                              </div>
                            </div>
                            
                            {/* Product Info */}
                            <div className="flex-1 p-4">
                              <div className="flex justify-between items-start h-full">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <h3 className="font-semibold text-slate-gray">{product.name}</h3>
                                    <Badge variant={product.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                      {product.status}
                                    </Badge>
                                  </div>
                                  
                                  {product.description && (
                                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                      {product.description.length > 80 ? 
                                        `${product.description.substring(0, 80)}...` : 
                                        product.description
                                      }
                                    </p>
                                  )}
                                  
                                  <ProductLCAMetricsDisplay productId={product.id} />
                                </div>
                                
                                {/* Actions */}
                                <div className="flex flex-col items-end justify-end ml-3 h-full">
                                  <div className="flex items-center space-x-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => navigate(`/app/products/${product.id}`)}
                                      className="h-7 px-2"
                                    >
                                      <Eye className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => navigate(`/app/products/${product.id}/enhanced`)}
                                      className="h-7 px-2"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDelete(product.id, product.name)}
                                      className="text-red-600 hover:text-red-700 hover:border-red-200 h-7 px-2"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Enhanced Portfolio Overview */}
                  {products.length > 0 && (
                    <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200 mt-8 shadow-sm">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-avallen-green/10 rounded-lg">
                              <Layers className="w-5 h-5 text-avallen-green" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-gray">Portfolio Overview</h3>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="bg-white px-2 py-1 rounded border">
                              {products.length} {products.length === 1 ? 'Product' : 'Products'}
                            </span>
                            <span className="bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200">
                              {products.filter(p => p.status === 'active').length} Active
                            </span>
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                              {products.filter(p => p.carbonFootprint && (typeof p.carbonFootprint === 'number' || typeof p.carbonFootprint === 'string')).length} with Footprint Data
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                          {/* Production Volume */}
                          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-gray-700">Annual Production</h4>
                              <Factory className="w-4 h-4 text-gray-400" />
                            </div>
                            <p className="text-2xl font-bold text-slate-gray">
                              {products.reduce((sum, p) => sum + (parseFloat(p.annualProductionVolume?.toString() || '0') || 0), 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">units/year</p>
                          </div>

                          {/* Portfolio Carbon Footprint */}
                          <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-green-700">Total CO₂ Impact</h4>
                              <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              </div>
                            </div>
                            <p className="text-2xl font-bold text-green-800">
                              {products.reduce((sum, p) => {
                                const footprint = p.carbonFootprint && (typeof p.carbonFootprint === 'number' || typeof p.carbonFootprint === 'string') 
                                  ? Number(p.carbonFootprint) : 0;
                                const volume = parseFloat(p.annualProductionVolume?.toString() || '0') || 0;
                                return sum + (footprint * volume);
                              }, 0) > 1000 
                                ? (products.reduce((sum, p) => {
                                    const footprint = p.carbonFootprint && (typeof p.carbonFootprint === 'number' || typeof p.carbonFootprint === 'string') 
                                      ? Number(p.carbonFootprint) : 0;
                                    const volume = parseFloat(p.annualProductionVolume?.toString() || '0') || 0;
                                    return sum + (footprint * volume);
                                  }, 0) / 1000).toFixed(1) + 't'
                                : products.reduce((sum, p) => {
                                    const footprint = p.carbonFootprint && (typeof p.carbonFootprint === 'number' || typeof p.carbonFootprint === 'string') 
                                      ? Number(p.carbonFootprint) : 0;
                                    const volume = parseFloat(p.annualProductionVolume?.toString() || '0') || 0;
                                    return sum + (footprint * volume);
                                  }, 0).toFixed(0) + 'kg'
                              }
                            </p>
                            <p className="text-xs text-green-600">CO₂e annually</p>
                          </div>

                          {/* Portfolio Water Footprint */}
                          <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-blue-700">Total Water Usage</h4>
                              <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              </div>
                            </div>
                            <p className="text-2xl font-bold text-blue-800">
                              {products.reduce((sum, p) => {
                                const waterFootprint = p.waterFootprint && (typeof p.waterFootprint === 'number' || typeof p.waterFootprint === 'string') 
                                  ? Number(p.waterFootprint) : 0;
                                const volume = parseFloat(p.annualProductionVolume?.toString() || '0') || 0;
                                return sum + (waterFootprint * volume);
                              }, 0) > 1000000 
                                ? (products.reduce((sum, p) => {
                                    const waterFootprint = p.waterFootprint && (typeof p.waterFootprint === 'number' || typeof p.waterFootprint === 'string') 
                                      ? Number(p.waterFootprint) : 0;
                                    const volume = parseFloat(p.annualProductionVolume?.toString() || '0') || 0;
                                    return sum + (waterFootprint * volume);
                                  }, 0) / 1000000).toFixed(1) + 'M'
                                : products.reduce((sum, p) => {
                                    const waterFootprint = p.waterFootprint && (typeof p.waterFootprint === 'number' || typeof p.waterFootprint === 'string') 
                                      ? Number(p.waterFootprint) : 0;
                                    const volume = parseFloat(p.annualProductionVolume?.toString() || '0') || 0;
                                    return sum + (waterFootprint * volume);
                                  }, 0).toLocaleString()
                              }L
                            </p>
                            <p className="text-xs text-blue-600">liters annually</p>
                          </div>

                          {/* Portfolio Waste Generation */}
                          <div className="bg-white rounded-lg p-4 border border-orange-200 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-orange-700">Total Waste Generated</h4>
                              <div className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                              </div>
                            </div>
                            <p className="text-2xl font-bold text-orange-800">
                              {products.reduce((sum, p) => {
                                const wasteFootprint = p.wasteFootprint && (typeof p.wasteFootprint === 'number' || typeof p.wasteFootprint === 'string') 
                                  ? Number(p.wasteFootprint) : 0;
                                const volume = parseFloat(p.annualProductionVolume?.toString() || '0') || 0;
                                return sum + (wasteFootprint * volume);
                              }, 0) > 1000 
                                ? (products.reduce((sum, p) => {
                                    const wasteFootprint = p.wasteFootprint && (typeof p.wasteFootprint === 'number' || typeof p.wasteFootprint === 'string') 
                                      ? Number(p.wasteFootprint) : 0;
                                    const volume = parseFloat(p.annualProductionVolume?.toString() || '0') || 0;
                                    return sum + (wasteFootprint * volume);
                                  }, 0) / 1000).toFixed(1) + 't'
                                : products.reduce((sum, p) => {
                                    const wasteFootprint = p.wasteFootprint && (typeof p.wasteFootprint === 'number' || typeof p.wasteFootprint === 'string') 
                                      ? Number(p.wasteFootprint) : 0;
                                    const volume = parseFloat(p.annualProductionVolume?.toString() || '0') || 0;
                                    return sum + (wasteFootprint * volume);
                                  }, 0).toFixed(0) + 'kg'
                              }
                            </p>
                            <p className="text-xs text-orange-600">waste annually</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>


        </main>
      </div>
    </div>
  );
}