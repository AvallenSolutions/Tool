import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package } from 'lucide-react';
import { useLocation } from 'wouter';
import SupplierProductDetail from '@/components/supplier-network/SupplierProductDetail';

export default function SupplierProductDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['supplier-product', id],
    queryFn: async () => {
      console.log('Fetching supplier product with ID:', id);
      const response = await fetch(`/api/supplier-products/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch supplier product');
      }
      const data = await response.json();
      console.log('Supplier product data from API:', data);
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Loading..." subtitle="Fetching supplier product details" />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Error Loading Product" subtitle="There was an issue fetching the supplier product data" />
          <main className="flex-1 p-6 overflow-y-auto">
            <Card>
              <CardContent className="text-center py-12">
                <Package className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Supplier Product</h3>
                <p className="text-gray-600 mb-2">Error: {error.message}</p>
                <p className="text-gray-500 mb-6">Check the console for more details</p>
                <Button onClick={() => setLocation('/app/supplier-network')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Supplier Network
                </Button>
              </CardContent>
            </Card>
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
          title={product?.productName || 'Supplier Product'} 
          subtitle={`${product?.supplierName || 'Unknown Supplier'} • ${product?.sku || 'No SKU'}`} 
        />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                onClick={() => setLocation('/app/supplier-network')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Supplier Network
              </Button>
            </div>
            
            <SupplierProductDetail product={product} showLcaData={true} />
          </div>
        </main>
      </div>
    </div>
  );
}