/**
 * Data Consistency Monitor - Phase 3: Future-Proofing
 * Monitors data consistency over time and alerts on issues
 */

export interface ConsistencyAlert {
  id: string;
  productId: number;
  productName: string;
  alertType: 'discrepancy' | 'validation_failure' | 'sync_failure' | 'data_drift';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: {
    field: string;
    storedValue?: number;
    calculatedValue?: number;
    difference?: number;
    percentageDifference?: number;
    threshold?: number;
  };
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface ConsistencyReport {
  reportId: string;
  generatedAt: Date;
  timeRange: {
    from: Date;
    to: Date;
  };
  summary: {
    totalProducts: number;
    consistentProducts: number;
    productsWithIssues: number;
    totalAlerts: number;
    criticalAlerts: number;
    averageConsistencyScore: number; // 0-100
  };
  alerts: ConsistencyAlert[];
  trends: {
    consistencyScore: Array<{ date: Date; score: number }>;
    alertsOverTime: Array<{ date: Date; count: number }>;
  };
}

export class DataConsistencyMonitor {
  
  private static alerts: ConsistencyAlert[] = [];
  private static readonly DISCREPANCY_THRESHOLDS = {
    carbonFootprint: { low: 5, medium: 15, high: 30, critical: 50 }, // Percentage
    waterFootprint: { low: 10, medium: 25, high: 50, critical: 100 },
    wasteFootprint: { low: 15, medium: 30, high: 60, critical: 150 }
  };
  
  /**
   * Monitor a single product for consistency issues
   */
  public static async monitorProduct(productId: number): Promise<ConsistencyAlert[]> {
    try {
      const { DataConsistencyAuditService } = await import('./DataConsistencyAuditService');
      const auditResult = await DataConsistencyAuditService.auditSingleProduct(productId);
      
      const newAlerts: ConsistencyAlert[] = [];
      
      if (auditResult.hasDiscrepancies) {
        // Generate alerts for each discrepancy
        Object.entries(auditResult.discrepancies).forEach(([field, discrepancy]) => {
          if (discrepancy && discrepancy.hasDiscrepancy) {
            const alert = this.createDiscrepancyAlert(auditResult, field, discrepancy);
            newAlerts.push(alert);
            this.alerts.push(alert);
          }
        });
      }
      
      console.log(`🔍 Monitored product ${auditResult.productName}: ${newAlerts.length} new alerts`);
      return newAlerts;
      
    } catch (error) {
      console.error(`❌ Failed to monitor product ${productId}:`, error);
      
      const failureAlert: ConsistencyAlert = {
        id: `monitor_fail_${productId}_${Date.now()}`,
        productId,
        productName: `Product ${productId}`,
        alertType: 'sync_failure',
        severity: 'high',
        message: `Failed to monitor product consistency: ${error.message}`,
        details: { field: 'monitoring' },
        timestamp: new Date(),
        resolved: false
      };
      
      this.alerts.push(failureAlert);
      return [failureAlert];
    }
  }
  
  /**
   * Monitor all products for consistency issues
   */
  public static async monitorAllProducts(): Promise<ConsistencyAlert[]> {
    console.log('🔍 Starting comprehensive consistency monitoring...');
    
    const { storage: dbStorage } = await import('../storage');
    const products = await dbStorage.getAllProducts();
    const newAlerts: ConsistencyAlert[] = [];
    
    for (const product of products) {
      const productAlerts = await this.monitorProduct(product.id);
      newAlerts.push(...productAlerts);
    }
    
    console.log(`✅ Monitoring complete: ${newAlerts.length} new alerts generated`);
    return newAlerts;
  }
  
  /**
   * Create discrepancy alert
   */
  private static createDiscrepancyAlert(
    auditResult: any,
    field: string,
    discrepancy: any
  ): ConsistencyAlert {
    const severity = this.calculateSeverity(field, discrepancy.percentageDifference);
    
    return {
      id: `discrepancy_${auditResult.productId}_${field}_${Date.now()}`,
      productId: auditResult.productId,
      productName: auditResult.productName,
      alertType: 'discrepancy',
      severity,
      message: `${field} discrepancy: ${discrepancy.percentageDifference}% difference between stored and calculated values`,
      details: {
        field,
        storedValue: discrepancy.stored,
        calculatedValue: discrepancy.calculated,
        difference: discrepancy.difference,
        percentageDifference: discrepancy.percentageDifference,
        threshold: this.DISCREPANCY_THRESHOLDS[field as keyof typeof this.DISCREPANCY_THRESHOLDS]?.low
      },
      timestamp: new Date(),
      resolved: false
    };
  }
  
  /**
   * Calculate alert severity based on discrepancy
   */
  private static calculateSeverity(field: string, percentageDiff: number): 'low' | 'medium' | 'high' | 'critical' {
    const thresholds = this.DISCREPANCY_THRESHOLDS[field as keyof typeof this.DISCREPANCY_THRESHOLDS];
    if (!thresholds) return 'medium';
    
    if (percentageDiff >= thresholds.critical) return 'critical';
    if (percentageDiff >= thresholds.high) return 'high';
    if (percentageDiff >= thresholds.medium) return 'medium';
    return 'low';
  }
  
  /**
   * Get active alerts
   */
  public static getActiveAlerts(): ConsistencyAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }
  
  /**
   * Get alerts by severity
   */
  public static getAlertsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): ConsistencyAlert[] {
    return this.alerts.filter(alert => alert.severity === severity && !alert.resolved);
  }
  
  /**
   * Resolve an alert
   */
  public static resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      console.log(`✅ Resolved alert: ${alertId}`);
      return true;
    }
    return false;
  }
  
  /**
   * Generate consistency report
   */
  public static generateConsistencyReport(timeRange: { from: Date; to: Date }): ConsistencyReport {
    const alertsInRange = this.alerts.filter(alert => 
      alert.timestamp >= timeRange.from && alert.timestamp <= timeRange.to
    );
    
    // Calculate metrics
    const uniqueProducts = [...new Set(alertsInRange.map(a => a.productId))];
    const criticalAlerts = alertsInRange.filter(a => a.severity === 'critical').length;
    
    // Simple consistency score: 100 - (alerts per product * severity weight)
    const severityWeights = { low: 1, medium: 3, high: 7, critical: 15 };
    const totalSeverityScore = alertsInRange.reduce((sum, alert) => 
      sum + severityWeights[alert.severity], 0
    );
    const consistencyScore = Math.max(0, Math.min(100, 100 - (totalSeverityScore / Math.max(1, uniqueProducts.length))));
    
    return {
      reportId: `consistency_${Date.now()}`,
      generatedAt: new Date(),
      timeRange,
      summary: {
        totalProducts: uniqueProducts.length,
        consistentProducts: uniqueProducts.length - uniqueProducts.filter(id => 
          alertsInRange.some(a => a.productId === id)
        ).length,
        productsWithIssues: uniqueProducts.filter(id => 
          alertsInRange.some(a => a.productId === id)
        ).length,
        totalAlerts: alertsInRange.length,
        criticalAlerts,
        averageConsistencyScore: Math.round(consistencyScore)
      },
      alerts: alertsInRange.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      trends: {
        consistencyScore: this.calculateConsistencyTrends(timeRange),
        alertsOverTime: this.calculateAlertTrends(timeRange)
      }
    };
  }
  
  /**
   * Calculate consistency trends
   */
  private static calculateConsistencyTrends(timeRange: { from: Date; to: Date }): Array<{ date: Date; score: number }> {
    // Generate daily consistency scores over time range
    const trends = [];
    const dayMs = 24 * 60 * 60 * 1000;
    
    for (let date = new Date(timeRange.from); date <= timeRange.to; date = new Date(date.getTime() + dayMs)) {
      const dayAlerts = this.alerts.filter(alert => 
        alert.timestamp >= date && alert.timestamp < new Date(date.getTime() + dayMs)
      );
      
      const severityWeights = { low: 1, medium: 3, high: 7, critical: 15 };
      const dayScore = dayAlerts.reduce((sum, alert) => sum + severityWeights[alert.severity], 0);
      const consistencyScore = Math.max(0, Math.min(100, 100 - dayScore));
      
      trends.push({ date: new Date(date), score: consistencyScore });
    }
    
    return trends;
  }
  
  /**
   * Calculate alert trends
   */
  private static calculateAlertTrends(timeRange: { from: Date; to: Date }): Array<{ date: Date; count: number }> {
    const trends = [];
    const dayMs = 24 * 60 * 60 * 1000;
    
    for (let date = new Date(timeRange.from); date <= timeRange.to; date = new Date(date.getTime() + dayMs)) {
      const dayAlerts = this.alerts.filter(alert => 
        alert.timestamp >= date && alert.timestamp < new Date(date.getTime() + dayMs)
      );
      
      trends.push({ date: new Date(date), count: dayAlerts.length });
    }
    
    return trends;
  }
  
  /**
   * Schedule periodic monitoring
   */
  public static startPeriodicMonitoring(intervalMinutes: number = 60): void {
    console.log(`🔄 Starting periodic consistency monitoring every ${intervalMinutes} minutes`);
    
    setInterval(async () => {
      try {
        console.log('⏰ Running scheduled consistency monitoring...');
        const newAlerts = await this.monitorAllProducts();
        
        // Log critical alerts
        const criticalAlerts = newAlerts.filter(a => a.severity === 'critical');
        if (criticalAlerts.length > 0) {
          console.error(`🚨 ${criticalAlerts.length} critical consistency alerts detected!`);
          criticalAlerts.forEach(alert => {
            console.error(`  - ${alert.productName}: ${alert.message}`);
          });
        }
      } catch (error) {
        console.error('❌ Scheduled monitoring failed:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }
}