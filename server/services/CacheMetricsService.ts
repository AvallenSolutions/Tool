import { logger } from '../config/logger';
import { cacheMiddleware } from '../middleware/cacheMiddleware';
import { redisLCACacheService } from './RedisLCACacheService';
import { databaseQueryCache } from './DatabaseQueryCache';
import { cacheWarmingService } from './CacheWarmingService';
import { cacheInvalidationService } from './CacheInvalidationService';

/**
 * Cache Metrics and Monitoring Service
 * 
 * Provides comprehensive monitoring, metrics collection, and performance analysis
 * for all caching layers in the sustainability platform.
 */

interface CacheMetrics {
  api: {
    hitRate: number;
    totalRequests: number;
    averageResponseTime: number;
    cacheSize: number;
    redisHealth: boolean;
  };
  lca: {
    hitRate: number;
    totalCalculations: number;
    averageCalculationTime: number;
    cacheSize: number;
    factorVersions: Record<string, number>;
  };
  database: {
    hitRate: number;
    totalQueries: number;
    averageQueryTime: number;
    cacheSize: number;
    timeSaved: number;
  };
  warming: {
    totalJobs: number;
    successRate: number;
    averageItemsWarmed: number;
    lastWarming: Date | null;
  };
  overall: {
    totalCacheHits: number;
    totalCacheMisses: number;
    overallHitRate: number;
    totalTimeSaved: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
}

interface PerformanceReport {
  period: string;
  metrics: CacheMetrics;
  recommendations: string[];
  alerts: Array<{
    level: 'info' | 'warning' | 'error';
    message: string;
    action?: string;
  }>;
  trends: {
    hitRateChange: number;
    performanceImprovement: number;
    cacheGrowth: number;
  };
}

export class CacheMetricsService {
  private static instance: CacheMetricsService;
  private metricsHistory: Array<{ timestamp: Date; metrics: CacheMetrics }> = [];
  private readonly maxHistorySize = 1440; // 24 hours of minute-by-minute data
  
  constructor() {
    this.startMetricsCollection();
  }

  static getInstance(): CacheMetricsService {
    if (!CacheMetricsService.instance) {
      CacheMetricsService.instance = new CacheMetricsService();
    }
    return CacheMetricsService.instance;
  }

  private startMetricsCollection(): void {
    // Collect metrics every minute
    setInterval(async () => {
      try {
        const metrics = await this.collectCurrentMetrics();
        this.recordMetrics(metrics);
      } catch (error) {
        logger.error({ error }, 'Failed to collect cache metrics');
      }
    }, 60000); // Every minute

    // Generate reports every hour
    setInterval(async () => {
      try {
        const report = await this.generatePerformanceReport('1h');
        this.logPerformanceReport(report);
      } catch (error) {
        logger.error({ error }, 'Failed to generate performance report');
      }
    }, 3600000); // Every hour

    logger.info({}, 'Cache metrics collection started');
  }

  /**
   * Collect current metrics from all cache layers
   */
  async collectCurrentMetrics(): Promise<CacheMetrics> {
    const [
      apiStats,
      lcaStats,
      dbStats,
      warmingStats
    ] = await Promise.all([
      cacheMiddleware.getStats(),
      redisLCACacheService.getStats(),
      databaseQueryCache.getPerformanceStats(),
      cacheWarmingService.getWarmingStats()
    ]);

    // Calculate overall metrics
    const totalHits = apiStats.cacheHits + (lcaStats.hitCount || 0) + dbStats.cacheHits;
    const totalMisses = apiStats.cacheMisses + (lcaStats.missCount || 0) + dbStats.cacheMisses;
    const totalRequests = totalHits + totalMisses;
    const overallHitRate = totalRequests > 0 ? totalHits / totalRequests : 0;

    const metrics: CacheMetrics = {
      api: {
        hitRate: apiStats.hitRate || 0,
        totalRequests: apiStats.cacheHits + apiStats.cacheMisses,
        averageResponseTime: 0, // Would need to track this separately
        cacheSize: apiStats.memoryCacheSize || 0,
        redisHealth: apiStats.redisConnected || false
      },
      lca: {
        hitRate: lcaStats.hitRate || 0,
        totalCalculations: (lcaStats.hitCount || 0) + (lcaStats.missCount || 0),
        averageCalculationTime: 0, // Would need to track this from LCA service
        cacheSize: lcaStats.totalEntries || 0,
        factorVersions: lcaStats.byFactorVersion || {}
      },
      database: {
        hitRate: dbStats.hitRate || 0,
        totalQueries: dbStats.cacheHits + dbStats.cacheMisses,
        averageQueryTime: 0, // Would need to track this separately
        cacheSize: dbStats.memoryCacheSize || 0,
        timeSaved: dbStats.totalTimeSaved || 0
      },
      warming: {
        totalJobs: warmingStats.totalJobs,
        successRate: warmingStats.totalJobs > 0 ? warmingStats.successfulJobs / warmingStats.totalJobs : 0,
        averageItemsWarmed: warmingStats.averageItems,
        lastWarming: warmingStats.lastWarming || null
      },
      overall: {
        totalCacheHits: totalHits,
        totalCacheMisses: totalMisses,
        overallHitRate,
        totalTimeSaved: (dbStats.totalTimeSaved || 0),
        memoryUsage: process.memoryUsage()
      }
    };

    return metrics;
  }

  private recordMetrics(metrics: CacheMetrics): void {
    this.metricsHistory.push({
      timestamp: new Date(),
      metrics
    });

    // Maintain history size limit
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(period: string = '1h'): Promise<PerformanceReport> {
    const currentMetrics = await this.collectCurrentMetrics();
    const recommendations: string[] = [];
    const alerts: Array<{ level: 'info' | 'warning' | 'error'; message: string; action?: string }> = [];
    
    // Analyze current performance
    if (currentMetrics.overall.overallHitRate < 0.5) {
      alerts.push({
        level: 'warning',
        message: `Overall cache hit rate is low: ${Math.round(currentMetrics.overall.overallHitRate * 100)}%`,
        action: 'Consider increasing cache warming frequency or reviewing cache TTL settings'
      });
      recommendations.push('Investigate cache miss patterns and optimize caching strategy');
    }

    if (currentMetrics.api.redisHealth === false) {
      alerts.push({
        level: 'error',
        message: 'Redis connection is down - caching is degraded',
        action: 'Check Redis server status and connection configuration'
      });
      recommendations.push('Restore Redis connection to improve cache performance');
    }

    if (currentMetrics.lca.hitRate < 0.7) {
      alerts.push({
        level: 'warning',
        message: `LCA cache hit rate is low: ${Math.round(currentMetrics.lca.hitRate * 100)}%`,
        action: 'Increase LCA cache warming for frequently calculated products'
      });
      recommendations.push('Optimize LCA cache warming scenarios based on usage patterns');
    }

    if (currentMetrics.warming.successRate < 0.9) {
      alerts.push({
        level: 'warning',
        message: `Cache warming success rate is low: ${Math.round(currentMetrics.warming.successRate * 100)}%`,
        action: 'Review cache warming logs and fix failing scenarios'
      });
    }

    // Performance recommendations
    if (currentMetrics.overall.overallHitRate > 0.8) {
      recommendations.push('Cache performance is excellent - maintain current configuration');
    } else if (currentMetrics.overall.overallHitRate > 0.6) {
      recommendations.push('Cache performance is good - consider fine-tuning TTL and warming strategies');
    } else {
      recommendations.push('Cache performance needs improvement - review caching strategy and implementation');
    }

    // Memory usage analysis
    const memUsage = currentMetrics.overall.memoryUsage;
    const memUsageMB = memUsage.heapUsed / 1024 / 1024;
    
    if (memUsageMB > 500) {
      alerts.push({
        level: 'warning',
        message: `High memory usage: ${Math.round(memUsageMB)}MB`,
        action: 'Consider reducing cache sizes or optimizing data structures'
      });
    }

    // Calculate trends (simplified - would use historical data in real implementation)
    const trends = {
      hitRateChange: 0, // Would calculate from historical data
      performanceImprovement: currentMetrics.overall.overallHitRate > 0.7 ? 25 : 10,
      cacheGrowth: 15 // Would calculate from historical cache sizes
    };

    return {
      period,
      metrics: currentMetrics,
      recommendations,
      alerts,
      trends
    };
  }

  private logPerformanceReport(report: PerformanceReport): void {
    const summary = {
      period: report.period,
      overallHitRate: Math.round(report.metrics.overall.overallHitRate * 100),
      totalRequests: report.metrics.overall.totalCacheHits + report.metrics.overall.totalCacheMisses,
      timeSaved: report.metrics.overall.totalTimeSaved,
      alertCount: report.alerts.length,
      recommendations: report.recommendations.length
    };

    logger.info(summary, 'Cache performance report');

    // Log alerts
    report.alerts.forEach(alert => {
      if (alert.level === 'error') {
        logger.error({ alert: alert.message, action: alert.action }, 'Cache alert');
      } else if (alert.level === 'warning') {
        logger.warn({ alert: alert.message, action: alert.action }, 'Cache warning');
      } else {
        logger.info({ alert: alert.message }, 'Cache info');
      }
    });
  }

  /**
   * Get real-time cache health status
   */
  async getCacheHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    components: {
      api: boolean;
      lca: boolean;
      database: boolean;
      warming: boolean;
      redis: boolean;
    };
    issues: string[];
    recommendations: string[];
  }> {
    const metrics = await this.collectCurrentMetrics();
    const issues: string[] = [];
    const recommendations: string[] = [];
    let overallHealthy = true;
    let degraded = false;

    const components = {
      api: metrics.api.hitRate > 0.5,
      lca: metrics.lca.hitRate > 0.6,
      database: metrics.database.hitRate > 0.5,
      warming: metrics.warming.successRate > 0.8,
      redis: metrics.api.redisHealth
    };

    // Check each component
    if (!components.redis) {
      issues.push('Redis connection is down');
      recommendations.push('Restore Redis connection for optimal cache performance');
      degraded = true;
    }

    if (!components.api || metrics.api.hitRate < 0.3) {
      issues.push(`API cache hit rate is low: ${Math.round(metrics.api.hitRate * 100)}%`);
      recommendations.push('Review API caching configuration and TTL settings');
      if (metrics.api.hitRate < 0.2) overallHealthy = false;
      else degraded = true;
    }

    if (!components.lca || metrics.lca.hitRate < 0.5) {
      issues.push(`LCA cache hit rate is low: ${Math.round(metrics.lca.hitRate * 100)}%`);
      recommendations.push('Increase LCA cache warming frequency');
      if (metrics.lca.hitRate < 0.3) overallHealthy = false;
      else degraded = true;
    }

    if (!components.database || metrics.database.hitRate < 0.4) {
      issues.push(`Database cache hit rate is low: ${Math.round(metrics.database.hitRate * 100)}%`);
      recommendations.push('Optimize database query caching strategy');
      degraded = true;
    }

    if (!components.warming || metrics.warming.successRate < 0.7) {
      issues.push(`Cache warming success rate is low: ${Math.round(metrics.warming.successRate * 100)}%`);
      recommendations.push('Fix failing cache warming jobs');
      degraded = true;
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (!overallHealthy) {
      status = 'critical';
    } else if (degraded) {
      status = 'degraded';
    }

    return {
      status,
      components,
      issues,
      recommendations
    };
  }

  /**
   * Get performance comparison with and without caching
   */
  getPerformanceImpact(): {
    estimatedTimeSaved: number;
    performanceImprovement: string;
    requestsServedFromCache: number;
    cacheEfficiency: number;
  } {
    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1]?.metrics;
    
    if (!latestMetrics) {
      return {
        estimatedTimeSaved: 0,
        performanceImprovement: '0%',
        requestsServedFromCache: 0,
        cacheEfficiency: 0
      };
    }

    const totalCacheHits = latestMetrics.overall.totalCacheHits;
    const totalRequests = totalCacheHits + latestMetrics.overall.totalCacheMisses;
    
    // Estimate time saved (assuming average cache hit saves 2 seconds for LCA, 0.5s for others)
    const estimatedLCATimeSaved = (latestMetrics.lca.hitRate * latestMetrics.lca.totalCalculations) * 2000; // 2s per LCA
    const estimatedAPITimeSaved = (latestMetrics.api.hitRate * latestMetrics.api.totalRequests) * 500; // 0.5s per API call
    const totalTimeSaved = estimatedLCATimeSaved + estimatedAPITimeSaved + latestMetrics.database.timeSaved;

    // Performance improvement calculation
    const averageUncachedTime = 1000; // 1 second average without cache
    const averageCachedTime = averageUncachedTime * (1 - latestMetrics.overall.overallHitRate);
    const improvementRatio = averageUncachedTime / Math.max(averageCachedTime, 10); // Avoid division by zero

    return {
      estimatedTimeSaved: Math.round(totalTimeSaved / 1000), // Convert to seconds
      performanceImprovement: `${Math.round((improvementRatio - 1) * 100)}%`,
      requestsServedFromCache: totalCacheHits,
      cacheEfficiency: Math.round(latestMetrics.overall.overallHitRate * 100)
    };
  }

  /**
   * Export metrics for external monitoring systems
   */
  async exportMetrics(format: 'json' | 'prometheus' = 'json'): Promise<string> {
    const metrics = await this.collectCurrentMetrics();
    
    if (format === 'prometheus') {
      // Prometheus metrics format
      const prometheusMetrics = [
        `# HELP cache_hit_rate Cache hit rate by component`,
        `# TYPE cache_hit_rate gauge`,
        `cache_hit_rate{component="api"} ${metrics.api.hitRate}`,
        `cache_hit_rate{component="lca"} ${metrics.lca.hitRate}`,
        `cache_hit_rate{component="database"} ${metrics.database.hitRate}`,
        `cache_hit_rate{component="overall"} ${metrics.overall.overallHitRate}`,
        ``,
        `# HELP cache_size Cache size by component`,
        `# TYPE cache_size gauge`,
        `cache_size{component="api"} ${metrics.api.cacheSize}`,
        `cache_size{component="lca"} ${metrics.lca.cacheSize}`,
        `cache_size{component="database"} ${metrics.database.cacheSize}`,
        ``,
        `# HELP cache_requests_total Total cache requests`,
        `# TYPE cache_requests_total counter`,
        `cache_requests_total{component="api",result="hit"} ${metrics.overall.totalCacheHits}`,
        `cache_requests_total{component="api",result="miss"} ${metrics.overall.totalCacheMisses}`,
      ].join('\n');
      
      return prometheusMetrics;
    }
    
    // JSON format (default)
    return JSON.stringify(metrics, null, 2);
  }

  /**
   * Get historical metrics for trend analysis
   */
  getHistoricalMetrics(hours: number = 24): Array<{ timestamp: Date; metrics: CacheMetrics }> {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metricsHistory.filter(entry => entry.timestamp >= cutoffTime);
  }

  /**
   * Reset all metrics (use carefully)
   */
  async resetMetrics(): Promise<void> {
    logger.warn({}, 'Resetting all cache metrics');
    this.metricsHistory = [];
    
    // Note: This doesn't reset the underlying cache statistics in each service
    // Each service would need its own reset method
  }

  async shutdown(): Promise<void> {
    logger.info({}, 'Cache metrics service shutting down');
    // In a real implementation, we'd save final metrics and stop intervals
    this.metricsHistory = [];
  }
}

// Export singleton instance
export const cacheMetricsService = CacheMetricsService.getInstance();

export default CacheMetricsService;