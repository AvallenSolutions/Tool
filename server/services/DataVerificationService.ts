/**
 * Phase 3: Data Verification Service
 * Provides real-time validation and quality assessment for LCA calculations
 */

export interface DataValidationResult {
  isValid: boolean;
  validationScore: number; // 0-100
  issues: ValidationIssue[];
  recommendations: string[];
  dataCompletenesss: number; // 0-100
  accuracyAssessment: {
    level: 'high' | 'medium' | 'low';
    confidence: number;
    factors: string[];
  };
}

export interface ValidationIssue {
  severity: 'critical' | 'warning' | 'info';
  category: 'data_quality' | 'methodology' | 'completeness' | 'consistency';
  message: string;
  affectedField: string;
  suggestedFix: string;
}

export class DataVerificationService {
  /**
   * Perform comprehensive data validation for LCA calculations
   */
  async validateLCAData(productData: any, lcaResults: any): Promise<DataValidationResult> {
    console.log('🔍 Phase 3: Starting comprehensive data validation...');
    
    const issues: ValidationIssue[] = [];
    
    // Validate product data completeness
    const completenessIssues = this.validateDataCompleteness(productData);
    issues.push(...completenessIssues);
    
    // Validate calculation consistency
    const consistencyIssues = this.validateCalculationConsistency(productData, lcaResults);
    issues.push(...consistencyIssues);
    
    // Validate data quality
    const qualityIssues = this.validateDataQuality(productData);
    issues.push(...qualityIssues);
    
    // Validate methodology compliance
    const methodologyIssues = this.validateMethodologyCompliance(lcaResults);
    issues.push(...methodologyIssues);
    
    // Calculate overall validation score
    const validationScore = this.calculateValidationScore(issues);
    
    // Assess data completeness
    const dataCompletenesss = this.assessDataCompleteness(productData);
    
    // Generate accuracy assessment
    const accuracyAssessment = this.assessAccuracy(issues, validationScore);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(issues);
    
    return {
      isValid: issues.filter(i => i.severity === 'critical').length === 0,
      validationScore,
      issues,
      recommendations,
      dataCompletenesss,
      accuracyAssessment
    };
  }

  /**
   * Validate data completeness for accurate LCA calculations
   */
  private validateDataCompleteness(productData: any): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Check essential product data
    if (!productData.annualProductionVolume || productData.annualProductionVolume <= 0) {
      issues.push({
        severity: 'critical',
        category: 'completeness',
        message: 'Annual production volume is required for accurate calculations',
        affectedField: 'annualProductionVolume',
        suggestedFix: 'Please provide the annual production volume in units per year'
      });
    }
    
    // Check ingredients data
    if (!productData.ingredients || productData.ingredients.length === 0) {
      issues.push({
        severity: 'critical',
        category: 'completeness',
        message: 'At least one ingredient is required for LCA calculations',
        affectedField: 'ingredients',
        suggestedFix: 'Add ingredient information including amounts and categories'
      });
    } else {
      productData.ingredients.forEach((ingredient: any, index: number) => {
        if (!ingredient.amount || ingredient.amount <= 0) {
          issues.push({
            severity: 'warning',
            category: 'completeness',
            message: `Ingredient "${ingredient.name}" is missing amount data`,
            affectedField: `ingredients[${index}].amount`,
            suggestedFix: 'Specify the amount of this ingredient per unit of product'
          });
        }
        
        if (!ingredient.category && !ingredient.type) {
          issues.push({
            severity: 'info',
            category: 'data_quality',
            message: `Ingredient "${ingredient.name}" lacks category classification`,
            affectedField: `ingredients[${index}].category`,
            suggestedFix: 'Categorize ingredient for more accurate emission factors'
          });
        }
      });
    }
    
    // Check packaging data
    if (!productData.bottleWeight || productData.bottleWeight <= 0) {
      issues.push({
        severity: 'warning',
        category: 'completeness',
        message: 'Bottle weight is missing, affecting packaging impact calculations',
        affectedField: 'bottleWeight',
        suggestedFix: 'Provide bottle weight in grams for accurate packaging footprint'
      });
    }
    
    // Check recycled content data
    if (!productData.bottleRecycledContent || productData.bottleRecycledContent === '0') {
      issues.push({
        severity: 'info',
        category: 'data_quality',
        message: 'Recycled content data missing - assuming 0% recycled content',
        affectedField: 'bottleRecycledContent',
        suggestedFix: 'Specify recycled content percentage to improve calculation accuracy'
      });
    }
    
    return issues;
  }

  /**
   * Validate calculation consistency and logical relationships
   */
  private validateCalculationConsistency(productData: any, lcaResults: any): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Check for unrealistic carbon footprint values
    if (lcaResults?.totalCarbonFootprint) {
      const carbonPerUnit = (lcaResults.totalCarbonFootprint * 1000) / (productData.annualProductionVolume || 1);
      
      if (carbonPerUnit > 10) { // > 10 kg CO2e per unit is suspicious for most beverages
        issues.push({
          severity: 'warning',
          category: 'consistency',
          message: `Carbon footprint of ${carbonPerUnit.toFixed(2)} kg CO₂e per unit appears unusually high`,
          affectedField: 'totalCarbonFootprint',
          suggestedFix: 'Review ingredient amounts and emission factors for accuracy'
        });
      }
      
      if (carbonPerUnit < 0.1) { // < 0.1 kg CO2e per unit is suspiciously low
        issues.push({
          severity: 'warning',
          category: 'consistency',
          message: `Carbon footprint of ${carbonPerUnit.toFixed(3)} kg CO₂e per unit appears unusually low`,
          affectedField: 'totalCarbonFootprint',
          suggestedFix: 'Verify that all significant emission sources are included'
        });
      }
    }
    
    // Check ingredient-to-footprint ratios
    if (productData.ingredients && lcaResults?.totalCarbonFootprint) {
      const totalIngredientMass = productData.ingredients.reduce((sum: number, ing: any) => sum + (ing.amount || 0), 0);
      const carbonPerKgIngredient = (lcaResults.totalCarbonFootprint * 1000) / totalIngredientMass;
      
      if (carbonPerKgIngredient > 100) { // > 100 kg CO2e per kg ingredient is very high
        issues.push({
          severity: 'warning',
          category: 'consistency',
          message: 'Carbon intensity per kg of ingredients appears extremely high',
          affectedField: 'ingredients',
          suggestedFix: 'Review ingredient emission factors and processing energy requirements'
        });
      }
    }
    
    return issues;
  }

  /**
   * Validate data quality based on source and methodology
   */
  private validateDataQuality(productData: any): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Check for default/placeholder values
    const suspiciousDefaults = [
      { field: 'annualProductionVolume', values: ['100000', '150000', '1000'] },
      { field: 'bottleWeight', values: ['500', '530', '750'] },
      { field: 'labelWeight', values: ['2.5', '3', '5'] }
    ];
    
    suspiciousDefaults.forEach(check => {
      const value = String(productData[check.field] || '');
      if (check.values.includes(value)) {
        issues.push({
          severity: 'info',
          category: 'data_quality',
          message: `Value for ${check.field} (${value}) appears to be a common default`,
          affectedField: check.field,
          suggestedFix: 'Verify this value represents your actual product specifications'
        });
      }
    });
    
    // Check for missing supplier information
    if (productData.ingredients) {
      const missingSupplierCount = productData.ingredients.filter((ing: any) => !ing.supplier || ing.supplier === '').length;
      if (missingSupplierCount > 0) {
        issues.push({
          severity: 'info',
          category: 'data_quality',
          message: `${missingSupplierCount} ingredients missing supplier information`,
          affectedField: 'ingredients.supplier',
          suggestedFix: 'Add supplier details for more accurate transportation impact calculations'
        });
      }
    }
    
    return issues;
  }

  /**
   * Validate compliance with LCA methodology standards
   */
  private validateMethodologyCompliance(lcaResults: any): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Check for system boundary completeness
    if (!lcaResults?.impactsByCategory || lcaResults.impactsByCategory.length === 0) {
      issues.push({
        severity: 'critical',
        category: 'methodology',
        message: 'Impact assessment by category is missing',
        affectedField: 'impactsByCategory',
        suggestedFix: 'Ensure comprehensive impact assessment across all life cycle stages'
      });
    }
    
    // Check for functional unit definition
    if (!lcaResults?.functionalUnit) {
      issues.push({
        severity: 'warning',
        category: 'methodology',
        message: 'Functional unit not clearly defined',
        affectedField: 'functionalUnit',
        suggestedFix: 'Define clear functional unit (e.g., "per 750ml bottle") for transparent reporting'
      });
    }
    
    return issues;
  }

  /**
   * Calculate overall validation score (0-100)
   */
  private calculateValidationScore(issues: ValidationIssue[]): number {
    let score = 100;
    
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'warning':
          score -= 10;
          break;
        case 'info':
          score -= 3;
          break;
      }
    });
    
    return Math.max(0, score);
  }

  /**
   * Assess data completeness percentage
   */
  private assessDataCompleteness(productData: any): number {
    const requiredFields = [
      'name', 'annualProductionVolume', 'ingredients',
      'bottleWeight', 'bottleMaterial', 'labelWeight'
    ];
    
    const optionalFields = [
      'bottleRecycledContent', 'closureWeight', 'packagingSupplier',
      'averageTransportDistance', 'recyclingRate'
    ];
    
    let completedRequired = 0;
    let completedOptional = 0;
    
    requiredFields.forEach(field => {
      if (productData[field] && productData[field] !== '' && productData[field] !== 0) {
        completedRequired++;
      }
    });
    
    optionalFields.forEach(field => {
      if (productData[field] && productData[field] !== '' && productData[field] !== 0) {
        completedOptional++;
      }
    });
    
    // Weight required fields more heavily
    const requiredWeight = 0.8;
    const optionalWeight = 0.2;
    
    const requiredScore = (completedRequired / requiredFields.length) * requiredWeight;
    const optionalScore = (completedOptional / optionalFields.length) * optionalWeight;
    
    return Math.round((requiredScore + optionalScore) * 100);
  }

  /**
   * Assess overall calculation accuracy
   */
  private assessAccuracy(issues: ValidationIssue[], validationScore: number) {
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const warningIssues = issues.filter(i => i.severity === 'warning').length;
    
    let level: 'high' | 'medium' | 'low';
    let confidence: number;
    let factors: string[] = [];
    
    if (criticalIssues === 0 && validationScore >= 85) {
      level = 'high';
      confidence = 90;
      factors = ['Complete data coverage', 'Consistent methodology', 'Quality data sources'];
    } else if (criticalIssues === 0 && validationScore >= 70) {
      level = 'medium';
      confidence = 75;
      factors = ['Good data coverage', 'Minor gaps in methodology', 'Mostly quality data'];
    } else {
      level = 'low';
      confidence = 60;
      factors = ['Data gaps present', 'Methodology concerns', 'Some data quality issues'];
    }
    
    return { level, confidence, factors };
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(issues: ValidationIssue[]): string[] {
    const recommendations: string[] = [];
    
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const warningIssues = issues.filter(i => i.severity === 'warning');
    
    if (criticalIssues.length > 0) {
      recommendations.push(`Address ${criticalIssues.length} critical data issues before finalizing the LCA report`);
    }
    
    if (warningIssues.length > 0) {
      recommendations.push(`Review ${warningIssues.length} warnings to improve calculation accuracy`);
    }
    
    // Category-specific recommendations
    const completenessIssues = issues.filter(i => i.category === 'completeness');
    if (completenessIssues.length > 0) {
      recommendations.push('Enhance data collection processes to capture missing product specifications');
    }
    
    const qualityIssues = issues.filter(i => i.category === 'data_quality');
    if (qualityIssues.length > 0) {
      recommendations.push('Implement supplier verification processes to improve data quality');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Data validation passed successfully - proceed with confidence in the results');
    }
    
    return recommendations;
  }
}

export default DataVerificationService;