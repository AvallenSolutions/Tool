import { Request, Response, NextFunction } from 'express';
import { logger, createRequestLogger, logAPI, logAuth } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

export interface RequestWithLogger extends Request {
  logger: typeof logger;
  requestId: string;
  startTime: number;
}

/**
 * Comprehensive request logging middleware with correlation IDs and performance tracking
 * This middleware:
 * - Generates unique request IDs for distributed tracing
 * - Creates request-scoped loggers
 * - Tracks request timing and performance metrics
 * - Logs requests/responses with structured data
 * - Handles authentication events
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  // Generate or extract request ID
  const requestId = (req.headers['x-request-id'] as string) || 
                   (req.headers['x-correlation-id'] as string) || 
                   uuidv4();
  
  // Create request-scoped logger
  const requestLogger = createRequestLogger(requestId);
  
  // Attach to request object
  const extendedReq = req as RequestWithLogger;
  extendedReq.logger = requestLogger;
  extendedReq.requestId = requestId;
  extendedReq.startTime = startTime;
  
  // Set response headers
  res.setHeader('x-request-id', requestId);
  res.setHeader('x-server-instance', process.env.REPL_ID || 'local');
  
  // Log incoming request
  logAPI('request_start', {
    method: req.method,
    url: req.url,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    contentLength: req.get('Content-Length'),
    contentType: req.get('Content-Type'),
    userId: (req as any).user?.id,
    sessionId: (req as any).sessionID,
  });
  
  // Track response completion
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const responseSize = res.get('Content-Length') || '0';
    
    logAPI('request_complete', {
      method: req.method,
      url: req.url,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      responseSize: parseInt(responseSize),
      userId: (req as any).user?.id,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
    });
    
    // Log slow requests
    if (duration > 2000) {
      requestLogger.warn({
        slowRequest: true,
        duration,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
      }, 'Slow request detected');
    }
    
    // Log error responses
    if (res.statusCode >= 400) {
      const logLevel = res.statusCode >= 500 ? 'error' : 'warn';
      requestLogger[logLevel]({
        errorResponse: true,
        statusCode: res.statusCode,
        method: req.method,
        path: req.path,
        duration,
        userId: (req as any).user?.id,
      }, `Request failed with status ${res.statusCode}`);
    }
  });
  
  // Track response errors
  res.on('error', (error) => {
    const duration = Date.now() - startTime;
    
    requestLogger.error({
      responseError: true,
      error: error.message,
      method: req.method,
      path: req.path,
      duration,
      userId: (req as any).user?.id,
    }, 'Response error occurred');
  });
  
  next();
}

/**
 * Authentication event logging middleware
 * Logs authentication attempts, successes, and failures
 */
export function authLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const originalSend = res.send;
  
  // Intercept authentication responses
  res.send = function(body) {
    const requestLogger = (req as RequestWithLogger).logger || logger;
    const requestId = (req as RequestWithLogger).requestId;
    
    // Log authentication events based on response
    if (req.path.includes('/auth/') || req.path.includes('/login') || req.path.includes('/logout')) {
      if (res.statusCode === 200 || res.statusCode === 201) {
        logAuth('authentication_success', {
          userId: (req as any).user?.id,
          email: (req as any).user?.email,
          path: req.path,
          method: req.method,
        });
      } else if (res.statusCode === 401 || res.statusCode === 403) {
        logAuth('authentication_failure', {
          reason: 'invalid_credentials',
          path: req.path,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });
      }
    }
    
    return originalSend.call(this, body);
  };
  
  next();
}

/**
 * Security event logging middleware
 * Logs suspicious activities and security events
 */
export function securityLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestLogger = (req as RequestWithLogger).logger || logger;
  
  // Log potential security issues
  const suspiciousPatterns = [
    /\.\./,           // Path traversal
    /<script/i,       // XSS attempts
    /union\s+select/i, // SQL injection
    /exec\s*\(/i,     // Code injection
  ];
  
  const requestData = `${req.url} ${JSON.stringify(req.body)} ${JSON.stringify(req.query)}`;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestData)) {
      requestLogger.warn({
        securityAlert: true,
        pattern: pattern.source,
        method: req.method,
        url: req.url,
        body: req.body,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: (req as any).user?.id,
      }, 'Suspicious request pattern detected');
      break;
    }
  }
  
  // Log admin access attempts
  if (req.path.includes('/admin/') && req.method !== 'GET') {
    requestLogger.info({
      adminAccess: true,
      method: req.method,
      path: req.path,
      userId: (req as any).user?.id,
      userRole: (req as any).user?.role,
      ip: req.ip,
    }, 'Admin access attempt');
  }
  
  next();
}

/**
 * Performance monitoring middleware
 * Tracks application performance metrics
 */
export function performanceMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestLogger = (req as RequestWithLogger).logger || logger;
  
  // Track memory usage
  const memoryBefore = process.memoryUsage();
  
  res.on('finish', () => {
    const memoryAfter = process.memoryUsage();
    const duration = Date.now() - (req as RequestWithLogger).startTime;
    
    // Log performance metrics for API routes
    if (req.path.startsWith('/api/')) {
      requestLogger.info({
        performance: true,
        duration,
        memoryUsage: {
          heapUsedDelta: memoryAfter.heapUsed - memoryBefore.heapUsed,
          heapUsedMB: Math.round(memoryAfter.heapUsed / 1024 / 1024),
          rss: Math.round(memoryAfter.rss / 1024 / 1024),
        },
        statusCode: res.statusCode,
        method: req.method,
        path: req.path,
      }, 'Request performance metrics');
    }
    
    // Alert on high memory usage
    if (memoryAfter.heapUsed > 1024 * 1024 * 1024) { // 1GB
      requestLogger.warn({
        highMemoryUsage: true,
        heapUsedMB: Math.round(memoryAfter.heapUsed / 1024 / 1024),
        path: req.path,
      }, 'High memory usage detected');
    }
  });
  
  next();
}

/**
 * Rate limiting event logging middleware
 * Logs rate limiting events and suspicious patterns
 */
export function rateLimitLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestLogger = (req as RequestWithLogger).logger || logger;
  
  // Track request frequency by IP
  const clientRequests = requestTracker.get(req.ip) || [];
  const now = Date.now();
  
  // Clean old requests (older than 1 minute)
  const recentRequests = clientRequests.filter(timestamp => now - timestamp < 60000);
  recentRequests.push(now);
  requestTracker.set(req.ip, recentRequests);
  
  // Log high frequency requests
  if (recentRequests.length > 100) { // More than 100 requests per minute
    requestLogger.warn({
      rateLimitAlert: true,
      requestCount: recentRequests.length,
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
    }, 'High request frequency detected');
  }
  
  next();
}

// In-memory request tracker (would use Redis in production)
const requestTracker = new Map<string, number[]>();

// Clean up old tracking data every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, requests] of requestTracker.entries()) {
    const recentRequests = requests.filter(timestamp => now - timestamp < 300000); // 5 minutes
    if (recentRequests.length === 0) {
      requestTracker.delete(ip);
    } else {
      requestTracker.set(ip, recentRequests);
    }
  }
}, 5 * 60 * 1000);

/**
 * Combined request middleware that includes all logging functionality
 */
export function comprehensiveRequestMiddleware(req: Request, res: Response, next: NextFunction): void {
  requestLoggingMiddleware(req, res, () => {
    authLoggingMiddleware(req, res, () => {
      securityLoggingMiddleware(req, res, () => {
        performanceMiddleware(req, res, () => {
          rateLimitLoggingMiddleware(req, res, next);
        });
      });
    });
  });
}

export default comprehensiveRequestMiddleware;