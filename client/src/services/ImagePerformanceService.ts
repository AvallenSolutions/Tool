interface ImageMetrics {
  url: string;
  loadStartTime: number;
  loadEndTime?: number;
  loadDuration?: number;
  fileSize?: number;
  format?: string;
  width?: number;
  height?: number;
  cacheHit?: boolean;
  error?: string;
  isLazyLoaded?: boolean;
  isOptimized?: boolean;
  viewportEntry?: number; // When image entered viewport
}

interface PerformanceReport {
  totalImages: number;
  averageLoadTime: number;
  cacheHitRate: number;
  optimizedImageRate: number;
  lazyLoadedImages: number;
  failedImages: number;
  totalBandwidth: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
}

/**
 * Service for monitoring and tracking image loading performance
 * Integrates with browser performance APIs and provides detailed metrics
 */
export class ImagePerformanceService {
  private static instance: ImagePerformanceService;
  private metrics: Map<string, ImageMetrics> = new Map();
  private performanceObserver?: PerformanceObserver;
  private intersectionObserver?: IntersectionObserver;
  private isMonitoring: boolean = false;

  private constructor() {
    this.initializePerformanceMonitoring();
  }

  static getInstance(): ImagePerformanceService {
    if (!this.instance) {
      this.instance = new ImagePerformanceService();
    }
    return this.instance;
  }

  /**
   * Initialize performance monitoring with browser APIs
   */
  private initializePerformanceMonitoring(): void {
    if (typeof window === 'undefined') return;

    try {
      // Monitor resource loading performance
      if ('PerformanceObserver' in window) {
        this.performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.initiatorType === 'img') {
              this.updateMetricFromPerformanceEntry(entry as PerformanceResourceTiming);
            }
          }
        });

        this.performanceObserver.observe({ entryTypes: ['resource'] });
      }

      // Monitor Core Web Vitals
      this.initializeWebVitalsMonitoring();

    } catch (error) {
      console.warn('Failed to initialize image performance monitoring:', error);
    }
  }

  /**
   * Initialize Core Web Vitals monitoring specific to images
   */
  private initializeWebVitalsMonitoring(): void {
    if (typeof window === 'undefined') return;

    try {
      // Largest Contentful Paint (LCP) - often images
      if ('PerformanceObserver' in window) {
        const lcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const lcpEntry = entry as any;
            if (lcpEntry.element && lcpEntry.element.tagName === 'IMG') {
              if (process.env.NODE_ENV === 'development') {
              console.debug('LCP triggered by image:', {
                element: lcpEntry.element.src,
                value: lcpEntry.value,
                loadTime: lcpEntry.loadTime
              });
            }
              
              // Track LCP value for images
              this.trackCoreWebVital('LCP', lcpEntry.value, lcpEntry.element.src);
            }
          }
        });

        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      }

      // Cumulative Layout Shift (CLS) - monitor image-related shifts
      if ('PerformanceObserver' in window) {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const clsEntry = entry as any;
            if (process.env.NODE_ENV === 'development') {
              console.debug('Layout shift detected:', {
                value: clsEntry.value,
                sources: clsEntry.sources?.map((s: any) => s.node?.tagName)
              });
            }
            
            this.trackCoreWebVital('CLS', clsEntry.value);
          }
        });

        clsObserver.observe({ entryTypes: ['layout-shift'] });
      }

    } catch (error) {
      console.warn('Failed to initialize Web Vitals monitoring:', error);
    }
  }

  /**
   * Start tracking an image load
   */
  startImageLoad(url: string, metadata?: Partial<ImageMetrics>): void {
    const metric: ImageMetrics = {
      url,
      loadStartTime: performance.now(),
      isLazyLoaded: metadata?.isLazyLoaded || false,
      width: metadata?.width,
      height: metadata?.height,
      ...metadata
    };

    this.metrics.set(url, metric);
    if (process.env.NODE_ENV === 'development') {
      console.debug('Started tracking image load:', url);
    }
  }

  /**
   * Complete image load tracking
   */
  completeImageLoad(url: string, success: boolean = true, error?: string): void {
    const metric = this.metrics.get(url);
    if (!metric) return;

    const now = performance.now();
    metric.loadEndTime = now;
    metric.loadDuration = now - metric.loadStartTime;
    
    if (!success && error) {
      metric.error = error;
    }

    // Try to get additional info from performance API
    this.enrichMetricFromPerformanceAPI(metric);

    if (process.env.NODE_ENV === 'development') {
      console.debug('Completed image load tracking:', {
        url,
        duration: metric.loadDuration,
        success,
        error
      });
    }
  }

  /**
   * Track when image enters viewport (for lazy loading)
   */
  trackImageViewportEntry(url: string): void {
    const metric = this.metrics.get(url);
    if (metric) {
      metric.viewportEntry = performance.now();
    }
  }

  /**
   * Update metric from performance entry
   */
  private updateMetricFromPerformanceEntry(entry: PerformanceResourceTiming): void {
    const url = entry.name;
    const metric = this.metrics.get(url);
    
    // Calculate duration using correct properties
    const loadDuration = entry.duration || (entry.responseEnd - entry.startTime);
    const loadEndTime = entry.startTime + loadDuration;
    
    if (metric) {
      metric.fileSize = entry.transferSize || entry.encodedBodySize;
      metric.cacheHit = entry.transferSize === 0 && entry.decodedBodySize > 0;
      metric.loadDuration = loadDuration > 0 ? loadDuration : undefined;
    } else {
      // Create metric from performance entry if not already tracked
      this.metrics.set(url, {
        url,
        loadStartTime: entry.startTime || entry.fetchStart,
        loadEndTime: loadEndTime,
        loadDuration: loadDuration > 0 ? loadDuration : undefined,
        fileSize: entry.transferSize || entry.encodedBodySize,
        cacheHit: entry.transferSize === 0 && entry.decodedBodySize > 0
      });
    }
  }

  /**
   * Enrich metric with performance API data
   */
  private enrichMetricFromPerformanceAPI(metric: ImageMetrics): void {
    try {
      const entries = performance.getEntriesByName(metric.url, 'resource') as PerformanceResourceTiming[];
      const entry = entries[entries.length - 1]; // Get most recent entry
      
      if (entry) {
        metric.fileSize = entry.transferSize || entry.encodedBodySize;
        metric.cacheHit = entry.transferSize === 0 && entry.decodedBodySize > 0;
        
        // Check if image was optimized based on response headers
        // This would require checking actual response headers, which isn't available via Performance API
        // In practice, this would be tracked on the server side
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Could not enrich metric from Performance API:', error);
      }
    }
  }

  /**
   * Track Core Web Vitals
   */
  private trackCoreWebVital(metric: string, value: number, element?: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`Core Web Vital - ${metric}:`, { value, element });
    }
    
    // In a real application, this would send to analytics service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', metric, {
        value: Math.round(value),
        custom_parameter_1: element || 'unknown'
      });
    }
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport(): PerformanceReport {
    const metrics = Array.from(this.metrics.values());
    const successfulLoads = metrics.filter(m => !m.error && m.loadDuration);
    
    const report: PerformanceReport = {
      totalImages: metrics.length,
      averageLoadTime: this.calculateAverageLoadTime(successfulLoads),
      cacheHitRate: this.calculateCacheHitRate(metrics),
      optimizedImageRate: this.calculateOptimizedRate(metrics),
      lazyLoadedImages: metrics.filter(m => m.isLazyLoaded).length,
      failedImages: metrics.filter(m => m.error).length,
      totalBandwidth: this.calculateTotalBandwidth(metrics)
    };

    console.log('Image Performance Report:', report);
    return report;
  }

  /**
   * Calculate average load time for successful loads
   */
  private calculateAverageLoadTime(metrics: ImageMetrics[]): number {
    if (metrics.length === 0) return 0;
    
    const totalTime = metrics.reduce((sum, m) => sum + (m.loadDuration || 0), 0);
    return Math.round(totalTime / metrics.length);
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(metrics: ImageMetrics[]): number {
    if (metrics.length === 0) return 0;
    
    const cacheHits = metrics.filter(m => m.cacheHit).length;
    return Math.round((cacheHits / metrics.length) * 100);
  }

  /**
   * Calculate optimization rate
   */
  private calculateOptimizedRate(metrics: ImageMetrics[]): number {
    if (metrics.length === 0) return 0;
    
    const optimizedImages = metrics.filter(m => m.isOptimized).length;
    return Math.round((optimizedImages / metrics.length) * 100);
  }

  /**
   * Calculate total bandwidth usage
   */
  private calculateTotalBandwidth(metrics: ImageMetrics[]): number {
    return metrics.reduce((total, m) => total + (m.fileSize || 0), 0);
  }

  /**
   * Get detailed metrics for debugging
   */
  getDetailedMetrics(): ImageMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Start monitoring (public method to control monitoring)
   */
  startMonitoring(): void {
    this.isMonitoring = true;
    console.log('Image performance monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    
    console.log('Image performance monitoring stopped');
  }

  /**
   * Export metrics for analytics
   */
  exportMetrics(): object {
    const report = this.generateReport();
    const detailedMetrics = this.getDetailedMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      summary: report,
      details: detailedMetrics.map(m => ({
        url: m.url.split('/').pop(), // Don't expose full URLs
        loadDuration: m.loadDuration,
        fileSize: m.fileSize,
        cacheHit: m.cacheHit,
        isLazyLoaded: m.isLazyLoaded,
        isOptimized: m.isOptimized,
        error: !!m.error
      }))
    };
  }
}

// Export singleton instance
export const imagePerformanceService = ImagePerformanceService.getInstance();