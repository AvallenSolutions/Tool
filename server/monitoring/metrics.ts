import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { logger } from '../config/logger';

/**
 * Prometheus Metrics Collection for Enterprise Monitoring
 * Provides comprehensive application metrics for observability
 */

// Enable default system metrics collection
collectDefaultMetrics({
  prefix: 'avallen_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// HTTP Request Metrics
export const httpRequestDuration = new Histogram({
  name: 'avallen_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'user_id'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

export const httpRequestTotal = new Counter({
  name: 'avallen_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'user_id'],
});

export const httpRequestSize = new Histogram({
  name: 'avallen_http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000],
});

export const httpResponseSize = new Histogram({
  name: 'avallen_http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [100, 1000, 10000, 100000, 1000000, 10000000],
});

// PDF Generation Metrics
export const pdfGenerationDuration = new Histogram({
  name: 'avallen_pdf_generation_duration_seconds',
  help: 'Duration of PDF generation operations',
  labelNames: ['pdf_type', 'method', 'user_id'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60],
});

export const pdfGenerationTotal = new Counter({
  name: 'avallen_pdf_generation_total',
  help: 'Total number of PDF generation operations',
  labelNames: ['pdf_type', 'method', 'status', 'user_id'],
});

export const pdfSize = new Histogram({
  name: 'avallen_pdf_size_bytes',
  help: 'Size of generated PDFs in bytes',
  labelNames: ['pdf_type'],
  buckets: [10000, 100000, 1000000, 10000000, 50000000],
});

// LCA Calculation Metrics
export const lcaCalculationDuration = new Histogram({
  name: 'avallen_lca_calculation_duration_seconds',
  help: 'Duration of LCA calculations',
  labelNames: ['method', 'cache_hit', 'user_id'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

export const lcaCalculationTotal = new Counter({
  name: 'avallen_lca_calculations_total',
  help: 'Total number of LCA calculations',
  labelNames: ['method', 'cache_hit', 'status', 'user_id'],
});

export const lcaCacheHitRatio = new Gauge({
  name: 'avallen_lca_cache_hit_ratio',
  help: 'LCA cache hit ratio',
});

export const lcaCacheSize = new Gauge({
  name: 'avallen_lca_cache_size_entries',
  help: 'Number of entries in LCA cache',
});

// Browser Pool Metrics
export const browserPoolSize = new Gauge({
  name: 'avallen_browser_pool_size',
  help: 'Number of browsers in the pool',
  labelNames: ['status'], // active, idle
});

export const browserPageCount = new Gauge({
  name: 'avallen_browser_page_count',
  help: 'Number of browser pages',
  labelNames: ['status'], // active, idle
});

export const browserPageAcquisitionDuration = new Histogram({
  name: 'avallen_browser_page_acquisition_duration_seconds',
  help: 'Time to acquire a browser page from the pool',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const browserPageUtilization = new Gauge({
  name: 'avallen_browser_page_utilization_ratio',
  help: 'Browser page utilization ratio (active/total)',
});

// Job Queue Metrics
export const jobQueueDepth = new Gauge({
  name: 'avallen_job_queue_depth',
  help: 'Number of jobs in queue',
  labelNames: ['queue_type', 'status'], // waiting, active, completed, failed
});

export const jobProcessingDuration = new Histogram({
  name: 'avallen_job_processing_duration_seconds',
  help: 'Duration of job processing',
  labelNames: ['job_type', 'status', 'user_id'],
  buckets: [1, 5, 10, 30, 60, 120, 300],
});

export const jobProcessingTotal = new Counter({
  name: 'avallen_job_processing_total',
  help: 'Total number of processed jobs',
  labelNames: ['job_type', 'status', 'user_id'],
});

export const jobRetryCount = new Counter({
  name: 'avallen_job_retry_count_total',
  help: 'Total number of job retries',
  labelNames: ['job_type', 'user_id'],
});

// Redis Metrics
export const redisOperationDuration = new Histogram({
  name: 'avallen_redis_operation_duration_seconds',
  help: 'Duration of Redis operations',
  labelNames: ['operation', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

export const redisConnectionStatus = new Gauge({
  name: 'avallen_redis_connection_status',
  help: 'Redis connection status (1=connected, 0=disconnected)',
});

// Database Metrics
export const databaseQueryDuration = new Histogram({
  name: 'avallen_database_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['operation', 'table', 'status'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
});

export const databaseConnectionPool = new Gauge({
  name: 'avallen_database_connection_pool_size',
  help: 'Database connection pool size',
  labelNames: ['status'], // active, idle, total
});

// Business Metrics
export const activeUsers = new Gauge({
  name: 'avallen_active_users',
  help: 'Number of active users',
  labelNames: ['timeframe'], // 1h, 24h, 7d
});

export const reportsGenerated = new Counter({
  name: 'avallen_reports_generated_total',
  help: 'Total number of sustainability reports generated',
  labelNames: ['report_type', 'company_size', 'user_id'],
});

export const lcaCalculationsPerformed = new Counter({
  name: 'avallen_lca_calculations_performed_total',
  help: 'Total number of LCA calculations performed',
  labelNames: ['calculation_method', 'product_category', 'user_id'],
});

// Security Metrics
export const securityEvents = new Counter({
  name: 'avallen_security_events_total',
  help: 'Total number of security events',
  labelNames: ['event_type', 'severity', 'source_ip'],
});

export const rateLimitViolations = new Counter({
  name: 'avallen_rate_limit_violations_total',
  help: 'Total number of rate limit violations',
  labelNames: ['endpoint', 'user_id', 'source_ip'],
});

export const suspiciousPatterns = new Counter({
  name: 'avallen_suspicious_patterns_total',
  help: 'Total number of suspicious pattern detections',
  labelNames: ['pattern_type', 'source_ip', 'user_id'],
});

// System Resource Metrics
export const memoryUsage = new Gauge({
  name: 'avallen_memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type'], // heap_used, heap_total, rss, external
});

export const cpuUsage = new Gauge({
  name: 'avallen_cpu_usage_ratio',
  help: 'CPU usage ratio',
});

export const diskUsage = new Gauge({
  name: 'avallen_disk_usage_bytes',
  help: 'Disk usage in bytes',
  labelNames: ['mount_point'],
});

/**
 * Update system resource metrics
 */
export function updateSystemMetrics(): void {
  const memUsage = process.memoryUsage();
  memoryUsage.set({ type: 'heap_used' }, memUsage.heapUsed);
  memoryUsage.set({ type: 'heap_total' }, memUsage.heapTotal);
  memoryUsage.set({ type: 'rss' }, memUsage.rss);
  memoryUsage.set({ type: 'external' }, memUsage.external);

  const cpuUsageData = process.cpuUsage();
  const totalUsage = cpuUsageData.user + cpuUsageData.system;
  cpuUsage.set(totalUsage / 1000000); // Convert to seconds
}

/**
 * Start metrics collection
 */
export function startMetricsCollection(): void {
  // Update system metrics every 30 seconds
  setInterval(updateSystemMetrics, 30000);
  
  logger.info({}, 'Metrics collection started');
}

/**
 * Get metrics registry for /metrics endpoint
 */
export function getMetricsRegistry() {
  return register;
}

/**
 * Record HTTP request metrics
 */
export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  duration: number,
  requestSize: number,
  responseSize: number,
  userId?: string
): void {
  const labels = { 
    method, 
    route: route || 'unknown', 
    status_code: statusCode.toString(),
    user_id: userId || 'anonymous'
  };

  httpRequestDuration.observe(labels, duration / 1000);
  httpRequestTotal.inc(labels);
  httpRequestSize.observe({ method, route }, requestSize);
  httpResponseSize.observe({ method, route, status_code: statusCode.toString() }, responseSize);
}

/**
 * Record PDF generation metrics
 */
export function recordPDFGeneration(
  pdfType: string,
  method: string,
  duration: number,
  size: number,
  success: boolean,
  userId?: string
): void {
  const status = success ? 'success' : 'failure';
  const labels = { 
    pdf_type: pdfType, 
    method, 
    status, 
    user_id: userId || 'anonymous' 
  };

  pdfGenerationDuration.observe({ pdf_type: pdfType, method, user_id: userId || 'anonymous' }, duration / 1000);
  pdfGenerationTotal.inc(labels);
  
  if (success) {
    pdfSize.observe({ pdf_type: pdfType }, size);
  }
}

/**
 * Record LCA calculation metrics
 */
export function recordLCACalculation(
  method: string,
  duration: number,
  cacheHit: boolean,
  success: boolean,
  userId?: string
): void {
  const labels = { 
    method, 
    cache_hit: cacheHit.toString(), 
    status: success ? 'success' : 'failure',
    user_id: userId || 'anonymous'
  };

  lcaCalculationDuration.observe({ method, cache_hit: cacheHit.toString(), user_id: userId || 'anonymous' }, duration / 1000);
  lcaCalculationTotal.inc(labels);
}

/**
 * Update browser pool metrics
 */
export function updateBrowserPoolMetrics(stats: {
  browsers: { total: number; active: number };
  pages: { total: number; active: number; available: number };
}): void {
  browserPoolSize.set({ status: 'active' }, stats.browsers.active);
  browserPoolSize.set({ status: 'idle' }, stats.browsers.total - stats.browsers.active);
  
  browserPageCount.set({ status: 'active' }, stats.pages.active);
  browserPageCount.set({ status: 'idle' }, stats.pages.available);
  
  if (stats.pages.total > 0) {
    browserPageUtilization.set(stats.pages.active / stats.pages.total);
  }
}

/**
 * Record job queue metrics
 */
export function recordJobMetrics(
  jobType: string,
  duration: number,
  success: boolean,
  retryCount: number = 0,
  userId?: string
): void {
  const status = success ? 'success' : 'failure';
  const labels = { 
    job_type: jobType, 
    status, 
    user_id: userId || 'anonymous' 
  };

  jobProcessingDuration.observe(labels, duration / 1000);
  jobProcessingTotal.inc(labels);
  
  if (retryCount > 0) {
    jobRetryCount.inc({ job_type: jobType, user_id: userId || 'anonymous' }, retryCount);
  }
}

/**
 * Update job queue depth metrics
 */
export function updateJobQueueDepth(
  queueType: string,
  waiting: number,
  active: number,
  completed: number,
  failed: number
): void {
  jobQueueDepth.set({ queue_type: queueType, status: 'waiting' }, waiting);
  jobQueueDepth.set({ queue_type: queueType, status: 'active' }, active);
  jobQueueDepth.set({ queue_type: queueType, status: 'completed' }, completed);
  jobQueueDepth.set({ queue_type: queueType, status: 'failed' }, failed);
}

/**
 * Record security events
 */
export function recordSecurityEvent(
  eventType: string,
  severity: string,
  sourceIp: string,
  userId?: string
): void {
  securityEvents.inc({ 
    event_type: eventType, 
    severity, 
    source_ip: sourceIp 
  });
  
  if (eventType === 'rate_limit_violation') {
    rateLimitViolations.inc({ 
      endpoint: 'unknown', 
      user_id: userId || 'anonymous', 
      source_ip: sourceIp 
    });
  }
  
  if (eventType === 'suspicious_pattern') {
    suspiciousPatterns.inc({ 
      pattern_type: severity, 
      source_ip: sourceIp, 
      user_id: userId || 'anonymous' 
    });
  }
}

export default {
  startMetricsCollection,
  getMetricsRegistry,
  recordHttpRequest,
  recordPDFGeneration,
  recordLCACalculation,
  updateBrowserPoolMetrics,
  recordJobMetrics,
  updateJobQueueDepth,
  recordSecurityEvent,
  updateSystemMetrics,
};