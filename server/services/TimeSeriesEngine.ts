import { db } from "../db";
import { eq, and, lte, gte, desc, asc } from "drizzle-orm";
import { 
  monthlyFacilityData,
  productVersions,
  kpiSnapshots,
  kpiDefinitions,
  companyKpiGoals,
  products,
  lcaQuestionnaires,
  type MonthlyFacilityData,
  type ProductVersion,
  type KpiSnapshot
} from "@shared/schema";
import { KPICalculationService } from "./kpiService";

export class TimeSeriesEngine {
  private kpiCalculationService: KPICalculationService;

  constructor() {
    this.kpiCalculationService = new KPICalculationService();
  }

  /**
   * Calculate KPI value for a specific month using time-aware data
   */
  async calculateKPIForMonth(
    kpiDefinitionId: string, 
    companyId: number, 
    targetMonth: Date
  ): Promise<number> {
    try {
      console.log(`📊 Calculating KPI ${kpiDefinitionId} for company ${companyId} at ${targetMonth.toISOString()}`);

      // Get KPI definition
      const [kpiDefinition] = await db
        .select()
        .from(kpiDefinitions)
        .where(eq(kpiDefinitions.id, kpiDefinitionId));

      if (!kpiDefinition) {
        console.error(`KPI definition not found: ${kpiDefinitionId}`);
        return 0;
      }

      // Get facility data for the target month
      const facilityData = await this.getFacilityDataForMonth(companyId, targetMonth);
      
      // Get product versions active during the target month
      const productVersions = await this.getProductVersionsForDate(companyId, targetMonth);

      // Use the enhanced calculation with time-aware data
      const value = await this.calculateKPIWithTimeAwareData(
        kpiDefinition,
        companyId,
        targetMonth,
        facilityData,
        productVersions
      );

      console.log(`📈 KPI ${kpiDefinition.kpiName} calculated: ${value.toFixed(4)} ${kpiDefinition.unit}`);
      return value;

    } catch (error) {
      console.error(`Error calculating KPI for month:`, error);
      return 0;
    }
  }

  /**
   * Get facility data for a specific month
   */
  async getFacilityDataForMonth(companyId: number, month: Date): Promise<MonthlyFacilityData | null> {
    try {
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      
      const [facilityData] = await db
        .select()
        .from(monthlyFacilityData)
        .where(
          and(
            eq(monthlyFacilityData.companyId, companyId),
            eq(monthlyFacilityData.month, monthStart.toISOString().split('T')[0])
          )
        );

      return facilityData || null;
    } catch (error) {
      console.error(`Error getting facility data for month:`, error);
      return null;
    }
  }

  /**
   * Get all product versions for a company that were active on a specific date
   */
  async getProductVersionsForDate(companyId: number, targetDate: Date): Promise<ProductVersion[]> {
    try {
      const versions = await db
        .select({
          id: productVersions.id,
          productId: productVersions.productId,
          versionNumber: productVersions.versionNumber,
          effectiveDate: productVersions.effectiveDate,
          lcaQuestionnaireId: productVersions.lcaQuestionnaireId,
          isActive: productVersions.isActive,
          createdAt: productVersions.createdAt,
          updatedAt: productVersions.updatedAt,
        })
        .from(productVersions)
        .innerJoin(products, eq(products.id, productVersions.productId))
        .where(
          and(
            eq(products.companyId, companyId),
            lte(productVersions.effectiveDate, targetDate.toISOString().split('T')[0]),
            eq(productVersions.isActive, true)
          )
        )
        .orderBy(asc(productVersions.productId), desc(productVersions.effectiveDate));

      // Get the latest version for each product that was active on the target date
      const latestVersions: ProductVersion[] = [];
      const seenProducts = new Set<number>();

      for (const version of versions) {
        if (!seenProducts.has(version.productId)) {
          latestVersions.push(version);
          seenProducts.add(version.productId);
        }
      }

      console.log(`📦 Found ${latestVersions.length} product versions active on ${targetDate.toISOString().split('T')[0]}`);
      return latestVersions;

    } catch (error) {
      console.error(`Error getting product versions for date:`, error);
      return [];
    }
  }

  /**
   * Get a specific product version that was active on a given date
   */
  async getProductVersionForDate(productId: number, targetDate: Date): Promise<ProductVersion | null> {
    try {
      const [version] = await db
        .select()
        .from(productVersions)
        .where(
          and(
            eq(productVersions.productId, productId),
            lte(productVersions.effectiveDate, targetDate.toISOString().split('T')[0]),
            eq(productVersions.isActive, true)
          )
        )
        .orderBy(desc(productVersions.effectiveDate))
        .limit(1);

      return version || null;
    } catch (error) {
      console.error(`Error getting product version for date:`, error);
      return null;
    }
  }

  /**
   * Calculate KPI value using time-aware data sources
   */
  private async calculateKPIWithTimeAwareData(
    kpiDefinition: any,
    companyId: number,
    targetMonth: Date,
    facilityData: MonthlyFacilityData | null,
    productVersions: ProductVersion[]
  ): Promise<number> {
    try {
      const formulaJson = kpiDefinition.formulaJson;

      // Handle ratio calculations (numerator/denominator)
      if (formulaJson.numerator && formulaJson.denominator) {
        const numerator = await this.getTimeAwareDataPoint(
          formulaJson.numerator,
          companyId,
          targetMonth,
          facilityData,
          productVersions
        );
        const denominator = await this.getTimeAwareDataPoint(
          formulaJson.denominator,
          companyId,
          targetMonth,
          facilityData,
          productVersions
        );

        if (denominator === 0) return 0;
        return Number((numerator / denominator).toFixed(4));
      }

      // Handle simple data point references
      if (formulaJson.dataPoint) {
        return await this.getTimeAwareDataPoint(
          formulaJson.dataPoint,
          companyId,
          targetMonth,
          facilityData,
          productVersions
        );
      }

      return 0;
    } catch (error) {
      console.error('Error calculating KPI with time-aware data:', error);
      return 0;
    }
  }

  /**
   * Get data point value using time-aware sources
   */
  private async getTimeAwareDataPoint(
    dataPoint: string,
    companyId: number,
    targetMonth: Date,
    facilityData: MonthlyFacilityData | null,
    productVersions: ProductVersion[]
  ): Promise<number> {
    try {
      switch (dataPoint) {
        case 'total_carbon_footprint':
          return await this.calculateTimeAwareCarbonFootprint(companyId, targetMonth, productVersions);
        
        case 'total_production_volume':
          return await this.calculateTimeAwareProductionVolume(companyId, targetMonth, facilityData, productVersions);
        
        case 'total_water_consumption':
          return await this.calculateTimeAwareWaterConsumption(companyId, targetMonth, facilityData);
        
        case 'total_energy_consumption':
          return await this.calculateTimeAwareEnergyConsumption(companyId, targetMonth, facilityData);
        
        case 'renewable_energy_kwh':
          return await this.calculateTimeAwareRenewableEnergy(companyId, targetMonth, facilityData);
        
        case 'total_energy_kwh':
          return await this.calculateTimeAwareTotalEnergy(companyId, targetMonth, facilityData);
        
        // For data points not yet time-aware, fall back to current calculation
        default:
          console.warn(`⚠️ Data point ${dataPoint} not yet time-aware, using current calculation`);
          return await this.kpiCalculationService.getDataPoint(dataPoint, companyId);
      }
    } catch (error) {
      console.error(`Error getting time-aware data point ${dataPoint}:`, error);
      return 0;
    }
  }

  /**
   * Calculate carbon footprint using product versions from specific month
   */
  private async calculateTimeAwareCarbonFootprint(
    companyId: number,
    targetMonth: Date,
    productVersions: ProductVersion[]
  ): Promise<number> {
    try {
      // Get facility data for the specific month to calculate time-aware carbon footprint
      const facilityData = await this.getFacilityDataForMonth(companyId, targetMonth);
      
      if (!facilityData) {
        // If no facility data for this month, use current calculation as fallback
        console.log(`⚠️ No facility data for ${targetMonth.toISOString()}, using current calculation`);
        return await this.kpiCalculationService.calculateTotalCarbonFootprint(companyId);
      }

      // Calculate carbon footprint based on actual monthly facility data
      let totalCarbonFootprint = 0;

      // Get electricity consumption and convert to CO2e
      const electricityKwh = Number(facilityData.electricityKwh) || 0;
      const gridEmissionFactor = 0.22535; // kg CO2e per kWh (UK grid average)
      const electricityEmissions = electricityKwh * gridEmissionFactor;

      // Get natural gas consumption and convert to CO2e  
      const gasM3 = Number(facilityData.naturalGasM3) || 0;
      const gasEmissionFactor = 1.8514; // kg CO2e per m³ (natural gas)
      const gasEmissions = gasM3 * gasEmissionFactor;

      // Calculate facility-based emissions
      const facilityEmissions = electricityEmissions + gasEmissions;

      // Scale to annual based on production volume for this month
      const monthlyProduction = Number(facilityData.productionVolume) || 0;
      const annualProduction = monthlyProduction * 12; // Approximate annual from monthly

      // Get product-based emissions (ingredients + packaging)
      const companyProducts = await db
        .select()
        .from(products)
        .where(eq(products.companyId, companyId));

      let productBasedEmissions = 0;
      for (const product of companyProducts) {
        const productLCA = await this.kpiCalculationService.calculateProductRefinedLCA(product);
        const ingredientsAndPackaging = productLCA.breakdown.ingredients.co2e + productLCA.breakdown.packaging.co2e;
        productBasedEmissions += ingredientsAndPackaging * annualProduction;
      }

      // Combine facility and product emissions
      totalCarbonFootprint = facilityEmissions * 12 + productBasedEmissions; // Annualize facility emissions

      console.log(`📊 Time-aware carbon footprint for ${targetMonth.toISOString()}: ${totalCarbonFootprint.toFixed(1)} kg CO2e`);
      console.log(`   Facility: ${(facilityEmissions * 12).toFixed(1)} kg CO2e/year, Products: ${productBasedEmissions.toFixed(1)} kg CO2e/year`);
      
      return totalCarbonFootprint;

    } catch (error) {
      console.error('Error calculating time-aware carbon footprint:', error);
      // Fallback to current calculation
      return await this.kpiCalculationService.calculateTotalCarbonFootprint(companyId);
    }
  }

  /**
   * Calculate production volume using monthly facility data
   */
  private async calculateTimeAwareProductionVolume(
    companyId: number,
    targetMonth: Date,
    facilityData: MonthlyFacilityData | null,
    productVersions: ProductVersion[]
  ): Promise<number> {
    if (facilityData?.productionVolume) {
      return Number(facilityData.productionVolume);
    }
    
    // Fallback to current calculation
    return await this.kpiCalculationService.calculateTotalProductionVolume(companyId);
  }

  /**
   * Calculate water consumption using monthly facility data
   */
  private async calculateTimeAwareWaterConsumption(
    companyId: number,
    targetMonth: Date,
    facilityData: MonthlyFacilityData | null
  ): Promise<number> {
    if (facilityData?.waterM3) {
      return Number(facilityData.waterM3) * 1000; // Convert m³ to liters
    }
    
    // Fallback to current calculation
    return await this.kpiCalculationService.calculateTotalWaterConsumption(companyId);
  }

  /**
   * Calculate energy consumption using monthly facility data
   */
  private async calculateTimeAwareEnergyConsumption(
    companyId: number,
    targetMonth: Date,
    facilityData: MonthlyFacilityData | null
  ): Promise<number> {
    let totalEnergy = 0;
    
    if (facilityData?.electricityKwh) {
      totalEnergy += Number(facilityData.electricityKwh);
    }
    
    if (facilityData?.naturalGasM3) {
      // Convert m³ of natural gas to kWh (approximate conversion: 1 m³ ≈ 10.55 kWh)
      totalEnergy += Number(facilityData.naturalGasM3) * 10.55;
    }
    
    if (totalEnergy > 0) {
      return totalEnergy;
    }
    
    // Fallback to current calculation
    return await this.kpiCalculationService.calculateTotalEnergyConsumption(companyId);
  }

  /**
   * Calculate renewable energy using monthly facility data
   */
  private async calculateTimeAwareRenewableEnergy(
    companyId: number,
    targetMonth: Date,
    facilityData: MonthlyFacilityData | null
  ): Promise<number> {
    // This would need additional facility data fields for renewable energy breakdown
    // For now, fallback to current calculation
    return await this.kpiCalculationService.calculateRenewableEnergyKwh(companyId);
  }

  /**
   * Calculate total energy using monthly facility data
   */
  private async calculateTimeAwareTotalEnergy(
    companyId: number,
    targetMonth: Date,
    facilityData: MonthlyFacilityData | null
  ): Promise<number> {
    return await this.calculateTimeAwareEnergyConsumption(companyId, targetMonth, facilityData);
  }

  /**
   * Get historical KPI snapshots for a specific KPI
   */
  async getKPIHistory(
    kpiDefinitionId: string,
    companyId: number,
    monthsBack: number = 12
  ): Promise<KpiSnapshot[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsBack);

      const snapshots = await db
        .select()
        .from(kpiSnapshots)
        .where(
          and(
            eq(kpiSnapshots.companyId, companyId),
            eq(kpiSnapshots.kpiDefinitionId, kpiDefinitionId),
            gte(kpiSnapshots.snapshotDate, startDate.toISOString().split('T')[0]),
            lte(kpiSnapshots.snapshotDate, endDate.toISOString().split('T')[0])
          )
        )
        .orderBy(asc(kpiSnapshots.snapshotDate));

      console.log(`📈 Retrieved ${snapshots.length} historical snapshots for KPI ${kpiDefinitionId}`);
      return snapshots;

    } catch (error) {
      console.error(`Error getting KPI history:`, error);
      return [];
    }
  }

  /**
   * Get KPI snapshots for a date range
   */
  async getKPIHistoryForDateRange(
    kpiDefinitionId: string,
    companyId: number,
    startDate: Date,
    endDate: Date
  ): Promise<KpiSnapshot[]> {
    try {
      const snapshots = await db
        .select()
        .from(kpiSnapshots)
        .where(
          and(
            eq(kpiSnapshots.companyId, companyId),
            eq(kpiSnapshots.kpiDefinitionId, kpiDefinitionId),
            gte(kpiSnapshots.snapshotDate, startDate.toISOString().split('T')[0]),
            lte(kpiSnapshots.snapshotDate, endDate.toISOString().split('T')[0])
          )
        )
        .orderBy(asc(kpiSnapshots.snapshotDate));

      return snapshots;
    } catch (error) {
      console.error(`Error getting KPI history for date range:`, error);
      return [];
    }
  }
}

export const timeSeriesEngine = new TimeSeriesEngine();