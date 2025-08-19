import { db } from "../db";
import { eq, and, isNull, or } from "drizzle-orm";
import { companyFootprintData, companyGoals, companies, products, kpis, projectGoals } from "@shared/schema";

export interface DashboardKPIData {
  id: string;
  name: string;
  current: number;
  target: number;
  unit: string;
  category: 'environmental' | 'social' | 'engagement';
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  deadline?: string;
  status: 'on-track' | 'at-risk' | 'behind' | 'achieved';
  isCustom: boolean;
}

export interface ProjectGoalData {
  id: string;
  title: string;
  milestones: Array<{ text: string; isComplete: boolean }>;
  completionPercentage: number;
}

export interface DashboardResponse {
  kpis: DashboardKPIData[];
  projectGoals: ProjectGoalData[];
  overallProgress: number;
  summary: {
    total: number;
    onTrack: number;
    atRisk: number;
    achieved: number;
  };
}

export class KPICalculationService {
  
  /**
   * Evaluate KPI formula and calculate current value
   */
  async evaluateKPIFormula(formulaJson: any, companyId: number): Promise<number> {
    try {
      // Handle different formula types
      if (formulaJson.numerator && formulaJson.denominator) {
        const numerator = await this.getDataPoint(formulaJson.numerator, companyId);
        const denominator = await this.getDataPoint(formulaJson.denominator, companyId);
        
        if (denominator === 0) return 0;
        return Number((numerator / denominator).toFixed(4));
      }
      
      // For simple data point references
      if (formulaJson.dataPoint) {
        return await this.getDataPoint(formulaJson.dataPoint, companyId);
      }
      
      return 0;
    } catch (error) {
      console.error('Error evaluating KPI formula:', error);
      return 0;
    }
  }
  
  /**
   * Get data point value from database
   */
  async getDataPoint(dataPoint: string, companyId: number): Promise<number> {
    try {
      switch (dataPoint) {
        case 'total_carbon_footprint':
          return await this.calculateTotalCarbonFootprint(companyId);
        
        case 'total_production_volume':
          return await this.calculateTotalProductionVolume(companyId);
        
        case 'total_water_consumption':
          return await this.calculateTotalWaterConsumption(companyId);
        
        case 'total_energy_consumption':
          return await this.calculateTotalEnergyConsumption(companyId);
        
        case 'renewable_energy_kwh':
          return await this.calculateRenewableEnergyKwh(companyId);
        
        case 'total_energy_kwh':
          return await this.calculateTotalEnergyKwh(companyId);
        
        case 'recycled_waste':
          return await this.calculateRecycledWaste(companyId);
        
        case 'total_waste_generated':
          return await this.calculateTotalWasteGenerated(companyId);
        
        case 'recyclable_packaging_weight':
          return await this.calculateRecyclablePackagingWeight(companyId);
        
        case 'total_packaging_weight':
          return await this.calculateTotalPackagingWeight(companyId);
        
        case 'verified_sustainable_suppliers':
          return await this.calculateVerifiedSustainableSuppliers(companyId);
        
        case 'total_suppliers':
          return await this.calculateTotalSuppliers(companyId);
        
        case 'local_ingredients_volume':
          return await this.calculateLocalIngredientsVolume(companyId);
        
        case 'total_ingredients_volume':
          return await this.calculateTotalIngredientsVolume(companyId);
        
        default:
          console.warn(`Unknown data point: ${dataPoint}`);
          return 0;
      }
    } catch (error) {
      console.error(`Error getting data point ${dataPoint}:`, error);
      return 0;
    }
  }

  /**
   * Get all KPIs for a company (preset + custom) with calculated values
   */
  async getKPIDashboardData(companyId: number): Promise<DashboardResponse> {
    try {
      // Get all KPIs (preset + custom for this company)
      const allKPIs = await db
        .select()
        .from(kpis)
        .where(or(isNull(kpis.companyId), eq(kpis.companyId, companyId)));

      // Get company goals for targets
      const goals = await db
        .select()
        .from(companyGoals)
        .where(eq(companyGoals.companyId, companyId));

      // Get project goals
      const projectGoalsData = await db
        .select()
        .from(projectGoals)
        .where(eq(projectGoals.companyId, companyId));

      const dashboardKPIs: DashboardKPIData[] = [];

      for (const kpi of allKPIs) {
        // Calculate current value using formula
        const currentValue = await this.evaluateKPIFormula(kpi.formulaJson, companyId);
        
        // Find matching goal for target
        const matchingGoal = goals.find(goal => 
          goal.kpiName.toLowerCase().includes(kpi.kpiName.toLowerCase())
        );
        
        const target = matchingGoal ? parseFloat(matchingGoal.targetValue.toString()) : this.getDefaultTarget(kpi.kpiName);
        const progress = target > 0 ? (currentValue / target) * 100 : 0;
        
        // Determine status and trend
        let status: 'on-track' | 'at-risk' | 'behind' | 'achieved' = 'on-track';
        let trend: 'up' | 'down' | 'stable' = 'stable';
        let trendValue = 0;
        
        if (progress >= 100) {
          status = 'achieved';
          trend = 'up';
          trendValue = 5;
        } else if (progress >= 80) {
          status = 'on-track';
          trend = 'up';
          trendValue = 3;
        } else if (progress >= 50) {
          status = 'at-risk';
          trend = 'stable';
          trendValue = 0;
        } else {
          status = 'behind';
          trend = 'down';
          trendValue = -2;
        }

        dashboardKPIs.push({
          id: kpi.id,
          name: kpi.kpiName,
          current: Math.round(currentValue * 100) / 100,
          target,
          unit: kpi.unit,
          category: this.mapKPITypeToCategory(kpi.kpiType),
          trend,
          trendValue,
          deadline: matchingGoal?.targetDate?.toString(),
          status,
          isCustom: kpi.companyId !== null,
        });
      }

      // Process project goals
      const processedProjectGoals: ProjectGoalData[] = projectGoalsData.map(goal => {
        const milestones = goal.milestones as Array<{ text: string; isComplete: boolean }>;
        const completedCount = milestones.filter(m => m.isComplete).length;
        const completionPercentage = milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0;

        return {
          id: goal.id,
          title: goal.goalTitle,
          milestones,
          completionPercentage: Math.round(completionPercentage),
        };
      });

      // Calculate summary statistics
      const summary = {
        total: dashboardKPIs.length,
        onTrack: dashboardKPIs.filter(kpi => kpi.status === 'on-track').length,
        atRisk: dashboardKPIs.filter(kpi => kpi.status === 'at-risk').length,
        achieved: dashboardKPIs.filter(kpi => kpi.status === 'achieved').length,
      };

      const overallProgress = dashboardKPIs.length > 0 
        ? dashboardKPIs.reduce((acc, kpi) => acc + Math.min((kpi.current / kpi.target) * 100, 100), 0) / dashboardKPIs.length
        : 0;

      return {
        kpis: dashboardKPIs,
        projectGoals: processedProjectGoals,
        overallProgress: Math.round(overallProgress),
        summary,
      };

    } catch (error) {
      console.error('Error getting KPI dashboard data:', error);
      return {
        kpis: [],
        projectGoals: [],
        overallProgress: 0,
        summary: { total: 0, onTrack: 0, atRisk: 0, achieved: 0 },
      };
    }
  }

  private mapKPITypeToCategory(kpiType: string): 'environmental' | 'social' | 'engagement' {
    switch (kpiType.toLowerCase()) {
      case 'environmental': return 'environmental';
      case 'social': return 'social';
      case 'engagement': return 'engagement';
      default: return 'environmental';
    }
  }

  private getDefaultTarget(kpiName: string): number {
    // Default targets for common KPIs
    const defaults: Record<string, number> = {
      'Carbon Intensity': 1.5,
      'Water Intensity': 8.0,
      'Energy Intensity': 2.0,
      'Waste Diversion Rate': 85,
      'Renewable Energy Usage': 80,
      'Packaging Recyclability': 90,
      'Supplier Sustainability Score': 75,
      'Local Sourcing Percentage': 60,
    };
    
    return defaults[kpiName] || 100;
  }

  /**
   * Calculate total carbon footprint for company
   */
  async calculateTotalCarbonFootprint(companyId: number): Promise<number> {
    try {
      // Get all products for the company
      const companyProducts = await db
        .select()
        .from(products)
        .where(eq(products.companyId, companyId));

      let totalFootprint = 0;

      for (const product of companyProducts) {
        if (product.carbonFootprint && product.annualProduction) {
          const productFootprint = parseFloat(product.carbonFootprint.toString());
          const annualProduction = parseInt(product.annualProduction.toString());
          totalFootprint += productFootprint * annualProduction;
        }
      }

      // Convert to tonnes and return
      return totalFootprint / 1000;
    } catch (error) {
      console.error('Error calculating total carbon footprint:', error);
      return 0;
    }
  }

  async calculateTotalProductionVolume(companyId: number): Promise<number> {
    try {
      const companyProducts = await db
        .select()
        .from(products)
        .where(eq(products.companyId, companyId));

      return companyProducts.reduce((total, product) => {
        const volume = parseInt(product.annualProduction?.toString() || '0');
        return total + volume;
      }, 0);
    } catch (error) {
      console.error('Error calculating total production volume:', error);
      return 0;
    }
  }

  async calculateTotalWaterConsumption(companyId: number): Promise<number> {
    try {
      const companyProducts = await db
        .select()
        .from(products)
        .where(eq(products.companyId, companyId));

      let totalWater = 0;
      for (const product of companyProducts) {
        if (product.waterFootprint && product.annualProduction) {
          const waterFootprint = parseFloat(product.waterFootprint.toString());
          const annualProduction = parseInt(product.annualProduction.toString());
          totalWater += waterFootprint * annualProduction;
        }
      }

      return totalWater;
    } catch (error) {
      console.error('Error calculating total water consumption:', error);
      return 0;
    }
  }

  async calculateTotalEnergyConsumption(companyId: number): Promise<number> {
    try {
      const footprintData = await db
        .select()
        .from(companyFootprintData)
        .where(eq(companyFootprintData.companyId, companyId))
        .limit(1);

      if (footprintData.length > 0) {
        return parseFloat(footprintData[0].electricityConsumption?.toString() || '0');
      }
      return 0;
    } catch (error) {
      console.error('Error calculating total energy consumption:', error);
      return 0;
    }
  }

  async calculateRenewableEnergyKwh(companyId: number): Promise<number> {
    try {
      const footprintData = await db
        .select()
        .from(companyFootprintData)
        .where(eq(companyFootprintData.companyId, companyId))
        .limit(1);

      if (footprintData.length > 0) {
        const totalEnergy = parseFloat(footprintData[0].electricityConsumption?.toString() || '0');
        const renewablePercent = parseFloat(footprintData[0].renewableEnergyPercent?.toString() || '0');
        return (totalEnergy * renewablePercent) / 100;
      }
      return 0;
    } catch (error) {
      console.error('Error calculating renewable energy kWh:', error);
      return 0;
    }
  }

  async calculateTotalEnergyKwh(companyId: number): Promise<number> {
    return this.calculateTotalEnergyConsumption(companyId);
  }

  async calculateRecycledWaste(companyId: number): Promise<number> {
    // Placeholder - would connect to actual waste data
    return 750; // kg per month (example)
  }

  async calculateTotalWasteGenerated(companyId: number): Promise<number> {
    // Placeholder - would connect to actual waste data  
    return 1000; // kg per month (example)
  }

  async calculateRecyclablePackagingWeight(companyId: number): Promise<number> {
    try {
      const companyProducts = await db
        .select()
        .from(products)
        .where(eq(products.companyId, companyId));

      // Estimate based on glass bottles (95% recyclable)
      const totalBottles = companyProducts.reduce((total, product) => {
        return total + parseInt(product.annualProduction?.toString() || '0');
      }, 0);

      return totalBottles * 0.53 * 0.95; // 530g bottle weight, 95% recyclable
    } catch (error) {
      console.error('Error calculating recyclable packaging weight:', error);
      return 0;
    }
  }

  async calculateTotalPackagingWeight(companyId: number): Promise<number> {
    try {
      const companyProducts = await db
        .select()
        .from(products)
        .where(eq(products.companyId, companyId));

      const totalBottles = companyProducts.reduce((total, product) => {
        return total + parseInt(product.annualProduction?.toString() || '0');
      }, 0);

      return totalBottles * 0.53; // 530g per bottle
    } catch (error) {
      console.error('Error calculating total packaging weight:', error);
      return 0;
    }
  }

  async calculateVerifiedSustainableSuppliers(companyId: number): Promise<number> {
    // Placeholder - would connect to actual supplier verification data
    return 3; // verified suppliers (example)
  }

  async calculateTotalSuppliers(companyId: number): Promise<number> {
    // Placeholder - would connect to actual supplier data
    return 5; // total suppliers (example)
  }

  async calculateLocalIngredientsVolume(companyId: number): Promise<number> {
    // Placeholder - would connect to actual sourcing data
    return 1200; // liters of local ingredients (example)
  }

  async calculateTotalIngredientsVolume(companyId: number): Promise<number> {
    // Placeholder - would connect to actual ingredients data
    return 2000; // total liters of ingredients (example)
  }
}

// Export singleton instance
export const kpiCalculationService = new KPICalculationService();