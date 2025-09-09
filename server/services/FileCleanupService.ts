import fs from 'fs/promises';
import path from 'path';
import { logger } from '../config/logger';

export class FileCleanupService {
  private static readonly TEMP_DIR = path.join(process.cwd(), 'temp');
  private static readonly MAX_FILE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Initialize temp directory and start cleanup scheduler
   */
  static async initialize(): Promise<void> {
    try {
      // Ensure temp directory exists
      await fs.mkdir(FileCleanupService.TEMP_DIR, { recursive: true });
      
      // Start cleanup scheduler (runs every hour)
      setInterval(() => {
        FileCleanupService.cleanupOldFiles().catch(error => {
          logger.error({ error }, 'Scheduled file cleanup failed');
        });
      }, 60 * 60 * 1000); // 1 hour
      
      // Run initial cleanup
      await FileCleanupService.cleanupOldFiles();
      
      logger.info({ tempDir: FileCleanupService.TEMP_DIR }, 'File cleanup service initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize file cleanup service');
    }
  }

  /**
   * Clean up old temporary files
   */
  static async cleanupOldFiles(): Promise<void> {
    try {
      const files = await fs.readdir(FileCleanupService.TEMP_DIR);
      const now = Date.now();
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(FileCleanupService.TEMP_DIR, file);
        
        try {
          const stats = await fs.stat(filePath);
          const age = now - stats.mtime.getTime();

          if (age > FileCleanupService.MAX_FILE_AGE_MS) {
            await fs.unlink(filePath);
            cleanedCount++;
            logger.debug({ file, age: Math.round(age / 1000 / 60) }, 'Cleaned up old file');
          }
        } catch (error) {
          logger.warn({ file, error }, 'Failed to process file during cleanup');
        }
      }

      if (cleanedCount > 0) {
        logger.info({ cleanedCount }, 'File cleanup completed');
      }
    } catch (error) {
      logger.error({ error }, 'File cleanup failed');
    }
  }

  /**
   * Clean up specific file
   */
  static async cleanupFile(filename: string): Promise<void> {
    try {
      const filePath = path.join(FileCleanupService.TEMP_DIR, filename);
      await fs.unlink(filePath);
      logger.info({ filename }, 'File cleaned up manually');
    } catch (error) {
      logger.warn({ filename, error }, 'Manual file cleanup failed');
    }
  }

  /**
   * Get temp directory path
   */
  static getTempDir(): string {
    return FileCleanupService.TEMP_DIR;
  }
}