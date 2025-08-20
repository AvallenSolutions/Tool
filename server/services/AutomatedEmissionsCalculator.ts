import { db } from '../db';
import { products, suppliers } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface EmissionsResult {
  totalEmissions: number; // in tonnes CO2e
  breakdown?: Record<string, number>;
}

/**
 * Calculate Purchased Goods & Services emissions (Scope 3, Category 1)
 */
export async function calculatePurchasedGoodsEmissions(companyId: number): Promise<EmissionsResult> {
  try {
    const companyProducts = await db
      .select()
      .from(products)
      .where(eq(products.companyId, companyId));

    let totalEmissions = 0;
    const breakdown: Record<string, number> = {};

    for (const product of companyProducts) {
      // Calculate emissions from ingredients and raw materials
      if (product.ingredients && product.annualProductionVolume) {
        const ingredients = product.ingredients as any[];
        const annualVolume = parseFloat(product.annualProductionVolume);
        
        for (const ingredient of ingredients) {
          if (ingredient.name && ingredient.amount) {
            // Use standard emission factor for agricultural ingredients (0.375 kg CO2e/L)
            const ingredientEmissions = parseFloat(ingredient.amount) * annualVolume * 0.375; // kg CO2e
            
            totalEmissions += ingredientEmissions;
            breakdown[ingredient.name] = (breakdown[ingredient.name] || 0) + ingredientEmissions;
          }
        }
      }

      // Add packaging emissions based on bottle weight
      if (product.bottleWeight && product.annualProductionVolume) {
        const bottleWeightKg = parseFloat(product.bottleWeight) / 1000; // Convert grams to kg
        const packagingEmissions = bottleWeightKg * parseFloat(product.annualProductionVolume) * 0.51; // 0.51 kg CO2e/kg packaging
        totalEmissions += packagingEmissions;
        breakdown['Packaging'] = (breakdown['Packaging'] || 0) + packagingEmissions;
      }
    }

    // Convert from kg to tonnes
    const totalInTonnes = totalEmissions / 1000;
    
    return {
      totalEmissions: totalInTonnes,
      breakdown: Object.fromEntries(
        Object.entries(breakdown).map(([key, value]) => [key, value / 1000])
      )
    };

  } catch (error) {
    console.error('Error calculating purchased goods emissions:', error);
    return { totalEmissions: 0 };
  }
}

/**
 * Calculate Fuel & Energy-Related Activities emissions (Scope 3, Category 3)
 */
export async function calculateFuelEnergyUpstreamEmissions(companyId: number): Promise<EmissionsResult> {
  try {
    const companyProducts = await db
      .select()
      .from(products)
      .where(eq(products.companyId, companyId));

    let totalEmissions = 0;
    const breakdown: Record<string, number> = {};

    for (const product of companyProducts) {
      // Calculate upstream emissions from processing energy
      if (product.electricityKwh && product.annualProductionVolume) {
        const energyConsumption = parseFloat(product.electricityKwh);
        const annualVolume = parseFloat(product.annualProductionVolume);
        
        // Upstream emissions factor (transmission & distribution losses): ~0.021 kg CO2e/kWh
        const upstreamFactor = 0.021;
        
        const upstreamEmissions = energyConsumption * annualVolume * upstreamFactor;
        totalEmissions += upstreamEmissions;
        breakdown['Processing Energy (Upstream)'] = (breakdown['Processing Energy (Upstream)'] || 0) + upstreamEmissions;
      }

      // Calculate transportation fuel upstream emissions
      if (product.averageTransportDistance && product.annualProductionVolume) {
        const transportDistance = parseFloat(product.averageTransportDistance);
        const annualVolume = parseFloat(product.annualProductionVolume);
        
        // Standard transport emission factor: 0.062 kg CO2e/tonne-km (truck)
        const productWeightKg = parseFloat(product.bottleWeight || '700') / 1000 + 0.75; // bottle + contents
        const transportEmissions = (productWeightKg / 1000) * transportDistance * annualVolume * 0.062;
        
        // Assume 15% upstream emissions for transportation fuel
        const upstreamTransportEmissions = transportEmissions * 0.15;
        
        totalEmissions += upstreamTransportEmissions;
        breakdown['Transportation Fuel (Upstream)'] = (breakdown['Transportation Fuel (Upstream)'] || 0) + upstreamTransportEmissions;
      }
    }

    // Convert from kg to tonnes
    const totalInTonnes = totalEmissions / 1000;
    
    return {
      totalEmissions: totalInTonnes,
      breakdown: Object.fromEntries(
        Object.entries(breakdown).map(([key, value]) => [key, value / 1000])
      )
    };

  } catch (error) {
    console.error('Error calculating fuel & energy upstream emissions:', error);
    return { totalEmissions: 0 };
  }
}

/**
 * Calculate Transportation & Distribution emissions (Scope 3, Category 4)
 */
export async function calculateTransportationEmissions(companyId: number): Promise<EmissionsResult> {
  try {
    const companyProducts = await db
      .select()
      .from(products)
      .where(eq(products.companyId, companyId));

    let totalEmissions = 0;
    const breakdown: Record<string, number> = {};

    for (const product of companyProducts) {
      if (product.averageTransportDistance && product.annualProductionVolume) {
        const transportDistance = parseFloat(product.averageTransportDistance);
        const annualVolume = parseFloat(product.annualProductionVolume);
        
        // Standard transport emission factor: 0.062 kg CO2e/tonne-km (truck)
        const productWeightKg = parseFloat(product.bottleWeight || '700') / 1000 + 0.75; // bottle + contents
        const transportEmissions = (productWeightKg / 1000) * transportDistance * annualVolume * 0.062;
        
        totalEmissions += transportEmissions;
        breakdown[product.name || 'Product Transportation'] = (breakdown[product.name || 'Product Transportation'] || 0) + transportEmissions;
      }
    }

    // Convert from kg to tonnes
    const totalInTonnes = totalEmissions / 1000;
    
    return {
      totalEmissions: totalInTonnes,
      breakdown: Object.fromEntries(
        Object.entries(breakdown).map(([key, value]) => [key, value / 1000])
      )
    };

  } catch (error) {
    console.error('Error calculating transportation emissions:', error);
    return { totalEmissions: 0 };
  }
}

/**
 * Calculate End-of-Life Treatment emissions (Scope 3, Category 12)
 */
export async function calculateEndOfLifeEmissions(companyId: number): Promise<EmissionsResult> {
  try {
    const companyProducts = await db
      .select()
      .from(products)
      .where(eq(products.companyId, companyId));

    let totalEmissions = 0;
    const breakdown: Record<string, number> = {};

    for (const product of companyProducts) {
      if (product.recyclingRate && product.bottleWeight && product.annualProductionVolume) {
        const recyclingRate = parseFloat(product.recyclingRate) / 100; // Convert percentage to decimal
        const bottleWeightKg = parseFloat(product.bottleWeight) / 1000; // Convert grams to kg
        const annualVolume = parseFloat(product.annualProductionVolume);
        
        // Calculate end-of-life emissions based on disposal method
        // Recycling: 0.1 kg CO2e/kg, Landfill: 0.3 kg CO2e/kg, Incineration: 2.1 kg CO2e/kg
        const recyclingEmissions = bottleWeightKg * annualVolume * recyclingRate * 0.1;
        const landfillEmissions = bottleWeightKg * annualVolume * (1 - recyclingRate) * 0.3;
        const eolEmissions = recyclingEmissions + landfillEmissions;
        
        totalEmissions += eolEmissions;
        breakdown[`${product.name || 'Product'} End-of-Life`] = (breakdown[`${product.name || 'Product'} End-of-Life`] || 0) + eolEmissions;
      }
    }

    // Convert from kg to tonnes
    const totalInTonnes = totalEmissions / 1000;
    
    return {
      totalEmissions: totalInTonnes,
      breakdown: Object.fromEntries(
        Object.entries(breakdown).map(([key, value]) => [key, value / 1000])
      )
    };

  } catch (error) {
    console.error('Error calculating end-of-life emissions:', error);
    return { totalEmissions: 0 };
  }
}

/**
 * Calculate total Scope 3 emissions
 */
export async function calculateTotalScope3Emissions(companyId: number): Promise<EmissionsResult> {
  try {
    const [purchasedGoods, fuelEnergy, transportation, endOfLife] = await Promise.all([
      calculatePurchasedGoodsEmissions(companyId),
      calculateFuelEnergyUpstreamEmissions(companyId),
      calculateTransportationEmissions(companyId),
      calculateEndOfLifeEmissions(companyId)
    ]);

    const totalEmissions = 
      purchasedGoods.totalEmissions + 
      fuelEnergy.totalEmissions + 
      transportation.totalEmissions + 
      endOfLife.totalEmissions;

    const breakdown: Record<string, number> = {
      'Category 1: Purchased Goods & Services': purchasedGoods.totalEmissions,
      'Category 3: Fuel & Energy-Related Activities': fuelEnergy.totalEmissions,
      'Category 4: Transportation & Distribution': transportation.totalEmissions,
      'Category 12: End-of-Life Treatment': endOfLife.totalEmissions
    };

    return {
      totalEmissions,
      breakdown
    };

  } catch (error) {
    console.error('Error calculating total Scope 3 emissions:', error);
    return { totalEmissions: 0 };
  }
}