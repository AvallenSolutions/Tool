import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Target, TrendingUp, TrendingDown, Award, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

interface KpiDefinition {
  id: string;
  kpiName: string;
  kpiCategory: string;
  unit: string;
  description?: string;
  formulaJson: {
    numerator: string;
    denominator?: string;
    calculation_type: 'ratio' | 'absolute' | 'percentage';
    description?: string;
  };
}

interface KpiGoalData {
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

interface GoalFormData {
  kpiDefinitionId: string;
  targetReductionPercentage: number;
  targetDate: Date | undefined;
}

const statusConfig = {
  'on-track': { color: 'bg-green-500', label: 'On Track', icon: TrendingUp },
  'at-risk': { color: 'bg-yellow-500', label: 'At Risk', icon: Clock },
  'behind': { color: 'bg-red-500', label: 'Behind', icon: AlertTriangle },
  'achieved': { color: 'bg-blue-500', label: 'Achieved', icon: Award },
};

const categoryColors = {
  'Environmental': 'bg-green-100 text-green-800 border-green-200',
  'Supply Chain': 'bg-blue-100 text-blue-800 border-blue-200',
  'Production': 'bg-purple-100 text-purple-800 border-purple-200',
};

export function KPIsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<KpiDefinition | null>(null);
  const [goalFormData, setGoalFormData] = useState<GoalFormData>({
    kpiDefinitionId: '',
    targetReductionPercentage: 10,
    targetDate: undefined,
  });
  const [calculatedBaseline, setCalculatedBaseline] = useState<number | null>(null);
  const [isCalculatingBaseline, setIsCalculatingBaseline] = useState(false);
  const [kpiBaselines, setKpiBaselines] = useState<Record<string, number>>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch KPI definitions
  const { data: definitionsData, isLoading: definitionsLoading } = useQuery({
    queryKey: selectedCategory === 'all' ? ['/api/enhanced-kpis/definitions'] : ['/api/enhanced-kpis/definitions', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory === 'all' ? '/api/enhanced-kpis/definitions' : `/api/enhanced-kpis/definitions?category=${selectedCategory}`;
      const response = await fetch(url);
      return await response.json();
    },
  });

  // Fetch dashboard data (existing goals and progress)
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['/api/enhanced-kpis/dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/enhanced-kpis/dashboard');
      return await response.json();
    },
  });

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: async (goalData: any) => {
      const response = await fetch('/api/enhanced-kpis/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData),
      });
      if (!response.ok) {
        throw new Error('Failed to create goal');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enhanced-kpis/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/enhanced-kpis/goals'] });
      setIsGoalDialogOpen(false);
      setSelectedKpi(null);
      setGoalFormData({ kpiDefinitionId: '', targetReductionPercentage: 10, targetDate: undefined });
      setCalculatedBaseline(null);
      setIsCalculatingBaseline(false);
      toast({
        title: "Goal Created",
        description: "Your KPI goal has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create KPI goal",
        variant: "destructive",
      });
    },
  });

  const definitions: KpiDefinition[] = definitionsData?.definitions || [];
  const kpiGoals: KpiGoalData[] = dashboardData?.data?.kpiGoals || [];
  const summary = dashboardData?.data?.summary || { total: 0, onTrack: 0, atRisk: 0, behind: 0, achieved: 0 };

  const categories = ['all', ...Array.from(new Set(definitions.map(d => d.kpiCategory)))];

  // Load baselines for all KPIs when definitions are loaded
  const loadKpiBaselines = async () => {
    if (definitions.length === 0) return;
    
    const baselinePromises = definitions.map(async (kpi) => {
      try {
        const response = await fetch('/api/enhanced-kpis/calculate-baseline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kpiDefinitionId: kpi.id }),
        });
        
        if (response.ok) {
          const data = await response.json();
          return { kpiId: kpi.id, baseline: data.baseline };
        }
        return { kpiId: kpi.id, baseline: 0 };
      } catch (error) {
        console.error(`Error calculating baseline for ${kpi.kpiName}:`, error);
        return { kpiId: kpi.id, baseline: 0 };
      }
    });
    
    const results = await Promise.all(baselinePromises);
    const baselinesMap = results.reduce((acc, { kpiId, baseline }) => {
      acc[kpiId] = baseline;
      return acc;
    }, {} as Record<string, number>);
    
    setKpiBaselines(baselinesMap);
  };

  // Load baselines when definitions change
  useEffect(() => {
    loadKpiBaselines();
  }, [definitions.length]);

  const handleSetGoal = async (kpi: KpiDefinition) => {
    setSelectedKpi(kpi);
    setGoalFormData(prev => ({ ...prev, kpiDefinitionId: kpi.id }));
    setIsGoalDialogOpen(true);
    
    // Calculate baseline automatically when KPI is selected
    setIsCalculatingBaseline(true);
    setCalculatedBaseline(null);
    
    try {
      const response = await fetch(`/api/enhanced-kpis/calculate-baseline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kpiDefinitionId: kpi.id }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setCalculatedBaseline(data.baseline);
      } else {
        console.error('Failed to calculate baseline');
        setCalculatedBaseline(0);
      }
    } catch (error) {
      console.error('Error calculating baseline:', error);
      setCalculatedBaseline(0);
    } finally {
      setIsCalculatingBaseline(false);
    }
  };

  const handleCreateGoal = () => {
    if (!selectedKpi || !goalFormData.targetDate || calculatedBaseline === null) {
      toast({
        title: "Missing Information",
        description: "Please wait for baseline calculation to complete and select a target date.",
        variant: "destructive",
      });
      return;
    }

    createGoalMutation.mutate({
      kpiDefinitionId: goalFormData.kpiDefinitionId,
      targetReductionPercentage: goalFormData.targetReductionPercentage,
      targetDate: format(goalFormData.targetDate, 'yyyy-MM-dd'),
      // Note: baselineValue will be calculated automatically by the backend
    });
  };

  if (definitionsLoading || dashboardLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header 
          title="KPI Management" 
          subtitle="Track key performance indicators and sustainability goals"
        />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">KPI & Goal Management</h1>
        <p className="text-gray-600">
          Set sustainability targets, track progress, and drive environmental improvements across your operations.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500">Total Goals</span>
            </div>
            <p className="text-2xl font-bold">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-500">On Track</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{summary.onTrack}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-gray-500">At Risk</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{summary.atRisk}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-gray-500">Behind</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{summary.behind}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-500">Achieved</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{summary.achieved}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="library" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="library">KPI Library</TabsTrigger>
          <TabsTrigger value="dashboard">Progress Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-6">
          {/* Category Filter */}
          <div className="flex space-x-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="capitalize"
              >
                {category === 'all' ? 'All Categories' : category}
              </Button>
            ))}
          </div>

          {/* KPI Definitions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {definitions.map((kpi) => (
              <Card key={kpi.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{kpi.kpiName}</CardTitle>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", categoryColors[kpi.kpiCategory as keyof typeof categoryColors])}
                      >
                        {kpi.kpiCategory}
                      </Badge>
                    </div>
                    <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {kpi.unit}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-sm leading-relaxed">
                    {kpi.description}
                  </CardDescription>
                  
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-600 font-medium mb-1">Current Baseline</p>
                    <div className="flex items-center space-x-2">
                      {kpiBaselines[kpi.id] !== undefined ? (
                        <p className="text-sm font-semibold text-blue-900">
                          {kpiBaselines[kpi.id].toFixed(4)} {kpi.unit}
                        </p>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                          <span className="text-xs text-blue-600">Calculating...</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-blue-500 mt-1">🤖 Live data from your platform</p>
                  </div>

                  <Button 
                    onClick={() => handleSetGoal(kpi)} 
                    className="w-full"
                    size="sm"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Set Goal
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6">
          {kpiGoals.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Target className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Goals Set Yet</h3>
                <p className="text-gray-600 mb-4">
                  Start tracking your sustainability progress by setting goals from the KPI Library.
                </p>
                <Button onClick={() => setSelectedCategory('all')}>
                  Browse KPI Library
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {kpiGoals.map((goal) => {
                const statusInfo = statusConfig[goal.status];
                const Icon = statusInfo.icon;
                
                return (
                  <Card key={goal.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{goal.name}</CardTitle>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {goal.category}
                          </Badge>
                        </div>
                        <div className={cn("flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium text-white", statusInfo.color)}>
                          <Icon className="w-3 h-3" />
                          <span>{statusInfo.label}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span className="font-medium">{Math.round(goal.progress)}%</span>
                        </div>
                        <Progress value={goal.progress} className="h-2" />
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Current</p>
                          <p className="font-medium">{goal.currentValue.toFixed(2)} {goal.unit}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Target</p>
                          <p className="font-medium">{goal.targetValue.toFixed(2)} {goal.unit}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Deadline</p>
                          <p className="font-medium">{format(new Date(goal.targetDate), 'MMM yyyy')}</p>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Target Reduction</p>
                        <p className="text-sm font-medium text-green-600">
                          {goal.targetReductionPercentage}% reduction from baseline
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Goal Setting Dialog */}
      <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border shadow-lg">
          <DialogHeader>
            <DialogTitle>Set KPI Goal</DialogTitle>
            <DialogDescription>
              {selectedKpi && `Set a sustainability goal for ${selectedKpi.kpiName}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedKpi && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-1">{selectedKpi.kpiName}</h4>
                <p className="text-sm text-green-700">{selectedKpi.description}</p>
                <p className="text-xs text-green-600 mt-2">Unit: {selectedKpi.unit}</p>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <Label className="text-blue-900 font-medium">Calculated Baseline Value</Label>
                  <div className="mt-2">
                    {isCalculatingBaseline ? (
                      <div className="flex items-center space-x-2 text-blue-700">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm">Calculating baseline...</span>
                      </div>
                    ) : calculatedBaseline !== null ? (
                      <div>
                        <p className="text-lg font-semibold text-blue-900">
                          {calculatedBaseline.toFixed(4)} {selectedKpi.unit}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          🤖 Auto-calculated from your current platform data
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-blue-600">Baseline will be calculated automatically</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="reduction">Target Reduction (%)</Label>
                  <Input
                    id="reduction"
                    type="number"
                    min="1"
                    max="100"
                    value={goalFormData.targetReductionPercentage}
                    onChange={(e) => setGoalFormData(prev => ({ ...prev, targetReductionPercentage: parseInt(e.target.value) || 10 }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {calculatedBaseline !== null 
                      ? `Target: ${(calculatedBaseline * (1 - goalFormData.targetReductionPercentage / 100)).toFixed(2)} ${selectedKpi.unit}`
                      : 'Target will be calculated after baseline is determined'
                    }
                  </p>
                </div>

                <div>
                  <Label>Target Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !goalFormData.targetDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {goalFormData.targetDate ? format(goalFormData.targetDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border shadow-lg">
                      <Calendar
                        mode="single"
                        selected={goalFormData.targetDate}
                        onSelect={(date) => setGoalFormData(prev => ({ ...prev, targetDate: date }))}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsGoalDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateGoal}
                  disabled={createGoalMutation.isPending}
                >
                  {createGoalMutation.isPending ? "Creating..." : "Create Goal"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}