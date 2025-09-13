import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { 
  Activity,
  Database,
  Server,
  Gauge,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  BarChart3,
  PieChart,
  Zap,
  Shield,
  Globe,
  Monitor,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Timer,
  Target,
  Layers,
  FileText
} from 'lucide-react';

/**
 * Comprehensive Performance Dashboard
 * 
 * Combines all performance monitoring services to provide unified view of:
 * - Database performance (59 optimized indexes, query performance)
 * - API response times (99.95% LCA improvement tracking)
 * - Frontend performance (5x bundle reduction, Core Web Vitals)
 * - Cache effectiveness across all layers
 * - Real-time alerts and recommendations
 */

interface PerformanceOverview {
  databasePerformance: {
    avgQueryTime: number;
    slowQueries: number;
    indexEfficiency: number;
    connectionUtilization: number;
    cacheHitRate: number;
  };
  apiPerformance: {
    avgResponseTime: number;
    lcaPerformanceImprovement: number;
    cacheHitRate: number;
    requestsPerMinute: number;
    errorRate: number;
  };
  frontendPerformance: {
    bundleSizeReduction: number;
    coreWebVitalsScore: number;
    lazyLoadingEffectiveness: number;
    pageLoadTime: number;
    cacheUtilization: number;
  };
  systemHealth: {
    overallScore: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    networkLatency: number;
  };
}

interface PerformanceAlert {
  id: string;
  type: 'database' | 'api' | 'frontend' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  timestamp: Date;
  resolved: boolean;
}

interface OptimizationImpact {
  lcaOptimization: {
    originalTime: number;
    currentTime: number;
    improvement: number;
    timeSaved: number;
  };
  bundleOptimization: {
    originalSize: number;
    currentSize: number;
    reduction: number;
    loadTimeSaved: number;
  };
  cacheOptimization: {
    hitRate: number;
    requestsOptimized: number;
    bandwidthSaved: number;
  };
  databaseOptimization: {
    indexesOptimized: number;
    queryTimeSaved: number;
    throughputImprovement: number;
  };
}

interface RealtimeMetrics {
  timestamp: Date;
  activeUsers: number;
  requestsPerSecond: number;
  avgResponseTime: number;
  errorCount: number;
  cacheHitRate: number;
  databaseConnections: number;
  memoryUsage: number;
  cpuUsage: number;
}

export default function ComprehensivePerformanceDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Fetch comprehensive performance data
  const { data: performanceData, isLoading, error, refetch } = useQuery<{
    success: boolean;
    data: PerformanceOverview;
  }>({
    queryKey: ['/api/admin/performance/comprehensive'],
    queryFn: async () => {
      const response = await fetch('/api/admin/performance/comprehensive');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch optimization impact data
  const { data: optimizationData } = useQuery<{
    success: boolean;
    data: OptimizationImpact;
  }>({
    queryKey: ['/api/admin/performance/optimization-impact'],
    queryFn: async () => {
      const response = await fetch('/api/admin/performance/optimization-impact');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch performance alerts
  const { data: alertsData } = useQuery<{
    success: boolean;
    data: PerformanceAlert[];
  }>({
    queryKey: ['/api/admin/performance/alerts'],
    queryFn: async () => {
      const response = await fetch('/api/admin/performance/alerts');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Real-time metrics polling
  useEffect(() => {
    const fetchRealtimeMetrics = async () => {
      try {
        const response = await fetch('/api/admin/performance/realtime');
        if (response.ok) {
          const data = await response.json();
          setRealtimeMetrics(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch realtime metrics:', error);
      }
    };

    fetchRealtimeMetrics();
    const interval = setInterval(fetchRealtimeMetrics, 5000); // Every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Update alerts when data changes
  useEffect(() => {
    if (alertsData?.data) {
      setAlerts(alertsData.data);
    }
  }, [alertsData]);

  const performance = performanceData?.data;
  const optimization = optimizationData?.data;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/performance/optimization-impact'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/performance/alerts'] })
      ]);
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getPerformanceScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPerformanceScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-yellow-100';
    if (score >= 50) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${bytes}B`;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <Header title="Performance Dashboard" subtitle="Loading comprehensive performance data..." />
          <main className="flex-1 p-6">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !performance) {
    return (
      <div className="flex min-h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Performance Dashboard" subtitle="Error loading performance data" />
          <main className="flex-1 p-6">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to load performance data. Please refresh the page or contact support.
              </AlertDescription>
            </Alert>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header 
          title="Performance Dashboard" 
          subtitle="Comprehensive monitoring of all platform optimizations"
        />
        <main className="flex-1 p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Performance Dashboard</h1>
                <p className="text-muted-foreground">
                  Real-time monitoring of 99.95% LCA improvements, 5x bundle reductions, and 59 database optimizations
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>

            {/* Real-time Metrics */}
            {realtimeMetrics && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <Activity className="h-5 w-5" />
                    Real-time System Metrics
                    <Badge variant="outline" className="text-blue-700 border-blue-300">
                      Live
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-800">{realtimeMetrics.activeUsers}</div>
                      <div className="text-sm text-blue-600">Active Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-800">{realtimeMetrics.requestsPerSecond}/s</div>
                      <div className="text-sm text-blue-600">Requests</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-800">{realtimeMetrics.avgResponseTime}ms</div>
                      <div className="text-sm text-blue-600">Avg Response</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-800">{Math.round(realtimeMetrics.cacheHitRate)}%</div>
                      <div className="text-sm text-blue-600">Cache Hits</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-800">{realtimeMetrics.databaseConnections}</div>
                      <div className="text-sm text-blue-600">DB Connections</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-800">{Math.round(realtimeMetrics.memoryUsage)}%</div>
                      <div className="text-sm text-blue-600">Memory Usage</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Critical Alerts */}
            {alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-red-800">
                    <AlertTriangle className="h-5 w-5" />
                    Critical Performance Alerts ({alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {alerts.filter(a => a.severity === 'critical' || a.severity === 'high').slice(0, 3).map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className={`h-4 w-4 ${alert.severity === 'critical' ? 'text-red-600' : 'text-orange-600'}`} />
                          <div>
                            <div className="font-medium">{alert.title}</div>
                            <div className="text-sm text-muted-foreground">{alert.description}</div>
                          </div>
                        </div>
                        <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                          {alert.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Optimization Impact Overview */}
            {optimization && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <TrendingUp className="h-5 w-5" />
                    Performance Optimization Impact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-800">
                        {optimization.lcaOptimization.improvement}%
                      </div>
                      <div className="text-sm text-green-600">LCA Performance Improvement</div>
                      <div className="text-xs text-muted-foreground">
                        {optimization.lcaOptimization.originalTime}ms → {optimization.lcaOptimization.currentTime}ms
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-800">
                        {optimization.bundleOptimization.reduction}%
                      </div>
                      <div className="text-sm text-green-600">Bundle Size Reduction</div>
                      <div className="text-xs text-muted-foreground">
                        {formatBytes(optimization.bundleOptimization.originalSize)} → {formatBytes(optimization.bundleOptimization.currentSize)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-800">
                        {optimization.databaseOptimization.indexesOptimized}
                      </div>
                      <div className="text-sm text-green-600">Database Indexes Optimized</div>
                      <div className="text-xs text-muted-foreground">
                        {optimization.databaseOptimization.throughputImprovement}% throughput gain
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-800">
                        {Math.round(optimization.cacheOptimization.hitRate * 100)}%
                      </div>
                      <div className="text-sm text-green-600">Cache Hit Rate</div>
                      <div className="text-xs text-muted-foreground">
                        {formatNumber(optimization.cacheOptimization.requestsOptimized)} requests optimized
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Performance Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Gauge className="w-4 h-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="database" className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Database
                </TabsTrigger>
                <TabsTrigger value="api" className="flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  API Performance
                </TabsTrigger>
                <TabsTrigger value="frontend" className="flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  Frontend
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Database Performance Score */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Database Performance</CardTitle>
                      <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${getPerformanceScoreColor(performance.databasePerformance.indexEfficiency * 100)}`}>
                        {Math.round(performance.databasePerformance.indexEfficiency * 100)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Index Efficiency Score
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Query Time</span>
                          <span>{performance.databasePerformance.avgQueryTime}ms</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Cache Hit Rate</span>
                          <span>{Math.round(performance.databasePerformance.cacheHitRate * 100)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* API Performance Score */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">API Performance</CardTitle>
                      <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${getPerformanceScoreColor(performance.apiPerformance.lcaPerformanceImprovement)}`}>
                        {performance.apiPerformance.lcaPerformanceImprovement}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        LCA Performance Improvement
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Response Time</span>
                          <span>{performance.apiPerformance.avgResponseTime}ms</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Cache Hit Rate</span>
                          <span>{Math.round(performance.apiPerformance.cacheHitRate * 100)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Frontend Performance Score */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Frontend Performance</CardTitle>
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${getPerformanceScoreColor(performance.frontendPerformance.coreWebVitalsScore)}`}>
                        {Math.round(performance.frontendPerformance.coreWebVitalsScore)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Core Web Vitals Score
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Bundle Reduction</span>
                          <span>{performance.frontendPerformance.bundleSizeReduction}%</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Page Load</span>
                          <span>{Math.round(performance.frontendPerformance.pageLoadTime)}ms</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* System Health Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      System Health Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Overall Score</span>
                          <span className={`text-lg font-bold ${getPerformanceScoreColor(performance.systemHealth.overallScore)}`}>
                            {Math.round(performance.systemHealth.overallScore)}
                          </span>
                        </div>
                        <Progress value={performance.systemHealth.overallScore} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Memory</span>
                          <span className="text-lg font-bold">{Math.round(performance.systemHealth.memoryUsage)}%</span>
                        </div>
                        <Progress value={performance.systemHealth.memoryUsage} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">CPU</span>
                          <span className="text-lg font-bold">{Math.round(performance.systemHealth.cpuUsage)}%</span>
                        </div>
                        <Progress value={performance.systemHealth.cpuUsage} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Network</span>
                          <span className="text-lg font-bold">{Math.round(performance.systemHealth.networkLatency)}ms</span>
                        </div>
                        <Progress 
                          value={Math.max(0, 100 - (performance.systemHealth.networkLatency / 10))} 
                          className="h-2" 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Database Tab */}
              <TabsContent value="database" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Database Index Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-avallen-green">59</div>
                          <div className="text-sm text-muted-foreground">Optimized Indexes</div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Index Efficiency</span>
                            <span className="font-bold">{Math.round(performance.databasePerformance.indexEfficiency * 100)}%</span>
                          </div>
                          <Progress value={performance.databasePerformance.indexEfficiency * 100} />
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold">{performance.databasePerformance.avgQueryTime}ms</div>
                            <div className="text-xs text-muted-foreground">Avg Query Time</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold">{performance.databasePerformance.slowQueries}</div>
                            <div className="text-xs text-muted-foreground">Slow Queries</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Network className="h-5 w-5" />
                        Connection Pool Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Pool Utilization</span>
                            <span className="font-bold">{Math.round(performance.databasePerformance.connectionUtilization * 100)}%</span>
                          </div>
                          <Progress value={performance.databasePerformance.connectionUtilization * 100} />
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold">{Math.round(performance.databasePerformance.cacheHitRate * 100)}%</div>
                            <div className="text-xs text-muted-foreground">Query Cache Hit Rate</div>
                          </div>
                          <div>
                            <div className={`text-lg font-bold ${performance.databasePerformance.connectionUtilization > 0.8 ? 'text-orange-600' : 'text-green-600'}`}>
                              {performance.databasePerformance.connectionUtilization > 0.8 ? 'High' : 'Normal'}
                            </div>
                            <div className="text-xs text-muted-foreground">Connection Load</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* API Performance Tab */}
              <TabsContent value="api" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        LCA Performance Optimization
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-avallen-green">
                            {performance.apiPerformance.lcaPerformanceImprovement}%
                          </div>
                          <div className="text-sm text-muted-foreground">Performance Improvement</div>
                          <div className="text-xs text-muted-foreground">2-5s → ~1ms (cache hits)</div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Cache Hit Rate</span>
                            <span className="font-bold">{Math.round(performance.apiPerformance.cacheHitRate * 100)}%</span>
                          </div>
                          <Progress value={performance.apiPerformance.cacheHitRate * 100} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Timer className="h-5 w-5" />
                        API Response Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold">{performance.apiPerformance.avgResponseTime}ms</div>
                            <div className="text-xs text-muted-foreground">Avg Response Time</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold">{performance.apiPerformance.requestsPerMinute}/min</div>
                            <div className="text-xs text-muted-foreground">Requests Per Minute</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Error Rate</span>
                            <span className={`font-bold ${performance.apiPerformance.errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                              {performance.apiPerformance.errorRate.toFixed(2)}%
                            </span>
                          </div>
                          <Progress 
                            value={Math.max(0, 100 - (performance.apiPerformance.errorRate * 10))} 
                            className="h-2"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Frontend Tab */}
              <TabsContent value="frontend" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5" />
                        Bundle Size Optimization
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-avallen-green">
                            {performance.frontendPerformance.bundleSizeReduction}%
                          </div>
                          <div className="text-sm text-muted-foreground">Bundle Size Reduction</div>
                          <div className="text-xs text-muted-foreground">5x smaller with lazy loading</div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Lazy Loading Effectiveness</span>
                            <span className="font-bold">{Math.round(performance.frontendPerformance.lazyLoadingEffectiveness)}%</span>
                          </div>
                          <Progress value={performance.frontendPerformance.lazyLoadingEffectiveness} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Core Web Vitals
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold">{Math.round(performance.frontendPerformance.pageLoadTime)}ms</div>
                            <div className="text-xs text-muted-foreground">Page Load Time</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold">{Math.round(performance.frontendPerformance.cacheUtilization)}%</div>
                            <div className="text-xs text-muted-foreground">Cache Utilization</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Core Web Vitals Score</span>
                            <span className={`font-bold ${getPerformanceScoreColor(performance.frontendPerformance.coreWebVitalsScore)}`}>
                              {Math.round(performance.frontendPerformance.coreWebVitalsScore)}
                            </span>
                          </div>
                          <Progress value={performance.frontendPerformance.coreWebVitalsScore} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}