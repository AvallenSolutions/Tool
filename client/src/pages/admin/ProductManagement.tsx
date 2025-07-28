import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Eye, 
  Edit,
  Trash2,
  Package,
  DollarSign,
  Calendar,
  Building2,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface SupplierProduct {
  id: string;
  supplierId: string;
  productName: string;
  productDescription?: string;
  sku?: string;
  hasPrecalculatedLca: boolean;
  lcaDataJson?: any;
  productAttributes?: any;
  basePrice?: number;
  currency: string;
  minimumOrderQuantity?: number;
  leadTimeDays?: number;
  certifications: string[];
  supplierName: string;
  supplierCategory: string;
  isVerified: boolean;
  createdAt: string;
}

export default function ProductManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<SupplierProduct | null>(null);
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<SupplierProduct | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const { data: products = [], isLoading } = useQuery<SupplierProduct[]>({
    queryKey: ['/api/admin/supplier-products'],
    refetchInterval: 30000,
  });

  // Edit product mutation
  const editProductMutation = useMutation({
    mutationFn: (data: { id: string; productData: Partial<SupplierProduct> }) => 
      apiRequest('/api/admin/supplier-products/' + data.id, 'PUT', data.productData),
    onSuccess: () => {
      toast({
        title: "Product Updated",
        description: "Product information has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/supplier-products'] });
      setEditingProduct(null);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update product.",
        variant: "destructive",
      });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: (productId: string) => 
      apiRequest('/api/supplier-products/' + productId, 'DELETE'),
    onSuccess: () => {
      toast({
        title: "Product Deleted",
        description: "Product has been successfully removed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/supplier-products'] });
      setDeletingProduct(null);
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete product.",
        variant: "destructive",
      });
    },
  });

  const getVerificationBadge = (isVerified: boolean) => {
    return isVerified 
      ? <Badge className="bg-green-100 text-green-800 border-green-200">Verified</Badge>
      : <Badge className="bg-orange-100 text-orange-800 border-orange-200">Pending</Badge>;
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = categoryFilter === 'all' || product.supplierCategory === categoryFilter;
    const matchesSearch = !searchFilter || 
      product.productName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      product.supplierName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Product Management" subtitle="Loading products..." />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header 
            title="Product Management" 
            subtitle="Manage supplier products and inventory"
          />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Product Management</h1>
                  <p className="text-muted-foreground">
                    Manage all supplier products and their verification status
                  </p>
                </div>
                <Badge variant="secondary">
                  {products.length} total products
                </Badge>
              </div>

              {/* Filters */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex gap-4 items-center">
                    <div className="flex-1">
                      <Input
                        placeholder="Search products by name, supplier, or SKU..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="max-w-sm"
                      />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="bottle_producer">Bottle Producer</SelectItem>
                        <SelectItem value="cap_closure_producer">Cap & Closure</SelectItem>
                        <SelectItem value="label_producer">Label Producer</SelectItem>
                        <SelectItem value="ingredient_supplier">Ingredient Supplier</SelectItem>
                        <SelectItem value="packaging_supplier">Packaging Supplier</SelectItem>
                        <SelectItem value="contract_distillery">Contract Distillery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Products List */}
              <div className="space-y-4">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <Package className="h-5 w-5 text-muted-foreground" />
                              <h3 className="text-lg font-semibold">{product.productName}</h3>
                            </div>
                            {getVerificationBadge(product.isVerified)}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              <span>{product.supplierName}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              <span>{product.supplierCategory.replace('_', ' ')}</span>
                            </div>
                            
                            {/* Display key product attributes */}
                            {product.productAttributes && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs">
                                  {product.productAttributes.material && `${product.productAttributes.material} | `}
                                  {product.productAttributes.weight && `${product.productAttributes.weight}${product.productAttributes.weightUnit || 'g'} | `}
                                  {product.productAttributes.recycledContent !== undefined && `${product.productAttributes.recycledContent}% recycled`}
                                </span>
                              </div>
                            )}
                            
                            {product.sku && (
                              <div className="flex items-center gap-2">
                                <span className="font-mono">SKU: {product.sku}</span>
                              </div>
                            )}
                            
                            {product.basePrice && (
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                <span>{product.basePrice} {product.currency}</span>
                              </div>
                            )}
                          </div>

                          {product.productDescription && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              <p className="line-clamp-2">{product.productDescription}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedProduct(product)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingProduct(product)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingProduct(product)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredProducts.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No products found</h3>
                      <p className="text-muted-foreground">
                        {categoryFilter === 'all' 
                          ? "No products match your search criteria."
                          : `No products in "${categoryFilter}" category found.`
                        }
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* View Product Dialog */}
      {selectedProduct && (
        <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
          <DialogContent className="max-w-3xl bg-white border border-gray-200 shadow-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {selectedProduct.productName}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Verification Status</label>
                  <div className="mt-1">
                    {getVerificationBadge(selectedProduct.isVerified)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Supplier</label>
                  <p className="mt-1 text-sm">{selectedProduct.supplierName}</p>
                </div>
              </div>

              {selectedProduct.productDescription && (
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedProduct.productDescription}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedProduct.sku && (
                  <div>
                    <label className="text-sm font-medium">SKU</label>
                    <p className="mt-1 text-sm font-mono">{selectedProduct.sku}</p>
                  </div>
                )}
                
                {selectedProduct.basePrice && (
                  <div>
                    <label className="text-sm font-medium">Base Price</label>
                    <p className="mt-1 text-sm">{selectedProduct.basePrice} {selectedProduct.currency}</p>
                  </div>
                )}
              </div>

              {(selectedProduct.minimumOrderQuantity || selectedProduct.leadTimeDays) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedProduct.minimumOrderQuantity && (
                    <div>
                      <label className="text-sm font-medium">Minimum Order</label>
                      <p className="mt-1 text-sm">{selectedProduct.minimumOrderQuantity} units</p>
                    </div>
                  )}
                  
                  {selectedProduct.leadTimeDays && (
                    <div>
                      <label className="text-sm font-medium">Lead Time</label>
                      <p className="mt-1 text-sm">{selectedProduct.leadTimeDays} days</p>
                    </div>
                  )}
                </div>
              )}

              {/* Product Attributes */}
              {selectedProduct.productAttributes && (
                <div>
                  <label className="text-sm font-medium">Product Specifications</label>
                  <div className="mt-2 grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    {selectedProduct.productAttributes.material && (
                      <div>
                        <span className="text-xs font-medium text-gray-500">Material</span>
                        <p className="text-sm font-medium">{selectedProduct.productAttributes.material}</p>
                      </div>
                    )}
                    {selectedProduct.productAttributes.weight && (
                      <div>
                        <span className="text-xs font-medium text-gray-500">Weight</span>
                        <p className="text-sm font-medium">
                          {selectedProduct.productAttributes.weight}{selectedProduct.productAttributes.weightUnit || 'g'}
                        </p>
                      </div>
                    )}
                    {selectedProduct.productAttributes.recycledContent !== undefined && (
                      <div>
                        <span className="text-xs font-medium text-gray-500">Recycled Content</span>
                        <p className="text-sm font-medium">{selectedProduct.productAttributes.recycledContent}%</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedProduct.certifications && selectedProduct.certifications.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Certifications</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedProduct.certifications.map((cert, index) => (
                      <Badge key={index} variant="outline">{cert}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Added: {new Date(selectedProduct.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Product Dialog */}
      {editingProduct && (
        <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
          <DialogContent className="max-w-2xl bg-white border border-gray-200 shadow-lg">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Product Name</Label>
                <Input
                  value={editingProduct.productName}
                  onChange={(e) => setEditingProduct({
                    ...editingProduct,
                    productName: e.target.value
                  })}
                />
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingProduct.productDescription || ''}
                  onChange={(e) => setEditingProduct({
                    ...editingProduct,
                    productDescription: e.target.value
                  })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>SKU</Label>
                  <Input
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({
                      ...editingProduct,
                      sku: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label>Base Price</Label>
                  <Input
                    type="number"
                    value={editingProduct.basePrice || ''}
                    onChange={(e) => setEditingProduct({
                      ...editingProduct,
                      basePrice: parseFloat(e.target.value) || undefined
                    })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Minimum Order Quantity</Label>
                  <Input
                    type="number"
                    value={editingProduct.minimumOrderQuantity || ''}
                    onChange={(e) => setEditingProduct({
                      ...editingProduct,
                      minimumOrderQuantity: parseInt(e.target.value) || undefined
                    })}
                  />
                </div>
                <div>
                  <Label>Lead Time (days)</Label>
                  <Input
                    type="number"
                    value={editingProduct.leadTimeDays || ''}
                    onChange={(e) => setEditingProduct({
                      ...editingProduct,
                      leadTimeDays: parseInt(e.target.value) || undefined
                    })}
                  />
                </div>
              </div>
              
              {/* Product Attributes */}
              <div>
                <Label>Product Specifications</Label>
                <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                  <div>
                    <Label className="text-xs">Material</Label>
                    <Input
                      value={editingProduct.productAttributes?.material || ''}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        productAttributes: {
                          ...editingProduct.productAttributes,
                          material: e.target.value
                        }
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Weight (g)</Label>
                    <Input
                      type="number"
                      value={editingProduct.productAttributes?.weight || ''}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        productAttributes: {
                          ...editingProduct.productAttributes,
                          weight: parseFloat(e.target.value) || null
                        }
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Recycled Content (%)</Label>
                    <Input
                      type="number"
                      value={editingProduct.productAttributes?.recycledContent || ''}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        productAttributes: {
                          ...editingProduct.productAttributes,
                          recycledContent: parseFloat(e.target.value) || null
                        }
                      })}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingProduct(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => editProductMutation.mutate({
                    id: editingProduct.id,
                    productData: editingProduct
                  })}
                  disabled={editProductMutation.isPending}
                >
                  {editProductMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Product Dialog */}
      {deletingProduct && (
        <Dialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
          <DialogContent className="bg-white border border-gray-200 shadow-lg">
            <DialogHeader>
              <DialogTitle>Delete Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>
                Are you sure you want to delete <strong>{deletingProduct.productName}</strong>? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeletingProduct(null)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => deleteProductMutation.mutate(deletingProduct.id)}
                  disabled={deleteProductMutation.isPending}
                >
                  {deleteProductMutation.isPending ? 'Deleting...' : 'Delete Product'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}