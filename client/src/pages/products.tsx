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

import { Package, Plus, Edit, Trash2, Factory, ExternalLink, Leaf, Users, Layers } from 'lucide-react';
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


  const { data: products = [], isLoading, error } = useQuery<ClientProduct[]>({
    queryKey: ['/api/products'],
    retry: false,
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
      
      const data = await response.json();
      console.log('✅ Products received:', data.length, 'products');
      console.log('📦 Raw product data:', data);
      return data;
    }
  });

  console.log('🔍 Current products state:', products, 'Loading:', isLoading, 'Error:', error);

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
  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    queryClient.refetchQueries({ queryKey: ['/api/products'] });
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
                    <Card key={product.id} className="border-2 border-avallen-green bg-gradient-to-r from-green-50 to-green-25">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-avallen-green/20 rounded-full flex items-center justify-center">
                              <Package className="w-6 h-6 text-avallen-green" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="text-lg font-semibold text-slate-gray">{product.name}</h3>
                                <Badge className="bg-avallen-green text-white">Main Product</Badge>
                                <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                                  {product.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                {product.sku && `SKU: ${product.sku} • `}
                                {product.volume || 'Volume TBD'} {product.type} • 
                                {product.productionModel === 'own' ? ' Own Production' : 
                                 product.productionModel === 'contract' ? ' Contract Production' : ' Production Model TBD'}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Annual Volume: {product.annualProductionVolume?.toLocaleString() || 'TBD'} {product.productionUnit}
                                {product.componentCount && ` • ${product.componentCount} Components`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            {product.carbonFootprint && (
                              <div className="text-center">
                                <p className="text-sm font-medium text-green-700">CO₂ Footprint</p>
                                <p className="text-lg font-semibold text-green-800">
                                  {product.carbonFootprint.toFixed(2)} kg
                                </p>
                              </div>
                            )}
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/app/products/${product.id}`)}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(product.id, product.name)}
                                className="text-red-600 hover:text-red-700 hover:border-red-200"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Other Products */}
                  <div className="grid grid-cols-1 gap-4">
                    {products.filter(p => !p.isMainProduct).map((product) => (
                      <Card key={product.id} className="border border-light-gray hover:bg-gray-50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                {product.productionModel === 'own' ? (
                                  <Factory className="w-5 h-5 text-gray-600" />
                                ) : (
                                  <ExternalLink className="w-5 h-5 text-gray-600" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h3 className="font-medium text-slate-gray">{product.name}</h3>
                                  <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                                    {product.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-500">
                                  {product.sku && `SKU: ${product.sku} • `}
                                  {product.volume || 'Volume TBD'} • {product.type}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Annual: {product.annualProductionVolume?.toLocaleString() || 'TBD'} {product.productionUnit}
                                  {product.componentCount && ` • ${product.componentCount} Components`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              {product.carbonFootprint && (
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">CO₂ Footprint</p>
                                  <p className="text-sm font-medium text-green-700">
                                    {product.carbonFootprint.toFixed(2)} kg
                                  </p>
                                </div>
                              )}
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/app/products/${product.id}`)}
                                >
                                  <Edit className="w-4 h-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(product.id, product.name)}
                                  className="text-red-600 hover:text-red-700 hover:border-red-200"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
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
                            {products.some(p => p.carbonFootprint) && (
                              <div className="text-blue-700">
                                <span className="font-medium">Portfolio CO₂:</span>{' '}
                                {products.reduce((sum, p) => sum + (p.carbonFootprint || 0), 0).toFixed(2)} kg
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

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-blue-800 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Supplier Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-700 mb-3">
                  Client products are built by selecting components from your verified supplier network. Each component contributes to the overall environmental impact calculation.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/app/supplier-network')}
                  className="text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  Browse Supplier Network
                </Button>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-green-800 flex items-center gap-2">
                  <Leaf className="w-4 h-4" />
                  Environmental Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-700 mb-3">
                  Track CO₂, water, and waste footprints by combining the environmental data from all selected supplier components for comprehensive sustainability reporting.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/app/lca')}
                  className="text-green-700 border-green-300 hover:bg-green-100"
                >
                  View LCA Reports
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}