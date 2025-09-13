/**
 * Simple in-memory metrics registry for performance monitoring
 * Tracks counters, gauges, and histograms without external dependencies
 */
export interface MetricData {
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histograms: Record<string, {
    count: number;
    sum: number;
    buckets: Record<string, number>;
    p50: number;
    p95: number;
    p99: number;
  }>;
}

class MetricsRegistry {
  private counters: Record<string, number> = {};
  private gauges: Record<string, number> = {};
  private histograms: Record<string, Array<number>> = {};

  // Counter operations
  incrementCounter(key: string, value: number = 1): void {
    this.counters[key] = (this.counters[key] || 0) + value;
  }

  // Gauge operations
  setGauge(key: string, value: number): void {
    this.gauges[key] = value;
  }

  // Histogram operations (for latency tracking)
  recordHistogram(key: string, value: number): void {
    if (!this.histograms[key]) {
      this.histograms[key] = [];
    }
    this.histograms[key].push(value);
    
    // Keep only last 1000 values to prevent memory growth
    if (this.histograms[key].length > 1000) {
      this.histograms[key] = this.histograms[key].slice(-1000);
    }
  }

  // Calculate percentiles for histogram
  private calculatePercentiles(values: number[]): { p50: number; p95: number; p99: number } {
    if (values.length === 0) return { p50: 0, p95: 0, p99: 0 };
    
    const sorted = [...values].sort((a, b) => a - b);
    const len = sorted.length;
    
    return {
      p50: sorted[Math.floor(len * 0.5)] || 0,
      p95: sorted[Math.floor(len * 0.95)] || 0,
      p99: sorted[Math.floor(len * 0.99)] || 0,
    };
  }

  // Get all metrics
  getMetrics(): MetricData {
    const histogramData: Record<string, any> = {};
    
    for (const [key, values] of Object.entries(this.histograms)) {
      const percentiles = this.calculatePercentiles(values);
      const sum = values.reduce((a, b) => a + b, 0);
      
      histogramData[key] = {
        count: values.length,
        sum,
        buckets: {
          '0-10ms': values.filter(v => v <= 10).length,
          '10-100ms': values.filter(v => v > 10 && v <= 100).length,
          '100-1000ms': values.filter(v => v > 100 && v <= 1000).length,
          '1000ms+': values.filter(v => v > 1000).length,
        },
        ...percentiles
      };
    }

    return {
      counters: { ...this.counters },
      gauges: { ...this.gauges },
      histograms: histogramData
    };
  }

  // Reset all metrics (useful for testing)
  reset(): void {
    this.counters = {};
    this.gauges = {};
    this.histograms = {};
  }
}

// Singleton instance
export const metricsRegistry = new MetricsRegistry();