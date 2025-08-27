import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Target, 
  Plus, 
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Edit,
  Trash2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SMARTGoal {
  id: string;
  title: string;
  description: string;
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
  status: 'draft' | 'active' | 'completed' | 'paused';
  priority: 'low' | 'medium' | 'high';
  progress: number;
  targetDate: string;
  category: 'emissions' | 'efficiency' | 'sustainability' | 'compliance';
  createdAt: string;
  updatedAt: string;
}

interface SMARTGoalsResponse {
  goals: SMARTGoal[];
  summary: {
    total: number;
    active: number;
    completed: number;
    overdue: number;
  };
}

interface CreateGoalData {
  title: string;
  description: string;
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
  priority: 'low' | 'medium' | 'high';
  targetDate: string;
  category: 'emissions' | 'efficiency' | 'sustainability' | 'compliance';
}

const statusConfig = {
  draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft', icon: Edit },
  active: { color: 'bg-blue-100 text-blue-800', label: 'Active', icon: Clock },
  completed: { color: 'bg-green-100 text-green-800', label: 'Completed', icon: CheckCircle },
  paused: { color: 'bg-yellow-100 text-yellow-800', label: 'Paused', icon: AlertTriangle },
};

const priorityConfig = {
  low: { color: 'bg-green-100 text-green-800', label: 'Low' },
  medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
  high: { color: 'bg-red-100 text-red-800', label: 'High' },
};

const categoryConfig = {
  emissions: { color: 'bg-red-100 text-red-800', label: 'Emissions Reduction' },
  efficiency: { color: 'bg-blue-100 text-blue-800', label: 'Resource Efficiency' },
  sustainability: { color: 'bg-green-100 text-green-800', label: 'Sustainability' },
  compliance: { color: 'bg-purple-100 text-purple-800', label: 'Compliance' },
};

export function SMARTGoals() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<SMARTGoalsResponse>({
    queryKey: ['/api/smart-goals'],
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const createGoalMutation = useMutation({
    mutationFn: (goalData: CreateGoalData) => 
      apiRequest('POST', '/api/smart-goals', goalData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart-goals'] });
      setIsCreateOpen(false);
      toast({
        title: "Goal Created",
        description: "Your SMART goal has been created successfully.",
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

  if (isLoading) {
    return (
      <Card className="bg-white border shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            SMART Goals
          </CardTitle>
          <CardDescription>Create and track Specific, Measurable, Achievable, Relevant, Time-bound goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
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
            <Target className="w-5 h-5" />
            SMART Goals
          </CardTitle>
          <CardDescription>Create and track Specific, Measurable, Achievable, Relevant, Time-bound goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Target className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">No goals set yet</p>
            <p className="text-sm text-gray-500 mb-4">Create your first SMART goal to start tracking meaningful progress</p>
            <Button 
              onClick={() => window.location.href = '/initiatives'} 
              className="bg-avallen-green hover:bg-avallen-green/90"
            >
              <Target className="w-4 h-4 mr-2" />
              Manage Goals & Initiatives
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle both old and new API response structures
  const goals = Array.isArray(data) ? data : (data?.goals || []);
  const summary = data?.summary || { total: 0, active: 0, completed: 0, overdue: 0 };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Total Goals</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary?.total || 0}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Achieved</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{summary?.completed || 0}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">On Target</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-blue-600">{summary?.active || 0}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium">Behind Target</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{summary?.overdue || 0}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium">Ahead of Target</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{Math.max(0, (summary?.total || 0) - (summary?.active || 0) - (summary?.completed || 0) - (summary?.overdue || 0))}</p>
          </CardContent>
        </Card>
      </div>

      {/* SMART Goals Management */}
      <Card className="bg-white border shadow">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              SMART Goals
            </CardTitle>
            <CardDescription>Track your structured sustainability objectives</CardDescription>
          </div>
          <Button 
            onClick={() => window.location.href = '/initiatives'} 
            size="sm" 
            variant="outline"
          >
            <Target className="w-4 h-4 mr-2" />
            Manage SMART Goals
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{goals.length > 0 ? Math.round(goals.reduce((acc, goal) => acc + goal.progress, 0) / goals.length) : 0}%</span>
            </div>
            <Progress value={goals.length > 0 ? goals.reduce((acc, goal) => acc + goal.progress, 0) / goals.length : 0} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateGoalDialog({ 
  onSubmit, 
  isLoading 
}: { 
  onSubmit: (data: CreateGoalData) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<CreateGoalData>({
    title: '',
    description: '',
    specific: '',
    measurable: '',
    achievable: '',
    relevant: '',
    timeBound: '',
    priority: 'medium',
    targetDate: '',
    category: 'sustainability',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white border shadow-lg">
      <DialogHeader>
        <DialogTitle>Create SMART Goal</DialogTitle>
        <DialogDescription>
          Define a Specific, Measurable, Achievable, Relevant, and Time-bound sustainability goal
        </DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Goal Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Reduce packaging waste by 30%"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value: any) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="emissions">Emissions Reduction</SelectItem>
                <SelectItem value="efficiency">Resource Efficiency</SelectItem>
                <SelectItem value="sustainability">Sustainability</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief overview of what you want to achieve"
            rows={2}
          />
        </div>

        <div className="space-y-4">
          <h4 className="font-medium">SMART Criteria</h4>
          
          <div className="space-y-2">
            <Label htmlFor="specific">Specific - What exactly will you accomplish?</Label>
            <Textarea
              id="specific"
              value={formData.specific}
              onChange={(e) => setFormData({ ...formData, specific: e.target.value })}
              placeholder="Clear, well-defined goal with specific outcomes"
              rows={2}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="measurable">Measurable - How will you measure progress?</Label>
            <Textarea
              id="measurable"
              value={formData.measurable}
              onChange={(e) => setFormData({ ...formData, measurable: e.target.value })}
              placeholder="Concrete criteria for measuring progress and success"
              rows={2}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="achievable">Achievable - How is the goal attainable?</Label>
            <Textarea
              id="achievable"
              value={formData.achievable}
              onChange={(e) => setFormData({ ...formData, achievable: e.target.value })}
              placeholder="Realistic and attainable with available resources"
              rows={2}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="relevant">Relevant - Why does this goal matter?</Label>
            <Textarea
              id="relevant"
              value={formData.relevant}
              onChange={(e) => setFormData({ ...formData, relevant: e.target.value })}
              placeholder="How this goal aligns with broader objectives"
              rows={2}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="timeBound">Time-bound - When will you complete this?</Label>
            <Textarea
              id="timeBound"
              value={formData.timeBound}
              onChange={(e) => setFormData({ ...formData, timeBound: e.target.value })}
              placeholder="Specific deadline and timeline for completion"
              rows={2}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select 
              value={formData.priority} 
              onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="targetDate">Target Date</Label>
            <Input
              id="targetDate"
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isLoading} className="bg-avallen-green hover:bg-avallen-green/90">
            {isLoading ? 'Creating...' : 'Create Goal'}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}