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
  if (!products || !Array.isArray(products)) {
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
  // Get LCA data for all products
  const lcaQueries = products.map(product => 
    useRefinedLCA(product.id)
  );

  const isLoading = lcaQueries.some(query => query.isLoading);
  const error = lcaQueries.some(query => !!query.error);

  // Calculate totals
  const metrics = products.reduce((acc, product, index) => {
    const lcaData = lcaQueries[index].data;
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
  });

  return {
    ...metrics,
    productCount: products.length,
    isLoading,
    error
  };
}