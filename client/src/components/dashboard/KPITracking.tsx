import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Award, 
  Calendar,
  Plus,
  BarChart3,
  CheckSquare,
  Square
} from "lucide-react";
import { KPIDetailModal } from './KPIDetailModal';

interface KPIData {
  id: string;
  name: string;
  current: number;
  target: number;
  unit: string;
  category: 'environmental' | 'social' | 'engagement';
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  deadline?: string;
  status: 'on-track' | 'at-risk' | 'behind' | 'achieved';
  isCustom: boolean;
}

interface ProjectGoal {
  id: string;
  title: string;
  milestones: Array<{ text: string; isComplete: boolean }>;
  completionPercentage: number;
}

interface KPIDashboardResponse {
  kpis: KPIData[];
  projectGoals: ProjectGoal[];
  overallProgress: number;
  summary: {
    total: number;
    onTrack: number;
    atRisk: number;
    achieved: number;
  };
}

interface NewKPIFormData {
  kpiName: string;
  kpiType: 'Environmental' | 'Social' | 'Engagement';
  unit: string;
  numeratorDataPoint: string;
  denominatorDataPoint?: string;
}

interface ProjectGoalFormData {
  goalTitle: string;
  milestones: string[];
}

const categoryConfig = {
  environmental: { 
    color: 'bg-green-100 text-green-800 border-green-200', 
    label: 'Environmental' 
  },
  social: { 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    label: 'Social' 
  },
  engagement: { 
    color: 'bg-purple-100 text-purple-800 border-purple-200', 
    label: 'Engagement' 
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

const dataPointOptions = [
  'total_carbon_footprint',
  'total_production_volume', 
  'total_water_consumption',
  'total_energy_consumption',
  'renewable_energy_kwh',
  'total_energy_kwh',
  'recycled_waste',
  'total_waste_generated',
  'recyclable_packaging_weight',
  'total_packaging_weight',
  'verified_sustainable_suppliers',
  'total_suppliers',
  'local_ingredients_volume',
  'total_ingredients_volume'
];

export function KPITracking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedKPI, setSelectedKPI] = useState<KPIData | null>(null);
  const [showNewKPIDialog, setShowNewKPIDialog] = useState(false);
  const [showProjectGoalDialog, setShowProjectGoalDialog] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<ProjectGoal | null>(null);
  const [milestoneInputs, setMilestoneInputs] = useState<string[]>(['']);
  
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<NewKPIFormData>();
  const { register: registerGoal, handleSubmit: handleSubmitGoal, reset: resetGoal, formState: { errors: goalErrors } } = useForm<ProjectGoalFormData>();

  const { data: dashboardData, isLoading } = useQuery<KPIDashboardResponse>({
    queryKey: ['/api/dashboard/kpis'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const createKPIMutation = useMutation({
    mutationFn: async (kpiData: NewKPIFormData) => {
      return await apiRequest('/api/kpis/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kpiData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/kpis'] });
      setShowNewKPIDialog(false);
      reset();
      toast({
        title: "Custom KPI Created",
        description: "Your new KPI has been added and will calculate automatically.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create custom KPI. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createProjectGoalMutation = useMutation({
    mutationFn: async (goalData: { goalTitle: string; milestones: Array<{ text: string; isComplete: boolean }> }) => {
      return await apiRequest('/api/goals/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/kpis'] });
      setShowProjectGoalDialog(false);
      resetGoal();
      setMilestoneInputs(['']);
      toast({
        title: "Project Goal Created",
        description: "Your new project goal has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project goal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMilestonesMutation = useMutation({
    mutationFn: async ({ goalId, milestones }: { goalId: string; milestones: Array<{ text: string; isComplete: boolean }> }) => {
      return await apiRequest(`/api/goals/project/${goalId}/milestones`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestones }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/kpis'] });
      toast({
        title: "Milestones Updated",
        description: "Project milestones have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update milestones. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmitKPI = (data: NewKPIFormData) => {
    createKPIMutation.mutate(data);
  };

  const onSubmitProjectGoal = () => {
    const validMilestones = milestoneInputs.filter(text => text.trim() !== '');
    if (validMilestones.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one milestone.",
        variant: "destructive",
      });
      return;
    }

    const goalData = {
      goalTitle: watch('goalTitle') || '',
      milestones: validMilestones.map(text => ({ text, isComplete: false }))
    };

    createProjectGoalMutation.mutate(goalData);
  };

  const toggleMilestone = (goal: ProjectGoal, milestoneIndex: number) => {
    const updatedMilestones = goal.milestones.map((milestone, index) => 
      index === milestoneIndex 
        ? { ...milestone, isComplete: !milestone.isComplete }
        : milestone
    );
    
    updateMilestonesMutation.mutate({ 
      goalId: goal.id, 
      milestones: updatedMilestones 
    });
  };

  const addMilestoneInput = () => {
    setMilestoneInputs([...milestoneInputs, '']);
  };

  const updateMilestoneInput = (index: number, value: string) => {
    const updated = [...milestoneInputs];
    updated[index] = value;
    setMilestoneInputs(updated);
  };

  const removeMilestoneInput = (index: number) => {
    setMilestoneInputs(milestoneInputs.filter((_, i) => i !== index));
  };

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
                <div className="h-2 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const kpis = dashboardData?.kpis || [];
  const projectGoals = dashboardData?.projectGoals || [];
  const overallProgress = dashboardData?.overallProgress || 0;
  const summary = dashboardData?.summary || { total: 0, onTrack: 0, atRisk: 0, achieved: 0 };

  return (
    <div className="space-y-6">
      {/* Overall Progress Header */}
      <Card className="bg-white border shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                KPI Dashboard
              </CardTitle>
              <CardDescription>Track your sustainability goals and metrics</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowNewKPIDialog(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add KPI
              </Button>
              <Button onClick={() => setShowProjectGoalDialog(true)} variant="outline" size="sm">
                <Target className="w-4 h-4 mr-2" />
                Add Goal
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{summary.achieved}</div>
              <div className="text-sm text-gray-600">Achieved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.onTrack}</div>
              <div className="text-sm text-gray-600">On Track</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{summary.atRisk}</div>
              <div className="text-sm text-gray-600">At Risk</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{summary.total - summary.achieved - summary.onTrack - summary.atRisk}</div>
              <div className="text-sm text-gray-600">Behind</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.id} className="bg-white border shadow hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedKPI(kpi)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{kpi.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={categoryConfig[kpi.category]?.color}>
                    {categoryConfig[kpi.category]?.label}
                  </Badge>
                  {kpi.isCustom && (
                    <Badge variant="secondary" className="text-xs">Custom</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{kpi.current.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">of {kpi.target} {kpi.unit}</div>
                  </div>
                  <div className="text-right">
                    <Badge className={statusConfig[kpi.status]?.color}>
                      {statusConfig[kpi.status]?.label}
                    </Badge>
                    <div className="flex items-center text-sm mt-1">
                      {kpi.trend === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      ) : kpi.trend === 'down' ? (
                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                      ) : null}
                      <span className={`${kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                        {kpi.trendValue > 0 ? '+' : ''}{kpi.trendValue}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.min((kpi.current / kpi.target) * 100, 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min((kpi.current / kpi.target) * 100, 100)} className="h-2" />
                </div>
                
                {kpi.deadline && (
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="w-3 h-3 mr-1" />
                    Due: {new Date(kpi.deadline).toLocaleDateString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Project Goals */}
      {projectGoals.length > 0 && (
        <Card className="bg-white border shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Project Goals
            </CardTitle>
            <CardDescription>Track milestone-based qualitative goals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projectGoals.map((goal) => (
                <div key={goal.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{goal.title}</h4>
                    <Badge variant="outline" className={
                      goal.completionPercentage === 100 ? 'bg-green-100 text-green-800' :
                      goal.completionPercentage >= 60 ? 'bg-blue-100 text-blue-800' :
                      goal.completionPercentage >= 30 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {goal.completionPercentage}% Complete
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {goal.milestones.map((milestone, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <button
                          onClick={() => toggleMilestone(goal, index)}
                          className="flex-shrink-0"
                        >
                          {milestone.isComplete ? (
                            <CheckSquare className="w-4 h-4 text-green-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <span className={`text-sm ${milestone.isComplete ? 'line-through text-gray-500' : ''}`}>
                          {milestone.text}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-3">
                    <Progress value={goal.completionPercentage} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Detail Modal */}
      {selectedKPI && (
        <KPIDetailModal 
          kpi={selectedKPI} 
          isOpen={!!selectedKPI} 
          onClose={() => setSelectedKPI(null)} 
        />
      )}

      {/* Add Custom KPI Dialog */}
      <Dialog open={showNewKPIDialog} onOpenChange={setShowNewKPIDialog}>
        <DialogContent className="bg-white border shadow max-w-md">
          <DialogHeader>
            <DialogTitle>Create Custom KPI</DialogTitle>
            <DialogDescription>
              Add a new KPI with automatic calculation based on your data
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmitKPI)} className="space-y-4">
            <div>
              <Label htmlFor="kpiName">KPI Name</Label>
              <Input 
                id="kpiName"
                {...register('kpiName', { required: 'KPI name is required' })}
                placeholder="e.g. Carbon Intensity"
              />
              {errors.kpiName && (
                <p className="text-sm text-red-600 mt-1">{errors.kpiName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="kpiType">Category</Label>
              <Select onValueChange={(value) => setValue('kpiType', value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Environmental">Environmental</SelectItem>
                  <SelectItem value="Social">Social</SelectItem>
                  <SelectItem value="Engagement">Engagement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input 
                id="unit"
                {...register('unit', { required: 'Unit is required' })}
                placeholder="e.g. kg CO₂e/L, %, score"
              />
              {errors.unit && (
                <p className="text-sm text-red-600 mt-1">{errors.unit.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="numeratorDataPoint">Numerator Data Point</Label>
              <Select onValueChange={(value) => setValue('numeratorDataPoint', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select numerator data" />
                </SelectTrigger>
                <SelectContent>
                  {dataPointOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="denominatorDataPoint">Denominator Data Point (Optional)</Label>
              <Select onValueChange={(value) => setValue('denominatorDataPoint', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select denominator data (for ratios)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (Simple Value)</SelectItem>
                  {dataPointOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewKPIDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createKPIMutation.isPending}>
                {createKPIMutation.isPending ? 'Creating...' : 'Create KPI'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Project Goal Dialog */}
      <Dialog open={showProjectGoalDialog} onOpenChange={setShowProjectGoalDialog}>
        <DialogContent className="bg-white border shadow max-w-md">
          <DialogHeader>
            <DialogTitle>Create Project Goal</DialogTitle>
            <DialogDescription>
              Add a qualitative goal with milestone tracking
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="goalTitle">Goal Title</Label>
              <Input 
                id="goalTitle"
                {...registerGoal('goalTitle', { required: 'Goal title is required' })}
                placeholder="e.g. Reduce Packaging Waste by 30%"
              />
              {goalErrors.goalTitle && (
                <p className="text-sm text-red-600 mt-1">{goalErrors.goalTitle.message}</p>
              )}
            </div>

            <div>
              <Label>Milestones</Label>
              <div className="space-y-2">
                {milestoneInputs.map((milestone, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={milestone}
                      onChange={(e) => updateMilestoneInput(index, e.target.value)}
                      placeholder={`Milestone ${index + 1}`}
                      className="flex-1"
                    />
                    {milestoneInputs.length > 1 && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeMilestoneInput(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addMilestoneInput}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Milestone
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowProjectGoalDialog(false)}>
                Cancel
              </Button>
              <Button onClick={onSubmitProjectGoal} disabled={createProjectGoalMutation.isPending}>
                {createProjectGoalMutation.isPending ? 'Creating...' : 'Create Goal'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}