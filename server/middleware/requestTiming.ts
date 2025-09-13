import { Request, Response, NextFunction } from 'express';
import { metricsRegistry } from '../monitoring/MetricsRegistry';

/**
 * Middleware to track request timing and performance metrics
 */
export const requestTiming = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1000000; // Convert nanoseconds to milliseconds
    
    // Create route key for metrics
    const method = req.method;
    const pathTemplate = getPathTemplate(req.path);
    const routeKey = `${method}:${pathTemplate}`;
    const statusClass = `${Math.floor(res.statusCode / 100)}xx`;
    
    // Record metrics
    metricsRegistry.incrementCounter(`requests.total`);
    metricsRegistry.incrementCounter(`requests.${routeKey}`);
    metricsRegistry.incrementCounter(`requests.status.${statusClass}`);
    metricsRegistry.recordHistogram(`request.duration`, durationMs);
    metricsRegistry.recordHistogram(`request.duration.${routeKey}`, durationMs);
    
    // Add diagnostic header in development
    if (process.env.NODE_ENV === 'development') {
      res.setHeader('X-Perf-Elapsed', `${durationMs.toFixed(2)}ms`);
    }
  });
  
  next();
};

/**
 * Convert actual paths to templates for better metrics grouping
 */
function getPathTemplate(path: string): string {
  // Replace common ID patterns with templates
  return path
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
    .replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:token');
}