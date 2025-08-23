import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UnifiedJobQueueService, jobQueueService } from '../../server/services/UnifiedJobQueueService';
import type { PDFJobData, LCAJobData, DataExtractionJobData, ReportExportJobData } from '../../server/services/UnifiedJobQueueService';

// Mock Bull queue
const mockJob = {
  id: 'mock-job-id',
  data: { jobId: 'test-job-1', type: 'pdf_generation' },
  progress: vi.fn(),
  getState: vi.fn().mockResolvedValue('completed'),
  remove: vi.fn().mockResolvedValue(true),
  timestamp: Date.now() - 5000,
  processedOn: Date.now() - 1000,
  attemptsMade: 1,
  returnvalue: 'mock-result',
  failedReason: null,
};

const mockQueue = {
  add: vi.fn().mockResolvedValue(mockJob),
  process: vi.fn(),
  getJobs: vi.fn().mockResolvedValue([mockJob]),
  getWaiting: vi.fn().mockResolvedValue([]),
  getActive: vi.fn().mockResolvedValue([]),
  getCompleted: vi.fn().mockResolvedValue([]),
  getFailed: vi.fn().mockResolvedValue([]),
  getDelayed: vi.fn().mockResolvedValue([]),
  close: vi.fn().mockResolvedValue(true),
  on: vi.fn(),
};

vi.mock('bull', () => ({
  default: vi.fn().mockImplementation(() => mockQueue),
}));

// Mock external services
vi.mock('../../server/services/UnifiedPDFService', () => ({
  unifiedPDFService: {
    exportReport: vi.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
  },
}));

vi.mock('../../server/services/UnifiedLCAService', () => ({
  unifiedLCAService: {
    calculateLCA: vi.fn().mockResolvedValue({
      totalCarbonFootprint: 100,
      totalWaterFootprint: 1000,
      breakdown: { agriculture: 50, processing: 30, packaging: 20 },
    }),
  },
}));

vi.mock('../../server/storage', () => ({
  storage: {
    getProductById: vi.fn().mockResolvedValue({
      id: 1,
      name: 'Test Product',
      companyId: 1,
    }),
    getReportById: vi.fn().mockResolvedValue({
      id: 1,
      title: 'Test Report',
      content: { section1: 'data' },
    }),
  },
}));

vi.mock('../../server/config/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('UnifiedJobQueueService', () => {
  let service: UnifiedJobQueueService;

  const mockPDFJobData: PDFJobData = {
    type: 'pdf_generation',
    jobId: 'pdf-job-1',
    userId: 'user-1',
    reportData: {
      id: 'report-1',
      title: 'Test Report',
      content: { section1: 'data' },
    },
    format: 'pdf',
    options: {},
  };

  const mockLCAJobData: LCAJobData = {
    type: 'lca_calculation',
    jobId: 'lca-job-1',
    userId: 'user-1',
    productId: 1,
    calculationMethod: 'enhanced',
    options: {
      includeTransport: true,
      includeProcessing: true,
    },
  };

  const mockDataExtractionJobData: DataExtractionJobData = {
    type: 'data_extraction',
    jobId: 'extraction-job-1',
    userId: 'user-1',
    extractionType: 'pdf',
    sourceUrl: 'https://example.com/data.pdf',
    targetFields: ['company_name', 'emissions'],
  };

  const mockReportExportJobData: ReportExportJobData = {
    type: 'report_export',
    jobId: 'export-job-1',
    userId: 'user-1',
    reportId: '1',
    exportFormat: 'pdf',
    options: {},
  };

  beforeEach(async () => {
    service = UnifiedJobQueueService.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = UnifiedJobQueueService.getInstance();
      const instance2 = UnifiedJobQueueService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return the same instance as the exported singleton', () => {
      const instance = UnifiedJobQueueService.getInstance();
      expect(instance).toBe(jobQueueService);
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await service.initialize();
      expect(mockQueue.process).toHaveBeenCalled();
      expect(mockQueue.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockQueue.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });

    it('should handle Redis connection errors gracefully', async () => {
      const Bull = await import('bull');
      (Bull.default as any).mockImplementationOnce(() => {
        throw new Error('Redis connection failed');
      });

      // Should not throw, but fall back to in-memory processing
      await expect(service.initialize()).resolves.not.toThrow();
    });

    it('should not reinitialize if already initialized', async () => {
      await service.initialize();
      const callCount = mockQueue.process.mock.calls.length;
      
      await service.initialize();
      expect(mockQueue.process).toHaveBeenCalledTimes(callCount);
    });
  });

  describe('Job Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should add PDF generation job successfully', async () => {
      const jobId = await service.addJob(mockPDFJobData);
      
      expect(jobId).toBe(mockPDFJobData.jobId);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'pdf_generation',
        expect.objectContaining({
          type: 'pdf_generation',
          jobId: mockPDFJobData.jobId,
          userId: 'user-1',
        }),
        expect.objectContaining({
          priority: 0,
          attempts: 3,
        })
      );
    });

    it('should add LCA calculation job successfully', async () => {
      const jobId = await service.addJob(mockLCAJobData);
      
      expect(jobId).toBe(mockLCAJobData.jobId);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'lca_calculation',
        expect.objectContaining({
          type: 'lca_calculation',
          productId: 1,
        }),
        expect.any(Object)
      );
    });

    it('should add data extraction job successfully', async () => {
      const jobId = await service.addJob(mockDataExtractionJobData);
      
      expect(jobId).toBe(mockDataExtractionJobData.jobId);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'data_extraction',
        expect.objectContaining({
          type: 'data_extraction',
          extractionType: 'pdf',
        }),
        expect.any(Object)
      );
    });

    it('should add report export job successfully', async () => {
      const jobId = await service.addJob(mockReportExportJobData);
      
      expect(jobId).toBe(mockReportExportJobData.jobId);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'report_export',
        expect.objectContaining({
          type: 'report_export',
          reportId: '1',
        }),
        expect.any(Object)
      );
    });

    it('should generate job ID if not provided', async () => {
      const jobDataWithoutId = { ...mockPDFJobData };
      delete (jobDataWithoutId as any).jobId;
      
      const jobId = await service.addJob(jobDataWithoutId);
      
      expect(jobId).toMatch(/^pdf_generation_\d+_[a-z0-9]+$/);
    });

    it('should handle custom job options', async () => {
      const customOptions = {
        priority: 10,
        delay: 5000,
        attempts: 5,
      };
      
      await service.addJob(mockPDFJobData, customOptions);
      
      expect(mockQueue.add).toHaveBeenCalledWith(
        'pdf_generation',
        expect.any(Object),
        expect.objectContaining(customOptions)
      );
    });
  });

  describe('Job Status', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should get job status successfully', async () => {
      const status = await service.getJobStatus('pdf_generation', 'test-job-1');
      
      expect(status.status).toBe('completed');
      expect(status.progress).toBeDefined();
      expect(mockQueue.getJobs).toHaveBeenCalledWith(['waiting', 'active', 'completed', 'failed']);
    });

    it('should return not_found for non-existent job', async () => {
      mockQueue.getJobs.mockResolvedValueOnce([]);
      
      const status = await service.getJobStatus('pdf_generation', 'non-existent-job');
      
      expect(status.status).toBe('not_found');
      expect(status.progress).toBe(0);
    });

    it('should handle errors when getting job status', async () => {
      mockQueue.getJobs.mockRejectedValueOnce(new Error('Queue error'));
      
      const status = await service.getJobStatus('pdf_generation', 'test-job-1');
      
      expect(status.status).toBe('error');
      expect(status.error).toBe('Queue error');
    });
  });

  describe('Job Cancellation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should cancel job successfully', async () => {
      const cancelled = await service.cancelJob('pdf_generation', 'test-job-1');
      
      expect(cancelled).toBe(true);
      expect(mockJob.remove).toHaveBeenCalled();
    });

    it('should return false for non-existent job', async () => {
      mockQueue.getJobs.mockResolvedValueOnce([]);
      
      const cancelled = await service.cancelJob('pdf_generation', 'non-existent-job');
      
      expect(cancelled).toBe(false);
    });

    it('should handle errors during cancellation', async () => {
      mockQueue.getJobs.mockRejectedValueOnce(new Error('Queue error'));
      
      const cancelled = await service.cancelJob('pdf_generation', 'test-job-1');
      
      expect(cancelled).toBe(false);
    });
  });

  describe('Queue Statistics', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should get queue statistics successfully', async () => {
      const stats = await service.getQueueStats();
      
      expect(stats).toHaveProperty('pdf_generation');
      expect(stats).toHaveProperty('lca_calculation');
      expect(stats).toHaveProperty('data_extraction');
      expect(stats).toHaveProperty('report_export');
      
      Object.values(stats).forEach(queueStats => {
        expect(queueStats).toHaveProperty('waiting');
        expect(queueStats).toHaveProperty('active');
        expect(queueStats).toHaveProperty('completed');
        expect(queueStats).toHaveProperty('failed');
        expect(queueStats).toHaveProperty('delayed');
      });
    });

    it('should handle errors when getting statistics', async () => {
      mockQueue.getWaiting.mockRejectedValueOnce(new Error('Queue error'));
      
      const stats = await service.getQueueStats();
      
      expect(stats.pdf_generation).toEqual({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      });
    });
  });

  describe('Job Processing', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should process PDF generation job', async () => {
      // Test the job processor directly
      const processor = mockQueue.process.mock.calls[0][1];
      const mockJobInstance = {
        data: mockPDFJobData,
        progress: vi.fn(),
        processedOn: Date.now(),
        timestamp: Date.now() - 1000,
        attemptsMade: 1,
      };
      
      const result = await processor(mockJobInstance);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Buffer);
      expect(mockJobInstance.progress).toHaveBeenCalledWith(10);
      expect(mockJobInstance.progress).toHaveBeenCalledWith(100);
    });

    it('should process LCA calculation job', async () => {
      const processor = mockQueue.process.mock.calls[1][1]; // LCA processor
      const mockJobInstance = {
        data: mockLCAJobData,
        progress: vi.fn(),
        processedOn: Date.now(),
        timestamp: Date.now() - 1000,
        attemptsMade: 1,
      };
      
      const result = await processor(mockJobInstance);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('totalCarbonFootprint');
    });

    it('should handle job processing errors', async () => {
      const { unifiedPDFService } = await import('../../server/services/UnifiedPDFService');
      (unifiedPDFService.exportReport as any).mockRejectedValueOnce(new Error('PDF generation failed'));
      
      const processor = mockQueue.process.mock.calls[0][1];
      const mockJobInstance = {
        data: mockPDFJobData,
        progress: vi.fn(),
        processedOn: Date.now(),
        timestamp: Date.now() - 1000,
        attemptsMade: 1,
      };
      
      const result = await processor(mockJobInstance);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('PDF generation failed');
    });
  });

  describe('Fallback Processing', () => {
    it('should process jobs immediately when queue is not available', async () => {
      // Don't initialize the service to simulate missing queue
      const jobId = await service.addJob(mockPDFJobData);
      
      expect(jobId).toBe(mockPDFJobData.jobId);
      // Should not call queue.add since queue is not available
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      await service.initialize();
      await service.shutdown();
      
      expect(mockQueue.close).toHaveBeenCalled();
    });

    it('should handle shutdown errors gracefully', async () => {
      await service.initialize();
      mockQueue.close.mockRejectedValueOnce(new Error('Shutdown error'));
      
      await expect(service.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Legacy Compatibility', () => {
    it('should export lcaCalculationQueue for backward compatibility', () => {
      const { lcaCalculationQueue } = require('../../server/services/UnifiedJobQueueService');
      expect(lcaCalculationQueue).toBe(jobQueueService);
    });
  });
});