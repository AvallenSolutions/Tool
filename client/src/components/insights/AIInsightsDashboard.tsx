import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Target,
  Zap,
  BarChart3,
  Sparkles,
  ArrowRight,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIInsight {
  type: 'optimization' | 'best_practice' | 'warning';
  title: string;
  description: string;
  confidence: number;
  potentialImpact: 'high' | 'medium' | 'low';
  actionable: boolean;
  goalId?: string;
  linkedGoalName?: string;
}

interface InsightsData {
  recommendations: AIInsight[];
  generatedAt?: string;
  category?: string;
}

interface AIInsightsDashboardProps {
  categories?: string[];
  showOverallInsights?: boolean;
  compact?: boolean;
}

const categoryMapping: { [key: string]: string } = {
  'carbon': 'Carbon Management',
  'water': 'Water Efficiency',
  'waste': 'Waste Reduction',
  'energy': 'Energy Management',
  'supply_chain': 'Supply Chain',
  'social': 'Social Impact',
  'overall': 'Overall Performance'
};

export default function AIInsightsDashboard({ 
  categories = ['carbon', 'water', 'waste', 'energy'], 
  showOverallInsights = true,
  compact = false 
}: AIInsightsDashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(showOverallInsights ? 'overall' : categories[0]);
  const { toast } = useToast();

  // Fetch AI insights for the selected category
  const { data: insightsData, isLoading, refetch } = useQuery<InsightsData>({
    queryKey: ['/api/enhanced-kpis/ai-insights', selectedCategory],
    queryFn: async () => {
      const response = await fetch('/api/enhanced-kpis/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          category: selectedCategory, 
          context: 'dashboard',
          analysisDepth: 'comprehensive'
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch AI insights');
      }
      
      return response.json();
    },
    enabled: !!selectedCategory,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleRefreshInsights = async () => {
    try {
      await refetch();
      toast({
        title: "Insights Refreshed",
        description: "AI insights have been updated with the latest data.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh insights. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'optimization':
        return <Zap className="h-5 w-5 text-blue-600" />;
      case 'best_practice':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      default:
        return <Lightbulb className="h-5 w-5 text-purple-600" />;
    }
  };

  const getInsightBadgeColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const categoriesWithOverall = showOverallInsights ? ['overall', ...categories] : categories;

  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-purple-600" />
              AI Insights
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshInsights}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-4 bg-purple-100 rounded animate-pulse" />
              <div className="h-4 bg-purple-100 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-purple-100 rounded animate-pulse w-1/2" />
            </div>
          ) : insightsData?.recommendations?.length ? (
            <div className="space-y-3">
              {insightsData.recommendations.slice(0, 2).map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {insight.title}
                    </p>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                      {insight.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`text-xs px-2 py-1 ${getInsightBadgeColor(insight.potentialImpact)}`}>
                        {insight.potentialImpact} impact
                      </Badge>
                      <span className={`text-xs font-medium ${getConfidenceColor(insight.confidence)}`}>
                        {Math.round(insight.confidence * 100)}% confidence
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {insightsData.recommendations.length > 2 && (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href="/app/insights" className="flex items-center gap-2">
                    View All {insightsData.recommendations.length} Insights
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <Sparkles className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                No insights available. Add more data to get AI recommendations.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI-Powered Insights</h2>
            <p className="text-gray-600">Intelligent sustainability recommendations based on your data</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleRefreshInsights}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Insights
        </Button>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          {categoriesWithOverall.map((category) => (
            <TabsTrigger key={category} value={category} className="text-xs">
              {categoryMapping[category] || category.charAt(0).toUpperCase() + category.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        {categoriesWithOverall.map((category) => (
          <TabsContent key={category} value={category} className="mt-6">
            <div className="grid gap-6">
              {isLoading ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                        <div className="h-3 bg-gray-200 rounded w-2/3" />
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-200 rounded" />
                          <div className="h-3 bg-gray-200 rounded w-3/4" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : insightsData?.recommendations?.length ? (
                <div className="grid gap-4">
                  {insightsData.recommendations.map((insight, index) => (
                    <Card key={index} className="border-l-4 border-l-purple-500 hover:shadow-lg transition-all duration-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {getInsightIcon(insight.type)}
                            <div>
                              <CardTitle className="text-lg">{insight.title}</CardTitle>
                              {insight.linkedGoalName && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Target className="h-3 w-3 text-gray-500" />
                                  <span className="text-xs text-gray-600">Linked to: {insight.linkedGoalName}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${getInsightBadgeColor(insight.potentialImpact)} font-medium`}>
                              {insight.potentialImpact} impact
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 mb-4 leading-relaxed">
                          {insight.description}
                        </p>
                        
                        <div className="flex items-center justify-between pt-3 border-t">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">Confidence:</span>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={insight.confidence * 100} 
                                  className="w-20 h-2"
                                />
                                <span className={`text-sm font-medium ${getConfidenceColor(insight.confidence)}`}>
                                  {Math.round(insight.confidence * 100)}%
                                </span>
                              </div>
                            </div>
                            {insight.actionable && (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm text-green-700">Actionable</span>
                              </div>
                            )}
                          </div>
                          
                          {insight.actionable && (
                            <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                              Take Action
                              <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <Sparkles className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No insights available for {categoryMapping[category] || category}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Add more data in this category to receive AI-powered recommendations.
                    </p>
                    <Button variant="outline" asChild>
                      <a href="/app/dashboard" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Add Data
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Additional Information */}
      {insightsData?.generatedAt && (
        <div className="flex items-center gap-2 text-sm text-gray-500 justify-center">
          <Info className="h-4 w-4" />
          <span>
            Insights generated on {new Date(insightsData.generatedAt).toLocaleDateString()} at{' '}
            {new Date(insightsData.generatedAt).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}