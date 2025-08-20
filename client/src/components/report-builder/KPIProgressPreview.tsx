import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Target, Award, Activity } from "lucide-react";

interface KPIData {
  id: string;
  name: string;
  current: number;
  target: number;
  unit: string;
  category: 'environmental' | 'social' | 'engagement';
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  status: 'on-track' | 'at-risk' | 'behind' | 'achieved';
  isCustom: boolean;
}

interface KPIDashboardResponse {
  kpis: KPIData[];
  overallProgress: number;
  summary: {
    total: number;
    onTrack: number;
    atRisk: number;
    achieved: number;
  };
}

const categoryConfig = {
  environmental: { 
    color: 'bg-green-100 text-green-800 border-green-200', 
    label: 'Environmental',
    icon: Activity
  },
  social: { 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    label: 'Social',
    icon: Target
  },
  engagement: { 
    color: 'bg-purple-100 text-purple-800 border-purple-200', 
    label: 'Engagement',
    icon: Award
  },
};

const statusConfig = {
  'on-track': { color: 'bg-green-100 text-green-800', label: 'On Track' },
  'at-risk': { color: 'bg-yellow-100 text-yellow-800', label: 'At Risk' },
  'behind': { color: 'bg-red-100 text-red-800', label: 'Behind' },
  'achieved': { color: 'bg-blue-100 text-blue-800', label: 'Achieved' },
};

export function KPIProgressPreview() {
  const { data: kpiData, isLoading } = useQuery<KPIDashboardResponse>({
    queryKey: ['/api/dashboard/kpis'],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const kpis = kpiData?.kpis || [];
  const summary = kpiData?.summary || { total: 0, onTrack: 0, atRisk: 0, achieved: 0 };
  const overallProgress = kpiData?.overallProgress || 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Key Performance Indicators</h3>
        <p className="text-gray-600 text-sm mb-4">
          Track progress toward our sustainability goals and performance targets.
        </p>
        
        {/* Overall Progress */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-gray-600">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{summary.achieved}</div>
            <div className="text-xs text-gray-600">Achieved</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{summary.onTrack}</div>
            <div className="text-xs text-gray-600">On Track</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-yellow-600">{summary.atRisk}</div>
            <div className="text-xs text-gray-600">At Risk</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-600">{summary.total - summary.achieved - summary.onTrack - summary.atRisk}</div>
            <div className="text-xs text-gray-600">Behind</div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {kpis.slice(0, 6).map((kpi) => {
          const progress = (kpi.current / kpi.target) * 100;
          const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus;
          const CategoryIcon = categoryConfig[kpi.category]?.icon || Activity;
          
          return (
            <Card key={kpi.id} className="bg-white border border-gray-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CategoryIcon className="w-4 h-4 text-gray-500" />
                    <CardTitle className="text-sm font-medium truncate">{kpi.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className={statusConfig[kpi.status].color}>
                      {statusConfig[kpi.status].label}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Current vs Target */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Current</span>
                    <span className="font-medium">{kpi.current.toFixed(1)} {kpi.unit}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Target</span>
                    <span className="font-medium">{kpi.target} {kpi.unit}</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Progress</span>
                      <span>{Math.min(progress, 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={Math.min(progress, 100)} className="h-2" />
                  </div>
                  
                  {/* Trend */}
                  <div className="flex items-center gap-2 text-xs">
                    <TrendIcon className={`w-3 h-3 ${
                      kpi.trend === 'up' ? 'text-green-500' : 
                      kpi.trend === 'down' ? 'text-red-500' : 
                      'text-gray-500'
                    }`} />
                    <span className="text-gray-600">
                      {kpi.trend === 'up' ? 'Improving' : 
                       kpi.trend === 'down' ? 'Declining' : 
                       'Stable'}
                    </span>
                    {kpi.isCustom && (
                      <Badge variant="secondary" className="text-xs">Custom</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bottom Note */}
      <div className="text-center text-xs text-gray-500 mt-4">
        <p>
          {kpis.length > 6 ? `Showing top 6 of ${kpis.length} KPIs. ` : `${kpis.length} KPIs tracked. `}
          Values are calculated from company operational data and updated automatically.
        </p>
      </div>
    </div>
  );
}