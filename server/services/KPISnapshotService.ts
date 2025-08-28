import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { 
  kpiSnapshots,
  kpiDefinitions,
  companyKpiGoals,
  companies,
  type InsertKpiSnapshot
} from "@shared/schema";
import { timeSeriesEngine } from "./TimeSeriesEngine";

export class KPISnapshotService {

  /**
   * Generate monthly snapshots for all active KPIs for all companies
   * This method is called by the scheduled cron job
   */
  async generateMonthlySnapshots(targetMonth?: Date): Promise<void> {
    const snapshotMonth = targetMonth || this.getPreviousMonth();
    const snapshotDate = this.getEndOfMonth(snapshotMonth);

    console.log(`📸 Starting monthly KPI snapshot generation for ${snapshotMonth.toISOString().split('T')[0]}`);

    try {
      // Get all companies with active KPI goals
      const activeKPIGoals = await db
        .select({
          companyId: companyKpiGoals.companyId,
          kpiDefinitionId: companyKpiGoals.kpiDefinitionId,
          kpiName: kpiDefinitions.kpiName,
          companyName: companies.name
        })
        .from(companyKpiGoals)
        .innerJoin(kpiDefinitions, eq(kpiDefinitions.id, companyKpiGoals.kpiDefinitionId))
        .innerJoin(companies, eq(companies.id, companyKpiGoals.companyId))
        .where(eq(companyKpiGoals.isActive, true));

      console.log(`🎯 Found ${activeKPIGoals.length} active KPI goals across companies`);

      const results = {
        total: activeKPIGoals.length,
        successful: 0,
        failed: 0,
        errors: [] as string[]
      };

      // Generate snapshots for each active KPI goal
      for (const goal of activeKPIGoals) {
        try {
          await this.generateKPISnapshot(
            goal.kpiDefinitionId,
            goal.companyId,
            snapshotDate,
            snapshotMonth
          );
          results.successful++;
          console.log(`✅ Generated snapshot for ${goal.kpiName} - ${goal.companyName}`);
        } catch (error) {
          results.failed++;
          const errorMsg = `Failed to generate snapshot for ${goal.kpiName} - ${goal.companyName}: ${error}`;
          results.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      console.log(`📊 Snapshot generation completed:`, results);

    } catch (error) {
      console.error(`❌ Error in monthly snapshot generation:`, error);
      throw error;
    }
  }

  /**
   * Generate a single KPI snapshot for a specific company and date
   */
  async generateKPISnapshot(
    kpiDefinitionId: string,
    companyId: number,
    snapshotDate: Date,
    calculationMonth: Date
  ): Promise<void> {
    try {
      // Check if snapshot already exists for this date
      const existingSnapshot = await db
        .select()
        .from(kpiSnapshots)
        .where(
          and(
            eq(kpiSnapshots.companyId, companyId),
            eq(kpiSnapshots.kpiDefinitionId, kpiDefinitionId),
            eq(kpiSnapshots.snapshotDate, snapshotDate.toISOString().split('T')[0])
          )
        );

      if (existingSnapshot.length > 0) {
        console.log(`📸 Snapshot already exists for KPI ${kpiDefinitionId}, company ${companyId} on ${snapshotDate.toISOString().split('T')[0]}`);
        return;
      }

      // Calculate KPI value for the target month
      const kpiValue = await timeSeriesEngine.calculateKPIForMonth(
        kpiDefinitionId,
        companyId,
        calculationMonth
      );

      // Get additional metadata about the calculation
      const facilityData = await timeSeriesEngine.getFacilityDataForMonth(companyId, calculationMonth);
      const productVersions = await timeSeriesEngine.getProductVersionsForDate(companyId, calculationMonth);

      const metadata = {
        calculationMethod: 'time_series_engine',
        dataSource: 'monthly_facility_data',
        facilityDataMonth: calculationMonth.toISOString().split('T')[0],
        productVersionsUsed: productVersions.map(pv => ({
          productId: pv.productId,
          versionId: pv.id,
          versionNumber: pv.versionNumber
        })),
        hasFacilityData: !!facilityData,
        notes: `Calculated using TimeSeriesEngine for ${calculationMonth.toISOString().split('T')[0]}`
      };

      // Create the snapshot record
      const snapshotData: InsertKpiSnapshot = {
        companyId,
        kpiDefinitionId,
        snapshotDate: snapshotDate.toISOString().split('T')[0],
        value: kpiValue.toString(),
        metadata
      };

      await db.insert(kpiSnapshots).values(snapshotData);

      console.log(`📸 Created KPI snapshot: ${kpiValue.toFixed(4)} on ${snapshotDate.toISOString().split('T')[0]}`);

    } catch (error) {
      console.error(`Error generating KPI snapshot:`, error);
      throw error;
    }
  }

  /**
   * Recalculate snapshots for a specific period
   */
  async recalculateSnapshots(
    companyId: number,
    kpiDefinitionId: string,
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    try {
      console.log(`🔄 Recalculating snapshots for KPI ${kpiDefinitionId}, company ${companyId}`);

      // Delete existing snapshots in the date range
      await db
        .delete(kpiSnapshots)
        .where(
          and(
            eq(kpiSnapshots.companyId, companyId),
            eq(kpiSnapshots.kpiDefinitionId, kpiDefinitionId),
            eq(kpiSnapshots.snapshotDate, startDate.toISOString().split('T')[0])
          )
        );

      // Generate new snapshots
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const calculationMonth = new Date(currentDate);
        const snapshotDate = this.getEndOfMonth(calculationMonth);

        await this.generateKPISnapshot(
          kpiDefinitionId,
          companyId,
          snapshotDate,
          calculationMonth
        );

        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      console.log(`✅ Recalculation completed for KPI ${kpiDefinitionId}`);

    } catch (error) {
      console.error(`Error recalculating snapshots:`, error);
      throw error;
    }
  }

  /**
   * Generate snapshots for current month (useful for testing)
   */
  async generateCurrentMonthSnapshot(companyId: number, kpiDefinitionId: string): Promise<void> {
    const currentMonth = new Date();
    const snapshotDate = this.getEndOfMonth(currentMonth);

    await this.generateKPISnapshot(
      kpiDefinitionId,
      companyId,
      snapshotDate,
      currentMonth
    );
  }

  /**
   * Get the previous month's date
   */
  private getPreviousMonth(): Date {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    // Set to first day of month for consistency
    date.setDate(1);
    return date;
  }

  /**
   * Get the last day of the month for snapshot dating
   */
  private getEndOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  /**
   * Initialize snapshots for a company (backfill historical data)
   */
  async initializeSnapshotsForCompany(companyId: number, monthsBack: number = 12): Promise<void> {
    try {
      console.log(`🚀 Initializing snapshots for company ${companyId}, ${monthsBack} months back`);

      // Get all active KPI goals for the company
      const activeKPIGoals = await db
        .select({
          kpiDefinitionId: companyKpiGoals.kpiDefinitionId,
          kpiName: kpiDefinitions.kpiName
        })
        .from(companyKpiGoals)
        .innerJoin(kpiDefinitions, eq(kpiDefinitions.id, companyKpiGoals.kpiDefinitionId))
        .where(
          and(
            eq(companyKpiGoals.companyId, companyId),
            eq(companyKpiGoals.isActive, true)
          )
        );

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsBack);
      startDate.setDate(1); // First day of month

      const endDate = new Date();
      endDate.setDate(1); // First day of current month

      // Generate snapshots for each KPI across the date range
      for (const goal of activeKPIGoals) {
        const currentDate = new Date(startDate);
        
        while (currentDate < endDate) {
          const calculationMonth = new Date(currentDate);
          const snapshotDate = this.getEndOfMonth(calculationMonth);

          try {
            await this.generateKPISnapshot(
              goal.kpiDefinitionId,
              companyId,
              snapshotDate,
              calculationMonth
            );
          } catch (error) {
            console.error(`Error generating snapshot for ${goal.kpiName} at ${calculationMonth.toISOString()}:`, error);
          }

          // Move to next month
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }

      console.log(`✅ Snapshot initialization completed for company ${companyId}`);

    } catch (error) {
      console.error(`Error initializing snapshots for company:`, error);
      throw error;
    }
  }
}

export const kpiSnapshotService = new KPISnapshotService();