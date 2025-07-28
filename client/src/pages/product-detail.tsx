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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Calculator, 
  Package, 
  Leaf, 
  Droplets, 
  Scale, 
  Edit3, 
  Award,
  Factory,
  Truck,
  Recycle,
  ChefHat,
  TreePine,
  Globe,
  ExternalLink,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { Product } from "@shared/schema";
import LCACalculationCard from "@/components/lca/LCACalculationCard";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  // Fetch product data
  const { data: product, isLoading: productLoading } = useQuery<Product>({
    queryKey: ["/api/products", id],
    enabled: isAuthenticated && !!id,
    retry: false,
  });

  // Fetch product inputs/suppliers
  const { data: productInputs, isLoading: inputsLoading } = useQuery<any[]>({
    queryKey: ["/api/product-inputs", id],
    enabled: isAuthenticated && !!id,
    retry: false,
  });

  // Fetch supplier products linked to this product
  const { data: supplierProducts, isLoading: supplierProductsLoading } = useQuery<any[]>({
    queryKey: ["/api/supplier-products", "by-product", id],
    enabled: isAuthenticated && !!id,
    retry: false,
  });

  // Fetch LCA history for this product
  const { data: lcaHistory, isLoading: lcaLoading } = useQuery<any[]>({
    queryKey: ["/api/lca/product", id, "history"],
    enabled: isAuthenticated && !!id,
    retry: false,
  });

  // Create LCA mutation with job tracking
  const createLCAMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await apiRequest("POST", `/api/products/${productId}/lca`, {});
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'LCA calculation failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log('LCA calculation started:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/lca/product", id, "history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "LCA Calculation Started",
        description: `Environmental impact calculation for ${product?.name} is now in progress. This will take about ${Math.round(data.estimatedDuration / 60)} minutes.`,
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
        description: error.message || "Failed to start environmental impact calculation. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || productLoading || inputsLoading || supplierProductsLoading || lcaLoading) {
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
                  onClick={() => navigate(`/app/products/${id}/enhanced`)}
                  className="flex items-center gap-2 btn-always-visible border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Product
                </Button>
                <Button 
                  onClick={handleCreateLCA}
                  disabled={createLCAMutation.isPending}
                  className="btn-always-visible bg-avallen-green hover:bg-green-600 text-white flex items-center gap-2"
                  style={{ backgroundColor: 'hsl(148, 57%, 23%)', color: 'white' }}
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

            {/* LCA Headline Metrics */}
            {(product.carbonFootprint || product.waterFootprint || (lcaHistory && lcaHistory.length > 0)) && (
              <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-l-avallen-green">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-avallen-green" />
                    Environmental Impact Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {product.carbonFootprint && (
                      <div className="text-center">
                        <div className="text-3xl font-bold text-avallen-green">
                          {parseFloat(product.carbonFootprint.toString()).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600">kg CO₂-eq per unit</div>
                        <div className="text-xs text-gray-500 mt-1">Carbon Footprint</div>
                      </div>
                    )}
                    {product.waterFootprint && (
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">
                          {parseFloat(product.waterFootprint.toString()).toFixed(0)}
                        </div>
                        <div className="text-sm text-gray-600">liters per unit</div>
                        <div className="text-xs text-gray-500 mt-1">Water Footprint</div>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {lcaHistory?.length || 0}
                      </div>
                      <div className="text-sm text-gray-600">assessments completed</div>
                      <div className="text-xs text-gray-500 mt-1">LCA History</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Content with Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
                <TabsTrigger value="packaging">Packaging</TabsTrigger>
                <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
                <TabsTrigger value="certifications">Certifications</TabsTrigger>
                <TabsTrigger value="impact">Impact</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Product Image & Basic Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-avallen-green" />
                        Product Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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

                  {/* Production Information */}
                  <div className="lg:col-span-2 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Factory className="w-5 h-5 text-avallen-green" />
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
                                `${Number(product.annualProductionVolume).toLocaleString()} ${product.productionUnit || 'units'}` : 
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

                    {/* Quick Ingredients Preview */}
                    {product.ingredients && Array.isArray(product.ingredients) && product.ingredients.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Droplets className="w-5 h-5 text-avallen-green" />
                            Key Ingredients
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {product.ingredients.slice(0, 3).map((ingredient: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="font-medium text-slate-gray">{ingredient.name}</span>
                                <span className="text-sm text-gray-600">
                                  {ingredient.amount} {ingredient.unit}
                                </span>
                              </div>
                            ))}
                            {product.ingredients.length > 3 && (
                              <p className="text-sm text-gray-500 text-center pt-2">
                                +{product.ingredients.length - 3} more ingredients
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Ingredients Tab */}
              <TabsContent value="ingredients" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ChefHat className="w-5 h-5 text-avallen-green" />
                      Recipe & Ingredients
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {product.ingredients && Array.isArray(product.ingredients) && product.ingredients.length > 0 ? (
                      <div className="space-y-4">
                        {product.ingredients.map((ingredient: any, index: number) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-lg">{ingredient.name}</h4>
                              <Badge variant="outline" className="capitalize">{ingredient.type}</Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <label className="text-gray-600">Amount</label>
                                <p className="font-medium">{ingredient.amount} {ingredient.unit}</p>
                              </div>
                              {ingredient.origin && (
                                <div>
                                  <label className="text-gray-600">Origin</label>
                                  <p className="font-medium">{ingredient.origin}</p>
                                </div>
                              )}
                              {ingredient.supplier && (
                                <div>
                                  <label className="text-gray-600">Supplier</label>
                                  <p className="font-medium">{ingredient.supplier}</p>
                                </div>
                              )}
                              <div>
                                <label className="text-gray-600">Organic</label>
                                <p className="font-medium">{ingredient.organicCertified ? '✓ Yes' : '✗ No'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <ChefHat className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p>No ingredients information available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Packaging Tab */}
              <TabsContent value="packaging" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Primary Container */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-avallen-green" />
                        Primary Container
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Container Type</label>
                        <p className="font-medium text-slate-gray">Primary Container</p>
                      </div>
                      {product.bottleMaterial && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Material</label>
                          <p className="font-medium text-slate-gray capitalize">{product.bottleMaterial}</p>
                        </div>
                      )}
                      {product.bottleWeight && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Weight</label>
                          <p className="font-medium text-slate-gray">{product.bottleWeight} g</p>
                        </div>
                      )}
                      {product.bottleRecycledContent && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Recycled Content</label>
                          <p className="font-medium text-slate-gray">{product.bottleRecycledContent}%</p>
                        </div>
                      )}
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
                    </CardContent>
                  </Card>

                  {/* Stopper/Closure */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-avallen-green" />
                        Stopper/Closure
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {product.closureType && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Type</label>
                          <p className="font-medium text-slate-gray capitalize">{product.closureType}</p>
                        </div>
                      )}
                      {product.closureMaterial && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Material</label>
                          <p className="font-medium text-slate-gray capitalize">{product.closureMaterial}</p>
                        </div>
                      )}
                      {product.closureWeight && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Weight</label>
                          <p className="font-medium text-slate-gray">{product.closureWeight} g</p>
                        </div>
                      )}
                      {!product.closureType && !product.closureMaterial && !product.closureWeight && (
                        <p className="text-sm text-gray-500">No closure information recorded</p>
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
                      {product.fillerMaterial && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Filler Material</label>
                          <p className="font-medium text-slate-gray capitalize">{product.fillerMaterial}</p>
                        </div>
                      )}
                      {!product.hasSecondaryPackaging && !product.boxMaterial && !product.boxWeight && (
                        <p className="text-sm text-gray-500">No secondary packaging recorded</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Suppliers Tab */}
              <TabsContent value="suppliers" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-avallen-green" />
                      Linked Supplier Products
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {supplierProducts && supplierProducts.length > 0 ? (
                      <div className="space-y-4">
                        {supplierProducts.map((supplierProduct: any) => (
                          <div key={supplierProduct.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-semibold">{supplierProduct.productName}</h4>
                                <p className="text-sm text-gray-600">{supplierProduct.supplierName}</p>
                              </div>
                              <Button variant="outline" size="sm">
                                <ExternalLink className="w-4 h-4 mr-2" />
                                View Details
                              </Button>
                            </div>
                            {supplierProduct.productDescription && (
                              <p className="text-sm text-gray-700 mb-2">{supplierProduct.productDescription}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              {supplierProduct.sku && <span>SKU: {supplierProduct.sku}</span>}
                              {supplierProduct.hasPrecalculatedLca && (
                                <Badge variant="outline" className="text-green-600">
                                  <Leaf className="w-3 h-3 mr-1" />
                                  LCA Available
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Truck className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p>No supplier products linked</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Certifications Tab */}
              <TabsContent value="certifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-avallen-green" />
                      Certifications & Awards
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {product.certifications && Array.isArray(product.certifications) && product.certifications.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {product.certifications.map((cert: string, index: number) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                            <Award className="w-5 h-5 text-avallen-green" />
                            <span className="font-medium">{cert}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Award className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p>No certifications recorded</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Impact Tab */}
              <TabsContent value="impact" className="space-y-6">
                <LCACalculationCard product={product as Product} />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}