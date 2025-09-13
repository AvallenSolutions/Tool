import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConsolidatedPDFService, consolidatedPDFService } from '../../server/services/ConsolidatedPDFService';
import type { ReportData, LCAReportData, PDFGenerationOptions } from '../../server/services/ConsolidatedPDFService';

// Mock external dependencies
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        setContent: vi.fn(),
        pdf: vi.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
      }),
      close: vi.fn(),
    }),
  },
}));

vi.mock('html-pdf-node', () => ({
  generatePdf: vi.fn().mockResolvedValue(Buffer.from('mock-html-pdf-content')),
}));

vi.mock('jszip', () => ({
  default: vi.fn().mockImplementation(() => ({
    file: vi.fn(),
    generateAsync: vi.fn().mockResolvedValue(Buffer.from('mock-zip-content')),
  })),
}));

vi.mock('../../server/config/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ConsolidatedPDFService', () => {
  let service: ConsolidatedPDFService;
  
  const mockReportData: ReportData = {
    id: 'test-report-1',
    title: 'Test Sustainability Report',
    content: {
      'Executive Summary': 'This is a test report for sustainability metrics.',
      'Environmental Impact': 'Carbon footprint: 100 kg CO2e, Water usage: 1000L',
    },
    companyName: 'Test Company',
    metrics: {
      co2e: 100,
      water: 1000,
      waste: 50,
    },
  };

  const mockLCAData: LCAReportData = {
    product: {
      id: 1,
      name: 'Test Product',
      sku: 'TEST-001',
      volume: '750ml',
    },
    company: {
      name: 'Test Company',
      industry: 'beverages',
      size: 'small',
      country: 'United Kingdom',
    },
    lcaResults: {
      totalCarbonFootprint: 2.45,
      totalWaterFootprint: 125.8,
      impactsByCategory: [
        { category: 'Climate Change', impact: 2.45, unit: 'kg CO2e' },
      ],
    },
  };

  beforeEach(() => {
    service = ConsolidatedPDFService.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ConsolidatedPDFService.getInstance();
      const instance2 = ConsolidatedPDFService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return the same instance as the exported singleton', () => {
      const instance = ConsolidatedPDFService.getInstance();
      expect(instance).toBe(consolidatedPDFService);
    });
  });

  describe('generatePDF', () => {
    it('should generate basic PDF successfully', async () => {
      const options: PDFGenerationOptions = { type: 'basic' };
      const result = await service.generatePDF(mockReportData, options);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate modern PDF with styling', async () => {
      const options: PDFGenerationOptions = { 
        type: 'modern',
        branding: { companyName: 'Test Company', primaryColor: '#10b981' }
      };
      const result = await service.generatePDF(mockReportData, options);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate comprehensive PDF with HTML conversion', async () => {
      const options: PDFGenerationOptions = { type: 'comprehensive' };
      const result = await service.generatePDF(mockReportData, options);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle LCA data input', async () => {
      const options: PDFGenerationOptions = { type: 'professional' };
      const result = await service.generatePDF(mockLCAData, options);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should throw error for unsupported PDF type', async () => {
      const options: PDFGenerationOptions = { type: 'unsupported' as any };
      
      await expect(service.generatePDF(mockReportData, options))
        .rejects.toThrow('Unsupported PDF type: unsupported');
    });

    it('should apply custom margins and format', async () => {
      const options: PDFGenerationOptions = {
        type: 'basic',
        format: 'letter',
        margins: { top: 100, bottom: 100, left: 100, right: 100 }
      };
      
      const result = await service.generatePDF(mockReportData, options);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('exportReport', () => {
    it('should export PDF format', async () => {
      const result = await service.exportReport(mockReportData, 'pdf');
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should export branded PDF format', async () => {
      const exportOptions = {
        branding: { companyName: 'Test Company', primaryColor: '#10b981' }
      };
      const result = await service.exportReport(mockReportData, 'pdf-branded', exportOptions);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should export PowerPoint format (fallback to PDF)', async () => {
      const result = await service.exportReport(mockReportData, 'pptx');
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should export web format as ZIP', async () => {
      const result = await service.exportReport(mockReportData, 'web');
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should throw error for unsupported export format', async () => {
      await expect(service.exportReport(mockReportData, 'unsupported'))
        .rejects.toThrow('Unsupported export format: unsupported');
    });
  });

  describe('Legacy Compatibility Methods', () => {
    it('should support generateSustainabilityReport', async () => {
      const result = await service.generateSustainabilityReport(mockReportData);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should support generateLCAPDF', async () => {
      const result = await service.generateLCAPDF(mockLCAData);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should support generateEnhancedLCAPDF', async () => {
      const result = await service.generateEnhancedLCAPDF(mockLCAData);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('Error Handling', () => {
    it('should handle PDF generation errors gracefully', async () => {
      // Mock an error in PDF generation
      vi.doMock('pdfkit', () => {
        throw new Error('PDFKit initialization failed');
      });

      await expect(service.generatePDF(mockReportData, { type: 'basic' }))
        .rejects.toThrow();
    });

    it('should fallback from Puppeteer to html-pdf-node on error', async () => {
      // Mock Puppeteer to fail
      const mockPuppeteer = await import('puppeteer');
      (mockPuppeteer.default.launch as any).mockRejectedValueOnce(new Error('Puppeteer failed'));

      const result = await service.generatePDF(mockReportData, { type: 'comprehensive' });
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('Content Generation', () => {
    it('should generate appropriate HTML content for reports', async () => {
      const options: PDFGenerationOptions = { type: 'comprehensive' };
      // This would test the private HTML generation methods indirectly
      const result = await service.generatePDF(mockReportData, options);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle empty content gracefully', async () => {
      const emptyReportData: ReportData = {
        id: 'empty-report',
        title: 'Empty Report',
        content: {},
      };
      
      const result = await service.generatePDF(emptyReportData, { type: 'basic' });
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle missing metrics gracefully', async () => {
      const reportWithoutMetrics: ReportData = {
        id: 'no-metrics-report',
        title: 'Report Without Metrics',
        content: { section1: 'Some content' },
      };
      
      const result = await service.generatePDF(reportWithoutMetrics, { type: 'modern' });
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('Static PDFService Compatibility', () => {
    it('should support static generateLCAPDF method', async () => {
      const { PDFService } = await import('../../server/services/ConsolidatedPDFService');
      const result = await PDFService.generateLCAPDF(mockLCAData);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should support static generateSustainabilityReport method', async () => {
      const { PDFService } = await import('../../server/services/ConsolidatedPDFService');
      const result = await PDFService.generateSustainabilityReport(mockReportData, mockReportData.company);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should support instance generateFromHTML method', async () => {
      const { PDFService } = await import('../../server/services/ConsolidatedPDFService');
      const result = await consolidatedPDFService.generateFromHTML('<html><body><h1>Test Report</h1></body></html>', { title: 'Test' });
      
      expect(result).toBeInstanceOf(Buffer);
    });
  });
});