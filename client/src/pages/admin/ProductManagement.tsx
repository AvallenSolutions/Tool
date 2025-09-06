import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  AlertCircle, 
  Check,
  X,
  Eye,
  Package,
  Clock,
  Plus
} from "lucide-react";

interface ProductForReview {
  id: string;
  productName: string;
  productDescription: string;
  supplierId: string;
  supplierName: string;
  sku: string;
  isVerified: boolean;
  hasPrecalculatedLca: boolean;
  submissionStatus: string;
  createdAt: string;
  submittedBy: string;
}

export default function ProductManagement() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: productsResponse, isLoading } = useQuery<{success: boolean, data: ProductForReview[], count: number}>({
    queryKey: ['/api/admin/supplier-products'],
    refetchInterval: 30000,
  });

  const allProducts = productsResponse?.data || [];

  // Group products by type
  const groupProductsByType = (products: ProductForReview[]) => {
    const groups: Record<string, ProductForReview[]> = {};
    
    if (!products || !Array.isArray(products)) return groups;
    
    products.forEach(product => {
      let productType = 'Other';
      
      // Use productAttributes.type if available, otherwise categorize by name/description
      if (product.productAttributes && typeof product.productAttributes === 'object') {
        const attributes = product.productAttributes as any;
        productType = attributes.type || 'Other';
      } else {
        // Fallback categorization based on product name/description
        const name = product.productName.toLowerCase();
        const desc = product.productDescription?.toLowerCase() || '';
        
        if (name.includes('bottle') || desc.includes('bottle') || name.includes('glass')) {
          productType = 'Primary Packaging';
        } else if (name.includes('label') || desc.includes('label')) {
          productType = 'Labels';
        } else if (name.includes('stopper') || name.includes('cork') || desc.includes('stopper')) {
          productType = 'Stoppers';
        } else if (name.includes('berries') || name.includes('ingredient') || desc.includes('ingredient')) {
          productType = 'Ingredients';
        } else if (name.includes('tote') || name.includes('packaging') || desc.includes('packaging')) {
          productType = 'Secondary Packaging';
        }
      }
      
      if (!groups[productType]) {
        groups[productType] = [];
      }
      groups[productType].push(product);
    });
    
    return groups;
  };

  const productsByType = allProducts ? groupProductsByType(allProducts) : {};

  const approveMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await fetch(`/api/admin/products/${productId}/approve`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to approve product');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await fetch(`/api/admin/products/${productId}/reject`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to reject product');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
    },
  });

  const handleApprove = (productId: string) => {
    approveMutation.mutate(productId);
  };

  const handleReject = (productId: string) => {
    rejectMutation.mutate(productId);
  };

  const getStatusIcon = (product: ProductForReview) => {
    if (product.isVerified) {
      return <Check className="h-4 w-4 text-green-600" />;
    }
    return <Clock className="h-4 w-4 text-orange-600" />;
  };

  const getStatusBadge = (product: ProductForReview) => {
    if (product.isVerified) {
      return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
    }
    return <Badge variant="outline" className="bg-orange-100 text-orange-800">Pending Review</Badge>;
  };

  const pendingCount = allProducts.filter(p => !p.isVerified).length;
  const totalCount = allProducts.length;

  if (isLoading) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Product Management" subtitle="Loading product data..." />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Supplier Product Review Queue</h1>
                <Badge variant="outline">Loading...</Badge>
              </div>
            </div>
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
          title="Supplier Product Management" 
          subtitle="Review and approve supplier products only"
        />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Supplier Product Management</h1>
                <p className="text-muted-foreground">
                  Review and approve supplier product submissions only
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => navigate('/app/admin/supplier-management/products/create')}
                  className="bg-green-600 hover:bg-green-700 mr-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Supplier Product
                </Button>
                <Button 
                  onClick={() => navigate('/app/admin/supplier-management/overview')}
                  variant="outline"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Supplier Dashboard
                </Button>
                <div className="flex gap-2">
                  <Badge variant={pendingCount > 0 ? "destructive" : "secondary"}>
                    {pendingCount} pending review
                  </Badge>
                  <Badge variant="outline">
                    {totalCount} total products
                  </Badge>
                </div>
              </div>
            </div>

            {/* Supplier Product Notice */}
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Supplier Products Only</p>
                    <p className="text-sm text-green-700 mt-1">
                      This management page is <strong>exclusively for supplier products</strong> submitted through the Supplier Management system. 
                      User products are managed separately through the main Products section.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products List by Type */}
            <div className="space-y-6">
              {Object.keys(productsByType).length > 0 ? (
                Object.entries(productsByType).map(([productType, products]) => (
                  <div key={productType} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold text-gray-900">{productType}</h2>
                      <Badge variant="secondary">{products.length}</Badge>
                    </div>
                    <div className="grid gap-4">
                      {products.map((product) => (
                  <Card key={product.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(product)}
                            <CardTitle className="text-xl">{product.productName}</CardTitle>
                            {getStatusBadge(product)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Supplier: {product.supplierName} • SKU: {product.sku}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            disabled={product.isVerified}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                          {product.productDescription}
                        </p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Submitted by:</span>
                            <p className="text-muted-foreground">{product.submittedBy}</p>
                          </div>
                          <div>
                            <span className="font-medium">Submitted:</span>
                            <p className="text-muted-foreground">
                              {new Date(product.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">LCA Data:</span>
                            <p className={`${product.hasPrecalculatedLca ? 'text-green-600' : 'text-gray-500'}`}>
                              {product.hasPrecalculatedLca ? 'Available' : 'Not provided'}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Status:</span>
                            <p className="text-muted-foreground">{product.submissionStatus}</p>
                          </div>
                        </div>

                        {!product.isVerified && (
                          <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleReject(product.id)}
                              disabled={rejectMutation.isPending}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleApprove(product.id)}
                              disabled={approveMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Supplier Products Found</h3>
                    <p className="text-muted-foreground">
                      No supplier products have been submitted yet.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}