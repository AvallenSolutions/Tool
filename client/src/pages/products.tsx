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
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header 
          title="Products" 
          subtitle="Manage your product catalog and track environmental footprints" 
        />
        <main className="flex-1 p-6 overflow-y-auto">
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
                          <div className="w-32 h-32 bg-gradient-to-br from-avallen-green/10 to-avallen-green/5 flex items-center justify-center flex-shrink-0">
                            {product.productImages && product.productImages.length > 0 ? (
                              <img 
                                src={product.productImages[0]} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`flex flex-col items-center ${product.productImages && product.productImages.length > 0 ? 'hidden' : ''}`}>
                              <Package className="w-8 h-8 text-avallen-green mb-1" />
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
                                
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium text-gray-700">SKU:</span>{' '}
                                    <span className="text-gray-600">{product.sku || 'Not set'}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-700">Volume:</span>{' '}
                                    <span className="text-gray-600">{product.volume || 'Not set'}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-700">Type:</span>{' '}
                                    <span className="text-gray-600 capitalize">{product.type}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-700">Production:</span>{' '}
                                    <span className="text-gray-600">
                                      {product.productionModel === 'in-house' ? 'In-House' : 
                                       product.productionModel === 'contract' ? 'Contract' : 'Not set'}
                                    </span>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="font-medium text-gray-700">Annual Volume:</span>{' '}
                                    <span className="text-gray-600">
                                      {product.annualProductionVolume?.toLocaleString() || 'Not set'} {product.productionUnit}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Actions & Metrics */}
                              <div className="flex flex-col items-end justify-between ml-6">
                                {product.carbonFootprint && typeof product.carbonFootprint === 'number' && (
                                  <div className="text-center bg-white/70 rounded-lg p-3 border border-green-200">
                                    <p className="text-xs font-medium text-green-700 mb-1">CO₂ Footprint</p>
                                    <p className="text-lg font-bold text-green-800">
                                      {product.carbonFootprint.toFixed(2)} kg
                                    </p>
                                    <p className="text-xs text-green-600">per unit</p>
                                  </div>
                                )}
                                
                                <div className="flex items-center space-x-2 mt-4">
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
                            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center flex-shrink-0">
                              {product.productImages && product.productImages.length > 0 ? (
                                <img 
                                  src={product.productImages[0]} 
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`flex flex-col items-center ${product.productImages && product.productImages.length > 0 ? 'hidden' : ''}`}>
                                {product.productionModel === 'in-house' ? (
                                  <Factory className="w-6 h-6 text-gray-400 mb-1" />
                                ) : (
                                  <ExternalLink className="w-6 h-6 text-gray-400 mb-1" />
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
                                  
                                  <div className="space-y-1 text-xs text-gray-500">
                                    <div className="flex items-center space-x-4">
                                      <span>
                                        <span className="font-medium">SKU:</span> {product.sku || 'Not set'}
                                      </span>
                                      <span>
                                        <span className="font-medium">Volume:</span> {product.volume || 'Not set'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-medium">Annual:</span> {product.annualProductionVolume?.toLocaleString() || 'Not set'} {product.productionUnit}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Actions & Metrics */}
                                <div className="flex flex-col items-end justify-between ml-3 h-full">
                                  {product.carbonFootprint && typeof product.carbonFootprint === 'number' && (
                                    <div className="text-center bg-green-50 rounded px-2 py-1 border border-green-200 mb-2">
                                      <p className="text-xs font-medium text-green-700">CO₂</p>
                                      <p className="text-sm font-bold text-green-800">
                                        {product.carbonFootprint.toFixed(1)}kg
                                      </p>
                                    </div>
                                  )}
                                  
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

                  {/* Summary Card */}
                  {products.length > 0 && (
                    <Card className="bg-blue-50 border-blue-200 mt-6">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Layers className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-800">
                                Portfolio Overview
                              </span>
                            </div>
                            <div className="text-sm text-blue-700">
                              {products.length} {products.length === 1 ? 'product' : 'products'} •
                              {products.filter(p => p.status === 'active').length} active •
                              {products.filter(p => p.carbonFootprint).length} with footprint data
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="text-blue-700">
                              <span className="font-medium">Total Annual Volume:</span>{' '}
                              {products.reduce((sum, p) => sum + (p.annualProductionVolume || 0), 0).toLocaleString()} units
                            </div>
                            {products.some(p => p.carbonFootprint && typeof p.carbonFootprint === 'number') && (
                              <div className="text-blue-700">
                                <span className="font-medium">Portfolio CO₂:</span>{' '}
                                {products.reduce((sum, p) => sum + (typeof p.carbonFootprint === 'number' ? p.carbonFootprint : 0), 0).toFixed(2)} kg
                              </div>
                            )}
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