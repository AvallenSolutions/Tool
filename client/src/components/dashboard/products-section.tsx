import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Package, Edit2, Trash2, Star, Factory, ExternalLink, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface Product {
  id: number;
  name: string;
  sku: string;
  type: string;
  volume: string;
  description: string;
  productionModel: string;
  annualProductionVolume: number;
  productionUnit: string;
  carbonFootprint: number;
  waterFootprint: number;
  status: string;
  isMainProduct: boolean;
  createdAt: string;
  // LCA data fields
  packShotUrl?: string;
  ingredients?: Array<{ name: string; amount: number; unit: string }>;
  bottleMaterial?: string;
  bottleRecycledContent?: number;
  labelMaterial?: string;
  labelWeight?: number;
  closureMaterial?: string;
  closureWeight?: number;
  hasBuiltInClosure?: boolean;
}

export default function ProductsSection() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    type: '',
    volume: '',
    description: '',
    productionModel: '',
    annualProductionVolume: '',
    productionUnit: 'bottles',
    status: 'active',
    isMainProduct: false,
  });
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products"],
    retry: false,
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/products", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Product Added",
        description: "Product has been successfully added to your catalog.",
      });
      setIsAddDialogOpen(false);
      resetForm();
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
      toast({
        title: "Error",
        description: "Failed to add product. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PATCH", `/api/products/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Product Updated",
        description: "Product has been successfully updated.",
      });
      setEditingProduct(null);
      resetForm();
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
      toast({
        title: "Error",
        description: "Failed to update product. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Product Deleted",
        description: "Product has been successfully removed from your catalog.",
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
      toast({
        title: "Error",
        description: "Failed to delete product. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      type: '',
      size: '',
      description: '',
      productionModel: '',
      annualProductionVolume: '',
      productionUnit: 'bottles',
      status: 'active',
      isMainProduct: false,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const productData = {
      ...formData,
      annualProductionVolume: formData.annualProductionVolume ? parseFloat(formData.annualProductionVolume) : null,
    };

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: productData });
    } else {
      createProductMutation.mutate(productData);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      type: product.type,
      size: product.size,
      description: product.description || '',
      productionModel: product.productionModel || '',
      annualProductionVolume: product.annualProductionVolume?.toString() || '',
      productionUnit: product.productionUnit || 'bottles',
      status: product.status,
      isMainProduct: product.isMainProduct,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteProductMutation.mutate(id);
    }
  };

  const productList = products || [];
  const mainProduct = productList.find((p: Product) => p.isMainProduct);

  if (isLoading) {
    return (
      <Card className="border-light-gray">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-gray">
            Product Catalog
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 rounded-lg"></div>
            <div className="h-20 bg-gray-200 rounded-lg"></div>
            <div className="h-20 bg-gray-200 rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-light-gray">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-gray">
              Product Catalog
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Manage your product SKUs and track individual footprints
            </p>
          </div>
          <Dialog open={isAddDialogOpen || !!editingProduct} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              setEditingProduct(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-avallen-green hover:bg-avallen-green-light text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Premium Gin"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="sku">SKU Code *</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                      placeholder="e.g., AV-GIN-750"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="type">Product Type *</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spirits">Spirits</SelectItem>
                        <SelectItem value="wine">Wine</SelectItem>
                        <SelectItem value="beer">Beer</SelectItem>
                        <SelectItem value="non-alcoholic">Non-alcoholic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="size">Size *</Label>
                    <Input
                      id="size"
                      value={formData.size}
                      onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                      placeholder="e.g., 750ml"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="productionModel">Production Model</Label>
                    <Select value={formData.productionModel} onValueChange={(value) => setFormData(prev => ({ ...prev, productionModel: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="own">Own Production</SelectItem>
                        <SelectItem value="contract">Contract Manufacturing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Product description..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="annualProductionVolume">Annual Production Volume</Label>
                    <Input
                      id="annualProductionVolume"
                      type="number"
                      value={formData.annualProductionVolume}
                      onChange={(e) => setFormData(prev => ({ ...prev, annualProductionVolume: e.target.value }))}
                      placeholder="e.g., 10000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="productionUnit">Production Unit</Label>
                    <Select value={formData.productionUnit} onValueChange={(value) => setFormData(prev => ({ ...prev, productionUnit: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottles">Bottles</SelectItem>
                        <SelectItem value="liters">Liters</SelectItem>
                        <SelectItem value="kg">Kilograms</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="discontinued">Discontinued</SelectItem>
                        <SelectItem value="development">In Development</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    <input
                      type="checkbox"
                      id="isMainProduct"
                      checked={formData.isMainProduct}
                      onChange={(e) => setFormData(prev => ({ ...prev, isMainProduct: e.target.checked }))}
                      className="rounded border-gray-300 text-avallen-green focus:ring-avallen-green"
                    />
                    <Label htmlFor="isMainProduct" className="text-sm">
                      Mark as main product
                    </Label>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      setEditingProduct(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createProductMutation.isPending || updateProductMutation.isPending}
                    className="bg-avallen-green hover:bg-avallen-green-light text-white"
                  >
                    {editingProduct ? "Update Product" : "Add Product"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {productList.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-gray mb-2">No Products Yet</h3>
            <p className="text-gray-500 mb-4">
              Add your first product to start tracking individual footprints
            </p>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-avallen-green hover:bg-avallen-green-light text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Product
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {mainProduct && (
              <div className="p-4 bg-avallen-green/5 border border-avallen-green/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-avallen-green/10 rounded-full flex items-center justify-center">
                      <Star className="w-5 h-5 text-avallen-green" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-slate-gray">{mainProduct.name}</h3>
                        <Badge variant="secondary" className="bg-avallen-green/10 text-avallen-green">
                          Main Product
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        SKU: {mainProduct.sku} • {mainProduct.volume} • {mainProduct.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {mainProduct.carbonFootprint && (
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-gray">
                          {parseFloat(mainProduct.carbonFootprint?.toString() || '0').toFixed(2)} kg CO2e
                        </div>
                        <div className="text-xs text-gray-500">per unit</div>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/app/products/${mainProduct.id}`)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(mainProduct)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {productList.filter((p: Product) => !p.isMainProduct).map((product: Product) => (
                <div key={product.id} className="p-4 border border-light-gray rounded-lg hover:bg-gray-50 transition-colors">
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
                          SKU: {product.sku} • {product.size} • {product.type}
                        </p>
                        {product.annualProductionVolume && (
                          <p className="text-xs text-gray-400">
                            {product.annualProductionVolume.toLocaleString()} {product.productionUnit}/year
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {product.carbonFootprint && (
                        <div className="text-right">
                          <div className="text-sm font-medium text-slate-gray">
                            {parseFloat(product.carbonFootprint?.toString() || '0').toFixed(2)} kg CO2e
                          </div>
                          <div className="text-xs text-gray-500">per unit</div>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/app/products/${product.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}