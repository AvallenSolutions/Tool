import puppeteer, { Browser, Page } from 'puppeteer';
import { logger } from '../config/logger';

interface PooledBrowser {
  browser: Browser;
  pages: Page[];
  activePages: number;
  createdAt: Date;
  lastUsed: Date;
}

interface PooledPage {
  page: Page;
  browser: Browser;
  inUse: boolean;
  createdAt: Date;
  lastUsed: Date;
}

/**
 * Browser Pool Service - Manages Puppeteer browser and page instances
 * Eliminates cold start performance issues by maintaining warm browser instances
 */
export class BrowserPoolService {
  private static instance: BrowserPoolService;
  
  private browsers: Map<string, PooledBrowser> = new Map();
  private pages: Map<string, PooledPage> = new Map();
  private isInitialized = false;
  
  // Configuration
  private readonly maxBrowsers = parseInt(process.env.MAX_BROWSERS || '3');
  private readonly maxPagesPerBrowser = parseInt(process.env.MAX_PAGES_PER_BROWSER || '5');
  private readonly browserIdleTimeout = parseInt(process.env.BROWSER_IDLE_TIMEOUT || '300000'); // 5 minutes
  private readonly pageIdleTimeout = parseInt(process.env.PAGE_IDLE_TIMEOUT || '60000'); // 1 minute
  
  // Browser launch options optimized for PDF generation
  private readonly launchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--memory-pressure-off',
      '--max_old_space_size=4096'
    ],
    defaultViewport: {
      width: 1200,
      height: 800,
      deviceScaleFactor: 1,
    },
  };

  constructor() {
    logger.info({}, 'BrowserPoolService created');
  }

  static getInstance(): BrowserPoolService {
    if (!BrowserPoolService.instance) {
      BrowserPoolService.instance = new BrowserPoolService();
    }
    return BrowserPoolService.instance;
  }

  /**
   * Initialize the browser pool with warm instances
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info({ maxBrowsers: this.maxBrowsers }, 'Initializing browser pool');
      
      // Pre-warm one browser to start
      await this.createBrowser();
      
      // Start cleanup intervals
      this.startCleanupIntervals();
      
      this.isInitialized = true;
      logger.info({ 
        browsers: this.browsers.size,
        pages: this.pages.size 
      }, 'Browser pool initialized successfully');

    } catch (error) {
      logger.error({ error }, 'Failed to initialize browser pool');
      throw error;
    }
  }

  /**
   * Get an available page for PDF generation
   */
  async getPage(): Promise<{ page: Page; pageId: string }> {
    await this.ensureInitialized();

    try {
      // Try to find an available page
      for (const [pageId, pooledPage] of this.pages) {
        if (!pooledPage.inUse) {
          pooledPage.inUse = true;
          pooledPage.lastUsed = new Date();
          
          logger.debug({ pageId }, 'Reusing existing page');
          return { page: pooledPage.page, pageId };
        }
      }

      // No available pages, try to create a new one
      const { page, pageId } = await this.createPage();
      
      logger.debug({ pageId }, 'Created new page');
      return { page, pageId };

    } catch (error) {
      logger.error({ error }, 'Failed to get page from pool');
      throw error;
    }
  }

  /**
   * Release a page back to the pool
   */
  async releasePage(pageId: string, shouldReset: boolean = true): Promise<void> {
    const pooledPage = this.pages.get(pageId);
    
    if (!pooledPage) {
      logger.warn({ pageId }, 'Attempted to release unknown page');
      return;
    }

    try {
      if (shouldReset) {
        // Enhanced reset to prevent memory leaks
        await pooledPage.page.goto('about:blank');
        await pooledPage.page.setContent('');
        
        // Clear all cookies and cache
        const client = await pooledPage.page.target().createCDPSession();
        await client.send('Network.clearBrowserCookies');
        await client.send('Network.clearBrowserCache');
        await client.detach();
        
        // Clear JavaScript heap
        await pooledPage.page.evaluateOnNewDocument(() => {
          // Clear any global state
          delete (window as any).__PDF_GENERATION__;
        });
      }

      pooledPage.inUse = false;
      pooledPage.lastUsed = new Date();
      
      logger.debug({ pageId }, 'Released page back to pool');

    } catch (error) {
      logger.warn({ error, pageId }, 'Error resetting page, removing from pool');
      await this.removePage(pageId);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    browsers: { total: number; active: number };
    pages: { total: number; active: number; available: number };
    memory: { usage: number; limit: number };
  } {
    const totalPages = this.pages.size;
    const activePages = Array.from(this.pages.values()).filter(p => p.inUse).length;
    const availablePages = totalPages - activePages;

    const memoryUsage = process.memoryUsage();

    return {
      browsers: {
        total: this.browsers.size,
        active: Array.from(this.browsers.values()).filter(b => b.activePages > 0).length,
      },
      pages: {
        total: totalPages,
        active: activePages,
        available: availablePages,
      },
      memory: {
        usage: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        limit: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      },
    };
  }

  /**
   * Gracefully shutdown all browsers
   */
  async shutdown(): Promise<void> {
    logger.info({}, 'Shutting down browser pool...');

    const shutdownPromises: Promise<void>[] = [];

    // Close all pages
    for (const [pageId, pooledPage] of this.pages) {
      shutdownPromises.push(
        pooledPage.page.close().catch(error => 
          logger.warn({ error, pageId }, 'Error closing page during shutdown')
        )
      );
    }

    // Close all browsers
    for (const [browserId, pooledBrowser] of this.browsers) {
      shutdownPromises.push(
        pooledBrowser.browser.close().catch(error => 
          logger.warn({ error, browserId }, 'Error closing browser during shutdown')
        )
      );
    }

    await Promise.all(shutdownPromises);

    this.pages.clear();
    this.browsers.clear();
    this.isInitialized = false;

    logger.info({}, 'Browser pool shutdown complete');
  }

  /**
   * Private methods
   */
  private async createBrowser(): Promise<string> {
    if (this.browsers.size >= this.maxBrowsers) {
      throw new Error(`Maximum browser limit reached: ${this.maxBrowsers}`);
    }

    const browser = await puppeteer.launch(this.launchOptions);
    const browserId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const pooledBrowser: PooledBrowser = {
      browser,
      pages: [],
      activePages: 0,
      createdAt: new Date(),
      lastUsed: new Date(),
    };

    this.browsers.set(browserId, pooledBrowser);

    // Handle browser disconnection
    browser.on('disconnected', () => {
      logger.warn({ browserId }, 'Browser disconnected, removing from pool');
      this.browsers.delete(browserId);
    });

    logger.info({ browserId, totalBrowsers: this.browsers.size }, 'Created new browser');
    return browserId;
  }

  private async createPage(): Promise<{ page: Page; pageId: string }> {
    // Find browser with available capacity
    let targetBrowser: PooledBrowser | undefined;
    let browserId: string | undefined;

    for (const [id, pooledBrowser] of this.browsers) {
      if (pooledBrowser.pages.length < this.maxPagesPerBrowser) {
        targetBrowser = pooledBrowser;
        browserId = id;
        break;
      }
    }

    // Create new browser if needed
    if (!targetBrowser && this.browsers.size < this.maxBrowsers) {
      browserId = await this.createBrowser();
      targetBrowser = this.browsers.get(browserId);
    }

    if (!targetBrowser || !browserId) {
      throw new Error('No available browser capacity for new page');
    }

    const page = await targetBrowser.browser.newPage();
    const pageId = `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Configure page for PDF generation
    await page.setViewport({
      width: 1200,
      height: 800,
      deviceScaleFactor: 1,
    });

    // Set timeouts
    await page.setDefaultNavigationTimeout(30000);
    await page.setDefaultTimeout(30000);

    const pooledPage: PooledPage = {
      page,
      browser: targetBrowser.browser,
      inUse: true,
      createdAt: new Date(),
      lastUsed: new Date(),
    };

    this.pages.set(pageId, pooledPage);
    targetBrowser.pages.push(page);
    targetBrowser.activePages++;
    targetBrowser.lastUsed = new Date();

    // Handle page close
    page.on('close', () => {
      this.removePage(pageId);
    });

    return { page, pageId };
  }

  private async removePage(pageId: string): Promise<void> {
    const pooledPage = this.pages.get(pageId);
    if (!pooledPage) {
      return;
    }

    try {
      if (!pooledPage.page.isClosed()) {
        await pooledPage.page.close();
      }
    } catch (error) {
      logger.warn({ error, pageId }, 'Error closing page');
    }

    // Update browser page count
    for (const pooledBrowser of this.browsers.values()) {
      const pageIndex = pooledBrowser.pages.indexOf(pooledPage.page);
      if (pageIndex !== -1) {
        pooledBrowser.pages.splice(pageIndex, 1);
        if (pooledPage.inUse) {
          pooledBrowser.activePages--;
        }
        break;
      }
    }

    this.pages.delete(pageId);
    logger.debug({ pageId }, 'Removed page from pool');
  }

  private startCleanupIntervals(): void {
    // Clean up idle pages every minute
    setInterval(() => {
      this.cleanupIdlePages();
    }, 60000);

    // Clean up idle browsers every 5 minutes
    setInterval(() => {
      this.cleanupIdleBrowsers();
    }, 300000);
  }

  private async cleanupIdlePages(): Promise<void> {
    const now = new Date();
    const pagesToRemove: string[] = [];

    for (const [pageId, pooledPage] of this.pages) {
      if (!pooledPage.inUse && 
          (now.getTime() - pooledPage.lastUsed.getTime()) > this.pageIdleTimeout) {
        pagesToRemove.push(pageId);
      }
    }

    for (const pageId of pagesToRemove) {
      await this.removePage(pageId);
    }

    if (pagesToRemove.length > 0) {
      logger.info({ removedPages: pagesToRemove.length }, 'Cleaned up idle pages');
    }
  }

  private async cleanupIdleBrowsers(): Promise<void> {
    const now = new Date();
    const browsersToRemove: string[] = [];

    for (const [browserId, pooledBrowser] of this.browsers) {
      if (pooledBrowser.activePages === 0 && 
          pooledBrowser.pages.length === 0 &&
          (now.getTime() - pooledBrowser.lastUsed.getTime()) > this.browserIdleTimeout) {
        browsersToRemove.push(browserId);
      }
    }

    for (const browserId of browsersToRemove) {
      const pooledBrowser = this.browsers.get(browserId);
      if (pooledBrowser) {
        try {
          await pooledBrowser.browser.close();
        } catch (error) {
          logger.warn({ error, browserId }, 'Error closing idle browser');
        }
        this.browsers.delete(browserId);
      }
    }

    if (browsersToRemove.length > 0) {
      logger.info({ removedBrowsers: browsersToRemove.length }, 'Cleaned up idle browsers');
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

// Export singleton instance
export const browserPoolService = BrowserPoolService.getInstance();

export default BrowserPoolService;