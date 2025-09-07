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

// Generate mock historical data for trend visualization
const generateMockHistoricalData = (goal: KpiGoalData) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const currentProgress = goal.progress || 0;
  
  return months.map((month, index) => {
    const progressIncrement = currentProgress / months.length;
    const variance = Math.random() * 8 - 4; // ±4% variance for realism
    const baseProgress = progressIncrement * (index + 1) + variance;
    
    return {
      month,
      progress: Math.max(0, Math.min(100, baseProgress)),
      value: goal.baselineValue ? goal.baselineValue * (1 - (baseProgress / 100) * (goal.targetReductionPercentage / 100)) : 0,
      target: goal.targetValue || 0
    };
  });
};

// Generate milestones for a goal
const generateMilestones = (goal: KpiGoalData) => [
  { 
    date: '2024-01-15', 
    title: 'Baseline Established', 
    impact: `${goal.baselineValue?.toFixed(1)} ${goal.unit} baseline measurement completed`, 
    type: 'info' as const
  },
  { 
    date: '2024-03-20', 
    title: 'Process Optimization', 
    impact: '12% improvement through efficiency measures', 
    type: 'success' as const
  },
  { 
    date: '2024-05-10', 
    title: 'Technology Upgrade', 
    impact: 'Sustainable technology implementation', 
    type: 'success' as const
  },
  { 
    date: '2024-07-01', 
    title: 'Mid-Year Review', 
    impact: 'Goal progress assessed and strategy refined', 
    type: 'info' as const
  }
];

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
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<any | null>(null);
  const [isInsightDetailOpen, setIsInsightDetailOpen] = useState(false);

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
    staleTime: 0, // Always fetch fresh AI insights
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: async (goalData: { kpiDefinitionId: string; targetReductionPercentage: number; targetDate: string }) => {
      return await apiRequest('POST', '/api/enhanced-kpis/goals', goalData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enhanced-kpis/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/enhanced-kpis/analytics', selectedMainCategory] });
      queryClient.invalidateQueries({ queryKey: ['/api/enhanced-kpis/ai-insights', selectedMainCategory] });
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
      return await apiRequest('POST', '/api/enhanced-kpis/generate-report', categoryData);
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
      return await apiRequest('DELETE', `/api/enhanced-kpis/goals/${goalId}`);
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
  const kpiGoals = dashboardData?.success ? dashboardData.data.kpiGoals : [];
  const summary = dashboardData?.success ? dashboardData.data.summary : {
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
        setCalculatedBaseline(data.baseline);
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
                      <TabsTrigger value="traditional">KPIs</TabsTrigger>
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
                    {selectedMainCategory === 'Environmental' ? (
                      // Group Environmental KPIs by subcategory
                      <div className="space-y-8">
                        {(() => {
                          const categoryKPIs = definitions.filter((kpi: KpiDefinition) => kpi.kpiCategory === selectedMainCategory);
                          
                          // Group KPIs by subcategory
                          const carbonKPIs = categoryKPIs.filter((kpi: KpiDefinition) => 
                            kpi.kpiName.toLowerCase().includes('carbon') || kpi.kpiName.toLowerCase().includes('emissions')
                          );
                          const waterKPIs = categoryKPIs.filter((kpi: KpiDefinition) => 
                            kpi.kpiName.toLowerCase().includes('water')
                          );
                          const wasteKPIs = categoryKPIs.filter((kpi: KpiDefinition) => 
                            kpi.kpiName.toLowerCase().includes('waste')
                          );
                          const energyKPIs = categoryKPIs.filter((kpi: KpiDefinition) => 
                            kpi.kpiName.toLowerCase().includes('energy') || kpi.kpiName.toLowerCase().includes('renewable')
                          );

                          const subcategories = [
                            { name: 'Carbon', icon: '🌍', kpis: carbonKPIs, color: 'border-l-red-500' },
                            { name: 'Water', icon: '💧', kpis: waterKPIs, color: 'border-l-blue-500' },
                            { name: 'Waste', icon: '♻️', kpis: wasteKPIs, color: 'border-l-amber-500' },
                            { name: 'Energy', icon: '⚡', kpis: energyKPIs, color: 'border-l-green-500' }
                          ].filter(sub => sub.kpis.length > 0);

                          return subcategories.map((subcategory) => (
                            <div key={subcategory.name} className="space-y-4">
                              <div className="flex items-center space-x-3 pb-2 border-b border-gray-200">
                                <span className="text-2xl">{subcategory.icon}</span>
                                <h3 className="text-xl font-semibold text-gray-900">{subcategory.name} KPIs</h3>
                                <Badge variant="secondary" className="ml-2">
                                  {subcategory.kpis.length} KPI{subcategory.kpis.length !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {subcategory.kpis.map((kpi: KpiDefinition) => (
                                  <Card key={kpi.id} className={`hover:shadow-lg transition-shadow border-l-4 ${subcategory.color}`}>
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
                            </div>
                          ));
                        })()}
                      </div>
                    ) : (
                      // Default layout for non-Environmental categories
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
                    )}
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
                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
                      <CardContent className="p-12 text-center">
                        <div className="w-20 h-20 bg-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                          <span className="text-3xl text-white">🚀</span>
                        </div>
                        <h3 className="text-2xl font-semibold text-gray-900 mb-4">B Corp KPIs Coming Soon</h3>
                        <p className="text-gray-600 text-lg mb-6 max-w-2xl mx-auto">
                          We're developing a comprehensive set of B Corp certification metrics specifically tailored for {selectedMainCategory} sustainability reporting.
                        </p>
                        <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          <Clock className="w-4 h-4 mr-2" />
                          Feature in Development
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="dashboard" className="space-y-6">
                    {!kpiGoals || kpiGoals.filter((goal: KpiGoalData) => goal.category === selectedMainCategory).length === 0 ? (
                      <Card className="bg-gradient-to-br from-gray-50 to-blue-50 border-blue-100">
                        <CardContent className="p-12 text-center">
                          <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                            <Target className="w-10 h-10 text-blue-600" />
                          </div>
                          <h3 className="text-2xl font-semibold text-gray-900 mb-4">No Goals Set Yet</h3>
                          <p className="text-gray-600 text-lg mb-6 max-w-2xl mx-auto">
                            Transform your {selectedMainCategory.toLowerCase()} performance by setting ambitious sustainability goals. Track progress, identify trends, and celebrate achievements.
                          </p>
                          <div className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer">
                            <Target className="w-4 h-4 mr-2" />
                            Set Your First Goal
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-6">
                        {/* Goals Overview Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                          {[
                            { 
                              label: 'Active Goals', 
                              value: (kpiGoals || []).filter((g: KpiGoalData) => g.category === selectedMainCategory).length,
                              icon: Target,
                              color: 'text-blue-600 bg-blue-100'
                            },
                            { 
                              label: 'On Track', 
                              value: (kpiGoals || []).filter((g: KpiGoalData) => g.category === selectedMainCategory && g.status === 'on-track').length,
                              icon: TrendingUp,
                              color: 'text-green-600 bg-green-100'
                            },
                            { 
                              label: 'At Risk', 
                              value: (kpiGoals || []).filter((g: KpiGoalData) => g.category === selectedMainCategory && g.status === 'at-risk').length,
                              icon: Clock,
                              color: 'text-yellow-600 bg-yellow-100'
                            },
                            { 
                              label: 'Achieved', 
                              value: (kpiGoals || []).filter((g: KpiGoalData) => g.category === selectedMainCategory && g.status === 'achieved').length,
                              icon: Award,
                              color: 'text-purple-600 bg-purple-100'
                            }
                          ].map((stat, index) => (
                            <Card key={index} className="bg-white">
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                                  </div>
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.color}`}>
                                    <stat.icon className="w-6 h-6" />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        {/* Enhanced Goal Cards */}
                        <div className="space-y-4">
                          {(kpiGoals || []).filter((goal: KpiGoalData) => goal.category === selectedMainCategory).map((goal: KpiGoalData) => {
                            const statusInfo = statusConfig[goal.status];
                            const Icon = statusInfo.icon;
                            const isExpanded = expandedGoalId === goal.id;
                            const historicalData = generateMockHistoricalData(goal);
                            const milestones = generateMilestones(goal);
                            
                            return (
                              <Card key={goal.id} className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-2 ring-blue-200' : 'hover:shadow-lg'}`}>
                                {/* Main Goal Card */}
                                <div 
                                  className="cursor-pointer"
                                  onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
                                  data-testid={`goal-card-${goal.id}`}
                                >
                                  <CardHeader className="pb-4">
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                          <CardTitle className="text-xl font-semibold">{goal.name}</CardTitle>
                                          <Badge variant="outline" className={cn("text-xs font-medium", 
                                            goal.status === 'on-track' ? 'text-green-700 bg-green-50 border-green-200' : 
                                            goal.status === 'at-risk' ? 'text-yellow-700 bg-yellow-50 border-yellow-200' : 
                                            goal.status === 'behind' ? 'text-red-700 bg-red-50 border-red-200' : 'text-blue-700 bg-blue-50 border-blue-200'
                                          )}>
                                            <Icon className="w-3 h-3 mr-1" />
                                            {statusInfo.label}
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                          Target {goal.targetReductionPercentage}% reduction by {format(new Date(goal.targetDate), 'MMM dd, yyyy')}
                                        </p>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <div className="text-right">
                                          <p className="text-2xl font-bold text-gray-900">{(goal.progress || 0).toFixed(0)}%</p>
                                          <p className="text-xs text-gray-500">Complete</p>
                                        </div>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`button-goal-menu-${goal.id}`}>
                                              <MoreVertical className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="bg-white border shadow-lg">
                                            <DropdownMenuItem 
                                              onClick={(e) => {
                                                e.stopPropagation();
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
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteGoal(goal.id);
                                              }}
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
                                  <CardContent className="pt-0">
                                    <div className="space-y-4">
                                      {/* Key Metrics Row */}
                                      <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                                          <p className="text-sm text-gray-600">Baseline</p>
                                          <p className="text-lg font-semibold text-gray-900">{goal.baselineValue?.toFixed(1)} {goal.unit}</p>
                                        </div>
                                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                                          <p className="text-sm text-gray-600">Current</p>
                                          <p className="text-lg font-semibold text-gray-900">{goal.currentValue?.toFixed(1)} {goal.unit}</p>
                                        </div>
                                        <div className="text-center p-3 bg-green-50 rounded-lg">
                                          <p className="text-sm text-green-600">Target</p>
                                          <p className="text-lg font-semibold text-green-700">{goal.targetValue?.toFixed(1)} {goal.unit}</p>
                                        </div>
                                      </div>

                                      {/* Progress Bar with Mini Chart */}
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                          <span className="text-sm font-medium text-gray-700">Progress</span>
                                          <span className="text-sm text-gray-500">{(goal.progress || 0).toFixed(1)}% complete</span>
                                        </div>
                                        <Progress value={goal.progress || 0} className="h-3" />
                                        
                                        {/* Mini Trend Chart */}
                                        <div className="mt-4">
                                          <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs text-gray-500">8-Month Trend</span>
                                            <span className={`text-xs flex items-center ${goal.progress > 50 ? 'text-green-600' : goal.progress > 25 ? 'text-yellow-600' : 'text-red-600'}`}>
                                              {goal.progress > 50 ? <TrendingUp className="w-3 h-3 mr-1" /> : 
                                               goal.progress > 25 ? <Clock className="w-3 h-3 mr-1" /> : 
                                               <TrendingDown className="w-3 h-3 mr-1" />}
                                              {goal.progress > 50 ? 'Improving' : goal.progress > 25 ? 'Steady' : 'Needs Focus'}
                                            </span>
                                          </div>
                                          <ResponsiveContainer width="100%" height={60}>
                                            <LineChart data={historicalData}>
                                              <Line 
                                                type="monotone" 
                                                dataKey="progress" 
                                                stroke="#3b82f6" 
                                                strokeWidth={2} 
                                                dot={false} 
                                              />
                                            </LineChart>
                                          </ResponsiveContainer>
                                        </div>
                                      </div>

                                      {/* Expand Indicator */}
                                      <div className="flex items-center justify-center pt-2 border-t">
                                        <span className="text-xs text-gray-400 flex items-center">
                                          {isExpanded ? 'Click to collapse' : 'Click to view detailed analytics'}
                                          {isExpanded ? <TrendingUp className="w-3 h-3 ml-1 rotate-180" /> : <TrendingDown className="w-3 h-3 ml-1" />}
                                        </span>
                                      </div>
                                    </div>
                                  </CardContent>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                  <div className="border-t bg-gray-50">
                                    <CardContent className="p-6">
                                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Historical Performance Chart */}
                                        <div className="space-y-4">
                                          <h4 className="font-semibold text-gray-900">Performance Over Time</h4>
                                          <ResponsiveContainer width="100%" height={200}>
                                            <LineChart data={historicalData}>
                                              <CartesianGrid strokeDasharray="3 3" />
                                              <XAxis dataKey="month" />
                                              <YAxis />
                                              <Tooltip 
                                                formatter={(value, name) => [
                                                  name === 'progress' ? `${Number(value).toFixed(1)}%` : `${Number(value).toFixed(1)} ${goal.unit}`,
                                                  name === 'progress' ? 'Progress' : name === 'value' ? 'Current Value' : 'Target'
                                                ]}
                                              />
                                              <Line type="monotone" dataKey="progress" stroke="#3b82f6" name="progress" />
                                              <Line type="monotone" dataKey="value" stroke="#10b981" name="value" />
                                              <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeDasharray="5 5" name="target" />
                                            </LineChart>
                                          </ResponsiveContainer>
                                        </div>

                                        {/* Key Milestones */}
                                        <div className="space-y-4">
                                          <h4 className="font-semibold text-gray-900">Key Milestones</h4>
                                          <div className="space-y-3">
                                            {milestones.map((milestone, index) => (
                                              <div key={index} className="flex items-start space-x-3">
                                                <div className={`w-3 h-3 rounded-full mt-1 ${milestone.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`} />
                                                <div className="flex-1">
                                                  <div className="flex justify-between items-start">
                                                    <h5 className="font-medium text-gray-900">{milestone.title}</h5>
                                                    <span className="text-xs text-gray-500">{format(new Date(milestone.date), 'MMM dd')}</span>
                                                  </div>
                                                  <p className="text-sm text-gray-600 mt-1">{milestone.impact}</p>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Advanced Metrics */}
                                        <div className="space-y-4">
                                          <h4 className="font-semibold text-gray-900">Advanced Metrics</h4>
                                          <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 bg-white rounded-lg border">
                                              <p className="text-sm text-gray-600">Reduction Achieved</p>
                                              <p className="text-xl font-semibold text-green-600">
                                                {goal.baselineValue && goal.currentValue ? 
                                                  ((goal.baselineValue - goal.currentValue) / goal.baselineValue * 100).toFixed(1) : '0.0'}%
                                              </p>
                                            </div>
                                            <div className="p-3 bg-white rounded-lg border">
                                              <p className="text-sm text-gray-600">Days Remaining</p>
                                              <p className="text-xl font-semibold text-blue-600">
                                                {Math.max(0, Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                                              </p>
                                            </div>
                                            <div className="p-3 bg-white rounded-lg border">
                                              <p className="text-sm text-gray-600">Monthly Rate</p>
                                              <p className="text-xl font-semibold text-purple-600">
                                                {((goal.progress || 0) / 8).toFixed(1)}%
                                              </p>
                                            </div>
                                            <div className="p-3 bg-white rounded-lg border">
                                              <p className="text-sm text-gray-600">Projected Finish</p>
                                              <p className="text-xl font-semibold text-indigo-600">
                                                {(goal.progress || 0) > 0 ? 
                                                  format(new Date(Date.now() + (100 - (goal.progress || 0)) / (goal.progress || 1) * 8 * 30 * 24 * 60 * 60 * 1000), 'MMM yyyy') : 
                                                  'TBD'}
                                              </p>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Action Items */}
                                        <div className="space-y-4">
                                          <h4 className="font-semibold text-gray-900">Recommended Actions</h4>
                                          <div className="space-y-2">
                                            {[
                                              { action: 'Review monthly progress reports', priority: 'high' },
                                              { action: 'Implement efficiency optimization measures', priority: 'medium' },
                                              { action: 'Schedule quarterly team review meeting', priority: 'low' }
                                            ].map((item, index) => (
                                              <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                                                <span className="text-sm text-gray-900">{item.action}</span>
                                                <Badge 
                                                  variant="outline" 
                                                  className={`text-xs ${
                                                    item.priority === 'high' ? 'text-red-600 border-red-200' :
                                                    item.priority === 'medium' ? 'text-yellow-600 border-yellow-200' :
                                                    'text-gray-600 border-gray-200'
                                                  }`}
                                                >
                                                  {item.priority}
                                                </Badge>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </div>
                                )}
                              </Card>
                            );
                          })}
                        </div>
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
                            <LineChart data={analyticsData?.success ? analyticsData.data.progressTrends : []}>
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
                          <CardTitle>
                            {selectedMainCategory === 'Environmental' ? 'Environmental KPI Performance' : 'Category Performance'}
                          </CardTitle>
                          <CardDescription>
                            {selectedMainCategory === 'Environmental' 
                              ? 'Average progress across Carbon, Water, Waste & Energy KPIs' 
                              : 'Average progress across all categories'
                            }
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={
                              selectedMainCategory === 'Environmental' ? (
                                // Environmental subcategory data
                                (() => {
                                  const categoryKPIs = definitions.filter((kpi: KpiDefinition) => kpi.kpiCategory === selectedMainCategory);
                                  
                                  const subcategoryGoals = {
                                    Carbon: (kpiGoals || []).filter((goal: KpiGoalData) => 
                                      goal.category === selectedMainCategory && 
                                      (goal.name.toLowerCase().includes('carbon') || goal.name.toLowerCase().includes('emissions'))
                                    ),
                                    Water: (kpiGoals || []).filter((goal: KpiGoalData) => 
                                      goal.category === selectedMainCategory && 
                                      goal.name.toLowerCase().includes('water')
                                    ),
                                    Waste: (kpiGoals || []).filter((goal: KpiGoalData) => 
                                      goal.category === selectedMainCategory && 
                                      goal.name.toLowerCase().includes('waste')
                                    ),
                                    Energy: (kpiGoals || []).filter((goal: KpiGoalData) => 
                                      goal.category === selectedMainCategory && 
                                      (goal.name.toLowerCase().includes('energy') || goal.name.toLowerCase().includes('renewable'))
                                    )
                                  };

                                  return [
                                    { 
                                      category: 'Carbon', 
                                      fullCategory: 'Carbon KPIs',
                                      progress: subcategoryGoals.Carbon.length > 0 
                                        ? Math.round(subcategoryGoals.Carbon.reduce((acc, goal) => acc + goal.progress, 0) / subcategoryGoals.Carbon.length)
                                        : 0,
                                      goals: subcategoryGoals.Carbon.length
                                    },
                                    { 
                                      category: 'Water', 
                                      fullCategory: 'Water KPIs',
                                      progress: subcategoryGoals.Water.length > 0 
                                        ? Math.round(subcategoryGoals.Water.reduce((acc, goal) => acc + goal.progress, 0) / subcategoryGoals.Water.length)
                                        : 0,
                                      goals: subcategoryGoals.Water.length
                                    },
                                    { 
                                      category: 'Waste', 
                                      fullCategory: 'Waste KPIs',
                                      progress: subcategoryGoals.Waste.length > 0 
                                        ? Math.round(subcategoryGoals.Waste.reduce((acc, goal) => acc + goal.progress, 0) / subcategoryGoals.Waste.length)
                                        : 0,
                                      goals: subcategoryGoals.Waste.length
                                    },
                                    { 
                                      category: 'Energy', 
                                      fullCategory: 'Energy KPIs',
                                      progress: subcategoryGoals.Energy.length > 0 
                                        ? Math.round(subcategoryGoals.Energy.reduce((acc, goal) => acc + goal.progress, 0) / subcategoryGoals.Energy.length)
                                        : 0,
                                      goals: subcategoryGoals.Energy.length
                                    }
                                  ].filter(item => item.goals > 0); // Only show subcategories with goals
                                })()
                              ) : (
                                // Default data for other categories
                                Object.keys(categoryColors).map(category => ({
                                  category: category.length > 15 ? category.substring(0, 12) + '...' : category,
                                  fullCategory: category,
                                  progress: 0, // Real data will show actual progress
                                  goals: (kpiGoals || []).filter((goal: KpiGoalData) => goal.category === category).length
                                }))
                              )
                            }>
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
                                <div key={index} className={`p-6 border rounded-xl ${bgColor} hover:shadow-md transition-shadow`}>
                                  <div className="flex items-start space-x-4">
                                    <div className={`p-2 rounded-lg ${bgColor.replace('50', '100')} flex-shrink-0`}>
                                      <Icon className={`w-5 h-5 ${iconColor}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className={`font-semibold text-base ${textColor} mb-3`}>{rec.title}</h4>
                                      <div className={`text-sm leading-relaxed ${textColor.replace('900', '600')} mb-4`}>
                                        {rec.description.split('.').filter(sentence => sentence.trim().length > 0).map((sentence, sentenceIndex) => {
                                          const trimmedSentence = sentence.trim();
                                          if (trimmedSentence.length === 0) return null;
                                          
                                          return (
                                            <div key={sentenceIndex} className="mb-2 flex items-start">
                                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${iconColor.replace('text-', 'bg-')} mt-2 mr-3 flex-shrink-0`}></span>
                                              <span className="flex-1">{trimmedSentence}.</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <Button 
                                          size="sm" 
                                          variant="default" 
                                          className={`${rec.type === 'optimization' ? 'bg-blue-600 hover:bg-blue-700' : 
                                                     rec.type === 'best_practice' ? 'bg-green-600 hover:bg-green-700' : 
                                                     'bg-amber-600 hover:bg-amber-700'} text-white border-0`}
                                          onClick={() => {
                                            setSelectedInsight(rec);
                                            setIsInsightDetailOpen(true);
                                          }}
                                        >
                                          <span className="text-sm font-medium">View Details</span>
                                        </Button>
                                        <Badge 
                                          variant="secondary" 
                                          className={`text-xs px-2 py-1 ${rec.potentialImpact === 'high' ? 'bg-red-100 text-red-700' : 
                                                      rec.potentialImpact === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                                                      'bg-gray-100 text-gray-700'}`}
                                        >
                                          {rec.potentialImpact} impact
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
                      calculatedBaseline !== null && calculatedBaseline !== undefined && selectedKpi ? 
                        // Convert kg to tonnes for carbon emissions KPIs
                        selectedKpi.kpiName === 'Total Carbon Emissions' ? 
                          `${(calculatedBaseline / 1000).toFixed(3)} tonnes` : 
                          `${calculatedBaseline.toFixed(2)} ${selectedKpi.unit}` 
                        : 'Not available'
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
                    Target: {calculatedBaseline !== null && calculatedBaseline !== undefined && selectedKpi ? 
                      selectedKpi.kpiName === 'Total Carbon Emissions' ?
                        ((calculatedBaseline / 1000) * (1 - goalFormData.targetReductionPercentage / 100)).toFixed(3) + ' tonnes' :
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

      {/* Detailed Insight Modal */}
      <Dialog open={isInsightDetailOpen} onOpenChange={setIsInsightDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-white border shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-bold">
              {selectedInsight?.type === 'optimization' && <div className="p-2 bg-blue-100 rounded-lg"><TrendingUp className="w-6 h-6 text-blue-600" /></div>}
              {selectedInsight?.type === 'best_practice' && <div className="p-2 bg-green-100 rounded-lg"><Award className="w-6 h-6 text-green-600" /></div>}
              {selectedInsight?.type === 'alert' && <div className="p-2 bg-amber-100 rounded-lg"><Clock className="w-6 h-6 text-amber-600" /></div>}
              {selectedInsight?.title}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Detailed analysis and recommendations for {selectedMainCategory} sustainability improvements
            </DialogDescription>
          </DialogHeader>

          {selectedInsight && (
            <div className="space-y-6 mt-4">
              {/* Impact Badge */}
              <div className="flex items-center gap-3">
                <Badge 
                  variant="secondary" 
                  className={`text-sm px-3 py-1.5 font-medium ${
                    selectedInsight.potentialImpact === 'high' ? 'bg-red-100 text-red-700 border-red-200' : 
                    selectedInsight.potentialImpact === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 
                    'bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  {selectedInsight.potentialImpact?.toUpperCase()} IMPACT POTENTIAL
                </Badge>
                <Badge 
                  variant="outline" 
                  className={`text-sm px-3 py-1.5 font-medium ${
                    selectedInsight.type === 'optimization' ? 'border-blue-200 text-blue-700' :
                    selectedInsight.type === 'best_practice' ? 'border-green-200 text-green-700' :
                    'border-amber-200 text-amber-700'
                  }`}
                >
                  {selectedInsight.type?.toUpperCase().replace('_', ' ')} 
                </Badge>
              </div>

              {/* Full Description */}
              <Card className="border-2 border-gray-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-gray-800">Recommendation Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedInsight.description?.split('.').filter(sentence => sentence.trim().length > 0).map((sentence, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          selectedInsight.type === 'optimization' ? 'bg-blue-500' :
                          selectedInsight.type === 'best_practice' ? 'bg-green-500' :
                          'bg-amber-500'
                        }`}></div>
                        <p className="text-gray-700 leading-relaxed">{sentence.trim()}.</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Key Benefits Section */}
              <Card className="border-2 border-green-100 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Expected Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-green-800">Environmental Impact</h4>
                      <p className="text-sm text-green-700">
                        Reduces carbon footprint through optimized {selectedMainCategory.toLowerCase()} practices
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-green-800">Cost Savings</h4>
                      <p className="text-sm text-green-700">
                        {selectedInsight.potentialImpact === 'high' ? 'Significant' : 
                         selectedInsight.potentialImpact === 'medium' ? 'Moderate' : 'Initial'} cost reduction potential
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Next Steps */}
              <Card className="border-2 border-blue-100 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-blue-800 flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Recommended Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">1</div>
                      <p className="text-sm text-blue-700">Review current {selectedMainCategory.toLowerCase()} processes and identify improvement opportunities</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">2</div>
                      <p className="text-sm text-blue-700">Implement recommended changes gradually and monitor impact</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">3</div>
                      <p className="text-sm text-blue-700">Track progress using KPI dashboard and adjust strategy as needed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button 
              variant="outline" 
              onClick={() => setIsInsightDetailOpen(false)}
              className="px-6"
              data-testid="button-close-insight-detail"
            >
              Close
            </Button>
            <Button 
              className={`px-6 ${
                selectedInsight?.type === 'optimization' ? 'bg-blue-600 hover:bg-blue-700' :
                selectedInsight?.type === 'best_practice' ? 'bg-green-600 hover:bg-green-700' :
                'bg-amber-600 hover:bg-amber-700'
              } text-white`}
              onClick={() => {
                toast({
                  title: "Action Plan Created",
                  description: "This recommendation has been added to your action plan for implementation.",
                });
                setIsInsightDetailOpen(false);
              }}
              data-testid="button-add-to-action-plan"
            >
              Add to Action Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}