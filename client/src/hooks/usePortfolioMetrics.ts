import { useQuery } from '@tanstack/react-query';
import { useRefinedLCA } from './useRefinedLCA';

interface PortfolioMetrics {
  totalCO2e: number;
  totalWater: number;
  totalWaste: number;
  productCount: number;
  activeCount: number;
  withLCADataCount: number;
  isLoading: boolean;
  error: boolean;
}

interface Product {
  id: number;
  annualProductionVolume: number | string;
  status: string;
}

export function usePortfolioMetrics(products?: Product[]): PortfolioMetrics {
  // Always call hooks - use a placeholder array if products are not available
  const productList = products && Array.isArray(products) ? products : [];
  
  // Use a stable query approach instead of dynamic hooks
  const portfolioQuery = useQuery({
    queryKey: ['portfolio-metrics', productList.map(p => p.id).sort().join(',')],
    queryFn: async () => {
      if (!productList.length) return null;
      
      // Fetch LCA data for all products
      const promises = productList.map(async (product) => {
        try {
          const response = await fetch(`/api/products/${product.id}/refined-lca`);
          if (!response.ok) return null;
          return await response.json();
        } catch (error) {
          console.error('Error fetching LCA for product', product.id, error);
          return null;
        }
      });
      
      const lcaResults = await Promise.all(promises);
      return lcaResults.map((result, index) => ({
        product: productList[index],
        lcaData: result
      }));
    },
    enabled: productList.length > 0
  });
  
  // Return early metrics if no products
  if (!products || !Array.isArray(products) || !productList.length) {
    return {
      totalCO2e: 0,
      totalWater: 0,
      totalWaste: 0,
      productCount: 0,
      activeCount: 0,
      withLCADataCount: 0,
      isLoading: false,
      error: false
    };
  }

  const isLoading = portfolioQuery.isLoading;
  const error = !!portfolioQuery.error;
  const data = portfolioQuery.data;

  // Calculate totals from the fetched data
  const metrics = data ? data.reduce((acc, item) => {
    const { product, lcaData } = item;
    const volume = parseFloat(product.annualProductionVolume?.toString() || '0') || 0;
    
    if (lcaData?.success && lcaData.data) {
      const perUnit = lcaData.data.perUnit;
      acc.totalCO2e += perUnit.co2e_kg * volume;
      acc.totalWater += perUnit.water_liters * volume;
      acc.totalWaste += perUnit.waste_kg * volume;
      acc.withLCADataCount++;
    }
    
    if (product.status === 'active') {
      acc.activeCount++;
    }
    
    return acc;
  }, {
    totalCO2e: 0,
    totalWater: 0,
    totalWaste: 0,
    withLCADataCount: 0,
    activeCount: 0
  }) : {
    totalCO2e: 0,
    totalWater: 0,
    totalWaste: 0,
    withLCADataCount: 0,
    activeCount: 0
  };

  return {
    ...metrics,
    productCount: productList.length,
    isLoading,
    error
  };
}