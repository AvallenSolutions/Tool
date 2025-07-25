interface Job {
  id: string;
  task: () => Promise<void>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: Error;
}

export class SimpleJobQueue {
  private jobs: Map<string, Job> = new Map();
  private isProcessing = false;

  addJob(id: string, task: () => Promise<void>): void {
    const job: Job = {
      id,
      task,
      status: 'pending'
    };
    
    this.jobs.set(id, job);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;
    
    while (this.getPendingJobs().length > 0) {
      const job = this.getPendingJobs()[0];
      if (!job) break;
      
      job.status = 'processing';
      
      try {
        await job.task();
        job.status = 'completed';
      } catch (error) {
        job.status = 'failed';
        job.error = error instanceof Error ? error : new Error('Unknown error');
        console.error(`Job ${job.id} failed:`, error);
      }
    }
    
    this.isProcessing = false;
  }

  private getPendingJobs(): Job[] {
    return Array.from(this.jobs.values()).filter(job => job.status === 'pending');
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  getJobStatus(id: string): string | undefined {
    const job = this.jobs.get(id);
    return job?.status;
  }

  // Clean up old jobs periodically
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    for (const [id, job] of this.jobs.entries()) {
      // For simplicity, we'll remove completed/failed jobs older than maxAge
      if (['completed', 'failed'].includes(job.status)) {
        this.jobs.delete(id);
      }
    }
  }
}