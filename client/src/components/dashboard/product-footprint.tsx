import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Leaf, Droplets } from "lucide-react";

export default function ProductFootprint() {
  const [selectedProduct, setSelectedProduct] = useState<string>("");

  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products"],
    retry: false,
  });

  if (isLoading) {
    return (
      <Card className="border-light-gray">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-gray">
            Product Footprint
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded-lg"></div>
            <div className="h-16 bg-gray-200 rounded-lg"></div>
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const productList = products || [];
  const currentProduct = productList.find((p: any) => p.id.toString() === selectedProduct) || productList[0];

  return (
    <Card className="border-light-gray">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-gray">
            Product Footprint
          </CardTitle>
          <Select 
            value={selectedProduct} 
            onValueChange={setSelectedProduct}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              {productList.map((product: any) => (
                <SelectItem key={product.id} value={product.id.toString()}>
                  {product.name} {product.size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {currentProduct ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-lightest-gray rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-avallen-green/10 rounded-full flex items-center justify-center">
                  <Leaf className="w-4 h-4 text-avallen-green" />
                </div>
                <div>
                  <p className="font-medium text-slate-gray">Carbon Footprint</p>
                  <p className="text-sm text-gray-500">Per {currentProduct.size} bottle</p>
                </div>
              </div>
              <span className="text-lg font-bold text-slate-gray">
                {currentProduct.carbonFootprint?.toFixed(1) || '0.0'} kg CO2e
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-lightest-gray rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-gray">Water Footprint</p>
                  <p className="text-sm text-gray-500">Per {currentProduct.size} bottle</p>
                </div>
              </div>
              <span className="text-lg font-bold text-slate-gray">
                {currentProduct.waterFootprint?.toFixed(1) || '0.0'} L
              </span>
            </div>

            <div className="pt-4 border-t border-light-gray">
              <div className="text-sm text-gray-500 mb-2">Impact breakdown:</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-gray">Raw materials</span>
                  <span className="font-medium">
                    {(currentProduct.carbonFootprint * 0.5)?.toFixed(1) || '0.0'} kg CO2e
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-gray">Production</span>
                  <span className="font-medium">
                    {(currentProduct.carbonFootprint * 0.3)?.toFixed(1) || '0.0'} kg CO2e
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-gray">Packaging</span>
                  <span className="font-medium">
                    {(currentProduct.carbonFootprint * 0.2)?.toFixed(1) || '0.0'} kg CO2e
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No products configured yet</p>
            <p className="text-sm text-gray-400">
              Add products during onboarding to see their footprint
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
