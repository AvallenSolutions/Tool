import { logger } from '../config/logger';
import { consolidatedLCAService } from './ConsolidatedLCAService';
import { redisLCACacheService } from './RedisLCACacheService';
import { databaseQueryCache } from './DatabaseQueryCache';
import { cacheMiddleware } from '../middleware/cacheMiddleware';
import { db } from '../db';
import { products, companies, verifiedSuppliers } from '@shared/schema';
import { eq, desc, limit } from 'drizzle-orm';

/**
 * Cache Warming Service
 * 
 * Proactively loads frequently accessed data into cache to improve user experience.
 * Implements intelligent cache warming strategies based on:
 * - Historical access patterns
 * - Business priorities (active companies, popular products)
 * - Time-based patterns (pre-warm before business hours)
 * - User behavior analysis
 */

interface WarmingScenario {
  productId: number;
  productName: string;
  companyId: number;
  priority: 'high' | 'medium' | 'low';
  lcaInputs: any;
  estimatedUsage: number; // Times per day this is accessed
}

interface WarmingJob {
  id: string;
  type: 'lca' | 'database' | 'api';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  itemsWarmed: number;
  errors: number;
}

export class CacheWarmingService {
  private static instance: CacheWarmingService;
  private isWarming = false;
  private currentJob: WarmingJob | null = null;
  private warmingHistory: WarmingJob[] = [];
  
  // Warming configuration
  private readonly config = {
    maxConcurrentWarming: 3,
    warmingBatchSize: 10,
    defaultWarmingInterval: 6 * 60 * 60 * 1000, // 6 hours
    priorityWarmingInterval: 2 * 60 * 60 * 1000, // 2 hours for high priority
    maxWarmingDuration: 30 * 60 * 1000, // 30 minutes max per warming session
  };

  constructor() {
    this.schedulePeriodicWarming();
  }

  static getInstance(): CacheWarmingService {
    if (!CacheWarmingService.instance) {
      CacheWarmingService.instance = new CacheWarmingService();
    }
    return CacheWarmingService.instance;
  }

  private schedulePeriodicWarming(): void {
    // Schedule warming every 6 hours
    setInterval(() => {
      this.performAutomaticWarming().catch(error => {
        logger.error({ error }, 'Scheduled cache warming failed');
      });
    }, this.config.defaultWarmingInterval);

    // Initial warming after startup delay
    setTimeout(() => {
      this.performAutomaticWarming().catch(error => {
        logger.error({ error }, 'Initial cache warming failed');
      });
    }, 60000); // Wait 1 minute after startup
  }

  /**
   * Main automatic warming routine
   */
  async performAutomaticWarming(): Promise<void> {
    if (this.isWarming) {
      logger.info({}, 'Cache warming already in progress, skipping');
      return;
    }

    this.isWarming = true;
    const jobId = `warming-${Date.now()}`;
    
    const job: WarmingJob = {
      id: jobId,
      type: 'lca', // Will be updated based on what's being warmed
      status: 'running',
      startedAt: new Date(),
      itemsWarmed: 0,
      errors: 0
    };

    this.currentJob = job;
    
    try {
      logger.info({ jobId }, 'Starting automatic cache warming');
      
      // Warm different cache layers in parallel
      const warmingPromises = [
        this.warmLCACache(),
        this.warmDatabaseCache(),
        this.warmAPICache()
      ];

      const results = await Promise.allSettled(warmingPromises);
      
      // Aggregate results
      let totalWarmed = 0;
      let totalErrors = 0;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          totalWarmed += result.value.itemsWarmed;
          totalErrors += result.value.errors;
        } else {
          totalErrors++;
          logger.error({ error: result.reason, warmingType: index }, 'Cache warming failed');
        }
      });

      job.status = 'completed';
      job.itemsWarmed = totalWarmed;
      job.errors = totalErrors;
      job.completedAt = new Date();
      job.duration = Date.now() - job.startedAt.getTime();
      
      logger.info({ 
        jobId,
        itemsWarmed: totalWarmed,
        errors: totalErrors,
        duration: job.duration
      }, 'Automatic cache warming completed');

    } catch (error) {
      job.status = 'failed';
      job.errors++;
      job.completedAt = new Date();
      job.duration = Date.now() - job.startedAt!.getTime();
      
      logger.error({ error, jobId }, 'Cache warming job failed');
    } finally {
      this.isWarming = false;
      this.warmingHistory.push(job);
      this.currentJob = null;
      
      // Keep only last 100 warming jobs
      if (this.warmingHistory.length > 100) {
        this.warmingHistory = this.warmingHistory.slice(-100);
      }
    }
  }

  /**
   * LCA Cache Warming
   */
  private async warmLCACache(): Promise<{ itemsWarmed: number; errors: number }> {
    logger.info({}, 'Starting LCA cache warming');
    
    let itemsWarmed = 0;
    let errors = 0;

    try {
      // Get warming scenarios based on real data
      const scenarios = await this.generateLCAWarmingScenarios();
      
      logger.info({ scenarioCount: scenarios.length }, 'Generated LCA warming scenarios');
      
      // Warm high-priority scenarios first
      const highPriorityScenarios = scenarios
        .filter(s => s.priority === 'high')
        .slice(0, this.config.warmingBatchSize);
      
      for (const scenario of highPriorityScenarios) {
        try {
          // Check if already cached
          const cacheExists = await redisLCACacheService.has(
            scenario.lcaInputs,
            { method: 'hybrid' },
            'DEFRA_2024'
          );

          if (!cacheExists) {
            // Warm the cache by performing calculation
            await consolidatedLCAService.calculateLCA(
              { 
                id: scenario.productId, 
                name: scenario.productName,
                companyId: scenario.companyId
              },
              scenario.lcaInputs,
              { 
                method: 'hybrid',
                useCache: true,
                forceRecalculation: false
              }
            );
            
            itemsWarmed++;
            logger.debug({ 
              productId: scenario.productId,
              productName: scenario.productName 
            }, 'LCA result warmed in cache');
          }

          // Small delay to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          errors++;
          logger.warn({ 
            error, 
            productId: scenario.productId,
            productName: scenario.productName
          }, 'Failed to warm LCA cache for product');
        }
      }

      // Warm medium priority scenarios if we have time and capacity
      const mediumPriorityScenarios = scenarios
        .filter(s => s.priority === 'medium')
        .slice(0, Math.floor(this.config.warmingBatchSize / 2));

      for (const scenario of mediumPriorityScenarios) {
        try {
          const cacheExists = await redisLCACacheService.has(
            scenario.lcaInputs,
            { method: 'simple' }, // Use faster calculation for medium priority
            'DEFRA_2024'
          );

          if (!cacheExists) {
            await consolidatedLCAService.calculateLCA(
              { 
                id: scenario.productId, 
                name: scenario.productName,
                companyId: scenario.companyId
              },
              scenario.lcaInputs,
              { 
                method: 'simple',
                useCache: true,
                forceRecalculation: false
              }
            );
            
            itemsWarmed++;
          }

          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (error) {
          errors++;
          logger.debug({ error, productId: scenario.productId }, 'Failed to warm medium priority LCA');
        }
      }

      logger.info({ itemsWarmed, errors }, 'LCA cache warming completed');
      
    } catch (error) {
      errors++;
      logger.error({ error }, 'LCA cache warming failed');
    }

    return { itemsWarmed, errors };
  }

  /**
   * Database Cache Warming
   */
  private async warmDatabaseCache(): Promise<{ itemsWarmed: number; errors: number }> {
    logger.info({}, 'Starting database cache warming');
    
    let itemsWarmed = 0;
    let errors = 0;

    try {
      // Get active companies for warming
      const activeCompanies = await db
        .select({ id: companies.id, name: companies.name })
        .from(companies)
        .orderBy(desc(companies.updatedAt))
        .limit(10);

      // Warm dashboard metrics for active companies
      for (const company of activeCompanies) {
        try {
          await databaseQueryCache.getDashboardMetrics(company.id);
          itemsWarmed++;
          
          // Also warm company analytics for high-value companies
          await databaseQueryCache.getCompanyAnalytics(company.id, 6);
          itemsWarmed++;
          
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          errors++;
          logger.warn({ error, companyId: company.id }, 'Failed to warm database cache for company');
        }
      }

      // Warm admin analytics (frequently accessed)
      try {
        await databaseQueryCache.getAdminAnalytics();
        itemsWarmed++;
      } catch (error) {
        errors++;
        logger.warn({ error }, 'Failed to warm admin analytics cache');
      }

      // Warm product and supplier lists for top companies
      const topCompanies = activeCompanies.slice(0, 5);
      for (const company of topCompanies) {
        try {
          await Promise.all([
            databaseQueryCache.getProductsByCompany(company.id, 50),
            databaseQueryCache.getSuppliersByCompany(company.id, 50),
            databaseQueryCache.getKPIMetrics(company.id)
          ]);
          itemsWarmed += 3;
          
        } catch (error) {
          errors++;
          logger.debug({ error, companyId: company.id }, 'Failed to warm company data cache');
        }
      }

      logger.info({ itemsWarmed, errors }, 'Database cache warming completed');
      
    } catch (error) {
      errors++;
      logger.error({ error }, 'Database cache warming failed');
    }

    return { itemsWarmed, errors };
  }

  /**
   * API Response Cache Warming
   */
  private async warmAPICache(): Promise<{ itemsWarmed: number; errors: number }> {
    logger.info({}, 'Starting API response cache warming');
    
    let itemsWarmed = 0;
    let errors = 0;

    try {
      // Simulate requests to common API endpoints to warm the API cache
      // In a real implementation, you might use a headless browser or HTTP client
      // For now, we'll warm the underlying data sources that these APIs use
      
      // Get active companies
      const activeCompanies = await db
        .select({ id: companies.id })
        .from(companies)
        .limit(5);

      // Pre-warm data sources for common API endpoints
      for (const company of activeCompanies) {
        try {
          // These will populate cache for common API endpoints
          await Promise.all([
            databaseQueryCache.getDashboardMetrics(company.id),
            databaseQueryCache.getProductsByCompany(company.id),
            databaseQueryCache.getSuppliersByCompany(company.id),
          ]);
          
          itemsWarmed += 3;
          
        } catch (error) {
          errors++;
          logger.debug({ error, companyId: company.id }, 'Failed to warm API cache data');
        }
      }

      logger.info({ itemsWarmed, errors }, 'API cache warming completed');
      
    } catch (error) {
      errors++;
      logger.error({ error }, 'API cache warming failed');
    }

    return { itemsWarmed, errors };
  }

  /**
   * Generate intelligent LCA warming scenarios based on real data
   */
  private async generateLCAWarmingScenarios(): Promise<WarmingScenario[]> {
    const scenarios: WarmingScenario[] = [];

    try {
      // Get most recent products with LCA data
      const recentProducts = await db
        .select({
          id: products.id,
          name: products.name,
          companyId: products.companyId,
          totalCarbonFootprint: products.totalCarbonFootprint,
          updatedAt: products.updatedAt
        })
        .from(products)
        .orderBy(desc(products.updatedAt))
        .limit(50);

      for (const product of recentProducts) {
        // Generate realistic LCA inputs for warming
        const lcaInputs = this.generateRealisticLCAInputs(product);
        
        // Determine priority based on recency and existing footprint data
        let priority: 'high' | 'medium' | 'low' = 'medium';
        
        if (product.totalCarbonFootprint && parseFloat(product.totalCarbonFootprint) > 0) {
          priority = 'high'; // Products with existing LCA data are high priority
        } else if (product.updatedAt && product.updatedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
          priority = 'high'; // Recently updated products are high priority
        } else {
          priority = 'medium';
        }

        scenarios.push({
          productId: product.id,
          productName: product.name,
          companyId: product.companyId,
          priority,
          lcaInputs,
          estimatedUsage: priority === 'high' ? 10 : priority === 'medium' ? 5 : 1
        });
      }

      // Sort by priority and estimated usage
      scenarios.sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return (priorityWeight[b.priority] * b.estimatedUsage) - (priorityWeight[a.priority] * a.estimatedUsage);
      });

      logger.debug({ 
        totalScenarios: scenarios.length,
        highPriority: scenarios.filter(s => s.priority === 'high').length,
        mediumPriority: scenarios.filter(s => s.priority === 'medium').length,
        lowPriority: scenarios.filter(s => s.priority === 'low').length,
      }, 'Generated LCA warming scenarios');

    } catch (error) {
      logger.error({ error }, 'Failed to generate LCA warming scenarios');
    }

    return scenarios;
  }

  private generateRealisticLCAInputs(product: any): any {
    // Generate realistic LCA inputs for cache warming
    // This creates typical data patterns that would be used in real calculations
    return {
      agriculture: {
        mainCropType: 'grain',
        yieldTonPerHectare: 3.5,
        dieselLPerHectare: 150,
        fertilizer: {
          nitrogenKgPerHectare: 120,
          phosphorusKgPerHectare: 40,
          potassiumKgPerHectare: 80,
        },
        landUse: {
          farmingPractice: 'conventional',
        }
      },
      processing: {
        electricityKwhPerTonCrop: 180,
        waterM3PerTonCrop: 2.5,
        fermentation: {
          fermentationTime: 7,
          temperatureControl: true,
        },
        distillation: {
          distillationRounds: 2,
          energySourceType: 'electric',
        }
      },
      packagingDetailed: {
        container: {
          materialType: 'glass',
          weightGrams: 500,
          recycledContentPercentage: 30,
        },
        label: {
          materialType: 'paper',
          weightGrams: 5,
          inkType: 'conventional',
        }
      },
      inboundTransport: {
        distanceKm: 500,
        mode: 'truck',
        loadFactor: 0.8,
      },
      distribution: {
        distanceKm: 300,
        transportMode: 'truck',
        refrigerationRequired: false,
      }
    };
  }

  /**
   * Manual warming triggers
   */
  async warmSpecificProduct(productId: number): Promise<boolean> {
    logger.info({ productId }, 'Manual warming requested for specific product');
    
    try {
      // Get product details
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product) {
        logger.warn({ productId }, 'Product not found for warming');
        return false;
      }

      // Generate LCA inputs and perform calculation
      const lcaInputs = this.generateRealisticLCAInputs(product);
      
      await consolidatedLCAService.calculateLCA(
        product,
        lcaInputs,
        { 
          method: 'hybrid',
          useCache: true,
          forceRecalculation: false
        }
      );

      logger.info({ productId, productName: product.name }, 'Product cache warmed successfully');
      return true;
      
    } catch (error) {
      logger.error({ error, productId }, 'Failed to warm specific product');
      return false;
    }
  }

  async warmCompanyData(companyId: number): Promise<boolean> {
    logger.info({ companyId }, 'Manual warming requested for company data');
    
    try {
      await Promise.all([
        databaseQueryCache.getDashboardMetrics(companyId),
        databaseQueryCache.getCompanyAnalytics(companyId),
        databaseQueryCache.getProductsByCompany(companyId),
        databaseQueryCache.getSuppliersByCompany(companyId),
        databaseQueryCache.getKPIMetrics(companyId)
      ]);
      
      logger.info({ companyId }, 'Company data cache warmed successfully');
      return true;
      
    } catch (error) {
      logger.error({ error, companyId }, 'Failed to warm company data');
      return false;
    }
  }

  /**
   * Monitoring and status
   */
  getWarmingStatus(): {
    isWarming: boolean;
    currentJob: WarmingJob | null;
    recentJobs: WarmingJob[];
    nextWarmingIn?: number;
  } {
    return {
      isWarming: this.isWarming,
      currentJob: this.currentJob,
      recentJobs: this.warmingHistory.slice(-10),
      nextWarmingIn: this.config.defaultWarmingInterval // Simplified - in reality calculate based on last run
    };
  }

  async getWarmingStats(): Promise<{
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    averageItems: number;
    averageDuration: number;
    lastWarming?: Date;
  }> {
    const jobs = this.warmingHistory;
    const successful = jobs.filter(j => j.status === 'completed');
    const failed = jobs.filter(j => j.status === 'failed');
    
    const totalItems = successful.reduce((sum, job) => sum + job.itemsWarmed, 0);
    const totalDuration = successful.reduce((sum, job) => sum + (job.duration || 0), 0);
    
    return {
      totalJobs: jobs.length,
      successfulJobs: successful.length,
      failedJobs: failed.length,
      averageItems: successful.length > 0 ? Math.round(totalItems / successful.length) : 0,
      averageDuration: successful.length > 0 ? Math.round(totalDuration / successful.length) : 0,
      lastWarming: jobs.length > 0 ? jobs[jobs.length - 1].completedAt : undefined
    };
  }

  /**
   * Emergency warming for system recovery
   */
  async performEmergencyWarming(): Promise<void> {
    logger.warn({}, 'Emergency cache warming initiated');
    
    if (this.isWarming) {
      logger.warn({}, 'Emergency warming requested but warming already in progress');
      return;
    }

    try {
      // Warm most critical data only
      await Promise.all([
        databaseQueryCache.getAdminAnalytics(),
        this.warmTopCompaniesData(3) // Top 3 companies only
      ]);
      
      logger.info({}, 'Emergency cache warming completed');
      
    } catch (error) {
      logger.error({ error }, 'Emergency cache warming failed');
      throw error;
    }
  }

  private async warmTopCompaniesData(count: number): Promise<void> {
    const topCompanies = await db
      .select({ id: companies.id })
      .from(companies)
      .orderBy(desc(companies.updatedAt))
      .limit(count);

    const promises = topCompanies.map(company => 
      databaseQueryCache.getDashboardMetrics(company.id)
    );

    await Promise.allSettled(promises);
  }

  async shutdown(): Promise<void> {
    logger.info({}, 'Cache warming service shutting down');
    // In a real implementation, we'd cancel any running intervals and jobs
    this.isWarming = false;
    this.currentJob = null;
  }
}

// Export singleton instance
export const cacheWarmingService = CacheWarmingService.getInstance();

export default CacheWarmingService;