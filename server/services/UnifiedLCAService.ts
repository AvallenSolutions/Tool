import { db } from '../db';
import { logger } from '../config/logger';
import { storage as dbStorage } from '../storage';
import { lcaProcessMappings, gwpFactors } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Unified interfaces for all LCA operations
export interface LCACalculationOptions {
  method: 'simple' | 'enhanced' | 'openlca' | 'hybrid';
  includeUncertainty?: boolean;
  allocationMethod?: 'mass' | 'economic' | 'volume';
  impactCategories?: string[];
  useCache?: boolean;
}

export interface LCADataInputs {
  agriculture?: {
    mainCropType?: string;
    yieldTonPerHectare?: number;
    dieselLPerHectare?: number;
    sequestrationTonCo2PerTonCrop?: number;
    fertilizer?: {
      nitrogenKgPerHectare?: number;
      phosphorusKgPerHectare?: number;
      potassiumKgPerHectare?: number;
      organicFertilizerTonPerHectare?: number;
    };
    landUse?: {
      farmingPractice?: 'conventional' | 'organic' | 'biodynamic' | 'regenerative';
      biodiversityIndex?: number;
      soilQualityIndex?: number;
    };
  };
  inboundTransport?: {
    distanceKm?: number;
    mode?: 'truck' | 'rail' | 'ship' | 'air' | 'multimodal';
    fuelEfficiencyLper100km?: number;
    loadFactor?: number;
    refrigerationRequired?: boolean;
  };
  processing?: {
    waterM3PerTonCrop?: number;
    electricityKwhPerTonCrop?: number;
    lpgKgPerLAlcohol?: number;
    netWaterUseLPerBottle?: number;
    angelsSharePercentage?: number;
    fermentation?: any;
    distillation?: any;
    maturation?: any;
  };
  packagingDetailed?: {
    container: {
      materialType?: string;
      weightGrams?: number;
      recycledContentPercentage?: number;
      manufacturingLocation?: string;
      transportDistanceKm?: number;
    };
    label?: any;
    closure?: any;
    secondaryPackaging?: any;
  };
  distribution?: {
    transportMode?: string;
    distanceKm?: number;
    refrigerationRequired?: boolean;
    warehouseStorageDays?: number;
  };
  endOfLife?: {
    recyclingRate?: number;
    landfillRate?: number;
    incinerationRate?: number;
    reusabilityFactor?: number;
  };
}

export interface UnifiedLCAResults {
  // Core metrics
  totalCarbonFootprint: number;
  totalWaterFootprint: number;
  totalLandUse?: number;
  primaryEnergyDemand?: number;
  
  // Detailed breakdown
  breakdown: {
    agriculture: number;
    inboundTransport: number;
    processing: number;
    packaging: number;
    distribution: number;
    endOfLife: number;
  };
  
  // GHG breakdown
  ghg_breakdown?: Array<{
    gas_name: string;
    mass_kg: number;
    gwp_factor: number;
    co2e: number;
  }>;
  
  // Impact categories
  impactsByCategory: Array<{
    category: string;
    impact: number;
    unit: string;
  }>;
  
  // Water breakdown
  water_footprint: {
    total_liters: number;
    agricultural_water: number;
    processing_water: number;
  };
  
  // Waste analysis
  waste_output: {
    total_kg: number;
    recyclable_kg: number;
    hazardous_kg: number;
  };
  
  // Metadata
  metadata: {
    calculationMethod: string;
    calculationDate: Date;
    dataQuality: 'high' | 'medium' | 'low';
    uncertaintyPercentage?: number;
    systemId?: string;
    systemName?: string;
    openLCAVersion?: string;
    databaseVersion?: string;
    calculationDuration?: number;
  };
}

export interface EmissionFactors {
  // Scope 1 factors (kg CO2e per unit) - DEFRA 2024
  natural_gas: { m3: number; kWh: number };
  heating_oil: { litres: number; kg: number };
  lpg: { litres: number; kg: number };
  petrol: { litres: number };
  diesel: { litres: number };
  
  // Materials
  glass: number;
  aluminum: number;
  plastic: number;
  steel: number;
  ceramic: number;
  cardboard: number;
  paper: number;
  cork: number;
  
  // Transport
  truck_transport: number;
  rail_transport: number;
  ship_transport: number;
  air_transport: number;
  multimodal_transport: number;
  
  // Energy
  electricity_grid: number;
  biomass: number;
  
  // Water treatment
  water_treatment: number;
  wastewater_treatment: number;
  
  // Waste
  landfill: number;
  incineration: number;
  recycling_benefit: number;
}

/**
 * Unified LCA Service - Consolidates all LCA calculation functionality
 * Supports multiple calculation methods and seamless fallbacks
 */
export class UnifiedLCAService {
  private static instance: UnifiedLCAService;
  
  // DEFRA 2024 verified emission factors
  private readonly emissionFactors: EmissionFactors = {
    // Scope 1 factors
    natural_gas: { m3: 2.044, kWh: 0.18315 },
    heating_oil: { litres: 2.52, kg: 3.15 },
    lpg: { litres: 1.51, kg: 2.983 },
    petrol: { litres: 2.18 },
    diesel: { litres: 2.51 },
    
    // Materials (kg CO2e per kg)
    glass: 0.7,
    aluminum: 8.2,
    plastic: 2.3,
    steel: 1.8,
    ceramic: 1.2,
    cardboard: 0.7,
    paper: 1.1,
    cork: 0.3,
    
    // Transport (kg CO2e per ton-km)
    truck_transport: 0.105,
    rail_transport: 0.030,
    ship_transport: 0.015,
    air_transport: 0.602,
    multimodal_transport: 0.065,
    
    // Energy (kg CO2e per kWh)
    electricity_grid: 0.435, // EU average
    biomass: 0.04,
    
    // Water treatment (kg CO2e per L)
    water_treatment: 0.001,
    wastewater_treatment: 0.002,
    
    // Waste (kg CO2e per kg)
    landfill: 0.5,
    incineration: 0.4,
    recycling_benefit: -0.3,
  };

  // Water consumption factors (L per unit)
  private readonly waterFactors = {
    agriculture: {
      conventional: 25,
      organic: 20,
      biodynamic: 18,
      regenerative: 15,
    },
    processing: {
      fermentation: 3,
      distillation: 8,
      bottling: 2,
    },
    materials: {
      glass: 2.5,
      aluminum: 15,
      plastic: 8,
      steel: 12,
      ceramic: 6,
      paper: 25,
    }
  };

  constructor() {
    logger.info({}, 'UnifiedLCAService initialized');
  }

  static getInstance(): UnifiedLCAService {
    if (!UnifiedLCAService.instance) {
      UnifiedLCAService.instance = new UnifiedLCAService();
    }
    return UnifiedLCAService.instance;
  }

  /**
   * Main entry point for all LCA calculations
   * Factory method that routes to appropriate calculation strategy
   */
  async calculateLCA(
    productData: any,
    lcaData: LCADataInputs,
    options: LCACalculationOptions = { method: 'hybrid' }
  ): Promise<UnifiedLCAResults> {
    const startTime = Date.now();
    
    try {
      logger.info({ 
        method: options.method,
        productId: productData?.id,
        productName: productData?.name 
      }, 'LCA calculation started');

      let results: UnifiedLCAResults;

      switch (options.method) {
        case 'simple':
          results = await this.calculateSimpleLCA(productData, lcaData, options);
          break;
        case 'enhanced':
          results = await this.calculateEnhancedLCA(productData, lcaData, options);
          break;
        case 'openlca':
          results = await this.calculateOpenLCA(productData, lcaData, options);
          break;
        case 'hybrid':
        default:
          results = await this.calculateHybridLCA(productData, lcaData, options);
          break;
      }

      const duration = Date.now() - startTime;
      results.metadata.calculationDuration = duration;

      logger.info({ 
        method: options.method,
        duration,
        totalCarbonFootprint: results.totalCarbonFootprint
      }, 'LCA calculation completed');

      return results;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({ 
        error, 
        method: options.method,
        duration
      }, 'LCA calculation failed');
      throw error;
    }
  }

  /**
   * Simple LCA calculation - fast, basic emission factors
   */
  private async calculateSimpleLCA(
    productData: any,
    lcaData: LCADataInputs,
    options: LCACalculationOptions
  ): Promise<UnifiedLCAResults> {
    const breakdown = {
      agriculture: 0,
      inboundTransport: 0,
      processing: 0,
      packaging: 0,
      distribution: 0,
      endOfLife: 0
    };

    // Agriculture
    if (lcaData.agriculture) {
      const { dieselLPerHectare = 0, fertilizer = {} } = lcaData.agriculture;
      breakdown.agriculture = 
        dieselLPerHectare * this.emissionFactors.diesel +
        (fertilizer.nitrogenKgPerHectare || 0) * 5.6 +
        (fertilizer.phosphorusKgPerHectare || 0) * 1.2 +
        (fertilizer.potassiumKgPerHectare || 0) * 0.65;
    }

    // Transport
    if (lcaData.inboundTransport) {
      const { distanceKm = 0, mode = 'truck' } = lcaData.inboundTransport;
      const factor = this.emissionFactors[`${mode}_transport`] || this.emissionFactors.truck_transport;
      breakdown.inboundTransport = distanceKm * factor;
    }

    // Processing
    if (lcaData.processing) {
      const { electricityKwhPerTonCrop = 0, lpgKgPerLAlcohol = 0 } = lcaData.processing;
      breakdown.processing = 
        electricityKwhPerTonCrop * this.emissionFactors.electricity_grid +
        lpgKgPerLAlcohol * this.emissionFactors.lpg.kg;
    }

    // Packaging
    if (lcaData.packagingDetailed?.container) {
      const { materialType = 'glass', weightGrams = 0 } = lcaData.packagingDetailed.container;
      const materialFactor = this.emissionFactors[materialType as keyof EmissionFactors] || this.emissionFactors.glass;
      breakdown.packaging = (weightGrams / 1000) * (materialFactor as number);
    }

    const totalCarbonFootprint = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    const totalWaterFootprint = this.calculateWaterFootprint(lcaData);

    return {
      totalCarbonFootprint,
      totalWaterFootprint,
      breakdown,
      impactsByCategory: [
        { category: 'Climate Change', impact: totalCarbonFootprint, unit: 'kg CO2e' }
      ],
      water_footprint: {
        total_liters: totalWaterFootprint,
        agricultural_water: totalWaterFootprint * 0.7,
        processing_water: totalWaterFootprint * 0.3,
      },
      waste_output: {
        total_kg: 0,
        recyclable_kg: 0,
        hazardous_kg: 0,
      },
      metadata: {
        calculationMethod: 'simple',
        calculationDate: new Date(),
        dataQuality: 'medium',
        uncertaintyPercentage: 20,
      }
    };
  }

  /**
   * Enhanced LCA calculation - detailed emission factors and impact categories
   */
  private async calculateEnhancedLCA(
    productData: any,
    lcaData: LCADataInputs,
    options: LCACalculationOptions
  ): Promise<UnifiedLCAResults> {
    // Use the logic from EnhancedLCACalculationService but unified
    const breakdown = {
      agriculture: 0,
      inboundTransport: 0,
      processing: 0,
      packaging: 0,
      distribution: 0,
      endOfLife: 0
    };

    // Enhanced agriculture calculation
    if (lcaData.agriculture) {
      breakdown.agriculture = await this.calculateAgricultureImpact(lcaData.agriculture);
    }

    // Enhanced transport calculation
    if (lcaData.inboundTransport) {
      breakdown.inboundTransport = this.calculateTransportImpact(lcaData.inboundTransport);
    }

    // Enhanced processing calculation
    if (lcaData.processing) {
      breakdown.processing = this.calculateProcessingImpact(lcaData.processing);
    }

    // Enhanced packaging calculation
    if (lcaData.packagingDetailed) {
      breakdown.packaging = this.calculatePackagingImpact(lcaData.packagingDetailed);
    }

    // Distribution and end-of-life
    if (lcaData.distribution) {
      breakdown.distribution = this.calculateDistributionImpact(lcaData.distribution);
    }

    if (lcaData.endOfLife) {
      breakdown.endOfLife = this.calculateEndOfLifeImpact(lcaData.endOfLife);
    }

    const totalCarbonFootprint = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    const totalWaterFootprint = this.calculateWaterFootprint(lcaData);

    return {
      totalCarbonFootprint,
      totalWaterFootprint,
      totalLandUse: lcaData.agriculture?.yieldTonPerHectare ? 1 / lcaData.agriculture.yieldTonPerHectare : 0,
      primaryEnergyDemand: (lcaData.processing?.electricityKwhPerTonCrop || 0) * 2.5,
      breakdown,
      impactsByCategory: [
        { category: 'Climate Change', impact: totalCarbonFootprint, unit: 'kg CO2e' },
        { category: 'Water Scarcity', impact: totalWaterFootprint, unit: 'L eq' },
        { category: 'Land Use', impact: lcaData.agriculture?.yieldTonPerHectare ? 1 / lcaData.agriculture.yieldTonPerHectare : 0, unit: 'm²·year' }
      ],
      water_footprint: {
        total_liters: totalWaterFootprint,
        agricultural_water: totalWaterFootprint * 0.8,
        processing_water: totalWaterFootprint * 0.2,
      },
      waste_output: {
        total_kg: (lcaData.packagingDetailed?.container?.weightGrams || 0) / 1000,
        recyclable_kg: ((lcaData.packagingDetailed?.container?.weightGrams || 0) / 1000) * (lcaData.endOfLife?.recyclingRate || 0.6),
        hazardous_kg: 0,
      },
      metadata: {
        calculationMethod: 'enhanced',
        calculationDate: new Date(),
        dataQuality: 'high',
        uncertaintyPercentage: 15,
      }
    };
  }

  /**
   * OpenLCA calculation - full database integration
   */
  private async calculateOpenLCA(
    productData: any,
    lcaData: LCADataInputs,
    options: LCACalculationOptions
  ): Promise<UnifiedLCAResults> {
    try {
      // Attempt OpenLCA calculation
      const openLCAResults = await this.performOpenLCACalculation(productData, lcaData, options);
      return openLCAResults;
    } catch (error) {
      logger.warn({ error }, 'OpenLCA calculation failed, falling back to enhanced method');
      return this.calculateEnhancedLCA(productData, lcaData, options);
    }
  }

  /**
   * Hybrid calculation - tries OpenLCA, falls back gracefully
   */
  private async calculateHybridLCA(
    productData: any,
    lcaData: LCADataInputs,
    options: LCACalculationOptions
  ): Promise<UnifiedLCAResults> {
    try {
      // Try OpenLCA first for maximum accuracy
      return await this.calculateOpenLCA(productData, lcaData, options);
    } catch (openLCAError) {
      logger.warn({ error: openLCAError }, 'OpenLCA unavailable, using enhanced calculation');
      
      try {
        // Fall back to enhanced calculation
        return await this.calculateEnhancedLCA(productData, lcaData, options);
      } catch (enhancedError) {
        logger.warn({ error: enhancedError }, 'Enhanced calculation failed, using simple calculation');
        
        // Final fallback to simple calculation
        return await this.calculateSimpleLCA(productData, lcaData, options);
      }
    }
  }

  /**
   * Legacy compatibility methods
   */
  async calculateEnhancedLCALegacy(productData: any, lcaData: any, productionVolume: number = 1): Promise<any> {
    const results = await this.calculateLCA(productData, lcaData, { method: 'enhanced' });
    
    // Transform to legacy format
    return {
      ...results,
      calculatedBreakdown: Object.entries(results.breakdown).map(([stage, contribution]) => ({
        stage,
        contribution,
        percentage: (contribution / results.totalCarbonFootprint) * 100
      }))
    };
  }

  /**
   * Get emission factor for specific data type and unit
   */
  getEmissionsFactor(dataType: string, unit: string): number {
    const factors: Record<string, Record<string, number>> = {
      natural_gas: this.emissionFactors.natural_gas,
      heating_oil: this.emissionFactors.heating_oil,
      lpg: this.emissionFactors.lpg,
      petrol: { litres: this.emissionFactors.petrol },
      diesel: { litres: this.emissionFactors.diesel },
      electricity: { kWh: this.emissionFactors.electricity_grid },
      waste_landfill: { kg: this.emissionFactors.landfill },
      waste_recycling: { kg: this.emissionFactors.recycling_benefit },
    };
    
    return factors[dataType]?.[unit] || 0;
  }

  /**
   * Get available ingredients from process mapping database
   */
  async getAvailableIngredients(): Promise<{ materialName: string; unit: string }[]> {
    try {
      const ingredients = await db
        .select({
          materialName: lcaProcessMappings.materialName,
          unit: lcaProcessMappings.unit
        })
        .from(lcaProcessMappings)
        .where(eq(lcaProcessMappings.category, 'Agriculture'));
      
      return ingredients.map(ing => ({
        materialName: ing.materialName,
        unit: ing.unit || 'kg'
      }));
    } catch (error) {
      logger.error({ error }, 'Error fetching available ingredients');
      return [];
    }
  }

  /**
   * Get GWP factor for specific greenhouse gas
   */
  async getGWPFactor(gasFormula: string): Promise<number | null> {
    try {
      const gwpData = await db
        .select({ gwp100yrAr5: gwpFactors.gwp100yrAr5 })
        .from(gwpFactors)
        .where(eq(gwpFactors.gasFormula, gasFormula))
        .limit(1);
      
      return gwpData.length > 0 ? gwpData[0].gwp100yrAr5 : null;
    } catch (error) {
      logger.error({ error, gasFormula }, 'Error fetching GWP factor');
      return null;
    }
  }

  /**
   * Private helper methods
   */
  private async calculateAgricultureImpact(agriculture: any): Promise<number> {
    const {
      dieselLPerHectare = 0,
      fertilizer = {},
      landUse = {}
    } = agriculture;

    let impact = 0;
    
    // Fuel consumption
    impact += dieselLPerHectare * this.emissionFactors.diesel;
    
    // Fertilizer emissions
    impact += (fertilizer.nitrogenKgPerHectare || 0) * 5.6;
    impact += (fertilizer.phosphorusKgPerHectare || 0) * 1.2;
    impact += (fertilizer.potassiumKgPerHectare || 0) * 0.65;
    impact += (fertilizer.organicFertilizerTonPerHectare || 0) * 1000 * 0.1;

    // Land use adjustments
    const practiceMultiplier = {
      conventional: 1.0,
      organic: 0.85,
      biodynamic: 0.8,
      regenerative: 0.7
    }[landUse.farmingPractice] || 1.0;

    return impact * practiceMultiplier;
  }

  private calculateTransportImpact(transport: any): number {
    const { distanceKm = 0, mode = 'truck', loadFactor = 1.0 } = transport;
    const factor = this.emissionFactors[`${mode}_transport`] || this.emissionFactors.truck_transport;
    return (distanceKm * factor) / loadFactor;
  }

  private calculateProcessingImpact(processing: any): number {
    const {
      electricityKwhPerTonCrop = 0,
      lpgKgPerLAlcohol = 0,
      waterM3PerTonCrop = 0
    } = processing;

    return (
      electricityKwhPerTonCrop * this.emissionFactors.electricity_grid +
      lpgKgPerLAlcohol * this.emissionFactors.lpg.kg +
      waterM3PerTonCrop * 1000 * this.emissionFactors.water_treatment
    );
  }

  private calculatePackagingImpact(packaging: any): number {
    const { container = {}, label = {}, closure = {} } = packaging;
    
    let impact = 0;
    
    // Container
    if (container.materialType && container.weightGrams) {
      const materialFactor = this.emissionFactors[container.materialType as keyof EmissionFactors] || this.emissionFactors.glass;
      impact += (container.weightGrams / 1000) * (materialFactor as number);
    }

    // Label
    if (label.weightGrams) {
      impact += (label.weightGrams / 1000) * this.emissionFactors.paper;
    }

    // Closure
    if (closure.weightGrams) {
      const closureFactor = closure.materialType === 'cork' ? this.emissionFactors.cork : this.emissionFactors.plastic;
      impact += (closure.weightGrams / 1000) * closureFactor;
    }

    return impact;
  }

  private calculateDistributionImpact(distribution: any): number {
    const { distanceKm = 0, transportMode = 'truck' } = distribution;
    const factor = this.emissionFactors[`${transportMode}_transport`] || this.emissionFactors.truck_transport;
    return distanceKm * factor;
  }

  private calculateEndOfLifeImpact(endOfLife: any): number {
    const {
      recyclingRate = 0.6,
      landfillRate = 0.3,
      incinerationRate = 0.1
    } = endOfLife;

    // Assume 1kg waste
    return (
      recyclingRate * this.emissionFactors.recycling_benefit +
      landfillRate * this.emissionFactors.landfill +
      incinerationRate * this.emissionFactors.incineration
    );
  }

  private calculateWaterFootprint(lcaData: LCADataInputs): number {
    let totalWater = 0;

    // Agriculture water
    if (lcaData.agriculture) {
      const practice = lcaData.agriculture.landUse?.farmingPractice || 'conventional';
      const waterPerKg = this.waterFactors.agriculture[practice] || this.waterFactors.agriculture.conventional;
      totalWater += (lcaData.agriculture.yieldTonPerHectare || 1) * 1000 * waterPerKg;
    }

    // Processing water
    if (lcaData.processing?.waterM3PerTonCrop) {
      totalWater += lcaData.processing.waterM3PerTonCrop * 1000;
    }

    // Packaging water
    if (lcaData.packagingDetailed?.container) {
      const { materialType = 'glass', weightGrams = 0 } = lcaData.packagingDetailed.container;
      const waterFactor = this.waterFactors.materials[materialType as keyof typeof this.waterFactors.materials] || this.waterFactors.materials.glass;
      totalWater += (weightGrams / 1000) * waterFactor;
    }

    return totalWater;
  }

  private async performOpenLCACalculation(
    productData: any,
    lcaData: LCADataInputs,
    options: LCACalculationOptions
  ): Promise<UnifiedLCAResults> {
    // This would integrate with the actual OpenLCA system
    // For now, throw an error to simulate OpenLCA being unavailable
    throw new Error('OpenLCA integration not available in this environment');
  }
}

// Export singleton instance
export const unifiedLCAService = UnifiedLCAService.getInstance();

// Legacy exports for existing code compatibility
export class SimpleLcaService {
  static async calculateLCA(productData: any, lcaData: any): Promise<any> {
    return unifiedLCAService.calculateLCA(productData, lcaData, { method: 'simple' });
  }
}

export class EnhancedLCACalculationService {
  static async calculateEnhancedLCA(productData: any, lcaData: any, productionVolume: number = 1): Promise<any> {
    return unifiedLCAService.calculateEnhancedLCALegacy(productData, lcaData, productionVolume);
  }
}

export class OpenLCAService {
  static async getAvailableIngredients(): Promise<{ materialName: string; unit: string }[]> {
    return unifiedLCAService.getAvailableIngredients();
  }

  static async getGWPFactor(gasFormula: string): Promise<number | null> {
    return unifiedLCAService.getGWPFactor(gasFormula);
  }
}

export default UnifiedLCAService;