import { createHash } from 'crypto';
import { logger } from '../config/logger';
import type { LCAInputs, LCACalculationResult, CalculationOptions } from './LCACalculationCore';

/**
 * LCA Cache Service - Implements keyed caching for LCA results
 * Caches based on inputs hash and emission factor versions
 */
export class LCACacheService {
  private static instance: LCACacheService;
  
  // In-memory cache with TTL (would use Redis in production)
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly maxCacheSize = 1000; // Maximum number of cached entries
  
  // Cleanup interval
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // Clean up every hour

    logger.info({}, 'LCACacheService initialized');
  }

  static getInstance(): LCACacheService {
    if (!LCACacheService.instance) {
      LCACacheService.instance = new LCACacheService();
    }
    return LCACacheService.instance;
  }

  /**
   * Get cached LCA result if available and valid
   */
  async get(
    inputs: LCAInputs, 
    options: CalculationOptions, 
    factorVersion: string = 'DEFRA_2024'
  ): Promise<LCACalculationResult | null> {
    const cacheKey = this.generateCacheKey(inputs, options, factorVersion);
    
    const entry = this.cache.get(cacheKey);
    if (!entry) {
      logger.debug({ cacheKey }, 'Cache miss');
      return null;
    }

    // Check if entry is expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      logger.debug({ cacheKey }, 'Cache entry expired');
      return null;
    }

    // Update access time
    entry.lastAccessed = Date.now();
    entry.accessCount++;

    logger.debug({ 
      cacheKey, 
      age: Date.now() - entry.createdAt,
      accessCount: entry.accessCount 
    }, 'Cache hit');

    return entry.result;
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
    const cacheKey = this.generateCacheKey(inputs, options, factorVersion);
    const expiresAt = Date.now() + (ttl || this.defaultTTL);

    // Enforce cache size limit
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry = {
      result,
      createdAt: Date.now(),
      expiresAt,
      lastAccessed: Date.now(),
      accessCount: 1,
      inputs: this.sanitizeInputsForStorage(inputs),
      options,
      factorVersion,
      size: this.estimateSize(result)
    };

    this.cache.set(cacheKey, entry);

    logger.debug({ 
      cacheKey, 
      ttl: ttl || this.defaultTTL,
      cacheSize: this.cache.size,
      entrySize: entry.size
    }, 'LCA result cached');
  }

  /**
   * Check if result exists in cache without retrieving it
   */
  has(
    inputs: LCAInputs, 
    options: CalculationOptions, 
    factorVersion: string = 'DEFRA_2024'
  ): boolean {
    const cacheKey = this.generateCacheKey(inputs, options, factorVersion);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return false;
    }
    
    return true;
  }

  /**
   * Invalidate cache entries for specific factor version
   */
  invalidateByFactorVersion(factorVersion: string): number {
    let invalidatedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.factorVersion === factorVersion) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    logger.info({ factorVersion, invalidatedCount }, 'Cache invalidated by factor version');
    return invalidatedCount;
  }

  /**
   * Invalidate all cache entries for a specific calculation method
   */
  invalidateByMethod(method: string): number {
    let invalidatedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.options.method === method) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    logger.info({ method, invalidatedCount }, 'Cache invalidated by calculation method');
    return invalidatedCount;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    const previousSize = this.cache.size;
    this.cache.clear();
    logger.info({ previousSize }, 'LCA cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const totalAccesses = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    const expiredEntries = entries.filter(entry => now > entry.expiresAt).length;
    const averageAge = entries.length > 0 
      ? entries.reduce((sum, entry) => sum + (now - entry.createdAt), 0) / entries.length 
      : 0;

    const hitRateData = this.calculateHitRate();

    return {
      totalEntries: this.cache.size,
      totalSize,
      averageSize: entries.length > 0 ? totalSize / entries.length : 0,
      totalAccesses,
      averageAccesses: entries.length > 0 ? totalAccesses / entries.length : 0,
      expiredEntries,
      averageAge,
      hitRate: hitRateData.hitRate,
      missRate: hitRateData.missRate,
      byFactorVersion: this.getStatsByFactorVersion(),
      byMethod: this.getStatsByMethod(),
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Warm cache with common calculation scenarios
   */
  async warmCache(commonScenarios: Array<{
    inputs: LCAInputs;
    options: CalculationOptions;
    factorVersion?: string;
  }>): Promise<void> {
    logger.info({ scenarioCount: commonScenarios.length }, 'Starting cache warm-up');

    for (const scenario of commonScenarios) {
      const cacheKey = this.generateCacheKey(
        scenario.inputs, 
        scenario.options, 
        scenario.factorVersion || 'DEFRA_2024'
      );

      // Only warm if not already cached
      if (!this.cache.has(cacheKey)) {
        // Create a placeholder entry for warming
        const warmEntry: CacheEntry = {
          result: {
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
          },
          createdAt: Date.now(),
          expiresAt: Date.now() + this.defaultTTL,
          lastAccessed: Date.now(),
          accessCount: 0,
          inputs: this.sanitizeInputsForStorage(scenario.inputs),
          options: scenario.options,
          factorVersion: scenario.factorVersion || 'DEFRA_2024',
          size: 1024 // Estimate
        };

        this.cache.set(cacheKey, warmEntry);
      }
    }

    logger.info({ 
      warmedEntries: commonScenarios.length,
      totalEntries: this.cache.size 
    }, 'Cache warm-up completed');
  }

  /**
   * Export cache for persistence (would save to Redis/file in production)
   */
  exportCache(): CacheExport {
    const entries: CacheEntryExport[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        ...entry
      });
    }

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      entries,
      stats: this.getStats()
    };
  }

  /**
   * Import cache from persistence
   */
  importCache(exportData: CacheExport): void {
    this.cache.clear();
    
    for (const entry of exportData.entries) {
      // Only import non-expired entries
      if (Date.now() < entry.expiresAt) {
        this.cache.set(entry.key, {
          result: entry.result,
          createdAt: entry.createdAt,
          expiresAt: entry.expiresAt,
          lastAccessed: entry.lastAccessed,
          accessCount: entry.accessCount,
          inputs: entry.inputs,
          options: entry.options,
          factorVersion: entry.factorVersion,
          size: entry.size
        });
      }
    }

    logger.info({ 
      importedEntries: this.cache.size,
      totalInExport: exportData.entries.length 
    }, 'Cache imported from persistence');
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const before = this.cache.size;
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
    
    const cleaned = before - this.cache.size;
    if (cleaned > 0) {
      logger.debug({ cleaned, remaining: this.cache.size }, 'Cache cleanup completed');
    }
  }

  /**
   * Evict least recently used entries when cache is full
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug({ evictedKey: oldestKey }, 'Evicted least recently used cache entry');
    }
  }

  /**
   * Generate deterministic cache key from inputs and options
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

  /**
   * Normalize inputs for consistent hashing
   */
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

  /**
   * Sanitize inputs for storage (remove sensitive data)
   */
  private sanitizeInputsForStorage(inputs: LCAInputs): any {
    // Remove any sensitive information before caching
    const sanitized = JSON.parse(JSON.stringify(inputs));
    // Add sanitization logic here if needed
    return sanitized;
  }

  /**
   * Estimate memory size of result object
   */
  private estimateSize(result: LCACalculationResult): number {
    return JSON.stringify(result).length * 2; // Rough estimate in bytes
  }

  private hitRequests = 0;
  private missRequests = 0;

  private calculateHitRate(): { hitRate: number; missRate: number } {
    const total = this.hitRequests + this.missRequests;
    if (total === 0) {
      return { hitRate: 0, missRate: 0 };
    }
    
    return {
      hitRate: this.hitRequests / total,
      missRate: this.missRequests / total
    };
  }

  private getStatsByFactorVersion(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const entry of this.cache.values()) {
      stats[entry.factorVersion] = (stats[entry.factorVersion] || 0) + 1;
    }
    
    return stats;
  }

  private getStatsByMethod(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const entry of this.cache.values()) {
      stats[entry.options.method] = (stats[entry.options.method] || 0) + 1;
    }
    
    return stats;
  }

  /**
   * Shutdown cache service
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
    logger.info({}, 'LCACacheService shut down');
  }
}

// Interfaces
interface CacheEntry {
  result: LCACalculationResult;
  createdAt: number;
  expiresAt: number;
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
  expiredEntries: number;
  averageAge: number;
  hitRate: number;
  missRate: number;
  byFactorVersion: Record<string, number>;
  byMethod: Record<string, number>;
  memoryUsage: NodeJS.MemoryUsage;
}

interface CacheEntryExport extends CacheEntry {
  key: string;
}

interface CacheExport {
  version: string;
  exportedAt: string;
  entries: CacheEntryExport[];
  stats: CacheStats;
}

// Export singleton instance
export const lcaCacheService = LCACacheService.getInstance();

export default LCACacheService;