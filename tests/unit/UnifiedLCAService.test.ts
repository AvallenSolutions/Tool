import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UnifiedLCAService, unifiedLCAService } from '../../server/services/UnifiedLCAService';
import type { LCADataInputs, LCACalculationOptions } from '../../server/services/UnifiedLCAService';

// Mock external dependencies
vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}));

vi.mock('../../server/config/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../server/storage', () => ({
  storage: {
    getProductById: vi.fn().mockResolvedValue({
      id: 1,
      name: 'Test Product',
      companyId: 1,
    }),
  },
}));

describe('UnifiedLCAService', () => {
  let service: UnifiedLCAService;
  
  const mockProductData = {
    id: 1,
    name: 'Test Beverage',
    sku: 'TB-001',
    volume: '750ml',
    type: 'spirits',
    companyId: 1,
  };

  const mockLCAData: LCADataInputs = {
    agriculture: {
      mainCropType: 'grain',
      yieldTonPerHectare: 5.0,
      dieselLPerHectare: 100,
      fertilizer: {
        nitrogenKgPerHectare: 120,
        phosphorusKgPerHectare: 30,
        potassiumKgPerHectare: 40,
        organicFertilizerTonPerHectare: 2,
      },
      landUse: {
        farmingPractice: 'organic',
        biodiversityIndex: 0.8,
        soilQualityIndex: 0.9,
      },
    },
    inboundTransport: {
      distanceKm: 500,
      mode: 'truck',
      fuelEfficiencyLper100km: 35,
      loadFactor: 0.8,
      refrigerationRequired: false,
    },
    processing: {
      waterM3PerTonCrop: 10,
      electricityKwhPerTonCrop: 500,
      lpgKgPerLAlcohol: 2.5,
      netWaterUseLPerBottle: 5,
      fermentation: {
        fermentationTime: 7,
        temperatureControl: true,
        yeastType: 'commercial',
        sugarAddedKg: 50,
      },
      distillation: {
        distillationRounds: 2,
        energySourceType: 'gas',
        heatRecoverySystem: true,
        copperUsageKg: 0.1,
      },
    },
    packagingDetailed: {
      container: {
        materialType: 'glass',
        weightGrams: 480,
        recycledContentPercentage: 20,
        manufacturingLocation: 'UK',
        transportDistanceKm: 200,
      },
      label: {
        materialType: 'paper',
        weightGrams: 5,
        inkType: 'eco_friendly',
        adhesiveType: 'water_based',
      },
      closure: {
        materialType: 'cork',
        weightGrams: 8,
        hasLiner: false,
      },
    },
    distribution: {
      transportMode: 'truck',
      distanceKm: 300,
      refrigerationRequired: false,
      warehouseStorageDays: 30,
    },
    endOfLife: {
      recyclingRate: 0.7,
      landfillRate: 0.2,
      incinerationRate: 0.1,
      reusabilityFactor: 0.1,
    },
  };

  beforeEach(() => {
    service = UnifiedLCAService.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = UnifiedLCAService.getInstance();
      const instance2 = UnifiedLCAService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return the same instance as the exported singleton', () => {
      const instance = UnifiedLCAService.getInstance();
      expect(instance).toBe(unifiedLCAService);
    });
  });

  describe('calculateLCA', () => {
    it('should perform simple LCA calculation', async () => {
      const options: LCACalculationOptions = { method: 'simple' };
      const result = await service.calculateLCA(mockProductData, mockLCAData, options);

      expect(result).toHaveProperty('totalCarbonFootprint');
      expect(result).toHaveProperty('totalWaterFootprint');
      expect(result).toHaveProperty('breakdown');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata.calculationMethod).toBe('simple');
      expect(result.totalCarbonFootprint).toBeGreaterThan(0);
    });

    it('should perform enhanced LCA calculation', async () => {
      const options: LCACalculationOptions = { method: 'enhanced' };
      const result = await service.calculateLCA(mockProductData, mockLCAData, options);

      expect(result).toHaveProperty('totalCarbonFootprint');
      expect(result).toHaveProperty('totalWaterFootprint');
      expect(result).toHaveProperty('totalLandUse');
      expect(result).toHaveProperty('primaryEnergyDemand');
      expect(result.metadata.calculationMethod).toBe('enhanced');
      expect(result.metadata.dataQuality).toBe('high');
      expect(result.impactsByCategory).toHaveLength(3); // Climate, Water, Land
    });

    it('should perform hybrid LCA calculation with fallback', async () => {
      const options: LCACalculationOptions = { method: 'hybrid' };
      const result = await service.calculateLCA(mockProductData, mockLCAData, options);

      expect(result).toHaveProperty('totalCarbonFootprint');
      expect(result).toHaveProperty('totalWaterFootprint');
      expect(result.totalCarbonFootprint).toBeGreaterThan(0);
    });

    it('should handle OpenLCA fallback to enhanced calculation', async () => {
      const options: LCACalculationOptions = { method: 'openlca' };
      const result = await service.calculateLCA(mockProductData, mockLCAData, options);

      // Should fallback to enhanced since OpenLCA is mocked to fail
      expect(result).toHaveProperty('totalCarbonFootprint');
      expect(result.totalCarbonFootprint).toBeGreaterThan(0);
    });

    it('should throw error for unsupported calculation method', async () => {
      const options: LCACalculationOptions = { method: 'unsupported' as any };
      
      await expect(service.calculateLCA(mockProductData, mockLCAData, options))
        .rejects.toThrow();
    });

    it('should include calculation duration in metadata', async () => {
      const options: LCACalculationOptions = { method: 'simple' };
      const result = await service.calculateLCA(mockProductData, mockLCAData, options);

      expect(result.metadata.calculationDuration).toBeDefined();
      expect(result.metadata.calculationDuration).toBeGreaterThan(0);
    });
  });

  describe('Calculation Breakdown', () => {
    it('should calculate agriculture impact correctly', async () => {
      const options: LCACalculationOptions = { method: 'enhanced' };
      const result = await service.calculateLCA(mockProductData, mockLCAData, options);

      expect(result.breakdown.agriculture).toBeGreaterThan(0);
      expect(result.breakdown.inboundTransport).toBeGreaterThan(0);
      expect(result.breakdown.processing).toBeGreaterThan(0);
      expect(result.breakdown.packaging).toBeGreaterThan(0);
      expect(result.breakdown.distribution).toBeGreaterThan(0);
    });

    it('should calculate water footprint breakdown', async () => {
      const options: LCACalculationOptions = { method: 'enhanced' };
      const result = await service.calculateLCA(mockProductData, mockLCAData, options);

      expect(result.water_footprint.total_liters).toBeGreaterThan(0);
      expect(result.water_footprint.agricultural_water).toBeGreaterThan(0);
      expect(result.water_footprint.processing_water).toBeGreaterThan(0);
    });

    it('should handle missing data gracefully', async () => {
      const partialLCAData: LCADataInputs = {
        agriculture: {
          mainCropType: 'grain',
          dieselLPerHectare: 50,
        },
      };

      const options: LCACalculationOptions = { method: 'simple' };
      const result = await service.calculateLCA(mockProductData, partialLCAData, options);

      expect(result.totalCarbonFootprint).toBeGreaterThan(0);
      expect(result.breakdown.agriculture).toBeGreaterThan(0);
      expect(result.breakdown.processing).toBe(0);
      expect(result.breakdown.packaging).toBe(0);
    });
  });

  describe('Emission Factors', () => {
    it('should return correct emission factors for known data types', () => {
      expect(service.getEmissionsFactor('natural_gas', 'm3')).toBe(2.044);
      expect(service.getEmissionsFactor('diesel', 'litres')).toBe(2.51);
      expect(service.getEmissionsFactor('electricity', 'kWh')).toBe(0.435);
    });

    it('should return zero for unknown data types', () => {
      expect(service.getEmissionsFactor('unknown_fuel', 'litres')).toBe(0);
      expect(service.getEmissionsFactor('diesel', 'unknown_unit')).toBe(0);
    });
  });

  describe('Database Integration', () => {
    it('should fetch available ingredients from database', async () => {
      const { db } = await import('../../server/db');
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue([
            { materialName: 'wheat', unit: 'kg' },
            { materialName: 'barley', unit: 'kg' },
          ]),
        }),
      });

      const ingredients = await service.getAvailableIngredients();
      expect(ingredients).toHaveLength(2);
      expect(ingredients[0]).toHaveProperty('materialName');
      expect(ingredients[0]).toHaveProperty('unit');
    });

    it('should handle database errors gracefully', async () => {
      const { db } = await import('../../server/db');
      (db.select as any).mockImplementation(() => {
        throw new Error('Database connection error');
      });

      const ingredients = await service.getAvailableIngredients();
      expect(ingredients).toEqual([]);
    });

    it('should fetch GWP factors from database', async () => {
      const { db } = await import('../../server/db');
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ gwp100yrAr5: 25 }]),
          }),
        }),
      });

      const gwpFactor = await service.getGWPFactor('CH4');
      expect(gwpFactor).toBe(25);
    });

    it('should return null for unknown GWP factors', async () => {
      const { db } = await import('../../server/db');
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const gwpFactor = await service.getGWPFactor('UNKNOWN_GAS');
      expect(gwpFactor).toBeNull();
    });
  });

  describe('Legacy Compatibility', () => {
    it('should support legacy calculateEnhancedLCALegacy method', async () => {
      const result = await service.calculateEnhancedLCALegacy(mockProductData, mockLCAData, 1000);
      
      expect(result).toHaveProperty('totalCarbonFootprint');
      expect(result).toHaveProperty('calculatedBreakdown');
      expect(Array.isArray(result.calculatedBreakdown)).toBe(true);
      
      result.calculatedBreakdown.forEach((breakdown: any) => {
        expect(breakdown).toHaveProperty('stage');
        expect(breakdown).toHaveProperty('contribution');
        expect(breakdown).toHaveProperty('percentage');
      });
    });

    it('should support SimpleLcaService compatibility', async () => {
      const { SimpleLcaService } = await import('../../server/services/UnifiedLCAService');
      const result = await SimpleLcaService.calculateLCA(mockProductData, mockLCAData);
      
      expect(result).toHaveProperty('totalCarbonFootprint');
      expect(result.metadata.calculationMethod).toBe('simple');
    });

    it('should support EnhancedLCACalculationService compatibility', async () => {
      const { EnhancedLCACalculationService } = await import('../../server/services/UnifiedLCAService');
      const result = await EnhancedLCACalculationService.calculateEnhancedLCA(mockProductData, mockLCAData, 1000);
      
      expect(result).toHaveProperty('totalCarbonFootprint');
      expect(result).toHaveProperty('calculatedBreakdown');
    });

    it('should support OpenLCAService compatibility', async () => {
      const { OpenLCAService } = await import('../../server/services/UnifiedLCAService');
      
      const ingredients = await OpenLCAService.getAvailableIngredients();
      expect(Array.isArray(ingredients)).toBe(true);
      
      const gwpFactor = await OpenLCAService.getGWPFactor('CO2');
      expect(gwpFactor).toBeNull(); // Returns null due to mocked empty database
    });
  });

  describe('Farming Practice Adjustments', () => {
    it('should apply correct multipliers for different farming practices', async () => {
      const organicData = { ...mockLCAData };
      organicData.agriculture!.landUse!.farmingPractice = 'organic';
      
      const regenerativeData = { ...mockLCAData };
      regenerativeData.agriculture!.landUse!.farmingPractice = 'regenerative';

      const organicResult = await service.calculateLCA(mockProductData, organicData, { method: 'enhanced' });
      const regenerativeResult = await service.calculateLCA(mockProductData, regenerativeData, { method: 'enhanced' });

      // Regenerative should have lower emissions than organic
      expect(regenerativeResult.breakdown.agriculture).toBeLessThan(organicResult.breakdown.agriculture);
    });
  });

  describe('Error Handling', () => {
    it('should handle calculation errors gracefully', async () => {
      const invalidData = { ...mockLCAData };
      invalidData.agriculture = undefined as any;

      const options: LCACalculationOptions = { method: 'simple' };
      const result = await service.calculateLCA(mockProductData, invalidData, options);

      expect(result).toHaveProperty('totalCarbonFootprint');
      expect(result.breakdown.agriculture).toBe(0);
    });
  });
});