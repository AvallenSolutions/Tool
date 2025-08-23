import { Job } from 'bull';
import { logger } from '../config/logger';
import { traceLCACalculation } from '../monitoring/telemetry';
import { recordLCACalculation } from '../monitoring/metrics';
import { LCACalculationCore } from '../services/LCACalculationCore';
import { redisLCACacheService } from '../services/RedisLCACacheService';
import type { JobData } from '../services/UnifiedJobQueueService';

/**
 * LCA Calculation Job Processor
 * Handles background LCA calculation tasks with caching
 */
export async function lcaCalculationProcessor(job: Job<JobData>): Promise<any> {
  const { data } = job;
  const startTime = Date.now();

  logger.info({
    jobId: data.jobId,
    userId: data.userId,
    productId: data.productId,
    calculationMethod: data.calculationOptions?.method,
  }, 'Processing LCA calculation job');

  try {
    const result = await traceLCACalculation(
      data.calculationOptions?.method || 'enhanced',
      data.productId || 'unknown',
      data.userId,
      async () => {
        // Check cache first
        const factorVersion = data.factorVersion || 'DEFRA_2024';
        const cachedResult = await redisLCACacheService.get(
          data.lcaInputs,
          data.calculationOptions || { method: 'enhanced' },
          factorVersion
        );

        let cacheHit = false;
        let calculationResult;

        if (cachedResult) {
          calculationResult = cachedResult;
          cacheHit = true;
          
          logger.info({
            jobId: data.jobId,
            productId: data.productId,
            factorVersion,
          }, 'LCA calculation served from cache');
        } else {
          // Perform calculation using core engine
          const lcaCore = new LCACalculationCore();
          calculationResult = lcaCore.calculate(
            data.lcaInputs,
            data.calculationOptions || { method: 'enhanced' }
          );

          // Cache the result
          await redisLCACacheService.set(
            data.lcaInputs,
            data.calculationOptions || { method: 'enhanced' },
            calculationResult,
            factorVersion
          );

          logger.info({
            jobId: data.jobId,
            productId: data.productId,
            factorVersion,
            totalCarbonFootprint: calculationResult.totalCarbonFootprint,
          }, 'LCA calculation completed and cached');
        }

        return {
          ...calculationResult,
          cacheHit,
          factorVersion,
          calculationId: data.jobId,
        };
      }
    );

    const duration = Date.now() - startTime;

    // Record metrics
    recordLCACalculation(
      data.calculationOptions?.method || 'enhanced',
      duration,
      result.cacheHit,
      true,
      data.userId
    );

    logger.info({
      jobId: data.jobId,
      userId: data.userId,
      productId: data.productId,
      duration,
      cacheHit: result.cacheHit,
      totalCarbonFootprint: result.totalCarbonFootprint,
    }, 'LCA calculation job completed successfully');

    return {
      success: true,
      result,
      duration,
    };

  } catch (error) {
    const duration = Date.now() - startTime;

    // Record failure metrics
    recordLCACalculation(
      data.calculationOptions?.method || 'enhanced',
      duration,
      false,
      false,
      data.userId
    );

    logger.error({
      error,
      jobId: data.jobId,
      userId: data.userId,
      productId: data.productId,
      duration,
    }, 'LCA calculation job failed');

    throw error;
  }
}

export default lcaCalculationProcessor;