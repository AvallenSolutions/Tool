import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, Package, Building2, FileText, Globe, Mail,
  Weight, Ruler, Recycle, Award, Info
} from 'lucide-react';

function ProductDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  // Hardcoded test data for product ID 2 while server is having issues
  const product = id === '2' ? {
    id: 2,
    name: 'Avallen Test',
    description: 'Avallen Product Test',
    type: 'spirits',
    status: 'draft',
    product_images: [
      "https://storage.googleapis.com/replit-objstore-e2accb01-0b2e-43b0-aa98-3aebaaefd5b6/.private/uploads/b3260734-c84e-4882-8332-f241751ef2eb",
      "https://storage.googleapis.com/replit-objstore-e2accb01-0b2e-43b0-aa98-3aebaaefd5b6/.private/uploads/02f8e54f-e7f0-4b39-9cb1-38a2cecd5f38",
      "https://storage.googleapis.com/replit-objstore-e2accb01-0b2e-43b0-aa98-3aebaaefd5b6/.private/uploads/b6b6ab49-2dd0-4bab-ab35-24158411aec4",
      "https://storage.googleapis.com/replit-objstore-e2accb01-0b2e-43b0-aa98-3aebaaefd5b6/.private/uploads/47c7bc07-0bdc-410c-a183-845906a4439d",
      "https://storage.googleapis.com/replit-objstore-e2accb01-0b2e-43b0-aa98-3aebaaefd5b6/.private/uploads/67388a5c-862a-45be-9416-75cc4835a9e6"
    ]
  } : null;
  
  const productLoading = false;

  if (productLoading) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Product Details" subtitle="Loading product information..." />
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

  if (!product) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Product Not Found" subtitle="The requested product could not be found" />
          <main className="flex-1 p-6 overflow-y-auto">
            <Card>
              <CardContent className="text-center py-12">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Product Not Found</h3>
                <p className="text-gray-600 mb-6">The product you're looking for doesn't exist or has been removed.</p>
                <Button onClick={() => setLocation('/app/products')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Products
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
          title={product.name} 
          subtitle="Product details and environmental impact analysis" 
        />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="mb-6">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setLocation('/app/products')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Products
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product Images */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Product Images</CardTitle>
                </CardHeader>
                <CardContent>
                  {product.product_images && product.product_images.length > 0 ? (
                    <div className="space-y-4">
                      <div className="text-sm text-gray-500 mb-2">Found {product.product_images.length} images</div>
                      {product.product_images.map((photo: string, index: number) => {
                        // Try different approaches to serve the image
                        const approaches = [
                          photo.startsWith('/objects/') ? photo : `/objects/uploads/${photo.split('/.private/uploads/')[1]}`,
                          `/api/image-proxy?url=${encodeURIComponent(photo)}`,
                          photo // Direct GCS URL as fallback
                        ];
                        
                        console.log('Processing image:', { original: photo, approaches });
                        
                        return (
                          <div key={index} className="space-y-2">
                            <div className="text-xs text-gray-400">Image {index + 1}</div>
                            {approaches.map((url, urlIndex) => (
                              <img 
                                key={`${index}-${urlIndex}`}
                                src={url}
                                alt={`${product.name} - Image ${index + 1} (Method ${urlIndex + 1})`}
                                className="w-full h-48 object-cover rounded-lg border"
                                onError={(e) => {
                                  console.error(`Method ${urlIndex + 1} failed:`, url);
                                  if (urlIndex === approaches.length - 1) {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }
                                }}
                                onLoad={() => {
                                  console.log(`Method ${urlIndex + 1} worked:`, url);
                                  // Hide other attempts once one works
                                  const container = (e.target as HTMLElement).parentElement;
                                  const imgs = container?.querySelectorAll('img');
                                  imgs?.forEach((img, i) => {
                                    if (i !== urlIndex) img.style.display = 'none';
                                  });
                                }}
                              />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No product images available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Product Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl">{product.name}</CardTitle>
                      <CardDescription>
                        Product Details
                      </CardDescription>
                    </div>
                    {product.hasPrecalculatedLca && (
                      <Badge className="bg-green-100 text-green-800 border-green-300">
                        <FileText className="w-3 h-3 mr-1" />
                        LCA Data Available
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {product.description && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Description</label>
                      <p className="text-gray-800">{product.description}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-600">Type</label>
                    <p className="text-gray-800 capitalize">{product.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                      {product.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ProductDetail;