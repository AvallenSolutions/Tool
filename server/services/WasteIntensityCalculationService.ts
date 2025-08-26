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