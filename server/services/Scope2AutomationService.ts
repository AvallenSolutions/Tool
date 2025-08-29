import { db } from '../db';
import { productionFacilities } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { MonthlyDataAggregationService } from './MonthlyDataAggregationService';

// VERIFIED DEFRA 2024 UK GRID ELECTRICITY EMISSION FACTORS
// Source: UK Government GHG Conversion Factors 2024 (Published July 8, 2024, Updated October 30, 2024)
const UK_EMISSION_FACTORS = {
  // Scope 2: Purchased electricity (location-based approach)
  ELECTRICITY_GRID: 0.22535,  // kg CO₂e per kWh - DEFRA 2024 total factor
  ELECTRICITY_RENEWABLE: 0,   // kg CO₂e per kWh - market-based for renewable certificates
  
  // Scope 1: Direct combustion (if gas is used for heating/processing)
  NATURAL_GAS: 1.8514,        // kg CO₂e per m³ - DEFRA 2024 verified
  
  // Steam and fuel factors
  STEAM: 0.2056,              // kg CO₂e per kg steam
  FUEL_OIL: 2.5174,           // kg CO₂e per liter heating oil
  DIESEL: 2.6991              // kg CO₂e per liter diesel
};

export interface AutomatedScope2Data {
  electricity: {
    totalConsumption: number;
    gridConsumption: number;
    renewableConsumption: number;
    emissions: number;
    renewablePercent: number;
  };
  gas: {
    totalConsumption: number;
    emissions: number;
    scope: 1 | 2; // Gas is typically Scope 1 if direct combustion
  };
  steam?: {
    totalConsumption: number;
    emissions: number;
  };
  fuel?: {
    totalConsumption: number;
    emissions: number;
    fuelType: string;
  };
  totalScope2Emissions: number;
  totalScope1Emissions: number;
  facilityCount: number;
  calculationMetadata: {
    method: string;
    emissionFactors: typeof UK_EMISSION_FACTORS;
    calculationDate: Date;
    dataSource: string;
  };
}

export class Scope2AutomationService {
  
  /**
   * Extract and calculate Scope 2 emissions from production facility data
   * Automatically converts total facility consumption to emissions using DEFRA 2024 factors
   */
  static async calculateAutomatedScope2(companyId: number): Promise<AutomatedScope2Data> {
    console.log(`🔍 Calculating automated Scope 2 emissions for company ${companyId}`);
    
    // Get aggregated monthly data converted to annual equivalents
    const monthlyDataService = new MonthlyDataAggregationService();
    const annualEquivalents = await monthlyDataService.getAnnualEquivalents(companyId);
    
    if (annualEquivalents.totalElectricityKwhPerYear === 0 && annualEquivalents.totalGasM3PerYear === 0) {
      throw new Error('No monthly facility data found for this company. Please add monthly operational data in Operations → Facility Updates first.');
    }
    
    console.log(`📊 Using aggregated monthly data (${annualEquivalents.dataSource}, ${annualEquivalents.confidence} confidence) for automated calculation`);
    
    // Use aggregated annual equivalents from monthly data
    const totalElectricityKwh = annualEquivalents.totalElectricityKwhPerYear;
    const totalGasM3 = annualEquivalents.totalGasM3PerYear;
    
    // Calculate renewable energy (assuming 0% renewable for now - this will need to be added to monthly data schema)
    const totalRenewableKwh = 0; // TODO: Add renewable percentage to monthly facility data
    
    // TODO: Steam and fuel data will need to be added to monthly data collection
    const totalSteamKg = 0;
    const totalFuelLiters = 0;
    
    console.log(`⚡ Aggregated electricity: ${totalElectricityKwh.toLocaleString()} kWh/year`);
    console.log(`🔥 Aggregated gas: ${totalGasM3.toLocaleString()} m³/year`);
    console.log(`📊 Data source: ${annualEquivalents.dataSource} (${annualEquivalents.confidence} confidence)`);
    
    // Calculate emissions by scope
    const gridElectricityKwh = totalElectricityKwh - totalRenewableKwh;
    const renewablePercent = totalElectricityKwh > 0 ? (totalRenewableKwh / totalElectricityKwh) * 100 : 0;
    
    // Scope 2 emissions (purchased electricity + steam)
    const electricityEmissions = gridElectricityKwh * UK_EMISSION_FACTORS.ELECTRICITY_GRID;
    const steamEmissions = totalSteamKg * UK_EMISSION_FACTORS.STEAM;
    const totalScope2Emissions = electricityEmissions + steamEmissions;
    
    // Scope 1 emissions (direct combustion)
    const gasEmissions = totalGasM3 * UK_EMISSION_FACTORS.NATURAL_GAS;
    const fuelEmissions = totalFuelLiters * UK_EMISSION_FACTORS.FUEL_OIL; // Assuming heating oil
    const totalScope1Emissions = gasEmissions + fuelEmissions;
    
    console.log(`📊 Scope 2 Calculation Summary:`);
    console.log(`  ⚡ Grid electricity: ${gridElectricityKwh.toLocaleString()} kWh × ${UK_EMISSION_FACTORS.ELECTRICITY_GRID} = ${electricityEmissions.toFixed(1)} kg CO₂e`);
    console.log(`  🌫️ Steam: ${totalSteamKg.toLocaleString()} kg × ${UK_EMISSION_FACTORS.STEAM} = ${steamEmissions.toFixed(1)} kg CO₂e`);
    console.log(`  📈 Total Scope 2: ${totalScope2Emissions.toFixed(1)} kg CO₂e (${(totalScope2Emissions/1000).toFixed(3)} tonnes)`);
    
    console.log(`📊 Scope 1 Calculation Summary:`);
    console.log(`  🔥 Natural gas: ${totalGasM3.toLocaleString()} m³ × ${UK_EMISSION_FACTORS.NATURAL_GAS} = ${gasEmissions.toFixed(1)} kg CO₂e`);
    console.log(`  ⛽ Fuel oil: ${totalFuelLiters.toLocaleString()} L × ${UK_EMISSION_FACTORS.FUEL_OIL} = ${fuelEmissions.toFixed(1)} kg CO₂e`);
    console.log(`  📈 Total Scope 1: ${totalScope1Emissions.toFixed(1)} kg CO₂e (${(totalScope1Emissions/1000).toFixed(3)} tonnes)`);
    
    const automatedData: AutomatedScope2Data = {
      electricity: {
        totalConsumption: totalElectricityKwh,
        gridConsumption: gridElectricityKwh,
        renewableConsumption: totalRenewableKwh,
        emissions: electricityEmissions,
        renewablePercent: renewablePercent
      },
      gas: {
        totalConsumption: totalGasM3,
        emissions: gasEmissions,
        scope: 1 // Natural gas is typically Scope 1 for direct combustion
      },
      steam: totalSteamKg > 0 ? {
        totalConsumption: totalSteamKg,
        emissions: steamEmissions
      } : undefined,
      fuel: totalFuelLiters > 0 ? {
        totalConsumption: totalFuelLiters,
        emissions: fuelEmissions,
        fuelType: 'heating_oil'
      } : undefined,
      totalScope2Emissions,
      totalScope1Emissions,
      facilityCount: 1, // Aggregated from multiple facilities via monthly data
      calculationMetadata: {
        method: 'Automated from Production Facilities - DEFRA 2024 Factors',
        emissionFactors: UK_EMISSION_FACTORS,
        calculationDate: new Date(),
        dataSource: 'production_facilities table'
      }
    };
    
    return automatedData;
  }
  
  /**
   * Generate footprint entries compatible with existing FootprintWizard format
   * Converts automated data to the format expected by the frontend
   */
  static convertToFootprintEntries(automatedData: AutomatedScope2Data) {
    const entries = [];
    
    // Add grid electricity entry (Scope 2) - annual total from monthly facility data
    if (automatedData.electricity.gridConsumption > 0) {
      entries.push({
        dataType: 'electricity',
        scope: 2,
        value: automatedData.electricity.gridConsumption.toString(),
        unit: 'kWh',
        calculatedEmissions: automatedData.electricity.emissions.toString(),
        metadata: {
          description: `Grid electricity from ${automatedData.facilityCount} production facilities (annual total)`,
          isRenewable: false,
          emissionFactor: UK_EMISSION_FACTORS.ELECTRICITY_GRID,
          source: 'automated_from_operations',
          renewablePercent: automatedData.electricity.renewablePercent.toFixed(1)
        }
      });
    }
    
    // Add renewable electricity entry (Scope 2, zero emissions) - annual total
    if (automatedData.electricity.renewableConsumption > 0) {
      entries.push({
        dataType: 'electricity',
        scope: 2,
        value: automatedData.electricity.renewableConsumption.toString(),
        unit: 'kWh',
        calculatedEmissions: '0',
        metadata: {
          description: `Renewable electricity from ${automatedData.facilityCount} production facilities (annual total)`,
          isRenewable: true,
          emissionFactor: UK_EMISSION_FACTORS.ELECTRICITY_RENEWABLE,
          source: 'automated_from_operations'
        }
      });
    }
    
    // Add steam entry if present (Scope 2) - annual total
    if (automatedData.steam && automatedData.steam.totalConsumption > 0) {
      entries.push({
        dataType: 'steam',
        scope: 2,
        value: automatedData.steam.totalConsumption.toString(),
        unit: 'kg',
        calculatedEmissions: automatedData.steam.emissions.toString(),
        metadata: {
          description: `Purchased steam from ${automatedData.facilityCount} production facilities (annual total)`,
          emissionFactor: UK_EMISSION_FACTORS.STEAM,
          source: 'automated_from_operations'
        }
      });
    }
    
    // Note: Gas and fuel are Scope 1, not included in Scope 2 entries
    // They should be handled separately in Scope 1 automation
    
    return entries;
  }
}