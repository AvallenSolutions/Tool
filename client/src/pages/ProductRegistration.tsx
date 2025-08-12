import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import OptimizedProductForm from "@/components/products/OptimizedProductForm";
import { Package, Building2, AlertTriangle, ArrowLeft, Plus } from "lucide-react";
import { ImageUploader } from "@/components/ImageUploader";

interface Supplier {
  id: number;
  supplierName: string;
  supplierCategory: string;
  verificationStatus: string;
}

export default function ProductRegistration() {
  const [, navigate] = useLocation();
  const [showSupplierWarning, setShowSupplierWarning] = useState(false);

  const { data: suppliers, isLoading } = useQuery<Supplier[]>({
    queryKey: ['/api/verified-suppliers'],
  });

  useEffect(() => {
    if (!isLoading && suppliers) {
      setShowSupplierWarning(suppliers.length === 0);
    }
  }, [suppliers, isLoading]);

  const handleProductSubmit = (productData: any) => {
    // This will be handled by the OptimizedProductForm
    console.log("Product submitted:", productData);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Product Registration" subtitle="Loading..." />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <div className="animate-pulse space-y-6">
                <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
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
          title="Product Registration" 
          subtitle="Register a new product and link it to an existing supplier" 
        />
        
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/app/admin/products')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Product Management
              </Button>
            </div>

            {/* Supplier Warning */}
            {showSupplierWarning && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong>No suppliers found!</strong> You need to register suppliers before adding products.
                      Products must be linked to existing suppliers in the verified network.
                    </div>
                    <Button 
                      onClick={() => navigate('/app/supplier-registration')}
                      className="bg-yellow-600 hover:bg-yellow-700 ml-4"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Register Supplier First
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Supplier Count Info */}
            {!showSupplierWarning && suppliers && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">
                        {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''} available
                      </p>
                      <p className="text-sm text-green-700">
                        You can link this product to any of the existing verified suppliers.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Product Registration Form */}
            {!showSupplierWarning && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-green-600" />
                    Product Registration Form
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Fill in all product details and select the appropriate supplier.
                  </p>
                </CardHeader>
                <CardContent>
                  <OptimizedProductForm
                    onSubmit={handleProductSubmit}
                    isEditing={false}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}