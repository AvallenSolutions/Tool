import { db } from '../db';
import { productionFacilities } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { MonthlyDataAggregationService } from './MonthlyDataAggregationService';

// VERIFIED DEFRA 2024 UK EMISSION FACTORS  
// Source: UK Government GHG Conversion Factors 2024 (Published July 8, 2024, Updated October 30, 2024)
const UK_EMISSION_FACTORS = {
  // Scope 1: Direct emissions from owned/controlled sources
  NATURAL_GAS: 1.8514,        // kg CO₂e per m³ - DEFRA 2024 verified (direct combustion)
  DIESEL: 2.6991,             // kg CO₂e per liter - DEFRA 2024 verified 
  PETROL: 2.1803,             // kg CO₂e per liter - DEFRA 2024 verified
  HEATING_OIL: 2.5174,        // kg CO₂e per liter - DEFRA 2024 verified
  LPG: 1.5134,                // kg CO₂e per liter - DEFRA 2024 verified
  FUEL_OIL: 2.5174            // kg CO₂e per liter heating oil
};

export interface AutomatedScope1Data {
  gas: {
    totalConsumption: number;
    emissions: number;
    facilityBreakdown: Array<{
      facilityName: string;
      consumption: number;
      emissions: number;
    }>;
  };
  fuel: {
    totalConsumption: number;
    emissions: number;
    facilityBreakdown: Array<{
      facilityName: string;
      consumption: number;
      emissions: number;
    }>;
  };
  totalScope1Emissions: number;
  facilityCount: number;
  calculationMetadata: {
    method: string;
    emissionFactors: typeof UK_EMISSION_FACTORS;
    calculationDate: Date;
    dataSource: string;
  };
}

export class Scope1AutomationService {
  
  /**
   * Extract and calculate Scope 1 emissions from production facility data
   * Focuses on direct combustion sources: natural gas, diesel, petrol, heating oil
   */
  static async calculateAutomatedScope1(companyId: number): Promise<AutomatedScope1Data> {
    console.log(`🔥 Calculating automated Scope 1 emissions for company ${companyId}`);
    
    // Get aggregated monthly data converted to annual equivalents
    const monthlyDataService = new MonthlyDataAggregationService();
    const annualEquivalents = await monthlyDataService.getAnnualEquivalents(companyId);
    
    if (annualEquivalents.totalGasM3PerYear === 0) {
      throw new Error('No monthly facility data found for this company. Please add monthly operational data in Operations → Facility Updates first.');
    }
    
    console.log(`📊 Using aggregated monthly data (${annualEquivalents.dataSource}, ${annualEquivalents.confidence} confidence) for automated Scope 1 calculation`);
    
    // Use aggregated annual equivalents from monthly data
    const totalGasM3 = annualEquivalents.totalGasM3PerYear;
    
    // TODO: Fuel data will need to be added to monthly data collection
    const totalFuelLiters = 0; // Currently not tracked in monthly data
    
    const gasFacilityBreakdown = [{
      facilityName: 'Aggregated from Monthly Data',
      consumption: totalGasM3,
      emissions: totalGasM3 * UK_EMISSION_FACTORS.NATURAL_GAS
    }];
    
    const fuelFacilityBreakdown = []; // Empty until fuel tracking is added to monthly data
    
    console.log(`🔥 Aggregated natural gas: ${totalGasM3.toLocaleString()} m³/year`);
    console.log(`📊 Data source: ${annualEquivalents.dataSource} (${annualEquivalents.confidence} confidence)`);
    
    // Calculate total Scope 1 emissions
    const totalGasEmissions = totalGasM3 * UK_EMISSION_FACTORS.NATURAL_GAS;
    const totalFuelEmissions = totalFuelLiters * UK_EMISSION_FACTORS.DIESEL;
    const totalScope1Emissions = totalGasEmissions + totalFuelEmissions;
    
    console.log(`🧮 SCOPE 1 AUTOMATION SUMMARY:`);
    console.log(`   Natural Gas: ${totalGasM3.toLocaleString()} m³/year = ${(totalGasEmissions/1000).toFixed(2)} tonnes CO2e`);
    console.log(`   Fuel: ${totalFuelLiters.toLocaleString()} liters/year = ${(totalFuelEmissions/1000).toFixed(2)} tonnes CO2e`);
    console.log(`   TOTAL SCOPE 1: ${(totalScope1Emissions/1000).toFixed(2)} tonnes CO2e`);
    console.log(`   Facilities processed: ${facilities.length}`);
    
    return {
      gas: {
        totalConsumption: totalGasM3,
        emissions: totalGasEmissions,
        facilityBreakdown: gasFacilityBreakdown
      },
      fuel: {
        totalConsumption: totalFuelLiters,
        emissions: totalFuelEmissions,
        facilityBreakdown: fuelFacilityBreakdown
      },
      totalScope1Emissions,
      facilityCount: 1, // Aggregated from multiple facilities via monthly data
      calculationMetadata: {
        method: 'Automated Scope 1 Calculation',
        emissionFactors: UK_EMISSION_FACTORS,
        calculationDate: new Date(),
        dataSource: `Monthly Aggregated Data (${annualEquivalents.dataSource})`
      }
    };
  }
  
  /**
   * Convert automated Scope 1 data to footprint entry format for database storage
   */
  static convertToFootprintEntries(companyId: number, automatedData: AutomatedScope1Data) {
    const entries = [];
    
    // Natural gas entry
    if (automatedData.gas.totalConsumption > 0) {
      entries.push({
        companyId,
        scope: 1,
        dataType: 'natural_gas',
        value: automatedData.gas.totalConsumption.toString(),
        unit: 'm3',
        emissionsFactor: UK_EMISSION_FACTORS.NATURAL_GAS,
        calculatedEmissions: automatedData.gas.emissions.toString(),
        metadata: JSON.stringify({
          source: 'automated_from_operations',
          imported: true,
          importDate: new Date().toISOString(),
          description: `Natural gas from ${automatedData.facilityCount} production facilities`,
          emissionFactor: UK_EMISSION_FACTORS.NATURAL_GAS,
          facilityBreakdown: automatedData.gas.facilityBreakdown
        }),
        reportingPeriodStart: null,
        reportingPeriodEnd: null
      });
    }
    
    // Fuel entry (if any)
    if (automatedData.fuel.totalConsumption > 0) {
      entries.push({
        companyId,
        scope: 1,
        dataType: 'diesel', // Assumed diesel for now
        value: automatedData.fuel.totalConsumption.toString(),
        unit: 'litres',
        emissionsFactor: UK_EMISSION_FACTORS.DIESEL,
        calculatedEmissions: automatedData.fuel.emissions.toString(),
        metadata: JSON.stringify({
          source: 'automated_from_operations',
          imported: true,
          importDate: new Date().toISOString(),
          description: `Diesel fuel from ${automatedData.facilityCount} production facilities`,
          emissionFactor: UK_EMISSION_FACTORS.DIESEL,
          facilityBreakdown: automatedData.fuel.facilityBreakdown
        }),
        reportingPeriodStart: null,
        reportingPeriodEnd: null
      });
    }
    
    return entries;
  }
}