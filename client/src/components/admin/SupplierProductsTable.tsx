import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink, Package } from 'lucide-react';

interface SupplierProduct {
  id: string;
  productName: string;
  productDescription?: string;
  sku: string;
  supplierName: string;
  supplierCategory: string;
  productAttributes: {
    type?: string;
    material?: string;
    weight?: number;
    co2Emissions?: number;
    lcaDocumentPath?: string;
    recycledContent?: number;
  };
  isVerified: boolean;
  submittedBy: string;
  createdAt: string;
}

export default function SupplierProductsTable() {
  const { data: products = [], isLoading } = useQuery<SupplierProduct[]>({
    queryKey: ['/api/supplier-products'],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-20 bg-gray-200 rounded-lg"></div>
        <div className="animate-pulse h-20 bg-gray-200 rounded-lg"></div>
        <div className="animate-pulse h-20 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Yet</h3>
        <p className="text-gray-600">Products created through the supplier network will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {products.map((product) => (
        <Card key={product.id} className="border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{product.productName}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <span>by {product.supplierName}</span>
                  <Badge variant="outline" className="text-xs">
                    {product.supplierCategory.replace('_', ' ')}
                  </Badge>
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {product.isVerified && (
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    Verified
                  </Badge>
                )}
                {product.productAttributes.lcaDocumentPath && (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                    <FileText className="w-3 h-3 mr-1" />
                    LCA Available
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {product.productDescription && (
              <p className="text-sm text-gray-700 mb-3">{product.productDescription}</p>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
              {product.sku && (
                <div>
                  <span className="text-xs font-medium text-gray-500">SKU</span>
                  <p className="text-sm font-medium">{product.sku}</p>
                </div>
              )}
              
              {product.productAttributes.type && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Type</span>
                  <p className="text-sm font-medium">{product.productAttributes.type}</p>
                </div>
              )}
              
              {product.productAttributes.material && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Material</span>
                  <p className="text-sm font-medium capitalize">{product.productAttributes.material}</p>
                </div>
              )}
              
              {product.productAttributes.co2Emissions && (
                <div>
                  <span className="text-xs font-medium text-gray-500">CO2 Emissions</span>
                  <p className="text-sm font-medium text-green-700">
                    {product.productAttributes.co2Emissions}g CO2e
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Created: {new Date(product.createdAt).toLocaleDateString()}</span>
                <span>•</span>
                <span>Submitted by: {product.submittedBy}</span>
              </div>
              
              {product.productAttributes.lcaDocumentPath && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="text-blue-600 hover:text-blue-800"
                >
                  <a
                    href={`/uploads/${product.productAttributes.lcaDocumentPath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View LCA Document
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}