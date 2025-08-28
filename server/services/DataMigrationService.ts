import { db } from '../db';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { monthlyFacilityData, productVersions, kpiSnapshots } from '@shared/schema';
import { enhancedKpiService } from './kpiService';
import { TimeSeriesEngine } from './TimeSeriesEngine';
import { KPISnapshotService } from './KPISnapshotService';

export class DataMigrationService {
  private timeSeriesEngine: TimeSeriesEngine;
  private kpiSnapshotService: KPISnapshotService;

  constructor() {
    this.timeSeriesEngine = new TimeSeriesEngine();
    this.kpiSnapshotService = new KPISnapshotService();
  }

  /**
   * Phase 4: Complete data migration for time-series system
   */
  async executeCompleteMigration(companyId: number): Promise<{
    facilityDataBackfilled: number;
    productVersionsCreated: number;
    kpiSnapshotsGenerated: number;
    migrationSummary: {
      monthsBackfilled: number;
      startDate: string;
      endDate: string;
      dataQuality: 'estimated' | 'interpolated' | 'actual';
    };
  }> {
    console.log(`🔄 Starting Phase 4: Complete Data Migration for company ${companyId}`);

    try {
      // Step 1: Backfill historical facility data
      const facilityDataResult = await this.backfillHistoricalFacilityData(companyId);
      
      // Step 2: Create product versions for existing products
      const productVersionsResult = await this.createProductVersions(companyId);
      
      // Step 3: Generate historical KPI snapshots
      const kpiSnapshotsResult = await this.generateHistoricalKPISnapshots(companyId);

      const migrationSummary = {
        facilityDataBackfilled: facilityDataResult.recordsCreated,
        productVersionsCreated: productVersionsResult.versionsCreated,
        kpiSnapshotsGenerated: kpiSnapshotsResult.snapshotsCreated,
        migrationSummary: {
          monthsBackfilled: 12,
          startDate: this.getMonthString(-11), // 12 months ago
          endDate: this.getMonthString(0), // Current month
          dataQuality: 'interpolated' as const
        }
      };

      console.log(`✅ Phase 4 Migration Complete:`, migrationSummary);
      return migrationSummary;
    } catch (error) {
      console.error('❌ Phase 4 Migration failed:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  /**
   * Backfill historical facility data using intelligent estimation
   */
  private async backfillHistoricalFacilityData(companyId: number): Promise<{
    recordsCreated: number;
    method: string;
  }> {
    console.log(`📊 Backfilling historical facility data for company ${companyId}`);

    // Check if any monthly data already exists
    const existingData = await db.select()
      .from(monthlyFacilityData)
      .where(eq(monthlyFacilityData.companyId, companyId))
      .limit(1);

    if (existingData.length > 0) {
      console.log(`⚠️ Facility data already exists for company ${companyId}, skipping backfill`);
      return { recordsCreated: 0, method: 'already_exists' };
    }

    // Get current production data for estimation
    const companyData = await this.getCompanyProductionMetrics(companyId);
    
    const monthsToBackfill = 12;
    const recordsCreated = [];

    for (let i = monthsToBackfill - 1; i >= 0; i--) {
      const monthStr = this.getMonthString(-i);
      
      // Apply seasonal variation and trends to make data realistic
      const seasonalFactor = this.getSeasonalFactor(i);
      const trendFactor = this.getTrendFactor(i, monthsToBackfill);
      
      const estimatedData = {
        companyId,
        month: monthStr,
        electricityKwh: this.estimateElectricity(companyData.annualProduction, seasonalFactor, trendFactor),
        naturalGasM3: this.estimateNaturalGas(companyData.annualProduction, seasonalFactor, trendFactor),
        waterM3: this.estimateWater(companyData.annualProduction, seasonalFactor, trendFactor),
        productionVolume: this.estimateMonthlyProduction(companyData.annualProduction, seasonalFactor),
        utilityBillUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        await db.insert(monthlyFacilityData).values(estimatedData);
        recordsCreated.push(monthStr);
        console.log(`✓ Created facility data for ${monthStr}`);
      } catch (error) {
        console.error(`❌ Failed to create facility data for ${monthStr}:`, error);
      }
    }

    console.log(`📈 Backfilled ${recordsCreated.length} months of facility data using intelligent estimation`);
    return { recordsCreated: recordsCreated.length, method: 'intelligent_estimation' };
  }

  /**
   * Create product versions for existing products
   */
  private async createProductVersions(companyId: number): Promise<{
    versionsCreated: number;
    products: string[];
  }> {
    console.log(`📦 Creating product versions for company ${companyId}`);

    // Get all products for the company
    const products = await db.query.products.findMany({
      where: (products, { eq }) => eq(products.companyId, companyId)
    });

    const versionsCreated = [];

    for (const product of products) {
      // Check if version already exists
      const existingVersion = await db.select()
        .from(productVersions)
        .where(eq(productVersions.productId, product.id))
        .limit(1);

      if (existingVersion.length > 0) {
        console.log(`⚠️ Version already exists for product ${product.name}`);
        continue;
      }

      const versionData = {
        productId: product.id,
        version: '1.0',
        versionDate: this.getMonthString(-11), // Start from 12 months ago
        changeDescription: 'Initial product version created during migration',
        metadata: {
          migrationSource: 'phase4_migration',
          originalCreatedAt: product.createdAt,
          migrationDate: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        await db.insert(productVersions).values(versionData);
        versionsCreated.push(product.name);
        console.log(`✓ Created version 1.0 for product: ${product.name}`);
      } catch (error) {
        console.error(`❌ Failed to create version for product ${product.name}:`, error);
      }
    }

    console.log(`📦 Created ${versionsCreated.length} product versions`);
    return { versionsCreated: versionsCreated.length, products: versionsCreated };
  }

  /**
   * Generate historical KPI snapshots using backfilled data
   */
  private async generateHistoricalKPISnapshots(companyId: number): Promise<{
    snapshotsCreated: number;
    kpisProcessed: string[];
  }> {
    console.log(`📊 Generating historical KPI snapshots for company ${companyId}`);

    // Get KPI definitions for the company
    const kpiDefinitions = [
      '170a5cca-9363-4a0a-88ec-ff1b046fe2d7', // Carbon Intensity per Bottle
      'f934598b-5367-4024-8c82-3ed92f48b7da', // Total Carbon Emissions
      '2bf9535d-c36a-4010-819e-61c0d8f1c555', // Water Efficiency
      '91bc4cba-d22a-40c8-92f0-a17876c2dc35', // Waste Reduction
      '0e0edb33-634a-4c27-8c4c-5ca856c255cb'  // Renewable Energy Usage
    ];

    let totalSnapshotsCreated = 0;
    const kpisProcessed = [];

    for (const kpiDefinitionId of kpiDefinitions) {
      try {
        console.log(`📈 Processing KPI: ${kpiDefinitionId}`);
        
        // Generate snapshots for the last 12 months
        for (let monthsBack = 11; monthsBack >= 0; monthsBack--) {
          const snapshotDate = this.getMonthString(-monthsBack);
          
          // Check if snapshot already exists
          const existingSnapshot = await db.select()
            .from(kpiSnapshots)
            .where(and(
              eq(kpiSnapshots.companyId, companyId),
              eq(kpiSnapshots.kpiDefinitionId, kpiDefinitionId),
              eq(kpiSnapshots.snapshotDate, snapshotDate)
            ))
            .limit(1);

          if (existingSnapshot.length > 0) {
            console.log(`⚠️ Snapshot already exists for ${kpiDefinitionId} on ${snapshotDate}`);
            continue;
          }

          // Calculate KPI value for this month using facility data
          const kpiValue = await this.calculateHistoricalKPIValue(
            companyId, 
            kpiDefinitionId, 
            snapshotDate
          );

          const snapshotData = {
            companyId,
            kpiDefinitionId,
            snapshotDate, // This is already a string in YYYY-MM-DD format
            value: kpiValue.toString(),
            metadata: {
              calculationMethod: 'historical_backfill',
              dataSource: 'facility_data_estimation',
              facilityDataMonth: snapshotDate,
              notes: 'Generated during Phase 4 migration with estimated facility data'
            }
          };

          await db.insert(kpiSnapshots).values(snapshotData);
          totalSnapshotsCreated++;
          console.log(`✓ Created snapshot for ${kpiDefinitionId} on ${snapshotDate}: ${kpiValue}`);
        }

        kpisProcessed.push(kpiDefinitionId);
      } catch (error) {
        console.error(`❌ Failed to process KPI ${kpiDefinitionId}:`, error);
      }
    }

    console.log(`📊 Generated ${totalSnapshotsCreated} KPI snapshots across ${kpisProcessed.length} KPIs`);
    return { snapshotsCreated: totalSnapshotsCreated, kpisProcessed };
  }

  /**
   * Calculate historical KPI value based on facility data
   */
  private async calculateHistoricalKPIValue(
    companyId: number, 
    kpiDefinitionId: string, 
    month: string
  ): Promise<number> {
    // Get facility data for the specific month
    const facilityData = await db.select()
      .from(monthlyFacilityData)
      .where(and(
        eq(monthlyFacilityData.companyId, companyId),
        eq(monthlyFacilityData.month, month)
      ))
      .limit(1);

    if (facilityData.length === 0) {
      console.warn(`⚠️ No facility data found for ${month}, using baseline estimation`);
      // Use a simple baseline estimation instead of complex service call
      return this.getEstimatedBaselineValue(kpiDefinitionId);
    }

    const data = facilityData[0];
    
    // Calculate time-aware KPI values based on the specific KPI
    switch (kpiDefinitionId) {
      case '170a5cca-9363-4a0a-88ec-ff1b046fe2d7': // Carbon Intensity per Bottle
        return this.calculateCarbonIntensity(data);
      
      case 'f934598b-5367-4024-8c82-3ed92f48b7da': // Total Carbon Emissions
        return this.calculateTotalEmissions(data);
      
      case '2bf9535d-c36a-4010-819e-61c0d8f1c555': // Water Efficiency
        return this.calculateWaterEfficiency(data);
      
      case '91bc4cba-d22a-40c8-92f0-a17876c2dc35': // Waste Reduction
        return this.calculateWasteReduction(data);
      
      case '0e0edb33-634a-4c27-8c4c-5ca856c255cb': // Renewable Energy Usage
        return this.calculateRenewableEnergyUsage(data);
      
      default:
        // Fallback to estimated baseline with slight variation
        const baselineValue = this.getEstimatedBaselineValue(kpiDefinitionId);
        return baselineValue * (0.9 + Math.random() * 0.2); // ±10% variation
    }
  }

  // Helper methods for KPI calculations
  private calculateCarbonIntensity(data: any): number {
    const electricityEmissions = parseFloat(data.electricityKwh || '0') * 0.233; // kg CO2e per kWh
    const gasEmissions = parseFloat(data.naturalGasM3 || '0') * 1.861; // kg CO2e per m3
    const totalEmissions = electricityEmissions + gasEmissions;
    const production = parseFloat(data.productionVolume || '1');
    return totalEmissions / production; // kg CO2e per unit
  }

  private calculateTotalEmissions(data: any): number {
    const electricityEmissions = parseFloat(data.electricityKwh || '0') * 0.233;
    const gasEmissions = parseFloat(data.naturalGasM3 || '0') * 1.861;
    return (electricityEmissions + gasEmissions) / 1000; // tonnes CO2e
  }

  private calculateWaterEfficiency(data: any): number {
    const waterUsed = parseFloat(data.waterM3 || '0') * 1000; // liters
    const production = parseFloat(data.productionVolume || '1');
    return waterUsed / production; // liters per unit
  }

  private calculateWasteReduction(data: any): number {
    const production = parseFloat(data.productionVolume || '1');
    // Estimate waste based on production (typical distillery: 3.8kg waste per 1000 units)
    return (production * 0.0038) / 1000; // tonnes waste
  }

  private calculateRenewableEnergyUsage(data: any): number {
    const totalElectricity = parseFloat(data.electricityKwh || '0');
    // Assume 25% renewable energy (can be updated with real data)
    return totalElectricity * 0.25;
  }

  /**
   * Get estimated baseline values for KPIs when no historical data exists
   */
  private getEstimatedBaselineValue(kpiDefinitionId: string): number {
    const estimatedBaselines: Record<string, number> = {
      '170a5cca-9363-4a0a-88ec-ff1b046fe2d7': 1.8, // Carbon Intensity per Bottle (kg CO₂e/bottle)
      'f934598b-5367-4024-8c82-3ed92f48b7da': 2.5, // Total Carbon Emissions (tonnes CO₂e)
      '2bf9535d-c36a-4010-819e-61c0d8f1c555': 8.5, // Water Efficiency (L/bottle)
      '91bc4cba-d22a-40c8-92f0-a17876c2dc35': 0.05, // Waste Reduction (%)
      '0e0edb33-634a-4c27-8c4c-5ca856c255cb': 25, // Renewable Energy Usage (%)
    };
    
    return estimatedBaselines[kpiDefinitionId] || 1.0;
  }

  // Utility methods
  private getMonthString(monthsOffset: number): string {
    const date = new Date();
    date.setMonth(date.getMonth() + monthsOffset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  }

  private getSeasonalFactor(monthsBack: number): number {
    const currentMonth = new Date().getMonth();
    const targetMonth = (currentMonth - monthsBack + 12) % 12;
    
    // Seasonal factors for distillery operations (higher in winter for heating)
    const seasonalFactors = [
      1.2, 1.2, 1.1, 0.9, 0.8, 0.8, // Jan-Jun
      0.8, 0.8, 0.9, 1.0, 1.1, 1.2  // Jul-Dec
    ];
    
    return seasonalFactors[targetMonth];
  }

  private getTrendFactor(monthsBack: number, totalMonths: number): number {
    // Linear improvement trend over time (5% improvement per year)
    const yearProgress = monthsBack / totalMonths;
    return 1.0 + (yearProgress * 0.05);
  }

  private estimateElectricity(annualProduction: number, seasonalFactor: number, trendFactor: number): string {
    // Base: 0.5 kWh per unit production
    const baseElectricity = (annualProduction / 12) * 0.5;
    const adjusted = baseElectricity * seasonalFactor * trendFactor;
    return Math.round(adjusted).toString();
  }

  private estimateNaturalGas(annualProduction: number, seasonalFactor: number, trendFactor: number): string {
    // Base: 0.08 m3 per unit production
    const baseGas = (annualProduction / 12) * 0.08;
    const adjusted = baseGas * seasonalFactor * trendFactor;
    return Math.round(adjusted).toString();
  }

  private estimateWater(annualProduction: number, seasonalFactor: number, trendFactor: number): string {
    // Base: 47 liters per unit (converted to m3)
    const baseWater = (annualProduction / 12) * 0.047;
    const adjusted = baseWater * seasonalFactor * trendFactor;
    return Math.round(adjusted).toString();
  }

  private estimateMonthlyProduction(annualProduction: number, seasonalFactor: number): string {
    const monthlyBase = annualProduction / 12;
    const adjusted = monthlyBase * seasonalFactor;
    return Math.round(adjusted).toString();
  }

  private async getCompanyProductionMetrics(companyId: number): Promise<{
    annualProduction: number;
    electricityBase: number;
    waterBase: number;
  }> {
    // Get production data from existing products
    const products = await db.query.products.findMany({
      where: (products, { eq }) => eq(products.companyId, companyId)
    });

    let totalAnnualProduction = 0;
    for (const product of products) {
      const productionVolume = parseInt(product.productionVolume || '0');
      totalAnnualProduction += productionVolume;
    }

    // Fallback to reasonable defaults if no production data
    if (totalAnnualProduction === 0) {
      totalAnnualProduction = 300000; // Default production volume
    }

    return {
      annualProduction: totalAnnualProduction,
      electricityBase: 150000, // 150,000 kWh baseline
      waterBase: 14130000 // 14.13M liters baseline
    };
  }
}