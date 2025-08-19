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

  const { data: pendingProducts, isLoading } = useQuery<ProductForReview[]>({
    queryKey: ['/api/admin/products/pending'],
    refetchInterval: 30000,
  });

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

  const pendingCount = pendingProducts?.filter(p => !p.isVerified).length || 0;

  if (isLoading) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Product Management" subtitle="Loading product data..." />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Product Review Queue</h1>
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
          title="Product Management" 
          subtitle="Review and approve submitted products"
        />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Product Management</h1>
                <p className="text-muted-foreground">
                  Create new products and review pending submissions
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => navigate('/app/admin/products/create')}
                  className="bg-avallen-green hover:bg-avallen-green/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
                <Badge variant={pendingCount > 0 ? "destructive" : "secondary"}>
                  {pendingCount} pending review
                </Badge>
              </div>
            </div>

            {/* Products List */}
            <div className="space-y-4">
              {pendingProducts && pendingProducts.length > 0 ? (
                pendingProducts.map((product) => (
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
                ))
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Products Pending Review</h3>
                    <p className="text-muted-foreground">
                      All product submissions have been reviewed. New submissions will appear here.
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