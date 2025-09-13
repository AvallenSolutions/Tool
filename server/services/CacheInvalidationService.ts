import { logger } from '../config/logger';
import { cacheMiddleware } from '../middleware/cacheMiddleware';
import { redisLCACacheService } from './RedisLCACacheService';
import { consolidatedLCAService } from './ConsolidatedLCAService';

/**
 * Cache Invalidation Service
 * 
 * Handles intelligent cache invalidation across all caching layers when data changes.
 * Ensures data consistency by invalidating relevant cache entries when:
 * - Products are created, updated, or deleted
 * - Supplier data changes
 * - Company data is modified
 * - LCA factor versions are updated
 * - Reports are generated or modified
 */
export class CacheInvalidationService {
  private static instance: CacheInvalidationService;

  static getInstance(): CacheInvalidationService {
    if (!CacheInvalidationService.instance) {
      CacheInvalidationService.instance = new CacheInvalidationService();
    }
    return CacheInvalidationService.instance;
  }

  /**
   * Product-related cache invalidation
   */
  async invalidateProductCache(productId: number, companyId?: number): Promise<void> {
    logger.info({ productId, companyId }, 'Starting product cache invalidation');

    const invalidationPromises = [
      // API response cache
      cacheMiddleware.invalidatePattern(`/api/products/${productId}`),
      cacheMiddleware.invalidatePattern('/api/products'),
      cacheMiddleware.invalidateByRoute('/api/dashboard/metrics'),
      
      // Company-specific caches if companyId provided
      ...(companyId ? [
        cacheMiddleware.invalidateByCompany(companyId),
        cacheMiddleware.invalidatePattern(`company:${companyId}`)
      ] : []),
      
      // LCA result caches for this product
      this.invalidateLCAResultsForProduct(productId)
    ];

    const results = await Promise.allSettled(invalidationPromises);
    const totalInvalidated = results.reduce((sum, result) => {
      return sum + (result.status === 'fulfilled' ? result.value || 0 : 0);
    }, 0);

    logger.info({ 
      productId, 
      companyId, 
      totalInvalidated,
      failedInvalidations: results.filter(r => r.status === 'rejected').length
    }, 'Product cache invalidation completed');
  }

  /**
   * Supplier-related cache invalidation
   */
  async invalidateSupplierCache(supplierId?: number, companyId?: number): Promise<void> {
    logger.info({ supplierId, companyId }, 'Starting supplier cache invalidation');

    const invalidationPromises = [
      // API response cache
      cacheMiddleware.invalidateByRoute('/api/suppliers'),
      cacheMiddleware.invalidateByRoute('/api/supplier-products'),
      cacheMiddleware.invalidatePattern('/api/admin/supplier'),
      
      // Specific supplier if ID provided
      ...(supplierId ? [
        cacheMiddleware.invalidatePattern(`/api/suppliers/${supplierId}`),
        cacheMiddleware.invalidatePattern(`supplier:${supplierId}`)
      ] : []),
      
      // Company-specific caches if companyId provided
      ...(companyId ? [
        cacheMiddleware.invalidateByCompany(companyId),
        cacheMiddleware.invalidatePattern('/api/dashboard/metrics')
      ] : [])
    ];

    const results = await Promise.allSettled(invalidationPromises);
    const totalInvalidated = results.reduce((sum, result) => {
      return sum + (result.status === 'fulfilled' ? result.value || 0 : 0);
    }, 0);

    logger.info({ 
      supplierId, 
      companyId, 
      totalInvalidated 
    }, 'Supplier cache invalidation completed');
  }

  /**
   * Company-wide cache invalidation
   */
  async invalidateCompanyCache(companyId: number): Promise<void> {
    logger.info({ companyId }, 'Starting company-wide cache invalidation');

    const invalidationPromises = [
      // Company-specific API caches
      cacheMiddleware.invalidateByCompany(companyId),
      
      // Dashboard and analytics
      cacheMiddleware.invalidatePattern('/api/dashboard/metrics'),
      cacheMiddleware.invalidatePattern(`/api/time-series/analytics/${companyId}`),
      
      // Products and suppliers for this company
      cacheMiddleware.invalidateByRoute('/api/products'),
      cacheMiddleware.invalidateByRoute('/api/suppliers'),
      
      // Reports
      cacheMiddleware.invalidateByRoute('/api/reports'),
      
      // LCA caches for company products
      this.invalidateLCAResultsForCompany(companyId)
    ];

    const results = await Promise.allSettled(invalidationPromises);
    const totalInvalidated = results.reduce((sum, result) => {
      return sum + (result.status === 'fulfilled' ? result.value || 0 : 0);
    }, 0);

    logger.info({ 
      companyId, 
      totalInvalidated 
    }, 'Company cache invalidation completed');
  }

  /**
   * LCA-specific cache invalidation
   */
  async invalidateLCAResultsForProduct(productId: number): Promise<number> {
    logger.debug({ productId }, 'Invalidating LCA results for product');

    let totalInvalidated = 0;

    try {
      // Invalidate Redis LCA cache entries that might be related to this product
      // Since LCA cache keys are hashed, we need to clear broader patterns
      const lcaInvalidated = await redisLCACacheService.invalidateByMethod('hybrid');
      totalInvalidated += lcaInvalidated;

      // Invalidate API cache for LCA endpoints
      const apiInvalidated = await cacheMiddleware.invalidatePattern(`/api/products/${productId}/lca`);
      totalInvalidated += apiInvalidated;

      logger.debug({ 
        productId, 
        lcaInvalidated, 
        apiInvalidated, 
        totalInvalidated 
      }, 'LCA cache invalidation for product completed');

    } catch (error) {
      logger.error({ error, productId }, 'Failed to invalidate LCA results for product');
    }

    return totalInvalidated;
  }

  async invalidateLCAResultsForCompany(companyId: number): Promise<number> {
    logger.debug({ companyId }, 'Invalidating LCA results for company');

    let totalInvalidated = 0;

    try {
      // Broad LCA cache invalidation - since cache keys are hashed, we need to be comprehensive
      const methodInvalidations = await Promise.allSettled([
        redisLCACacheService.invalidateByMethod('simple'),
        redisLCACacheService.invalidateByMethod('enhanced'), 
        redisLCACacheService.invalidateByMethod('hybrid'),
        redisLCACacheService.invalidateByMethod('professional'),
        redisLCACacheService.invalidateByMethod('openlca')
      ]);

      totalInvalidated = methodInvalidations.reduce((sum, result) => {
        return sum + (result.status === 'fulfilled' ? result.value : 0);
      }, 0);

      // Invalidate API cache for LCA endpoints
      const apiInvalidated = await cacheMiddleware.invalidatePattern('/lca');
      totalInvalidated += apiInvalidated;

      logger.debug({ 
        companyId, 
        totalInvalidated 
      }, 'LCA cache invalidation for company completed');

    } catch (error) {
      logger.error({ error, companyId }, 'Failed to invalidate LCA results for company');
    }

    return totalInvalidated;
  }

  /**
   * Report cache invalidation
   */
  async invalidateReportCache(reportId?: number, companyId?: number): Promise<void> {
    logger.info({ reportId, companyId }, 'Starting report cache invalidation');

    const invalidationPromises = [
      // General report caches
      cacheMiddleware.invalidateByRoute('/api/reports'),
      cacheMiddleware.invalidateByRoute('/api/report-builder'),
      
      // Specific report if ID provided
      ...(reportId ? [
        cacheMiddleware.invalidatePattern(`/api/reports/${reportId}`),
        cacheMiddleware.invalidatePattern(`report:${reportId}`)
      ] : []),
      
      // Company-specific report caches
      ...(companyId ? [
        cacheMiddleware.invalidatePattern(`company:${companyId}`),
        cacheMiddleware.invalidatePattern('/api/dashboard/metrics')
      ] : [])
    ];

    const results = await Promise.allSettled(invalidationPromises);
    const totalInvalidated = results.reduce((sum, result) => {
      return sum + (result.status === 'fulfilled' ? result.value || 0 : 0);
    }, 0);

    logger.info({ 
      reportId, 
      companyId, 
      totalInvalidated 
    }, 'Report cache invalidation completed');
  }

  /**
   * Factor version cache invalidation (for LCA emission factors)
   */
  async invalidateFactorVersion(factorVersion: string = 'DEFRA_2024'): Promise<void> {
    logger.info({ factorVersion }, 'Starting factor version cache invalidation');

    const invalidationPromises = [
      // Redis LCA cache invalidation by factor version
      redisLCACacheService.invalidateByFactorVersion(factorVersion),
      
      // Clear all LCA-related API caches since calculations will change
      cacheMiddleware.invalidatePattern('/lca'),
      cacheMiddleware.invalidatePattern('/api/products'),
      cacheMiddleware.invalidatePattern('/api/dashboard/metrics')
    ];

    const results = await Promise.allSettled(invalidationPromises);
    const totalInvalidated = results.reduce((sum, result) => {
      return sum + (result.status === 'fulfilled' ? result.value || 0 : 0);
    }, 0);

    logger.info({ 
      factorVersion, 
      totalInvalidated 
    }, 'Factor version cache invalidation completed');
  }

  /**
   * Dashboard and analytics cache invalidation
   */
  async invalidateDashboardCache(companyId?: number): Promise<void> {
    logger.info({ companyId }, 'Starting dashboard cache invalidation');

    const invalidationPromises = [
      // Dashboard endpoints
      cacheMiddleware.invalidateByRoute('/api/dashboard/metrics'),
      cacheMiddleware.invalidatePattern('/api/admin/analytics'),
      
      // Time series analytics
      cacheMiddleware.invalidatePattern('/api/time-series/analytics'),
      
      // Company-specific if provided
      ...(companyId ? [
        cacheMiddleware.invalidatePattern(`/api/time-series/analytics/${companyId}`),
        cacheMiddleware.invalidateByCompany(companyId)
      ] : [])
    ];

    const results = await Promise.allSettled(invalidationPromises);
    const totalInvalidated = results.reduce((sum, result) => {
      return sum + (result.status === 'fulfilled' ? result.value || 0 : 0);
    }, 0);

    logger.info({ 
      companyId, 
      totalInvalidated 
    }, 'Dashboard cache invalidation completed');
  }

  /**
   * Emergency cache clear - use sparingly
   */
  async clearAllCaches(): Promise<void> {
    logger.warn({}, 'Starting emergency cache clear - all caches will be cleared');

    const clearPromises = [
      cacheMiddleware.clearAll(),
      redisLCACacheService.clear(),
      // Note: consolidatedLCAService has its own memory cache that we should clear too
    ];

    try {
      await Promise.all(clearPromises);
      logger.info({}, 'Emergency cache clear completed successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to clear all caches during emergency clear');
      throw error;
    }
  }

  /**
   * Scheduled cache maintenance
   */
  async performMaintenance(): Promise<void> {
    logger.info({}, 'Starting scheduled cache maintenance');

    const maintenanceTasks = [
      // Get cache statistics before maintenance
      this.getCacheStats(),
      
      // Clean up expired entries (Redis should handle this automatically, but let's be thorough)
      redisLCACacheService.getStats(),
    ];

    try {
      const [apiStats, lcaStats] = await Promise.all(maintenanceTasks);
      
      logger.info({ 
        apiCache: apiStats,
        lcaCache: lcaStats 
      }, 'Cache maintenance completed - statistics collected');

    } catch (error) {
      logger.error({ error }, 'Cache maintenance failed');
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  async getCacheStats(): Promise<{
    api: any;
    lca: any;
    timestamp: string;
  }> {
    const [apiStats, lcaStats] = await Promise.all([
      cacheMiddleware.getStats(),
      redisLCACacheService.getStats(),
    ]);

    return {
      api: apiStats,
      lca: lcaStats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Health check for all caching layers
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      api: any;
      lca: boolean;
      redis: boolean;
    };
  }> {
    const [apiHealth, lcaConnected] = await Promise.all([
      cacheMiddleware.healthCheck(),
      redisLCACacheService.isConnected(),
    ]);

    const allHealthy = apiHealth.status === 'healthy' && lcaConnected;
    
    return {
      status: allHealthy ? 'healthy' : (apiHealth.redis || lcaConnected) ? 'degraded' : 'unhealthy',
      details: {
        api: apiHealth,
        lca: lcaConnected,
        redis: apiHealth.redis && lcaConnected,
      },
    };
  }
}

// Export singleton instance
export const cacheInvalidationService = CacheInvalidationService.getInstance();

// Convenience methods for common invalidation scenarios
export const invalidateProduct = (productId: number, companyId?: number) => 
  cacheInvalidationService.invalidateProductCache(productId, companyId);

export const invalidateSupplier = (supplierId?: number, companyId?: number) => 
  cacheInvalidationService.invalidateSupplierCache(supplierId, companyId);

export const invalidateCompany = (companyId: number) => 
  cacheInvalidationService.invalidateCompanyCache(companyId);

export const invalidateReport = (reportId?: number, companyId?: number) => 
  cacheInvalidationService.invalidateReportCache(reportId, companyId);

export const invalidateDashboard = (companyId?: number) => 
  cacheInvalidationService.invalidateDashboardCache(companyId);

export const invalidateLCAFactors = (factorVersion?: string) => 
  cacheInvalidationService.invalidateFactorVersion(factorVersion);

export default cacheInvalidationService;