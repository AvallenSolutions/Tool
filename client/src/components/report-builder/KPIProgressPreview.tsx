import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, Minus, Target, Award, Activity, Settings, Clock, AlertTriangle, CheckCircle } from "lucide-react";

// Live KPI data structure from enhanced KPI endpoint
interface LiveKPIGoalData {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentValue: number;
  baselineValue: number;
  targetValue: number;
  targetReductionPercentage: number;
  targetDate: string;
  progress: number;
  status: 'on-track' | 'at-risk' | 'behind' | 'achieved';
  description?: string;
}

interface LiveKPIDashboardResponse {
  success: boolean;
  data: {
    kpiGoals: LiveKPIGoalData[];
    summary: {
      total: number;
      onTrack: number;
      atRisk: number;
      behind: number;
      achieved: number;
    };
  };
}

const statusConfig = {
  'on-track': { color: 'bg-green-100 text-green-800', label: 'On Track' },
  'at-risk': { color: 'bg-yellow-100 text-yellow-800', label: 'At Risk' },
  'behind': { color: 'bg-red-100 text-red-800', label: 'Behind' },
  'achieved': { color: 'bg-blue-100 text-blue-800', label: 'Achieved' },
};

interface KPIProgressPreviewProps {
  block?: {
    id: string;
    content?: {
      selectedKPIs?: string[];
    };
  };
  onUpdate?: (blockId: string, content: any) => void;
  isPreview?: boolean;
}

export function KPIProgressPreview({ block, onUpdate, isPreview = false }: KPIProgressPreviewProps) {
  // Fetch live KPI data from enhanced endpoint
  const { data: liveKpiData, isLoading } = useQuery<LiveKPIDashboardResponse>({
    queryKey: ['/api/enhanced-kpis/dashboard'],
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

  // Get live KPI data
  const allKPIs = liveKpiData?.data?.kpiGoals || [];
  const summary = liveKpiData?.data?.summary || { total: 0, onTrack: 0, atRisk: 0, behind: 0, achieved: 0 };
  
  // Filter KPIs based on selection (default to first 6 if none selected)
  const selectedKPIIds = block?.content?.selectedKPIs || [];
  const displayKPIs = selectedKPIIds.length > 0 
    ? allKPIs.filter(kpi => selectedKPIIds.includes(kpi.id))
    : allKPIs.slice(0, 6);
  
  // Calculate overall progress from selected KPIs
  const overallProgress = displayKPIs.length > 0 
    ? displayKPIs.reduce((sum, kpi) => sum + kpi.progress, 0) / displayKPIs.length
    : 0;

  // Handle KPI selection update
  const updateSelectedKPIs = (kpiId: string, isSelected: boolean) => {
    if (!block || !onUpdate) return;
    
    const currentSelection = block.content?.selectedKPIs || [];
    const newSelection = isSelected 
      ? [...currentSelection, kpiId]
      : currentSelection.filter(id => id !== kpiId);
    
    onUpdate(block.id, {
      ...block.content,
      selectedKPIs: newSelection
    });
  };

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
            <span className="text-sm text-gray-600">{overallProgress.toFixed(1)}%</span>
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
            <div className="text-xl font-bold text-red-600">{summary.behind}</div>
            <div className="text-xs text-gray-600">Behind</div>
          </div>
        </div>
      </div>

      {/* KPI Selection Interface (only in edit mode) */}
      {!isPreview && block && onUpdate && (
        <div className="mb-6">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="mb-4">
                <Settings className="w-4 h-4 mr-2" />
                Select KPIs for Report ({selectedKPIIds.length} selected)
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white border shadow">
              <DialogHeader>
                <DialogTitle>Select KPIs for Report</DialogTitle>
                <DialogDescription>
                  Choose which Key Performance Indicators to include in your sustainability report.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {allKPIs.map((kpi) => {
                  const isSelected = selectedKPIIds.includes(kpi.id);
                  const StatusIcon = kpi.status === 'achieved' ? CheckCircle :
                                   kpi.status === 'on-track' ? Target :
                                   kpi.status === 'at-risk' ? Clock : AlertTriangle;
                  
                  return (
                    <div key={kpi.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={(checked) => updateSelectedKPIs(kpi.id, checked as boolean)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon className={`w-4 h-4 ${
                            kpi.status === 'achieved' ? 'text-blue-500' :
                            kpi.status === 'on-track' ? 'text-green-500' :
                            kpi.status === 'at-risk' ? 'text-yellow-500' : 'text-red-500'
                          }`} />
                          <span className="font-medium">{kpi.name}</span>
                          <Badge variant="outline" className={statusConfig[kpi.status].color}>
                            {statusConfig[kpi.status].label}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          Current: {kpi.currentValue.toFixed(1)} {kpi.unit} | 
                          Target: {kpi.targetValue} {kpi.unit} | 
                          Progress: {kpi.progress.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500">
                          Category: {kpi.category} | Deadline: {new Date(kpi.targetDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayKPIs.map((kpi) => {
          const StatusIcon = kpi.status === 'achieved' ? CheckCircle :
                           kpi.status === 'on-track' ? Target :
                           kpi.status === 'at-risk' ? Clock : AlertTriangle;
          
          return (
            <Card key={kpi.id} className="bg-white border border-gray-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-gray-500" />
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
                    <span className="font-medium">{kpi.currentValue.toFixed(1)} {kpi.unit}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Target</span>
                    <span className="font-medium">{kpi.targetValue} {kpi.unit}</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Progress</span>
                      <span>{Math.min(kpi.progress, 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={Math.min(kpi.progress, 100)} className="h-2" />
                  </div>
                  
                  {/* Status and Deadline */}
                  <div className="flex items-center gap-2 text-xs">
                    <StatusIcon className={`w-3 h-3 ${
                      kpi.status === 'achieved' ? 'text-blue-500' :
                      kpi.status === 'on-track' ? 'text-green-500' :
                      kpi.status === 'at-risk' ? 'text-yellow-500' : 'text-red-500'
                    }`} />
                    <span className="text-gray-600">
                      Deadline: {new Date(kpi.targetDate).toLocaleDateString()}
                    </span>
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
          {displayKPIs.length > 0 
            ? `Showing ${displayKPIs.length} of ${allKPIs.length} active KPI goals. `
            : 'No KPIs selected. Click "Select KPIs for Report" to choose which goals to display. '}
          Values are calculated from live company data and updated automatically.
        </p>
      </div>
    </div>
  );
}