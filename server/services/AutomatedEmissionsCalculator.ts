import { db } from '../db';
import { products, suppliers } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface EmissionsResult {
  totalEmissions: number; // in tonnes CO2e
  breakdown?: Record<string, number>;
  details?: Array<{productId: number; name: string; emissions: number}>;
  productCount?: number;
  entryCount?: number;
}

/**
 * Calculate Purchased Goods & Services emissions (Scope 3, Category 1)
 */
export async function calculatePurchasedGoodsEmissions(companyId: number): Promise<EmissionsResult> {
  try {
    console.log('🔍 Calculating purchased goods for company', companyId);
    
    const companyProducts = await db
      .select()
      .from(products)
      .where(eq(products.companyId, companyId));

    console.log('📦 Found', companyProducts.length, 'products for emissions calculation');
    console.log('📦 Product details:', companyProducts.map(p => ({ id: p.id, name: p.name, volume: p.annualProductionVolume })));

    let totalEmissions = 0;
    const breakdown: Record<string, number> = {};
    const details: Array<{productId: number; name: string; emissions: number}> = [];

    for (const product of companyProducts) {
      console.log('🧮 Processing product:', product.name, `(ID: ${product.id})`);
      
      // Use OpenLCA methodology for authoritative emissions calculation
      let productEmissions = 0; // kg CO2e per unit
      
      // Calculate OpenLCA-based emissions for ingredients
      if (product.ingredients && Array.isArray(product.ingredients)) {
        console.log('🧮 Calculating OpenLCA-based emissions for', product.name);
        console.log('📋 Found', product.ingredients.length, 'ingredients');
        
        for (const ingredient of product.ingredients) {
          if (ingredient.name && ingredient.amount) {
            try {
              // Use OpenLCA service for ecoinvent data (matches individual product calculation)
              const { OpenLCAService } = await import('./OpenLCAService');
              const impactData = await OpenLCAService.calculateIngredientImpact(ingredient.name, parseFloat(ingredient.amount), 'kg');
              
              if (impactData && impactData.carbonFootprint > 0) {
                productEmissions += impactData.carbonFootprint;
                console.log(`🌱 OpenLCA ${ingredient.name}: ${ingredient.amount} kg = ${impactData.carbonFootprint.toFixed(3)} kg CO2e`);
                breakdown[ingredient.name] = (breakdown[ingredient.name] || 0) + impactData.carbonFootprint;
              } else {
                console.log(`⚠️ No OpenLCA data for ${ingredient.name} - skipped`);
              }
            } catch (error) {
              console.error(`Error calculating OpenLCA impact for ${ingredient.name}:`, error);
            }
          }
        }
      }

      // Calculate OpenLCA-based packaging emissions  
      if (product.bottleWeight && product.bottleRecycledContent) {
        const bottleWeightG = parseFloat(product.bottleWeight);
        const recycledContent = parseFloat(product.bottleRecycledContent) / 100;
        
        // Use OpenLCA glass calculation (matches individual product calculation)
        const glassFootprintFactor = 0.487; // kg CO2e per kg glass (virgin)
        const recycledGlassFootprintFactor = 0.314; // kg CO2e per kg glass (recycled)
        
        const virginPortion = 1 - recycledContent;
        const recycledPortion = recycledContent;
        
        const bottleEmissions = (bottleWeightG / 1000) * (
          virginPortion * glassFootprintFactor + 
          recycledPortion * recycledGlassFootprintFactor
        );
        
        productEmissions += bottleEmissions;
        console.log(`🍾 Glass bottle: ${bottleWeightG}g, ${(recycledContent*100).toFixed(2)}% recycled = ${bottleEmissions.toFixed(3)} kg CO2e`);
        breakdown['Glass Packaging'] = (breakdown['Glass Packaging'] || 0) + bottleEmissions;
      }

      // NOTE: Facility impacts are excluded from Purchased Goods & Services to avoid double-counting with Scope 1 & 2

      // Calculate total annual emissions for this product
      const annualVolume = parseFloat(product.annualProductionVolume || '1');
      const annualProductEmissions = productEmissions * annualVolume; // kg CO2e
      
      console.log(`✅ Purchased Goods calculation for ${product.name}: ${productEmissions.toFixed(3)} kg CO₂e per unit`);
      const ingredientEmissions = productEmissions - (breakdown['Glass Packaging'] || 0);
      console.log(`📋 Breakdown: ${ingredientEmissions.toFixed(3)} kg (ingredients) + ${(breakdown['Glass Packaging'] || 0).toFixed(3)} kg (packaging) - excludes facility impacts`);
      console.log(`📊 ${product.name} per-unit emissions: ${productEmissions.toFixed(3)} kg CO₂e per unit`);
      console.log(`🏭 ${product.name} annual production: ${annualVolume.toLocaleString()} units`);
      console.log(`🌍 ${product.name} total annual emissions: ${(annualProductEmissions/1000).toFixed(1)} tonnes CO₂e`);
      
      totalEmissions += annualProductEmissions;
      details.push({
        productId: product.id,
        name: product.name,
        emissions: annualProductEmissions
      });
    }

    // Convert from kg to tonnes
    const totalInTonnes = totalEmissions / 1000;
    
    console.log(`🧮 TOTAL Purchased Goods & Services: ${totalInTonnes.toFixed(3)} tonnes CO₂e from ${companyProducts.length} products`);
    console.log(`📋 Total breakdown by category:`, Object.fromEntries(
      Object.entries(breakdown).map(([key, value]) => [key, `${(value / 1000).toFixed(3)} tonnes`])
    ));
    
    return {
      totalEmissions: totalInTonnes,
      breakdown: Object.fromEntries(
        Object.entries(breakdown).map(([key, value]) => [key, value / 1000])
      ),
      details: details,
      productCount: companyProducts.length
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

    // Calculate upstream emissions from facility natural gas consumption
    // Import MonthlyDataAggregationService to get facility consumption data
    const { MonthlyDataAggregationService } = await import('./MonthlyDataAggregationService');
    const monthlyService = new MonthlyDataAggregationService();
    
    try {
      const aggregatedData = await monthlyService.aggregateMonthlyData(companyId);
      const annualNaturalGasM3 = aggregatedData.totalNaturalGasM3;
      
      if (annualNaturalGasM3 > 0) {
        // Upstream natural gas emissions factor (wellhead-to-burner): 2.044 - 1.8514 = 0.1926 kg CO2e/m³
        const naturalGasUpstreamFactor = 0.1926; // DEFRA 2024: full lifecycle - direct combustion
        const naturalGasUpstreamEmissions = annualNaturalGasM3 * naturalGasUpstreamFactor;
        
        totalEmissions += naturalGasUpstreamEmissions;
        breakdown['Natural Gas (Upstream)'] = naturalGasUpstreamEmissions;
        
        console.log(`🔥 Natural Gas Upstream (Scope 3): ${annualNaturalGasM3.toLocaleString()} m³ × ${naturalGasUpstreamFactor} = ${naturalGasUpstreamEmissions.toFixed(1)} kg CO2e`);
      }
    } catch (facilityError) {
      console.error('Error fetching facility natural gas data for upstream calculation:', facilityError);
    }

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