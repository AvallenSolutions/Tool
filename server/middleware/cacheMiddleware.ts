import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import { logger } from '../config/logger';

/**
 * Comprehensive API Response Caching Middleware
 * 
 * Features:
 * - Redis-based response caching with configurable TTL
 * - Memory fallback when Redis unavailable
 * - Smart cache key generation based on route, params, and user context
 * - ETags and cache headers for browser caching
 * - Cache invalidation patterns
 * - Performance metrics
 */

export interface CacheConfig {
  ttl?: number; // TTL in seconds, default 300 (5 minutes)
  keyPattern?: string; // Custom cache key pattern
  varyHeaders?: string[]; // Headers to include in cache key
  skipCache?: (req: Request) => boolean; // Function to determine if cache should be skipped
  invalidatePatterns?: string[]; // Cache patterns to invalidate on data changes
  useETag?: boolean; // Whether to use ETags for conditional requests
}

// Default cache configurations for different endpoint patterns
// SECURITY: All routes now include proper authorization scoping to prevent cross-tenant data exposure
const defaultCacheConfigs: Record<string, CacheConfig> = {
  // CRITICAL FIX: Admin routes now properly scoped by authorization
  '/api/admin/analytics': { ttl: 900, varyHeaders: ['authorization'], useETag: true }, // 15 minutes for analytics
  '/api/admin/lca-jobs': { ttl: 60, varyHeaders: ['authorization'], useETag: true }, // 1 minute for LCA jobs
  '/api/admin/feedback': { ttl: 300, varyHeaders: ['authorization'], useETag: true }, // 5 minutes for feedback
  '/api/admin/supplier': { ttl: 600, varyHeaders: ['authorization'], useETag: true }, // 10 minutes for supplier management
  
  // Company-specific routes with proper scoping
  '/api/time-series/analytics/:companyId': { ttl: 600, varyHeaders: ['authorization'], useETag: true }, // 10 minutes for time series
  '/api/products/:id/lca': { ttl: 3600, varyHeaders: ['authorization'], useETag: true }, // 1 hour for LCA results
  '/api/products': { ttl: 300, varyHeaders: ['authorization'], useETag: true }, // 5 minutes for product lists
  '/api/suppliers': { ttl: 600, varyHeaders: ['authorization'], useETag: true }, // 10 minutes for supplier lists
  '/api/supplier-products': { ttl: 600, varyHeaders: ['authorization'], useETag: true }, // 10 minutes for supplier products
  '/api/dashboard/metrics': { ttl: 300, varyHeaders: ['authorization'], useETag: true }, // 5 minutes for dashboard
  '/api/reports/:id': { ttl: 1800, varyHeaders: ['authorization'], useETag: true }, // 30 minutes for reports
  '/api/reports': { ttl: 300, varyHeaders: ['authorization'], useETag: true }, // 5 minutes for report lists
};

class CacheMiddleware {
  private static instance: CacheMiddleware;
  private redis: Redis | null = null;
  private memoryCache = new Map<string, { data: any; expiresAt: number; etag: string }>();
  private readonly memoryCacheMaxSize = 1000;
  
  // Performance tracking
  private cacheHits = 0;
  private cacheMisses = 0;
  private redisErrors = 0;
  
  // Redis connection retry tracking
  private redisConnectionAttempts = 0;
  private redisLastConnectionAttempt = 0;
  private redisConnectionBackoff = 1000; // Start with 1 second
  private readonly maxRedisBackoff = 60000; // Max 1 minute
  private redisConnectionWarningShown = false;

  constructor() {
    this.initializeRedis();
    this.startMemoryCacheCleanup();
  }

  static getInstance(): CacheMiddleware {
    if (!CacheMiddleware.instance) {
      CacheMiddleware.instance = new CacheMiddleware();
    }
    return CacheMiddleware.instance;
  }

  private async initializeRedis(): Promise<void> {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_CACHE_DB || '2'), // Separate DB for API cache
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 1, // Reduced for faster fallback
        lazyConnect: true,
        connectTimeout: 5000, // 5 second timeout
        retryDelayOnClusterDown: this.redisConnectionBackoff,
      };

      this.redis = new Redis(redisConfig);
      
      this.redis.on('error', (error) => {
        this.redisErrors++;
        // Only log warning once to reduce noise
        if (!this.redisConnectionWarningShown) {
          logger.warn({ error, attempts: this.redisConnectionAttempts }, 'Redis API cache error - falling back to memory cache only');
          this.redisConnectionWarningShown = true;
        }
        this.scheduleRedisReconnect();
      });

      this.redis.on('connect', () => {
        logger.info({ attempts: this.redisConnectionAttempts }, 'Redis API cache connected');
        this.redisConnectionAttempts = 0;
        this.redisConnectionBackoff = 1000;
        this.redisConnectionWarningShown = false;
      });

      this.redis.on('close', () => {
        this.scheduleRedisReconnect();
      });

      await this.redis.ping();
    } catch (error) {
      if (!this.redisConnectionWarningShown) {
        logger.warn({ error, attempts: this.redisConnectionAttempts }, 'Failed to initialize Redis for API cache - using memory cache only');
        this.redisConnectionWarningShown = true;
      }
      this.redis = null;
      this.scheduleRedisReconnect();
    }
  }

  private startMemoryCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [key, entry] of this.memoryCache.entries()) {
        if (now > entry.expiresAt) {
          this.memoryCache.delete(key);
          cleanedCount++;
        }
      }
      
      // Enforce size limit
      if (this.memoryCache.size > this.memoryCacheMaxSize) {
        const entriesToRemove = this.memoryCache.size - this.memoryCacheMaxSize;
        const entries = Array.from(this.memoryCache.entries());
        entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt); // Sort by expiry time
        
        for (let i = 0; i < entriesToRemove; i++) {
          this.memoryCache.delete(entries[i][0]);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.debug({ cleanedEntries: cleanedCount }, 'Memory cache cleanup completed');
      }
    }, 60000); // Every minute
  }

  /**
   * SECURITY FIX: Redis reconnection with exponential backoff
   * Prevents log spam while attempting to reconnect
   */
  private scheduleRedisReconnect(): void {
    const now = Date.now();
    
    // Don't attempt reconnection too frequently
    if (now - this.redisLastConnectionAttempt < this.redisConnectionBackoff) {
      return;
    }
    
    this.redisConnectionAttempts++;
    this.redisLastConnectionAttempt = now;
    
    // Exponential backoff with jitter
    const jitter = Math.random() * 1000;
    const delay = Math.min(this.redisConnectionBackoff + jitter, this.maxRedisBackoff);
    
    setTimeout(async () => {
      if (!this.redis || this.redis.status === 'end' || this.redis.status === 'close') {
        await this.initializeRedis();
      }
    }, delay);
    
    // Double the backoff for next attempt, capped at max
    this.redisConnectionBackoff = Math.min(this.redisConnectionBackoff * 2, this.maxRedisBackoff);
  }

  /**
   * Main cache middleware factory
   */
  public cacheResponse(configOrTtl?: CacheConfig | number) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Determine cache config
      let config: CacheConfig;
      if (typeof configOrTtl === 'number') {
        config = { ttl: configOrTtl };
      } else if (configOrTtl) {
        config = configOrTtl;
      } else {
        // Look for default config based on route pattern
        config = this.findDefaultConfig(req.route?.path || req.path) || { ttl: 300 };
      }

      // Check if caching should be skipped
      if (config.skipCache && config.skipCache(req)) {
        return next();
      }

      const cacheKey = this.generateCacheKey(req, config);
      
      try {
        // Try to get from cache
        const cachedResponse = await this.getCachedResponse(cacheKey);
        
        if (cachedResponse) {
          this.cacheHits++;
          
          // Set cache headers
          res.set({
            'X-Cache': 'HIT',
            'X-Cache-Key': cacheKey,
            'Content-Type': cachedResponse.contentType || 'application/json',
          });

          // Handle ETag if configured
          if (config.useETag && cachedResponse.etag) {
            res.set('ETag', cachedResponse.etag);
            
            // Check if client has current version
            if (req.headers['if-none-match'] === cachedResponse.etag) {
              return res.status(304).end();
            }
          }

          logger.debug({ 
            cacheKey, 
            route: req.path,
            cacheHit: true 
          }, 'API cache hit');

          return res.json(cachedResponse.data);
        }

        this.cacheMisses++;

        // Cache miss - intercept response to cache it
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        res.json = (body: any) => {
          // Only cache successful responses
          if (res.statusCode >= 200 && res.statusCode < 300) {
            this.cacheResponse(cacheKey, body, config, res).catch(error => {
              logger.warn({ error, cacheKey }, 'Failed to cache API response');
            });
          }

          res.set({
            'X-Cache': 'MISS',
            'X-Cache-Key': cacheKey,
          });

          return originalJson(body);
        };

        res.send = (body: any) => {
          // Only cache successful responses
          if (res.statusCode >= 200 && res.statusCode < 300) {
            this.cacheResponse(cacheKey, body, config, res).catch(error => {
              logger.warn({ error, cacheKey }, 'Failed to cache API response');
            });
          }

          res.set({
            'X-Cache': 'MISS',
            'X-Cache-Key': cacheKey,
          });

          return originalSend(body);
        };

        next();

      } catch (error) {
        logger.error({ error, cacheKey }, 'Cache middleware error');
        next();
      }
    };
  }

  private findDefaultConfig(routePath: string): CacheConfig | null {
    // Exact match first
    if (defaultCacheConfigs[routePath]) {
      return defaultCacheConfigs[routePath];
    }

    // Pattern matching for parameterized routes
    for (const [pattern, config] of Object.entries(defaultCacheConfigs)) {
      if (this.matchRoutePattern(pattern, routePath)) {
        return config;
      }
    }

    return null;
  }

  private matchRoutePattern(pattern: string, path: string): boolean {
    // Convert Express route pattern to regex
    const regexPattern = pattern.replace(/:([^/]+)/g, '[^/]+');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  private generateCacheKey(req: Request, config: CacheConfig): string {
    const keyComponents = [
      req.method,
      req.path,
      JSON.stringify(req.query),
    ];

    // SECURITY: Always include tenant isolation for multi-tenant endpoints
    let userContext: any = null;
    
    // Extract user context from various authentication methods
    if (req.session && (req.session as any).user) {
      userContext = (req.session as any).user;
    } else if ((req as any).user) {
      userContext = (req as any).user;
    }
    
    // CRITICAL: Mandatory tenant isolation for protected endpoints
    if (userContext) {
      keyComponents.push(`user:${userContext.id}`);
      keyComponents.push(`company:${userContext.companyId}`);
      
      // Include role for admin-specific caching
      if (userContext.role) {
        keyComponents.push(`role:${userContext.role}`);
      }
    } else if (req.path.startsWith('/api/')) {
      // For API endpoints without user context, include authorization header hash for security
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const authHash = createHash('sha256').update(authHeader).digest('hex').substring(0, 16);
        keyComponents.push(`auth:${authHash}`);
      } else {
        // For unauthenticated API calls, add a marker to prevent cross-contamination
        keyComponents.push('auth:none');
      }
    }

    // Include specified headers in cache key
    if (config.varyHeaders) {
      for (const header of config.varyHeaders) {
        const headerValue = req.headers[header] || '';
        // Hash authorization headers for security
        if (header === 'authorization' && headerValue) {
          const authHash = createHash('sha256').update(headerValue).digest('hex').substring(0, 16);
          keyComponents.push(`${header}:${authHash}`);
        } else {
          keyComponents.push(`${header}:${headerValue}`);
        }
      }
    }

    // Custom key pattern if provided
    if (config.keyPattern) {
      keyComponents.push(config.keyPattern);
    }

    const keyString = keyComponents.join('|');
    return createHash('sha256').update(keyString).digest('hex').substring(0, 32);
  }

  private async getCachedResponse(cacheKey: string): Promise<{
    data: any;
    contentType?: string;
    etag?: string;
  } | null> {
    // Try memory cache first
    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry && Date.now() < memoryEntry.expiresAt) {
      return {
        data: memoryEntry.data,
        etag: memoryEntry.etag,
      };
    }

    // Try Redis cache
    if (this.redis) {
      try {
        const cached = await this.redis.get(`api:cache:${cacheKey}`);
        if (cached) {
          const parsedCache = JSON.parse(cached);
          
          // Store in memory cache for faster access
          this.memoryCache.set(cacheKey, {
            data: parsedCache.data,
            expiresAt: Date.now() + 300000, // 5 minutes in memory
            etag: parsedCache.etag,
          });

          return parsedCache;
        }
      } catch (error) {
        this.redisErrors++;
        logger.warn({ error, cacheKey }, 'Redis cache read error');
      }
    }

    return null;
  }

  private async cacheResponse(
    cacheKey: string,
    data: any,
    config: CacheConfig,
    res: Response
  ): Promise<void> {
    const ttl = config.ttl || 300;
    const etag = config.useETag ? this.generateETag(data) : undefined;
    
    const cacheEntry = {
      data,
      contentType: res.get('Content-Type'),
      etag,
      cachedAt: Date.now(),
    };

    // Store in memory cache
    this.memoryCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + ttl * 1000,
      etag: etag || '',
    });

    // Store in Redis cache
    if (this.redis) {
      try {
        await this.redis.setex(`api:cache:${cacheKey}`, ttl, JSON.stringify(cacheEntry));
      } catch (error) {
        this.redisErrors++;
        logger.warn({ error, cacheKey }, 'Redis cache write error');
      }
    }

    // Set ETag header if configured
    if (etag) {
      res.set('ETag', etag);
    }
  }

  private generateETag(data: any): string {
    const hash = createHash('md5').update(JSON.stringify(data)).digest('hex');
    return `"${hash.substring(0, 16)}"`;
  }

  /**
   * Cache invalidation methods
   */
  public async invalidatePattern(pattern: string): Promise<number> {
    let invalidatedCount = 0;

    // Invalidate memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
        invalidatedCount++;
      }
    }

    // Invalidate Redis cache
    if (this.redis) {
      try {
        const keys = await this.redis.keys(`api:cache:*${pattern}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          invalidatedCount += keys.length;
        }
      } catch (error) {
        logger.error({ error, pattern }, 'Failed to invalidate Redis cache pattern');
      }
    }

    logger.info({ pattern, invalidatedCount }, 'Cache invalidation completed');
    return invalidatedCount;
  }

  public async invalidateByRoute(routePath: string): Promise<number> {
    return this.invalidatePattern(routePath);
  }

  public async invalidateByUser(userId: number): Promise<number> {
    return this.invalidatePattern(`user:${userId}`);
  }

  public async invalidateByCompany(companyId: number): Promise<number> {
    return this.invalidatePattern(`company:${companyId}`);
  }

  public async clearAll(): Promise<void> {
    this.memoryCache.clear();
    
    if (this.redis) {
      try {
        const keys = await this.redis.keys('api:cache:*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        logger.error({ error }, 'Failed to clear Redis cache');
      }
    }

    logger.info({}, 'All API cache cleared');
  }

  /**
   * Cache statistics and monitoring
   */
  public getStats() {
    const hitRate = this.cacheHits + this.cacheMisses > 0 ? 
      this.cacheHits / (this.cacheHits + this.cacheMisses) : 0;

    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100,
      redisErrors: this.redisErrors,
      memoryCacheSize: this.memoryCache.size,
      redisConnected: this.redis !== null && this.redis.status === 'ready',
    };
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{ status: string; redis: boolean; memory: boolean }> {
    const redisHealthy = this.redis !== null && this.redis.status === 'ready';
    const memoryHealthy = this.memoryCache.size < this.memoryCacheMaxSize * 0.9;

    return {
      status: redisHealthy && memoryHealthy ? 'healthy' : 'degraded',
      redis: redisHealthy,
      memory: memoryHealthy,
    };
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
    this.memoryCache.clear();
    logger.info({}, 'Cache middleware shut down gracefully');
  }
}

// Export singleton instance and middleware factory
export const cacheMiddleware = CacheMiddleware.getInstance();

// Convenience exports for specific use cases - Return middleware factory functions
export const cacheLCAResults = () => cacheMiddleware.cacheResponse({ ttl: 3600, useETag: true }); // 1 hour
export const cacheAnalytics = () => cacheMiddleware.cacheResponse({ ttl: 900, useETag: true }); // 15 minutes
export const cacheProductData = () => cacheMiddleware.cacheResponse({ ttl: 600, varyHeaders: ['authorization'], useETag: true }); // 10 minutes
export const cacheSupplierData = () => cacheMiddleware.cacheResponse({ ttl: 600, varyHeaders: ['authorization'], useETag: true }); // 10 minutes
export const cacheDashboard = () => cacheMiddleware.cacheResponse({ ttl: 300, varyHeaders: ['authorization'], useETag: true }); // 5 minutes

export default cacheMiddleware;