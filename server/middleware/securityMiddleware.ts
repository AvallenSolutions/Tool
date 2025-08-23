import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

/**
 * Security Middleware - HTML sanitization and authorization checks
 * Implements comprehensive input sanitization and security validations
 */

export interface SecurityOptions {
  sanitizeHtml?: boolean;
  validateCSP?: boolean;
  checkAuthorization?: boolean;
  blockSuspiciousPatterns?: boolean;
  maxRequestSize?: number;
}

/**
 * HTML Sanitization Middleware
 * Sanitizes any HTML content in request bodies to prevent XSS
 */
export function htmlSanitizationMiddleware(
  options: SecurityOptions = { sanitizeHtml: true }
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!options.sanitizeHtml) {
      return next();
    }

    try {
      // Sanitize request body recursively
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObjectRecursively(req.body);
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObjectRecursively(req.query);
      }

      next();
    } catch (error) {
      logger.error({ error, path: req.path }, 'HTML sanitization failed');
      res.status(400).json({
        error: 'Invalid request data',
        message: 'Request contains potentially harmful content'
      });
    }
  };
}

/**
 * Content Security Policy Middleware
 * Validates that uploaded content meets security requirements
 */
export function contentSecurityMiddleware(
  options: SecurityOptions = { validateCSP: true }
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!options.validateCSP) {
      return next();
    }

    // Set secure headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // CSP for PDF generation
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self'; " +
      "object-src 'none'; " +
      "base-uri 'self';"
    );

    // Validate file uploads if present
    if ((req as any).files) {
      const files = Array.isArray((req as any).files) ? (req as any).files : [(req as any).files];
      
      for (const file of files) {
        if (!validateFileUpload(file)) {
          return res.status(400).json({
            error: 'Invalid file upload',
            message: 'File type or content not allowed'
          });
        }
      }
    }

    next();
  };
}

/**
 * Authorization Middleware for Job Processing
 * Ensures users can only access their own resources
 */
export function jobAuthorizationMiddleware(
  options: SecurityOptions = { checkAuthorization: true }
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!options.checkAuthorization) {
      return next();
    }

    const user = (req as any).user;
    const userId = user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated to access this resource'
      });
    }

    // Check if request involves user-specific resources
    if (req.body) {
      // Ensure job data belongs to authenticated user
      if (req.body.userId && req.body.userId !== userId) {
        logger.warn({
          requestUserId: req.body.userId,
          authenticatedUserId: userId,
          path: req.path,
          ip: req.ip
        }, 'Authorization violation: User attempting to access another user\'s resources');
        
        return res.status(403).json({
          error: 'Access forbidden',
          message: 'You can only access your own resources'
        });
      }

      // Automatically set userId for security
      if (req.body.type && ['pdf_generation', 'lca_calculation', 'data_extraction', 'report_export'].includes(req.body.type)) {
        req.body.userId = userId;
      }
    }

    // Check company access for company-specific operations
    if (req.params.companyId || req.body.companyId) {
      const companyId = req.params.companyId || req.body.companyId;
      
      // This would be implemented based on your company access control logic
      // For now, we'll add a placeholder
      if (!validateCompanyAccess(userId, companyId)) {
        logger.warn({
          userId,
          companyId,
          path: req.path,
        }, 'Unauthorized company access attempt');
        
        return res.status(403).json({
          error: 'Company access forbidden',
          message: 'You do not have access to this company\'s resources'
        });
      }
    }

    next();
  };
}

/**
 * Suspicious Pattern Detection Middleware
 * Blocks requests with potentially malicious patterns
 */
export function suspiciousPatternMiddleware(
  options: SecurityOptions = { blockSuspiciousPatterns: true }
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!options.blockSuspiciousPatterns) {
      return next();
    }

    const suspiciousPatterns = [
      // Path traversal
      /\.\.\//g,
      /\.\.%2F/gi,
      /\.\.%5C/gi,
      
      // SQL injection
      /(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE)?|INSERT|MERGE|SELECT|UNION|UPDATE)\b)|(['"](\s*;\s*|\s*--|\s*\/\*))/gi,
      
      // XSS patterns
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      
      // NoSQL injection
      /\$where/gi,
      /\$ne/gi,
      
      // Command injection
      /(\||&|;|\$\(|\`)/g,
      
      // File inclusion
      /file:\/\//gi,
      /php:\/\//gi,
    ];

    const requestData = JSON.stringify({
      url: req.url,
      body: req.body,
      query: req.query,
      headers: req.headers
    });

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(requestData)) {
        logger.warn({
          pattern: pattern.source,
          path: req.path,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          userId: (req as any).user?.id,
          suspiciousData: requestData.substring(0, 500) // Truncate for logging
        }, 'Suspicious request pattern detected');

        return res.status(400).json({
          error: 'Request blocked',
          message: 'Request contains potentially harmful patterns',
          code: 'SUSPICIOUS_PATTERN_DETECTED'
        });
      }
    }

    next();
  };
}

/**
 * Request Size Validation Middleware
 * Prevents oversized requests that could cause DoS
 */
export function requestSizeValidationMiddleware(
  options: SecurityOptions = { maxRequestSize: 10 * 1024 * 1024 } // 10MB default
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const maxSize = options.maxRequestSize || 10 * 1024 * 1024;
    const contentLength = parseInt(req.get('Content-Length') || '0');

    if (contentLength > maxSize) {
      logger.warn({
        contentLength,
        maxSize,
        path: req.path,
        ip: req.ip,
        userId: (req as any).user?.id
      }, 'Request size exceeds limit');

      return res.status(413).json({
        error: 'Request too large',
        message: `Request size ${contentLength} exceeds maximum allowed size ${maxSize}`,
        maxSize
      });
    }

    next();
  };
}

/**
 * Combined Security Middleware
 * Applies all security checks in one middleware
 */
export function comprehensiveSecurityMiddleware(options: SecurityOptions = {}) {
  const defaultOptions: SecurityOptions = {
    sanitizeHtml: true,
    validateCSP: true,
    checkAuthorization: true,
    blockSuspiciousPatterns: true,
    maxRequestSize: 10 * 1024 * 1024,
    ...options
  };

  return (req: Request, res: Response, next: NextFunction) => {
    // Chain all security middlewares
    htmlSanitizationMiddleware(defaultOptions)(req, res, (err1) => {
      if (err1) return next(err1);
      
      contentSecurityMiddleware(defaultOptions)(req, res, (err2) => {
        if (err2) return next(err2);
        
        suspiciousPatternMiddleware(defaultOptions)(req, res, (err3) => {
          if (err3) return next(err3);
          
          requestSizeValidationMiddleware(defaultOptions)(req, res, (err4) => {
            if (err4) return next(err4);
            
            jobAuthorizationMiddleware(defaultOptions)(req, res, next);
          });
        });
      });
    });
  };
}

/**
 * PDF Content Sanitization
 * Specifically for sanitizing content used in PDF generation
 */
export function sanitizePDFContent(content: any): any {
  if (typeof content === 'string') {
    // Remove potentially dangerous HTML/JS while preserving formatting
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th'],
      ALLOWED_ATTR: ['class'],
      FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style']
    });
  }
  
  if (Array.isArray(content)) {
    return content.map(item => sanitizePDFContent(item));
  }
  
  if (content && typeof content === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(content)) {
      sanitized[key] = sanitizePDFContent(value);
    }
    return sanitized;
  }
  
  return content;
}

/**
 * Utility Functions
 */
function sanitizeObjectRecursively(obj: any): any {
  if (typeof obj === 'string') {
    return DOMPurify.sanitize(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObjectRecursively(item));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObjectRecursively(value);
    }
    return sanitized;
  }
  
  return obj;
}

function validateFileUpload(file: any): boolean {
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'text/csv',
    'application/json',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  const maxFileSize = 50 * 1024 * 1024; // 50MB

  if (!allowedMimeTypes.includes(file.mimetype)) {
    logger.warn({ 
      mimetype: file.mimetype, 
      filename: file.originalname 
    }, 'Blocked file upload with disallowed mimetype');
    return false;
  }

  if (file.size > maxFileSize) {
    logger.warn({ 
      size: file.size, 
      maxSize: maxFileSize, 
      filename: file.originalname 
    }, 'Blocked oversized file upload');
    return false;
  }

  return true;
}

function validateCompanyAccess(userId: string, companyId: string): boolean {
  // Placeholder implementation - would check database for user company associations
  // This should be implemented based on your actual company access control logic
  
  // For now, return true to avoid blocking (implement proper logic)
  return true;
}

// Input validation schemas for common patterns
export const securitySchemas = {
  // Safe string (no HTML, limited special characters)
  safeString: z.string().regex(/^[a-zA-Z0-9\s\-_.,!?()]+$/, 'Contains invalid characters'),
  
  // Email validation
  email: z.string().email('Invalid email format'),
  
  // URL validation (only HTTPS allowed)
  secureUrl: z.string().url().refine(url => url.startsWith('https://'), 'Only HTTPS URLs allowed'),
  
  // File path validation (no traversal)
  safePath: z.string().regex(/^[a-zA-Z0-9\-_/\.]+$/, 'Invalid file path').refine(
    path => !path.includes('..'), 'Path traversal not allowed'
  ),
  
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Positive integer
  positiveInt: z.number().int().positive('Must be a positive integer'),
  
  // Limited text content (for descriptions, etc.)
  limitedText: z.string().max(10000, 'Text too long').min(1, 'Text required'),
};

export default comprehensiveSecurityMiddleware;