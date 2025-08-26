import { useProductLCAMetrics } from '@/hooks/useProductLCAMetrics';

interface ProductLCAMetricsDisplayProps {
  productId: number;
}

export function ProductLCAMetricsDisplay({ productId }: ProductLCAMetricsDisplayProps) {
  const { co2e, water, waste, isLoading, error } = useProductLCAMetrics(productId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center bg-gray-50 rounded p-2 border">
          <span className="block font-medium text-gray-500">CO₂</span>
          <span className="block text-sm font-bold text-gray-400">...</span>
        </div>
        <div className="text-center bg-gray-50 rounded p-2 border">
          <span className="block font-medium text-gray-500">Water</span>
          <span className="block text-sm font-bold text-gray-400">...</span>
        </div>
        <div className="text-center bg-gray-50 rounded p-2 border">
          <span className="block font-medium text-gray-500">Waste</span>
          <span className="block text-sm font-bold text-gray-400">...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center bg-red-50 rounded p-2 border border-red-200">
          <span className="block font-medium text-red-700">CO₂</span>
          <span className="block text-sm font-bold text-red-800">Error</span>
        </div>
        <div className="text-center bg-red-50 rounded p-2 border border-red-200">
          <span className="block font-medium text-red-700">Water</span>
          <span className="block text-sm font-bold text-red-800">Error</span>
        </div>
        <div className="text-center bg-red-50 rounded p-2 border border-red-200">
          <span className="block font-medium text-red-700">Waste</span>
          <span className="block text-sm font-bold text-red-800">Error</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 text-xs">
      <div className="text-center bg-green-50 rounded p-2 border border-green-200">
        <span className="block font-medium text-green-700">CO₂</span>
        <span className="block text-sm font-bold text-green-800">{co2e}</span>
      </div>
      <div className="text-center bg-blue-50 rounded p-2 border border-blue-200">
        <span className="block font-medium text-blue-700">Water</span>
        <span className="block text-sm font-bold text-blue-800">{water}</span>
      </div>
      <div className="text-center bg-orange-50 rounded p-2 border border-orange-200">
        <span className="block font-medium text-orange-700">Waste</span>
        <span className="block text-sm font-bold text-orange-800">{waste}</span>
      </div>
    </div>
  );
}