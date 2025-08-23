import { logger } from '../config/logger';

/**
 * Pure LCA Calculation Core - IO-free calculation engine
 * Following ports-and-adapters pattern for maximum testability and performance
 */

// Core interfaces - no external dependencies
export interface EmissionFactors {
  // Scope 1 factors (kg CO2e per unit)
  natural_gas: { m3: number; kWh: number };
  heating_oil: { litres: number; kg: number };
  lpg: { litres: number; kg: number };
  petrol: { litres: number };
  diesel: { litres: number };
  
  // Materials (kg CO2e per kg)
  glass: number;
  aluminum: number;
  plastic: number;
  steel: number;
  ceramic: number;
  cardboard: number;
  paper: number;
  cork: number;
  
  // Transport (kg CO2e per ton-km)
  truck_transport: number;
  rail_transport: number;
  ship_transport: number;
  air_transport: number;
  multimodal_transport: number;
  
  // Energy (kg CO2e per kWh)
  electricity_grid: number;
  biomass: number;
  
  // Water treatment (kg CO2e per L)
  water_treatment: number;
  wastewater_treatment: number;
  
  // Waste (kg CO2e per kg)
  landfill: number;
  incineration: number;
  recycling_benefit: number;
}

export interface WaterFactors {
  agriculture: {
    conventional: number;
    organic: number;
    biodynamic: number;
    regenerative: number;
  };
  processing: {
    fermentation: number;
    distillation: number;
    bottling: number;
  };
  materials: {
    glass: number;
    aluminum: number;
    plastic: number;
    steel: number;
    ceramic: number;
    paper: number;
  };
}

export interface LCAInputs {
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

export interface LCACalculationResult {
  totalCarbonFootprint: number;
  totalWaterFootprint: number;
  totalLandUse?: number;
  primaryEnergyDemand?: number;
  
  breakdown: {
    agriculture: number;
    inboundTransport: number;
    processing: number;
    packaging: number;
    distribution: number;
    endOfLife: number;
  };
  
  impactsByCategory: Array<{
    category: string;
    impact: number;
    unit: string;
  }>;
  
  water_footprint: {
    total_liters: number;
    agricultural_water: number;
    processing_water: number;
  };
  
  waste_output: {
    total_kg: number;
    recyclable_kg: number;
    hazardous_kg: number;
  };
  
  metadata: {
    calculationMethod: string;
    calculationDate: Date;
    dataQuality: 'high' | 'medium' | 'low';
    uncertaintyPercentage?: number;
    factorVersion: string;
    calculationDuration?: number;
  };
}

export interface CalculationOptions {
  method: 'simple' | 'enhanced';
  includeUncertainty?: boolean;
  allocationMethod?: 'mass' | 'economic' | 'volume';
  factorVersion?: string;
}

/**
 * Pure LCA Calculation Engine
 * No external dependencies, no IO operations
 */
export class LCACalculationCore {
  private readonly version = '2.0.0';
  
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

  private readonly waterFactors: WaterFactors = {
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

  /**
   * Main calculation method - pure function with no side effects
   */
  calculate(inputs: LCAInputs, options: CalculationOptions = { method: 'enhanced' }): LCACalculationResult {
    const startTime = Date.now();
    
    const breakdown = {
      agriculture: 0,
      inboundTransport: 0,
      processing: 0,
      packaging: 0,
      distribution: 0,
      endOfLife: 0
    };

    // Calculate each lifecycle stage
    if (inputs.agriculture) {
      breakdown.agriculture = this.calculateAgricultureImpact(inputs.agriculture, options);
    }

    if (inputs.inboundTransport) {
      breakdown.inboundTransport = this.calculateTransportImpact(inputs.inboundTransport, options);
    }

    if (inputs.processing) {
      breakdown.processing = this.calculateProcessingImpact(inputs.processing, options);
    }

    if (inputs.packagingDetailed) {
      breakdown.packaging = this.calculatePackagingImpact(inputs.packagingDetailed, options);
    }

    if (inputs.distribution) {
      breakdown.distribution = this.calculateDistributionImpact(inputs.distribution, options);
    }

    if (inputs.endOfLife) {
      breakdown.endOfLife = this.calculateEndOfLifeImpact(inputs.endOfLife, options);
    }

    const totalCarbonFootprint = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    const totalWaterFootprint = this.calculateWaterFootprint(inputs);
    const totalLandUse = this.calculateLandUse(inputs);
    const primaryEnergyDemand = this.calculatePrimaryEnergyDemand(inputs);

    const duration = Date.now() - startTime;

    return {
      totalCarbonFootprint,
      totalWaterFootprint,
      totalLandUse,
      primaryEnergyDemand,
      breakdown,
      impactsByCategory: this.generateImpactCategories(breakdown, totalWaterFootprint, totalLandUse),
      water_footprint: {
        total_liters: totalWaterFootprint,
        agricultural_water: totalWaterFootprint * 0.8,
        processing_water: totalWaterFootprint * 0.2,
      },
      waste_output: {
        total_kg: this.calculateWasteOutput(inputs),
        recyclable_kg: this.calculateRecyclableWaste(inputs),
        hazardous_kg: 0,
      },
      metadata: {
        calculationMethod: options.method,
        calculationDate: new Date(),
        dataQuality: options.method === 'enhanced' ? 'high' : 'medium',
        uncertaintyPercentage: options.includeUncertainty ? this.calculateUncertainty(breakdown) : undefined,
        factorVersion: 'DEFRA_2024',
        calculationDuration: duration,
      }
    };
  }

  /**
   * Get emission factor for specific data type and unit
   */
  getEmissionFactor(dataType: string, unit: string): number {
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
   * Get calculation version
   */
  getVersion(): string {
    return this.version;
  }

  /**
   * Get factor version
   */
  getFactorVersion(): string {
    return 'DEFRA_2024';
  }

  /**
   * Private calculation methods - pure functions
   */
  private calculateAgricultureImpact(agriculture: any, options: CalculationOptions): number {
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

  private calculateTransportImpact(transport: any, options: CalculationOptions): number {
    const { distanceKm = 0, mode = 'truck', loadFactor = 1.0 } = transport;
    const factor = this.emissionFactors[`${mode}_transport`] || this.emissionFactors.truck_transport;
    return (distanceKm * factor) / loadFactor;
  }

  private calculateProcessingImpact(processing: any, options: CalculationOptions): number {
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

  private calculatePackagingImpact(packaging: any, options: CalculationOptions): number {
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

  private calculateDistributionImpact(distribution: any, options: CalculationOptions): number {
    const { distanceKm = 0, transportMode = 'truck' } = distribution;
    const factor = this.emissionFactors[`${transportMode}_transport`] || this.emissionFactors.truck_transport;
    return distanceKm * factor;
  }

  private calculateEndOfLifeImpact(endOfLife: any, options: CalculationOptions): number {
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

  private calculateWaterFootprint(inputs: LCAInputs): number {
    let totalWater = 0;

    // Agriculture water
    if (inputs.agriculture) {
      const practice = inputs.agriculture.landUse?.farmingPractice || 'conventional';
      const waterPerKg = this.waterFactors.agriculture[practice] || this.waterFactors.agriculture.conventional;
      totalWater += (inputs.agriculture.yieldTonPerHectare || 1) * 1000 * waterPerKg;
    }

    // Processing water
    if (inputs.processing?.waterM3PerTonCrop) {
      totalWater += inputs.processing.waterM3PerTonCrop * 1000;
    }

    // Packaging water
    if (inputs.packagingDetailed?.container) {
      const { materialType = 'glass', weightGrams = 0 } = inputs.packagingDetailed.container;
      const waterFactor = this.waterFactors.materials[materialType as keyof typeof this.waterFactors.materials] || this.waterFactors.materials.glass;
      totalWater += (weightGrams / 1000) * waterFactor;
    }

    return totalWater;
  }

  private calculateLandUse(inputs: LCAInputs): number {
    if (inputs.agriculture?.yieldTonPerHectare) {
      return 1 / inputs.agriculture.yieldTonPerHectare;
    }
    return 0;
  }

  private calculatePrimaryEnergyDemand(inputs: LCAInputs): number {
    return (inputs.processing?.electricityKwhPerTonCrop || 0) * 2.5; // Primary energy factor
  }

  private calculateWasteOutput(inputs: LCAInputs): number {
    return (inputs.packagingDetailed?.container?.weightGrams || 0) / 1000;
  }

  private calculateRecyclableWaste(inputs: LCAInputs): number {
    const totalWaste = this.calculateWasteOutput(inputs);
    return totalWaste * (inputs.endOfLife?.recyclingRate || 0.6);
  }

  private generateImpactCategories(breakdown: any, waterFootprint: number, landUse: number): Array<{
    category: string;
    impact: number;
    unit: string;
  }> {
    const totalCarbon = Object.values(breakdown).reduce((sum: number, val: any) => sum + val, 0);
    
    return [
      { category: 'Climate Change', impact: totalCarbon, unit: 'kg CO2e' },
      { category: 'Water Scarcity', impact: waterFootprint, unit: 'L eq' },
      { category: 'Land Use', impact: landUse, unit: 'm²·year' }
    ];
  }

  private calculateUncertainty(breakdown: any): number {
    // Simple uncertainty calculation based on data completeness
    const nonZeroValues = Object.values(breakdown).filter((val: any) => val > 0).length;
    const totalStages = Object.keys(breakdown).length;
    const completeness = nonZeroValues / totalStages;
    
    // Higher completeness = lower uncertainty
    return Math.round((1 - completeness) * 30 + 10); // 10-40% uncertainty range
  }
}

export default LCACalculationCore;