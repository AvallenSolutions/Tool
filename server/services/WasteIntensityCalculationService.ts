import { db } from '../db';
import { productionFacilities, regionalWasteStatistics } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export interface WasteIntensityData {
  // Production waste intensity (kg waste per unit production)
  productionWasteIntensity: number;
  totalFacilityWasteKgPerYear: number;
  totalFacilityProductionVolumePerYear: number;
  
  // Breakdown by waste type
  organicWasteIntensity: number;
  packagingWasteIntensity: number;
  hazardousWasteIntensity: number;
  generalWasteIntensity: number;
  
  // Disposal route breakdown (kg per unit production)
  wasteToLandfillIntensity: number;
  wasteToRecyclingIntensity: number;
  wasteToCompostingIntensity: number;
  wasteToIncinerationIntensity: number;
  wasteToEnergyRecoveryIntensity: number;
}

export interface ProductionWasteFootprint {
  // Carbon footprint from production waste (kg CO2e per unit)
  totalWasteCarbonFootprint: number;
  
  // Breakdown by disposal route (kg CO2e per unit)
  landfillEmissions: number;
  recyclingEmissions: number;
  compostingEmissions: number;
  incinerationEmissions: number;
  energyRecoveryEmissions: number;
  
  // Waste transport emissions (kg CO2e per unit)
  transportEmissions: number;
  
  // Methodology metadata
  country: string;
  facilityName: string;
  dataSource: string;
}

export interface EndOfLifeWasteData {
  // End-of-life waste footprint (kg CO2e per kg packaging)
  glassBottleEolFootprint: number;
  paperLabelEolFootprint: number;
  aluminumClosureEolFootprint: number;
  
  // Regional statistics used
  country: string;
  dataYear: number;
  recyclingRates: {
    glass: number;
    paper: number;
    aluminum: number;
  };
  disposalEmissions: {
    landfill: number;
    incineration: number;
    recycling: number;
  };
}

export class WasteIntensityCalculationService {
  
  /**
   * Calculate waste intensity factor for a facility
   * Formula: Total Facility Waste (kg/year) ÷ Total Production Volume (units/year) = Waste Intensity (kg/unit)
   */
  static async calculateWasteIntensity(facilityId: number): Promise<WasteIntensityData> {
    // Get facility waste data
    const [facility] = await db
      .select()
      .from(productionFacilities)
      .where(eq(productionFacilities.id, facilityId));
      
    if (!facility) {
      throw new Error(`Facility with ID ${facilityId} not found`);
    }
    
    // Calculate total facility waste and production volume
    const totalOrganicWaste = parseFloat(facility.totalOrganicWasteKgPerYear?.toString() || '0');
    const totalPackagingWaste = parseFloat(facility.totalPackagingWasteKgPerYear?.toString() || '0');
    const totalHazardousWaste = parseFloat(facility.totalHazardousWasteKgPerYear?.toString() || '0');
    const totalGeneralWaste = parseFloat(facility.totalGeneralWasteKgPerYear?.toString() || '0');
    
    const totalFacilityWasteKgPerYear = totalOrganicWaste + totalPackagingWaste + totalHazardousWaste + totalGeneralWaste;
    const totalFacilityProductionVolumePerYear = parseFloat(facility.annualCapacityVolume?.toString() || '0');
    
    if (totalFacilityProductionVolumePerYear === 0) {
      throw new Error('Facility annual production volume cannot be zero for waste intensity calculation');
    }
    
    // Calculate waste intensity (kg waste per unit production)
    const productionWasteIntensity = totalFacilityWasteKgPerYear / totalFacilityProductionVolumePerYear;
    
    // Calculate breakdown by waste type
    const organicWasteIntensity = totalOrganicWaste / totalFacilityProductionVolumePerYear;
    const packagingWasteIntensity = totalPackagingWaste / totalFacilityProductionVolumePerYear;
    const hazardousWasteIntensity = totalHazardousWaste / totalFacilityProductionVolumePerYear;
    const generalWasteIntensity = totalGeneralWaste / totalFacilityProductionVolumePerYear;
    
    // Calculate disposal route breakdown
    const wasteToLandfill = parseFloat(facility.wasteToLandfillKgPerYear?.toString() || '0');
    const wasteToRecycling = parseFloat(facility.wasteToRecyclingKgPerYear?.toString() || '0');
    const wasteToComposting = parseFloat(facility.wasteToCompostingKgPerYear?.toString() || '0');
    const wasteToIncineration = parseFloat(facility.wasteToIncinerationKgPerYear?.toString() || '0');
    const wasteToEnergyRecovery = parseFloat(facility.wasteToEnergyRecoveryKgPerYear?.toString() || '0');
    
    const wasteToLandfillIntensity = wasteToLandfill / totalFacilityProductionVolumePerYear;
    const wasteToRecyclingIntensity = wasteToRecycling / totalFacilityProductionVolumePerYear;
    const wasteToCompostingIntensity = wasteToComposting / totalFacilityProductionVolumePerYear;
    const wasteToIncinerationIntensity = wasteToIncineration / totalFacilityProductionVolumePerYear;
    const wasteToEnergyRecoveryIntensity = wasteToEnergyRecovery / totalFacilityProductionVolumePerYear;
    
    console.log(`📊 Waste intensity for facility ${facility.facilityName}: ${productionWasteIntensity.toFixed(4)} kg waste per unit`);
    console.log(`📊 Total facility waste: ${totalFacilityWasteKgPerYear} kg/year, Production: ${totalFacilityProductionVolumePerYear} units/year`);
    
    return {
      productionWasteIntensity,
      totalFacilityWasteKgPerYear,
      totalFacilityProductionVolumePerYear,
      organicWasteIntensity,
      packagingWasteIntensity,
      hazardousWasteIntensity,
      generalWasteIntensity,
      wasteToLandfillIntensity,
      wasteToRecyclingIntensity,
      wasteToCompostingIntensity,
      wasteToIncinerationIntensity,
      wasteToEnergyRecoveryIntensity,
    };
  }

  /**
   * PHASE 2: Calculate production waste footprint using facility disposal route data
   * Formula: Waste Amount × Disposal Route Emission Factor = Carbon Footprint
   */
  static async calculateProductionWasteFootprint(
    facilityId: number,
    country: string = 'United Kingdom'
  ): Promise<ProductionWasteFootprint> {
    
    // Get facility waste data
    const [facility] = await db
      .select()
      .from(productionFacilities)
      .where(eq(productionFacilities.id, facilityId));
      
    if (!facility) {
      throw new Error(`Facility with ID ${facilityId} not found`);
    }

    // Get regional emission factors
    const regionalStats = await db
      .select()
      .from(regionalWasteStatistics)
      .where(eq(regionalWasteStatistics.country, country))
      .orderBy(regionalWasteStatistics.dataYear)
      .limit(1);

    let emissionFactors = {
      landfill: 0.4892, // kg CO2e per kg waste (DEFRA 2024)
      recycling: 0.0892, // Processing emissions
      composting: 0.0156, // Composting emissions
      incineration: 0.3021, // Incineration with energy recovery
      energyRecovery: 0.3021, // Same as incineration with energy recovery
      transport: 0.0875, // kg CO2e per tonne-km
      avgTransportDistance: 42.5 // km average in UK
    };

    if (regionalStats.length > 0) {
      const stats = regionalStats[0];
      emissionFactors = {
        landfill: parseFloat(stats.landfillEmissionFactor?.toString() || '0.4892'),
        recycling: parseFloat(stats.recyclingProcessingFactor?.toString() || '0.0892'),
        composting: parseFloat(stats.compostingEmissionFactor?.toString() || '0.0156'),
        incineration: parseFloat(stats.incinerationEmissionFactor?.toString() || '0.3021'),
        energyRecovery: parseFloat(stats.incinerationEmissionFactor?.toString() || '0.3021'),
        transport: parseFloat(stats.wasteTransportEmissionFactor?.toString() || '0.0875'),
        avgTransportDistance: parseFloat(stats.averageTransportDistanceKm?.toString() || '42.5')
      };
    }

    // Get facility waste quantities per year
    const wasteToLandfill = parseFloat(facility.wasteToLandfillKgPerYear?.toString() || '0');
    const wasteToRecycling = parseFloat(facility.wasteToRecyclingKgPerYear?.toString() || '0');
    const wasteToComposting = parseFloat(facility.wasteToCompostingKgPerYear?.toString() || '0');
    const wasteToIncineration = parseFloat(facility.wasteToIncinerationKgPerYear?.toString() || '0');
    const wasteToEnergyRecovery = parseFloat(facility.wasteToEnergyRecoveryKgPerYear?.toString() || '0');
    
    const totalFacilityProductionVolumePerYear = parseFloat(facility.annualCapacityVolume?.toString() || '0');
    
    if (totalFacilityProductionVolumePerYear === 0) {
      throw new Error('Facility annual production volume cannot be zero for waste footprint calculation');
    }

    // Calculate carbon emissions by disposal route (kg CO2e per year)
    const landfillEmissionsPerYear = wasteToLandfill * emissionFactors.landfill;
    const recyclingEmissionsPerYear = wasteToRecycling * emissionFactors.recycling;
    const compostingEmissionsPerYear = wasteToComposting * emissionFactors.composting;
    const incinerationEmissionsPerYear = wasteToIncineration * emissionFactors.incineration;
    const energyRecoveryEmissionsPerYear = wasteToEnergyRecovery * emissionFactors.energyRecovery;

    // Calculate transport emissions (waste collection and transport to disposal facilities)
    const totalWasteKgPerYear = wasteToLandfill + wasteToRecycling + wasteToComposting + wasteToIncineration + wasteToEnergyRecovery;
    const totalWasteTonnesPerYear = totalWasteKgPerYear / 1000;
    const transportEmissionsPerYear = totalWasteTonnesPerYear * emissionFactors.avgTransportDistance * emissionFactors.transport;

    // Calculate total waste carbon footprint per year
    const totalWasteCarbonFootprintPerYear = landfillEmissionsPerYear + recyclingEmissionsPerYear + 
                                           compostingEmissionsPerYear + incinerationEmissionsPerYear + 
                                           energyRecoveryEmissionsPerYear + transportEmissionsPerYear;

    // Convert to per-unit emissions (kg CO2e per unit produced)
    const totalWasteCarbonFootprint = totalWasteCarbonFootprintPerYear / totalFacilityProductionVolumePerYear;
    const landfillEmissions = landfillEmissionsPerYear / totalFacilityProductionVolumePerYear;
    const recyclingEmissions = recyclingEmissionsPerYear / totalFacilityProductionVolumePerYear;
    const compostingEmissions = compostingEmissionsPerYear / totalFacilityProductionVolumePerYear;
    const incinerationEmissions = incinerationEmissionsPerYear / totalFacilityProductionVolumePerYear;
    const energyRecoveryEmissions = energyRecoveryEmissionsPerYear / totalFacilityProductionVolumePerYear;
    const transportEmissions = transportEmissionsPerYear / totalFacilityProductionVolumePerYear;

    console.log(`🗑️ Production waste footprint for ${facility.facilityName}:`);
    console.log(`   Total: ${totalWasteCarbonFootprint.toFixed(6)} kg CO2e per unit`);
    console.log(`   Landfill: ${landfillEmissions.toFixed(6)} kg CO2e/unit (${wasteToLandfill}kg/year)`);
    console.log(`   Recycling: ${recyclingEmissions.toFixed(6)} kg CO2e/unit (${wasteToRecycling}kg/year)`);
    console.log(`   Composting: ${compostingEmissions.toFixed(6)} kg CO2e/unit (${wasteToComposting}kg/year)`);
    console.log(`   Transport: ${transportEmissions.toFixed(6)} kg CO2e/unit`);

    return {
      totalWasteCarbonFootprint,
      landfillEmissions,
      recyclingEmissions,
      compostingEmissions,
      incinerationEmissions,
      energyRecoveryEmissions,
      transportEmissions,
      country,
      facilityName: facility.facilityName || 'Unknown Facility',
      dataSource: regionalStats.length > 0 ? (regionalStats[0].dataSource || 'Regional Statistics') : 'DEFRA 2024 Default Factors'
    };
  }
  
  /**
   * Calculate end-of-life waste footprint using cut-off approach (no recycling credits)
   * Based on regional recycling rates and disposal emission factors
   */
  static async calculateEndOfLifeWasteFootprint(
    country: string,
    packagingMaterials: {
      glassWeightKg: number;
      paperWeightKg: number;
      aluminumWeightKg: number;
    }
  ): Promise<EndOfLifeWasteData> {
    
    // Get regional waste statistics (latest available year)
    const regionalStats = await db
      .select()
      .from(regionalWasteStatistics)
      .where(eq(regionalWasteStatistics.country, country))
      .orderBy(regionalWasteStatistics.dataYear)
      .limit(1);
      
    if (regionalStats.length === 0) {
      // Fallback to global average if country-specific data not available
      console.log(`⚠️ No regional waste statistics found for ${country}, using global averages`);
      return this.calculateEndOfLifeWithGlobalAverages(packagingMaterials);
    }
    
    const stats = regionalStats[0];
    
    // Get recycling rates and disposal emissions
    const glassRecyclingRate = parseFloat(stats.glassRecyclingRate?.toString() || '75') / 100; // Default 75%
    const paperRecyclingRate = parseFloat(stats.paperRecyclingRate?.toString() || '70') / 100; // Default 70%
    const aluminumRecyclingRate = parseFloat(stats.aluminumRecyclingRate?.toString() || '85') / 100; // Default 85%
    
    const landfillEmissionFactor = parseFloat(stats.landfillEmissionFactor?.toString() || '0.5'); // kg CO2e per kg waste
    const incinerationEmissionFactor = parseFloat(stats.incinerationEmissionFactor?.toString() || '0.4');
    const recyclingProcessingFactor = parseFloat(stats.recyclingProcessingFactor?.toString() || '0.1');
    
    // Calculate end-of-life footprint using cut-off approach (no recycling credits)
    const glassBottleEolFootprint = this.calculateMaterialEolFootprint(
      packagingMaterials.glassWeightKg,
      glassRecyclingRate,
      landfillEmissionFactor,
      incinerationEmissionFactor,
      recyclingProcessingFactor,
      parseFloat(stats.landfillRate?.toString() || '25') / 100,
      parseFloat(stats.incinerationRate?.toString() || '0') / 100
    );
    
    const paperLabelEolFootprint = this.calculateMaterialEolFootprint(
      packagingMaterials.paperWeightKg,
      paperRecyclingRate,
      landfillEmissionFactor,
      incinerationEmissionFactor,
      recyclingProcessingFactor,
      parseFloat(stats.landfillRate?.toString() || '25') / 100,
      parseFloat(stats.incinerationRate?.toString() || '0') / 100
    );
    
    const aluminumClosureEolFootprint = this.calculateMaterialEolFootprint(
      packagingMaterials.aluminumWeightKg,
      aluminumRecyclingRate,
      landfillEmissionFactor,
      incinerationEmissionFactor,
      recyclingProcessingFactor,
      parseFloat(stats.landfillRate?.toString() || '25') / 100,
      parseFloat(stats.incinerationRate?.toString() || '0') / 100
    );
    
    console.log(`♻️ End-of-life waste footprint for ${country}: Glass=${glassBottleEolFootprint.toFixed(4)}, Paper=${paperLabelEolFootprint.toFixed(4)}, Aluminum=${aluminumClosureEolFootprint.toFixed(4)} kg CO2e`);
    
    return {
      glassBottleEolFootprint,
      paperLabelEolFootprint,
      aluminumClosureEolFootprint,
      country,
      dataYear: stats.dataYear,
      recyclingRates: {
        glass: glassRecyclingRate * 100,
        paper: paperRecyclingRate * 100,
        aluminum: aluminumRecyclingRate * 100,
      },
      disposalEmissions: {
        landfill: landfillEmissionFactor,
        incineration: incinerationEmissionFactor,
        recycling: recyclingProcessingFactor,
      },
    };
  }
  
  /**
   * Calculate material-specific end-of-life footprint using cut-off approach
   */
  private static calculateMaterialEolFootprint(
    materialWeightKg: number,
    recyclingRate: number,
    landfillEmissionFactor: number,
    incinerationEmissionFactor: number,
    recyclingProcessingFactor: number,
    nationalLandfillRate: number,
    nationalIncinerationRate: number
  ): number {
    
    // Calculate disposal distribution
    const recycledPortion = materialWeightKg * recyclingRate;
    const nonRecycledPortion = materialWeightKg * (1 - recyclingRate);
    
    // Non-recycled portion goes to landfill/incineration based on national rates
    const toLandfill = nonRecycledPortion * nationalLandfillRate;
    const toIncineration = nonRecycledPortion * nationalIncinerationRate;
    
    // Calculate emissions (cut-off approach: no recycling credits)
    const recyclingEmissions = recycledPortion * recyclingProcessingFactor;
    const landfillEmissions = toLandfill * landfillEmissionFactor;
    const incinerationEmissions = toIncineration * incinerationEmissionFactor;
    
    return recyclingEmissions + landfillEmissions + incinerationEmissions;
  }
  
  /**
   * Fallback calculation using global averages when regional data unavailable
   */
  private static async calculateEndOfLifeWithGlobalAverages(
    packagingMaterials: {
      glassWeightKg: number;
      paperWeightKg: number;
      aluminumWeightKg: number;
    }
  ): Promise<EndOfLifeWasteData> {
    
    // Global average recycling rates and emission factors
    const globalAverages = {
      glassRecyclingRate: 0.75, // 75%
      paperRecyclingRate: 0.70, // 70%
      aluminumRecyclingRate: 0.85, // 85%
      landfillEmissionFactor: 0.5, // kg CO2e per kg
      incinerationEmissionFactor: 0.4,
      recyclingProcessingFactor: 0.1,
      landfillRate: 0.40, // 40% to landfill globally
      incinerationRate: 0.10, // 10% to incineration globally
    };
    
    const glassBottleEolFootprint = this.calculateMaterialEolFootprint(
      packagingMaterials.glassWeightKg,
      globalAverages.glassRecyclingRate,
      globalAverages.landfillEmissionFactor,
      globalAverages.incinerationEmissionFactor,
      globalAverages.recyclingProcessingFactor,
      globalAverages.landfillRate,
      globalAverages.incinerationRate
    );
    
    const paperLabelEolFootprint = this.calculateMaterialEolFootprint(
      packagingMaterials.paperWeightKg,
      globalAverages.paperRecyclingRate,
      globalAverages.landfillEmissionFactor,
      globalAverages.incinerationEmissionFactor,
      globalAverages.recyclingProcessingFactor,
      globalAverages.landfillRate,
      globalAverages.incinerationRate
    );
    
    const aluminumClosureEolFootprint = this.calculateMaterialEolFootprint(
      packagingMaterials.aluminumWeightKg,
      globalAverages.aluminumRecyclingRate,
      globalAverages.landfillEmissionFactor,
      globalAverages.incinerationEmissionFactor,
      globalAverages.recyclingProcessingFactor,
      globalAverages.landfillRate,
      globalAverages.incinerationRate
    );
    
    return {
      glassBottleEolFootprint,
      paperLabelEolFootprint,
      aluminumClosureEolFootprint,
      country: 'Global Average',
      dataYear: 2024,
      recyclingRates: {
        glass: globalAverages.glassRecyclingRate * 100,
        paper: globalAverages.paperRecyclingRate * 100,
        aluminum: globalAverages.aluminumRecyclingRate * 100,
      },
      disposalEmissions: {
        landfill: globalAverages.landfillEmissionFactor,
        incineration: globalAverages.incinerationEmissionFactor,
        recycling: globalAverages.recyclingProcessingFactor,
      },
    };
  }
}