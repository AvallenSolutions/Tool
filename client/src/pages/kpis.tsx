import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Target, TrendingUp, TrendingDown, Award, Clock, AlertTriangle, Edit, Trash2, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

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
  const [isEditGoalDialogOpen, setIsEditGoalDialogOpen] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<KpiDefinition | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<KpiGoalData | null>(null);
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

  // Fetch analytics data for the selected category
  const { data: analyticsData } = useQuery({
    queryKey: ['/api/enhanced-kpis/analytics', selectedMainCategory],
    queryFn: async () => {
      if (!selectedMainCategory) return null;
      const response = await fetch(`/api/enhanced-kpis/analytics/${encodeURIComponent(selectedMainCategory)}`);
      return await response.json();
    },
    enabled: !!selectedMainCategory && viewMode === 'category-detail',
  });

  // Fetch intelligent insights for the selected category
  const { data: insightsData, refetch: refetchInsights } = useQuery({
    queryKey: ['/api/enhanced-kpis/ai-insights', selectedMainCategory],
    queryFn: async () => {
      if (!selectedMainCategory) return null;
      const response = await fetch('/api/enhanced-kpis/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: selectedMainCategory, context: 'dashboard' }),
      });
      return await response.json();
    },
    enabled: !!selectedMainCategory && viewMode === 'category-detail',
    staleTime: 5 * 60 * 1000, // 5 minutes
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
      queryClient.invalidateQueries({ queryKey: ['/api/enhanced-kpis/analytics', selectedMainCategory] });
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

  // Generate category report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (categoryData: { category: string }) => {
      return await apiRequest('/api/enhanced-kpis/generate-report', {
        method: 'POST',
        body: JSON.stringify(categoryData),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Report Generated",
        description: `${selectedMainCategory} sustainability report created successfully.`,
      });
      // TODO: Open report in new tab or download
      console.log('Generated report:', data);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      return await apiRequest(`/api/enhanced-kpis/goals/${goalId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enhanced-kpis/dashboard'] });
      toast({
        title: "Goal Deleted",
        description: "The sustainability goal has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete goal. Please try again.",
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

  const handleDeleteGoal = (goalId: string) => {
    if (confirm("Are you sure you want to delete this goal? This action cannot be undone.")) {
      deleteGoalMutation.mutate(goalId);
    }
  };

  const resetGoalForm = () => {
    setGoalFormData({
      kpiDefinitionId: '',
      targetReductionPercentage: 10,
      targetDate: undefined,
    });
    setCalculatedBaseline(null);
    setSelectedKpi(null);
    setSelectedGoal(null);
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!isGoalDialogOpen) {
      resetGoalForm();
    }
  }, [isGoalDialogOpen]);
  
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
                
                {/* Category Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {definitions.filter((kpi: KpiDefinition) => kpi.kpiCategory === selectedMainCategory).length +
                         (bCorpKPIsData?.success && bCorpKPIsData.kpis[selectedMainCategory] ? 
                          (bCorpKPIsData.kpis[selectedMainCategory] as KpiDefinition[]).length : 0)}
                      </div>
                      <div className="text-xs text-gray-600">Total KPIs</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {(kpiGoals || []).filter((goal: KpiGoalData) => goal.category === selectedMainCategory && goal.status === 'achieved').length}
                      </div>
                      <div className="text-xs text-gray-600">Goals Achieved</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {(kpiGoals || []).filter((goal: KpiGoalData) => goal.category === selectedMainCategory && goal.status === 'on-track').length}
                      </div>
                      <div className="text-xs text-gray-600">On Track</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {(kpiGoals || []).filter((goal: KpiGoalData) => goal.category === selectedMainCategory && (goal.status === 'behind' || goal.status === 'at-risk')).length}
                      </div>
                      <div className="text-xs text-gray-600">Need Attention</div>
                    </CardContent>
                  </Card>
                </div>

                <Tabs defaultValue="traditional" className="space-y-6">
                  <div className="flex justify-between items-center">
                    <TabsList className="grid w-full max-w-2xl grid-cols-5">
                      <TabsTrigger value="traditional">Traditional</TabsTrigger>
                      <TabsTrigger value="b-corp">B Corp</TabsTrigger>
                      <TabsTrigger value="dashboard">Goals</TabsTrigger>
                      <TabsTrigger value="analytics">Analytics</TabsTrigger>
                      <TabsTrigger value="insights">Intelligent Insights</TabsTrigger>
                    </TabsList>
                    <Button 
                      variant="outline" 
                      className="ml-4"
                      onClick={() => {
                        // TODO: Implement bulk goal creation
                        toast({
                          title: "Coming Soon",
                          description: "Bulk goal creation will be available in the next update.",
                        });
                      }}
                      data-testid="button-bulk-goals"
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Set Category Goals
                    </Button>
                  </div>

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
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`button-goal-menu-${goal.id}`}>
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="bg-white border shadow-lg">
                                        <DropdownMenuItem 
                                          onClick={() => {
                                            // TODO: Implement goal editing
                                            toast({
                                              title: "Coming Soon",
                                              description: "Goal editing will be available in the next update.",
                                            });
                                          }}
                                          className="cursor-pointer"
                                          data-testid={`menu-edit-goal-${goal.id}`}
                                        >
                                          <Edit className="mr-2 h-4 w-4" />
                                          Edit Goal
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => handleDeleteGoal(goal.id)}
                                          className="cursor-pointer text-red-600 focus:text-red-600"
                                          data-testid={`menu-delete-goal-${goal.id}`}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete Goal
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
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
                                  
                                  {/* Progress Trend Indicator */}
                                  <div className="flex items-center justify-between pt-2 border-t">
                                    <div className="flex items-center text-xs text-gray-500">
                                      <span className="mr-2">Trend:</span>
                                      {goal.progress > 50 ? (
                                        <div className="flex items-center text-green-600">
                                          <TrendingUp className="w-3 h-3 mr-1" />
                                          <span>Improving</span>
                                        </div>
                                      ) : goal.progress > 25 ? (
                                        <div className="flex items-center text-yellow-600">
                                          <Clock className="w-3 h-3 mr-1" />
                                          <span>Steady</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center text-red-600">
                                          <TrendingDown className="w-3 h-3 mr-1" />
                                          <span>Needs Focus</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="analytics" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Progress Trend Chart */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Progress Trends</CardTitle>
                          <CardDescription>KPI performance over time for {selectedMainCategory}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={analyticsData?.success ? analyticsData.data.progressTrends : [
                              { month: 'Jan', progress: 15, target: 25 },
                              { month: 'Feb', progress: 22, target: 30 },
                              { month: 'Mar', progress: 28, target: 35 },
                              { month: 'Apr', progress: 35, target: 40 },
                              { month: 'May', progress: 42, target: 45 },
                              { month: 'Jun', progress: 48, target: 50 }
                            ]}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="progress" stroke="#10b981" strokeWidth={2} name="Actual Progress" />
                              <Line type="monotone" dataKey="target" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" name="Target Trajectory" />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Goal Status Distribution */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Goal Status Distribution</CardTitle>
                          <CardDescription>Current status of goals in {selectedMainCategory}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'On Track', value: (kpiGoals || []).filter((goal: KpiGoalData) => goal.category === selectedMainCategory && goal.status === 'on-track').length, fill: '#10b981' },
                                  { name: 'At Risk', value: (kpiGoals || []).filter((goal: KpiGoalData) => goal.category === selectedMainCategory && goal.status === 'at-risk').length, fill: '#f59e0b' },
                                  { name: 'Behind', value: (kpiGoals || []).filter((goal: KpiGoalData) => goal.category === selectedMainCategory && goal.status === 'behind').length, fill: '#ef4444' },
                                  { name: 'Achieved', value: (kpiGoals || []).filter((goal: KpiGoalData) => goal.category === selectedMainCategory && goal.status === 'achieved').length, fill: '#3b82f6' }
                                ]}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              />
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Performance Comparison */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Category Performance</CardTitle>
                          <CardDescription>Average progress across all categories</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={Object.keys(categoryColors).map(category => ({
                              category: category.length > 15 ? category.substring(0, 12) + '...' : category,
                              fullCategory: category,
                              progress: Math.round(Math.random() * 80 + 10), // TODO: Replace with real data
                              goals: (kpiGoals || []).filter((goal: KpiGoalData) => goal.category === category).length
                            }))}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
                              <YAxis />
                              <Tooltip 
                                formatter={(value, name, props) => [
                                  name === 'progress' ? `${value}% progress` : `${value} goals`,
                                  props.payload.fullCategory
                                ]}
                              />
                              <Bar dataKey="progress" fill="#10b981" name="Avg Progress %" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Alert Summary */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Alert Summary</CardTitle>
                          <CardDescription>Recent notifications and alerts for {selectedMainCategory}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {analyticsData?.success && analyticsData.data.alerts.length > 0 ? (
                              analyticsData.data.alerts.map((alert: any, index: number) => {
                                const alertConfig = {
                                  warning: { bg: 'bg-red-50 border-red-200', icon: AlertTriangle, iconColor: 'text-red-500', textColor: 'text-red-700', badgeColor: 'text-red-600 border-red-200' },
                                  info: { bg: 'bg-yellow-50 border-yellow-200', icon: Clock, iconColor: 'text-yellow-500', textColor: 'text-yellow-700', badgeColor: 'text-yellow-600 border-yellow-200' },
                                  success: { bg: 'bg-green-50 border-green-200', icon: Award, iconColor: 'text-green-500', textColor: 'text-green-700', badgeColor: 'text-green-600 border-green-200' }
                                };
                                const config = alertConfig[alert.type as keyof typeof alertConfig] || alertConfig.info;
                                const Icon = config.icon;
                                
                                return (
                                  <div key={index} className={`flex items-center justify-between p-3 border rounded-lg ${config.bg}`}>
                                    <div className="flex items-center space-x-3">
                                      <Icon className={`w-4 h-4 ${config.iconColor}`} />
                                      <div>
                                        <div className={`text-sm font-medium ${config.textColor}`}>{alert.title}</div>
                                        <div className={`text-xs ${config.textColor.replace('700', '600')}`}>{alert.message}</div>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className={`${config.badgeColor}`}>{alert.date}</Badge>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-center py-6">
                                <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No recent alerts for {selectedMainCategory}</p>
                                <p className="text-xs text-gray-400 mt-1">Alerts will appear here when goals need attention</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="insights" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Intelligent Recommendations */}
                      <Card className="lg:col-span-2">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            Intelligent Insights
                          </CardTitle>
                          <CardDescription>Personalized recommendations for {selectedMainCategory} improvements</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {insightsData?.success ? insightsData.insights.recommendations.map((rec, index) => {
                              const bgColor = rec.type === 'optimization' ? 'bg-blue-50 border-blue-200' :
                                            rec.type === 'best_practice' ? 'bg-green-50 border-green-200' :
                                            'bg-amber-50 border-amber-200';
                              const textColor = rec.type === 'optimization' ? 'text-blue-900' :
                                              rec.type === 'best_practice' ? 'text-green-900' :
                                              'text-amber-900';
                              const iconColor = rec.type === 'optimization' ? 'text-blue-500' :
                                              rec.type === 'best_practice' ? 'text-green-500' :
                                              'text-amber-500';
                              const Icon = rec.type === 'optimization' ? TrendingUp :
                                          rec.type === 'best_practice' ? Award : Clock;
                              
                              return (
                                <div key={index} className={`p-4 border rounded-lg ${bgColor}`}>
                                  <div className="flex items-start space-x-3">
                                    <Icon className={`w-5 h-5 mt-0.5 ${iconColor}`} />
                                    <div>
                                      <div className={`font-medium ${textColor}`}>{rec.title}</div>
                                      <div className={`text-sm mt-1 ${textColor.replace('900', '700')}`}>
                                        {rec.description}
                                      </div>
                                      <div className="flex items-center gap-2 mt-2">
                                        <Button size="sm" variant="outline">
                                          {rec.actionable ? 'Take Action' : 'Learn More'}
                                        </Button>
                                        <Badge variant="outline" className="text-xs">
                                          {Math.round(rec.confidence * 100)}% confidence
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }) : (
                              <div className="text-center py-8">
                                <div className="animate-pulse space-y-3">
                                  <div className="h-20 bg-gray-200 rounded"></div>
                                  <div className="h-20 bg-gray-200 rounded"></div>
                                  <div className="h-20 bg-gray-200 rounded"></div>
                                </div>
                                <p className="text-sm text-gray-500 mt-4">Loading insights...</p>
                              </div>
                            )}
                            
                            {insightsData?.success && (
                              <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                <div className="text-sm font-medium text-gray-900 mb-2">Predictive Analytics</div>
                                <div className="grid grid-cols-3 gap-4 text-xs">
                                  <div className="text-center">
                                    <div className="text-lg font-bold text-green-600">{insightsData.insights.predictiveAnalytics.projectedOutcome}%</div>
                                    <div className="text-gray-600">Projected Success</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-lg font-bold text-blue-600">{insightsData.insights.predictiveAnalytics.confidenceLevel}%</div>
                                    <div className="text-gray-600">Confidence</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-lg font-bold text-purple-600">{insightsData.insights.predictiveAnalytics.timeToTarget}mo</div>
                                    <div className="text-gray-600">Est. Timeline</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Report Integration */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Report Integration</CardTitle>
                          <CardDescription>Include {selectedMainCategory} progress in sustainability reports</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Goals in Reports:</span>
                              <Badge variant="outline" className="text-green-600">
                                {(kpiGoals || []).filter((goal: KpiGoalData) => goal.category === selectedMainCategory).length} included
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Last Report:</span>
                              <span className="text-gray-500">Dec 2024</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Next Report:</span>
                              <span className="text-gray-500">Jan 2025</span>
                            </div>
                          </div>
                          
                          <Button 
                            className="w-full" 
                            size="sm" 
                            onClick={() => generateReportMutation.mutate({ category: selectedMainCategory })}
                            disabled={generateReportMutation.isPending}
                            data-testid="button-generate-category-report"
                          >
                            <Target className="w-4 h-4 mr-2" />
                            {generateReportMutation.isPending ? 'Generating...' : 'Generate Category Report'}
                          </Button>
                          
                          <div className="text-xs text-gray-500 text-center">
                            Automatically includes goal progress and recommendations
                          </div>
                        </CardContent>
                      </Card>
                    </div>
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
                      calculatedBaseline !== null && selectedKpi ? `${calculatedBaseline.toFixed(2)} ${selectedKpi.unit}` : 'Not available'
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
                    Target: {calculatedBaseline !== null && selectedKpi ? 
                      (calculatedBaseline * (1 - goalFormData.targetReductionPercentage / 100)).toFixed(2) + ' ' + selectedKpi.unit : 
                      'Calculating...'
                    }
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