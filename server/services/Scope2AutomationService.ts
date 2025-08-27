import { db } from '../db';
import { productionFacilities } from '@shared/schema';
import { eq } from 'drizzle-orm';

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
    
    // Fetch all production facilities for the company
    const facilities = await db
      .select()
      .from(productionFacilities)
      .where(eq(productionFacilities.companyId, companyId));
    
    if (facilities.length === 0) {
      throw new Error('No production facilities found for this company. Please add facility data in the Operations tab first.');
    }
    
    console.log(`📊 Found ${facilities.length} production facilities for automated calculation`);
    
    let totalElectricityKwh = 0;
    let totalRenewableKwh = 0;
    let totalGasM3 = 0;
    let totalSteamKg = 0;
    let totalFuelLiters = 0;
    
    // Aggregate consumption across all facilities
    for (const facility of facilities) {
      console.log(`🏭 Processing facility: ${facility.facilityName}`);
      
      // Electricity consumption
      if (facility.totalElectricityKwhPerYear) {
        const electricityKwh = parseFloat(facility.totalElectricityKwhPerYear.toString());
        const renewablePercent = facility.renewableEnergyPercent ? parseFloat(facility.renewableEnergyPercent.toString()) / 100 : 0;
        const renewableKwh = electricityKwh * renewablePercent;
        
        totalElectricityKwh += electricityKwh;
        totalRenewableKwh += renewableKwh;
        
        console.log(`  ⚡ Electricity: ${electricityKwh.toLocaleString()} kWh/year (${(renewablePercent*100).toFixed(1)}% renewable)`);
      }
      
      // Gas consumption (typically Scope 1 for direct combustion)
      if (facility.totalGasM3PerYear) {
        const gasM3 = parseFloat(facility.totalGasM3PerYear.toString());
        totalGasM3 += gasM3;
        console.log(`  🔥 Natural Gas: ${gasM3.toLocaleString()} m³/year`);
      }
      
      // Steam consumption (typically Scope 2 if purchased)
      if (facility.totalSteamKgPerYear) {
        const steamKg = parseFloat(facility.totalSteamKgPerYear.toString());
        totalSteamKg += steamKg;
        console.log(`  🌫️ Steam: ${steamKg.toLocaleString()} kg/year`);
      }
      
      // Fuel consumption (typically Scope 1)
      if (facility.totalFuelLitersPerYear) {
        const fuelLiters = parseFloat(facility.totalFuelLitersPerYear.toString());
        totalFuelLiters += fuelLiters;
        console.log(`  ⛽ Fuel: ${fuelLiters.toLocaleString()} liters/year`);
      }
    }
    
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
      facilityCount: facilities.length,
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
    
    // Add grid electricity entry (Scope 2)
    if (automatedData.electricity.gridConsumption > 0) {
      entries.push({
        dataType: 'electricity',
        scope: 2,
        value: automatedData.electricity.gridConsumption.toString(),
        unit: 'kWh',
        calculatedEmissions: automatedData.electricity.emissions.toString(),
        metadata: {
          description: `Grid electricity from ${automatedData.facilityCount} production facilities`,
          isRenewable: false,
          emissionFactor: UK_EMISSION_FACTORS.ELECTRICITY_GRID,
          source: 'automated_from_operations',
          renewablePercent: automatedData.electricity.renewablePercent.toFixed(1)
        }
      });
    }
    
    // Add renewable electricity entry (Scope 2, zero emissions)
    if (automatedData.electricity.renewableConsumption > 0) {
      entries.push({
        dataType: 'electricity',
        scope: 2,
        value: automatedData.electricity.renewableConsumption.toString(),
        unit: 'kWh',
        calculatedEmissions: '0',
        metadata: {
          description: `Renewable electricity from ${automatedData.facilityCount} production facilities`,
          isRenewable: true,
          emissionFactor: UK_EMISSION_FACTORS.ELECTRICITY_RENEWABLE,
          source: 'automated_from_operations'
        }
      });
    }
    
    // Add steam entry if present (Scope 2)
    if (automatedData.steam && automatedData.steam.totalConsumption > 0) {
      entries.push({
        dataType: 'steam',
        scope: 2,
        value: automatedData.steam.totalConsumption.toString(),
        unit: 'kg',
        calculatedEmissions: automatedData.steam.emissions.toString(),
        metadata: {
          description: `Purchased steam from ${automatedData.facilityCount} production facilities`,
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