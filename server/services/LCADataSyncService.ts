/**
 * LCA Data Sync Service - Phase 3: Future-Proofing
 * Automatically syncs LCA calculation results to database with validation
 */

export interface SyncResult {
  productId: number;
  success: boolean;
  syncedFields: string[];
  validationErrors: string[];
  previousValues: {
    carbonFootprint?: number;
    waterFootprint?: number;
    wasteFootprint?: number;
  };
  newValues: {
    carbonFootprint: number;
    waterFootprint: number;
    wasteFootprint?: number;
  };
  syncTimestamp: Date;
}

export interface ValidationRule {
  field: string;
  minValue?: number;
  maxValue?: number;
  maxChangePercentage?: number;
  description: string;
}

export class LCADataSyncService {
  
  // Validation rules to prevent unrealistic values
  private static readonly VALIDATION_RULES: ValidationRule[] = [
    {
      field: 'carbonFootprint',
      minValue: 0.1,
      maxValue: 50.0, // Maximum realistic for spirits (kg CO2e per unit)
      maxChangePercentage: 300, // Max 300% change from previous value
      description: 'Carbon footprint must be realistic for spirits products'
    },
    {
      field: 'waterFootprint',
      minValue: 1.0,
      maxValue: 500.0, // Maximum realistic water usage (L per unit)
      maxChangePercentage: 500, // Max 500% change from previous value
      description: 'Water footprint must be realistic for spirits production'
    },
    {
      field: 'wasteFootprint',
      minValue: 0.01,
      maxValue: 10.0, // Maximum realistic waste (kg per unit)
      maxChangePercentage: 1000, // Max 1000% change (waste can vary significantly)
      description: 'Waste footprint must be realistic for product packaging'
    }
  ];
  
  /**
   * Automatically sync LCA calculation results to database with validation
   */
  public static async syncLCAResults(
    productId: number,
    lcaResults: {
      totalCarbonFootprint: number;
      totalWaterFootprint: number;
      totalWasteGenerated?: number;
      metadata?: any;
    }
  ): Promise<SyncResult> {
    console.log(`🔄 Auto-syncing LCA results for product ${productId}...`);
    
    const { storage: dbStorage } = await import('../storage');
    
    try {
      // Get current product data
      const product = await dbStorage.getProductById(productId);
      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }
      
      // Store previous values for comparison
      const previousValues = {
        carbonFootprint: product.carbonFootprint ? parseFloat(product.carbonFootprint) : undefined,
        waterFootprint: product.waterFootprint ? parseFloat(product.waterFootprint) : undefined,
        wasteFootprint: product.wasteFootprint ? parseFloat(product.wasteFootprint) : undefined,
      };
      
      // Prepare new values
      const newValues = {
        carbonFootprint: lcaResults.totalCarbonFootprint,
        waterFootprint: lcaResults.totalWaterFootprint,
        wasteFootprint: lcaResults.totalWasteGenerated || undefined,
      };
      
      console.log(`📊 Product ${product.name}: Syncing new LCA values`, newValues);
      
      // Validate new values
      const validationErrors = this.validateValues(newValues, previousValues);
      
      if (validationErrors.length > 0) {
        console.warn(`⚠️  Validation warnings for product ${product.name}:`, validationErrors);
        // Continue sync but log warnings
      }
      
      // Prepare update data
      const updateData: any = {};
      const syncedFields: string[] = [];
      
      if (newValues.carbonFootprint > 0) {
        updateData.carbonFootprint = newValues.carbonFootprint.toString();
        syncedFields.push('carbonFootprint');
      }
      
      if (newValues.waterFootprint > 0) {
        updateData.waterFootprint = newValues.waterFootprint.toString();
        syncedFields.push('waterFootprint');
      }
      
      if (newValues.wasteFootprint && newValues.wasteFootprint > 0) {
        updateData.wasteFootprint = newValues.wasteFootprint.toString();
        syncedFields.push('wasteFootprint');
      }
      
      // Sync to database
      if (Object.keys(updateData).length > 0) {
        await dbStorage.updateProduct(productId, updateData);
        console.log(`✅ Successfully synced ${syncedFields.join(', ')} for product ${product.name}`);
      }
      
      return {
        productId,
        success: true,
        syncedFields,
        validationErrors,
        previousValues,
        newValues,
        syncTimestamp: new Date()
      };
      
    } catch (error) {
      console.error(`❌ Failed to sync LCA results for product ${productId}:`, error);
      
      return {
        productId,
        success: false,
        syncedFields: [],
        validationErrors: [`Sync failed: ${error.message}`],
        previousValues: {},
        newValues: {
          carbonFootprint: lcaResults.totalCarbonFootprint,
          waterFootprint: lcaResults.totalWaterFootprint,
        },
        syncTimestamp: new Date()
      };
    }
  }
  
  /**
   * Validate new LCA values against rules and previous values
   */
  private static validateValues(
    newValues: { carbonFootprint: number; waterFootprint: number; wasteFootprint?: number },
    previousValues: { carbonFootprint?: number; waterFootprint?: number; wasteFootprint?: number }
  ): string[] {
    const errors: string[] = [];
    
    // Validate each field against rules
    for (const rule of this.VALIDATION_RULES) {
      const newValue = newValues[rule.field as keyof typeof newValues];
      const previousValue = previousValues[rule.field as keyof typeof previousValues];
      
      if (newValue === undefined || newValue === null) continue;
      
      // Check min/max bounds
      if (rule.minValue && newValue < rule.minValue) {
        errors.push(`${rule.field} value ${newValue} is below minimum ${rule.minValue}: ${rule.description}`);
      }
      
      if (rule.maxValue && newValue > rule.maxValue) {
        errors.push(`${rule.field} value ${newValue} exceeds maximum ${rule.maxValue}: ${rule.description}`);
      }
      
      // Check percentage change from previous value
      if (rule.maxChangePercentage && previousValue && previousValue > 0) {
        const changePercentage = Math.abs((newValue - previousValue) / previousValue) * 100;
        if (changePercentage > rule.maxChangePercentage) {
          errors.push(`${rule.field} changed by ${changePercentage.toFixed(1)}% (${previousValue} → ${newValue}), exceeds limit of ${rule.maxChangePercentage}%`);
        }
      }
    }
    
    return errors;
  }
  
  /**
   * Batch sync multiple products
   */
  public static async batchSyncLCAResults(
    syncJobs: Array<{
      productId: number;
      lcaResults: {
        totalCarbonFootprint: number;
        totalWaterFootprint: number;
        totalWasteGenerated?: number;
        metadata?: any;
      };
    }>
  ): Promise<SyncResult[]> {
    console.log(`🔄 Batch syncing LCA results for ${syncJobs.length} products...`);
    
    const results: SyncResult[] = [];
    
    for (const job of syncJobs) {
      try {
        const result = await this.syncLCAResults(job.productId, job.lcaResults);
        results.push(result);
      } catch (error) {
        console.error(`❌ Batch sync failed for product ${job.productId}:`, error);
        results.push({
          productId: job.productId,
          success: false,
          syncedFields: [],
          validationErrors: [`Batch sync failed: ${error.message}`],
          previousValues: {},
          newValues: {
            carbonFootprint: job.lcaResults.totalCarbonFootprint,
            waterFootprint: job.lcaResults.totalWaterFootprint,
          },
          syncTimestamp: new Date()
        });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    console.log(`✅ Batch sync completed: ${successful}/${results.length} successful`);
    
    return results;
  }
  
  /**
   * Enable/disable automatic sync (configuration)
   */
  public static async setAutoSyncEnabled(enabled: boolean): Promise<void> {
    // Store sync configuration in environment or database
    process.env.LCA_AUTO_SYNC_ENABLED = enabled.toString();
    console.log(`🔧 LCA auto-sync ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Check if auto-sync is enabled
   */
  public static isAutoSyncEnabled(): boolean {
    return process.env.LCA_AUTO_SYNC_ENABLED !== 'false';
  }
}