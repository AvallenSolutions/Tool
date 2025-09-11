/**
 * Enhanced Waste Streams Calculation Service
 * Updates the legacy WasteIntensityCalculationService to use the new waste streams system
 * instead of deprecated facility-level waste fields
 */
import { db } from '../db';
import { wasteStreams, monthlyFacilityData, productionFacilities, regionalWasteStatistics } from '@shared/schema';
import { eq, and, sum, sql, desc } from 'drizzle-orm';
import { MonthlyDataAggregationService } from './MonthlyDataAggregationService';

export interface WasteStreamsIntensityData {
  // Production waste intensity (kg waste per unit production) - updated for waste streams
  productionWasteIntensity: number;
  totalFacilityWasteKgPerYear: number;
  totalFacilityProductionVolumePerYear: number;
  
  // Breakdown by waste type (using new waste streams data)
  wasteTypeBreakdown: {
    general_waste: { intensity: number; totalKg: number };
    dry_mixed_recycling: { intensity: number; totalKg: number };
    glass_recycling: { intensity: number; totalKg: number };
    organic_waste: { intensity: number; totalKg: number };
    hazardous_waste: { intensity: number; totalKg: number };
  };
  
  // Breakdown by disposal route (kg per unit production)
  disposalRouteBreakdown: {
    landfill: { intensity: number; totalKg: number };
    recycling: { intensity: number; totalKg: number };
    anaerobic_digestion: { intensity: number; totalKg: number };
    composting: { intensity: number; totalKg: number };
    animal_feed: { intensity: number; totalKg: number };
  };
  
  // Metadata
  dataMonths: number; // Number of months of data used
  latestDataMonth: string;
  calculationMethod: 'waste_streams' | 'facility_fallback';
}

export interface WasteStreamsProductionFootprint {
  // Carbon footprint from production waste (kg CO2e per unit) - using waste streams
  totalWasteCarbonFootprint: number;
  
  // Breakdown by disposal route (kg CO2e per unit)
  landfillEmissions: number;
  recyclingEmissions: number;
  anaerobicDigestionEmissions: number;
  compostingEmissions: number;
  animalFeedEmissions: number;
  
  // Waste transport emissions (kg CO2e per unit)
  transportEmissions: number;
  
  // Methodology metadata
  country: string;
  facilityName: string;
  dataSource: 'waste_streams' | 'facility_estimates';
  dataQuality: 'high' | 'medium' | 'low';
}

export class WasteStreamsCalculationService {
  
  /**
   * Calculate waste intensity using waste streams data (replaces legacy facility-based calculation)
   * Formula: Total Waste Streams (kg/year) ÷ Total Production Volume (units/year) = Waste Intensity (kg/unit)
   */
  static async calculateWasteIntensityFromStreams(facilityId: number): Promise<WasteStreamsIntensityData> {
    // Get facility data to determine company
    const [facility] = await db
      .select()
      .from(productionFacilities)
      .where(eq(productionFacilities.id, facilityId));
      
    if (!facility) {
      throw new Error(`Facility with ID ${facilityId} not found`);
    }
    
    console.log(`🔄 Calculating waste intensity using waste streams data for facility: ${facility.facilityName}`);
    
    // Get aggregated monthly data for production volume
    const monthlyDataService = new MonthlyDataAggregationService();
    const annualEquivalents = await monthlyDataService.getAnnualEquivalents(facility.companyId);
    
    if (annualEquivalents.annualCapacityVolume === 0) {
      throw new Error('No monthly production data found for this company. Please add monthly operational data in Operations → Facility Updates first.');
    }
    
    // Get waste streams data from monthly facility data linked to this facility
    const wasteStreamsQuery = await db
      .select({
        wasteType: wasteStreams.wasteType,
        disposalRoute: wasteStreams.disposalRoute,
        totalWeight: sum(wasteStreams.weightKg).as('totalWeight'),
        recordCount: sql<number>`COUNT(*)`.as('recordCount'),
        latestMonth: sql<string>`MAX(${monthlyFacilityData.month})`.as('latestMonth')
      })
      .from(wasteStreams)
      .innerJoin(monthlyFacilityData, eq(wasteStreams.monthlyFacilityDataId, monthlyFacilityData.id))
      .where(eq(monthlyFacilityData.facilityId, facilityId))
      .groupBy(wasteStreams.wasteType, wasteStreams.disposalRoute);
    
    let calculationMethod: 'waste_streams' | 'facility_fallback' = 'waste_streams';
    let totalWasteKg = 0;
    let dataMonths = 0;
    let latestDataMonth = '';
    
    // Initialize waste type breakdown
    const wasteTypeBreakdown = {
      general_waste: { intensity: 0, totalKg: 0 },
      dry_mixed_recycling: { intensity: 0, totalKg: 0 },
      glass_recycling: { intensity: 0, totalKg: 0 },
      organic_waste: { intensity: 0, totalKg: 0 },
      hazardous_waste: { intensity: 0, totalKg: 0 },
    };
    
    // Initialize disposal route breakdown
    const disposalRouteBreakdown = {
      landfill: { intensity: 0, totalKg: 0 },
      recycling: { intensity: 0, totalKg: 0 },
      anaerobic_digestion: { intensity: 0, totalKg: 0 },
      composting: { intensity: 0, totalKg: 0 },
      animal_feed: { intensity: 0, totalKg: 0 },
    };
    
    if (wasteStreamsQuery.length > 0) {
      console.log(`📊 Found ${wasteStreamsQuery.length} waste stream categories for facility ${facility.facilityName}`);
      
      // Process waste streams data
      for (const stream of wasteStreamsQuery) {
        const weight = parseFloat(stream.totalWeight || '0');
        totalWasteKg += weight;
        
        // Update waste type breakdown
        if (stream.wasteType && stream.wasteType in wasteTypeBreakdown) {
          wasteTypeBreakdown[stream.wasteType as keyof typeof wasteTypeBreakdown].totalKg += weight;
        }
        
        // Update disposal route breakdown
        if (stream.disposalRoute && stream.disposalRoute in disposalRouteBreakdown) {
          disposalRouteBreakdown[stream.disposalRoute as keyof typeof disposalRouteBreakdown].totalKg += weight;
        }
        
        dataMonths = Math.max(dataMonths, stream.recordCount || 0);
        if (stream.latestMonth && stream.latestMonth > latestDataMonth) {
          latestDataMonth = stream.latestMonth;
        }
      }
      
      console.log(`✅ Waste streams calculation: ${totalWasteKg.toFixed(2)} kg total waste from ${dataMonths} data points`);
      
    } else {
      console.log('⚠️ No waste streams data found, falling back to facility-level estimates');
      calculationMethod = 'facility_fallback';
      
      // Fallback to facility-level data if available
      const totalOrganicWaste = parseFloat(facility.totalOrganicWasteKgPerYear?.toString() || '0');
      const totalPackagingWaste = parseFloat(facility.totalPackagingWasteKgPerYear?.toString() || '0');
      const totalHazardousWaste = parseFloat(facility.totalHazardousWasteKgPerYear?.toString() || '0');
      const totalGeneralWaste = parseFloat(facility.totalGeneralWasteKgPerYear?.toString() || '0');
      
      totalWasteKg = totalOrganicWaste + totalPackagingWaste + totalHazardousWaste + totalGeneralWaste;
      
      // Map legacy data to new structure
      wasteTypeBreakdown.organic_waste.totalKg = totalOrganicWaste;
      wasteTypeBreakdown.dry_mixed_recycling.totalKg = totalPackagingWaste; // Packaging typically recycled
      wasteTypeBreakdown.hazardous_waste.totalKg = totalHazardousWaste;
      wasteTypeBreakdown.general_waste.totalKg = totalGeneralWaste;
      
      dataMonths = 12; // Assume annual facility data
      latestDataMonth = new Date().toISOString().split('T')[0];
    }
    
    // Calculate intensities (kg waste per unit production)
    const totalProductionVolume = annualEquivalents.annualCapacityVolume;
    const productionWasteIntensity = totalWasteKg / totalProductionVolume;
    
    // Calculate waste type intensities
    for (const wasteType in wasteTypeBreakdown) {
      wasteTypeBreakdown[wasteType as keyof typeof wasteTypeBreakdown].intensity = 
        wasteTypeBreakdown[wasteType as keyof typeof wasteTypeBreakdown].totalKg / totalProductionVolume;
    }
    
    // Calculate disposal route intensities
    for (const disposalRoute in disposalRouteBreakdown) {
      disposalRouteBreakdown[disposalRoute as keyof typeof disposalRouteBreakdown].intensity = 
        disposalRouteBreakdown[disposalRoute as keyof typeof disposalRouteBreakdown].totalKg / totalProductionVolume;
    }
    
    console.log(`📊 Final waste intensity: ${productionWasteIntensity.toFixed(4)} kg/unit (method: ${calculationMethod})`);
    
    return {
      productionWasteIntensity,
      totalFacilityWasteKgPerYear: totalWasteKg,
      totalFacilityProductionVolumePerYear: totalProductionVolume,
      wasteTypeBreakdown,
      disposalRouteBreakdown,
      dataMonths,
      latestDataMonth,
      calculationMethod
    };
  }

  /**
   * Calculate production waste footprint using waste streams disposal route data
   * Enhanced version that uses actual waste streams data instead of facility estimates
   */
  static async calculateProductionWasteFootprintFromStreams(
    facilityId: number,
    country: string = 'United Kingdom'
  ): Promise<WasteStreamsProductionFootprint> {
    
    // Get facility data
    const [facility] = await db
      .select()
      .from(productionFacilities)
      .where(eq(productionFacilities.id, facilityId));
      
    if (!facility) {
      throw new Error(`Facility with ID ${facilityId} not found`);
    }

    console.log(`🔄 Calculating production waste footprint using waste streams for: ${facility.facilityName}`);

    // Get regional emission factors
    const regionalStats = await db
      .select()
      .from(regionalWasteStatistics)
      .where(eq(regionalWasteStatistics.country, country))
      .orderBy(desc(regionalWasteStatistics.dataYear))
      .limit(1);

    let emissionFactors = {
      landfill: 0.4892, // kg CO2e per kg waste (DEFRA 2024)
      recycling: 0.0892, // Processing emissions
      anaerobic_digestion: 0.0120, // Lower emissions for AD
      composting: 0.0156, // Composting emissions
      animal_feed: 0.0050, // Very low emissions for animal feed
      transport: 0.0875, // kg CO2e per tonne-km
      avgTransportDistance: 42.5 // km average in UK
    };

    if (regionalStats.length > 0) {
      const stats = regionalStats[0];
      emissionFactors = {
        landfill: parseFloat(stats.landfillEmissionFactor?.toString() || '0.4892'),
        recycling: parseFloat(stats.recyclingProcessingFactor?.toString() || '0.0892'),
        anaerobic_digestion: parseFloat(stats.anaerobicDigestionFactor?.toString() || '0.0120'),
        composting: parseFloat(stats.compostingEmissionFactor?.toString() || '0.0156'),
        animal_feed: parseFloat(stats.animalFeedEmissionFactor?.toString() || '0.0050'),
        transport: parseFloat(stats.wasteTransportEmissionFactor?.toString() || '0.0875'),
        avgTransportDistance: parseFloat(stats.averageTransportDistanceKm?.toString() || '42.5')
      };
    }

    // Get actual waste streams data
    const wasteStreamsData = await db
      .select({
        disposalRoute: wasteStreams.disposalRoute,
        totalWeight: sum(wasteStreams.weightKg).as('totalWeight')
      })
      .from(wasteStreams)
      .innerJoin(monthlyFacilityData, eq(wasteStreams.monthlyFacilityDataId, monthlyFacilityData.id))
      .where(eq(monthlyFacilityData.facilityId, facilityId))
      .groupBy(wasteStreams.disposalRoute);

    let dataSource: 'waste_streams' | 'facility_estimates' = 'waste_streams';
    let dataQuality: 'high' | 'medium' | 'low' = 'high';
    
    // Initialize waste quantities
    let wasteToLandfill = 0;
    let wasteToRecycling = 0;
    let wasteToAnaerobicDigestion = 0;
    let wasteToComposting = 0;
    let wasteToAnimalFeed = 0;

    if (wasteStreamsData.length > 0) {
      console.log(`📊 Using waste streams data: ${wasteStreamsData.length} disposal routes found`);
      
      for (const stream of wasteStreamsData) {
        const weight = parseFloat(stream.totalWeight || '0');
        
        switch (stream.disposalRoute) {
          case 'landfill':
            wasteToLandfill += weight;
            break;
          case 'recycling':
            wasteToRecycling += weight;
            break;
          case 'anaerobic_digestion':
            wasteToAnaerobicDigestion += weight;
            break;
          case 'composting':
            wasteToComposting += weight;
            break;
          case 'animal_feed':
            wasteToAnimalFeed += weight;
            break;
        }
      }
      
    } else {
      console.log('⚠️ No waste streams data, using facility estimates');
      dataSource = 'facility_estimates';
      dataQuality = 'medium';
      
      // Fallback to facility data if available
      wasteToLandfill = parseFloat(facility.wasteToLandfillKgPerYear?.toString() || '0');
      wasteToRecycling = parseFloat(facility.wasteToRecyclingKgPerYear?.toString() || '0');
      wasteToComposting = parseFloat(facility.wasteToCompostingKgPerYear?.toString() || '0');
      wasteToAnaerobicDigestion = parseFloat(facility.wasteToEnergyRecoveryKgPerYear?.toString() || '0') * 0.3; // Estimate
      wasteToAnimalFeed = 0; // Not tracked in legacy system
    }

    // Get total production for per-unit calculation
    const monthlyDataService = new MonthlyDataAggregationService();
    const annualEquivalents = await monthlyDataService.getAnnualEquivalents(facility.companyId);
    const totalProductionVolume = annualEquivalents.annualCapacityVolume || 1;

    // Calculate emissions per unit production
    const landfillEmissions = (wasteToLandfill / totalProductionVolume) * emissionFactors.landfill;
    const recyclingEmissions = (wasteToRecycling / totalProductionVolume) * emissionFactors.recycling;
    const anaerobicDigestionEmissions = (wasteToAnaerobicDigestion / totalProductionVolume) * emissionFactors.anaerobic_digestion;
    const compostingEmissions = (wasteToComposting / totalProductionVolume) * emissionFactors.composting;
    const animalFeedEmissions = (wasteToAnimalFeed / totalProductionVolume) * emissionFactors.animal_feed;

    // Calculate transport emissions
    const totalWasteKg = wasteToLandfill + wasteToRecycling + wasteToAnaerobicDigestion + wasteToComposting + wasteToAnimalFeed;
    const transportEmissions = (totalWasteKg / totalProductionVolume) * (emissionFactors.avgTransportDistance / 1000) * emissionFactors.transport;

    const totalWasteCarbonFootprint = landfillEmissions + recyclingEmissions + anaerobicDigestionEmissions + 
                                    compostingEmissions + animalFeedEmissions + transportEmissions;

    console.log(`♻️ Waste footprint calculation complete: ${totalWasteCarbonFootprint.toFixed(4)} kg CO2e per unit`);
    console.log(`♻️ Breakdown: Landfill=${landfillEmissions.toFixed(4)}, Recycling=${recyclingEmissions.toFixed(4)}, AD=${anaerobicDigestionEmissions.toFixed(4)}, Composting=${compostingEmissions.toFixed(4)}, Transport=${transportEmissions.toFixed(4)}`);

    return {
      totalWasteCarbonFootprint,
      landfillEmissions,
      recyclingEmissions,
      anaerobicDigestionEmissions,
      compostingEmissions,
      animalFeedEmissions,
      transportEmissions,
      country,
      facilityName: facility.facilityName || `Facility ${facilityId}`,
      dataSource,
      dataQuality
    };
  }

  /**
   * Get waste streams summary for facility dashboard
   */
  static async getWasteStreamsSummary(facilityId: number) {
    const wasteStreamsSummary = await db
      .select({
        wasteType: wasteStreams.wasteType,
        disposalRoute: wasteStreams.disposalRoute,
        totalWeight: sum(wasteStreams.weightKg).as('totalWeight'),
        recordCount: sql<number>`COUNT(*)`.as('recordCount'),
        avgWeight: sql<number>`AVG(CAST(${wasteStreams.weightKg} AS NUMERIC))`.as('avgWeight'),
        latestMonth: sql<string>`MAX(${monthlyFacilityData.month})`.as('latestMonth')
      })
      .from(wasteStreams)
      .innerJoin(monthlyFacilityData, eq(wasteStreams.monthlyFacilityDataId, monthlyFacilityData.id))
      .where(eq(monthlyFacilityData.facilityId, facilityId))
      .groupBy(wasteStreams.wasteType, wasteStreams.disposalRoute)
      .orderBy(sql`SUM(CAST(${wasteStreams.weightKg} AS NUMERIC)) DESC`);

    return {
      streams: wasteStreamsSummary,
      totalStreams: wasteStreamsSummary.length,
      totalWaste: wasteStreamsSummary.reduce((sum, stream) => sum + parseFloat(stream.totalWeight || '0'), 0),
      dataQuality: wasteStreamsSummary.length > 0 ? 'good' : 'no_data'
    };
  }
}

export const wasteStreamsCalculationService = new WasteStreamsCalculationService();