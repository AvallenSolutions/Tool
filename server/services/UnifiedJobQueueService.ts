import Bull from 'bull';
import { logger } from '../config/logger';
import { unifiedPDFService } from './UnifiedPDFService';
import { unifiedLCAService } from './UnifiedLCAService';
import { storage as dbStorage } from '../storage';

// Job types and interfaces
export type JobType = 'pdf_generation' | 'lca_calculation' | 'data_extraction' | 'report_export';

export interface BaseJobData {
  jobId: string;
  userId: string;
  priority?: number;
  retryAttempts?: number;
}

export interface PDFJobData extends BaseJobData {
  type: 'pdf_generation';
  reportData: any;
  format: 'pdf' | 'pdf-branded' | 'pptx' | 'web';
  options?: any;
}

export interface LCAJobData extends BaseJobData {
  type: 'lca_calculation';
  productId: number;
  calculationMethod: 'simple' | 'enhanced' | 'openlca' | 'hybrid';
  options?: {
    impactMethodId?: string;
    allocationMethod?: string;
    includeTransport?: boolean;
    includeProcessing?: boolean;
  };
}

export interface DataExtractionJobData extends BaseJobData {
  type: 'data_extraction';
  extractionType: 'pdf' | 'web_scraping';
  sourceUrl?: string;
  fileBuffer?: Buffer;
  targetFields?: string[];
}

export interface ReportExportJobData extends BaseJobData {
  type: 'report_export';
  reportId: string;
  exportFormat: string;
  options?: any;
}

export type JobData = PDFJobData | LCAJobData | DataExtractionJobData | ReportExportJobData;

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    processingTime: number;
    queueTime: number;
    retryCount: number;
  };
}

/**
 * Unified Job Queue Service - Manages all heavy operations through Bull queues
 * Provides centralized job management, monitoring, and error handling
 */
export class UnifiedJobQueueService {
  private static instance: UnifiedJobQueueService;
  
  private queues: Map<JobType, Bull.Queue> = new Map();
  private isInitialized = false;
  private redisConfig: Bull.QueueOptions;

  constructor() {
    // Redis configuration with fallback for development
    this.redisConfig = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      },
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    };

    logger.info({}, 'UnifiedJobQueueService created');
  }

  static getInstance(): UnifiedJobQueueService {
    if (!UnifiedJobQueueService.instance) {
      UnifiedJobQueueService.instance = new UnifiedJobQueueService();
    }
    return UnifiedJobQueueService.instance;
  }

  /**
   * Initialize all job queues and processors
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Check Redis health first
      await this.checkRedisHealth();

      // Initialize queues for each job type
      await this.initializeQueue('pdf_generation');
      await this.initializeQueue('lca_calculation');
      await this.initializeQueue('data_extraction');
      await this.initializeQueue('report_export');

      this.isInitialized = true;
      logger.info({ queueCount: this.queues.size }, 'All job queues initialized successfully');

    } catch (error) {
      logger.error({ error }, 'Failed to initialize job queues');
      
      if (process.env.NODE_ENV === 'production') {
        // In production, Redis is required - don't fallback
        throw new Error('Redis is required in production environment. Please ensure Redis is running and accessible.');
      } else {
        // Development fallback to in-memory processing
        logger.warn({}, 'Development environment: Falling back to in-memory job processing');
        this.initializeInMemoryFallback();
        this.isInitialized = true;
      }
    }
  }

  /**
   * Add job to appropriate queue
   */
  async addJob<T extends JobData>(jobData: T, options?: Bull.JobOptions): Promise<string> {
    await this.ensureInitialized();

    const jobId = jobData.jobId || `${jobData.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const queue = this.queues.get(jobData.type);
      
      if (queue) {
        // Add idempotency key if not provided
        const idempotencyKey = (options as any)?.idempotencyKey || 
          `${jobData.type}_${jobData.userId}_${Date.now()}`;

        // Check for duplicate jobs using idempotency key
        const existingJobs = await queue.getJobs(['waiting', 'active', 'delayed']);
        const duplicateJob = existingJobs.find(job => 
          job.data.idempotencyKey === idempotencyKey
        );

        if (duplicateJob) {
          logger.info({ 
            jobId, 
            jobType: jobData.type,
            idempotencyKey,
            existingJobId: duplicateJob.id 
          }, 'Duplicate job detected, returning existing job ID');
          
          return duplicateJob.data.jobId;
        }

        const job = await queue.add(jobData.type, { 
          ...jobData, 
          jobId,
          idempotencyKey,
          submittedAt: new Date().toISOString(),
        }, {
          priority: jobData.priority || 0,
          attempts: jobData.retryAttempts || 3,
          ...options,
        });

        logger.info({ 
          jobId, 
          jobType: jobData.type,
          queueId: job.id,
          idempotencyKey
        }, 'Job added to queue');

        return jobId;
      } else {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Job queues not available in production');
        }
        
        // Development fallback only
        logger.warn({ jobType: jobData.type }, 'Development: Processing job immediately');
        await this.processJobImmediate(jobData);
        return jobId;
      }

    } catch (error) {
      logger.error({ error, jobType: jobData.type }, 'Failed to add job to queue');
      throw error;
    }
  }

  /**
   * Get job status and result
   */
  async getJobStatus(jobType: JobType, jobId: string): Promise<{
    status: string;
    progress: number;
    result?: any;
    error?: string;
  }> {
    const queue = this.queues.get(jobType);
    
    if (!queue) {
      return { status: 'unknown', progress: 0 };
    }

    try {
      const jobs = await queue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const job = jobs.find(j => j.data.jobId === jobId);

      if (!job) {
        return { status: 'not_found', progress: 0 };
      }

      return {
        status: await job.getState(),
        progress: job.progress(),
        result: job.returnvalue,
        error: job.failedReason,
      };

    } catch (error) {
      logger.error({ error, jobType, jobId }, 'Failed to get job status');
      return { status: 'error', progress: 0, error: error.message };
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobType: JobType, jobId: string): Promise<boolean> {
    const queue = this.queues.get(jobType);
    
    if (!queue) {
      return false;
    }

    try {
      const jobs = await queue.getJobs(['waiting', 'active']);
      const job = jobs.find(j => j.data.jobId === jobId);

      if (job) {
        await job.remove();
        logger.info({ jobType, jobId }, 'Job cancelled successfully');
        return true;
      }

      return false;
    } catch (error) {
      logger.error({ error, jobType, jobId }, 'Failed to cancel job');
      return false;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<Record<JobType, {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }>> {
    const stats: any = {};

    for (const [jobType, queue] of this.queues) {
      try {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getCompleted(),
          queue.getFailed(),
          queue.getDelayed(),
        ]);

        stats[jobType] = {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
        };
      } catch (error) {
        logger.error({ error, jobType }, 'Failed to get queue stats');
        stats[jobType] = { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
      }
    }

    return stats;
  }

  /**
   * Private methods
   */
  private async initializeQueue(jobType: JobType): Promise<void> {
    try {
      const queue = new Bull(jobType, this.redisConfig);
      
      // Set up job processor
      queue.process(1, async (job: Bull.Job) => {
        return await this.processJob(job.data as JobData, job);
      });

      // Set up event listeners
      queue.on('completed', (job) => {
        logger.info({ 
          jobId: job.data.jobId,
          jobType: job.data.type,
          processingTime: Date.now() - job.processedOn 
        }, 'Job completed successfully');
      });

      queue.on('failed', (job, error) => {
        logger.error({ 
          jobId: job.data.jobId,
          jobType: job.data.type,
          error: error.message,
          attemptsMade: job.attemptsMade 
        }, 'Job failed');
      });

      queue.on('stalled', (job) => {
        logger.warn({ 
          jobId: job.data.jobId,
          jobType: job.data.type 
        }, 'Job stalled');
      });

      this.queues.set(jobType, queue);
      logger.info({ jobType }, 'Queue initialized successfully');

    } catch (error) {
      logger.error({ error, jobType }, 'Failed to initialize queue');
      throw error;
    }
  }

  private async processJob(jobData: JobData, job?: Bull.Job): Promise<JobResult> {
    const startTime = Date.now();
    
    try {
      logger.info({ 
        jobId: jobData.jobId,
        jobType: jobData.type 
      }, 'Processing job started');

      let result: any;

      switch (jobData.type) {
        case 'pdf_generation':
          result = await this.processPDFJob(jobData as PDFJobData, job);
          break;
        case 'lca_calculation':
          result = await this.processLCAJob(jobData as LCAJobData, job);
          break;
        case 'data_extraction':
          result = await this.processDataExtractionJob(jobData as DataExtractionJobData, job);
          break;
        case 'report_export':
          result = await this.processReportExportJob(jobData as ReportExportJobData, job);
          break;
        default:
          throw new Error(`Unknown job type: ${(jobData as any).type}`);
      }

      const processingTime = Date.now() - startTime;
      
      logger.info({ 
        jobId: jobData.jobId,
        jobType: jobData.type,
        processingTime 
      }, 'Job processed successfully');

      return {
        success: true,
        data: result,
        metadata: {
          processingTime,
          queueTime: job ? job.processedOn - job.timestamp : 0,
          retryCount: job ? job.attemptsMade - 1 : 0,
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error({ 
        error,
        jobId: jobData.jobId,
        jobType: jobData.type,
        processingTime 
      }, 'Job processing failed');

      return {
        success: false,
        error: error.message,
        metadata: {
          processingTime,
          queueTime: job ? job.processedOn - job.timestamp : 0,
          retryCount: job ? job.attemptsMade - 1 : 0,
        }
      };
    }
  }

  private async processPDFJob(jobData: PDFJobData, job?: Bull.Job): Promise<Buffer> {
    job?.progress(10);
    
    const buffer = await unifiedPDFService.exportReport(
      jobData.reportData,
      jobData.format,
      jobData.options
    );
    
    job?.progress(100);
    return buffer;
  }

  private async processLCAJob(jobData: LCAJobData, job?: Bull.Job): Promise<any> {
    job?.progress(10);
    
    // Get product data
    const product = await dbStorage.getProductById(jobData.productId);
    if (!product) {
      throw new Error(`Product not found: ${jobData.productId}`);
    }
    
    job?.progress(30);
    
    // Get LCA data (would need to implement this)
    const lcaData = {}; // TODO: Get actual LCA data for product
    
    job?.progress(50);
    
    // Perform calculation
    const results = await unifiedLCAService.calculateLCA(product, lcaData, {
      method: jobData.calculationMethod,
      ...jobData.options
    });
    
    job?.progress(100);
    return results;
  }

  private async processDataExtractionJob(jobData: DataExtractionJobData, job?: Bull.Job): Promise<any> {
    job?.progress(10);
    
    // This would integrate with data extraction services
    // For now, return placeholder
    job?.progress(50);
    
    const extractedData = {
      extractionType: jobData.extractionType,
      sourceUrl: jobData.sourceUrl,
      extractedFields: jobData.targetFields || [],
      extractedAt: new Date(),
    };
    
    job?.progress(100);
    return extractedData;
  }

  private async processReportExportJob(jobData: ReportExportJobData, job?: Bull.Job): Promise<Buffer> {
    job?.progress(10);
    
    // Get report data
    const reportData = await dbStorage.getReportById(parseInt(jobData.reportId));
    if (!reportData) {
      throw new Error(`Report not found: ${jobData.reportId}`);
    }
    
    job?.progress(50);
    
    // Export report
    const buffer = await unifiedPDFService.exportReport(
      reportData,
      jobData.exportFormat,
      jobData.options
    );
    
    job?.progress(100);
    return buffer;
  }

  private async processJobImmediate(jobData: JobData): Promise<JobResult> {
    return await this.processJob(jobData);
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Check Redis health and connectivity
   */
  async checkRedisHealth(): Promise<void> {
    try {
      const testQueue = new Bull('health-check', this.redisConfig);
      
      // Test basic connectivity
      await testQueue.add('ping', { timestamp: Date.now() }, {
        removeOnComplete: 1,
        removeOnFail: 1,
      });
      
      // Wait a moment for the job to be processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await testQueue.close();
      
      logger.info({}, 'Redis health check passed');
    } catch (error) {
      logger.error({ error }, 'Redis health check failed');
      throw new Error(`Redis health check failed: ${error.message}`);
    }
  }

  /**
   * Get Redis connection status
   */
  async getRedisStatus(): Promise<{
    connected: boolean;
    latency?: number;
    memory?: any;
    info?: string;
  }> {
    try {
      const startTime = Date.now();
      
      // Test with a temporary queue
      const testQueue = new Bull('status-check', this.redisConfig);
      await testQueue.add('status', { timestamp: Date.now() });
      await testQueue.close();
      
      const latency = Date.now() - startTime;
      
      return {
        connected: true,
        latency,
      };
    } catch (error) {
      return {
        connected: false,
      };
    }
  }

  /**
   * Initialize in-memory fallback for development
   */
  private initializeInMemoryFallback(): void {
    logger.warn({}, 'Initializing in-memory job processing fallback');
    
    // Set up minimal in-memory processing
    this.inMemoryQueue = [];
    this.inMemoryProcessor = this.startInMemoryProcessor();
  }

  private inMemoryQueue: JobData[] = [];
  private inMemoryProcessor?: NodeJS.Timeout;

  private startInMemoryProcessor(): NodeJS.Timeout {
    return setInterval(async () => {
      if (this.inMemoryQueue.length > 0) {
        const job = this.inMemoryQueue.shift();
        if (job) {
          try {
            await this.processJobImmediate(job);
          } catch (error) {
            logger.error({ error, jobType: job.type }, 'In-memory job processing failed');
          }
        }
      }
    }, 1000); // Process jobs every second
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info({}, 'Shutting down job queues...');
    
    // Clear in-memory processor
    if (this.inMemoryProcessor) {
      clearInterval(this.inMemoryProcessor);
      this.inMemoryProcessor = undefined;
    }
    
    const shutdownPromises = Array.from(this.queues.values()).map(queue => 
      queue.close()
    );
    
    await Promise.all(shutdownPromises);
    
    this.queues.clear();
    this.inMemoryQueue = [];
    this.isInitialized = false;
    
    logger.info({}, 'All job queues shut down successfully');
  }
}

// Export singleton instance
export const jobQueueService = UnifiedJobQueueService.getInstance();

// Legacy compatibility exports
export { jobQueueService as lcaCalculationQueue };

export default UnifiedJobQueueService;