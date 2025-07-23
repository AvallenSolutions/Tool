import fs from 'fs';
import path from 'path';
import { EnhancedPDFService } from '../services/EnhancedPDFService';
import { ReportDataProcessor } from '../services/ReportDataProcessor';

// Simple in-memory job queue for development
class SimpleJobQueue {
  private jobs: Map<string, any> = new Map();
  private jobIdCounter = 1;

  async add(jobType: string, data: any): Promise<{ id: string }> {
    const jobId = `job_${this.jobIdCounter++}`;
    const job = { id: jobId, type: jobType, data, status: 'queued', progress: 0 };
    this.jobs.set(jobId, job);
    
    // Process job immediately in development
    setTimeout(() => this.processJob(jobId), 100);
    
    return { id: jobId };
  }

  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      const result = await EnhancedReportJobProcessor.processEnhancedReport({
        data: job.data,
        progress: (percent: number) => {
          job.progress = percent;
        }
      } as any);
      
      job.status = 'completed';
      job.result = result;
      console.log(`✅ Job ${jobId} completed successfully`);
    } catch (error) {
      job.status = 'failed';
      job.error = error;
      console.error(`❌ Job ${jobId} failed:`, error);
    }
  }

  getJob(jobId: string) {
    return this.jobs.get(jobId);
  }
}

const simpleQueue = new SimpleJobQueue();

export interface EnhancedReportJobData {
  reportId: number;
  userId: string;
}

export class EnhancedReportJobProcessor {
  private static pdfService = new EnhancedPDFService();

  static async processEnhancedReport(job: any): Promise<string> {
    const { reportId, userId } = job.data;
    
    try {
      // Update status to generating
      await ReportDataProcessor.updateReportStatus(reportId, 'generating');
      job.progress(20);

      // Aggregate all necessary data
      console.log(`🔄 Aggregating data for enhanced report ${reportId}...`);
      const reportData = await ReportDataProcessor.aggregateReportData(reportId);
      job.progress(40);

      // Generate the enhanced PDF
      console.log(`🔄 Generating enhanced PDF for report ${reportId}...`);
      const pdfBuffer = await this.pdfService.generateEnhancedLCAPDF(reportData);
      job.progress(80);

      // Save the PDF file
      const fileName = `enhanced_lca_report_${reportId}_${Date.now()}.pdf`;
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      // Ensure uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, pdfBuffer);
      
      const relativePath = `uploads/${fileName}`;
      job.progress(90);

      // Update report status to completed
      await ReportDataProcessor.updateReportStatus(reportId, 'completed', relativePath);
      job.progress(100);

      console.log(`✅ Enhanced report ${reportId} generated successfully: ${relativePath}`);
      return relativePath;

    } catch (error) {
      console.error(`❌ Error generating enhanced report ${reportId}:`, error);
      await ReportDataProcessor.updateReportStatus(reportId, 'failed');
      throw error;
    }
  }
}

// Export the simple queue for development
export const enhancedReportQueue = simpleQueue;