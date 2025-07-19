import { openLCAClient, OpenLCAUtils } from './openLCA';
import { lcaMappingService } from './lcaMapping';
import { LCAJobManager } from './jobs/lcaCalculationJob';
import { storage } from './storage';
import type { Product, ProductInput } from '@shared/schema';

// LCA Service - High-level interface for LCA operations
export class LCAService {
  private static instance: LCAService;
  private initialized = false;

  private constructor() {}

  static getInstance(): LCAService {
    if (!LCAService.instance) {
      LCAService.instance = new LCAService();
    }
    return LCAService.instance;
  }

  // Initialize the LCA service
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if OpenLCA is configured
      const hasValidConfig = process.env.OPENLCA_SERVER_URL && 
                           process.env.OPENLCA_SERVER_URL !== 'http://localhost:8080';
      
      if (!hasValidConfig) {
        console.log('OpenLCA not configured - LCA service will run in mock mode');
        this.initialized = true;
        return;
      }

      // Validate OpenLCA configuration
      if (!OpenLCAUtils.validateConfiguration()) {
        console.warn('OpenLCA configuration is invalid - running in mock mode');
        this.initialized = true;
        return;
      }

      // Test OpenLCA connection
      const isConnected = await openLCAClient.testConnection();
      if (!isConnected) {
        console.warn('Cannot connect to OpenLCA server - running in mock mode');
        this.initialized = true;
        return;
      }

      // Initialize mapping service
      await lcaMappingService.initialize();

      // Get database info
      const dbInfo = await openLCAClient.getDatabaseInfo();
      console.log('Connected to OpenLCA database:', dbInfo.name || 'Unknown');

      this.initialized = true;
      console.log('LCA service initialized successfully with OpenLCA');
    } catch (error) {
      console.warn('LCA service initialization failed, running in mock mode:', error.message);
      this.initialized = true;
    }
  }

  // Calculate LCA for a product
  async calculateProductLCA(
    productId: number,
    options?: {
      impactMethodId?: string;
      allocationMethod?: string;
      includeTransport?: boolean;
      includeProcessing?: boolean;
      forceRecalculation?: boolean;
    }
  ): Promise<{ jobId: string; estimatedDuration: number }> {
    if (!this.initialized) {
      await this.initialize();
    }

    const product = await storage.getProductById(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    // Check if calculation is already in progress
    if (!options?.forceRecalculation) {
      const existingJobs = await storage.getLcaCalculationJobsByProduct(productId);
      const activeJob = existingJobs.find(job => 
        job.status === 'pending' || job.status === 'processing'
      );
      
      if (activeJob) {
        return {
          jobId: activeJob.jobId,
          estimatedDuration: this.estimateCalculationDuration(product),
        };
      }
    }

    // Queue new calculation
    const job = await LCAJobManager.queueLCACalculation(productId, options);
    
    return {
      jobId: job.jobId,
      estimatedDuration: this.estimateCalculationDuration(product),
    };
  }

  // Get LCA calculation status
  async getCalculationStatus(jobId: string): Promise<{
    status: string;
    progress: number;
    results?: any;
    errorMessage?: string;
    estimatedTimeRemaining?: number;
  }> {
    const job = await storage.getLcaCalculationJobByJobId(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const bullJob = await LCAJobManager.getJobStatus(jobId);
    const estimatedTimeRemaining = bullJob ? 
      this.estimateRemainingTime(job.progress, bullJob.processedOn || Date.now()) : 
      0;

    return {
      status: job.status,
      progress: job.progress,
      results: job.results,
      errorMessage: job.errorMessage,
      estimatedTimeRemaining,
    };
  }

  // Get all LCA calculations for a product
  async getProductLCAHistory(productId: number): Promise<any[]> {
    const jobs = await storage.getLcaCalculationJobsByProduct(productId);
    return jobs.map(job => ({
      id: job.id,
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      results: job.results,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      olcaSystemId: job.olcaSystemId,
      olcaSystemName: job.olcaSystemName,
    }));
  }

  // Cancel LCA calculation
  async cancelCalculation(jobId: string): Promise<boolean> {
    return await LCAJobManager.cancelJob(jobId);
  }

  // Get LCA service status
  async getServiceStatus(): Promise<{
    initialized: boolean;
    openLCAConnected: boolean;
    mappingStats: any;
    queueStats: any;
    databaseInfo?: any;
  }> {
    const status = {
      initialized: this.initialized,
      openLCAConnected: false,
      mappingStats: lcaMappingService.getMappingStats(),
      queueStats: await LCAJobManager.getQueueStats(),
      databaseInfo: undefined,
    };

    if (this.initialized) {
      try {
        status.openLCAConnected = await openLCAClient.testConnection();
        if (status.openLCAConnected) {
          status.databaseInfo = await openLCAClient.getDatabaseInfo();
        }
      } catch (error) {
        console.error('Error checking OpenLCA connection:', error);
      }
    }

    return status;
  }

  // Estimate calculation duration based on product complexity
  private estimateCalculationDuration(product: Product): number {
    // Base duration in seconds
    let baseDuration = 60; // 1 minute minimum

    // Add time based on product complexity
    if (product.ingredients && Array.isArray(product.ingredients)) {
      baseDuration += product.ingredients.length * 15; // 15 seconds per ingredient
    }

    // Add time for production volume (larger volumes take longer)
    const volume = parseFloat(product.annualProductionVolume?.toString() || '1000');
    if (volume > 10000) baseDuration += 30;
    if (volume > 100000) baseDuration += 60;

    return baseDuration;
  }

  // Estimate remaining time for a calculation
  private estimateRemainingTime(progress: number, startTime: number): number {
    if (progress <= 0) return 0;
    
    const elapsed = Date.now() - startTime;
    const estimated = (elapsed / progress) * (100 - progress);
    
    return Math.max(0, Math.floor(estimated / 1000)); // Return in seconds
  }

  // Validate product data for LCA calculation
  async validateProductForLCA(productId: number): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const product = await storage.getProductById(productId);
    if (!product) {
      return {
        valid: false,
        errors: ['Product not found'],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!product.name) errors.push('Product name is required');
    if (!product.annualProductionVolume) errors.push('Annual production volume is required');

    // Check packaging data
    if (!product.bottleMaterial) warnings.push('Bottle material not specified');
    if (!product.bottleWeight) warnings.push('Bottle weight not specified');

    // Check ingredients
    if (!product.ingredients || !Array.isArray(product.ingredients) || product.ingredients.length === 0) {
      warnings.push('No ingredients specified');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Get available impact methods from OpenLCA
  async getAvailableImpactMethods(): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    categories: string[];
  }>> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const methods = await openLCAClient.searchImpactMethods('');
      return methods.map(method => ({
        id: method['@id'],
        name: method.name || 'Unknown',
        description: method.description,
        categories: method.impactCategories?.map(cat => cat.name || 'Unknown') || [],
      }));
    } catch (error) {
      console.error('Error fetching impact methods:', error);
      return [];
    }
  }

  // Search for flows in OpenLCA
  async searchFlows(query: string, flowType?: string): Promise<Array<{
    id: string;
    name: string;
    flowType: string;
    unit?: string;
  }>> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const flows = await openLCAClient.searchFlows(query, flowType);
      return flows.map(flow => ({
        id: flow['@id'],
        name: flow.name || 'Unknown',
        flowType: flow.flowType || 'Unknown',
        unit: flow.referenceFlowProperty?.name,
      }));
    } catch (error) {
      console.error('Error searching flows:', error);
      return [];
    }
  }

  // Search for processes in OpenLCA
  async searchProcesses(query: string, processType?: string): Promise<Array<{
    id: string;
    name: string;
    processType: string;
    location?: string;
  }>> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const processes = await openLCAClient.searchProcesses(query, processType);
      return processes.map(process => ({
        id: process['@id'],
        name: process.name || 'Unknown',
        processType: process.processType || 'Unknown',
        location: undefined, // This would need to be extracted from the process data
      }));
    } catch (error) {
      console.error('Error searching processes:', error);
      return [];
    }
  }
}

// Export singleton instance
export const lcaService = LCAService.getInstance();

// Export utility functions
export { OpenLCAUtils, LCAJobManager };