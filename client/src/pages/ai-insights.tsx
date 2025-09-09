import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import AIInsightsDashboard from "@/components/insights/AIInsightsDashboard";
import { 
  Brain, 
  TrendingUp, 
  Target, 
  BarChart3,
  RefreshCw,
  Download,
  Sparkles,
  Lightbulb,
  Zap,
  AlertTriangle,
  CheckCircle,
  Calendar,
  ArrowRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CompanyMetrics {
  totalCO2Emissions: number;
  totalWaterUsage: number;
  totalWasteGenerated: number;
  activeGoals: number;
  completedGoals: number;
  overallProgress: number;
}

interface TrendData {
  period: string;
  carbon: number;
  water: number;
  waste: number;
  progress: number;
}

export default function AIInsightsPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('6months');
  const [analysisDepth, setAnalysisDepth] = useState('comprehensive');
  const { toast } = useToast();

  // Fetch overall company performance for context
  const { data: metricsData } = useQuery<CompanyMetrics>({
    queryKey: ['/api/enhanced-kpis/dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/enhanced-kpis/dashboard', {
        credentials: 'include'
      });
      return response.json();
    },
  });

  // Fetch trend data for analysis context
  const { data: trendData } = useQuery<TrendData[]>({
    queryKey: ['/api/analytics/trends', selectedTimeframe],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/trends?period=${selectedTimeframe}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        // Return mock data if endpoint doesn't exist yet
        return [
          { period: '2024-06', carbon: 850, water: 12000, waste: 45, progress: 65 },
          { period: '2024-07', carbon: 820, water: 11800, waste: 42, progress: 70 },
          { period: '2024-08', carbon: 790, water: 11500, waste: 38, progress: 75 },
          { period: '2024-09', carbon: 760, water: 11200, waste: 35, progress: 80 },
        ];
      }
      return response.json();
    },
  });

  const handleExportInsights = async () => {
    try {
      const response = await fetch('/api/insights/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeframe: selectedTimeframe,
          analysisDepth,
          includeRecommendations: true
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-insights-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "AI insights report has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export Failed", 
        description: "Could not export insights. Feature coming soon!",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="ml-64">
        <Header />
        <main className="p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Insights Center</h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Intelligent analysis and recommendations for your sustainability journey
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Select value={analysisDepth} onValueChange={setAnalysisDepth}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overview">Overview</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="comprehensive">Comprehensive</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button variant="outline" onClick={handleExportInsights}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>

            {/* Key Metrics Overview */}
            {metricsData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Carbon Footprint</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metricsData.totalCO2Emissions?.toFixed(1) || 'N/A'} t</div>
                    <p className="text-xs text-muted-foreground">Total CO₂e emissions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Water Usage</CardTitle>
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metricsData.totalWaterUsage?.toLocaleString() || 'N/A'} L</div>
                    <p className="text-xs text-muted-foreground">Annual water consumption</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
                    <Target className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metricsData.activeGoals || 0}</div>
                    <p className="text-xs text-muted-foreground">{metricsData.completedGoals || 0} completed this year</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metricsData.overallProgress || 0}%</div>
                    <p className="text-xs text-muted-foreground">Towards sustainability goals</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Analysis Tabs */}
            <Tabs defaultValue="insights" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="insights" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Insights
                </TabsTrigger>
                <TabsTrigger value="trends" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Trend Analysis
                </TabsTrigger>
                <TabsTrigger value="predictions" className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Predictions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="insights">
                <AIInsightsDashboard 
                  categories={['carbon', 'water', 'waste', 'energy', 'supply_chain', 'social']}
                  showOverallInsights={true}
                  compact={false}
                />
              </TabsContent>

              <TabsContent value="trends">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Performance Trends</CardTitle>
                        <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3months">3 Months</SelectItem>
                            <SelectItem value="6months">6 Months</SelectItem>
                            <SelectItem value="1year">1 Year</SelectItem>
                            <SelectItem value="2years">2 Years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-12">
                        <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Trend Analysis Coming Soon</h3>
                        <p className="text-gray-600 mb-4">
                          Advanced trend analysis and pattern recognition will be available in the next update.
                        </p>
                        <Button variant="outline" asChild>
                          <a href="/app/dashboard">
                            View Current Metrics
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="predictions">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-purple-600" />
                        Predictive Analytics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-12">
                        <Sparkles className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Predictive Insights Coming Soon</h3>
                        <p className="text-gray-600 mb-4">
                          AI-powered predictions for goal achievement, risk assessment, and optimization opportunities.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 text-left">
                          <Card className="border-dashed border-2">
                            <CardContent className="pt-6">
                              <Target className="h-8 w-8 text-green-600 mb-2" />
                              <h4 className="font-semibold">Goal Achievement</h4>
                              <p className="text-sm text-gray-600">Predict likelihood of meeting targets</p>
                            </CardContent>
                          </Card>
                          <Card className="border-dashed border-2">
                            <CardContent className="pt-6">
                              <AlertTriangle className="h-8 w-8 text-amber-600 mb-2" />
                              <h4 className="font-semibold">Risk Assessment</h4>
                              <p className="text-sm text-gray-600">Identify potential compliance issues</p>
                            </CardContent>
                          </Card>
                          <Card className="border-dashed border-2">
                            <CardContent className="pt-6">
                              <Zap className="h-8 w-8 text-blue-600 mb-2" />
                              <h4 className="font-semibold">Optimization</h4>
                              <p className="text-sm text-gray-600">Find efficiency improvement opportunities</p>
                            </CardContent>
                          </Card>
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