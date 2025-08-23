import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { recordSecurityEvent } from '../monitoring/metrics';

/**
 * Enhanced Security Middleware for Enterprise Deployment
 * Implements production-grade security headers, rate limiting, and threat protection
 */

/**
 * Helmet Configuration for Security Headers
 */
export const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'nonce-pdf-generation'", // For PDF generation scripts
        "https://js.stripe.com", // Stripe integration
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for PDF styling
        "https://fonts.googleapis.com",
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "data:",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:", // For PDF image generation
      ],
      connectSrc: [
        "'self'",
        "https://api.stripe.com",
        process.env.NODE_ENV === 'development' ? 'ws://localhost:*' : '', // Vite HMR in dev
      ].filter(Boolean),
      objectSrc: ["'none'"],
      baseSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // X-Frame-Options
  frameguard: {
    action: 'deny',
  },

  // X-Content-Type-Options
  noSniff: true,

  // Referrer Policy
  referrerPolicy: {
    policy: ['strict-origin-when-cross-origin'],
  },

  // X-Download-Options
  ieNoOpen: true,

  // X-DNS-Prefetch-Control
  dnsPrefetchControl: {
    allow: false,
  },

  // X-Permitted-Cross-Domain-Policies
  permittedCrossDomainPolicies: false,

  // Hide X-Powered-By header
  hidePoweredBy: true,
});

/**
 * Rate Limiting Configuration
 */

// General API rate limiting
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    const user = (req as any).user;
    return user?.id || req.ip || 'unknown';
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path.includes('/healthz') || req.path.includes('/readyz');
  },
  onLimitReached: (req, res, options) => {
    const clientKey = (req as any).user?.id || req.ip || 'unknown';
    
    logger.warn({
      clientKey,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      limit: options.max,
      windowMs: options.windowMs,
    }, 'General rate limit exceeded');

    recordSecurityEvent('rate_limit_violation', 'general', req.ip || 'unknown', (req as any).user?.id);
  },
});

// Heavy operations rate limiting (PDF generation, LCA calculations)
export const heavyOperationsRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each user to 50 heavy operations per hour
  message: {
    error: 'Heavy operations rate limit exceeded',
    message: 'You have exceeded the limit for resource-intensive operations. Please try again later.',
    retryAfter: '1 hour',
  },
  keyGenerator: (req) => {
    const user = (req as any).user;
    return user?.id || req.ip || 'unknown';
  },
  onLimitReached: (req, res, options) => {
    const clientKey = (req as any).user?.id || req.ip || 'unknown';
    
    logger.warn({
      clientKey,
      ip: req.ip,
      path: req.path,
      operation: 'heavy',
    }, 'Heavy operations rate limit exceeded');

    recordSecurityEvent('rate_limit_violation', 'heavy_operations', req.ip || 'unknown', (req as any).user?.id);
  },
});

// Admin operations rate limiting
export const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Lower limit for admin operations
  message: {
    error: 'Admin rate limit exceeded',
    message: 'Too many admin operations. Please try again later.',
    retryAfter: '15 minutes',
  },
  keyGenerator: (req) => {
    const user = (req as any).user;
    return `admin_${user?.id || req.ip || 'unknown'}`;
  },
  onLimitReached: (req, res, options) => {
    logger.warn({
      userId: (req as any).user?.id,
      ip: req.ip,
      path: req.path,
      operation: 'admin',
    }, 'Admin rate limit exceeded');

    recordSecurityEvent('rate_limit_violation', 'admin', req.ip || 'unknown', (req as any).user?.id);
  },
});

// Upload rate limiting
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: {
    error: 'Upload rate limit exceeded',
    message: 'Too many file uploads. Please try again later.',
    retryAfter: '1 hour',
  },
  keyGenerator: (req) => {
    const user = (req as any).user;
    return `upload_${user?.id || req.ip || 'unknown'}`;
  },
});

/**
 * Slow Down Middleware - Gradually increases response time
 */
export const progressiveSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 500, // Allow 500 requests per windowMs without delay
  delayMs: 100, // Add 100ms delay per request after delayAfter
  maxDelayMs: 5000, // Maximum delay of 5 seconds
  skipFailedRequests: true,
  keyGenerator: (req) => {
    const user = (req as any).user;
    return user?.id || req.ip || 'unknown';
  },
  onLimitReached: (req, res, options) => {
    logger.info({
      clientKey: (req as any).user?.id || req.ip,
      path: req.path,
      delay: options.delayMs,
    }, 'Progressive slow down activated');
  },
});

/**
 * IP Filtering Middleware
 */
export function ipFilteringMiddleware(
  allowedIPs: string[] = [],
  blockedIPs: string[] = []
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    // Check if IP is blocked
    if (blockedIPs.includes(clientIP)) {
      logger.warn({
        ip: clientIP,
        path: req.path,
        userAgent: req.get('User-Agent'),
      }, 'Blocked IP address attempted access');

      recordSecurityEvent('blocked_ip_access', 'high', clientIP);

      return res.status(403).json({
        error: 'Access forbidden',
        message: 'Your IP address is blocked',
      });
    }

    // If allowlist is configured, check if IP is allowed
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      logger.warn({
        ip: clientIP,
        path: req.path,
        allowedIPs: allowedIPs.length,
      }, 'Non-whitelisted IP attempted access');

      recordSecurityEvent('non_whitelisted_access', 'medium', clientIP);

      return res.status(403).json({
        error: 'Access forbidden',
        message: 'Your IP address is not whitelisted',
      });
    }

    next();
  };
}

/**
 * Geographic IP Filtering (basic implementation)
 */
export function geoFilteringMiddleware(
  allowedCountries: string[] = [],
  blockedCountries: string[] = []
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // In production, this would integrate with a geo-IP service
    // For now, we'll implement basic logic
    
    const countryHeader = req.get('CF-IPCountry') || req.get('X-Country-Code');
    
    if (countryHeader) {
      if (blockedCountries.includes(countryHeader)) {
        logger.warn({
          country: countryHeader,
          ip: req.ip,
          path: req.path,
        }, 'Request from blocked country');

        recordSecurityEvent('blocked_country_access', 'medium', req.ip || 'unknown');

        return res.status(403).json({
          error: 'Access forbidden',
          message: 'Access from your country is restricted',
        });
      }

      if (allowedCountries.length > 0 && !allowedCountries.includes(countryHeader)) {
        logger.warn({
          country: countryHeader,
          ip: req.ip,
          path: req.path,
        }, 'Request from non-whitelisted country');

        return res.status(403).json({
          error: 'Access forbidden',
          message: 'Access from your country is not permitted',
        });
      }
    }

    next();
  };
}

/**
 * Request Size Limiting Middleware
 */
export function requestSizeLimiter(maxSize: number = 50 * 1024 * 1024) { // 50MB default
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');

    if (contentLength > maxSize) {
      logger.warn({
        contentLength,
        maxSize,
        ip: req.ip,
        path: req.path,
        userId: (req as any).user?.id,
      }, 'Request size limit exceeded');

      recordSecurityEvent('request_size_violation', 'medium', req.ip || 'unknown', (req as any).user?.id);

      return res.status(413).json({
        error: 'Request too large',
        message: `Request size ${contentLength} bytes exceeds maximum allowed size ${maxSize} bytes`,
        maxSize,
      });
    }

    next();
  };
}

/**
 * User Agent Validation Middleware
 */
export function userAgentValidationMiddleware() {
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /scanner/i,
  ];

  const allowedBots = [
    /googlebot/i,
    /bingbot/i,
    /slackbot/i,
    /twitterbot/i,
  ];

  return (req: Request, res: Response, next: NextFunction) => {
    const userAgent = req.get('User-Agent') || '';

    // Allow legitimate bots
    if (allowedBots.some(pattern => pattern.test(userAgent))) {
      return next();
    }

    // Check for suspicious patterns
    if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
      logger.warn({
        userAgent,
        ip: req.ip,
        path: req.path,
      }, 'Suspicious user agent detected');

      recordSecurityEvent('suspicious_user_agent', 'low', req.ip || 'unknown');

      // Don't block, but log and monitor
      // In production, you might want to apply stricter rate limits
    }

    // Check for missing user agent (potential bot)
    if (!userAgent) {
      logger.warn({
        ip: req.ip,
        path: req.path,
      }, 'Request with missing user agent');

      recordSecurityEvent('missing_user_agent', 'low', req.ip || 'unknown');
    }

    next();
  };
}

/**
 * CORS Configuration for API endpoints
 */
export function configureCORS() {
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    process.env.ADMIN_URL || 'http://localhost:3001',
    // Add your production domains
  ].filter(Boolean);

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.get('Origin');

    // For same-origin requests (no Origin header), allow
    if (!origin) {
      return next();
    }

    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID, X-Correlation-ID');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    } else {
      logger.warn({
        origin,
        ip: req.ip,
        path: req.path,
        allowedOrigins: allowedOrigins.length,
      }, 'CORS violation: Origin not allowed');

      recordSecurityEvent('cors_violation', 'medium', req.ip || 'unknown');
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    next();
  };
}

/**
 * Security Event Logging Middleware
 */
export function securityEventLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Log sensitive operations
    const sensitiveOperations = [
      '/admin/',
      '/api/auth/',
      '/api/users/',
      '/api/companies/',
      '/api/jobs/',
    ];

    const isSensitive = sensitiveOperations.some(path => req.path.includes(path));

    if (isSensitive) {
      logger.info({
        securityEvent: true,
        operation: 'sensitive_endpoint_access',
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: (req as any).user?.id,
        sessionId: (req as any).sessionID,
        timestamp: new Date().toISOString(),
      }, 'Sensitive endpoint accessed');
    }

    next();
  };
}

/**
 * Complete Enterprise Security Middleware Stack
 */
export function enterpriseSecurityMiddleware() {
  return [
    helmetConfig,
    configureCORS(),
    progressiveSlowDown,
    generalRateLimit,
    requestSizeLimiter(),
    userAgentValidationMiddleware(),
    securityEventLoggingMiddleware(),
  ];
}

export default {
  helmetConfig,
  generalRateLimit,
  heavyOperationsRateLimit,
  adminRateLimit,
  uploadRateLimit,
  progressiveSlowDown,
  ipFilteringMiddleware,
  geoFilteringMiddleware,
  requestSizeLimiter,
  userAgentValidationMiddleware,
  configureCORS,
  securityEventLoggingMiddleware,
  enterpriseSecurityMiddleware,
};