import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { SimpleJobQueue } from './SimpleJobQueue';

export interface BulkImportJob {
  id: string;
  type: 'url' | 'pdf';
  source: string; // URL or file path
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: BulkImportResult;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface BulkImportResult {
  success: boolean;
  supplierData: any;
  productsData: any[];
  totalProducts: number;
  error?: string;
}

export interface ExtractedSupplierData {
  companyName: string;
  supplierType?: string;
  description?: string;
  address?: string;
  website?: string;
  email?: string;
  phone?: string;
}

export interface ExtractedProductData {
  productName: string;
  description?: string;
  materialType?: string;
  weight?: number;
  weightUnit?: string;
  dimensions?: {
    height?: number;
    width?: number;
    depth?: number;
    diameter?: number;
    unit?: string;
  };
  recycledContent?: number;
  capacity?: number;
  capacityUnit?: string;
  color?: string;
  certifications?: string[];
  price?: number;
  currency?: string;
  sku?: string;
  productImage?: string;
  additionalImages?: string[];
  sourceUrl?: string;
}

class BulkImportService {
  private jobs: Map<string, BulkImportJob> = new Map();
  private jobQueue: SimpleJobQueue;

  constructor() {
    this.jobQueue = new SimpleJobQueue();
  }

  async startUrlImport(url: string): Promise<string> {
    const jobId = this.generateJobId();
    
    const job: BulkImportJob = {
      id: jobId,
      type: 'url',
      source: url,
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    };

    this.jobs.set(jobId, job);

    // Add to job queue
    this.jobQueue.addJob(jobId, async () => {
      await this.processUrlImport(jobId, url);
    });

    return jobId;
  }

  async startPdfImport(filePath: string): Promise<string> {
    const jobId = this.generateJobId();
    
    const job: BulkImportJob = {
      id: jobId,
      type: 'pdf',
      source: filePath,
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    };

    this.jobs.set(jobId, job);

    // Add to job queue
    this.jobQueue.addJob(jobId, async () => {
      await this.processPdfImport(jobId, filePath);
    });

    return jobId;
  }

  private async processUrlImport(jobId: string, url: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      job.progress = 10;

      const pythonScript = path.join(process.cwd(), 'server', 'python_services', 'simple_web_crawler.py');
      
      const result = await this.runPythonScript(pythonScript, [url]);
      
      job.progress = 90;

      if (result.success) {
        job.result = {
          success: true,
          supplierData: result.supplierData,
          productsData: result.productsData || [],
          totalProducts: result.totalProducts || 0
        };
        job.status = 'completed';
        job.progress = 100;
      } else {
        throw new Error(result.error || 'URL import failed');
      }

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.progress = 0;
    } finally {
      job.completedAt = new Date();
    }
  }

  private async processPdfImport(jobId: string, filePath: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      job.progress = 10;

      // Verify file exists
      await fs.access(filePath);

      const pythonScript = path.join(process.cwd(), 'server', 'python_services', 'bulk_pdf_extractor.py');
      
      const result = await this.runPythonScript(pythonScript, [filePath]);
      
      job.progress = 90;

      if (result.success) {
        job.result = {
          success: true,
          supplierData: result.supplierData,
          productsData: result.productsData || [],
          totalProducts: result.totalProducts || 0
        };
        job.status = 'completed';
        job.progress = 100;
      } else {
        throw new Error(result.error || 'PDF import failed');
      }

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.progress = 0;
    } finally {
      job.completedAt = new Date();
      
      // Clean up uploaded file on completion/failure
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.warn('Failed to clean up uploaded file:', filePath);
      }
    }
  }

  private async runPythonScript(scriptPath: string, args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [scriptPath, ...args]);
      
      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (parseError) {
            reject(new Error(`Failed to parse Python script output: ${parseError}`));
          }
        } else {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python script: ${error.message}`));
      });

      // Set timeout for long-running processes
      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Python script timed out after 5 minutes'));
      }, 5 * 60 * 1000); // 5 minutes
    });
  }

  getJob(jobId: string): BulkImportJob | undefined {
    return this.jobs.get(jobId);
  }

  getJobStatus(jobId: string): { status: string; progress: number; error?: string } | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    return {
      status: job.status,
      progress: job.progress,
      error: job.error
    };
  }

  getJobResult(jobId: string): BulkImportResult | null {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'completed' || !job.result) return null;

    return job.result;
  }

  // Clean up old jobs (older than 24 hours)
  cleanupOldJobs(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.createdAt < cutoff) {
        this.jobs.delete(jobId);
      }
    }
  }

  private generateJobId(): string {
    return 'bulk-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  // Validation helpers
  validateSupplierData(data: any): ExtractedSupplierData | null {
    if (!data || typeof data !== 'object') return null;
    
    // Require at least company name
    if (!data.companyName || typeof data.companyName !== 'string') return null;

    return {
      companyName: data.companyName.trim(),
      supplierType: data.supplierType || 'Packaging',
      description: data.description || undefined,
      address: data.address || undefined,
      website: data.website || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined
    };
  }

  validateProductData(data: any): ExtractedProductData | null {
    if (!data || typeof data !== 'object') return null;
    
    // Require at least product name
    if (!data.productName || typeof data.productName !== 'string') return null;

    const product: ExtractedProductData = {
      productName: data.productName.trim(),
      description: data.description || undefined,
      materialType: data.materialType || undefined,
      weight: typeof data.weight === 'number' ? data.weight : undefined,
      weightUnit: data.weightUnit || undefined,
      capacity: typeof data.capacity === 'number' ? data.capacity : undefined,
      capacityUnit: data.capacityUnit || undefined,
      color: data.color || undefined,
      sku: data.sku || undefined,
      productImage: data.productImage || undefined,
      sourceUrl: data.sourceUrl || undefined
    };

    // Handle dimensions
    if (data.dimensions && typeof data.dimensions === 'object') {
      product.dimensions = {
        height: typeof data.dimensions.height === 'number' ? data.dimensions.height : undefined,
        width: typeof data.dimensions.width === 'number' ? data.dimensions.width : undefined,
        depth: typeof data.dimensions.depth === 'number' ? data.dimensions.depth : undefined,
        diameter: typeof data.dimensions.diameter === 'number' ? data.dimensions.diameter : undefined,
        unit: data.dimensions.unit || 'mm'
      };
    }

    // Handle recycled content
    if (typeof data.recycledContent === 'number') {
      product.recycledContent = Math.max(0, Math.min(100, data.recycledContent));
    }

    // Handle additional images
    if (Array.isArray(data.additionalImages)) {
      product.additionalImages = data.additionalImages.filter(img => typeof img === 'string');
    }

    // Handle certifications
    if (Array.isArray(data.certifications)) {
      product.certifications = data.certifications.filter(cert => typeof cert === 'string');
    }

    return product;
  }
}

export const bulkImportService = new BulkImportService();

// Clean up old jobs every hour
setInterval(() => {
  bulkImportService.cleanupOldJobs();
}, 60 * 60 * 1000);