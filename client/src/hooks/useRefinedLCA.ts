import { useQuery } from '@tanstack/react-query';

interface GHGGas {
  gas_formula: string;
  total_mass_kg: number;
  gwp_factor: number;
  total_co2e: number;
  sources: Array<{
    ingredient: string;
    mass_kg: number;
    co2e: number;
  }>;
}

interface GHGBreakdown {
  individual_gases: GHGGas[];
  total_co2e_from_ghg: number;
  ingredients_detail: Array<{
    ingredient: string;
    amount: number;
    unit: string;
    ghg_emissions: Array<{
      gas_name: string;
      mass_kg: number;
      gwp_factor: number;
      co2e: number;
    }>;
    total_co2e: number;
  }>;
  methodology: string;
  data_quality: string;
  calculation_standard: string;
}

interface RefinedLCAData {
  productId: number;
  productName: string;
  calculationMethod: string;
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
    facilities?: { co2e: number; water: number; waste: number };
    dilutionRecorded: { amount: number; unit: string; excluded: boolean };
  };
  ghgBreakdown?: GHGBreakdown;
  metadata: {
    calculatedAt: string;
    waterDilutionExcluded: boolean;
    dataSource: string;
    productionVolume: number;
    isoCompliant?: boolean;
    ghgAnalysisAvailable?: boolean;
  };
}

interface RefinedLCAResponse {
  success: boolean;
  data: RefinedLCAData;
}

export function useRefinedLCA(productId: number | undefined) {
  return useQuery<RefinedLCAResponse>({
    queryKey: ['/api/products', productId, 'refined-lca'],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      
      const response = await fetch(`/api/products/${productId}/refined-lca`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch refined LCA data');
      }
      
      return data;
    },
    enabled: Boolean(productId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Transform refined LCA data to metrics format for LcaHeader component
export function transformRefinedLCAToMetrics(refinedLCA: RefinedLCAData | undefined) {
  if (!refinedLCA) {
    return {
      carbonFootprint: { value: '0.000', unit: 'kg CO₂e' },
      waterFootprint: { value: '0.0', unit: 'L' },
      wasteOutput: { value: '0.000', unit: 'kg' },
    };
  }

  return {
    carbonFootprint: {
      value: refinedLCA.perUnit.co2e_kg.toFixed(3),
      unit: 'kg CO₂e'
    },
    waterFootprint: {
      value: refinedLCA.perUnit.water_liters.toFixed(1),
      unit: 'L (excluding dilution)'
    },
    wasteOutput: {
      value: refinedLCA.perUnit.waste_kg.toFixed(3),
      unit: 'kg'
    },
  };
}

// Transform refined LCA data to breakdown format for charts
export function transformRefinedLCAToBreakdown(refinedLCA: RefinedLCAData | undefined) {
  if (!refinedLCA) {
    return {
      carbonBreakdown: [
        { stage: 'Ingredients', value: 0, percentage: 0 },
        { stage: 'Packaging', value: 0, percentage: 0 },
      ],
      waterBreakdown: [
        { stage: 'Ingredients', value: 0, percentage: 0 },
        { stage: 'Packaging', value: 0, percentage: 0 },
      ],
    };
  }

  const totalCO2e = refinedLCA.perUnit.co2e_kg;
  const totalWater = refinedLCA.perUnit.water_liters;

  // Debug logging for breakdown components
  console.log('🔍 Transform Debug - Total CO2e:', totalCO2e);
  console.log('🔍 Transform Debug - Breakdown:', refinedLCA.breakdown);
  console.log('🔍 Transform Debug - endOfLifeWaste CO2e:', refinedLCA.breakdown.endOfLifeWaste?.co2e);
  console.log('🔍 Transform Debug - productionWaste CO2e:', refinedLCA.breakdown.productionWaste?.co2e);

  const carbonBreakdown = [
    {
      stage: 'Ingredients',
      value: refinedLCA.breakdown.ingredients.co2e,
      percentage: totalCO2e > 0 ? Math.round((refinedLCA.breakdown.ingredients.co2e / totalCO2e) * 100) : 0
    },
    {
      stage: 'Packaging',
      value: refinedLCA.breakdown.packaging.co2e,
      percentage: totalCO2e > 0 ? Math.round((refinedLCA.breakdown.packaging.co2e / totalCO2e) * 100) : 0
    },
    {
      stage: 'Facilities',
      value: refinedLCA.breakdown.facilities?.co2e || 0,
      percentage: totalCO2e > 0 ? Math.round(((refinedLCA.breakdown.facilities?.co2e || 0) / totalCO2e) * 100) : 0
    },
    // Add waste footprint components if they exist
    ...(refinedLCA.breakdown.productionWaste?.co2e > 0 ? [{
      stage: 'Production Waste',
      value: refinedLCA.breakdown.productionWaste.co2e,
      percentage: totalCO2e > 0 ? Math.round((refinedLCA.breakdown.productionWaste.co2e / totalCO2e) * 100) : 0
    }] : []),
    ...(refinedLCA.breakdown.endOfLifeWaste?.co2e > 0 ? [{
      stage: 'End-of-Life Waste',
      value: refinedLCA.breakdown.endOfLifeWaste.co2e,
      percentage: totalCO2e > 0 ? Math.round((refinedLCA.breakdown.endOfLifeWaste.co2e / totalCO2e) * 100) : 0
    }] : [])
  ];

  console.log('🔍 Transform Debug - Final carbonBreakdown:', carbonBreakdown);
  console.log('🔍 Transform Debug - carbonBreakdown length:', carbonBreakdown.length);

  return {
    carbonBreakdown,
    waterBreakdown: [
      {
        stage: 'Ingredients',
        value: refinedLCA.breakdown.ingredients.water,
        percentage: totalWater > 0 ? Math.round((refinedLCA.breakdown.ingredients.water / totalWater) * 100) : 0
      },
      {
        stage: 'Packaging',
        value: refinedLCA.breakdown.packaging.water,
        percentage: totalWater > 0 ? Math.round((refinedLCA.breakdown.packaging.water / totalWater) * 100) : 0
      },
    ],
    dilutionInfo: refinedLCA.breakdown.dilutionRecorded,
  };
}