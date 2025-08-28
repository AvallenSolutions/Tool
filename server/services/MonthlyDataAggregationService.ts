import { db } from "../db";
import { monthlyFacilityData, companies } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export interface MonthlyAggregatedData {
  totalElectricityKwh: number;
  totalNaturalGasM3: number;
  totalWaterM3: number;
  totalProductionVolume: number;
  monthCount: number;
  dataQuality: 'high' | 'medium' | 'low';
  missingMonths: string[];
  latestDataMonth: string;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface MonthlyDataSummary {
  companyId: number;
  hasMonthlyData: boolean;
  aggregated: MonthlyAggregatedData | null;
  recommendation: 'complete' | 'needs_monthly_data' | 'incomplete_data';
  message: string;
}

export class MonthlyDataAggregationService {
  /**
   * Aggregates monthly facility data for a company within a specified date range
   */
  async aggregateMonthlyData(
    companyId: number, 
    startDate: string = this.getDefaultStartDate(),
    endDate: string = this.getDefaultEndDate()
  ): Promise<MonthlyAggregatedData> {
    const result = await db
      .select({
        totalElectricity: sql<number>`COALESCE(SUM(CAST(${monthlyFacilityData.electricityKwh} AS NUMERIC)), 0)`,
        totalGas: sql<number>`COALESCE(SUM(CAST(${monthlyFacilityData.naturalGasM3} AS NUMERIC)), 0)`,
        totalWater: sql<number>`COALESCE(SUM(CAST(${monthlyFacilityData.waterM3} AS NUMERIC)), 0)`,
        totalProduction: sql<number>`COALESCE(SUM(CAST(${monthlyFacilityData.productionVolume} AS NUMERIC)), 0)`,
        monthCount: sql<number>`COUNT(*)`,
        latestMonth: sql<string>`MAX(${monthlyFacilityData.month})`,
        earliestMonth: sql<string>`MIN(${monthlyFacilityData.month})`
      })
      .from(monthlyFacilityData)
      .where(
        and(
          eq(monthlyFacilityData.companyId, companyId),
          gte(monthlyFacilityData.month, startDate),
          lte(monthlyFacilityData.month, endDate)
        )
      );

    const data = result[0];
    
    if (!data || data.monthCount === 0) {
      return {
        totalElectricityKwh: 0,
        totalNaturalGasM3: 0,
        totalWaterM3: 0,
        totalProductionVolume: 0,
        monthCount: 0,
        dataQuality: 'low',
        missingMonths: this.getAllMonthsInRange(startDate, endDate),
        latestDataMonth: '',
        dateRange: { start: startDate, end: endDate }
      };
    }

    // Calculate expected months and identify missing ones
    const expectedMonths = this.getAllMonthsInRange(startDate, endDate);
    const actualMonths = await this.getActualMonths(companyId, startDate, endDate);
    const missingMonths = expectedMonths.filter(month => !actualMonths.includes(month));

    // Determine data quality
    const completenessRatio = actualMonths.length / expectedMonths.length;
    let dataQuality: 'high' | 'medium' | 'low' = 'low';
    if (completenessRatio >= 0.9) dataQuality = 'high';
    else if (completenessRatio >= 0.7) dataQuality = 'medium';

    return {
      totalElectricityKwh: data.totalElectricity,
      totalNaturalGasM3: data.totalGas,
      totalWaterM3: data.totalWater,
      totalProductionVolume: data.totalProduction,
      monthCount: data.monthCount,
      dataQuality,
      missingMonths,
      latestDataMonth: data.latestMonth || '',
      dateRange: { 
        start: data.earliestMonth || startDate, 
        end: data.latestMonth || endDate 
      }
    };
  }

  /**
   * Get summary of monthly data status for a company
   */
  async getMonthlyDataSummary(companyId: number): Promise<MonthlyDataSummary> {
    const aggregated = await this.aggregateMonthlyData(companyId);
    
    let recommendation: 'complete' | 'needs_monthly_data' | 'incomplete_data';
    let message: string;
    
    if (aggregated.monthCount === 0) {
      recommendation = 'needs_monthly_data';
      message = 'No monthly facility data found. Please add monthly data in Facility Updates for accurate calculations.';
    } else if (aggregated.dataQuality === 'high') {
      recommendation = 'complete';
      message = `${aggregated.monthCount} months of high-quality data available. Annual totals calculated from monthly inputs.`;
    } else {
      recommendation = 'incomplete_data';
      message = `${aggregated.monthCount} months of data available (${aggregated.dataQuality} quality). Consider adding data for missing months: ${aggregated.missingMonths.slice(0, 3).join(', ')}${aggregated.missingMonths.length > 3 ? '...' : ''}.`;
    }

    return {
      companyId,
      hasMonthlyData: aggregated.monthCount > 0,
      aggregated: aggregated.monthCount > 0 ? aggregated : null,
      recommendation,
      message
    };
  }

  /**
   * Convert monthly data to annual equivalents for legacy compatibility
   */
  async getAnnualEquivalents(companyId: number): Promise<{
    totalElectricityKwhPerYear: number;
    totalGasM3PerYear: number;
    totalProcessWaterLitersPerYear: number;
    annualCapacityVolume: number;
    dataSource: 'monthly_aggregated' | 'legacy_annual';
    confidence: 'high' | 'medium' | 'low';
  }> {
    const aggregated = await this.aggregateMonthlyData(companyId);
    
    if (aggregated.monthCount === 0) {
      return {
        totalElectricityKwhPerYear: 0,
        totalGasM3PerYear: 0,
        totalProcessWaterLitersPerYear: 0,
        annualCapacityVolume: 0,
        dataSource: 'monthly_aggregated',
        confidence: 'low'
      };
    }

    // Convert to annual values (water from m³ to liters)
    return {
      totalElectricityKwhPerYear: aggregated.totalElectricityKwh,
      totalGasM3PerYear: aggregated.totalNaturalGasM3,
      totalProcessWaterLitersPerYear: aggregated.totalWaterM3 * 1000, // Convert m³ to liters
      annualCapacityVolume: aggregated.totalProductionVolume,
      dataSource: 'monthly_aggregated',
      confidence: aggregated.dataQuality
    };
  }

  private getDefaultStartDate(): string {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    return startOfYear.toISOString().split('T')[0];
  }

  private getDefaultEndDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  private getAllMonthsInRange(startDate: string, endDate: string): string[] {
    const months: string[] = [];
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T00:00:00.000Z');
    
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    
    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      months.push(`${year}-${month}-01`);
      current.setMonth(current.getMonth() + 1);
    }
    
    return months;
  }

  private async getActualMonths(companyId: number, startDate: string, endDate: string): Promise<string[]> {
    const result = await db
      .select({
        month: monthlyFacilityData.month
      })
      .from(monthlyFacilityData)
      .where(
        and(
          eq(monthlyFacilityData.companyId, companyId),
          gte(monthlyFacilityData.month, startDate),
          lte(monthlyFacilityData.month, endDate)
        )
      )
      .orderBy(monthlyFacilityData.month);

    return result.map(row => row.month);
  }

  /**
   * Check if company has sufficient recent monthly data
   */
  async hasRecentMonthlyData(companyId: number, monthsRequired: number = 3): Promise<boolean> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsRequired);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const count = await db
      .select({
        count: sql<number>`COUNT(*)`
      })
      .from(monthlyFacilityData)
      .where(
        and(
          eq(monthlyFacilityData.companyId, companyId),
          gte(monthlyFacilityData.month, startDateStr),
          lte(monthlyFacilityData.month, endDateStr)
        )
      );

    return (count[0]?.count || 0) >= monthsRequired;
  }
}

export const monthlyDataAggregationService = new MonthlyDataAggregationService();