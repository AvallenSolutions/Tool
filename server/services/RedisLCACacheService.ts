import { createHash } from 'crypto';
import Redis from 'ioredis';
import { logger } from '../config/logger';
import type { LCAInputs, LCACalculationResult, CalculationOptions } from './LCACalculationCore';

/**
 * Redis-Based LCA Cache Service for Multi-Instance Deployment
 * Replaces in-memory cache with Redis for enterprise scalability
 */
export class RedisLCACacheService {
  private static instance: RedisLCACacheService;
  
  private redis: Redis | null = null;
  private readonly keyPrefix = 'lca:cache:';
  private readonly defaultTTL = 24 * 60 * 60; // 24 hours in seconds
  private readonly maxCacheSize = 10000; // Maximum number of cached entries
  
  // Statistics tracking
  private hitCount = 0;
  private missCount = 0;
  private errorCount = 0;

  constructor() {
    logger.info({}, 'RedisLCACacheService created');
  }

  static getInstance(): RedisLCACacheService {
    if (!RedisLCACacheService.instance) {
      RedisLCACacheService.instance = new RedisLCACacheService();
    }
    return RedisLCACacheService.instance;
  }

  /**
   * Initialize Redis connection
   */
  async initialize(): Promise<void> {
    if (this.redis) {
      return; // Already initialized
    }

    try {
      // Use existing Redis configuration from job queue service
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_LCA_CACHE_DB || '1'), // Separate DB for LCA cache
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      };

      this.redis = new Redis(redisConfig);

      // Event handlers
      this.redis.on('connect', () => {
        logger.info({ db: redisConfig.db }, 'Redis LCA cache connected');
      });

      this.redis.on('error', (error) => {
        logger.error({ error }, 'Redis LCA cache error');
        this.errorCount++;
      });

      this.redis.on('reconnecting', () => {
        logger.info({}, 'Redis LCA cache reconnecting');
      });

      // Test connection
      await this.redis.ping();
      
      logger.info({ 
        host: redisConfig.host, 
        port: redisConfig.port,
        db: redisConfig.db 
      }, 'Redis LCA cache service initialized');

    } catch (error) {
      logger.error({ error }, 'Failed to initialize Redis LCA cache');
      
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Redis LCA cache is required in production');
      } else {
        logger.warn({}, 'Redis LCA cache unavailable, falling back to no caching');
      }
    }
  }

  /**
   * Get cached LCA result if available and valid
   */
  async get(
    inputs: LCAInputs, 
    options: CalculationOptions, 
    factorVersion: string = 'DEFRA_2024'
  ): Promise<LCACalculationResult | null> {
    if (!this.redis) {
      await this.initialize();
      if (!this.redis) {
        return null;
      }
    }

    const cacheKey = this.generateCacheKey(inputs, options, factorVersion);
    const fullKey = `${this.keyPrefix}${cacheKey}`;
    
    try {
      const cached = await this.redis.get(fullKey);
      
      if (!cached) {
        this.missCount++;
        logger.debug({ cacheKey: fullKey }, 'LCA cache miss');
        return null;
      }

      // Parse cached result
      const entry = JSON.parse(cached) as CacheEntry;
      
      // Update access time and count
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      
      // Store updated entry (fire and forget)
      this.redis.setex(fullKey, this.defaultTTL, JSON.stringify(entry)).catch(error => {
        logger.warn({ error, cacheKey: fullKey }, 'Failed to update cache access time');
      });

      this.hitCount++;
      logger.debug({ 
        cacheKey: fullKey,
        age: Date.now() - entry.createdAt,
        accessCount: entry.accessCount
      }, 'LCA cache hit');

      return entry.result;

    } catch (error) {
      this.errorCount++;
      logger.error({ error, cacheKey: fullKey }, 'Failed to get LCA result from cache');
      return null;
    }
  }

  /**
   * Store LCA result in cache
   */
  async set(
    inputs: LCAInputs,
    options: CalculationOptions,
    result: LCACalculationResult,
    factorVersion: string = 'DEFRA_2024',
    ttl?: number
  ): Promise<void> {
    if (!this.redis) {
      await this.initialize();
      if (!this.redis) {
        return;
      }
    }

    const cacheKey = this.generateCacheKey(inputs, options, factorVersion);
    const fullKey = `${this.keyPrefix}${cacheKey}`;
    const cacheTTL = ttl || this.defaultTTL;

    try {
      // Check cache size and enforce limit
      await this.enforceCacheLimit();

      const entry: CacheEntry = {
        result,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 1,
        inputs: this.sanitizeInputsForStorage(inputs),
        options,
        factorVersion,
        size: this.estimateSize(result)
      };

      await this.redis.setex(fullKey, cacheTTL, JSON.stringify(entry));

      // Add to index for management
      await this.addToIndex(cacheKey, factorVersion, options.method);

      logger.debug({ 
        cacheKey: fullKey,
        ttl: cacheTTL,
        entrySize: entry.size,
        factorVersion,
        method: options.method
      }, 'LCA result cached in Redis');

    } catch (error) {
      this.errorCount++;
      logger.error({ error, cacheKey: fullKey }, 'Failed to cache LCA result');
    }
  }

  /**
   * Check if result exists in cache without retrieving it
   */
  async has(
    inputs: LCAInputs, 
    options: CalculationOptions, 
    factorVersion: string = 'DEFRA_2024'
  ): Promise<boolean> {
    if (!this.redis) {
      return false;
    }

    const cacheKey = this.generateCacheKey(inputs, options, factorVersion);
    const fullKey = `${this.keyPrefix}${cacheKey}`;
    
    try {
      const exists = await this.redis.exists(fullKey);
      return exists === 1;
    } catch (error) {
      logger.error({ error, cacheKey: fullKey }, 'Failed to check cache existence');
      return false;
    }
  }

  /**
   * Invalidate cache entries for specific factor version
   */
  async invalidateByFactorVersion(factorVersion: string): Promise<number> {
    if (!this.redis) {
      return 0;
    }

    try {
      const indexKey = `${this.keyPrefix}index:factor:${factorVersion}`;
      const cacheKeys = await this.redis.smembers(indexKey);
      
      if (cacheKeys.length === 0) {
        return 0;
      }

      // Delete cache entries
      const fullKeys = cacheKeys.map(key => `${this.keyPrefix}${key}`);
      const pipeline = this.redis.pipeline();
      
      fullKeys.forEach(key => pipeline.del(key));
      pipeline.del(indexKey); // Remove index
      
      await pipeline.exec();

      logger.info({ 
        factorVersion, 
        invalidatedCount: cacheKeys.length 
      }, 'Cache invalidated by factor version');

      return cacheKeys.length;

    } catch (error) {
      logger.error({ error, factorVersion }, 'Failed to invalidate cache by factor version');
      return 0;
    }
  }

  /**
   * Invalidate all cache entries for a specific calculation method
   */
  async invalidateByMethod(method: string): Promise<number> {
    if (!this.redis) {
      return 0;
    }

    try {
      const indexKey = `${this.keyPrefix}index:method:${method}`;
      const cacheKeys = await this.redis.smembers(indexKey);
      
      if (cacheKeys.length === 0) {
        return 0;
      }

      // Delete cache entries
      const fullKeys = cacheKeys.map(key => `${this.keyPrefix}${key}`);
      const pipeline = this.redis.pipeline();
      
      fullKeys.forEach(key => pipeline.del(key));
      pipeline.del(indexKey); // Remove index
      
      await pipeline.exec();

      logger.info({ 
        method, 
        invalidatedCount: cacheKeys.length 
      }, 'Cache invalidated by method');

      return cacheKeys.length;

    } catch (error) {
      logger.error({ error, method }, 'Failed to invalidate cache by method');
      return 0;
    }
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      logger.info({ clearedKeys: keys.length }, 'LCA cache cleared');

    } catch (error) {
      logger.error({ error }, 'Failed to clear LCA cache');
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    if (!this.redis) {
      return this.getEmptyStats();
    }

    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      // Filter out index keys
      const dataKeys = keys.filter(key => !key.includes(':index:'));
      
      let totalSize = 0;
      let totalAccesses = 0;
      let totalAge = 0;
      const byFactorVersion: Record<string, number> = {};
      const byMethod: Record<string, number> = {};
      
      // Sample some entries for statistics (to avoid loading all data)
      const sampleSize = Math.min(100, dataKeys.length);
      const sampleKeys = dataKeys.slice(0, sampleSize);
      
      if (sampleKeys.length > 0) {
        const sampleData = await this.redis.mget(...sampleKeys);
        
        for (const data of sampleData) {
          if (data) {
            try {
              const entry = JSON.parse(data) as CacheEntry;
              totalSize += entry.size;
              totalAccesses += entry.accessCount;
              totalAge += Date.now() - entry.createdAt;
              
              byFactorVersion[entry.factorVersion] = (byFactorVersion[entry.factorVersion] || 0) + 1;
              byMethod[entry.options.method] = (byMethod[entry.options.method] || 0) + 1;
            } catch (parseError) {
              // Skip malformed entries
            }
          }
        }
      }

      const averageSize = sampleSize > 0 ? totalSize / sampleSize : 0;
      const averageAccesses = sampleSize > 0 ? totalAccesses / sampleSize : 0;
      const averageAge = sampleSize > 0 ? totalAge / sampleSize : 0;

      const hitRate = this.hitCount + this.missCount > 0 ? 
        this.hitCount / (this.hitCount + this.missCount) : 0;

      return {
        totalEntries: dataKeys.length,
        totalSize: totalSize * (dataKeys.length / sampleSize), // Extrapolate
        averageSize,
        totalAccesses: totalAccesses * (dataKeys.length / sampleSize),
        averageAccesses,
        averageAge,
        hitRate,
        missRate: 1 - hitRate,
        hitCount: this.hitCount,
        missCount: this.missCount,
        errorCount: this.errorCount,
        byFactorVersion,
        byMethod,
        memoryUsage: process.memoryUsage(),
        redisConnected: this.redis !== null,
      };

    } catch (error) {
      logger.error({ error }, 'Failed to get cache statistics');
      return this.getEmptyStats();
    }
  }

  /**
   * Warm cache with common calculation scenarios
   */
  async warmCache(commonScenarios: Array<{
    inputs: LCAInputs;
    options: CalculationOptions;
    factorVersion?: string;
  }>): Promise<void> {
    if (!this.redis) {
      logger.warn({}, 'Cannot warm cache: Redis not available');
      return;
    }

    logger.info({ scenarioCount: commonScenarios.length }, 'Starting Redis cache warm-up');

    let warmedCount = 0;
    
    for (const scenario of commonScenarios) {
      const exists = await this.has(
        scenario.inputs, 
        scenario.options, 
        scenario.factorVersion || 'DEFRA_2024'
      );

      if (!exists) {
        // Create a placeholder entry for warming
        const placeholderResult: LCACalculationResult = {
          totalCarbonFootprint: 0,
          totalWaterFootprint: 0,
          breakdown: {
            agriculture: 0,
            inboundTransport: 0,
            processing: 0,
            packaging: 0,
            distribution: 0,
            endOfLife: 0
          },
          impactsByCategory: [],
          water_footprint: { total_liters: 0, agricultural_water: 0, processing_water: 0 },
          waste_output: { total_kg: 0, recyclable_kg: 0, hazardous_kg: 0 },
          metadata: {
            calculationMethod: scenario.options.method,
            calculationDate: new Date(),
            dataQuality: 'high',
            factorVersion: scenario.factorVersion || 'DEFRA_2024'
          }
        };

        await this.set(
          scenario.inputs,
          scenario.options,
          placeholderResult,
          scenario.factorVersion || 'DEFRA_2024'
        );

        warmedCount++;
      }
    }

    logger.info({ 
      warmedEntries: warmedCount,
      totalScenarios: commonScenarios.length 
    }, 'Redis cache warm-up completed');
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.redis !== null && this.redis.status === 'ready';
  }

  /**
   * Shutdown Redis connection
   */
  async shutdown(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
        this.redis = null;
        logger.info({}, 'Redis LCA cache connection closed');
      } catch (error) {
        logger.error({ error }, 'Error closing Redis LCA cache connection');
      }
    }
  }

  /**
   * Private helper methods
   */
  private generateCacheKey(
    inputs: LCAInputs, 
    options: CalculationOptions, 
    factorVersion: string
  ): string {
    // Create normalized representation
    const normalized = {
      inputs: this.normalizeInputs(inputs),
      options: {
        method: options.method,
        includeUncertainty: options.includeUncertainty || false,
        allocationMethod: options.allocationMethod || 'mass'
      },
      factorVersion
    };
    
    // Generate hash
    const hash = createHash('sha256');
    hash.update(JSON.stringify(normalized));
    return hash.digest('hex');
  }

  private normalizeInputs(inputs: LCAInputs): any {
    // Deep clone and sort object keys for consistent hashing
    const normalized = JSON.parse(JSON.stringify(inputs));
    return this.sortObjectKeys(normalized);
  }

  private sortObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }
    
    const sorted: any = {};
    const keys = Object.keys(obj).sort();
    
    for (const key of keys) {
      sorted[key] = this.sortObjectKeys(obj[key]);
    }
    
    return sorted;
  }

  private sanitizeInputsForStorage(inputs: LCAInputs): any {
    // Remove any sensitive information before caching
    const sanitized = JSON.parse(JSON.stringify(inputs));
    // Add sanitization logic here if needed
    return sanitized;
  }

  private estimateSize(result: LCACalculationResult): number {
    return JSON.stringify(result).length * 2; // Rough estimate in bytes
  }

  private async addToIndex(cacheKey: string, factorVersion: string, method: string): Promise<void> {
    try {
      const pipeline = this.redis!.pipeline();
      
      // Add to factor version index
      pipeline.sadd(`${this.keyPrefix}index:factor:${factorVersion}`, cacheKey);
      
      // Add to method index
      pipeline.sadd(`${this.keyPrefix}index:method:${method}`, cacheKey);
      
      await pipeline.exec();
    } catch (error) {
      logger.warn({ error, cacheKey }, 'Failed to update cache indexes');
    }
  }

  private async enforceCacheLimit(): Promise<void> {
    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis!.keys(pattern);
      const dataKeys = keys.filter(key => !key.includes(':index:'));
      
      if (dataKeys.length >= this.maxCacheSize) {
        // Remove oldest 10% of entries
        const removeCount = Math.floor(this.maxCacheSize * 0.1);
        const pipeline = this.redis!.pipeline();
        
        for (let i = 0; i < removeCount && i < dataKeys.length; i++) {
          pipeline.del(dataKeys[i]);
        }
        
        await pipeline.exec();
        
        logger.info({ 
          removedEntries: removeCount,
          totalEntries: dataKeys.length 
        }, 'Cache size limit enforced');
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to enforce cache size limit');
    }
  }

  private getEmptyStats(): CacheStats {
    return {
      totalEntries: 0,
      totalSize: 0,
      averageSize: 0,
      totalAccesses: 0,
      averageAccesses: 0,
      averageAge: 0,
      hitRate: 0,
      missRate: 0,
      hitCount: this.hitCount,
      missCount: this.missCount,
      errorCount: this.errorCount,
      byFactorVersion: {},
      byMethod: {},
      memoryUsage: process.memoryUsage(),
      redisConnected: false,
    };
  }
}

// Interfaces
interface CacheEntry {
  result: LCACalculationResult;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  inputs: any;
  options: CalculationOptions;
  factorVersion: string;
  size: number;
}

interface CacheStats {
  totalEntries: number;
  totalSize: number;
  averageSize: number;
  totalAccesses: number;
  averageAccesses: number;
  averageAge: number;
  hitRate: number;
  missRate: number;
  hitCount: number;
  missCount: number;
  errorCount: number;
  byFactorVersion: Record<string, number>;
  byMethod: Record<string, number>;
  memoryUsage: NodeJS.MemoryUsage;
  redisConnected: boolean;
}

// Export singleton instance
export const redisLCACacheService = RedisLCACacheService.getInstance();

export default RedisLCACacheService;