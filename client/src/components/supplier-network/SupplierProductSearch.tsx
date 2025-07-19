import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Package, Award, Truck, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

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
  currency?: string;
  minimumOrderQuantity?: number;
  leadTimeDays?: number;
  certifications?: string[];
  supplierName: string;
  supplierCategory: string;
}

interface SupplierProductSearchProps {
  category?: string;
  onSelect: (product: SupplierProduct) => void;
  selectedProductId?: string;
  className?: string;
}

const CATEGORY_OPTIONS = [
  { value: "bottle_producer", label: "Bottle Producer" },
  { value: "label_maker", label: "Label Maker" },
  { value: "closure_producer", label: "Closure Producer" },
  { value: "secondary_packaging", label: "Secondary Packaging" },
  { value: "ingredient_supplier", label: "Ingredient Supplier" },
  { value: "contract_distillery", label: "Contract Distillery" },
];

export default function SupplierProductSearch({ 
  category, 
  onSelect, 
  selectedProductId, 
  className 
}: SupplierProductSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(category || "");

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['/api/supplier-products', selectedCategory, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);
      
      const url = `/api/supplier-products${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      
      if (!response.ok) {
        throw new Error('Failed to load supplier products. Please try again.');
      }
      
      return response.json();
    },
    enabled: true,
  });

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const formatPrice = (price?: number, currency?: string) => {
    if (!price) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
  };

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <p className="text-destructive">Failed to load supplier products. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700", className)}>
      <CardHeader className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Package className="h-5 w-5" />
          Browse Verified Supplier Products
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          Choose from pre-vetted products with verified LCA data and supplier information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 bg-white dark:bg-gray-900">
        {/* Search and Filter Controls */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {!category && (
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All categories</SelectItem>
                {CATEGORY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {products && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {products.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No products found matching your criteria.</p>
                <p className="text-sm">Try adjusting your search or category filter.</p>
              </div>
            ) : (
              products.map((product: SupplierProduct) => (
                <Card 
                  key={product.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
                    selectedProductId === product.id && "ring-2 ring-primary"
                  )}
                  onClick={() => onSelect(product)}
                >
                  <CardContent className="p-4 bg-white dark:bg-gray-800">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{product.productName}</h4>
                        <p className="text-sm text-muted-foreground">
                          by {product.supplierName}
                        </p>
                        {product.sku && (
                          <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                        )}
                      </div>
                      {product.hasPrecalculatedLca && (
                        <Badge variant="secondary" className="text-xs">
                          <Award className="h-3 w-3 mr-1" />
                          Verified LCA
                        </Badge>
                      )}
                    </div>

                    {product.productDescription && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {product.productDescription}
                      </p>
                    )}

                    {/* Product Details */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_OPTIONS.find(cat => cat.value === product.supplierCategory)?.label || product.supplierCategory}
                      </Badge>
                      
                      {product.certifications && product.certifications.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {product.certifications.length} certification{product.certifications.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>

                    {/* Additional Info */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        {product.basePrice && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatPrice(product.basePrice, product.currency)}
                          </span>
                        )}
                        {product.leadTimeDays && (
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {product.leadTimeDays} days
                          </span>
                        )}
                      </div>
                      {product.minimumOrderQuantity && (
                        <span>MOQ: {product.minimumOrderQuantity}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {selectedProductId && (
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => onSelect(products?.find((p: SupplierProduct) => p.id === selectedProductId))}>
              Use Selected Product
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}