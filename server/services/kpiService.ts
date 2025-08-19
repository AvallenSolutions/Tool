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
   * Get KPI data from real database integration
   */
  async getKPIData(companyId: number) {
    try {
      // Get actual company footprint data for real metrics
      const companyData = await db
        .select()
        .from(companyFootprintData)
        .where(eq(companyFootprintData.companyId, companyId))
        .limit(1);

      // Get company goals from database
      const goals = await db
        .select()
        .from(companyGoals)
        .where(eq(companyGoals.companyId, companyId));

      // Calculate real KPIs based on actual data
      const kpis = [];

      // 1. Carbon Footprint KPI (from actual emissions data)
      const totalCarbonFootprint = await this.calculateTotalCarbonFootprint(companyId);
      if (totalCarbonFootprint > 0) {
        const carbonTarget = 1000; // Default target, could come from goals table
        kpis.push({
          id: 'carbon-footprint',
          name: 'Carbon Footprint Reduction',
          current: Math.round(totalCarbonFootprint * 100) / 100,
          target: carbonTarget,
          unit: 'kg CO₂e',
          category: 'emissions' as const,
          trend: totalCarbonFootprint < carbonTarget * 0.8 ? 'down' as const : 'up' as const,
          trendValue: Math.round(((carbonTarget - totalCarbonFootprint) / carbonTarget) * 100),
          deadline: '2025-12-31',
          status: totalCarbonFootprint < carbonTarget * 0.8 ? 'on-track' as const : 
                 totalCarbonFootprint < carbonTarget ? 'at-risk' as const : 'behind' as const,
        });
      }

      // 2. Energy Efficiency KPI (based on renewable energy usage)
      if (companyData.length > 0) {
        const renewablePercent = parseFloat(companyData[0].renewableEnergyPercent?.toString() || '0');
        kpis.push({
          id: 'energy-efficiency',
          name: 'Renewable Energy Usage',
          current: renewablePercent,
          target: 80,
          unit: '%',
          category: 'efficiency' as const,
          trend: renewablePercent > 50 ? 'up' as const : 'down' as const,
          trendValue: Math.round(renewablePercent - 40), // Compared to baseline of 40%
          deadline: '2025-06-30',
          status: renewablePercent >= 64 ? 'on-track' as const : 
                 renewablePercent >= 40 ? 'at-risk' as const : 'behind' as const,
        });
      }

      // 3. Water Usage Efficiency KPI
      const totalWaterFootprint = await this.calculateWaterIntensity(companyId);
      if (totalWaterFootprint > 0) {
        const waterTarget = 5000; // L per unit target
        kpis.push({
          id: 'water-efficiency',
          name: 'Water Usage Efficiency',
          current: Math.round(totalWaterFootprint * 100) / 100,
          target: waterTarget,
          unit: 'L/unit',
          category: 'sustainability' as const,
          trend: totalWaterFootprint < waterTarget * 0.9 ? 'down' as const : 'up' as const,
          trendValue: Math.round(((waterTarget - totalWaterFootprint) / waterTarget) * 100),
          deadline: '2025-09-30',
          status: totalWaterFootprint < waterTarget * 0.8 ? 'on-track' as const :
                 totalWaterFootprint < waterTarget ? 'at-risk' as const : 'behind' as const,
        });
      }

      // Add any custom KPIs from company_goals table
      for (const goal of goals) {
        kpis.push({
          id: goal.id,
          name: goal.kpiName || 'Custom Goal',
          current: parseFloat(goal.startValue || '0'),
          target: parseFloat(goal.targetValue || '100'),
          unit: 'units', // Could be enhanced to store unit in goals table
          category: 'sustainability' as const,
          trend: 'stable' as const,
          trendValue: 0,
          deadline: goal.targetDate || '2025-12-31',
          status: 'on-track' as const,
        });
      }

      // If no real data available, provide one default KPI
      if (kpis.length === 0) {
        kpis.push({
          id: 'default-sustainability',
          name: 'Sustainability Progress',
          current: 0,
          target: 100,
          unit: '%',
          category: 'sustainability' as const,
          trend: 'stable' as const,
          trendValue: 0,
          deadline: '2025-12-31',
          status: 'behind' as const,
        });
      }

      // Calculate summary statistics
      const onTrack = kpis.filter(k => k.status === 'on-track').length;
      const atRisk = kpis.filter(k => k.status === 'at-risk').length;
      const behind = kpis.filter(k => k.status === 'behind').length;
      const achieved = kpis.filter(k => k.status === 'achieved').length;

      const overallProgress = kpis.length > 0 
        ? Math.round((kpis.reduce((sum, kpi) => sum + (kpi.current / kpi.target) * 100, 0) / kpis.length))
        : 0;

      return {
        kpis,
        overallProgress,
        summary: {
          total: kpis.length,
          onTrack,
          atRisk,
          achieved,
        }
      };
    } catch (error) {
      console.error('Error fetching KPI data:', error);
      // Return minimal data on error
      return {
        kpis: [{
          id: 'error-fallback',
          name: 'Data Collection Required',
          current: 0,
          target: 100,
          unit: '%',
          category: 'compliance' as const,
          trend: 'stable' as const,
          trendValue: 0,
          deadline: '2025-12-31',
          status: 'behind' as const,
        }],
        overallProgress: 0,
        summary: { total: 1, onTrack: 0, atRisk: 0, achieved: 0 }
      };
    }
  }

  /**
   * Phase 3: Get SMART goals for the company
   */
  async getSMARTGoals(companyId: number) {
    // Mock data for Phase 3 demonstration
    return {
      goals: [
        {
          id: '1',
          title: 'Reduce Packaging Waste by 30%',
          description: 'Implement sustainable packaging solutions across all product lines',
          specific: 'Reduce packaging waste by 30% through biodegradable materials and optimized design',
          measurable: 'Track packaging weight per unit and waste generation metrics monthly',
          achievable: 'Partner with sustainable packaging suppliers and redesign current solutions',
          relevant: 'Aligns with company sustainability goals and customer expectations',
          timeBound: 'Complete by December 31, 2025 with quarterly milestones',
          status: 'active' as const,
          priority: 'high' as const,
          progress: 35,
          targetDate: '2025-12-31',
          category: 'sustainability' as const,
          createdAt: '2024-11-15',
          updatedAt: '2025-01-15',
        },
        {
          id: '2',
          title: 'Achieve Carbon Neutrality',
          description: 'Offset all operational carbon emissions through verified programs',
          specific: 'Achieve net-zero carbon emissions for all scope 1 and 2 operations',
          measurable: 'Monthly carbon footprint tracking with verified offset purchases',
          achievable: 'Invest in renewable energy and purchase verified carbon offsets',
          relevant: 'Critical for meeting industry sustainability standards and regulations',
          timeBound: 'Achieve carbon neutrality by June 30, 2025',
          status: 'active' as const,
          priority: 'high' as const,
          progress: 68,
          targetDate: '2025-06-30',
          category: 'emissions' as const,
          createdAt: '2024-10-01',
          updatedAt: '2025-01-10',
        }
      ],
      summary: {
        total: 2,
        active: 2,
        completed: 0,
        overdue: 0,
      }
    };
  }

  /**
   * Phase 3: Create a new SMART goal
   */
  async createSMARTGoal(companyId: number, goalData: any) {
    // In a real implementation, this would save to the database
    const newGoal = {
      id: Date.now().toString(),
      ...goalData,
      status: 'draft',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    return newGoal;
  }
  
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