import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calculator, Package, Leaf, Droplets, Scale, Edit3 } from "lucide-react";
import { Product } from "@shared/schema";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  // Fetch product data
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["/api/products", id],
    enabled: isAuthenticated && !!id,
    retry: false,
  });

  // Create LCA mutation
  const createLCAMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await apiRequest("POST", `/api/products/${productId}/lca`, {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "LCA Calculation Started",
        description: `Environmental impact calculation for ${product?.name} is now in progress.`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      console.error("Error creating LCA:", error);
      toast({
        title: "LCA Calculation Failed",
        description: "Failed to start environmental impact calculation. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || productLoading) {
    return (
      <div className="min-h-screen bg-lightest-gray flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-avallen-green border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-lightest-gray flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-gray mb-2">Product Not Found</h2>
          <p className="text-gray-600 mb-4">The product you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/app/products")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  const handleCreateLCA = () => {
    if (id) {
      createLCAMutation.mutate(id);
    }
  };

  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header 
          title={product.name} 
          subtitle="Product details and environmental impact analysis" 
        />
        
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Back button and actions */}
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                onClick={() => navigate("/app/products")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Products
              </Button>
              
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/app/products/${id}/edit`)}
                  className="flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Product
                </Button>
                <Button 
                  onClick={handleCreateLCA}
                  disabled={createLCAMutation.isPending}
                  className="bg-avallen-green hover:bg-green-600 text-white flex items-center gap-2"
                >
                  {createLCAMutation.isPending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4" />
                      Create LCA
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Product overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Product image and basic info */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-avallen-green" />
                    Product Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Product image */}
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    {product.packShotUrl ? (
                      <img 
                        src={product.packShotUrl} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  
                  {/* Basic info */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Product Name</label>
                      <p className="text-lg font-semibold text-slate-gray">{product.name}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">SKU</label>
                        <p className="font-medium text-slate-gray">{product.sku}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Type</label>
                        <Badge variant="outline" className="capitalize">
                          {product.type || 'Not specified'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Volume</label>
                        <p className="font-medium text-slate-gray">{product.volume || 'Not specified'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Status</label>
                        <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                          {product.status || 'Active'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed information */}
              <div className="lg:col-span-2 space-y-6">
                {/* Production Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scale className="w-5 h-5 text-avallen-green" />
                      Production Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Production Model</label>
                        <p className="font-medium text-slate-gray capitalize">
                          {product.productionModel || 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Annual Production</label>
                        <p className="font-medium text-slate-gray">
                          {product.annualProductionVolume ? 
                            `${product.annualProductionVolume} ${product.productionUnit || 'units'}` : 
                            'Not specified'
                          }
                        </p>
                      </div>
                    </div>
                    
                    {product.description && (
                      <div className="mt-4">
                        <label className="text-sm font-medium text-gray-600">Description</label>
                        <p className="mt-1 text-slate-gray">{product.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Ingredients */}
                {product.ingredients && Array.isArray(product.ingredients) && product.ingredients.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Droplets className="w-5 h-5 text-avallen-green" />
                        Ingredients & Recipe
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {product.ingredients.map((ingredient, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium text-slate-gray">{ingredient.name}</span>
                            <span className="text-sm text-gray-600">
                              {ingredient.amount} {ingredient.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Packaging Materials */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-avallen-green" />
                      Packaging Materials
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Bottle */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-slate-gray mb-3">Bottle/Container</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-sm font-medium text-gray-600">Material</label>
                            <p className="font-medium text-slate-gray capitalize">
                              {product.bottleMaterial || 'Not specified'}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Weight</label>
                            <p className="font-medium text-slate-gray">
                              {product.bottleWeight ? `${product.bottleWeight}g` : 'Not specified'}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Recycled Content</label>
                            <p className="font-medium text-slate-gray">
                              {product.bottleRecycledContent ? `${product.bottleRecycledContent}%` : 'Not specified'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Label */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-slate-gray mb-3">Label</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium text-gray-600">Material</label>
                            <p className="font-medium text-slate-gray capitalize">
                              {product.labelMaterial || 'Not specified'}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Weight</label>
                            <p className="font-medium text-slate-gray">
                              {product.labelWeight ? `${product.labelWeight}g` : 'Not specified'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Closure */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-slate-gray mb-3">Closure</h4>
                        {product.hasBuiltInClosure ? (
                          <p className="text-slate-gray">Built-in closure (integrated with container)</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium text-gray-600">Material</label>
                              <p className="font-medium text-slate-gray capitalize">
                                {product.closureMaterial || 'Not specified'}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">Weight</label>
                              <p className="font-medium text-slate-gray">
                                {product.closureWeight ? `${product.closureWeight}g` : 'Not specified'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Environmental Impact */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Leaf className="w-5 h-5 text-avallen-green" />
                      Environmental Impact
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {product.carbonFootprint || product.waterFootprint ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {product.carbonFootprint && (
                          <div className="p-4 bg-green-50 rounded-lg">
                            <h4 className="font-semibold text-slate-gray mb-2">Carbon Footprint</h4>
                            <p className="text-2xl font-bold text-avallen-green">
                              {product.carbonFootprint} kg CO₂e
                            </p>
                          </div>
                        )}
                        {product.waterFootprint && (
                          <div className="p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-semibold text-slate-gray mb-2">Water Footprint</h4>
                            <p className="text-2xl font-bold text-blue-600">
                              {product.waterFootprint} L
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Calculator className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <h4 className="font-semibold text-slate-gray mb-2">No LCA Data Available</h4>
                        <p className="text-gray-600 mb-4">
                          Environmental impact calculations haven't been performed for this product yet.
                        </p>
                        <Button 
                          onClick={handleCreateLCA}
                          disabled={createLCAMutation.isPending}
                          className="bg-avallen-green hover:bg-green-600 text-white"
                        >
                          {createLCAMutation.isPending ? (
                            <>
                              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                              Calculating...
                            </>
                          ) : (
                            <>
                              <Calculator className="w-4 h-4 mr-2" />
                              Start LCA Calculation
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}