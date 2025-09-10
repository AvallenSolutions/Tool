import { db } from "../db";
import { products } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { MonthlyDataAggregationService } from "./MonthlyDataAggregationService";

export interface WaterFootprintBreakdown {
  total: number;
  agricultural_water: number;
  processing_and_dilution_water: number;
  net_operational_water: number;
}

export class WaterFootprintService {
  /**
   * Calculate complete water footprint using real data from existing platform APIs
   * Uses actual data from Company Operations and Products Impact Breakdown
   */
  static async calculateTotalCompanyFootprint(companyId: number): Promise<WaterFootprintBreakdown> {
    try {
      console.log(`🌊 Calculating water footprint for company ${companyId} using REAL DATA ONLY`);
      
      // 1. Get facility water from MonthlyDataAggregationService (Company Operations)
      const facilityWater = await this.getFacilityWaterFromMonthlyData(companyId);
      
      // 2. Get ingredients + packaging water from Products refined-lca API 
      const { ingredientsWater, packagingWater } = await this.getProductsWaterFromRefinedLCA(companyId);
      
      // 3. Calculate totals using real data
      const total = facilityWater + ingredientsWater + packagingWater;
      
      console.log(`🌊 REAL DATA BREAKDOWN:`);
      console.log(`   Facility (Operations): ${facilityWater.toLocaleString()}L`);
      console.log(`   Ingredients: ${ingredientsWater.toLocaleString()}L`);
      console.log(`   Packaging: ${packagingWater.toLocaleString()}L`);
      console.log(`   TOTAL: ${total.toLocaleString()}L`);
      
      return {
        total,
        agricultural_water: ingredientsWater,
        processing_and_dilution_water: packagingWater,
        net_operational_water: facilityWater
      };
    } catch (error) {
      console.error('Error calculating water footprint:', error);
      throw new Error('Failed to calculate water footprint breakdown');
    }
  }
  
  /**
   * Get facility water data from MonthlyDataAggregationService (Company Operations)
   * Returns total water consumption from facility operations in liters
   */
  private static async getFacilityWaterFromMonthlyData(companyId: number): Promise<number> {
    try {
      const monthlyService = new MonthlyDataAggregationService();
      const aggregatedData = await monthlyService.aggregateMonthlyData(companyId);
      
      // Convert from m³ to liters (1 m³ = 1,000 L)
      const facilityWaterLiters = aggregatedData.totalWaterM3 * 1000;
      
      console.log(`🏭 Facility water from monthly data: ${aggregatedData.totalWaterM3} m³ = ${facilityWaterLiters.toLocaleString()}L`);
      
      return facilityWaterLiters;
    } catch (error) {
      console.error('Error fetching facility water from monthly data:', error);
      return 0;
    }
  }
  
  /**
   * Get ingredients and packaging water from Products refined-lca API
   * Returns breakdown from actual Impact Breakdown by Component data
   */
  private static async getProductsWaterFromRefinedLCA(companyId: number): Promise<{ingredientsWater: number, packagingWater: number}> {
    try {
      // Get all products for the company
      const companyProducts = await db
        .select({
          id: products.id,
          annualProductionVolume: products.annualProductionVolume
        })
        .from(products)
        .where(eq(products.companyId, companyId));
      
      let totalIngredientsWater = 0;
      let totalPackagingWater = 0;
      
      for (const product of companyProducts) {
        const productionVolume = Number(product.annualProductionVolume) || 0;
        
        // Call refined-lca API for this product to get Impact Breakdown by Component
        const response = await fetch(`http://localhost:5000/api/products/${product.id}/refined-lca`);
        if (!response.ok) {
          console.warn(`Failed to fetch refined-lca for product ${product.id}`);
          continue;
        }
        
        const lcaData = await response.json();
        
        if (lcaData.success && lcaData.data && lcaData.data.breakdown) {
          const breakdown = lcaData.data.breakdown;
          
          // Get per-unit water impacts
          const ingredientsWaterPerUnit = breakdown.ingredients?.water || 0;
          const packagingWaterPerUnit = breakdown.packaging?.water || 0;
          
          // Scale by production volume
          const productIngredientsWater = ingredientsWaterPerUnit * productionVolume;
          const productPackagingWater = packagingWaterPerUnit * productionVolume;
          
          totalIngredientsWater += productIngredientsWater;
          totalPackagingWater += productPackagingWater;
          
          console.log(`📦 Product ${product.id}: Ingredients=${ingredientsWaterPerUnit}L × ${productionVolume} = ${productIngredientsWater.toLocaleString()}L`);
          console.log(`📦 Product ${product.id}: Packaging=${packagingWaterPerUnit}L × ${productionVolume} = ${productPackagingWater.toLocaleString()}L`);
        }
      }
      
      return {
        ingredientsWater: totalIngredientsWater,
        packagingWater: totalPackagingWater
      };
    } catch (error) {
      console.error('Error calculating products water from refined-lca:', error);
      return { ingredientsWater: 0, packagingWater: 0 };
    }
  }
}