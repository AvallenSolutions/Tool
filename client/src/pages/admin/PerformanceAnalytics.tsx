import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { 
  Activity,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Server,
  RefreshCw,
  BarChart3,
  PieChart
} from 'lucide-react';

interface PerformanceMetrics {
  overview: {
    totalUsers: number;
    activeUsers30d: number;
    totalCompanies: number;
    activeCompanies30d: number;
    totalReports: number;
    reportsGenerated30d: number;
    avgCompletenessScore: number;
    systemUptime: number;
  };
  userEngagement: {
    dailyActiveUsers: { date: string; count: number }[];
    userRetention: { week: number; retentionRate: number }[];
    featureUsage: { feature: string; usage: number; trend: number }[];
    sessionMetrics: {
      avgSessionDuration: number;
      avgPagesPerSession: number;
      bounceRate: number;
    };
  };
  dataQuality: {
    completenessDistribution: { range: string; count: number }[];
    lcaDataQuality: { 
      productsWithLCA: number;
      productsWithoutLCA: number;
      avgLCACompleteness: number;
    };
    reportingFrequency: { frequency: string; count: number }[];
    dataFreshness: {
      fresh: number;
      stale: number;
      outdated: number;
    };
  };
  systemPerformance: {
    responseMetrics: {
      avgResponseTime: number;
      p95ResponseTime: number;
      errorRate: number;
    };
    resourceUsage: {
      databaseConnections: number;
      memoryUsage: number;
      diskUsage: number;
    };
    apiEndpointStats: { 
      endpoint: string; 
      requestCount: number; 
      avgResponseTime: number;
      errorCount: number;
    }[];
  };
  businessMetrics: {
    sustainabilityImpact: {
      totalCO2Tracked: number;
      companiesWithTargets: number;
      avgEmissionReduction: number;
    };
    supplierNetwork: {
      totalSuppliers: number;
      activeSuppliers: number;
      avgDataCompleteness: number;
    };
    userGrowth: { date: string; newUsers: number; churnedUsers: number }[];
  };
}

interface AlertMetric {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
}

interface AnalyticsResponse {
  success: boolean;
  data: PerformanceMetrics;
  timestamp: string;
}

interface AlertsResponse {
  success: boolean;
  data: AlertMetric[];
  timestamp: string;
}

interface RealtimeMetrics {
  activeUsers: number;
  requestsPerMinute: number;
  avgResponseTime: number;
  errorCount: number;
  lastUpdated: string;
}

interface RealtimeResponse {
  success: boolean;
  data: RealtimeMetrics;
}

export default function PerformanceAnalytics() {
  const [activeTab, setActiveTab] = useState('overview');
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: analyticsResponse, isLoading, error, refetch } = useQuery<AnalyticsResponse>({
    queryKey: ['/api/admin/analytics/performance'],
    queryFn: async () => {
      const response = await fetch('/api/admin/analytics/performance');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: alertsResponse } = useQuery<AlertsResponse>({
    queryKey: ['/api/admin/analytics/alerts'],
    queryFn: async () => {
      const response = await fetch('/api/admin/analytics/alerts');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Realtime metrics polling
  useEffect(() => {
    const fetchRealtimeMetrics = async () => {
      try {
        const response = await fetch('/api/admin/analytics/realtime');
        if (response.ok) {
          const data: RealtimeResponse = await response.json();
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

  const analytics = analyticsResponse?.data;
  const alerts = alertsResponse?.data || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/alerts'] });
      console.log('Analytics data refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const clearCache = async () => {
    setIsClearing(true);
    try {
      const response = await fetch('/api/admin/analytics/cache/clear', { method: 'POST' });
      if (response.ok) {
        // Clear all analytics-related queries from cache
        queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/performance'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/alerts'] });
        await refetch();
        console.log('Cache cleared and data refreshed successfully');
      } else {
        throw new Error('Failed to clear cache');
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning': return <Clock className="h-4 w-4 text-orange-600" />;
      default: return <CheckCircle className="h-4 w-4 text-blue-600" />;
    }
  };

  const getAlertVariant = (type: string) => {
    switch (type) {
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'outline';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Performance Analytics" subtitle="Loading performance data..." />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Performance Analytics</h1>
                <Badge variant="outline">Loading...</Badge>
              </div>
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

  if (error || !analytics) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Performance Analytics" subtitle="Error loading analytics data" />
          <main className="flex-1 p-6 overflow-y-auto">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <h3 className="font-medium text-red-800">Analytics Error</h3>
                    <p className="text-sm text-red-700 mt-1">
                      Failed to load analytics data. Please refresh the page or contact support.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header 
          title="Performance Analytics" 
          subtitle="Comprehensive platform performance monitoring and insights"
        />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Performance Analytics</h1>
                <p className="text-muted-foreground">
                  Real-time insights into platform performance and user engagement
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={clearCache} disabled={isClearing}>
                  <Database className={`h-4 w-4 mr-2 ${isClearing ? 'animate-spin' : ''}`} />
                  {isClearing ? 'Clearing...' : 'Clear Cache'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>

            {/* Real-time Metrics */}
            {realtimeMetrics && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <Activity className="h-5 w-5" />
                    Real-time Metrics
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      Live
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-800">{realtimeMetrics.activeUsers}</div>
                      <div className="text-sm text-green-600">Active Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-800">{realtimeMetrics.requestsPerMinute}</div>
                      <div className="text-sm text-green-600">Requests/min</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-800">{realtimeMetrics.avgResponseTime}ms</div>
                      <div className="text-sm text-green-600">Avg Response</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-800">{realtimeMetrics.errorCount}</div>
                      <div className="text-sm text-green-600">Errors (5min)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* System Alerts */}
            {alerts.length > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-orange-800">
                    <AlertTriangle className="h-5 w-5" />
                    System Alerts ({alerts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {alerts.slice(0, 3).map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div className="flex items-center gap-3">
                          {getAlertIcon(alert.type)}
                          <div>
                            <div className="font-medium">{alert.title}</div>
                            <div className="text-sm text-muted-foreground">{alert.description}</div>
                          </div>
                        </div>
                        <Badge variant={getAlertVariant(alert.type)}>
                          {alert.currentValue.toFixed(2)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Analytics Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="engagement" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  User Engagement
                </TabsTrigger>
                <TabsTrigger value="quality" className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Data Quality
                </TabsTrigger>
                <TabsTrigger value="performance" className="flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  System Performance
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Users className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Users</p>
                          <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalUsers}</p>
                          <p className="text-xs text-green-600">
                            +{analytics.overview.activeUsers30d} active (30d)
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Companies</p>
                          <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalCompanies}</p>
                          <p className="text-xs text-green-600">
                            {analytics.overview.activeCompanies30d} active (30d)
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <BarChart3 className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Reports Generated</p>
                          <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalReports}</p>
                          <p className="text-xs text-green-600">
                            +{analytics.overview.reportsGenerated30d} this month
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <PieChart className="h-6 w-6 text-orange-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Avg Completeness</p>
                          <p className="text-2xl font-bold text-gray-900">{analytics.overview.avgCompletenessScore}%</p>
                          <div className="w-16 mt-1">
                            <Progress value={analytics.overview.avgCompletenessScore} className="h-1" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Business Impact Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sustainability Impact</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-3">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-avallen-green">
                          {formatNumber(analytics.businessMetrics.sustainabilityImpact.totalCO2Tracked)}
                        </div>
                        <div className="text-sm text-muted-foreground">kg CO2e Tracked</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-avallen-green">
                          {analytics.businessMetrics.sustainabilityImpact.companiesWithTargets}
                        </div>
                        <div className="text-sm text-muted-foreground">Companies with Targets</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-avallen-green">
                          {analytics.businessMetrics.sustainabilityImpact.avgEmissionReduction}%
                        </div>
                        <div className="text-sm text-muted-foreground">Avg Emission Reduction</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* User Engagement Tab */}
              <TabsContent value="engagement" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Feature Usage (30 days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {analytics.userEngagement.featureUsage.map((feature) => (
                          <div key={feature.feature} className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{feature.feature}</div>
                              <div className="text-sm text-muted-foreground">{feature.usage} uses</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={feature.trend > 0 ? 'default' : 'secondary'}>
                                {feature.trend > 0 ? '+' : ''}{feature.trend}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Session Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Avg Session Duration</span>
                          <span className="text-lg font-bold">
                            {formatDuration(analytics.userEngagement.sessionMetrics.avgSessionDuration)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Pages per Session</span>
                          <span className="text-lg font-bold">
                            {analytics.userEngagement.sessionMetrics.avgPagesPerSession}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Bounce Rate</span>
                          <span className="text-lg font-bold">
                            {analytics.userEngagement.sessionMetrics.bounceRate}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>User Retention</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                      {analytics.userEngagement.userRetention.map((retention) => (
                        <div key={retention.week} className="text-center">
                          <div className="text-2xl font-bold">{retention.retentionRate}%</div>
                          <div className="text-sm text-muted-foreground">Week {retention.week}</div>
                          <Progress value={retention.retentionRate} className="mt-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Data Quality Tab */}
              <TabsContent value="quality" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Profile Completeness Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.dataQuality.completenessDistribution.map((dist) => (
                          <div key={dist.range} className="flex items-center justify-between">
                            <span className="text-sm font-medium">{dist.range}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-avallen-green h-2 rounded-full"
                                  style={{ 
                                    width: `${(dist.count / analytics.overview.totalCompanies) * 100}%`
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm w-8">{dist.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>LCA Data Quality</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Products with LCA</span>
                          <span className="text-lg font-bold text-green-600">
                            {analytics.dataQuality.lcaDataQuality.productsWithLCA}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Products without LCA</span>
                          <span className="text-lg font-bold text-orange-600">
                            {analytics.dataQuality.lcaDataQuality.productsWithoutLCA}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">LCA Completeness</span>
                          <span className="text-lg font-bold">
                            {analytics.dataQuality.lcaDataQuality.avgLCACompleteness}%
                          </span>
                        </div>
                        <Progress value={analytics.dataQuality.lcaDataQuality.avgLCACompleteness} className="mt-2" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Data Freshness</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {analytics.dataQuality.dataFreshness.fresh}
                        </div>
                        <div className="text-sm text-green-700">Fresh (&lt; 7 days)</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {analytics.dataQuality.dataFreshness.stale}
                        </div>
                        <div className="text-sm text-orange-700">Stale (7-30 days)</div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                          {analytics.dataQuality.dataFreshness.outdated}
                        </div>
                        <div className="text-sm text-red-700">Outdated (&gt; 30 days)</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* System Performance Tab */}
              <TabsContent value="performance" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Response Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Avg Response Time</span>
                          <span className="text-lg font-bold">
                            {analytics.systemPerformance.responseMetrics.avgResponseTime}ms
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">95th Percentile</span>
                          <span className="text-lg font-bold">
                            {analytics.systemPerformance.responseMetrics.p95ResponseTime}ms
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Error Rate</span>
                          <span className={`text-lg font-bold ${
                            analytics.systemPerformance.responseMetrics.errorRate > 0.1 
                              ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {(analytics.systemPerformance.responseMetrics.errorRate * 100).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Resource Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">Memory Usage</span>
                            <span className="text-sm">{analytics.systemPerformance.resourceUsage.memoryUsage}%</span>
                          </div>
                          <Progress value={analytics.systemPerformance.resourceUsage.memoryUsage} />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">Disk Usage</span>
                            <span className="text-sm">{analytics.systemPerformance.resourceUsage.diskUsage}%</span>
                          </div>
                          <Progress value={analytics.systemPerformance.resourceUsage.diskUsage} />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">DB Connections</span>
                          <span className="text-lg font-bold">
                            {analytics.systemPerformance.resourceUsage.databaseConnections}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>API Endpoint Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.systemPerformance.apiEndpointStats.map((endpoint) => (
                        <div key={endpoint.endpoint} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-mono text-sm">{endpoint.endpoint}</div>
                            <div className="text-xs text-muted-foreground">
                              {endpoint.requestCount} requests
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{endpoint.avgResponseTime}ms</div>
                            <div className={`text-xs ${
                              endpoint.errorCount > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {endpoint.errorCount} errors
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}