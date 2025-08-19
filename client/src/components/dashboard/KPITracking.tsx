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
  BarChart3
} from "lucide-react";
import { KPIDetailModal } from './KPIDetailModal';

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

interface NewKPIFormData {
  name: string;
  description?: string;
  target: number;
  unit: string;
  category: 'emissions' | 'efficiency' | 'sustainability' | 'compliance';
  deadline?: string;
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
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState<KPIData | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const handleKPIClick = (kpi: KPIData) => {
    setSelectedKPI(kpi);
    setIsDetailModalOpen(true);
  };
  
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<NewKPIFormData>();
  const { data, isLoading, error } = useQuery<KPIResponse>({
    queryKey: ['/api/kpi-data'],
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
  });
  
  const createKpiMutation = useMutation({
    mutationFn: async (kpiData: NewKPIFormData) => {
      const response = await fetch('/api/kpis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(kpiData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create KPI');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpi-data"] });
      setShowAddDialog(false);
      reset();
      toast({
        title: "KPI Created",
        description: "Your new KPI has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create KPI. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: NewKPIFormData) => {
    createKpiMutation.mutate(data);
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
            <Button 
              className="bg-avallen-green hover:bg-avallen-green/90"
              onClick={() => setShowAddDialog(true)}
            >
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
          <Button 
            size="sm" 
            className="bg-avallen-green hover:bg-avallen-green/90"
            onClick={() => setShowAddDialog(true)}
          >
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
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50 hover:bg-white cursor-pointer"
                  onClick={() => handleKPIClick(kpi)}
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

      {/* Add KPI Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-white border shadow-lg max-w-md">
          <DialogHeader>
            <DialogTitle>Add New KPI</DialogTitle>
            <DialogDescription>
              Create a new sustainability KPI to track your progress
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">KPI Name</Label>
              <Input
                id="name"
                {...register("name", { required: "KPI name is required" })}
                placeholder="e.g., Reduce Carbon Emissions"
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select onValueChange={(value) => setValue("category", value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-white border shadow-lg">
                  <SelectItem value="emissions">Emissions</SelectItem>
                  <SelectItem value="efficiency">Efficiency</SelectItem>
                  <SelectItem value="sustainability">Sustainability</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target">Target Value</Label>
                <Input
                  id="target"
                  type="number"
                  {...register("target", { 
                    required: "Target is required",
                    valueAsNumber: true,
                    min: { value: 0, message: "Target must be positive" }
                  })}
                  placeholder="100"
                />
                {errors.target && (
                  <p className="text-sm text-red-600">{errors.target.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  {...register("unit", { required: "Unit is required" })}
                  placeholder="kg CO2e, %, kWh"
                />
                {errors.unit && (
                  <p className="text-sm text-red-600">{errors.unit.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline (Optional)</Label>
              <Input
                id="deadline"
                type="date"
                {...register("deadline")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Brief description of this KPI..."
                className="resize-none"
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-avallen-green hover:bg-avallen-green/90"
                disabled={createKpiMutation.isPending}
              >
                {createKpiMutation.isPending ? "Creating..." : "Create KPI"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* KPI Detail Modal */}
      <KPIDetailModal
        kpi={selectedKPI}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  );
}