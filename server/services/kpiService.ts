import { db } from "../db";
import { eq, and, isNull, or, desc } from "drizzle-orm";
import { 
  companyFootprintData, 
  companyGoals, 
  companies, 
  products, 
  kpis, 
  projectGoals,
  kpiDefinitions,
  companyKpiGoals,
  type KpiDefinition,
  type CompanyKpiGoal,
  type InsertCompanyKpiGoal
} from "@shared/schema";

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

// ==== ENHANCED KPI & GOAL-SETTING SERVICE ====

export class EnhancedKPIService {
  
  /**
   * Get all available KPI definitions from the library
   */
  async getKpiDefinitions(): Promise<KpiDefinition[]> {
    try {
      return await db
        .select()
        .from(kpiDefinitions)
        .orderBy(kpiDefinitions.kpiCategory, kpiDefinitions.kpiName);
    } catch (error) {
      console.error('Error fetching KPI definitions:', error);
      return [];
    }
  }

  /**
   * Get KPI definitions filtered by category
   */
  async getKpiDefinitionsByCategory(category: string): Promise<KpiDefinition[]> {
    try {
      return await db
        .select()
        .from(kpiDefinitions)
        .where(eq(kpiDefinitions.kpiCategory, category))
        .orderBy(kpiDefinitions.kpiName);
    } catch (error) {
      console.error('Error fetching KPI definitions by category:', error);
      return [];
    }
  }

  /**
   * Get company's active KPI goals with definitions
   */
  async getCompanyKpiGoals(companyId: number): Promise<(CompanyKpiGoal & { kpiDefinition: KpiDefinition })[]> {
    try {
      return await db
        .select({
          id: companyKpiGoals.id,
          companyId: companyKpiGoals.companyId,
          kpiDefinitionId: companyKpiGoals.kpiDefinitionId,
          targetReductionPercentage: companyKpiGoals.targetReductionPercentage,
          targetDate: companyKpiGoals.targetDate,
          baselineValue: companyKpiGoals.baselineValue,
          isActive: companyKpiGoals.isActive,
          createdAt: companyKpiGoals.createdAt,
          updatedAt: companyKpiGoals.updatedAt,
          kpiDefinition: {
            id: kpiDefinitions.id,
            kpiName: kpiDefinitions.kpiName,
            kpiCategory: kpiDefinitions.kpiCategory,
            unit: kpiDefinitions.unit,
            formulaJson: kpiDefinitions.formulaJson,
            description: kpiDefinitions.description,
            createdAt: kpiDefinitions.createdAt,
          }
        })
        .from(companyKpiGoals)
        .innerJoin(kpiDefinitions, eq(companyKpiGoals.kpiDefinitionId, kpiDefinitions.id))
        .where(and(
          eq(companyKpiGoals.companyId, companyId),
          eq(companyKpiGoals.isActive, true)
        ))
        .orderBy(desc(companyKpiGoals.createdAt));
    } catch (error) {
      console.error('Error fetching company KPI goals:', error);
      return [];
    }
  }

  /**
   * Create a new KPI goal for a company
   */
  async createKpiGoal(goalData: InsertCompanyKpiGoal): Promise<CompanyKpiGoal | null> {
    try {
      const [newGoal] = await db
        .insert(companyKpiGoals)
        .values(goalData)
        .returning();
      
      return newGoal;
    } catch (error) {
      console.error('Error creating KPI goal:', error);
      return null;
    }
  }

  /**
   * Update an existing KPI goal
   */
  async updateKpiGoal(goalId: string, updates: Partial<InsertCompanyKpiGoal>): Promise<CompanyKpiGoal | null> {
    try {
      const [updatedGoal] = await db
        .update(companyKpiGoals)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(companyKpiGoals.id, goalId))
        .returning();
      
      return updatedGoal;
    } catch (error) {
      console.error('Error updating KPI goal:', error);
      return null;
    }
  }

  /**
   * Deactivate a KPI goal (soft delete)
   */
  async deactivateKpiGoal(goalId: string): Promise<boolean> {
    try {
      await db
        .update(companyKpiGoals)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(companyKpiGoals.id, goalId));
      
      return true;
    } catch (error) {
      console.error('Error deactivating KPI goal:', error);
      return false;
    }
  }

  /**
   * Calculate current KPI value using the formula and real data
   */
  async calculateCurrentKpiValue(kpiDefinition: KpiDefinition, companyId: number): Promise<number> {
    try {
      const formula = kpiDefinition.formulaJson;
      
      // Use the existing KPI calculation service
      const calcService = kpiCalculationService;
      
      switch (formula.calculation_type) {
        case 'ratio':
          if (formula.numerator && formula.denominator) {
            const numerator = await this.getFormulaValue(formula.numerator, companyId, calcService);
            const denominator = await this.getFormulaValue(formula.denominator, companyId, calcService);
            return denominator > 0 ? numerator / denominator : 0;
          }
          break;
          
        case 'percentage':
          if (formula.numerator) {
            // Handle percentage calculations (e.g., renewable energy %)
            const value = await this.getFormulaValue(formula.numerator, companyId, calcService);
            return value;
          }
          break;
          
        case 'absolute':
          if (formula.numerator) {
            return await this.getFormulaValue(formula.numerator, companyId, calcService);
          }
          break;
      }
      
      return 0;
    } catch (error) {
      console.error('Error calculating current KPI value:', error);
      return 0;
    }
  }

  /**
   * Helper method to get formula value based on data reference
   */
  private async getFormulaValue(reference: string, companyId: number, calcService: any): Promise<number> {
    switch (reference) {
      case 'totalCarbonEmissions':
        return await calcService.calculateTotalCarbonFootprint(companyId);
      case 'totalBottlesProduced':
        return await calcService.calculateTotalProductionVolume(companyId);
      case 'scope1Emissions + scope2Emissions + scope3Emissions':
        return await calcService.calculateTotalCarbonFootprint(companyId);
      case 'totalWaterUsage':
        return await calcService.calculateTotalWaterConsumption(companyId);
      case 'renewableEnergyConsumption / totalEnergyConsumption * 100':
        const renewable = await calcService.calculateRenewableEnergyKwh(companyId);
        const total = await calcService.calculateTotalEnergyKwh(companyId);
        return total > 0 ? (renewable / total) * 100 : 0;
      case '(wasteGenerated - wasteRecycled) / wasteGenerated * 100':
        const wasteTotal = await calcService.calculateTotalWasteGenerated(companyId);
        const wasteRecycled = await calcService.calculateRecycledWaste(companyId);
        return wasteTotal > 0 ? ((wasteTotal - wasteRecycled) / wasteTotal) * 100 : 0;
      case 'verifiedSuppliers / totalSuppliers * 100':
        return await calcService.calculateSupplierVerificationRate(companyId);
      case 'localSuppliers / totalSuppliers * 100':
        const localVolume = await calcService.calculateLocalIngredientsVolume(companyId);
        const totalVolume = await calcService.calculateTotalIngredientsVolume(companyId);
        return totalVolume > 0 ? (localVolume / totalVolume) * 100 : 0;
      case 'totalEnergyConsumed':
        return await calcService.calculateTotalEnergyConsumption(companyId);
      default:
        return 0;
    }
  }

  /**
   * Calculate progress towards a KPI goal
   */
  calculateGoalProgress(currentValue: number, baselineValue: number, targetReductionPercentage: number): {
    progress: number;
    status: 'on-track' | 'at-risk' | 'behind' | 'achieved';
    targetValue: number;
  } {
    const targetValue = baselineValue * (1 - targetReductionPercentage / 100);
    const totalReduction = baselineValue - targetValue;
    const currentReduction = baselineValue - currentValue;
    
    let progress = totalReduction > 0 ? (currentReduction / totalReduction) * 100 : 0;
    progress = Math.max(0, Math.min(100, progress)); // Clamp between 0-100
    
    let status: 'on-track' | 'at-risk' | 'behind' | 'achieved';
    
    if (progress >= 100) {
      status = 'achieved';
    } else if (progress >= 75) {
      status = 'on-track';
    } else if (progress >= 50) {
      status = 'at-risk';
    } else {
      status = 'behind';
    }
    
    return { progress, status, targetValue };
  }

  /**
   * Get comprehensive KPI dashboard data with goals
   */
  async getKpiDashboardData(companyId: number): Promise<{
    kpiGoals: Array<{
      id: string;
      name: string;
      category: string;
      unit: string;
      currentValue: number;
      baselineValue: number;
      targetValue: number;
      targetReductionPercentage: number;
      targetDate: string;
      progress: number;
      status: 'on-track' | 'at-risk' | 'behind' | 'achieved';
      description?: string;
    }>;
    summary: {
      total: number;
      onTrack: number;
      atRisk: number;
      behind: number;
      achieved: number;
    };
  }> {
    try {
      const goals = await this.getCompanyKpiGoals(companyId);
      
      const kpiGoals = await Promise.all(
        goals.map(async (goal) => {
          const currentValue = await this.calculateCurrentKpiValue(goal.kpiDefinition, companyId);
          const { progress, status, targetValue } = this.calculateGoalProgress(
            currentValue,
            parseFloat(goal.baselineValue.toString()),
            parseFloat(goal.targetReductionPercentage.toString())
          );
          
          return {
            id: goal.id,
            name: goal.kpiDefinition.kpiName,
            category: goal.kpiDefinition.kpiCategory,
            unit: goal.kpiDefinition.unit,
            currentValue,
            baselineValue: parseFloat(goal.baselineValue.toString()),
            targetValue,
            targetReductionPercentage: parseFloat(goal.targetReductionPercentage.toString()),
            targetDate: goal.targetDate,
            progress,
            status,
            description: goal.kpiDefinition.description,
          };
        })
      );
      
      // Calculate summary
      const summary = {
        total: kpiGoals.length,
        onTrack: kpiGoals.filter(kpi => kpi.status === 'on-track').length,
        atRisk: kpiGoals.filter(kpi => kpi.status === 'at-risk').length,
        behind: kpiGoals.filter(kpi => kpi.status === 'behind').length,
        achieved: kpiGoals.filter(kpi => kpi.status === 'achieved').length,
      };
      
      return { kpiGoals, summary };
    } catch (error) {
      console.error('Error getting KPI dashboard data:', error);
      return {
        kpiGoals: [],
        summary: { total: 0, onTrack: 0, atRisk: 0, behind: 0, achieved: 0 }
      };
    }
  }
}

// Export enhanced KPI service instance
export const enhancedKpiService = new EnhancedKPIService();