import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, Building2, AlertTriangle, ArrowLeft, Plus, RefreshCw } from "lucide-react";
import { useVerifiedSuppliers } from "@/hooks/useVerifiedSuppliers";

export default function ProductRegistration() {
  const [, navigate] = useLocation();
  const [showSupplierWarning, setShowSupplierWarning] = useState(false);

  // Use the new centralized hook with automatic verification status sync
  const { 
    data: suppliers, 
    isLoading, 
    getVerifiedSuppliers, 
    refetch: refetchSuppliers 
  } = useVerifiedSuppliers({ 
    autoRefresh: true, 
    refetchInterval: 15000 // Refresh every 15 seconds for real-time updates
  });

  useEffect(() => {
    if (!isLoading && suppliers) {
      // Only show warning if no verified suppliers are available
      const verifiedSuppliers = getVerifiedSuppliers();
      setShowSupplierWarning(verifiedSuppliers.length === 0);
    }
  }, [suppliers, isLoading, getVerifiedSuppliers]);

  const handleProductSubmit = (productData: any) => {
    // Redirected to Enhanced Product Form
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

            {/* Supplier Count Info with Real-time Status */}
            {!showSupplierWarning && suppliers && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">
                          {getVerifiedSuppliers().length} verified supplier{getVerifiedSuppliers().length !== 1 ? 's' : ''} available
                        </p>
                        <p className="text-sm text-green-700">
                          You can link this product to any of the existing verified suppliers.
                        </p>
                        {suppliers.length > getVerifiedSuppliers().length && (
                          <p className="text-xs text-green-600 mt-1">
                            {suppliers.length - getVerifiedSuppliers().length} supplier{(suppliers.length - getVerifiedSuppliers().length) !== 1 ? 's' : ''} pending verification
                          </p>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => refetchSuppliers()}
                      className="text-green-600 hover:text-green-700"
                      title="Refresh supplier verification status"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
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
                  <div className="p-6 text-center text-gray-500">
                    <Package className="mx-auto h-12 w-12 mb-4" />
                    <p>Product registration form has been replaced with the Enhanced Product Form.</p>
                    <Button 
                      onClick={() => navigate('/app/products/create/enhanced')} 
                      className="mt-4"
                    >
                      Create Enhanced Product
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}