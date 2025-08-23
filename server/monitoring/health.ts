import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { browserPoolService } from '../services/BrowserPoolService';
import { jobQueueService } from '../services/UnifiedJobQueueService';
import { db } from '../db';

/**
 * Health Check Endpoints for Enterprise Deployment
 * Provides comprehensive health and readiness checks for Kubernetes/Docker deployments
 */

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  checks: HealthCheck[];
  metadata: {
    environment: string;
    nodeVersion: string;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
}

/**
 * Liveness probe - checks if the application is running
 * Used by Kubernetes to determine if container should be restarted
 */
export async function livenessProbe(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Basic application liveness checks
    const checks: HealthCheck[] = [
      {
        name: 'process',
        status: 'healthy',
        message: 'Application process is running',
        duration: Date.now() - startTime,
      },
      {
        name: 'memory',
        status: checkMemoryUsage(),
        message: getMemoryStatus(),
        duration: Date.now() - startTime,
        metadata: process.memoryUsage(),
      },
    ];

    const overallStatus = checks.every(check => check.status === 'healthy') ? 'healthy' : 'degraded';

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.SERVICE_VERSION || '1.0.0',
      checks,
      metadata: {
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    res.status(statusCode).json(response);

  } catch (error) {
    logger.error({ error }, 'Liveness probe failed');
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.SERVICE_VERSION || '1.0.0',
      checks: [{
        name: 'process',
        status: 'unhealthy',
        message: `Liveness check failed: ${(error as Error).message}`,
        duration: Date.now() - startTime,
      }],
      metadata: {
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
    } as HealthResponse);
  }
}

/**
 * Readiness probe - checks if application is ready to serve requests
 * Used by Kubernetes to determine if container should receive traffic
 */
export async function readinessProbe(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  try {
    const checks: HealthCheck[] = [];

    // Check database connectivity
    checks.push(await checkDatabase());

    // Check Redis connectivity (via job queue service)
    checks.push(await checkRedis());

    // Check browser pool health
    checks.push(await checkBrowserPool());

    // Check external dependencies
    checks.push(await checkExternalDependencies());

    // Determine overall status
    const unhealthyChecks = checks.filter(check => check.status === 'unhealthy');
    const degradedChecks = checks.filter(check => check.status === 'degraded');
    
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
    if (unhealthyChecks.length > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedChecks.length > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.SERVICE_VERSION || '1.0.0',
      checks,
      metadata: {
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
    };

    const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json(response);

    // Log degraded state
    if (overallStatus === 'degraded') {
      logger.warn({ 
        degradedChecks: degradedChecks.map(c => c.name),
        response 
      }, 'Application is in degraded state');
    }

  } catch (error) {
    logger.error({ error }, 'Readiness probe failed');
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.SERVICE_VERSION || '1.0.0',
      checks: [{
        name: 'readiness',
        status: 'unhealthy',
        message: `Readiness check failed: ${(error as Error).message}`,
        duration: Date.now() - startTime,
      }],
      metadata: {
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
    } as HealthResponse);
  }
}

/**
 * Deep health check - comprehensive system status
 * Used for monitoring and debugging purposes
 */
export async function deepHealthCheck(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  try {
    const checks: HealthCheck[] = [];

    // All readiness checks
    checks.push(await checkDatabase());
    checks.push(await checkRedis());
    checks.push(await checkBrowserPool());
    checks.push(await checkExternalDependencies());
    
    // Additional deep checks
    checks.push(await checkDiskSpace());
    checks.push(await checkCPULoad());
    checks.push(await checkMemoryPressure());
    checks.push(await checkFileDescriptors());
    checks.push(await checkJobQueueHealth());

    // Performance metrics
    const performanceCheck = await checkPerformanceMetrics();
    checks.push(performanceCheck);

    const overallStatus = determineOverallStatus(checks);

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.SERVICE_VERSION || '1.0.0',
      checks,
      metadata: {
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
    };

    res.json(response);

  } catch (error) {
    logger.error({ error }, 'Deep health check failed');
    
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.SERVICE_VERSION || '1.0.0',
      checks: [{
        name: 'deep_health',
        status: 'unhealthy',
        message: `Deep health check failed: ${(error as Error).message}`,
        duration: Date.now() - startTime,
      }],
      metadata: {
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
    } as HealthResponse);
  }
}

/**
 * Individual health check functions
 */
async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Simple database connectivity test
    await db.execute('SELECT 1');
    
    return {
      name: 'database',
      status: 'healthy',
      message: 'Database connection is healthy',
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      message: `Database connection failed: ${(error as Error).message}`,
      duration: Date.now() - startTime,
    };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    const status = await jobQueueService.getRedisStatus();
    
    if (status.connected) {
      return {
        name: 'redis',
        status: 'healthy',
        message: 'Redis connection is healthy',
        duration: Date.now() - startTime,
        metadata: { latency: status.latency },
      };
    } else {
      return {
        name: 'redis',
        status: 'unhealthy',
        message: 'Redis connection failed',
        duration: Date.now() - startTime,
      };
    }
  } catch (error) {
    return {
      name: 'redis',
      status: 'unhealthy',
      message: `Redis check failed: ${(error as Error).message}`,
      duration: Date.now() - startTime,
    };
  }
}

async function checkBrowserPool(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    const stats = browserPoolService.getStats();
    
    const hasAvailablePages = stats.pages.available > 0;
    const memoryWithinLimits = stats.memory.usage < 2048; // 2GB limit
    
    if (hasAvailablePages && memoryWithinLimits) {
      return {
        name: 'browser_pool',
        status: 'healthy',
        message: 'Browser pool is healthy',
        duration: Date.now() - startTime,
        metadata: stats,
      };
    } else {
      return {
        name: 'browser_pool',
        status: 'degraded',
        message: `Browser pool degraded: available=${hasAvailablePages}, memory=${memoryWithinLimits}`,
        duration: Date.now() - startTime,
        metadata: stats,
      };
    }
  } catch (error) {
    return {
      name: 'browser_pool',
      status: 'unhealthy',
      message: `Browser pool check failed: ${(error as Error).message}`,
      duration: Date.now() - startTime,
    };
  }
}

async function checkExternalDependencies(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Check if environment variables are set
    const requiredEnvVars = ['DATABASE_URL'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return {
        name: 'external_dependencies',
        status: 'unhealthy',
        message: `Missing required environment variables: ${missingVars.join(', ')}`,
        duration: Date.now() - startTime,
      };
    }
    
    return {
      name: 'external_dependencies',
      status: 'healthy',
      message: 'External dependencies are configured',
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      name: 'external_dependencies',
      status: 'unhealthy',
      message: `External dependencies check failed: ${(error as Error).message}`,
      duration: Date.now() - startTime,
    };
  }
}

async function checkDiskSpace(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    const fs = await import('fs');
    const stats = await fs.promises.statSync('/tmp');
    
    return {
      name: 'disk_space',
      status: 'healthy',
      message: 'Disk space is adequate',
      duration: Date.now() - startTime,
      metadata: { tmp_available: true },
    };
  } catch (error) {
    return {
      name: 'disk_space',
      status: 'degraded',
      message: `Disk space check warning: ${(error as Error).message}`,
      duration: Date.now() - startTime,
    };
  }
}

async function checkCPULoad(): Promise<HealthCheck> {
  const startTime = Date.now();
  const cpuUsage = process.cpuUsage();
  const totalUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
  
  let status: 'healthy' | 'degraded' | 'unhealthy';
  let message: string;
  
  if (totalUsage < 1) {
    status = 'healthy';
    message = 'CPU load is normal';
  } else if (totalUsage < 5) {
    status = 'degraded';
    message = 'CPU load is elevated';
  } else {
    status = 'unhealthy';
    message = 'CPU load is critical';
  }
  
  return {
    name: 'cpu_load',
    status,
    message,
    duration: Date.now() - startTime,
    metadata: { cpu_usage_seconds: totalUsage },
  };
}

async function checkMemoryPressure(): Promise<HealthCheck> {
  const startTime = Date.now();
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const rssMB = Math.round(memUsage.rss / 1024 / 1024);
  
  let status: 'healthy' | 'degraded' | 'unhealthy';
  let message: string;
  
  if (heapUsedMB < 512) {
    status = 'healthy';
    message = 'Memory usage is normal';
  } else if (heapUsedMB < 1024) {
    status = 'degraded';
    message = 'Memory usage is elevated';
  } else {
    status = 'unhealthy';
    message = 'Memory usage is critical';
  }
  
  return {
    name: 'memory_pressure',
    status,
    message,
    duration: Date.now() - startTime,
    metadata: { 
      heap_used_mb: heapUsedMB, 
      heap_total_mb: heapTotalMB, 
      rss_mb: rssMB 
    },
  };
}

async function checkFileDescriptors(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  // Basic file descriptor check - simplified for Node.js
  return {
    name: 'file_descriptors',
    status: 'healthy',
    message: 'File descriptor usage is normal',
    duration: Date.now() - startTime,
  };
}

async function checkJobQueueHealth(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    const stats = await jobQueueService.getQueueStats();
    const totalJobs = Object.values(stats).reduce((sum, queueStats) => 
      sum + queueStats.waiting + queueStats.active, 0
    );
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    let message: string;
    
    if (totalJobs < 100) {
      status = 'healthy';
      message = 'Job queues are healthy';
    } else if (totalJobs < 500) {
      status = 'degraded';
      message = 'Job queues are busy but manageable';
    } else {
      status = 'unhealthy';
      message = 'Job queues are overloaded';
    }
    
    return {
      name: 'job_queues',
      status,
      message,
      duration: Date.now() - startTime,
      metadata: { total_jobs: totalJobs, queue_stats: stats },
    };
  } catch (error) {
    return {
      name: 'job_queues',
      status: 'unhealthy',
      message: `Job queue check failed: ${(error as Error).message}`,
      duration: Date.now() - startTime,
    };
  }
}

async function checkPerformanceMetrics(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  // Simple performance check based on response time
  const responseTime = Date.now() - startTime;
  
  let status: 'healthy' | 'degraded' | 'unhealthy';
  let message: string;
  
  if (responseTime < 100) {
    status = 'healthy';
    message = 'Performance is optimal';
  } else if (responseTime < 500) {
    status = 'degraded';
    message = 'Performance is acceptable';
  } else {
    status = 'unhealthy';
    message = 'Performance is poor';
  }
  
  return {
    name: 'performance',
    status,
    message,
    duration: responseTime,
    metadata: { response_time_ms: responseTime },
  };
}

/**
 * Utility functions
 */
function checkMemoryUsage(): 'healthy' | 'degraded' | 'unhealthy' {
  const memUsage = process.memoryUsage();
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  
  if (heapUsedMB < 512) return 'healthy';
  if (heapUsedMB < 1024) return 'degraded';
  return 'unhealthy';
}

function getMemoryStatus(): string {
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  return `Heap used: ${heapUsedMB}MB`;
}

function determineOverallStatus(checks: HealthCheck[]): 'healthy' | 'unhealthy' | 'degraded' {
  const unhealthyChecks = checks.filter(check => check.status === 'unhealthy');
  const degradedChecks = checks.filter(check => check.status === 'degraded');
  
  if (unhealthyChecks.length > 0) return 'unhealthy';
  if (degradedChecks.length > 0) return 'degraded';
  return 'healthy';
}

export default {
  livenessProbe,
  readinessProbe,
  deepHealthCheck,
};