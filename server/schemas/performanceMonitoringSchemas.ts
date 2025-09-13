import { z } from 'zod';

/**
 * Zod schemas for performance monitoring endpoints
 * Ensures proper validation and type safety for all monitoring payloads
 */

// Base metric tracking schemas
export const TrackQuerySchema = z.object({
  query: z.string().min(1, "Query cannot be empty").max(10000, "Query too long"),
  executionTime: z.number().min(0, "Execution time must be positive").max(300000, "Execution time too high"),
  success: z.boolean(),
  userId: z.string().optional(),
  endpoint: z.string().optional(),
  cacheHit: z.boolean().optional(),
  rowCount: z.number().int().min(0).optional(),
  queryType: z.enum(['select', 'insert', 'update', 'delete', 'other']).optional(),
  metadata: z.object({
    tableName: z.string().optional(),
    indexesUsed: z.array(z.string()).optional(),
    connectionPool: z.string().optional()
  }).optional()
});

export const TrackAPISchema = z.object({
  endpoint: z.string().min(1, "Endpoint cannot be empty"),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']),
  responseTime: z.number().min(0, "Response time must be positive").max(60000, "Response time too high"),
  statusCode: z.number().int().min(100, "Invalid status code").max(599, "Invalid status code"),
  userId: z.string().optional(),
  userAgent: z.string().optional(),
  requestSize: z.number().int().min(0).optional(),
  responseSize: z.number().int().min(0).optional(),
  cacheHit: z.boolean().optional(),
  errorMessage: z.string().optional(),
  metadata: z.object({
    source: z.string().optional(),
    feature: z.string().optional(),
    version: z.string().optional()
  }).optional()
});

// LCA-specific tracking schema
export const TrackLCASchema = z.object({
  calculationId: z.string().min(1, "Calculation ID required"),
  executionTime: z.number().min(0, "Execution time must be positive").max(120000, "LCA execution time too high"),
  success: z.boolean(),
  cacheHit: z.boolean().optional(),
  dataPoints: z.number().int().min(0).optional(),
  complexity: z.enum(['low', 'medium', 'high']).optional(),
  errorType: z.string().optional(),
  userId: z.string().optional(),
  metadata: z.object({
    productCategory: z.string().optional(),
    calculationType: z.string().optional(),
    dataSourcesCount: z.number().int().min(0).optional()
  }).optional()
});

// Cache operation tracking schema
export const TrackCacheSchema = z.object({
  operation: z.enum(['get', 'set', 'delete', 'clear', 'expire']),
  key: z.string().min(1, "Cache key required"),
  hit: z.boolean(),
  executionTime: z.number().min(0, "Execution time must be positive").max(10000, "Cache operation time too high"),
  cacheType: z.enum(['redis', 'memory', 'database']),
  size: z.number().int().min(0).optional(),
  ttl: z.number().int().min(0).optional(),
  metadata: z.object({
    namespace: z.string().optional(),
    compression: z.boolean().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional()
  }).optional()
});

// Performance alert schema
export const PerformanceAlertSchema = z.object({
  type: z.enum(['slow_query', 'high_cpu', 'memory_leak', 'cache_miss', 'error_rate', 'response_time']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  message: z.string().min(1, "Alert message required"),
  value: z.number(),
  threshold: z.number(),
  component: z.string(),
  metadata: z.object({
    endpoint: z.string().optional(),
    userId: z.string().optional(),
    queryId: z.string().optional(),
    stackTrace: z.string().optional()
  }).optional()
});

// Performance configuration schema
export const PerformanceConfigSchema = z.object({
  monitoring: z.object({
    enabled: z.boolean(),
    sampleRate: z.number().min(0, "Sample rate must be positive").max(1, "Sample rate must be <= 1"),
    alertThresholds: z.object({
      slowQueryMs: z.number().int().min(0),
      highCpuPercent: z.number().min(0).max(100),
      lowCacheHitRate: z.number().min(0).max(1),
      highErrorRate: z.number().min(0).max(1)
    }),
    retentionDays: z.number().int().min(1).max(365)
  }),
  redis: z.object({
    enabled: z.boolean(),
    maxRetries: z.number().int().min(0).max(10),
    timeoutMs: z.number().int().min(100).max(30000),
    fallbackToMemory: z.boolean()
  }),
  database: z.object({
    queryLogging: z.boolean(),
    slowQueryThresholdMs: z.number().int().min(0),
    connectionPoolMonitoring: z.boolean(),
    indexAnalytics: z.boolean()
  })
});

// Batch tracking schema for efficient bulk operations
export const BatchTrackingSchema = z.object({
  queries: z.array(TrackQuerySchema).max(100, "Too many queries in batch"),
  apis: z.array(TrackAPISchema).max(100, "Too many API calls in batch"),
  cacheOps: z.array(TrackCacheSchema).max(200, "Too many cache operations in batch"),
  timestamp: z.date().optional(),
  source: z.string().optional()
});

// Response schemas for validation
export const PerformanceMetricsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    databasePerformance: z.object({
      avgQueryTime: z.number().min(0),
      slowQueries: z.number().int().min(0),
      indexEfficiency: z.number().min(0).max(1),
      connectionUtilization: z.number().min(0).max(1),
      cacheHitRate: z.number().min(0).max(1)
    }),
    apiPerformance: z.object({
      avgResponseTime: z.number().min(0),
      lcaPerformanceImprovement: z.number().min(0),
      cacheHitRate: z.number().min(0).max(1),
      requestsPerMinute: z.number().min(0),
      errorRate: z.number().min(0).max(1)
    }),
    frontendPerformance: z.object({
      bundleSizeReduction: z.number().min(0).max(100),
      coreWebVitalsScore: z.number().min(0).max(100),
      lazyLoadingEffectiveness: z.number().min(0).max(100),
      pageLoadTime: z.number().min(0),
      cacheUtilization: z.number().min(0).max(100)
    }),
    systemHealth: z.object({
      overallScore: z.number().min(0).max(100),
      memoryUsage: z.number().min(0).max(100),
      cpuUsage: z.number().min(0).max(100),
      diskUsage: z.number().min(0).max(100),
      networkLatency: z.number().min(0)
    })
  }),
  executionTime: z.number().min(0),
  timestamp: z.string()
});

// Type exports for TypeScript
export type TrackQueryPayload = z.infer<typeof TrackQuerySchema>;
export type TrackAPIPayload = z.infer<typeof TrackAPISchema>;
export type TrackLCAPayload = z.infer<typeof TrackLCASchema>;
export type TrackCachePayload = z.infer<typeof TrackCacheSchema>;
export type PerformanceAlertPayload = z.infer<typeof PerformanceAlertSchema>;
export type PerformanceConfigPayload = z.infer<typeof PerformanceConfigSchema>;
export type BatchTrackingPayload = z.infer<typeof BatchTrackingSchema>;
export type PerformanceMetricsResponse = z.infer<typeof PerformanceMetricsResponseSchema>;

// Validation middleware helper
export const validateSchema = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated; // Replace with validated data
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            received: err.input
          }))
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Validation error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
};

// Schema validation helpers for common patterns
export const validateTrackQuery = validateSchema(TrackQuerySchema);
export const validateTrackAPI = validateSchema(TrackAPISchema);
export const validateTrackLCA = validateSchema(TrackLCASchema);
export const validateTrackCache = validateSchema(TrackCacheSchema);
export const validatePerformanceAlert = validateSchema(PerformanceAlertSchema);
export const validateBatchTracking = validateSchema(BatchTrackingSchema);