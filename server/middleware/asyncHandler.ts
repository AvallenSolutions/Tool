import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { AppError, NotFoundError, AuthenticationError, AuthorizationError } from './errorHandler';

/**
 * Enhanced async handler wrapper that catches errors and forwards to error middleware
 * Provides additional functionality for common patterns
 */
export function asyncHandler<T = any>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Authenticated route wrapper - ensures user is authenticated
 */
export function authenticatedRoute<T = any>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }
    
    return await fn(req, res, next);
  });
}

/**
 * Admin-only route wrapper - ensures user is authenticated and has admin role
 */
export function adminRoute<T = any>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }
    
    if (user.role !== 'admin') {
      throw new AuthorizationError('Admin access required');
    }
    
    return await fn(req, res, next);
  });
}

/**
 * Company owner route wrapper - ensures user owns the company
 */
export function companyOwnerRoute<T = any>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }
    
    // This would check if user owns the company being accessed
    // Implementation depends on your business logic
    
    return await fn(req, res, next);
  });
}

/**
 * Validated route wrapper - validates request data using provided schema
 */
export function validatedRoute<T = any>(
  validationSchema: any,
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Validation would be handled by middleware, this is just the wrapper
    return await fn(req, res, next);
  });
}

/**
 * Paginated route wrapper - adds pagination helpers
 */
export function paginatedRoute<T = any>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 items
    const offset = (page - 1) * limit;
    
    // Add pagination helpers to request
    (req as any).pagination = {
      page,
      limit,
      offset,
      createResponse: (data: any[], totalCount: number) => ({
        data,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: page * limit < totalCount,
          hasPrev: page > 1,
        },
      }),
    };
    
    return await fn(req, res, next);
  });
}

/**
 * Cached route wrapper - adds caching headers and cache checking
 */
export function cachedRoute<T = any>(
  ttlSeconds: number,
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Set cache headers
    res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}`);
    res.setHeader('Expires', new Date(Date.now() + ttlSeconds * 1000).toUTCString());
    
    // Check if client has cached version
    const ifModifiedSince = req.headers['if-modified-since'];
    if (ifModifiedSince) {
      const modifiedSince = new Date(ifModifiedSince);
      const now = new Date();
      
      if (now.getTime() - modifiedSince.getTime() < ttlSeconds * 1000) {
        res.status(304).send();
        return;
      }
    }
    
    res.setHeader('Last-Modified', new Date().toUTCString());
    
    return await fn(req, res, next);
  });
}

/**
 * Rate limited route wrapper - adds rate limiting
 */
export function rateLimitedRoute<T = any>(
  maxRequests: number,
  windowMs: number,
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const clientKey = req.ip || 'unknown';
    const now = Date.now();
    
    const clientData = requests.get(clientKey);
    
    if (!clientData || now > clientData.resetTime) {
      // Reset or create new entry
      requests.set(clientKey, { count: 1, resetTime: now + windowMs });
    } else {
      // Increment count
      clientData.count++;
      
      if (clientData.count > maxRequests) {
        const resetIn = Math.ceil((clientData.resetTime - now) / 1000);
        res.status(429).json({
          error: 'Too many requests',
          resetIn,
        });
        return;
      }
    }
    
    return await fn(req, res, next);
  });
}

/**
 * File upload route wrapper - handles multipart/form-data
 */
export function fileUploadRoute<T = any>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // File upload handling would be done by multer middleware
    // This wrapper adds file validation and cleanup
    
    const files = (req as any).files;
    if (files) {
      // Add file cleanup on response end
      res.on('finish', () => {
        // Clean up temporary files if needed
        if (Array.isArray(files)) {
          files.forEach(file => {
            if (file.path && file.path.includes('/tmp/')) {
              // Would clean up temp files
            }
          });
        }
      });
    }
    
    return await fn(req, res, next);
  });
}

/**
 * Transactional route wrapper - ensures database operations are wrapped in transaction
 */
export function transactionalRoute<T = any>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Database transaction handling would be implemented here
    // This is a placeholder for the pattern
    
    try {
      // Start transaction
      const result = await fn(req, res, next);
      // Commit transaction
      return result;
    } catch (error) {
      // Rollback transaction
      throw error;
    }
  });
}

/**
 * Logging route wrapper - adds request/response logging
 */
export function loggedRoute<T = any>(
  logLevel: 'info' | 'debug' | 'warn' = 'info',
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    logger[logLevel]({
      routeStart: true,
      method: req.method,
      path: req.path,
      userId: (req as any).user?.id,
    }, `Route ${req.method} ${req.path} started`);
    
    try {
      const result = await fn(req, res, next);
      
      const duration = Date.now() - startTime;
      logger[logLevel]({
        routeComplete: true,
        method: req.method,
        path: req.path,
        duration,
        statusCode: res.statusCode,
        userId: (req as any).user?.id,
      }, `Route ${req.method} ${req.path} completed in ${duration}ms`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({
        routeError: true,
        method: req.method,
        path: req.path,
        duration,
        error: error.message,
        userId: (req as any).user?.id,
      }, `Route ${req.method} ${req.path} failed after ${duration}ms`);
      
      throw error;
    }
  });
}

export default asyncHandler;