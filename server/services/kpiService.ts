import { db } from "../db";
import { eq, and, isNull, or, desc, sql } from "drizzle-orm";
import { 
  companyFootprintData, 
  companyGoals, 
  companies, 
  products, 
  kpis, 
  projectGoals,
  kpiDefinitions,
  companyKpiGoals,
  verifiedSuppliers,
  monthlyFacilityData,
  type KpiDefinition,
  type CompanyKpiGoal,
  type InsertCompanyKpiGoal
} from "@shared/schema";
import { OpenLCAService } from "./OpenLCAService";
import { WasteIntensityCalculationService } from "./WasteIntensityCalculationService";
import { productionFacilities } from "@shared/schema";
import { MonthlyDataAggregationService } from './MonthlyDataAggregationService';

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
   * Calculate total production units across all company products (for proper facility allocation)
   */
  private async calculateTotalCompanyProductionUnits(companyId: number): Promise<number> {
    const companyProducts = await db
      .select()
      .from(products)
      .where(eq(products.companyId, companyId));

    let totalUnits = 0;
    for (const product of companyProducts) {
      const annualProduction = parseFloat(product.annualProductionVolume?.toString() || '0');
      totalUnits += annualProduction;
    }

    console.log(`🧮 Total company production units: ${totalUnits.toLocaleString()} units across ${companyProducts.length} products`);
    return totalUnits;
  }

  /**
   * Calculate refined LCA for a single product (matches the product detail page calculation)
   * Integrates OpenLCA ingredients, packaging, facilities, production waste, and end-of-life packaging
   */
  private async calculateProductRefinedLCA(product: any): Promise<{
    totalCO2e: number;
    totalWater: number;
    totalWaste: number;
    breakdown: {
      ingredients: { co2e: number; water: number; waste: number };
      packaging: { co2e: number; water: number; waste: number };
      facilities: { co2e: number; water: number; waste: number };
      dilutionRecorded: { amount: number; unit: string; excluded: boolean };
    };
    productionWasteFootprint: number;
    endOfLifeFootprint: number;
  }> {
    const productionVolume = Number(product.annualProductionVolume) || 1;
    // Get total company production for proper facility allocation
    const totalCompanyUnits = await this.calculateTotalCompanyProductionUnits(product.companyId);
    let totalCO2e = 0;
    let totalWater = 0;
    let totalWaste = 0;
    
    const breakdown = {
      ingredients: { co2e: 0, water: 0, waste: 0 },
      packaging: { co2e: 0, water: 0, waste: 0 },
      facilities: { co2e: 0, water: 0, waste: 0 },
      dilutionRecorded: { amount: 0, unit: '', excluded: true }
    };

    // 1. Calculate ingredient impacts using OpenLCA
    if (product.ingredients && Array.isArray(product.ingredients)) {
      for (const ingredient of product.ingredients) {
        if (ingredient.name && ingredient.amount > 0) {
          try {
            // Calculate ingredient impact (includes water footprint)
            const impactData = await OpenLCAService.calculateIngredientImpact(
              ingredient.name,
              ingredient.amount,
              ingredient.unit || 'kg'
            );
            
            if (impactData) {
              breakdown.ingredients.co2e += impactData.carbonFootprint;
              breakdown.ingredients.water += impactData.waterFootprint;
            }
          } catch (error) {
            console.error(`Calculation failed for ${ingredient.name}:`, error);
          }
        }
      }
    }

    // 2. Calculate packaging impacts
    if (product.bottleWeight) {
      const bottleWeightKg = parseFloat(product.bottleWeight) / 1000;
      const recycledContent = parseFloat(product.bottleRecycledContent || '0') / 100;
      
      // Glass bottle emissions
      const virginGlassEmissionFactor = 0.7; // kg CO2e per kg
      const recycledGlassEmissionFactor = 0.35;
      const glassEmissions = bottleWeightKg * (
        (1 - recycledContent) * virginGlassEmissionFactor + 
        recycledContent * recycledGlassEmissionFactor
      );
      
      breakdown.packaging.co2e += glassEmissions;
      breakdown.packaging.water += bottleWeightKg * 10; // ~10L water per kg glass
      
      // Calculate production waste intensity from facility data
      let productionWastePerUnit = 0;
      try {
        const wasteIntensityData = await WasteIntensityCalculationService.calculateWasteIntensity(1);
        productionWastePerUnit = wasteIntensityData.productionWasteIntensity;
      } catch (error) {
        productionWastePerUnit = 0.002; // 2g fallback
      }
      breakdown.packaging.waste += productionWastePerUnit;
    }
    
    // Add label and closure impacts if available
    if (product.labelWeight) {
      const labelWeightKg = parseFloat(product.labelWeight) / 1000;
      breakdown.packaging.co2e += labelWeightKg * 1.8; // Paper label factor
      breakdown.packaging.water += labelWeightKg * 15; // Paper production water
    }
    
    if (product.closureWeight) {
      const closureWeightKg = parseFloat(product.closureWeight) / 1000;
      breakdown.packaging.co2e += closureWeightKg * 3.2; // Cork/plastic factor
      breakdown.packaging.water += closureWeightKg * 8; // Closure production water
    }

    // 3. Add facility impacts using YOUR METHOD: Average monthly Scope 1&2 × 12 ÷ total units
    let productionWasteFootprint = 0;
    let endOfLifePackagingFootprint = 0;
    
    // Calculate annual Scope 1 & 2 facility footprint using monthly averages
    try {
      // Get monthly facility data for the company
      const monthlyData = await db
        .select({
          month: monthlyFacilityData.month,
          electricityKwh: sql<number>`SUM(CAST(${monthlyFacilityData.electricityKwh} AS NUMERIC))`,
          naturalGasM3: sql<number>`SUM(CAST(${monthlyFacilityData.naturalGasM3} AS NUMERIC))`,
        })
        .from(monthlyFacilityData)
        .where(eq(monthlyFacilityData.companyId, product.companyId))
        .groupBy(monthlyFacilityData.month);

      if (monthlyData.length > 0) {
        // Calculate monthly averages
        const avgElectricityKwh = monthlyData.reduce((sum, month) => sum + month.electricityKwh, 0) / monthlyData.length;
        const avgGasM3 = monthlyData.reduce((sum, month) => sum + month.naturalGasM3, 0) / monthlyData.length;
        
        // Calculate annual totals (monthly average × 12)
        const annualElectricityKwh = avgElectricityKwh * 12;
        const annualGasM3 = avgGasM3 * 12;
        
        // Calculate Scope 1 & 2 emissions
        const scope2Emissions = annualElectricityKwh * 0.233; // UK grid factor: 233g CO2e/kWh
        const scope1Emissions = annualGasM3 * 1.8514; // Natural gas factor: 1.8514 kg CO2e/m³
        const totalFacilityEmissions = scope1Emissions + scope2Emissions; // kg CO2e per year
        
        // Allocate per unit across ALL company products
        const facilityEmissionsPerUnit = totalFacilityEmissions / totalCompanyUnits;
        breakdown.facilities.co2e = facilityEmissionsPerUnit;
        
        console.log(`🏭 YOUR METHOD: Monthly avg electricity: ${avgElectricityKwh.toFixed(0)}kWh, gas: ${avgGasM3.toFixed(0)}m³`);
        console.log(`🏭 YOUR METHOD: Annual totals: ${annualElectricityKwh.toFixed(0)}kWh, ${annualGasM3.toFixed(0)}m³`);
        console.log(`🏭 YOUR METHOD: Scope 1: ${(scope1Emissions/1000).toFixed(1)}t, Scope 2: ${(scope2Emissions/1000).toFixed(1)}t, Total: ${(totalFacilityEmissions/1000).toFixed(1)}t`);
        console.log(`🏭 YOUR METHOD: Per unit: ${facilityEmissionsPerUnit.toFixed(3)}kg CO2e ÷ ${totalCompanyUnits.toLocaleString()} units`);
      }
      
      // Water consumption (keep existing logic for water)
      const facilities = await db.select().from(productionFacilities).where(eq(productionFacilities.companyId, product.companyId));
      for (const facility of facilities) {
        const totalFacilityWater = 
          (facility.totalProcessWaterLitersPerYear ? parseFloat(facility.totalProcessWaterLitersPerYear) : 0) +
          (facility.totalCleaningWaterLitersPerYear ? parseFloat(facility.totalCleaningWaterLitersPerYear) : 0) +
          (facility.totalCoolingWaterLitersPerYear ? parseFloat(facility.totalCoolingWaterLitersPerYear) : 0);
        
        if (totalFacilityWater > 0) {
          const waterPerUnit = totalFacilityWater / totalCompanyUnits;
          breakdown.facilities.water += waterPerUnit;
        }
      }
    } catch (error) {
      console.error('Error calculating facility impacts using your method:', error);
    }
    
    // Calculate production waste carbon footprint from disposal routes for all facilities
    const facilities = await db.select().from(productionFacilities).where(eq(productionFacilities.companyId, product.companyId));
    for (const facility of facilities) {
      try {
        const wasteFootprint = await WasteIntensityCalculationService.calculateProductionWasteFootprint(facility.id, 'United Kingdom');
        productionWasteFootprint += wasteFootprint.totalWasteCarbonFootprint;
      } catch (error) {
        // Ignore individual facility waste errors
      }
    }
    
    // Calculate end-of-life packaging waste footprint
    try {
      const packagingComponents = {
        glassBottleWeightKg: product.bottleWeight ? parseFloat(product.bottleWeight) / 1000 : 0,
        paperLabelWeightKg: product.labelWeight ? parseFloat(product.labelWeight) / 1000 : 0,
        aluminumClosureWeightKg: product.closureWeight ? parseFloat(product.closureWeight) / 1000 : 0
      };
      
      const eolFootprint = await WasteIntensityCalculationService.calculatePackagingEndOfLifeFootprint(
        packagingComponents, 
        'United Kingdom'
      );
      
      endOfLifePackagingFootprint = eolFootprint.totalEolCarbonFootprint;
    } catch (error) {
      endOfLifePackagingFootprint = 0;
    }

    // 4. Record water dilution but exclude from product water footprint
    if (product.waterDilution) {
      try {
        const dilutionData = typeof product.waterDilution === 'string' 
          ? JSON.parse(product.waterDilution) 
          : product.waterDilution;
        
        if (dilutionData?.amount) {
          breakdown.dilutionRecorded.amount = Number(dilutionData.amount);
          breakdown.dilutionRecorded.unit = dilutionData.unit || 'ml';
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }

    // 5. Calculate final totals
    totalCO2e = breakdown.ingredients.co2e + breakdown.packaging.co2e + breakdown.facilities.co2e + productionWasteFootprint + endOfLifePackagingFootprint;
    totalWater = breakdown.ingredients.water + breakdown.packaging.water + breakdown.facilities.water; // Excludes dilution
    totalWaste = breakdown.ingredients.waste + breakdown.packaging.waste; // Facility waste excluded per requirements

    return {
      totalCO2e,
      totalWater,
      totalWaste,
      breakdown,
      productionWasteFootprint,
      endOfLifeFootprint: endOfLifePackagingFootprint
    };
  }
  
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
        
        // B Corp specific data points
        case 'suppliers_with_signed_code':
          return await this.calculateSuppliersWithSignedCode(companyId);
          
        case 'suppliers_human_rights_screened':
          return await this.calculateSuppliersHumanRightsScreened(companyId);
          
        case 'total_employees':
          return await this.calculateTotalEmployees(companyId);
          
        case 'employees_earning_living_wage':
          return await this.calculateEmployeesEarningLivingWage(companyId);
          
        case 'employees_covered_by_wellbeing_programs':
          return await this.calculateEmployeesCoveredByWellbeingPrograms(companyId);
          
        case 'employees_completed_jedi_training':
          return await this.calculateEmployeesCompletedJediTraining(companyId);
          
        case 'total_training_hours':
          return await this.calculateTotalTrainingHours(companyId);
          
        case 'jedi_policy_implemented':
          return await this.checkJediPolicyImplemented(companyId);
          
        case 'human_rights_policy_implemented':
          return await this.checkHumanRightsPolicyImplemented(companyId);
        
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

      // Only process KPIs that have actual company goals set
      const relevantKPIs = allKPIs.filter(kpi => {
        // Include custom KPIs (company-specific)
        if (kpi.companyId !== null) return true;
        
        // For preset KPIs, only include if there's a matching company goal
        return goals.some(goal => 
          goal.kpiName.toLowerCase().includes(kpi.kpiName.toLowerCase())
        );
      });

      // Get project goals
      const projectGoalsData = await db
        .select()
        .from(projectGoals)
        .where(eq(projectGoals.companyId, companyId));

      const dashboardKPIs: DashboardKPIData[] = [];

      for (const kpi of relevantKPIs) {
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
      'Carbon Intensity': 2.5, // kg CO2e/L - realistic target for sustainable production
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
   * Calculate total carbon footprint using LIVE DASHBOARD CALCULATION METHOD
   * Uses the same refined LCA methodology as the comprehensive footprint endpoint
   */
  async calculateTotalCarbonFootprint(companyId: number): Promise<number> {
    try {
      // LIVE CALCULATION: Use same method as /api/company/footprint/comprehensive
      const companyProducts = await db
        .select()
        .from(products)
        .where(eq(products.companyId, companyId));

      let totalCompanyCO2e = 0;
      
      console.log(`🔥 KPI SERVICE: Live calculation for ${companyProducts.length} products`);
      
      for (const product of companyProducts) {
        const annualProduction = parseFloat(product.annualProductionVolume?.toString() || '0');
        if (annualProduction === 0) continue;
        
        let productEmissions = 0;
        
        // 1. Calculate OpenLCA-based ingredient emissions
        if (product.ingredients && Array.isArray(product.ingredients)) {
          for (const ingredient of product.ingredients) {
            if (ingredient.name && ingredient.amount > 0) {
              try {
                const carbonFootprint = await OpenLCAService.calculateCarbonFootprint(
                  ingredient.name,
                  ingredient.amount,
                  ingredient.unit || 'kg'
                );
                if (carbonFootprint > 0) {
                  productEmissions += carbonFootprint;
                }
              } catch (error) {
                console.warn(`Error calculating OpenLCA for ${ingredient.name}:`, error);
              }
            }
          }
        }
        
        // 2. Add packaging emissions (glass bottles)
        if (product.bottleWeight) {
          const bottleWeightKg = parseFloat(product.bottleWeight) / 1000;
          const recycledContent = parseFloat(product.bottleRecycledContent || '0') / 100;
          const glassEmissions = bottleWeightKg * (
            (1 - recycledContent) * 0.7 + recycledContent * 0.35
          );
          productEmissions += glassEmissions;
        }
        
        // 3. Add facility impacts per unit
        const facilities = await db.select().from(productionFacilities).where(eq(productionFacilities.companyId, companyId));
        for (const facility of facilities) {
          if (facility.totalElectricityKwhPerYear) {
            const electricityKwh = parseFloat(facility.totalElectricityKwhPerYear);
            const renewablePercent = facility.renewableEnergyPercent ? parseFloat(facility.renewableEnergyPercent) / 100 : 0;
            const gridElectricity = electricityKwh * (1 - renewablePercent);
            const co2eFromElectricity = (gridElectricity * 0.233) / annualProduction;
            productEmissions += co2eFromElectricity;
          }
          
          if (facility.totalGasM3PerYear) {
            const gasM3 = parseFloat(facility.totalGasM3PerYear);
            const co2eFromGas = (gasM3 * 1.8514) / annualProduction;
            productEmissions += co2eFromGas;
          }
        }
        
        const productTotalKg = productEmissions * annualProduction;
        totalCompanyCO2e += productTotalKg;
        
        console.log(`🔬 LIVE LCA ${product.name}: ${productEmissions.toFixed(6)} kg CO₂e/unit × ${annualProduction} = ${productTotalKg.toFixed(0)} kg CO₂e`);
      }

      console.log(`🔥 KPI SERVICE: Live total carbon footprint: ${totalCompanyCO2e.toFixed(0)} kg CO₂e (${(totalCompanyCO2e/1000).toFixed(3)} tonnes)`);
      return totalCompanyCO2e;
    } catch (error) {
      console.error('Error calculating live carbon footprint:', error);
      return 0;
    }
  }

  /**
   * Calculate Carbon Intensity per Unit (kg CO2e per unit produced)
   * Total emissions ÷ Total units produced across all products
   */
  async calculateCarbonIntensityPerUnit(companyId: number): Promise<number> {
    try {
      const totalCarbonKg = await this.calculateTotalCarbonFootprint(companyId);
      const totalUnits = await this.calculateTotalCompanyProductionUnits(companyId);
      
      const intensityPerUnit = totalUnits > 0 ? totalCarbonKg / totalUnits : 0;
      
      console.log(`🎯 Carbon Intensity per Unit: ${totalCarbonKg.toFixed(0)}kg ÷ ${totalUnits.toLocaleString()} units = ${intensityPerUnit.toFixed(6)} kg CO₂e/unit`);
      return intensityPerUnit;
    } catch (error) {
      console.error('Error calculating carbon intensity per unit:', error);
      return 0;
    }
  }

  /**
   * Calculate Carbon Intensity per Litre (kg CO2e per litre of liquid produced)  
   * Total emissions ÷ Total litres produced across all products
   */
  async calculateCarbonIntensityPerLitre(companyId: number): Promise<number> {
    try {
      const totalCarbonKg = await this.calculateTotalCarbonFootprint(companyId);
      const totalLitres = await this.calculateTotalLitersProduced(companyId);
      
      const intensityPerLitre = totalLitres > 0 ? totalCarbonKg / totalLitres : 0;
      
      console.log(`🎯 Carbon Intensity per Litre: ${totalCarbonKg.toFixed(0)}kg ÷ ${totalLitres.toFixed(1)}L = ${intensityPerLitre.toFixed(6)} kg CO₂e/L`);
      return intensityPerLitre;
    } catch (error) {
      console.error('Error calculating carbon intensity per litre:', error);
      return 0;
    }
  }

  async calculateTotalProductionVolume(companyId: number): Promise<number> {
    try {
      // Calculate from actual product data - no more hardcoded values
      const companyProducts = await db
        .select()
        .from(products)
        .where(eq(products.companyId, companyId));

      let totalProduction = 0;
      
      for (const product of companyProducts) {
        const volume = parseFloat(product.annualProductionVolume?.toString() || '0');
        totalProduction += volume;
        console.log(`📊 ${product.name}: ${volume} bottles/year`);
      }

      console.log(`🧮 Total company production: ${totalProduction} bottles/year`);
      return totalProduction;
    } catch (error) {
      console.error('Error calculating total production volume:', error);
      return 0;
    }
  }

  async calculateTotalWaterConsumption(companyId: number): Promise<number> {
    try {
      // Calculate using Refined LCA System (excludes dilution water as per requirements)
      const companyProducts = await db
        .select()
        .from(products)
        .where(eq(products.companyId, companyId));

      let totalWater = 0;
      
      for (const product of companyProducts) {
        if (product.annualProductionVolume) {
          const annualProduction = parseFloat(product.annualProductionVolume.toString());
          
          // Calculate comprehensive water footprint using refined LCA system
          const refinedLCA = await this.calculateProductRefinedLCA(product);
          const waterFootprintPerUnit = refinedLCA.totalWater; // Excludes dilution water
          
          const productTotalWater = waterFootprintPerUnit * annualProduction;
          totalWater += productTotalWater;
          
          console.log(`💧 REFINED WATER ${product.name}: ${waterFootprintPerUnit.toFixed(1)}L/unit × ${annualProduction} units = ${productTotalWater.toFixed(0)}L`);
          console.log(`   Breakdown: Ingredients=${refinedLCA.breakdown.ingredients.water.toFixed(1)}, Packaging=${refinedLCA.breakdown.packaging.water.toFixed(1)}, Facilities=${refinedLCA.breakdown.facilities.water.toFixed(1)}L (dilution=${refinedLCA.breakdown.dilutionRecorded.amount}${refinedLCA.breakdown.dilutionRecorded.unit} excluded)`);
        }
      }

      console.log(`🧮 REFINED Total company water footprint: ${totalWater.toFixed(0)}L (excludes dilution water)`);
      return totalWater;
    } catch (error) {
      console.error('Error calculating refined total water consumption:', error);
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
    try {
      const companyProducts = await db
        .select()
        .from(products)
        .where(eq(products.companyId, companyId));

      let totalRecycledWasteKg = 0;

      for (const product of companyProducts) {
        const annualProduction = parseFloat(product.annualProductionVolume?.toString() || '0');
        
        // Calculate recycled portion from packaging
        if (product.bottleWeight && product.bottleRecycledContent) {
          const bottleWeightKg = parseFloat(product.bottleWeight.toString()) / 1000; // Convert grams to kg
          const recycledContent = parseFloat(product.bottleRecycledContent?.toString() || '0') / 100;
          
          // Recycled portion of bottles
          const recycledWastePerUnit = bottleWeightKg * recycledContent;
          totalRecycledWasteKg += recycledWastePerUnit * annualProduction;
        }
      }

      console.log(`♻️  Calculated total company recycled waste: ${totalRecycledWasteKg.toFixed(1)} kg annually`);
      return totalRecycledWasteKg; // Return annual recycled waste in kg
    } catch (error) {
      console.error('Error calculating recycled waste:', error);
      return 0;
    }
  }

  async calculateTotalWasteGenerated(companyId: number): Promise<number> {
    try {
      const companyProducts = await db
        .select()
        .from(products)
        .where(eq(products.companyId, companyId));

      let totalWasteKg = 0;

      for (const product of companyProducts) {
        const annualProduction = parseFloat(product.annualProductionVolume?.toString() || '0');
        
        // Calculate comprehensive waste using refined LCA system and WasteIntensityCalculationService
        const refinedLCA = await this.calculateProductRefinedLCA(product);
        const wastePerUnit = refinedLCA.totalWaste;
        
        // Add production facility waste from WasteIntensityCalculationService
        let facilityWastePerUnit = 0;
        try {
          const wasteIntensityData = await WasteIntensityCalculationService.calculateWasteIntensity(1); // Primary facility
          facilityWastePerUnit = wasteIntensityData.productionWasteIntensity;
          console.log(`🏭 Facility waste intensity: ${facilityWastePerUnit.toFixed(6)} kg waste per unit`);
        } catch (error) {
          console.warn('Facility waste calculation failed, using fallback:', error);
          facilityWastePerUnit = 0.002; // 2g fallback
        }
        
        const totalWastePerUnit = wastePerUnit + facilityWastePerUnit;
        const productTotalWaste = totalWastePerUnit * annualProduction;
        totalWasteKg += productTotalWaste;
        
        console.log(`🗑️ REFINED WASTE ${product.name}: ${totalWastePerUnit.toFixed(6)} kg/unit × ${annualProduction} units = ${productTotalWaste.toFixed(1)} kg`);
        console.log(`   Breakdown: Product waste=${wastePerUnit.toFixed(6)}, Facility waste=${facilityWastePerUnit.toFixed(6)} kg per unit`);
      }

      console.log(`🧮 REFINED Total company waste: ${totalWasteKg.toFixed(1)} kg annually`);
      return totalWasteKg;
    } catch (error) {
      console.error('Error calculating refined total waste generated:', error);
      return 0;
    }
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
    try {
      const verifiedSuppliers = await db
        .select()
        .from(verifiedSuppliers)
        .where(and(
          eq(verifiedSuppliers.companyId, companyId),
          eq(verifiedSuppliers.isVerified, true)
        ));
      
      return verifiedSuppliers.length;
    } catch (error) {
      console.error('Error calculating verified suppliers:', error);
      return 0;
    }
  }

  async calculateTotalSuppliers(companyId: number): Promise<number> {
    try {
      const allSuppliers = await db
        .select()
        .from(verifiedSuppliers)
        .where(eq(verifiedSuppliers.companyId, companyId));
      
      return allSuppliers.length;
    } catch (error) {
      console.error('Error calculating total suppliers:', error);
      return 0;
    }
  }

  async calculateSupplierVerificationRate(companyId: number): Promise<number> {
    try {
      const verified = await this.calculateVerifiedSustainableSuppliers(companyId);
      const total = await this.calculateTotalSuppliers(companyId);
      const rate = total > 0 ? (verified / total) * 100 : 0;
      console.log(`🔧 Calculated supplier verification rate: ${rate.toFixed(1)}% (${verified}/${total})`);
      return rate;
    } catch (error) {
      console.error('Error calculating supplier verification rate:', error);
      return 0;
    }
  }

  async calculateLocalIngredientsVolume(companyId: number): Promise<number> {
    try {
      // Calculate based on actual ingredient data from products
      const companyProducts = await db
        .select()
        .from(products)
        .where(eq(products.companyId, companyId));

      let localVolume = 0;
      
      for (const product of companyProducts) {
        if (product.ingredients) {
          const ingredientsData = JSON.parse(product.ingredients);
          const annualProduction = parseFloat(product.annualProductionVolume?.toString() || '0');
          
          // Sum up local ingredients based on percentage and origin
          for (const ingredient of ingredientsData) {
            if (ingredient.origin === 'local' || ingredient.isLocal) {
              const percentage = parseFloat(ingredient.percentage || '0') / 100;
              const volumeML = parseFloat(product.volume?.toString().match(/([0-9.]+)/)?.[0] || '0');
              localVolume += (volumeML / 1000) * percentage * annualProduction; // Convert to liters
            }
          }
        }
      }
      
      return localVolume;
    } catch (error) {
      console.error('Error calculating local ingredients volume:', error);
      return 0;
    }
  }

  async calculateTotalIngredientsVolume(companyId: number): Promise<number> {
    try {
      // Calculate based on actual ingredient data from products
      const companyProducts = await db
        .select()
        .from(products)
        .where(eq(products.companyId, companyId));

      let totalVolume = 0;
      
      for (const product of companyProducts) {
        if (product.ingredients) {
          const annualProduction = parseFloat(product.annualProductionVolume?.toString() || '0');
          const volumeML = parseFloat(product.volume?.toString().match(/([0-9.]+)/)?.[0] || '0');
          totalVolume += (volumeML / 1000) * annualProduction; // Convert to liters
        }
      }
      
      return totalVolume;
    } catch (error) {
      console.error('Error calculating total ingredients volume:', error);
      return 0;
    }
  }

  /**
   * Calculate total liters produced by company (for Carbon Intensity calculation)
   */
  async calculateTotalLitersProduced(companyId: number): Promise<number> {
    try {
      const companyProducts = await db
        .select()
        .from(products)
        .where(eq(products.companyId, companyId));

      let totalLiters = 0;

      for (const product of companyProducts) {
        const annualProduction = parseFloat(product.annualProductionVolume?.toString() || '0');
        
        if (annualProduction > 0 && product.volume) {
          // Extract volume in ml from volume string (e.g., "750ml" -> 750)
          const volumeStr = product.volume.toString();
          const volumeMatch = volumeStr.match(/([0-9.]+)/);
          
          if (volumeMatch) {
            const volumeMl = parseFloat(volumeMatch[1]);
            // Convert ml to liters and multiply by annual production
            const litersPerUnit = volumeMl / 1000;
            totalLiters += litersPerUnit * annualProduction;
          }
        }
      }

      console.log(`🧮 Calculated total company production: ${totalLiters.toFixed(1)} liters annually`);
      return totalLiters;
    } catch (error) {
      console.error('Error calculating total liters produced:', error);
      return 0;
    }
  }

  // ===== B CORP SPECIFIC CALCULATIONS =====

  /**
   * Calculate suppliers with signed code of conduct for B Corp compliance
   */
  async calculateSuppliersWithSignedCode(companyId: number): Promise<number> {
    try {
      const suppliersWithCode = await db
        .select()
        .from(suppliers)
        .where(and(
          eq(suppliers.companyId, companyId),
          eq(suppliers.supplierCodeOfConductSigned, true)
        ));
      
      return suppliersWithCode.length;
    } catch (error) {
      console.error('Error calculating suppliers with signed code:', error);
      return 0;
    }
  }

  /**
   * Calculate suppliers screened for human rights compliance
   */
  async calculateSuppliersHumanRightsScreened(companyId: number): Promise<number> {
    try {
      const screenedSuppliers = await db
        .select()
        .from(suppliers)
        .where(and(
          eq(suppliers.companyId, companyId),
          eq(suppliers.supplierHumanRightsScreened, true)
        ));
      
      return screenedSuppliers.length;
    } catch (error) {
      console.error('Error calculating suppliers human rights screened:', error);
      return 0;
    }
  }

  /**
   * Calculate total employees from company social data
   */
  async calculateTotalEmployees(companyId: number): Promise<number> {
    try {
      const company = await db
        .select({ socialData: companies.socialData })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
      
      if (company.length > 0 && company[0].socialData) {
        const socialData = company[0].socialData as any;
        return socialData.employeeMetrics?.totalEmployees || 0;
      }
      
      return 0;
    } catch (error) {
      console.error('Error calculating total employees:', error);
      return 0;
    }
  }

  /**
   * Calculate employees earning living wage
   */
  async calculateEmployeesEarningLivingWage(companyId: number): Promise<number> {
    try {
      const company = await db
        .select({ socialData: companies.socialData })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
      
      if (company.length > 0 && company[0].socialData) {
        const socialData = company[0].socialData as any;
        const totalEmployees = socialData.employeeMetrics?.totalEmployees || 0;
        const livingWageAchieved = socialData.jediData?.livingWageAchieved || false;
        
        // If living wage is achieved for all employees, return total employees
        return livingWageAchieved ? totalEmployees : 0;
      }
      
      return 0;
    } catch (error) {
      console.error('Error calculating employees earning living wage:', error);
      return 0;
    }
  }

  /**
   * Calculate employees covered by wellbeing programs
   */
  async calculateEmployeesCoveredByWellbeingPrograms(companyId: number): Promise<number> {
    try {
      const company = await db
        .select({ socialData: companies.socialData })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
      
      if (company.length > 0 && company[0].socialData) {
        const socialData = company[0].socialData as any;
        const totalEmployees = socialData.employeeMetrics?.totalEmployees || 0;
        const wellbeingCoverage = socialData.jediData?.wellbeingProgramCoverage || 0;
        
        return Math.round((totalEmployees * wellbeingCoverage) / 100);
      }
      
      return 0;
    } catch (error) {
      console.error('Error calculating employees covered by wellbeing programs:', error);
      return 0;
    }
  }

  /**
   * Calculate employees who completed JEDI training
   */
  async calculateEmployeesCompletedJediTraining(companyId: number): Promise<number> {
    try {
      const company = await db
        .select({ socialData: companies.socialData })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
      
      if (company.length > 0 && company[0].socialData) {
        const socialData = company[0].socialData as any;
        return socialData.jediData?.employeesCompletedJediTraining || 0;
      }
      
      return 0;
    } catch (error) {
      console.error('Error calculating employees completed JEDI training:', error);
      return 0;
    }
  }

  /**
   * Calculate total training hours from company social data
   */
  async calculateTotalTrainingHours(companyId: number): Promise<number> {
    try {
      const company = await db
        .select({ socialData: companies.socialData })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
      
      if (company.length > 0 && company[0].socialData) {
        const socialData = company[0].socialData as any;
        const totalEmployees = socialData.employeeMetrics?.totalEmployees || 0;
        const trainingHoursPerEmployee = socialData.employeeMetrics?.trainingHoursPerEmployee || 0;
        
        return totalEmployees * trainingHoursPerEmployee;
      }
      
      return 0;
    } catch (error) {
      console.error('Error calculating total training hours:', error);
      return 0;
    }
  }

  /**
   * Check if JEDI policy is implemented (binary)
   */
  async checkJediPolicyImplemented(companyId: number): Promise<number> {
    try {
      const company = await db
        .select({ socialData: companies.socialData })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
      
      if (company.length > 0 && company[0].socialData) {
        const socialData = company[0].socialData as any;
        return socialData.jediData?.jediPolicyImplemented ? 1 : 0;
      }
      
      return 0;
    } catch (error) {
      console.error('Error checking JEDI policy implementation:', error);
      return 0;
    }
  }

  /**
   * Check if human rights policy is implemented (binary)
   */
  async checkHumanRightsPolicyImplemented(companyId: number): Promise<number> {
    try {
      // Check if company has evidence locker entry for human rights policy
      const policyEvidence = await db
        .select()
        .from(evidenceLocker)
        .where(and(
          eq(evidenceLocker.companyId, companyId),
          eq(evidenceLocker.policyType, 'human_rights_policy'),
          eq(evidenceLocker.isActive, true)
        ));
      
      return policyEvidence.length > 0 ? 1 : 0;
    } catch (error) {
      console.error('Error checking human rights policy implementation:', error);
      return 0;
    }
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
   * Calculate baseline value for a KPI using current platform data
   */
  async calculateBaselineValue(kpiDefinitionId: string, companyId: number): Promise<number> {
    try {
      // Get the KPI definition
      const [kpiDefinition] = await db
        .select()
        .from(kpiDefinitions)
        .where(eq(kpiDefinitions.id, kpiDefinitionId));

      if (!kpiDefinition) {
        console.error(`KPI definition not found: ${kpiDefinitionId}`);
        return 0;
      }

      // Calculate current value as baseline using existing formula logic
      const baselineValue = await this.calculateCurrentKpiValue(kpiDefinition, companyId);
      
      console.log(`📊 Calculated baseline for ${kpiDefinition.kpiName}: ${baselineValue.toFixed(4)} ${kpiDefinition.unit}`);
      return baselineValue;
    } catch (error) {
      console.error('Error calculating baseline value:', error);
      return 0;
    }
  }

  /**
   * Create a new KPI goal for a company with automatic baseline calculation
   */
  async createKpiGoal(goalData: Omit<InsertCompanyKpiGoal, 'baselineValue'> & { baselineValue?: string }): Promise<CompanyKpiGoal | null> {
    try {
      // Calculate baseline automatically if not provided
      let baselineValue: string;
      
      if (goalData.baselineValue && goalData.baselineValue !== '0') {
        // Use provided baseline (for manual override cases)
        baselineValue = goalData.baselineValue;
        console.log(`🎯 Using provided baseline value: ${baselineValue}`);
      } else {
        // Calculate baseline automatically using current platform data
        const calculatedBaseline = await this.calculateBaselineValue(goalData.kpiDefinitionId, goalData.companyId);
        baselineValue = calculatedBaseline.toString();
        console.log(`🤖 Auto-calculated baseline value: ${baselineValue}`);
      }

      const completeGoalData: InsertCompanyKpiGoal = {
        ...goalData,
        baselineValue
      };

      const [newGoal] = await db
        .insert(companyKpiGoals)
        .values(completeGoalData)
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
      case 'totalLitersProduced':
        return await calcService.calculateTotalLitersProduced(companyId);
      case 'totalCarbonEmissions / totalBottlesProduced':
        return await calcService.calculateCarbonIntensityPerUnit(companyId);
      case 'carbonIntensityPerUnit':
        return await calcService.calculateCarbonIntensityPerUnit(companyId);
      case 'totalCarbonEmissions / totalLitersProduced':  
        return await calcService.calculateCarbonIntensityPerLitre(companyId);
      case 'carbonIntensityPerLitre':
        return await calcService.calculateCarbonIntensityPerLitre(companyId);
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

  /**
   * Get analytics data for a specific category with real progress trends and alerts
   */
  async getCategoryAnalytics(companyId: number, category: string) {
    try {
      // Get goals for this category
      const allGoals = await this.getCompanyKpiGoals(companyId);
      const categoryGoals = allGoals.filter(goal => goal.kpiDefinition.kpiCategory === category);
      
      if (categoryGoals.length === 0) {
        return {
          progressTrends: [],
          alerts: [{
            type: 'info',
            title: 'No Goals Set',
            message: `Set goals in ${category} to start tracking progress`,
            date: 'Now',
            priority: 'low'
          }]
        };
      }

      // Generate real progress trends based on actual goals
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      
      const progressTrends = [];
      for (let i = 0; i < 6; i++) {
        const monthIndex = (currentMonth - 5 + i + 12) % 12;
        const month = monthNames[monthIndex];
        
        // Calculate average progress for all goals in this category
        let totalProgress = 0;
        let totalTarget = 0;
        
        for (const goal of categoryGoals) {
          const currentValue = await this.calculateCurrentKpiValue(goal.kpiDefinition, companyId);
          const { progress, targetValue } = this.calculateGoalProgress(
            currentValue,
            parseFloat(goal.baselineValue.toString()),
            parseFloat(goal.targetReductionPercentage.toString())
          );
          totalProgress += Math.max(0, Math.min(100, progress)); // Clamp between 0-100
          totalTarget += parseFloat(goal.targetReductionPercentage.toString());
        }
        
        progressTrends.push({
          month,
          progress: Math.round(totalProgress / categoryGoals.length),
          target: Math.round(totalTarget / categoryGoals.length)
        });
      }

      // Generate real alerts based on goal status
      const alerts = [];
      for (const goal of categoryGoals) {
        const currentValue = await this.calculateCurrentKpiValue(goal.kpiDefinition, companyId);
        const { progress, status } = this.calculateGoalProgress(
          currentValue,
          parseFloat(goal.baselineValue.toString()),
          parseFloat(goal.targetReductionPercentage.toString())
        );

        const targetDate = new Date(goal.targetDate);
        const daysUntilTarget = Math.ceil((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        if (status === 'behind') {
          alerts.push({
            type: 'warning',
            title: 'Goal Behind Schedule',
            message: `${goal.kpiDefinition.kpiName} is ${Math.round(100 - progress)}% behind target`,
            date: 'Current',
            priority: 'high'
          });
        } else if (status === 'at-risk') {
          alerts.push({
            type: 'warning',
            title: 'Goal At Risk',
            message: `${goal.kpiDefinition.kpiName} progress needs attention`,
            date: 'Current',
            priority: 'medium'
          });
        } else if (status === 'achieved') {
          alerts.push({
            type: 'success',
            title: 'Goal Achieved',
            message: `${goal.kpiDefinition.kpiName} target has been met!`,
            date: 'Current',
            priority: 'low'
          });
        }

        if (daysUntilTarget > 0 && daysUntilTarget <= 30 && status !== 'achieved') {
          alerts.push({
            type: 'info',
            title: 'Deadline Approaching',
            message: `${goal.kpiDefinition.kpiName} goal due in ${daysUntilTarget} days`,
            date: `${daysUntilTarget} days`,
            priority: daysUntilTarget <= 7 ? 'high' : 'medium'
          });
        }
      }

      // If no alerts generated, add a positive message
      if (alerts.length === 0) {
        alerts.push({
          type: 'success',
          title: 'All Goals On Track',
          message: `Your ${category} goals are progressing well`,
          date: 'Current',
          priority: 'low'
        });
      }

      return { progressTrends, alerts };
    } catch (error) {
      console.error('Error getting category analytics:', error);
      return {
        progressTrends: [],
        alerts: [{
          type: 'error',
          title: 'Data Error',
          message: 'Unable to load analytics data',
          date: 'Now',
          priority: 'high'
        }]
      };
    }
  }
}

// Export enhanced KPI service instance
export const enhancedKpiService = new EnhancedKPIService();