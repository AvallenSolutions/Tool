import Bull from 'bull';
import Redis from 'ioredis';
import { openLCAClient, OpenLCAUtils } from '../openLCA';
import { lcaMappingService } from '../lcaMapping';
import { storage } from '../storage';
import type { Product, ProductInput, LcaCalculationJob, InsertLcaCalculationJob } from '@shared/schema';

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// Create Redis connection with error handling
let redis: Redis | null = null;
let lcaCalculationQueue: Bull.Queue | null = null;

try {
  redis = new Redis({
    ...redisConfig,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    lazyConnect: true,
    maxRetriesPerRequest: 0,
  });

  // Suppress Redis connection errors
  redis.on('error', (err) => {
    console.warn('Redis connection error (LCA background jobs will be disabled):', err.message);
  });

  // Create Bull queue for LCA calculations
  lcaCalculationQueue = new Bull('lca-calculations', {
    redis: redisConfig,
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
  });
} catch (error) {
  console.warn('Failed to initialize Redis/Bull queue (LCA background jobs will be disabled):', error.message);
}

export { lcaCalculationQueue };

// Job data interface
export interface LcaCalculationJobData {
  productId: number;
  jobId: string;
  options?: {
    impactMethodId?: string;
    allocationMethod?: string;
    includeTransport?: boolean;
    includeProcessing?: boolean;
  };
}

// LCA calculation result interface
export interface LcaCalculationResult {
  productId: number;
  totalCarbonFootprint: number;
  totalWaterFootprint: number;
  impactsByCategory: Array<{
    category: string;
    impact: number;
    unit: string;
  }>;
  flowResults: Array<{
    flowName: string;
    flowType: string;
    amount: number;
    unit: string;
  }>;
  systemId: string;
  systemName: string;
  calculationDate: Date;
  metadata: {
    openLCAVersion?: string;
    databaseVersion?: string;
    calculationDuration?: number;
  };
}

// Process LCA calculation job
if (lcaCalculationQueue) {
  lcaCalculationQueue.process(async (job: Bull.Job<LcaCalculationJobData>) => {
    const { productId, jobId, options = {} } = job.data;
    
    try {
      // Update job status to processing
      await storage.updateLcaCalculationJob(parseInt(jobId), {
        status: 'processing',
        progress: 10,
      });

      // Get product data
      const product = await storage.getProductById(productId);
      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      // Get product inputs
      const inputs = await getProductInputs(productId);
      job.progress(20);

      // Map inputs to OpenLCA flows and processes
      const mappedInputs = await mapInputsToOpenLCA(inputs, product);
      job.progress(40);

      // Create OpenLCA product system
      const productSystem = await createProductSystem(product, mappedInputs);
      job.progress(60);

      // Perform LCA calculation
      const results = await performLCACalculation(productSystem, options);
      job.progress(80);

      // Update job with results
      await storage.updateLcaCalculationJob(parseInt(jobId), {
        status: 'completed',
        progress: 100,
        results: results,
        completedAt: new Date(),
        olcaSystemId: productSystem['@id'],
        olcaSystemName: productSystem.name,
      });

      // Update product with calculated footprints
      await storage.updateProduct(productId, {
        carbonFootprint: results.totalCarbonFootprint.toString(),
        waterFootprint: results.totalWaterFootprint.toString(),
      });

      job.progress(100);
      return results;

    } catch (error) {
      console.error('LCA calculation job failed:', error);
      
      // Update job status to failed
      await storage.updateLcaCalculationJob(parseInt(jobId), {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date(),
      });

      throw error;
    }
  });
}

// Get all product inputs for a product
async function getProductInputs(productId: number): Promise<ProductInput[]> {
  // This would need to be implemented in the storage layer
  // For now, we'll use a placeholder
  return [];
}

// Map product inputs to OpenLCA flows and processes
async function mapInputsToOpenLCA(inputs: ProductInput[], product: Product): Promise<any[]> {
  const mappedInputs = [];

  for (const input of inputs) {
    // Map input to OpenLCA flow
    const flowMapping = await lcaMappingService.mapInputToFlow(
      input.inputName || '',
      input.inputType || '',
      input.inputCategory || 'general'
    );

    if (flowMapping) {
      mappedInputs.push({
        input,
        flowMapping,
        olcaFlow: await openLCAClient.getFlow(flowMapping.olcaFlowId),
      });
    }
  }

  return mappedInputs;
}

// Create OpenLCA product system
async function createProductSystem(product: Product, mappedInputs: any[]): Promise<any> {
  const systemName = OpenLCAUtils.generateProductSystemName(product.name, product.sku || '');
  
  // Create a simple product system
  const productSystem = {
    '@type': 'ProductSystem',
    name: systemName,
    description: `LCA system for ${product.name}`,
    referenceProcess: null, // This would be set based on the main process
    processes: [],
    targetAmount: parseFloat(product.annualProductionVolume?.toString() || '1000'),
    targetUnit: null, // This would be set based on the product unit
  };

  // This is a simplified version - in practice, you'd need to:
  // 1. Create or find appropriate processes
  // 2. Link processes with product flows
  // 3. Set up the reference process
  // 4. Configure the target amount and unit

  return await openLCAClient.createProductSystem(productSystem);
}

// Perform LCA calculation using OpenLCA
async function performLCACalculation(productSystem: any, options: any): Promise<LcaCalculationResult> {
  // Get available impact methods
  const impactMethods = await openLCAClient.searchImpactMethods('climate change');
  const selectedMethod = impactMethods[0] || null;

  if (!selectedMethod) {
    throw new Error('No impact method found for climate change calculation');
  }

  // Set up calculation
  const calculationSetup = {
    '@type': 'CalculationSetup',
    productSystem: {
      '@type': 'ProductSystem',
      '@id': productSystem['@id'],
    },
    impactMethod: {
      '@type': 'ImpactMethod',
      '@id': selectedMethod['@id'],
    },
    targetAmount: productSystem.targetAmount,
    allocationMethod: options.allocationMethod || 'CAUSAL',
  };

  // Perform calculation
  const startTime = Date.now();
  const results = await openLCAClient.calculate(calculationSetup);
  const calculationDuration = Date.now() - startTime;

  // Parse results
  const totalCarbonFootprint = results.impactResults?.find(r => 
    r.impactCategory.name?.toLowerCase().includes('climate change')
  )?.value || 0;

  const totalWaterFootprint = results.impactResults?.find(r => 
    r.impactCategory.name?.toLowerCase().includes('water')
  )?.value || 0;

  return {
    productId: parseInt(productSystem.description.split('for ')[1] || '0'),
    totalCarbonFootprint,
    totalWaterFootprint,
    impactsByCategory: results.impactResults?.map(r => ({
      category: r.impactCategory.name || 'Unknown',
      impact: r.value,
      unit: 'kg CO2 eq', // This should be parsed from the impact method
    })) || [],
    flowResults: results.totalFlowResults?.map(r => ({
      flowName: r.flow.name || 'Unknown',
      flowType: r.flow.flowType || 'Unknown',
      amount: r.value,
      unit: 'kg', // This should be parsed from the flow
    })) || [],
    systemId: productSystem['@id'],
    systemName: productSystem.name,
    calculationDate: new Date(),
    metadata: {
      calculationDuration,
      openLCAVersion: '2.0', // This should be retrieved from OpenLCA
      databaseVersion: 'ecoinvent 3.8', // This should be retrieved from OpenLCA
    },
  };
}

// Job event handlers (only if queue is available)
if (lcaCalculationQueue) {
  lcaCalculationQueue.on('completed', (job: Bull.Job<LcaCalculationJobData>, result: LcaCalculationResult) => {
    console.log(`LCA calculation completed for product ${result.productId}`);
    console.log(`Total Carbon Footprint: ${result.totalCarbonFootprint} kg CO2 eq`);
  });

  lcaCalculationQueue.on('failed', (job: Bull.Job<LcaCalculationJobData>, err: Error) => {
    console.error(`LCA calculation failed for product ${job.data.productId}:`, err.message);
  });

  lcaCalculationQueue.on('progress', (job: Bull.Job<LcaCalculationJobData>, progress: number) => {
    console.log(`LCA calculation progress for product ${job.data.productId}: ${progress}%`);
  });
}

// Queue management functions
export class LCAJobManager {
  // Queue a new LCA calculation
  static async queueLCACalculation(
    productId: number,
    options?: LcaCalculationJobData['options']
  ): Promise<LcaCalculationJob> {
    const jobId = `lca-${productId}-${Date.now()}`;
    
    // Create job record in database
    const jobRecord = await storage.createLcaCalculationJob({
      productId,
      jobId,
      status: 'pending',
      progress: 0,
      olcaSystemId: null,
      olcaSystemName: null,
      results: null,
      errorMessage: null,
      createdAt: new Date(),
      completedAt: null,
    });

    // Queue the job (only if queue is available)
    if (lcaCalculationQueue) {
      await lcaCalculationQueue.add(jobId, {
        productId,
        jobId: jobRecord.id.toString(),
        options,
      });
    } else {
      // If Redis is not available, use in-memory processing
      console.log('Using in-memory LCA processor (Redis not available)');
      
      // Process the job immediately using in-memory processor
      setImmediate(() => {
        inMemoryLCAProcessor.processLCACalculation(productId, jobRecord.id.toString(), options);
      });
    }

    return jobRecord;
  }

  // Get job status
  static async getJobStatus(jobId: string): Promise<Bull.Job<LcaCalculationJobData> | null> {
    if (!lcaCalculationQueue) return null;
    
    const jobs = await lcaCalculationQueue.getJobs(['active', 'waiting', 'completed', 'failed']);
    return jobs.find(job => job.data.jobId === jobId) || null;
  }

  // Cancel a job
  static async cancelJob(jobId: string): Promise<boolean> {
    if (!lcaCalculationQueue) return false;
    
    const job = await this.getJobStatus(jobId);
    if (job) {
      await job.remove();
      
      // Update database record
      await storage.updateLcaCalculationJob(parseInt(jobId), {
        status: 'failed',
        errorMessage: 'Job cancelled by user',
        completedAt: new Date(),
      });
      
      return true;
    }
    return false;
  }

  // Get queue statistics
  static async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    if (!lcaCalculationQueue) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      };
    }

    const waiting = await lcaCalculationQueue.getWaiting();
    const active = await lcaCalculationQueue.getActive();
    const completed = await lcaCalculationQueue.getCompleted();
    const failed = await lcaCalculationQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }
}

export default lcaCalculationQueue;

// Simple in-memory fallback for LCA calculations when Redis is not available
class InMemoryLCAProcessor {
  private static instance: InMemoryLCAProcessor;
  private processingJobs: Map<string, boolean> = new Map();

  static getInstance(): InMemoryLCAProcessor {
    if (!InMemoryLCAProcessor.instance) {
      InMemoryLCAProcessor.instance = new InMemoryLCAProcessor();
    }
    return InMemoryLCAProcessor.instance;
  }

  async processLCACalculation(productId: number, jobId: string, options?: any): Promise<void> {
    if (this.processingJobs.has(jobId)) {
      return; // Already processing
    }

    this.processingJobs.set(jobId, true);

    try {
      // Update job status to processing
      await storage.updateLcaCalculationJob(parseInt(jobId), {
        status: 'processing',
        progress: 10,
      });

      // Get product data
      const product = await storage.getProductById(productId);
      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      // Simulate simple LCA calculation without OpenLCA
      const estimatedCarbonFootprint = this.calculateEstimatedFootprint(product);
      const estimatedWaterFootprint = this.calculateEstimatedWaterFootprint(product);

      // Update progress
      await storage.updateLcaCalculationJob(parseInt(jobId), {
        progress: 50,
      });

      // Create simplified results
      const results = {
        productId,
        totalCarbonFootprint: estimatedCarbonFootprint,
        totalWaterFootprint: estimatedWaterFootprint,
        impactsByCategory: [
          {
            category: 'Climate Change',
            impact: estimatedCarbonFootprint,
            unit: 'kg CO2 eq',
          },
          {
            category: 'Water Consumption',
            impact: estimatedWaterFootprint,
            unit: 'L',
          },
        ],
        flowResults: [],
        systemId: `simplified-${productId}`,
        systemName: `Simplified LCA for ${product.name}`,
        calculationDate: new Date(),
        metadata: {
          calculationDuration: 1000, // 1 second
          openLCAVersion: 'Simplified Calculation',
          databaseVersion: 'Built-in estimates',
        },
      };

      // Update job with results
      await storage.updateLcaCalculationJob(parseInt(jobId), {
        status: 'completed',
        progress: 100,
        results: results,
        completedAt: new Date(),
        olcaSystemId: results.systemId,
        olcaSystemName: results.systemName,
      });

      // Update product with calculated footprints
      await storage.updateProduct(productId, {
        carbonFootprint: results.totalCarbonFootprint.toString(),
        waterFootprint: results.totalWaterFootprint.toString(),
      });

      console.log(`Simplified LCA calculation completed for product ${productId}`);
      console.log(`Total Carbon Footprint: ${results.totalCarbonFootprint} kg CO2 eq`);

    } catch (error) {
      console.error('Simplified LCA calculation failed:', error);
      
      // Update job status to failed
      await storage.updateLcaCalculationJob(parseInt(jobId), {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date(),
      });
    } finally {
      this.processingJobs.delete(jobId);
    }
  }

  private calculateEstimatedFootprint(product: Product): number {
    // Simple estimation based on product type and volume
    const annualVolume = parseFloat(product.annualProductionVolume?.toString() || '1000');
    const volumePerUnit = parseFloat(product.volume?.replace(/[^0-9.]/g, '') || '750');
    const units = annualVolume / volumePerUnit;

    // Base footprint per unit based on product type
    let baseFootprint = 2.5; // kg CO2 eq per unit (default)
    
    switch (product.type) {
      case 'spirit':
        baseFootprint = 3.2; // Higher due to distillation
        break;
      case 'wine':
        baseFootprint = 2.1;
        break;
      case 'beer':
        baseFootprint = 1.8;
        break;
      case 'non-alcoholic':
        baseFootprint = 1.2;
        break;
      default:
        baseFootprint = 2.5;
    }

    return Math.round(units * baseFootprint * 100) / 100;
  }

  private calculateEstimatedWaterFootprint(product: Product): number {
    // Simple water footprint estimation
    const annualVolume = parseFloat(product.annualProductionVolume?.toString() || '1000');
    const volumePerUnit = parseFloat(product.volume?.replace(/[^0-9.]/g, '') || '750');
    const units = annualVolume / volumePerUnit;

    // Water footprint per unit (liters)
    let waterPerUnit = 15; // default
    
    switch (product.type) {
      case 'spirit':
        waterPerUnit = 25; // Higher due to distillation
        break;
      case 'wine':
        waterPerUnit = 12;
        break;
      case 'beer':
        waterPerUnit = 8;
        break;
      case 'non-alcoholic':
        waterPerUnit = 6;
        break;
      default:
        waterPerUnit = 15;
    }

    return Math.round(units * waterPerUnit * 100) / 100;
  }
}

export const inMemoryLCAProcessor = InMemoryLCAProcessor.getInstance();