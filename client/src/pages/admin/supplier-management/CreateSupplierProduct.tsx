import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import SupplierProductForm from '@/components/supplier/SupplierProductForm';
import SupplierManagementLayout from './SupplierManagementLayout';
import { ArrowLeft, Building2, Package, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SupplierOption {
  id: string;
  supplierName: string;
  supplierCategory: string;
  verificationStatus: string;
}

export default function CreateSupplierProduct() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierOption | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch verified suppliers
  const { data: supplierResponse, isLoading } = useQuery<{success: boolean, data: SupplierOption[]}>({
    queryKey: ['/api/admin/suppliers'],
  });

  const suppliers = supplierResponse?.data || [];
  const verifiedSuppliers = suppliers.filter(s => s.verificationStatus === 'verified');

  // Create supplier product mutation
  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      return apiRequest('POST', '/api/admin/supplier-products', productData);
    },
    onSuccess: (response) => {
      toast({
        title: "Product Created Successfully",
        description: "The supplier product has been created and is now available.",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/verified-suppliers'] });
      
      // Navigate back to products page
      navigate('/app/admin/supplier-management/products');
    },
    onError: (error: any) => {
      console.error('❌ Failed to create supplier product:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create supplier product. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (productData: any) => {
    if (!selectedSupplier) {
      toast({
        title: "Supplier Required",
        description: "Please select a supplier before creating the product.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    console.log('🚀 Creating supplier product for:', selectedSupplier.supplierName, productData);
    
    // Add metadata for admin tracking
    const enhancedProductData = {
      ...productData,
      submittedByUserId: 'admin', // Admin user ID
      submittedByCompanyId: 1, // Default admin company
    };

    createProductMutation.mutate(enhancedProductData);
  };

  const handleCancel = () => {
    navigate('/app/admin/supplier-management/overview');
  };

  if (isLoading) {
    return (
      <SupplierManagementLayout title="Create Supplier Product" subtitle="Loading suppliers...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4 w-48"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </SupplierManagementLayout>
    );
  }

  if (verifiedSuppliers.length === 0) {
    return (
      <SupplierManagementLayout title="Create Supplier Product" subtitle="No verified suppliers available">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-orange-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Verified Suppliers</h3>
            <p className="text-gray-500 mb-6">
              You need at least one verified supplier to create products. 
              Please verify suppliers first before adding products to them.
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                variant="outline"
                onClick={() => navigate('/app/admin/supplier-management/overview')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Overview
              </Button>
              <Button 
                onClick={() => navigate('/app/admin/supplier-management/suppliers')}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Manage Suppliers
              </Button>
            </div>
          </CardContent>
        </Card>
      </SupplierManagementLayout>
    );
  }

  return (
    <SupplierManagementLayout title="Create Supplier Product" subtitle="Add a new product to supplier catalog">
      <div className="space-y-6">
        {/* Back Navigation */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/app/admin/supplier-management/overview')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Overview
          </Button>
        </div>

        {/* Supplier Selection */}
        {!selectedSupplier ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Select Supplier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Choose which supplier this product belongs to. Only verified suppliers are available.
              </p>
              
              <div className="space-y-4">
                <Select onValueChange={(supplierId) => {
                  const supplier = verifiedSuppliers.find(s => s.id === supplierId);
                  if (supplier) {
                    setSelectedSupplier(supplier);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a verified supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {verifiedSuppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        <div className="flex items-center gap-2">
                          <span>{supplier.supplierName}</span>
                          <Badge variant="outline" className="text-xs">
                            {supplier.supplierCategory.replace('_', ' ').split(' ').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Available Suppliers ({verifiedSuppliers.length}):</p>
                  <div className="grid gap-2">
                    {verifiedSuppliers.slice(0, 3).map((supplier) => (
                      <div key={supplier.id} className="flex items-center gap-2 text-sm">
                        <Building2 className="w-3 h-3" />
                        <span>{supplier.supplierName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {supplier.supplierCategory.replace('_', ' ').split(' ').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </Badge>
                      </div>
                    ))}
                    {verifiedSuppliers.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{verifiedSuppliers.length - 3} more suppliers available
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Product Creation Form */
          <div className="space-y-6">
            {/* Selected Supplier Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium">Creating product for:</p>
                      <p className="text-sm text-muted-foreground">{selectedSupplier.supplierName}</p>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {selectedSupplier.supplierCategory.replace('_', ' ').split(' ').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSupplier(null)}
                  >
                    Change Supplier
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Supplier Product Form */}
            <SupplierProductForm
              supplierId={selectedSupplier.id}
              supplierName={selectedSupplier.supplierName}
              supplierCategory={selectedSupplier.supplierCategory}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting || createProductMutation.isPending}
            />
          </div>
        )}
      </div>
    </SupplierManagementLayout>
  );
}