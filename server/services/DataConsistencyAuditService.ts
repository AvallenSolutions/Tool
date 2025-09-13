// Storage will be imported dynamically to avoid circular dependencies
import { EnhancedLCACalculationService } from './ConsolidatedLCAService';
import type { LCAResults as EnhancedLCAResults } from './ConsolidatedLCAService';

export interface ProductAuditResult {
  productId: number;
  productName: string;
  storedValues: {
    carbonFootprint?: number;
    waterFootprint?: number;
    wasteFootprint?: number;
  };
  calculatedValues: {
    carbonFootprint: number;
    waterFootprint: number;
    wasteFootprint?: number;
  };
  discrepancies: {
    carbonFootprint?: {
      stored: number;
      calculated: number;
      difference: number;
      percentageDifference: number;
    };
    waterFootprint?: {
      stored: number;
      calculated: number;
      difference: number;
      percentageDifference: number;
    };
    wasteFootprint?: {
      stored: number;
      calculated: number;
      difference: number;
      percentageDifference: number;
    };
  };
  hasDiscrepancies: boolean;
  auditTimestamp: Date;
}

export interface AuditSummary {
  totalProductsAudited: number;
  productsWithDiscrepancies: number;
  productsConsistent: number;
  auditTimestamp: Date;
  productResults: ProductAuditResult[];
  overallFindings: string[];
}

export class DataConsistencyAuditService {
  
  private static readonly DISCREPANCY_THRESHOLD = 0.05; // 5% difference threshold
  
  /**
   * Perform comprehensive audit of all products
   */
  public static async auditAllProducts(): Promise<AuditSummary> {
    console.log('🔍 Starting comprehensive data consistency audit...');
    
    // Import storage from the correct location
    const { storage: dbStorage } = await import('../storage');
    const products = await dbStorage.getAllProducts();
    const auditResults: ProductAuditResult[] = [];
    const overallFindings: string[] = [];
    
    console.log(`📦 Found ${products.length} products to audit`);
    
    for (const product of products) {
      try {
        const result = await this.auditSingleProduct(product.id);
        auditResults.push(result);
        
        if (result.hasDiscrepancies) {
          console.log(`⚠️  Found discrepancies in product: ${result.productName}`);
        } else {
          console.log(`✅ Product consistent: ${result.productName}`);
        }
      } catch (error) {
        console.error(`❌ Error auditing product ${product.name} (ID: ${product.id}):`, error);
        overallFindings.push(`Failed to audit product: ${product.name} - ${error.message}`);
      }
    }
    
    const productsWithDiscrepancies = auditResults.filter(r => r.hasDiscrepancies).length;
    const productsConsistent = auditResults.length - productsWithDiscrepancies;
    
    // Generate overall findings
    if (productsWithDiscrepancies === 0) {
      overallFindings.push(`✅ All ${products.length} products show consistent data between stored and calculated values`);
    } else {
      overallFindings.push(`⚠️  ${productsWithDiscrepancies} out of ${products.length} products have data discrepancies`);
      overallFindings.push(`📊 ${productsConsistent} products have consistent data`);
    }
    
    return {
      totalProductsAudited: products.length,
      productsWithDiscrepancies,
      productsConsistent,
      auditTimestamp: new Date(),
      productResults: auditResults,
      overallFindings
    };
  }
  
  /**
   * Audit a single product for consistency
   */
  public static async auditSingleProduct(productId: number): Promise<ProductAuditResult> {
    const { storage: dbStorage } = await import('../storage');
    const product = await dbStorage.getProductById(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }
    
    console.log(`🔍 Auditing product: ${product.name} (ID: ${productId})`);
    
    // Get stored values from database
    const storedValues = {
      carbonFootprint: product.carbonFootprint ? parseFloat(product.carbonFootprint) : undefined,
      waterFootprint: product.waterFootprint ? parseFloat(product.waterFootprint) : undefined,
      wasteFootprint: product.wasteFootprint ? parseFloat(product.wasteFootprint) : undefined,
    };
    
    // Calculate live values using Enhanced LCA service
    const calculatedResults = await this.calculateLiveValues(product);
    
    const calculatedValues = {
      carbonFootprint: calculatedResults.totalCarbonFootprint,
      waterFootprint: calculatedResults.totalWaterFootprint,
      wasteFootprint: calculatedResults.totalWasteGenerated, // If available
    };
    
    // Compare and find discrepancies
    const discrepancies: ProductAuditResult['discrepancies'] = {};
    let hasDiscrepancies = false;
    
    // Check carbon footprint
    if (storedValues.carbonFootprint !== undefined) {
      const carbonDiff = this.calculateDiscrepancy(
        storedValues.carbonFootprint, 
        calculatedValues.carbonFootprint
      );
      if (carbonDiff.hasDiscrepancy) {
        discrepancies.carbonFootprint = carbonDiff;
        hasDiscrepancies = true;
      }
    }
    
    // Check water footprint
    if (storedValues.waterFootprint !== undefined) {
      const waterDiff = this.calculateDiscrepancy(
        storedValues.waterFootprint, 
        calculatedValues.waterFootprint
      );
      if (waterDiff.hasDiscrepancy) {
        discrepancies.waterFootprint = waterDiff;
        hasDiscrepancies = true;
      }
    }
    
    // Check waste footprint (if available)
    if (storedValues.wasteFootprint !== undefined && calculatedValues.wasteFootprint !== undefined) {
      const wasteDiff = this.calculateDiscrepancy(
        storedValues.wasteFootprint, 
        calculatedValues.wasteFootprint
      );
      if (wasteDiff.hasDiscrepancy) {
        discrepancies.wasteFootprint = wasteDiff;
        hasDiscrepancies = true;
      }
    }
    
    return {
      productId: product.id,
      productName: product.name,
      storedValues,
      calculatedValues,
      discrepancies,
      hasDiscrepancies,
      auditTimestamp: new Date()
    };
  }
  
  /**
   * Calculate live values using Enhanced LCA service
   */
  private static async calculateLiveValues(product: any): Promise<EnhancedLCAResults & { totalWasteGenerated?: number }> {
    // Validate product data first
    if (!product || !product.id) {
      throw new Error('Invalid product data provided');
    }
    
    console.log(`🔍 Calculating live values for product: ${product.name} (ID: ${product.id})`);
    
    const productionVolume = parseFloat(product.annualProductionVolume?.toString() || '1000');
    if (isNaN(productionVolume)) {
      console.warn(`⚠️ Invalid production volume for product ${product.name}, using default 1000`);
    }
    
    // Prepare LCA inputs from product data
    const lcaInputs = {
      agriculture: {
        mainCropType: 'sugarcane',
        yieldTonPerHectare: 50,
        dieselLPerHectare: 100,
        sequestrationTonCo2PerTonCrop: 0.5,
      },
      inboundTransport: {
        distanceKm: 1000,
        mode: 'ship' as const,
        loadFactor: 80,
      },
      processing: {
        waterM3PerTonCrop: 15,
        electricityKwhPerTonCrop: 500,
        netWaterUseLPerBottle: product.volume ? parseFloat(product.volume.replace(/[^0-9.]/g, '')) / 1000 : 0.75,
        spiritYieldLPerTonCrop: 200,
        angelsSharePercentage: 2,
      },
      packaging: {
        bottleMaterialType: product.bottleMaterial || 'glass',
        bottleWeightG: parseFloat(product.bottleWeight || '530'),
        recycledContentPercent: parseFloat(product.bottleRecycledContent || '61'),
        labelWeight: parseFloat(product.labelWeight || '1.2'),
        labelMaterial: product.labelMaterial || 'paper',
        closureType: product.closureType || 'screw-cap',
        closureMaterial: product.closureMaterial || 'aluminum',
      },
      distribution: {
        domesticTransportKm: 500,
        exportTransportKm: 2000,
        domesticSalesPercent: 60,
        exportSalesPercent: 40,
      },
      endOfLife: {
        recycling: {
          bottleRecyclingRate: 0.8,
          labelRecyclingRate: 0.6,
        },
      },
    };
    
    // Calculate using Enhanced LCA service
    const results = await EnhancedLCACalculationService.calculate(
      { ...product, ingredients: product.ingredients || [] },
      lcaInputs,
      productionVolume
    );
    
    // Estimate waste footprint (since Enhanced LCA doesn't directly calculate this)
    const bottleWeight = parseFloat(product.bottleWeight || '530') / 1000; // Convert to kg
    const labelWeight = parseFloat(product.labelWeight || '1.2') / 1000; // Convert to kg
    const totalWasteGenerated = bottleWeight + labelWeight; // Simple waste calculation
    
    return {
      ...results,
      totalWasteGenerated
    };
  }
  
  /**
   * Calculate discrepancy between stored and calculated values
   */
  private static calculateDiscrepancy(storedValue: number, calculatedValue: number) {
    const difference = Math.abs(storedValue - calculatedValue);
    const percentageDifference = calculatedValue > 0 ? (difference / calculatedValue) * 100 : 0;
    const hasDiscrepancy = percentageDifference > (this.DISCREPANCY_THRESHOLD * 100);
    
    return {
      stored: storedValue,
      calculated: calculatedValue,
      difference,
      percentageDifference: Math.round(percentageDifference * 100) / 100,
      hasDiscrepancy
    };
  }
  
  /**
   * Generate detailed audit report as text
   */
  public static generateAuditReport(auditSummary: AuditSummary): string {
    let report = `
# Data Consistency Audit Report
**Audit Date:** ${auditSummary.auditTimestamp.toISOString()}
**Products Audited:** ${auditSummary.totalProductsAudited}
**Products with Discrepancies:** ${auditSummary.productsWithDiscrepancies}
**Consistent Products:** ${auditSummary.productsConsistent}

## Overall Findings:
${auditSummary.overallFindings.map(finding => `- ${finding}`).join('\n')}

## Product Details:
`;
    
    for (const result of auditSummary.productResults) {
      report += `\n### ${result.productName} (ID: ${result.productId})`;
      report += `\n**Status:** ${result.hasDiscrepancies ? '⚠️ Discrepancies Found' : '✅ Consistent'}`;
      
      if (result.storedValues.carbonFootprint !== undefined) {
        report += `\n- **Carbon Footprint:** Stored: ${result.storedValues.carbonFootprint}kg CO₂e, Calculated: ${result.calculatedValues.carbonFootprint.toFixed(3)}kg CO₂e`;
      }
      
      if (result.storedValues.waterFootprint !== undefined) {
        report += `\n- **Water Footprint:** Stored: ${result.storedValues.waterFootprint}L, Calculated: ${result.calculatedValues.waterFootprint.toFixed(1)}L`;
      }
      
      if (result.storedValues.wasteFootprint !== undefined) {
        report += `\n- **Waste Footprint:** Stored: ${result.storedValues.wasteFootprint}kg, Calculated: ${result.calculatedValues.wasteFootprint?.toFixed(3) || 'N/A'}kg`;
      }
      
      if (result.hasDiscrepancies) {
        report += `\n**Discrepancies Found:**`;
        Object.entries(result.discrepancies).forEach(([metric, discrepancy]) => {
          if (discrepancy) {
            report += `\n- ${metric}: ${discrepancy.percentageDifference}% difference (${discrepancy.difference.toFixed(3)} units)`;
          }
        });
      }
      
      report += `\n`;
    }
    
    return report;
  }
}