import type { CompanyData, Product, CompanySustainabilityData } from "@shared/schema";
import { storage } from "../storage";

export interface KPIData {
  kpiName: string;
  currentValue: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  lastUpdated: Date;
  historicalData: Array<{ date: Date; value: number }>;
}

export interface DashboardKPIs {
  totalCarbonFootprint: KPIData;
  energyIntensity: KPIData;
  waterIntensity: KPIData;
  wasteDiversionRate: KPIData;
  packagingCircularity: KPIData;
  supplierSustainabilityScore: KPIData;
}

export class KPIService {
  
  /**
   * Calculates and returns all dashboard KPIs for a company
   */
  async getDashboardKPIs(companyId: number): Promise<DashboardKPIs> {
    const companyData = await storage.getCompanyData(companyId);
    const products = await storage.getProductsByCompany(companyId);
    const sustainabilityData = await storage.getCompanySustainabilityData(companyId);
    
    return {
      totalCarbonFootprint: await this.calculateTotalCarbonFootprint(companyData, products),
      energyIntensity: await this.calculateEnergyIntensity(companyData),
      waterIntensity: await this.calculateWaterIntensity(companyData),
      wasteDiversionRate: await this.calculateWasteDiversionRate(companyData),
      packagingCircularity: await this.calculatePackagingCircularity(products),
      supplierSustainabilityScore: await this.calculateSupplierSustainabilityScore(sustainabilityData),
    };
  }

  private async calculateTotalCarbonFootprint(companyData: CompanyData[], products: Product[]): Promise<KPIData> {
    // Calculate total carbon footprint from scope 1 & 2 emissions
    const totalScope1 = companyData.reduce((sum, data) => 
      sum + (parseFloat(data.scope1Emissions?.toString() || '0')), 0);
    const totalScope2 = companyData.reduce((sum, data) => 
      sum + (parseFloat(data.scope2Emissions?.toString() || '0')), 0);
    
    const totalFootprint = totalScope1 + totalScope2;
    
    // Calculate trend (simplified - compare latest vs previous period)
    const trend = companyData.length > 1 ? this.calculateTrend(
      totalFootprint,
      parseFloat(companyData[companyData.length - 2]?.scope1Emissions?.toString() || '0') +
      parseFloat(companyData[companyData.length - 2]?.scope2Emissions?.toString() || '0')
    ) : { trend: 'stable' as const, percentage: 0 };

    return {
      kpiName: 'Total Carbon Footprint',
      currentValue: totalFootprint,
      unit: 'tCO2e',
      trend: trend.trend,
      trendPercentage: trend.percentage,
      lastUpdated: new Date(),
      historicalData: companyData.map(data => ({
        date: new Date(data.reportingPeriodEnd || new Date()),
        value: parseFloat(data.scope1Emissions?.toString() || '0') + parseFloat(data.scope2Emissions?.toString() || '0')
      }))
    };
  }

  private async calculateEnergyIntensity(companyData: CompanyData[]): Promise<KPIData> {
    // Energy consumption per unit of production (simplified calculation)
    const latestData = companyData[companyData.length - 1];
    const totalEnergy = parseFloat(latestData?.electricityConsumption?.toString() || '0') +
                       parseFloat(latestData?.gasConsumption?.toString() || '0') +
                       parseFloat(latestData?.fuelConsumption?.toString() || '0');
    
    // Mock production volume for now - in real implementation, sum from products
    const productionVolume = 1000; // This should come from actual production data
    const energyIntensity = productionVolume > 0 ? totalEnergy / productionVolume : 0;

    return {
      kpiName: 'Energy Intensity',
      currentValue: energyIntensity,
      unit: 'MWh/unit',
      trend: 'stable',
      trendPercentage: 0,
      lastUpdated: new Date(),
      historicalData: []
    };
  }

  private async calculateWaterIntensity(companyData: CompanyData[]): Promise<KPIData> {
    const latestData = companyData[companyData.length - 1];
    const waterConsumption = parseFloat(latestData?.waterConsumption?.toString() || '0');
    
    // Mock production volume - should come from actual data
    const productionVolume = 1000;
    const waterIntensity = productionVolume > 0 ? waterConsumption / productionVolume : 0;

    return {
      kpiName: 'Water Intensity',
      currentValue: waterIntensity,
      unit: 'L/unit',
      trend: 'stable',
      trendPercentage: 0,
      lastUpdated: new Date(),
      historicalData: []
    };
  }

  private async calculateWasteDiversionRate(companyData: CompanyData[]): Promise<KPIData> {
    const latestData = companyData[companyData.length - 1];
    const wasteGenerated = parseFloat(latestData?.wasteGenerated?.toString() || '0');
    const wasteRecycled = parseFloat(latestData?.wasteRecycled?.toString() || '0');
    
    const diversionRate = wasteGenerated > 0 ? (wasteRecycled / wasteGenerated) * 100 : 0;

    return {
      kpiName: 'Waste Diversion Rate',
      currentValue: diversionRate,
      unit: '%',
      trend: 'stable',
      trendPercentage: 0,
      lastUpdated: new Date(),
      historicalData: []
    };
  }

  private async calculatePackagingCircularity(products: Product[]): Promise<KPIData> {
    // Calculate based on recycled content in packaging
    let totalPackaging = 0;
    let recycledContent = 0;
    
    products.forEach(product => {
      const bottleWeight = parseFloat(product.bottleWeight?.toString() || '0');
      const recycledPercentage = parseFloat(product.bottleRecycledContent?.toString() || '0');
      
      totalPackaging += bottleWeight;
      recycledContent += (bottleWeight * recycledPercentage / 100);
    });
    
    const circularityRate = totalPackaging > 0 ? (recycledContent / totalPackaging) * 100 : 0;

    return {
      kpiName: 'Packaging Circularity',
      currentValue: circularityRate,
      unit: '%',
      trend: 'stable',
      trendPercentage: 0,
      lastUpdated: new Date(),
      historicalData: []
    };
  }

  private async calculateSupplierSustainabilityScore(sustainabilityData: CompanySustainabilityData | undefined): Promise<KPIData> {
    // Mock calculation based on supplier certifications and policies
    // In real implementation, this would aggregate supplier assessment scores
    const score = sustainabilityData ? 75 : 0; // Placeholder scoring

    return {
      kpiName: 'Supplier Sustainability Score',
      currentValue: score,
      unit: '/100',
      trend: 'stable',
      trendPercentage: 0,
      lastUpdated: new Date(),
      historicalData: []
    };
  }

  private calculateTrend(current: number, previous: number): { trend: 'up' | 'down' | 'stable', percentage: number } {
    if (previous === 0) return { trend: 'stable', percentage: 0 };
    
    const change = ((current - previous) / previous) * 100;
    
    if (Math.abs(change) < 5) return { trend: 'stable', percentage: Math.abs(change) };
    if (change > 0) return { trend: 'up', percentage: change };
    return { trend: 'down', percentage: Math.abs(change) };
  }
}

export const kpiService = new KPIService();