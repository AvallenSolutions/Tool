import { logger } from '../config/logger';
import { browserPoolService } from './BrowserPoolService';
import { jobQueueService } from './UnifiedJobQueueService';
import { consolidatedLCAService } from './ConsolidatedLCAService';
import { shutdownTelemetry } from '../monitoring/telemetry';

/**
 * Graceful Shutdown Service for Enterprise Deployment
 * Handles orderly shutdown of all services and resources
 */
export class GracefulShutdownService {
  private static instance: GracefulShutdownService;
  
  private shutdownInProgress = false;
  private shutdownPromise: Promise<void> | null = null;
  private shutdownTimeout = 30000; // 30 seconds timeout
  
  constructor() {
    this.registerSignalHandlers();
  }

  static getInstance(): GracefulShutdownService {
    if (!GracefulShutdownService.instance) {
      GracefulShutdownService.instance = new GracefulShutdownService();
    }
    return GracefulShutdownService.instance;
  }

  /**
   * Register signal handlers for graceful shutdown
   */
  private registerSignalHandlers(): void {
    // Handle SIGTERM (Docker/Kubernetes shutdown)
    process.on('SIGTERM', () => {
      logger.info({}, 'SIGTERM received, initiating graceful shutdown');
      this.shutdown('SIGTERM');
    });

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      logger.info({}, 'SIGINT received, initiating graceful shutdown');
      this.shutdown('SIGINT');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error({ error }, 'Uncaught exception, initiating emergency shutdown');
      this.emergencyShutdown(error);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error({ reason, promise }, 'Unhandled promise rejection, initiating emergency shutdown');
      this.emergencyShutdown(new Error(`Unhandled promise rejection: ${reason}`));
    });

    logger.info({}, 'Graceful shutdown signal handlers registered');
  }

  /**
   * Initiate graceful shutdown
   */
  async shutdown(signal?: string): Promise<void> {
    if (this.shutdownInProgress) {
      logger.warn({}, 'Shutdown already in progress, waiting for completion');
      return this.shutdownPromise || Promise.resolve();
    }

    this.shutdownInProgress = true;
    
    this.shutdownPromise = this.performShutdown(signal);
    return this.shutdownPromise;
  }

  /**
   * Perform the actual shutdown sequence
   */
  private async performShutdown(signal?: string): Promise<void> {
    const startTime = Date.now();
    
    logger.info({ 
      signal, 
      timeout: this.shutdownTimeout 
    }, 'Starting graceful shutdown sequence');

    try {
      // Create shutdown timeout
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Graceful shutdown timeout after ${this.shutdownTimeout}ms`));
        }, this.shutdownTimeout);
      });

      // Perform shutdown steps with timeout
      await Promise.race([
        this.executeShutdownSteps(),
        timeoutPromise
      ]);

      const duration = Date.now() - startTime;
      logger.info({ duration, signal }, 'Graceful shutdown completed successfully');

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({ error, duration, signal }, 'Graceful shutdown encountered errors');
      
      // Force exit if graceful shutdown fails
      await this.forceShutdown();
    }
  }

  /**
   * Execute shutdown steps in order
   */
  private async executeShutdownSteps(): Promise<void> {
    const steps = [
      {
        name: 'Stop accepting new requests',
        action: () => this.stopAcceptingRequests(),
      },
      {
        name: 'Drain job queues',
        action: () => this.drainJobQueues(),
      },
      {
        name: 'Close browser pool',
        action: () => this.closeBrowserPool(),
      },
      {
        name: 'Close Redis LCA cache',
        action: () => this.closeRedisCache(),
      },
      {
        name: 'Close database connections',
        action: () => this.closeDatabaseConnections(),
      },
      {
        name: 'Shutdown telemetry',
        action: () => this.shutdownTelemetry(),
      },
      {
        name: 'Final cleanup',
        action: () => this.finalCleanup(),
      },
    ];

    for (const step of steps) {
      try {
        logger.info({ step: step.name }, 'Executing shutdown step');
        const stepStartTime = Date.now();
        
        await step.action();
        
        const stepDuration = Date.now() - stepStartTime;
        logger.info({ 
          step: step.name, 
          duration: stepDuration 
        }, 'Shutdown step completed');
        
      } catch (error) {
        logger.error({ 
          error, 
          step: step.name 
        }, 'Shutdown step failed, continuing with next step');
      }
    }
  }

  /**
   * Stop accepting new requests
   */
  private async stopAcceptingRequests(): Promise<void> {
    // Set a global flag that middleware can check
    (global as any).shutdownInProgress = true;
    
    // Give existing requests time to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Drain job queues gracefully
   */
  private async drainJobQueues(): Promise<void> {
    try {
      // Stop accepting new jobs
      await jobQueueService.stopAcceptingJobs();
      
      // Wait for active jobs to complete (max 20 seconds)
      const maxWaitTime = 20000;
      const checkInterval = 1000;
      let waited = 0;
      
      while (waited < maxWaitTime) {
        const stats = await jobQueueService.getQueueStats();
        const activeJobs = Object.values(stats).reduce((sum, queueStats) => 
          sum + queueStats.active, 0
        );
        
        if (activeJobs === 0) {
          logger.info({}, 'All active jobs completed');
          break;
        }
        
        logger.info({ activeJobs, waited }, 'Waiting for active jobs to complete');
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waited += checkInterval;
      }
      
      // Shutdown job queue service
      await jobQueueService.shutdown();
      
    } catch (error) {
      logger.error({ error }, 'Error draining job queues');
    }
  }

  /**
   * Close browser pool
   */
  private async closeBrowserPool(): Promise<void> {
    try {
      await browserPoolService.shutdown();
    } catch (error) {
      logger.error({ error }, 'Error closing browser pool');
    }
  }

  /**
   * Close Redis LCA cache
   */
  private async closeRedisCache(): Promise<void> {
    try {
      await redisLCACacheService.shutdown();
    } catch (error) {
      logger.error({ error }, 'Error closing Redis LCA cache');
    }
  }

  /**
   * Close database connections
   */
  private async closeDatabaseConnections(): Promise<void> {
    try {
      // Import db dynamically to avoid circular dependencies
      const { pool } = await import('../db');
      await pool.end();
      
      logger.info({}, 'Database connections closed');
    } catch (error) {
      logger.error({ error }, 'Error closing database connections');
    }
  }

  /**
   * Shutdown telemetry
   */
  private async shutdownTelemetry(): Promise<void> {
    try {
      await shutdownTelemetry();
    } catch (error) {
      logger.error({ error }, 'Error shutting down telemetry');
    }
  }

  /**
   * Final cleanup
   */
  private async finalCleanup(): Promise<void> {
    try {
      // Clear any remaining timeouts/intervals
      if (global.gc) {
        global.gc();
      }
      
      logger.info({}, 'Final cleanup completed');
    } catch (error) {
      logger.error({ error }, 'Error in final cleanup');
    }
  }

  /**
   * Emergency shutdown - force exit after critical error
   */
  private async emergencyShutdown(error: Error): Promise<void> {
    logger.error({ error }, 'Emergency shutdown initiated');
    
    try {
      // Quick cleanup of critical resources
      await Promise.race([
        Promise.all([
          browserPoolService.shutdown().catch(() => {}),
          jobQueueService.shutdown().catch(() => {}),
        ]),
        new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
      ]);
    } catch (cleanupError) {
      logger.error({ cleanupError }, 'Error during emergency cleanup');
    }
    
    // Force exit
    process.exit(1);
  }

  /**
   * Force shutdown when graceful shutdown fails
   */
  private async forceShutdown(): Promise<void> {
    logger.warn({}, 'Graceful shutdown failed, forcing shutdown');
    
    try {
      // Try quick cleanup
      await Promise.race([
        Promise.all([
          browserPoolService.shutdown().catch(() => {}),
          jobQueueService.shutdown().catch(() => {}),
        ]),
        new Promise(resolve => setTimeout(resolve, 3000)) // 3 second timeout
      ]);
    } catch (error) {
      logger.error({ error }, 'Error during force shutdown cleanup');
    }
    
    process.exit(1);
  }

  /**
   * Check if shutdown is in progress
   */
  isShuttingDown(): boolean {
    return this.shutdownInProgress;
  }

  /**
   * Set custom shutdown timeout
   */
  setShutdownTimeout(timeout: number): void {
    this.shutdownTimeout = timeout;
    logger.info({ timeout }, 'Shutdown timeout updated');
  }

  /**
   * Add middleware to check shutdown status
   */
  static createShutdownMiddleware() {
    return (req: any, res: any, next: any) => {
      if ((global as any).shutdownInProgress) {
        return res.status(503).json({
          error: 'Service shutting down',
          message: 'The service is currently shutting down and not accepting new requests',
        });
      }
      next();
    };
  }
}

// Add methods to job queue service for graceful shutdown
declare module './UnifiedJobQueueService' {
  interface UnifiedJobQueueService {
    stopAcceptingJobs(): Promise<void>;
  }
}

// Export singleton instance
export const gracefulShutdownService = GracefulShutdownService.getInstance();

export default GracefulShutdownService;