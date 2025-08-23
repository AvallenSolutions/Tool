import { Job } from 'bull';
import { logger } from '../config/logger';
import { tracePDFGeneration } from '../monitoring/telemetry';
import { recordPDFGeneration } from '../monitoring/metrics';
import { streamingPDFService } from '../services/StreamingPDFService';
import type { JobData } from '../services/UnifiedJobQueueService';

/**
 * PDF Generation Job Processor
 * Handles background PDF generation tasks
 */
export async function pdfGenerationProcessor(job: Job<JobData>): Promise<any> {
  const { data } = job;
  const startTime = Date.now();

  logger.info({
    jobId: data.jobId,
    userId: data.userId,
    reportId: data.reportId,
    pdfType: data.pdfOptions?.type,
  }, 'Processing PDF generation job');

  try {
    const result = await tracePDFGeneration(
      data.pdfOptions?.type || 'unknown',
      data.reportId || 'unknown',
      data.userId,
      async () => {
        // Generate PDF using streaming service
        const pdfBuffer = await streamingPDFService.generatePDF(
          data.reportData,
          data.pdfOptions || { type: 'modern' }
        );

        // Store PDF in temporary location or cloud storage
        const pdfPath = await storePDFResult(data.jobId, pdfBuffer);

        return {
          pdfPath,
          size: pdfBuffer.length,
          type: data.pdfOptions?.type || 'modern',
        };
      }
    );

    const duration = Date.now() - startTime;

    // Record metrics
    recordPDFGeneration(
      data.pdfOptions?.type || 'unknown',
      'background',
      duration,
      result.size,
      true,
      data.userId
    );

    logger.info({
      jobId: data.jobId,
      userId: data.userId,
      duration,
      size: result.size,
      pdfPath: result.pdfPath,
    }, 'PDF generation job completed successfully');

    return {
      success: true,
      result,
      duration,
    };

  } catch (error) {
    const duration = Date.now() - startTime;

    // Record failure metrics
    recordPDFGeneration(
      data.pdfOptions?.type || 'unknown',
      'background',
      duration,
      0,
      false,
      data.userId
    );

    logger.error({
      error,
      jobId: data.jobId,
      userId: data.userId,
      duration,
    }, 'PDF generation job failed');

    throw error;
  }
}

/**
 * Store PDF result in temporary location or cloud storage
 */
async function storePDFResult(jobId: string, pdfBuffer: Buffer): Promise<string> {
  const fs = await import('fs').then(m => m.promises);
  const path = await import('path');
  
  // Store in temporary directory
  const tempDir = '/tmp/pdfs';
  await fs.mkdir(tempDir, { recursive: true });
  
  const filename = `${jobId}.pdf`;
  const filepath = path.join(tempDir, filename);
  
  await fs.writeFile(filepath, pdfBuffer);
  
  return filepath;
}

export default pdfGenerationProcessor;