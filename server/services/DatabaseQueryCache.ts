import { createHash } from 'crypto';
import Redis from 'ioredis';
import { logger } from '../config/logger';
import { db } from '../db';
import { eq, desc, and, gte, count, sql } from 'drizzle-orm';
import { products, companies, verifiedSuppliers, supplierProducts, reports, users, companyData, companyFootprintData, kpis } from '@shared/schema';

/**
 * Database Query Cache Service
 * 
 * Provides intelligent caching for expensive database queries, especially:
 * - Dashboard analytics with complex aggregations
 * - Frequently accessed product/supplier lookups
 * - Time series data for charts and trends
 * - KPI calculations and reporting metrics
 * 
 * Features:
 * - Redis-based caching with memory fallback
 * - Intelligent cache key generation based on query parameters
 * - TTL optimization based on data volatility
 * - Query result compression for large datasets
 * - Automatic cache invalidation hooks
 */

interface CacheConfig {
  ttl: number; // TTL in seconds
  compress?: boolean; // Whether to compress large results
  keyPrefix?: string; // Custom key prefix
}

interface QueryCacheEntry {
  data: any;
  cachedAt: number;
  queryHash: string;
  rowCount?: number;
  compressed?: boolean;
}

export class DatabaseQueryCache {
  private static instance: DatabaseQueryCache;
  private redis: Redis | null = null;
  private memoryCache = new Map<string, { data: any; expiresAt: number }>();
  private readonly memoryCacheMaxSize = 500;
  
  // Cache configurations for different query types
  private readonly cacheConfigs: Record<string, CacheConfig> = {
    'dashboard_metrics': { ttl: 300, compress: false }, // 5 minutes
    'company_analytics': { ttl: 900, compress: true }, // 15 minutes
    'product_list': { ttl: 600, compress: false }, // 10 minutes
    'supplier_list': { ttl: 600, compress: false }, // 10 minutes
    'time_series': { ttl: 1800, compress: true }, // 30 minutes
    'report_data': { ttl: 3600, compress: true }, // 1 hour
    'kpi_calculations': { ttl: 900, compress: false }, // 15 minutes
    'admin_analytics': { ttl: 300, compress: true }, // 5 minutes
    'user_session_data': { ttl: 1800, compress: false }, // 30 minutes
  };

  // Performance tracking
  private cacheHits = 0;
  private cacheMisses = 0;
  private queryTimeSaved = 0; // Total milliseconds saved

  constructor() {
    this.initializeRedis();
    this.startMemoryCacheCleanup();
  }

  static getInstance(): DatabaseQueryCache {
    if (!DatabaseQueryCache.instance) {
      DatabaseQueryCache.instance = new DatabaseQueryCache();
    }
    return DatabaseQueryCache.instance;
  }

  private async initializeRedis(): Promise<void> {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_QUERY_CACHE_DB || '3'), // Separate DB for query cache
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      };

      this.redis = new Redis(redisConfig);
      
      this.redis.on('error', (error) => {
        logger.warn({ error }, 'Redis query cache error - using memory cache only');
      });

      this.redis.on('connect', () => {
        logger.info({}, 'Redis query cache connected');
      });

      await this.redis.ping();
    } catch (error) {
      logger.warn({ error }, 'Failed to initialize Redis for query cache - using memory cache only');
      this.redis = null;
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
        entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
        
        for (let i = 0; i < entriesToRemove; i++) {
          this.memoryCache.delete(entries[i][0]);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.debug({ cleanedEntries: cleanedCount }, 'Query cache memory cleanup');
      }
    }, 60000); // Every minute
  }

  /**
   * Generic cached query execution
   */
  private async executeCachedQuery<T>(
    queryType: string,
    queryFn: () => Promise<T>,
    queryParams: any = {},
    customConfig?: Partial<CacheConfig>
  ): Promise<T> {
    const startTime = Date.now();
    const config = { ...this.cacheConfigs[queryType], ...customConfig };
    const cacheKey = this.generateCacheKey(queryType, queryParams);

    // Try cache first
    const cachedResult = await this.getCachedResult<T>(cacheKey);
    if (cachedResult) {
      this.cacheHits++;
      this.queryTimeSaved += Date.now() - startTime;
      
      logger.debug({ 
        queryType, 
        cacheKey: cacheKey.substring(0, 16) + '...', 
        cacheHit: true 
      }, 'Query cache hit');
      
      return cachedResult;
    }

    // Cache miss - execute query
    this.cacheMisses++;
    
    try {
      const result = await queryFn();
      const queryDuration = Date.now() - startTime;
      
      // Cache the result
      await this.cacheResult(cacheKey, result, config, queryDuration);
      
      logger.debug({ 
        queryType, 
        cacheKey: cacheKey.substring(0, 16) + '...', 
        cacheHit: false,
        queryDuration
      }, 'Query executed and cached');
      
      return result;
      
    } catch (error) {
      logger.error({ error, queryType }, 'Database query failed');
      throw error;
    }
  }

  /**
   * DASHBOARD ANALYTICS QUERIES
   */
  async getDashboardMetrics(companyId: number): Promise<any> {
    return this.executeCachedQuery(
      'dashboard_metrics',
      async () => {
        const [
          totalProducts,
          totalSuppliers,
          recentReports,
          companyInfo
        ] = await Promise.all([
          // Product count
          db.select({ count: count() })
            .from(products)
            .where(eq(products.companyId, companyId)),
            
          // Supplier count  
          db.select({ count: count() })
            .from(verifiedSuppliers)
            .where(eq(verifiedSuppliers.companyId, companyId)),
            
          // Recent reports count
          db.select({ count: count() })
            .from(reports)
            .where(and(
              eq(reports.companyId, companyId),
              gte(reports.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
            )),
            
          // Company basic info
          db.select()
            .from(companies)
            .where(eq(companies.id, companyId))
            .limit(1)
        ]);

        // Calculate additional metrics
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentProducts = await db.select({ count: count() })
          .from(products)
          .where(and(
            eq(products.companyId, companyId),
            gte(products.createdAt, thirtyDaysAgo)
          ));

        return {
          totalProducts: totalProducts[0]?.count || 0,
          totalSuppliers: totalSuppliers[0]?.count || 0,
          recentReports: recentReports[0]?.count || 0,
          recentProducts: recentProducts[0]?.count || 0,
          company: companyInfo[0] || null,
          lastUpdated: new Date().toISOString()
        };
      },
      { companyId }
    );
  }

  async getCompanyAnalytics(companyId: number, monthsBack: number = 12): Promise<any> {
    return this.executeCachedQuery(
      'company_analytics',
      async () => {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - monthsBack);

        // Complex aggregated query for company analytics
        const analyticsData = await db
          .select({
            totalEmissions: sql<number>`COALESCE(SUM(CAST(${companyFootprintData.totalCarbonFootprint} AS DECIMAL)), 0)`,
            totalWaterFootprint: sql<number>`COALESCE(SUM(CAST(${companyFootprintData.totalWaterFootprint} AS DECIMAL)), 0)`,
            averageScore: sql<number>`COALESCE(AVG(CAST(${products.sustainabilityScore} AS DECIMAL)), 0)`,
            reportCount: count(reports.id)
          })
          .from(companyFootprintData)
          .leftJoin(products, eq(products.companyId, companyFootprintData.companyId))
          .leftJoin(reports, eq(reports.companyId, companyFootprintData.companyId))
          .where(and(
            eq(companyFootprintData.companyId, companyId),
            gte(companyFootprintData.createdAt, startDate)
          ));

        // Top products by emissions
        const topProducts = await db
          .select({
            id: products.id,
            name: products.name,
            carbonFootprint: sql<number>`CAST(${products.totalCarbonFootprint} AS DECIMAL)`,
            waterFootprint: sql<number>`CAST(${products.totalWaterFootprint} AS DECIMAL)`,
          })
          .from(products)
          .where(eq(products.companyId, companyId))
          .orderBy(desc(sql`CAST(${products.totalCarbonFootprint} AS DECIMAL)`))
          .limit(10);

        // Monthly trends
        const monthlyTrends = await db
          .select({
            month: sql<string>`DATE_TRUNC('month', ${companyFootprintData.createdAt})`,
            emissions: sql<number>`SUM(CAST(${companyFootprintData.totalCarbonFootprint} AS DECIMAL))`,
            water: sql<number>`SUM(CAST(${companyFootprintData.totalWaterFootprint} AS DECIMAL))`
          })
          .from(companyFootprintData)
          .where(and(
            eq(companyFootprintData.companyId, companyId),
            gte(companyFootprintData.createdAt, startDate)
          ))
          .groupBy(sql`DATE_TRUNC('month', ${companyFootprintData.createdAt})`)
          .orderBy(sql`DATE_TRUNC('month', ${companyFootprintData.createdAt})`);

        return {
          summary: analyticsData[0] || {
            totalEmissions: 0,
            totalWaterFootprint: 0, 
            averageScore: 0,
            reportCount: 0
          },
          topProducts,
          monthlyTrends,
          calculatedAt: new Date().toISOString()
        };
      },
      { companyId, monthsBack },
      { ttl: 1800 } // 30 minutes for heavy analytics
    );
  }

  /**
   * PRODUCT AND SUPPLIER LOOKUPS
   */
  async getProductsByCompany(companyId: number, limit: number = 100): Promise<any[]> {
    return this.executeCachedQuery(
      'product_list',
      async () => {
        return await db
          .select()
          .from(products)
          .where(eq(products.companyId, companyId))
          .orderBy(desc(products.createdAt))
          .limit(limit);
      },
      { companyId, limit }
    );
  }

  async getSuppliersByCompany(companyId: number, limit: number = 100): Promise<any[]> {
    return this.executeCachedQuery(
      'supplier_list', 
      async () => {
        return await db
          .select()
          .from(verifiedSuppliers)
          .where(eq(verifiedSuppliers.companyId, companyId))
          .orderBy(desc(verifiedSuppliers.createdAt))
          .limit(limit);
      },
      { companyId, limit }
    );
  }

  /**
   * KPI CALCULATIONS
   */
  async getKPIMetrics(companyId: number): Promise<any> {
    return this.executeCachedQuery(
      'kpi_calculations',
      async () => {
        // Complex KPI calculations
        const kpiResults = await db
          .select({
            id: kpis.id,
            name: kpis.name,
            currentValue: kpis.currentValue,
            targetValue: kpis.targetValue,
            progress: sql<number>`
              CASE 
                WHEN ${kpis.targetValue} > 0 THEN 
                  (CAST(${kpis.currentValue} AS DECIMAL) / CAST(${kpis.targetValue} AS DECIMAL)) * 100
                ELSE 0 
              END
            `,
            lastUpdated: kpis.updatedAt
          })
          .from(kpis)
          .where(eq(kpis.companyId, companyId))
          .orderBy(desc(kpis.updatedAt));

        // Calculate summary statistics
        const totalKPIs = kpiResults.length;
        const onTrackKPIs = kpiResults.filter(kpi => Number(kpi.progress) >= 80).length;
        const averageProgress = totalKPIs > 0 
          ? kpiResults.reduce((sum, kpi) => sum + Number(kpi.progress), 0) / totalKPIs
          : 0;

        return {
          kpis: kpiResults,
          summary: {
            totalKPIs,
            onTrackKPIs,
            averageProgress: Math.round(averageProgress * 100) / 100,
            completionRate: totalKPIs > 0 ? Math.round((onTrackKPIs / totalKPIs) * 100) : 0
          },
          calculatedAt: new Date().toISOString()
        };
      },
      { companyId }
    );
  }

  /**
   * ADMIN ANALYTICS
   */
  async getAdminAnalytics(): Promise<any> {
    return this.executeCachedQuery(
      'admin_analytics',
      async () => {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        const [
          totalUsers,
          activeUsers,
          totalCompanies,
          totalProducts,
          totalSuppliers,
          recentActivity
        ] = await Promise.all([
          db.select({ count: count() }).from(users),
          db.select({ count: count() }).from(users).where(gte(users.lastLoginAt, thirtyDaysAgo)),
          db.select({ count: count() }).from(companies),
          db.select({ count: count() }).from(products),
          db.select({ count: count() }).from(verifiedSuppliers),
          
          // Recent activity summary
          db.select({
            newUsers: sql<number>`COUNT(CASE WHEN ${users.createdAt} >= ${sql.raw(`'${thirtyDaysAgo.toISOString()}'`)} THEN 1 END)`,
            newProducts: sql<number>`COUNT(CASE WHEN ${products.createdAt} >= ${sql.raw(`'${thirtyDaysAgo.toISOString()}'`)} THEN 1 END)`,
            newReports: sql<number>`COUNT(CASE WHEN ${reports.createdAt} >= ${sql.raw(`'${thirtyDaysAgo.toISOString()}'`)} THEN 1 END)`
          })
          .from(users)
          .leftJoin(products, sql`1=1`) // Cross join for counting
          .leftJoin(reports, sql`1=1`)
        ]);

        return {
          totals: {
            users: totalUsers[0]?.count || 0,
            activeUsers: activeUsers[0]?.count || 0,
            companies: totalCompanies[0]?.count || 0,
            products: totalProducts[0]?.count || 0,
            suppliers: totalSuppliers[0]?.count || 0
          },
          recent: recentActivity[0] || {
            newUsers: 0,
            newProducts: 0,
            newReports: 0
          },
          calculatedAt: new Date().toISOString()
        };
      },
      {}
    );
  }

  /**
   * CACHE MANAGEMENT METHODS
   */
  private generateCacheKey(queryType: string, params: any): string {
    const keyData = {
      type: queryType,
      params: this.normalizeParams(params),
      version: '1.0' // For cache busting when schema changes
    };
    
    return createHash('sha256').update(JSON.stringify(keyData)).digest('hex').substring(0, 32);
  }

  private normalizeParams(params: any): any {
    if (params === null || params === undefined) return {};
    
    // Sort keys and ensure consistent serialization
    const sorted: any = {};
    const keys = Object.keys(params).sort();
    
    for (const key of keys) {
      sorted[key] = params[key];
    }
    
    return sorted;
  }

  private async getCachedResult<T>(cacheKey: string): Promise<T | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry && Date.now() < memoryEntry.expiresAt) {
      return memoryEntry.data;
    }

    // Check Redis cache
    if (this.redis) {
      try {
        const cached = await this.redis.get(`query:cache:${cacheKey}`);
        if (cached) {
          const entry: QueryCacheEntry = JSON.parse(cached);
          
          // Decompress if needed
          let data = entry.data;
          if (entry.compressed && typeof data === 'string') {
            // Simple base64 decompression (in real implementation, use proper compression)
            data = JSON.parse(Buffer.from(data, 'base64').toString());
          }
          
          // Store in memory cache for faster access
          this.memoryCache.set(cacheKey, {
            data,
            expiresAt: Date.now() + 300000, // 5 minutes in memory
          });
          
          return data;
        }
      } catch (error) {
        logger.warn({ error, cacheKey }, 'Redis query cache read error');
      }
    }

    return null;
  }

  private async cacheResult(
    cacheKey: string,
    data: any,
    config: CacheConfig,
    queryDuration: number
  ): Promise<void> {
    const entry: QueryCacheEntry = {
      data,
      cachedAt: Date.now(),
      queryHash: cacheKey,
      rowCount: Array.isArray(data) ? data.length : (data ? 1 : 0)
    };

    // Compress large datasets
    if (config.compress && JSON.stringify(data).length > 10000) {
      // Simple base64 compression (in real implementation, use proper compression like gzip)
      entry.data = Buffer.from(JSON.stringify(data)).toString('base64');
      entry.compressed = true;
    }

    // Store in memory cache
    this.memoryCache.set(cacheKey, {
      data: entry.data,
      expiresAt: Date.now() + config.ttl * 1000,
    });

    // Store in Redis cache
    if (this.redis) {
      try {
        await this.redis.setex(`query:cache:${cacheKey}`, config.ttl, JSON.stringify(entry));
      } catch (error) {
        logger.warn({ error, cacheKey }, 'Redis query cache write error');
      }
    }

    logger.debug({ 
      cacheKey: cacheKey.substring(0, 16) + '...',
      queryDuration,
      ttl: config.ttl,
      compressed: entry.compressed,
      rowCount: entry.rowCount
    }, 'Query result cached');
  }

  /**
   * Cache invalidation
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    let invalidatedCount = 0;

    // Clear memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
        invalidatedCount++;
      }
    }

    // Clear Redis cache
    if (this.redis) {
      try {
        const keys = await this.redis.keys(`query:cache:*${pattern}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          invalidatedCount += keys.length;
        }
      } catch (error) {
        logger.error({ error, pattern }, 'Failed to invalidate Redis query cache');
      }
    }

    return invalidatedCount;
  }

  async invalidateCompanyCache(companyId: number): Promise<void> {
    const patterns = [
      `companyId":${companyId}`,
      `company_analytics`,
      `dashboard_metrics`
    ];

    for (const pattern of patterns) {
      await this.invalidateByPattern(pattern);
    }

    logger.info({ companyId }, 'Company query cache invalidated');
  }

  /**
   * Performance monitoring
   */
  getPerformanceStats() {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0;

    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100,
      averageTimeSaved: this.cacheHits > 0 ? Math.round(this.queryTimeSaved / this.cacheHits) : 0,
      totalTimeSaved: this.queryTimeSaved,
      memoryCacheSize: this.memoryCache.size,
      redisConnected: this.redis !== null && this.redis.status === 'ready'
    };
  }

  async clearAll(): Promise<void> {
    this.memoryCache.clear();
    
    if (this.redis) {
      try {
        const keys = await this.redis.keys('query:cache:*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        logger.error({ error }, 'Failed to clear Redis query cache');
      }
    }

    logger.info({}, 'All query cache cleared');
  }

  async shutdown(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
    this.memoryCache.clear();
    logger.info({}, 'Database query cache shut down');
  }
}

// Export singleton instance
export const databaseQueryCache = DatabaseQueryCache.getInstance();

export default DatabaseQueryCache;