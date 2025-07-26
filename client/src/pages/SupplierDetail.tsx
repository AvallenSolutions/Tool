import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Building2, Globe, Mail, MapPin, Package, 
  FileText, ExternalLink 
} from 'lucide-react';

export default function SupplierDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const { data: supplier, isLoading: supplierLoading } = useQuery({
    queryKey: ['/api/suppliers', id],
    queryFn: async () => {
      const response = await fetch(`/api/suppliers/${id}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load supplier');
      return response.json();
    },
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/supplier-products', 'supplier', id],
    queryFn: async () => {
      const response = await fetch(`/api/supplier-products?supplier=${id}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load supplier products');
      return response.json();
    },
  });

  if (supplierLoading) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Supplier Details" subtitle="Loading supplier information..." />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Supplier Not Found" subtitle="The requested supplier could not be found" />
          <main className="flex-1 p-6 overflow-y-auto">
            <Card>
              <CardContent className="pt-6 text-center">
                <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Supplier Not Found</h2>
                <p className="text-gray-600 mb-4">The supplier you're looking for doesn't exist or has been removed.</p>
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

  const getStatusBadge = (supplier: any) => {
    if (supplier.verificationStatus === 'verified') {
      return <Badge className="bg-green-100 text-green-800 border-green-300">Verified</Badge>;
    } else if (supplier.verificationStatus === 'pending_review') {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending Review</Badge>;
    } else {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Client Provided</Badge>;
    }
  };

  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header 
          title={supplier.supplierName} 
          subtitle={`${supplier.supplierCategory?.replace('_', ' ') || 'Supplier'} details and product catalog`} 
        />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => setLocation('/app/supplier-network')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Supplier Network
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Supplier Information */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{supplier.supplierName}</CardTitle>
                      <CardDescription className="capitalize">
                        {supplier.supplierCategory?.replace('_', ' ') || 'Supplier'}
                      </CardDescription>
                    </div>
                    {getStatusBadge(supplier)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {supplier.description && (
                    <p className="text-gray-700">{supplier.description}</p>
                  )}
                  
                  <div className="space-y-3">
                    {supplier.website && (
                      <div className="flex items-start">
                        <Globe className="w-4 h-4 mr-3 mt-0.5 text-gray-500" />
                        <a 
                          href={supplier.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center"
                        >
                          Visit Website
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </div>
                    )}
                    
                    {supplier.contactEmail && (
                      <div className="flex items-start">
                        <Mail className="w-4 h-4 mr-3 mt-0.5 text-gray-500" />
                        <a 
                          href={`mailto:${supplier.contactEmail}`} 
                          className="text-blue-600 hover:underline"
                        >
                          {supplier.contactEmail}
                        </a>
                      </div>
                    )}
                    
                    {supplier.location && (
                      <div className="flex items-start">
                        <MapPin className="w-4 h-4 mr-3 mt-0.5 text-gray-500" />
                        <span className="text-gray-700">{supplier.location}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Products */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Products ({products?.length || 0})
                  </CardTitle>
                  <CardDescription>
                    Products available from {supplier.supplierName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {productsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse h-24 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  ) : products && products.length > 0 ? (
                    <div className="space-y-4">
                      {products.map((product: any) => (
                        <Card key={product.id} className="border-gray-200">
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold">{product.productName}</h3>
                                  {product.hasPrecalculatedLca && (
                                    <Badge className="bg-green-100 text-green-800 border-green-300">
                                      <FileText className="w-3 h-3 mr-1" />
                                      LCA Data
                                    </Badge>
                                  )}
                                </div>
                                
                                {product.productDescription && (
                                  <p className="text-gray-600 mb-2">{product.productDescription}</p>
                                )}
                                
                                <div className="flex gap-4 text-sm text-gray-500">
                                  {product.sku && <span>SKU: {product.sku}</span>}
                                  {product.materialType && <span>Material: {product.materialType}</span>}
                                  {product.weight && (
                                    <span>Weight: {product.weight}{product.weightUnit || 'g'}</span>
                                  )}
                                </div>
                              </div>
                              
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setLocation(`/app/supplier-network/product/${product.id}`)}
                              >
                                View Details
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">No Products Available</h3>
                      <p className="text-gray-500">This supplier doesn't have any products in our catalog yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}