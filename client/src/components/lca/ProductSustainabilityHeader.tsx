import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leaf, Droplets, Trash2 } from 'lucide-react';

interface ProductSustainabilityHeaderProps {
  product: {
    id: number;
    name: string;
    image: string | null;
  };
  metrics: {
    carbonFootprint: {
      value: number;
      unit: string;
    };
    waterFootprint: {
      value: number;
      unit: string;
    };
    wasteOutput: {
      value: number;
      unit: string;
    };
  };
}

export default function ProductSustainabilityHeader({ product, metrics }: ProductSustainabilityHeaderProps) {
  // Handle image URL formatting
  const getImageSrc = (imageUrl: string | null) => {
    if (!imageUrl) return null;
    
    if (imageUrl.includes('storage.googleapis.com')) {
      const parts = imageUrl.split('/');
      const uuid = parts[parts.length - 1].split('?')[0];
      return `/simple-image/objects/uploads/${uuid}`;
    }
    
    return imageUrl;
  };

  const imageSrc = getImageSrc(product.image);

  return (
    <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Leaf className="w-6 h-6 text-green-600" />
          Product Sustainability Overview
          <Badge variant="secondary" className="ml-2">Real-Time Data</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Product Image */}
          <div className="lg:col-span-1">
            <div className="aspect-square w-full max-w-64 mx-auto">
              {imageSrc ? (
                <img 
                  src={imageSrc}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-lg border shadow-md"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gray-100 rounded-lg border flex items-center justify-center">
                  <span className="text-gray-400 text-sm">No Image Available</span>
                </div>
              )}
            </div>
            <h3 className="text-lg font-semibold text-center mt-3">{product.name}</h3>
          </div>

          {/* Key Metrics */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
              {/* Carbon Footprint */}
              <div className="bg-white border border-green-200 rounded-lg p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <Leaf className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <div className="mb-2">
                  <span className="text-3xl font-bold text-green-700">
                    {metrics.carbonFootprint.value.toFixed(2)}
                  </span>
                  <div className="text-sm text-gray-600 mt-1">
                    {metrics.carbonFootprint.unit}
                  </div>
                </div>
                <div className="text-sm font-medium text-green-800">Carbon Footprint</div>
                <Badge variant="outline" className="mt-2 text-xs">
                  ISO 14067 Compliant
                </Badge>
              </div>

              {/* Water Footprint */}
              <div className="bg-white border border-blue-200 rounded-lg p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Droplets className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <div className="mb-2">
                  <span className="text-3xl font-bold text-blue-700">
                    {metrics.waterFootprint.value.toFixed(1)}
                  </span>
                  <div className="text-sm text-gray-600 mt-1">
                    {metrics.waterFootprint.unit}
                  </div>
                </div>
                <div className="text-sm font-medium text-blue-800">Water Footprint</div>
                <Badge variant="outline" className="mt-2 text-xs">
                  ISO 14046 Compliant
                </Badge>
              </div>

              {/* Waste Output */}
              <div className="bg-white border border-orange-200 rounded-lg p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-orange-100 rounded-full">
                    <Trash2 className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
                <div className="mb-2">
                  <span className="text-3xl font-bold text-orange-700">
                    {metrics.wasteOutput.value.toFixed(2)}
                  </span>
                  <div className="text-sm text-gray-600 mt-1">
                    {metrics.wasteOutput.unit}
                  </div>
                </div>
                <div className="text-sm font-medium text-orange-800">Waste Output</div>
                <Badge variant="outline" className="mt-2 text-xs">
                  Calculated
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}