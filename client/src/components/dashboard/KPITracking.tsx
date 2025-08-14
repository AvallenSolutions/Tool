import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Award, 
  Calendar,
  Plus,
  BarChart3
} from "lucide-react";

interface KPIData {
  id: string;
  name: string;
  current: number;
  target: number;
  unit: string;
  category: 'emissions' | 'efficiency' | 'sustainability' | 'compliance';
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  deadline?: string;
  status: 'on-track' | 'at-risk' | 'behind' | 'achieved';
}

interface KPIResponse {
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
  emissions: { 
    color: 'bg-red-100 text-red-800 border-red-200', 
    label: 'Emissions' 
  },
  efficiency: { 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    label: 'Efficiency' 
  },
  sustainability: { 
    color: 'bg-green-100 text-green-800 border-green-200', 
    label: 'Sustainability' 
  },
  compliance: { 
    color: 'bg-purple-100 text-purple-800 border-purple-200', 
    label: 'Compliance' 
  },
};

const statusConfig = {
  'on-track': { 
    color: 'bg-green-100 text-green-800', 
    label: 'On Track' 
  },
  'at-risk': { 
    color: 'bg-yellow-100 text-yellow-800', 
    label: 'At Risk' 
  },
  'behind': { 
    color: 'bg-red-100 text-red-800', 
    label: 'Behind' 
  },
  'achieved': { 
    color: 'bg-blue-100 text-blue-800', 
    label: 'Achieved' 
  },
};

export function KPITracking() {
  const { data, isLoading, error } = useQuery<KPIResponse>({
    queryKey: ['/api/kpi-data'],
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
  });

  if (isLoading) {
    return (
      <Card className="bg-white border shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            KPI Dashboard
          </CardTitle>
          <CardDescription>Track your sustainability goals and metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-white border shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            KPI Dashboard
          </CardTitle>
          <CardDescription>Track your sustainability goals and metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Target className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">No KPIs set up yet</p>
            <p className="text-sm text-gray-500 mb-4">Create your first sustainability goal to start tracking progress</p>
            <Button className="bg-avallen-green hover:bg-avallen-green/90">
              <Plus className="w-4 h-4 mr-2" />
              Add KPI
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { kpis, overallProgress, summary } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Total KPIs</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.total}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">On Track</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{summary.onTrack}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Achieved</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-blue-600">{summary.achieved}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium">At Risk</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{summary.atRisk}</p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card className="bg-white border shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Overall Progress
          </CardTitle>
          <CardDescription>Your aggregate sustainability goal achievement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to Goals</span>
              <span className="font-medium">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Individual KPIs */}
      <Card className="bg-white border shadow">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              KPI Tracking
            </CardTitle>
            <CardDescription>Monitor individual sustainability metrics</CardDescription>
          </div>
          <Button size="sm" className="bg-avallen-green hover:bg-avallen-green/90">
            <Plus className="w-4 h-4 mr-2" />
            Add KPI
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {kpis.map((kpi) => {
              const progress = Math.min((kpi.current / kpi.target) * 100, 100);
              const categoryStyle = categoryConfig[kpi.category];
              const statusStyle = statusConfig[kpi.status];
              const TrendIcon = kpi.trend === 'up' ? TrendingUp : 
                              kpi.trend === 'down' ? TrendingDown : Target;
              
              return (
                <div
                  key={kpi.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50 hover:bg-white"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{kpi.name}</h4>
                        <Badge variant="outline" className={categoryStyle.color}>
                          {categoryStyle.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>
                          {kpi.current.toLocaleString()} / {kpi.target.toLocaleString()} {kpi.unit}
                        </span>
                        {kpi.deadline && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(kpi.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={statusStyle.color}>
                        {statusStyle.label}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm">
                        <TrendIcon className={`w-4 h-4 ${
                          kpi.trend === 'up' ? 'text-green-500' : 
                          kpi.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                        }`} />
                        <span className={`${
                          kpi.trend === 'up' ? 'text-green-600' : 
                          kpi.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {kpi.trendValue > 0 ? '+' : ''}{kpi.trendValue}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span className="font-medium">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}