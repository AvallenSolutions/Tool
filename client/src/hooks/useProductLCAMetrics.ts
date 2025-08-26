import { useQuery } from '@tanstack/react-query';
import { useRefinedLCA } from './useRefinedLCA';

interface ProductLCAMetrics {
  co2e: string;
  water: string;
  waste: string;
  isLoading: boolean;
  error: boolean;
}

export function useProductLCAMetrics(productId: number): ProductLCAMetrics {
  // First, try to get refined LCA data (prioritizes verified supplier data)
  const { data: refinedLCAResponse, isLoading: refinedLoading, error: refinedError } = useRefinedLCA(productId);

  // Check for verified supplier data override
  const { data: verifiedSupplierData, isLoading: supplierLoading } = useQuery({
    queryKey: [`/api/products/${productId}/verified-supplier-impacts`],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/products/${productId}/verified-supplier-impacts`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data;
      } catch (error) {
        console.log('No verified supplier data available, falling back to refined LCA');
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!productId,
  });

  const isLoading = refinedLoading || supplierLoading;
  const error = !!refinedError;

  // Priority order: 1. Verified supplier data, 2. Refined LCA data, 3. TBD
  if (verifiedSupplierData?.success && verifiedSupplierData.data) {
    const data = verifiedSupplierData.data;
    return {
      co2e: data.co2e_kg ? `${data.co2e_kg.toFixed(1)}kg` : 'TBD',
      water: data.water_liters ? `${Math.round(data.water_liters)}L` : 'TBD',
      waste: data.waste_kg ? `${data.waste_kg.toFixed(1)}kg` : 'TBD',
      isLoading: false,
      error: false
    };
  }

  if (refinedLCAResponse?.success && refinedLCAResponse.data) {
    const data = refinedLCAResponse.data;
    console.log('✅ Using refined LCA data:', data.perUnit);
    return {
      co2e: `${data.perUnit.co2e_kg.toFixed(1)}kg`,
      water: `${Math.round(data.perUnit.water_liters)}L`,
      waste: `${data.perUnit.waste_kg.toFixed(1)}kg`,
      isLoading: false,
      error: false
    };
  }

  console.log('❌ No LCA data available:', { 
    refinedLCAResponse: refinedLCAResponse?.success, 
    verifiedSupplierData: verifiedSupplierData?.success,
    isLoading, 
    error 
  });
  
  return {
    co2e: 'TBD',
    water: 'TBD',
    waste: 'TBD',
    isLoading,
    error
  };
}