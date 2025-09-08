import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, Leaf, Droplets, Trash2 } from 'lucide-react';

interface ClientProduct {
  id: number;
  name: string;
  sku?: string;
  type: string;
  volume: string;
  description?: string;
  productionModel: string;
  annualProductionVolume: number;
  productionUnit: string;
  carbonFootprint?: number;
  waterFootprint?: number;
  wasteFootprint?: number;
  status: string;
  isMainProduct: boolean;
  productImages?: string[];
  createdAt: string;
  componentCount?: number;
}

interface LCAProductSelectorProps {
  products: ClientProduct[];
  selectedProductIds: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  className?: string;
}

export function LCAProductSelector({
  products,
  selectedProductIds,
  onSelectionChange,
  className = ""
}: LCAProductSelectorProps) {
  const handleProductToggle = (productId: number, isSelected: boolean) => {
    if (isSelected) {
      onSelectionChange([...selectedProductIds, productId]);
    } else {
      onSelectionChange(selectedProductIds.filter(id => id !== productId));
    }
  };

  const handleSelectAll = () => {
    if (selectedProductIds.length === products.length) {
      // Deselect all
      onSelectionChange([]);
    } else {
      // Select all
      onSelectionChange(products.map(p => p.id));
    }
  };

  const isAllSelected = selectedProductIds.length === products.length;
  const isPartiallySelected = selectedProductIds.length > 0 && selectedProductIds.length < products.length;

  if (products.length === 0) {
    return (
      <Card className={`border-2 border-dashed border-gray-300 ${className}`}>
        <CardContent className="py-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Products Available</h3>
          <p className="text-gray-500">
            Create confirmed products to generate LCA reports.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Selection Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-25 border border-green-200 rounded-lg">
        <div className="flex items-center gap-3">
          <Checkbox
            id="select-all"
            checked={isAllSelected}
            ref={(el) => {
              if (el) {
                el.indeterminate = isPartiallySelected;
              }
            }}
            onCheckedChange={handleSelectAll}
            className="border-2"
          />
          <label htmlFor="select-all" className="font-medium text-gray-700 cursor-pointer">
            Select All Products
          </label>
        </div>
        <div className="text-sm text-gray-600">
          {selectedProductIds.length} of {products.length} selected
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => {
          const isSelected = selectedProductIds.includes(product.id);
          
          return (
            <Card 
              key={product.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected 
                  ? 'border-2 border-avallen-green bg-green-50' 
                  : 'border border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleProductToggle(product.id, !isSelected)}
            >
              <CardContent className="p-4">
                {/* Selection Checkbox and Product Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => {}} // Handled by card click
                      className="border-2"
                      onClick={(e) => e.stopPropagation()}
                    />
                    {product.isMainProduct && (
                      <Badge className="bg-avallen-green text-white text-xs">
                        Main
                      </Badge>
                    )}
                  </div>
                  <Badge variant={product.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                    {product.status}
                  </Badge>
                </div>

                {/* Product Image */}
                <div className="w-full h-24 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-3 rounded-lg overflow-hidden">
                  {product.productImages && product.productImages.length > 0 ? (
                    <img 
                      src={`/simple-image/objects/uploads/${product.productImages[0].split('/').pop()}`}
                      alt={product.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.parentElement?.querySelector('.fallback-icon');
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`fallback-icon flex flex-col items-center ${product.productImages && product.productImages.length > 0 ? 'hidden' : ''}`}>
                    <Package className="w-8 h-8 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-400">No Image</span>
                  </div>
                </div>

                {/* Product Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-slate-gray text-sm line-clamp-1">
                    {product.name}
                  </h3>
                  
                  {product.sku && (
                    <p className="text-xs text-gray-500">
                      SKU: {product.sku}
                    </p>
                  )}

                  {/* Environmental Metrics */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Leaf className="w-3 h-3 text-green-600" />
                      </div>
                      <div className="text-xs font-medium text-gray-700">
                        {product.carbonFootprint ? `${product.carbonFootprint.toFixed(2)}` : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">kg CO₂e</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Droplets className="w-3 h-3 text-blue-600" />
                      </div>
                      <div className="text-xs font-medium text-gray-700">
                        {product.waterFootprint ? `${product.waterFootprint.toFixed(2)}` : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">L</div>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Trash2 className="w-3 h-3 text-amber-600" />
                      </div>
                      <div className="text-xs font-medium text-gray-700">
                        {product.wasteFootprint ? `${product.wasteFootprint.toFixed(3)}` : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">kg</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}