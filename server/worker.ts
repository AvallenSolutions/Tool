/**
 * Worker Process - Handles background job processing only
 * For horizontal scaling, run multiple instances of this process
 */

import { logger } from './config/logger';
import { initializeTelemetry } from './monitoring/telemetry';
import { startMetricsCollection } from './monitoring/metrics';
import { gracefulShutdownService } from './services/GracefulShutdownService';
import { jobQueueService } from './services/UnifiedJobQueueService';
import { browserPoolService } from './services/BrowserPoolService';
import { redisLCACacheService } from './services/RedisLCACacheService';

// Import job processors
import { pdfGenerationProcessor } from './jobs/pdfGenerationProcessor';
import { lcaCalculationProcessor } from './jobs/lcaCalculationProcessor';
import { dataExtractionProcessor } from './jobs/dataExtractionProcessor';
import { reportExportProcessor } from './jobs/reportExportProcessor';

async function startWorkerProcess(): Promise<void> {
  try {
    // Initialize telemetry
    initializeTelemetry();
    
    // Start metrics collection
    startMetricsCollection();

    logger.info({
      process: 'worker',
      environment: process.env.NODE_ENV,
      workerId: process.env.WORKER_ID || 'default',
    }, 'Starting worker process');

    // Initialize services
    await initializeWorkerServices();

    // Register job processors
    await registerJobProcessors();

    // Set worker-specific shutdown timeout (longer for jobs to complete)
    gracefulShutdownService.setShutdownTimeout(60000); // 60 seconds

    logger.info({
      process: 'worker',
      services: ['job_queue', 'browser_pool', 'redis_cache'],
      processors: ['pdf_generation', 'lca_calculation', 'data_extraction', 'report_export'],
    }, 'Worker process initialized successfully');

    // Keep the process alive
    process.on('SIGTERM', () => {
      logger.info({}, 'Worker process received SIGTERM, shutting down gracefully');
    });

    process.on('SIGINT', () => {
      logger.info({}, 'Worker process received SIGINT, shutting down gracefully');
    });

  } catch (error) {
    logger.error({ error }, 'Failed to start worker process');
    process.exit(1);
  }
}

/**
 * Initialize worker-specific services
 */
async function initializeWorkerServices(): Promise<void> {
  try {
    // Initialize job queue service
    await jobQueueService.initialize();
    logger.info({}, 'Job queue service initialized');

    // Initialize browser pool
    await browserPoolService.initialize();
    logger.info({}, 'Browser pool service initialized');

    // Initialize Redis LCA cache
    await redisLCACacheService.initialize();
    logger.info({}, 'Redis LCA cache service initialized');

  } catch (error) {
    logger.error({ error }, 'Failed to initialize worker services');
    throw error;
  }
}

/**
 * Register job processors with their respective queues
 */
async function registerJobProcessors(): Promise<void> {
  try {
    // Register PDF generation processor
    await jobQueueService.registerProcessor('pdf_generation', pdfGenerationProcessor);
    logger.info({}, 'PDF generation processor registered');

    // Register LCA calculation processor
    await jobQueueService.registerProcessor('lca_calculation', lcaCalculationProcessor);
    logger.info({}, 'LCA calculation processor registered');

    // Register data extraction processor
    await jobQueueService.registerProcessor('data_extraction', dataExtractionProcessor);
    logger.info({}, 'Data extraction processor registered');

    // Register report export processor
    await jobQueueService.registerProcessor('report_export', reportExportProcessor);
    logger.info({}, 'Report export processor registered');

    logger.info({
      processors: ['pdf_generation', 'lca_calculation', 'data_extraction', 'report_export']
    }, 'All job processors registered successfully');

  } catch (error) {
    logger.error({ error }, 'Failed to register job processors');
    throw error;
  }
}

/**
 * Worker health check function
 */
export async function workerHealthCheck(): Promise<{
  status: 'healthy' | 'unhealthy' | 'degraded';
  services: Record<string, boolean>;
  queues: Record<string, any>;
}> {
  try {
    const services = {
      job_queue: jobQueueService.isInitialized,
      browser_pool: browserPoolService.isInitialized(),
      redis_cache: redisLCACacheService.isConnected(),
    };

    const queues = await jobQueueService.getQueueStats();

    const allServicesHealthy = Object.values(services).every(Boolean);
    const queueBacklog = Object.values(queues).reduce((sum, stats) => 
      sum + stats.waiting + stats.active, 0
    );

    let status: 'healthy' | 'unhealthy' | 'degraded';
    if (!allServicesHealthy) {
      status = 'unhealthy';
    } else if (queueBacklog > 100) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return { status, services, queues };

  } catch (error) {
    logger.error({ error }, 'Worker health check failed');
    return {
      status: 'unhealthy',
      services: {},
      queues: {},
    };
  }
}

// Start worker process if this file is run directly
if (require.main === module) {
  startWorkerProcess().catch((error) => {
    logger.error({ error }, 'Worker process startup failed');
    process.exit(1);
  });
}

export { startWorkerProcess };