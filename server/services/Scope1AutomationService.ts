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
    
    // Fetch all production facilities for the company
    const facilities = await db
      .select()
      .from(productionFacilities)
      .where(eq(productionFacilities.companyId, companyId));
    
    if (facilities.length === 0) {
      throw new Error('No production facilities found for this company. Please add facility data in the Operations tab first.');
    }
    
    console.log(`📊 Found ${facilities.length} production facilities for automated Scope 1 calculation`);
    
    let totalGasM3 = 0;
    let totalFuelLiters = 0;
    const gasFacilityBreakdown = [];
    const fuelFacilityBreakdown = [];
    
    // Aggregate consumption across all facilities
    for (const facility of facilities) {
      console.log(`🏭 Processing facility: ${facility.facilityName}`);
      
      // Natural gas consumption (Scope 1 - direct combustion)
      if (facility.totalGasM3PerYear) {
        const gasM3 = parseFloat(facility.totalGasM3PerYear.toString());
        const gasEmissions = gasM3 * UK_EMISSION_FACTORS.NATURAL_GAS;
        
        totalGasM3 += gasM3;
        gasFacilityBreakdown.push({
          facilityName: facility.facilityName,
          consumption: gasM3,
          emissions: gasEmissions
        });
        
        console.log(`  🔥 Natural Gas: ${gasM3.toLocaleString()} m³/year = ${(gasEmissions/1000).toFixed(2)} tonnes CO2e`);
      }
      
      // Fuel consumption (Scope 1 - direct combustion)
      if (facility.totalFuelLitersPerYear) {
        const fuelLiters = parseFloat(facility.totalFuelLitersPerYear.toString());
        const fuelEmissions = fuelLiters * UK_EMISSION_FACTORS.DIESEL; // Assume diesel for now
        
        totalFuelLiters += fuelLiters;
        fuelFacilityBreakdown.push({
          facilityName: facility.facilityName,
          consumption: fuelLiters,
          emissions: fuelEmissions
        });
        
        console.log(`  ⛽ Fuel: ${fuelLiters.toLocaleString()} liters/year = ${(fuelEmissions/1000).toFixed(2)} tonnes CO2e`);
      }
    }
    
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
      facilityCount: facilities.length,
      calculationMetadata: {
        method: 'Automated Scope 1 Calculation',
        emissionFactors: UK_EMISSION_FACTORS,
        calculationDate: new Date(),
        dataSource: 'Production Facilities Database (automated import)'
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