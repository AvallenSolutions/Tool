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

const categoryColors = {
  'Environmental': 'bg-green-100 text-green-800 border-green-200',
  'Supply Chain': 'bg-blue-100 text-blue-800 border-blue-200',
  'Production': 'bg-purple-100 text-purple-800 border-purple-200',
  'Purpose & Stakeholder Governance': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Worker Engagement': 'bg-rose-100 text-rose-800 border-rose-200',
  'Human Rights': 'bg-amber-100 text-amber-800 border-amber-200',
  'JEDI': 'bg-violet-100 text-violet-800 border-violet-200',
  'Climate Action': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Risk Standards': 'bg-orange-100 text-orange-800 border-orange-200',
  'Circularity': 'bg-teal-100 text-teal-800 border-teal-200',
};

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

export function KPIsPage() {
  const [viewMode, setViewMode] = useState<'categories' | 'category-detail'>('categories');
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('');
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<KpiDefinition | null>(null);
  const [goalFormData, setGoalFormData] = useState<GoalFormData>({
    kpiDefinitionId: '',
    targetReductionPercentage: 10,
    targetDate: undefined,
  });
  const [calculatedBaseline, setCalculatedBaseline] = useState<number | null>(null);
  const [isCalculatingBaseline, setIsCalculatingBaseline] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch KPI definitions
  const { data: definitionsData, isLoading: definitionsLoading } = useQuery({
    queryKey: ['/api/enhanced-kpis/definitions'],
    queryFn: async () => {
      const response = await fetch('/api/enhanced-kpis/definitions');
      return await response.json();
    },
  });

  // Fetch B Corp KPIs
  const { data: bCorpKPIsData, isLoading: bCorpKPIsLoading } = useQuery({
    queryKey: ['/api/kpis/b-corp'],
    queryFn: async () => {
      const response = await fetch('/api/kpis/b-corp');
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
    mutationFn: async (goalData: { kpiDefinitionId: string; targetReductionPercentage: number; targetDate: string }) => {
      return await apiRequest('/api/enhanced-kpis/goals', {
        method: 'POST',
        body: JSON.stringify(goalData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enhanced-kpis/dashboard'] });
      setIsGoalDialogOpen(false);
      setCalculatedBaseline(null);
      toast({
        title: "Goal Created",
        description: "Your sustainability goal has been successfully created.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create goal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const definitions = definitionsData?.success ? definitionsData.definitions : [];
  const kpiGoals = dashboardData?.success ? dashboardData.goals : [];
  const summary = dashboardData?.success ? dashboardData.summary : {
    total: 0,
    onTrack: 0,
    atRisk: 0,
    behind: 0,
    achieved: 0
  };

  // Calculate baseline when KPI is selected
  const calculateBaseline = async (kpiId: string) => {
    setIsCalculatingBaseline(true);
    try {
      const response = await fetch('/api/enhanced-kpis/calculate-baseline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kpiDefinitionId: kpiId }),
      });
      const data = await response.json();
      if (data.success) {
        setCalculatedBaseline(data.baselineValue);
      } else {
        setCalculatedBaseline(0);
      }
    } catch (error) {
      console.error('Error calculating baseline:', error);
      setCalculatedBaseline(0);
    } finally {
      setIsCalculatingBaseline(false);
    }
  };

  const handleSetGoal = (kpi: KpiDefinition) => {
    setSelectedKpi(kpi);
    setGoalFormData({ ...goalFormData, kpiDefinitionId: kpi.id });
    setIsGoalDialogOpen(true);
    calculateBaseline(kpi.id);
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
    });
  };
  
  if (definitionsLoading) {
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
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">KPI & Goal Management</h1>
              <p className="text-gray-600">
                Set sustainability targets, track progress, and drive environmental improvements across your operations.
              </p>
            </div>

            {viewMode === 'categories' ? (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">KPI Categories</h2>
                  <p className="text-gray-600">Select a category to view and manage your sustainability KPIs</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  {Object.keys(categoryColors).map((category) => {
                    const categoryKPIs = definitions.filter((kpi: KpiDefinition) => kpi.kpiCategory === category);
                    const bCorpKPIs = bCorpKPIsData?.success ? (bCorpKPIsData.kpis[category] || []) : [];
                    const totalKPIs = categoryKPIs.length + (Array.isArray(bCorpKPIs) ? bCorpKPIs.length : 0);
                    
                    const categoryIcon = category === 'Environmental' ? '🌱' : 
                                       category === 'Supply Chain' ? '🔗' : 
                                       category === 'Production' ? '🏭' : 
                                       category.includes('Governance') ? '🏛️' : 
                                       category.includes('Worker') ? '👥' : 
                                       category.includes('Human Rights') ? '⚖️' : 
                                       category.includes('JEDI') ? '🤝' : 
                                       category.includes('Climate') ? '🌍' : 
                                       category.includes('Risk') ? '🛡️' : 
                                       category.includes('Circularity') ? '♻️' : '📊';
                    
                    return (
                      <Card 
                        key={category} 
                        className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-green-400"
                        onClick={() => {
                          setSelectedMainCategory(category);
                          setViewMode('category-detail');
                        }}
                      >
                        <CardContent className="p-6 text-center">
                          <div className="text-5xl mb-4">{categoryIcon}</div>
                          <CardTitle className="text-lg mb-3">{category}</CardTitle>
                          <Badge 
                            className={`${categoryColors[category as keyof typeof categoryColors]} mb-4`}
                            variant="outline"
                          >
                            {totalKPIs} KPIs
                          </Badge>
                          <CardDescription className="text-sm">
                            {category === 'Environmental' && 'Carbon footprint, waste, and resource metrics'}
                            {category === 'Supply Chain' && 'Supplier compliance and sourcing practices'}
                            {category === 'Production' && 'Operational efficiency and production metrics'}
                            {category.includes('Governance') && 'Mission accountability and stakeholder engagement'}
                            {category.includes('Worker') && 'Employee satisfaction and career development'}
                            {category.includes('Human Rights') && 'Labor practices and human rights compliance'}
                            {category.includes('JEDI') && 'Justice, equity, diversity, and inclusion metrics'}
                            {category.includes('Climate') && 'Environmental impact and climate action'}
                            {category.includes('Risk') && 'Risk management and governance standards'}
                            {category.includes('Circularity') && 'Circular economy and resource efficiency'}
                          </CardDescription>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => setViewMode('categories')}
                    className="flex items-center gap-2"
                  >
                    ← Back to Categories
                  </Button>
                  <Badge 
                    className={`${categoryColors[selectedMainCategory as keyof typeof categoryColors]} text-sm px-4 py-2`}
                    variant="outline"
                  >
                    {selectedMainCategory}
                  </Badge>
                </div>
                
                <Tabs defaultValue="traditional" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="traditional">Traditional KPIs</TabsTrigger>
                    <TabsTrigger value="b-corp">B Corp KPIs</TabsTrigger>
                    <TabsTrigger value="dashboard">Progress Dashboard</TabsTrigger>
                  </TabsList>

                  <TabsContent value="traditional" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {definitions.filter((kpi: KpiDefinition) => kpi.kpiCategory === selectedMainCategory).map((kpi: KpiDefinition) => (
                        <Card key={kpi.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <CardTitle className="text-base">{kpi.kpiName}</CardTitle>
                              </div>
                              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                {kpi.unit}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <CardDescription className="text-sm leading-relaxed line-clamp-2">
                              {kpi.description}
                            </CardDescription>
                            
                            <Button 
                              onClick={() => handleSetGoal(kpi)}
                              className="w-full"
                              size="sm"
                              data-testid={`button-set-goal-${kpi.id}`}
                            >
                              <Target className="w-4 h-4 mr-2" />
                              Set Goal
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    {definitions.filter((kpi: KpiDefinition) => kpi.kpiCategory === selectedMainCategory).length === 0 && (
                      <Card className="bg-gray-50">
                        <CardContent className="p-8 text-center">
                          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No Traditional KPIs</h3>
                          <p className="text-gray-600">No traditional KPIs available for {selectedMainCategory} category.</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="b-corp" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {bCorpKPIsData?.success && bCorpKPIsData.kpis[selectedMainCategory] && 
                        (bCorpKPIsData.kpis[selectedMainCategory] as KpiDefinition[]).map((kpi) => (
                        <Card key={kpi.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <CardTitle className="text-base">{kpi.kpiName}</CardTitle>
                              </div>
                              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                {kpi.unit}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <CardDescription className="text-sm leading-relaxed line-clamp-2">
                              {kpi.description}
                            </CardDescription>
                            
                            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                              <strong>Method:</strong> {kpi.formulaJson.calculation_type}
                            </div>
                            
                            <Button 
                              onClick={() => handleSetGoal(kpi)}
                              size="sm" 
                              className="w-full"
                              data-testid={`button-set-goal-${kpi.id}`}
                            >
                              <Target className="w-4 h-4 mr-2" />
                              Set Goal
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    {(!bCorpKPIsData?.success || !bCorpKPIsData.kpis[selectedMainCategory] || (bCorpKPIsData.kpis[selectedMainCategory] as KpiDefinition[]).length === 0) && (
                      <Card className="bg-gray-50">
                        <CardContent className="p-8 text-center">
                          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No B Corp KPIs</h3>
                          <p className="text-gray-600">No B Corp KPIs available for {selectedMainCategory} category.</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="dashboard" className="space-y-6">
                    {!kpiGoals || kpiGoals.filter((goal: KpiGoalData) => goal.category === selectedMainCategory).length === 0 ? (
                      <Card>
                        <CardContent className="p-8 text-center">
                          <Target className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No Goals Set Yet</h3>
                          <p className="text-gray-600 mb-4">
                            Start tracking your progress in {selectedMainCategory} by setting goals from the KPIs above.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {(kpiGoals || []).filter((goal: KpiGoalData) => goal.category === selectedMainCategory).map((goal: KpiGoalData) => {
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
                                  <div className="flex items-center space-x-2">
                                    <Icon className={`w-4 h-4 ${goal.status === 'on-track' ? 'text-green-500' : 
                                      goal.status === 'at-risk' ? 'text-yellow-500' : 
                                      goal.status === 'behind' ? 'text-red-500' : 'text-blue-500'}`} />
                                    <Badge variant="outline" className={cn("text-xs", 
                                      goal.status === 'on-track' ? 'text-green-700 bg-green-50' : 
                                      goal.status === 'at-risk' ? 'text-yellow-700 bg-yellow-50' : 
                                      goal.status === 'behind' ? 'text-red-700 bg-red-50' : 'text-blue-700 bg-blue-50'
                                    )}>
                                      {statusInfo.label}
                                    </Badge>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-4">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Current:</span>
                                    <span className="font-medium">{goal.currentValue.toFixed(2)} {goal.unit}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Target:</span>
                                    <span className="font-medium">{goal.targetValue.toFixed(2)} {goal.unit}</span>
                                  </div>
                                  <Progress value={goal.progress} className="h-2" />
                                  <div className="flex justify-between text-xs text-gray-500">
                                    <span>Progress: {goal.progress.toFixed(1)}%</span>
                                    <span>Due: {format(new Date(goal.targetDate), 'MMM dd, yyyy')}</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </main>
      </div>

      <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
        <DialogContent className="bg-white border shadow-lg max-w-md">
          <DialogHeader>
            <DialogTitle>Set Goal for {selectedKpi?.kpiName}</DialogTitle>
            <DialogDescription>
              Create a reduction target for this KPI to track your sustainability progress.
            </DialogDescription>
          </DialogHeader>
          
          {selectedKpi && (
            <div className="space-y-6 mt-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">KPI:</span>
                  <span className="font-medium">{selectedKpi.kpiName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Unit:</span>
                  <span className="font-medium">{selectedKpi.unit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Current Value:</span>
                  <span className="font-medium">
                    {isCalculatingBaseline ? (
                      <span className="text-blue-600">Calculating...</span>
                    ) : (
                      calculatedBaseline !== null ? `${calculatedBaseline.toFixed(2)} ${selectedKpi.unit}` : 'Not available'
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="target-reduction">Target Reduction (%)</Label>
                  <Input
                    id="target-reduction"
                    type="number"
                    min="1"
                    max="100"
                    value={goalFormData.targetReductionPercentage}
                    onChange={(e) => setGoalFormData({ 
                      ...goalFormData, 
                      targetReductionPercentage: Math.max(1, Math.min(100, parseInt(e.target.value) || 1))
                    })}
                    placeholder="10"
                    data-testid="input-target-reduction"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Target: {calculatedBaseline !== null ? 
                      (calculatedBaseline * (1 - goalFormData.targetReductionPercentage / 100)).toFixed(2) : 
                      'Calculating...'
                    } {selectedKpi.unit}
                  </p>
                </div>

                <div>
                  <Label htmlFor="target-date">Target Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="target-date"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !goalFormData.targetDate && "text-muted-foreground"
                        )}
                        data-testid="button-target-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {goalFormData.targetDate ? format(goalFormData.targetDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border shadow-lg" align="start">
                      <Calendar
                        mode="single"
                        selected={goalFormData.targetDate}
                        onSelect={(date) => setGoalFormData({ ...goalFormData, targetDate: date })}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline"
                  onClick={() => setIsGoalDialogOpen(false)}
                  data-testid="button-cancel-goal"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateGoal}
                  disabled={createGoalMutation.isPending || isCalculatingBaseline || calculatedBaseline === null || !goalFormData.targetDate}
                  data-testid="button-create-goal"
                >
                  {createGoalMutation.isPending ? "Creating..." : "Create Goal"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}