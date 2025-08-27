import { useQuery } from '@tanstack/react-query';

interface ComprehensiveFootprintData {
  companyId: number;
  companyName: string;
  calculationMethod: string;
  totalFootprint: {
    co2e_kg: number;
    co2e_tonnes: number;
    water_liters: number;
    waste_kg: number;
  };
  breakdown: {
    scope1And2Manual: {
      co2e_kg: number;
      entryCount: number;
    };
    scope3ProductLCA: {
      co2e_kg: number;
      description: string;
      productCount: number;
    };
    facilityImpactsNote: {
      co2e_kg: number;
      note: string;
    };
  };
  productDetails: Array<{
    productId: number;
    productName: string;
    productionVolume: number;
    perUnit: {
      co2e_kg: number;
      water_liters: number;
      waste_kg: number;
    };
    annualTotal: {
      co2e_kg: number;
      water_liters: number;
      waste_kg: number;
    };
    breakdown: {
      ingredients: { co2e: number; water: number; waste: number };
      packaging: { co2e: number; water: number; waste: number };
      facilities: { co2e: number; water: number; waste: number };
      endOfLife: { co2e: number; water: number; waste: number };
    };
  }>;
  metadata: {
    calculatedAt: string;
    methodology: string;
    dataQuality: string;
    standardsCompliant: boolean;
  };
}

interface ComprehensiveFootprintResponse {
  success: boolean;
  data: ComprehensiveFootprintData;
}

export function useComprehensiveFootprint() {
  return useQuery<ComprehensiveFootprintResponse>({
    queryKey: ['/api/company/footprint/comprehensive'],
    queryFn: async () => {
      const response = await fetch('/api/company/footprint/comprehensive');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch comprehensive footprint data');
      }
      
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Transform comprehensive footprint data to display format
export function transformComprehensiveFootprintToSummary(data: ComprehensiveFootprintData | undefined) {
  if (!data) {
    return {
      totalCO2e: '0.0',
      totalWater: '0',
      totalWaste: '0.0',
      methodologyUsed: 'No data available',
      lastCalculated: 'Never'
    };
  }

  return {
    totalCO2e: data.totalFootprint.co2e_tonnes.toFixed(1),
    totalWater: data.totalFootprint.water_liters.toLocaleString(),
    totalWaste: (data.totalFootprint.waste_kg / 1000).toFixed(1),
    methodologyUsed: data.metadata.methodology,
    lastCalculated: new Date(data.metadata.calculatedAt).toLocaleDateString()
  };
}

// Transform comprehensive footprint data to chart format
export function transformComprehensiveFootprintToChart(data: ComprehensiveFootprintData | undefined) {
  if (!data) {
    return {
      chartData: [],
      totalEmissions: 0
    };
  }

  const chartData = [
    {
      category: 'Product Impacts (Refined LCA)',
      emissions: data.breakdown.productsRefinedLCA.co2e_kg / 1000, // Convert to tonnes
      description: `${data.breakdown.productsRefinedLCA.productCount} products using OpenLCA + Material Factors + Facilities + End-of-Life`
    },
    {
      category: 'Manual Scope 1 & 2',
      emissions: data.breakdown.manualScope1And2.co2e_kg / 1000, // Convert to tonnes
      description: `${data.breakdown.manualScope1And2.entryCount} manually entered emission sources`
    }
  ];

  return {
    chartData,
    totalEmissions: data.totalFootprint.co2e_tonnes
  };
}