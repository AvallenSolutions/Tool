import { Card, CardContent } from "@/components/ui/card";

interface KeyMetric {
  value: number;
  unit: string;
}

interface Product {
  id: number;
  name: string;
  image: string | null;
}

interface LcaHeaderProps {
  product: Product;
  metrics: {
    carbonFootprint: KeyMetric;
    waterFootprint: KeyMetric;
    wasteOutput: KeyMetric;
  };
}

interface KeyMetricCardProps {
  title: string;
  value: number;
  unit: string;
  color: string;
}

function KeyMetricCard({ title, value, unit, color }: KeyMetricCardProps) {
  return (
    <Card className="border-light-gray">
      <CardContent className="p-6">
        <div className="text-center">
          <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
          <div className={`text-3xl font-bold mb-1 ${color}`}>
            {value.toFixed(2)}
          </div>
          <p className="text-sm text-gray-500">{unit}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LcaHeader({ product, metrics }: LcaHeaderProps) {
  // Helper function to process image URL
  const getImageUrl = (imageUrl: string | null) => {
    if (!imageUrl) return null;
    
    // If it's already a simple image route, use it as is
    if (imageUrl.startsWith('/simple-image/')) {
      return imageUrl;
    }
    
    // Extract UUID from full GCS URL and convert to simple route
    if (imageUrl.includes('googleapis.com') && imageUrl.includes('uploads/')) {
      const uuidMatch = imageUrl.match(/uploads\/([a-f0-9-]+)/);
      if (uuidMatch) {
        return `/simple-image/objects/uploads/${uuidMatch[1]}`;
      }
    }
    
    return imageUrl;
  };

  const processedImageUrl = getImageUrl(product.image);

  return (
    <Card className="border-light-gray">
      <CardContent className="p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          {/* Product Info */}
          <div className="flex items-center gap-6">
            {processedImageUrl && (
              <div className="flex-shrink-0">
                <img
                  src={processedImageUrl}
                  alt={product.name}
                  className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                  onError={(e) => {
                    console.log('Image failed to load:', processedImageUrl);
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h2>
              <p className="text-gray-600">Environmental Impact Analysis</p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:w-2/3">
            <KeyMetricCard
              title="Total Carbon Footprint"
              value={metrics.carbonFootprint.value}
              unit={metrics.carbonFootprint.unit}
              color="text-green-600"
            />
            <KeyMetricCard
              title="Water Footprint"
              value={metrics.waterFootprint.value}
              unit={metrics.waterFootprint.unit}
              color="text-blue-600"
            />
            <KeyMetricCard
              title="Waste Output"
              value={metrics.wasteOutput.value}
              unit={metrics.wasteOutput.unit}
              color="text-amber-600"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}