import { db } from "../db";
import { products, companyData } from "../../shared/schema";
import { eq, and, isNotNull } from "drizzle-orm";

export interface WaterFootprintBreakdown {
  total: number;
  agricultural_water: number;
  processing_and_dilution_water: number;
  net_operational_water: number;
}

export class WaterFootprintService {
  /**
   * Calculate the complete water footprint breakdown for a company
   * Prevents double-counting by allocating metered water between processing and operational use
   */
  static async calculateTotalCompanyFootprint(companyId: number): Promise<WaterFootprintBreakdown> {
    try {
      // 1. Calculate Total Agricultural Water from LCA data
      const agriculturalWater = await this.calculateAgriculturalWater(companyId);
      
      // 2. Calculate Total Processing & Dilution Water from LCA data
      const processingAndDilutionWater = await this.calculateProcessingAndDilutionWater(companyId);
      
      // 3. Fetch Total Metered Water from company_data
      const totalMeteredWater = await this.getTotalMeteredWater(companyId);
      
      // 4. Calculate Net Operational Water (avoiding double-counting)
      const netOperationalWater = Math.max(0, totalMeteredWater - processingAndDilutionWater);
      
      // 5. Calculate total water footprint
      const total = agriculturalWater + processingAndDilutionWater + netOperationalWater;
      
      return {
        total,
        agricultural_water: agriculturalWater,
        processing_and_dilution_water: processingAndDilutionWater,
        net_operational_water: netOperationalWater
      };
    } catch (error) {
      console.error('Error calculating water footprint:', error);
      throw new Error('Failed to calculate water footprint breakdown');
    }
  }
  
  /**
   * Calculate agricultural water usage from all product LCAs
   * This represents off-site water used for ingredient production
   */
  private static async calculateAgriculturalWater(companyId: number): Promise<number> {
    try {
      // Get all products with ingredients data for the company
      const companyProducts = await db
        .select({
          id: products.id,
          annualProductionVolume: products.annualProductionVolume,
          productionUnit: products.productionUnit,
          ingredients: products.ingredients,
          waterFootprint: products.waterFootprint
        })
        .from(products)
        .where(eq(products.companyId, companyId));
      
      let totalAgriculturalWater = 0;
      
      for (const product of companyProducts) {
        const productionVolume = Number(product.annualProductionVolume) || 0;
        
        // Extract agricultural water from ingredients data
        if (product.ingredients && Array.isArray(product.ingredients)) {
          let ingredientWater = 0;
          for (const ingredient of product.ingredients) {
            // Cast to any to access waterUsage field which exists in actual data but not in type definition
            const ingredientData = ingredient as any;
            if (ingredientData.waterUsage) {
              ingredientWater += Number(ingredientData.waterUsage) || 0;
            }
          }
          // Convert liters to liters (no conversion needed, keeping in liters for internal calculation)
          totalAgriculturalWater += ingredientWater * productionVolume;
          continue;
        }
        
        // Fallback: use water footprint if available (estimate 70% is agricultural)
        if (product.waterFootprint) {
          const perUnitWater = Number(product.waterFootprint) * 0.7;
          totalAgriculturalWater += perUnitWater * productionVolume;
        }
      }
      
      return totalAgriculturalWater;
    } catch (error) {
      console.error('Error calculating agricultural water:', error);
      return 0;
    }
  }
  
  /**
   * Calculate processing and dilution water from LCA data
   * This represents on-site water that goes directly into the product
   */
  private static async calculateProcessingAndDilutionWater(companyId: number): Promise<number> {
    try {
      const companyProducts = await db
        .select({
          id: products.id,
          annualProductionVolume: products.annualProductionVolume,
          waterDilution: products.waterDilution,
          volume: products.volume
        })
        .from(products)
        .where(eq(products.companyId, companyId));
      
      let totalProcessingWater = 0;
      
      for (const product of companyProducts) {
        const productionVolume = Number(product.annualProductionVolume) || 0;
        
        // Calculate water dilution if specified
        if (product.waterDilution) {
          try {
            const dilutionData = typeof product.waterDilution === 'string' 
              ? JSON.parse(product.waterDilution) 
              : product.waterDilution;
            
            if (dilutionData?.amount) {
              const dilutionAmount = Number(dilutionData.amount);
              totalProcessingWater += dilutionAmount * productionVolume;
            }
          } catch (error) {
            console.error('Error parsing water dilution data:', error);
          }
        }
        
        // Add processing water estimates based on product type and volume
        if (product.volume) {
          const volumeMatch = product.volume.match(/(\d+(?:\.\d+)?)/);
          if (volumeMatch) {
            const volumeValue = parseFloat(volumeMatch[1]);
            const volumeInLiters = product.volume.includes('L') ? volumeValue : volumeValue / 1000;
            
            // Processing water factors (L water per L product)
            const processingFactor = 3; // Conservative estimate for spirits/beverages
            const processingWaterPerUnit = volumeInLiters * processingFactor;
            totalProcessingWater += processingWaterPerUnit * productionVolume;
          }
        }
      }
      
      return totalProcessingWater;
    } catch (error) {
      console.error('Error calculating processing water:', error);
      return 0;
    }
  }
  
  /**
   * Get total metered water consumption from utility bills
   */
  private static async getTotalMeteredWater(companyId: number): Promise<number> {
    try {
      const companyWaterData = await db
        .select({
          waterConsumption: companyData.waterConsumption
        })
        .from(companyData)
        .where(eq(companyData.companyId, companyId))
        .orderBy(companyData.createdAt)
        .limit(1);
      
      if (companyWaterData.length > 0 && companyWaterData[0].waterConsumption) {
        return Number(companyWaterData[0].waterConsumption);
      }
      
      return 0;
    } catch (error) {
      console.error('Error fetching metered water data:', error);
      return 0;
    }
  }
}