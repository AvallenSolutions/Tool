import { NodeSDK } from '@opentelemetry/sdk-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { FsInstrumentation } from '@opentelemetry/instrumentation-fs';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { logger } from '../config/logger';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';

/**
 * OpenTelemetry Configuration for Enterprise Observability
 * Provides distributed tracing, metrics collection, and performance monitoring
 */

// Initialize OpenTelemetry SDK
const sdk = new NodeSDK({
  serviceName: 'avallen-sustainability-platform',
  serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
  
  instrumentations: [
    new HttpInstrumentation({
      // Don't trace health checks and metrics endpoints
      ignoreIncomingRequestHook: (req) => {
        const url = req.url || '';
        return url.includes('/healthz') || 
               url.includes('/readyz') || 
               url.includes('/metrics');
      },
      // Add custom attributes to HTTP spans
      requestHook: (span, request) => {
        span.setAttributes({
          'http.request.correlation_id': request.headers['x-correlation-id'] || '',
          'http.request.user_agent': request.headers['user-agent'] || '',
          'http.request.user_id': (request as any).user?.id || 'anonymous',
        });
      },
    }),
    
    new ExpressInstrumentation({
      // Add custom attributes for Express routes
      requestHook: (span, info) => {
        span.setAttributes({
          'express.route': info.route || 'unknown',
          'express.method': info.request.method,
        });
      },
    }),
    
    new FsInstrumentation({
      // Only trace file operations for specific directories
      ignoreIncomingRequestHook: (info) => {
        return !info.args[0]?.includes?.('/tmp/') && 
               !info.args[0]?.includes?.('attached_assets');
      },
    }),
  ],
});

// Configure exporters based on environment
if (process.env.JAEGER_ENDPOINT) {
  // Jaeger for distributed tracing
  const jaegerExporter = new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT,
  });
  
  logger.info({ endpoint: process.env.JAEGER_ENDPOINT }, 'Jaeger tracing enabled');
}

// Prometheus metrics exporter
let prometheusExporter: PrometheusExporter | undefined;

try {
  prometheusExporter = new PrometheusExporter({
    port: parseInt(process.env.PROMETHEUS_PORT || '9090'),
    preventServerStart: true, // We'll handle the server ourselves
  });
  
  logger.info({ port: process.env.PROMETHEUS_PORT || '9090' }, 'Prometheus metrics enabled');
} catch (error) {
  logger.warn({ error }, 'Failed to initialize Prometheus exporter');
}

/**
 * Initialize OpenTelemetry
 */
export function initializeTelemetry(): void {
  try {
    sdk.start();
    logger.info({}, 'OpenTelemetry initialized successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize OpenTelemetry');
  }
}

/**
 * Gracefully shutdown OpenTelemetry
 */
export async function shutdownTelemetry(): Promise<void> {
  try {
    await sdk.shutdown();
    logger.info({}, 'OpenTelemetry shutdown completed');
  } catch (error) {
    logger.error({ error }, 'Error during OpenTelemetry shutdown');
  }
}

/**
 * Get the current tracer instance
 */
export function getTracer(name: string = 'default') {
  return trace.getTracer('avallen-sustainability-platform', process.env.SERVICE_VERSION || '1.0.0');
}

/**
 * Create a custom span with error handling
 */
export async function createSpan<T>(
  name: string,
  operation: (span: any) => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const tracer = getTracer();
  
  return tracer.startActiveSpan(name, { kind: SpanKind.INTERNAL }, async (span) => {
    try {
      if (attributes) {
        span.setAttributes(attributes);
      }
      
      const result = await operation(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
      
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: (error as Error).message 
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Add correlation ID to active span
 */
export function setCorrelationId(correlationId: string): void {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    activeSpan.setAttributes({ 'correlation.id': correlationId });
  }
}

/**
 * Create child span for async operations
 */
export function createChildSpan(
  name: string, 
  attributes?: Record<string, string | number | boolean>
) {
  const tracer = getTracer();
  const span = tracer.startSpan(name, { kind: SpanKind.INTERNAL });
  
  if (attributes) {
    span.setAttributes(attributes);
  }
  
  return span;
}

/**
 * Trace PDF generation operations
 */
export async function tracePDFGeneration<T>(
  pdfType: string,
  reportId: string,
  userId: string,
  operation: () => Promise<T>
): Promise<T> {
  return createSpan(
    'pdf.generation',
    async (span) => {
      span.setAttributes({
        'pdf.type': pdfType,
        'pdf.report_id': reportId,
        'pdf.user_id': userId,
        'pdf.timestamp': Date.now(),
      });
      
      const startTime = Date.now();
      try {
        const result = await operation();
        const duration = Date.now() - startTime;
        
        span.setAttributes({
          'pdf.generation.duration_ms': duration,
          'pdf.generation.success': true,
        });
        
        return result;
      } catch (error) {
        span.setAttributes({
          'pdf.generation.success': false,
          'pdf.generation.error': (error as Error).message,
        });
        throw error;
      }
    }
  );
}

/**
 * Trace LCA calculation operations
 */
export async function traceLCACalculation<T>(
  calculationMethod: string,
  productId: string,
  userId: string,
  operation: () => Promise<T>
): Promise<T> {
  return createSpan(
    'lca.calculation',
    async (span) => {
      span.setAttributes({
        'lca.method': calculationMethod,
        'lca.product_id': productId,
        'lca.user_id': userId,
        'lca.timestamp': Date.now(),
      });
      
      const startTime = Date.now();
      try {
        const result = await operation();
        const duration = Date.now() - startTime;
        
        span.setAttributes({
          'lca.calculation.duration_ms': duration,
          'lca.calculation.success': true,
        });
        
        return result;
      } catch (error) {
        span.setAttributes({
          'lca.calculation.success': false,
          'lca.calculation.error': (error as Error).message,
        });
        throw error;
      }
    }
  );
}

/**
 * Trace job queue operations
 */
export async function traceJobExecution<T>(
  jobType: string,
  jobId: string,
  userId: string,
  operation: () => Promise<T>
): Promise<T> {
  return createSpan(
    'job.execution',
    async (span) => {
      span.setAttributes({
        'job.type': jobType,
        'job.id': jobId,
        'job.user_id': userId,
        'job.timestamp': Date.now(),
      });
      
      const startTime = Date.now();
      try {
        const result = await operation();
        const duration = Date.now() - startTime;
        
        span.setAttributes({
          'job.execution.duration_ms': duration,
          'job.execution.success': true,
        });
        
        return result;
      } catch (error) {
        span.setAttributes({
          'job.execution.success': false,
          'job.execution.error': (error as Error).message,
        });
        throw error;
      }
    }
  );
}

/**
 * Trace browser pool operations
 */
export async function traceBrowserOperation<T>(
  operation: string,
  pageId: string,
  operation_func: () => Promise<T>
): Promise<T> {
  return createSpan(
    'browser.operation',
    async (span) => {
      span.setAttributes({
        'browser.operation': operation,
        'browser.page_id': pageId,
        'browser.timestamp': Date.now(),
      });
      
      const startTime = Date.now();
      try {
        const result = await operation_func();
        const duration = Date.now() - startTime;
        
        span.setAttributes({
          'browser.operation.duration_ms': duration,
          'browser.operation.success': true,
        });
        
        return result;
      } catch (error) {
        span.setAttributes({
          'browser.operation.success': false,
          'browser.operation.error': (error as Error).message,
        });
        throw error;
      }
    }
  );
}

/**
 * Get Prometheus exporter instance
 */
export function getPrometheusExporter(): PrometheusExporter | undefined {
  return prometheusExporter;
}

export default {
  initializeTelemetry,
  shutdownTelemetry,
  getTracer,
  createSpan,
  setCorrelationId,
  tracePDFGeneration,
  traceLCACalculation,
  traceJobExecution,
  traceBrowserOperation,
  getPrometheusExporter,
};