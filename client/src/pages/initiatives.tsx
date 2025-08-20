import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Target, CheckCircle, Clock, Pause, Trash2, Link } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Initiative {
  id?: string;
  companyId: number;
  initiativeName: string;
  description: string | null;
  linkedKpiGoalId: string | null;
  strategicPillar: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

interface KPIGoal {
  id: string;
  kpiName: string;
  targetValue: string;
  targetDate: string;
}

export default function InitiativesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInitiative, setEditingInitiative] = useState<Initiative | null>(null);
  const [formData, setFormData] = useState<Partial<Initiative>>({
    initiativeName: '',
    description: '',
    linkedKpiGoalId: null,
    strategicPillar: 'Planet',
    status: 'active'
  });

  // Fetch initiatives
  const { data: initiatives, isLoading: initiativesLoading } = useQuery<Initiative[]>({
    queryKey: ['/api/initiatives'],
  });

  // Fetch KPI goals
  const { data: kpiGoals, isLoading: kpiLoading } = useQuery<KPIGoal[]>({
    queryKey: ['/api/smart-goals'],
  });

  // Create/update initiative mutation
  const saveInitiativeMutation = useMutation({
    mutationFn: async (data: Partial<Initiative>) => {
      const url = editingInitiative ? `/api/initiatives/${editingInitiative.id}` : '/api/initiatives';
      const method = editingInitiative ? 'PUT' : 'POST';
      return apiRequest(url, method, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: editingInitiative ? "Initiative updated successfully" : "Initiative created successfully"
      });
      setIsDialogOpen(false);
      setEditingInitiative(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['/api/initiatives'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save initiative",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      initiativeName: '',
      description: '',
      linkedKpiGoalId: null,
      strategicPillar: 'Planet',
      status: 'active'
    });
  };

  const handleEdit = (initiative: Initiative) => {
    setEditingInitiative(initiative);
    setFormData({
      initiativeName: initiative.initiativeName,
      description: initiative.description,
      linkedKpiGoalId: initiative.linkedKpiGoalId,
      strategicPillar: initiative.strategicPillar,
      status: initiative.status
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.initiativeName?.trim()) {
      toast({
        title: "Error",
        description: "Initiative name is required",
        variant: "destructive"
      });
      return;
    }
    saveInitiativeMutation.mutate(formData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Target className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPillarColor = (pillar: string) => {
    switch (pillar) {
      case 'Planet': return 'bg-green-100 text-green-800';
      case 'People': return 'bg-blue-100 text-blue-800';
      case 'Principles': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (initiativesLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sustainability Initiatives</h1>
          <p className="text-gray-600 mt-2">
            Track and manage your sustainability projects linked to KPI goals
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingInitiative(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Initiative
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-white border shadow-lg">
            <DialogHeader>
              <DialogTitle>
                {editingInitiative ? 'Edit Initiative' : 'Create New Initiative'}
              </DialogTitle>
              <DialogDescription>
                Add a sustainability initiative and link it to your KPI goals
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Initiative Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Carbon Offset Program"
                  value={formData.initiativeName || ''}
                  onChange={(e) => setFormData({ ...formData, initiativeName: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the initiative and its goals..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="pillar">Strategic Pillar</Label>
                <Select 
                  value={formData.strategicPillar || 'Planet'} 
                  onValueChange={(value) => setFormData({ ...formData, strategicPillar: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pillar" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg">
                    <SelectItem value="Planet">Planet</SelectItem>
                    <SelectItem value="People">People</SelectItem>
                    <SelectItem value="Principles">Principles</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="kpi">Link to KPI Goal (Optional)</Label>
                <Select 
                  value={formData.linkedKpiGoalId || ''} 
                  onValueChange={(value) => setFormData({ ...formData, linkedKpiGoalId: value || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a KPI goal to link" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg">
                    <SelectItem value="">No KPI Link</SelectItem>
                    {kpiGoals?.map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.kpiName} - Target: {goal.targetValue} by {new Date(goal.targetDate).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status || 'active'} 
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={saveInitiativeMutation.isPending}
                >
                  {saveInitiativeMutation.isPending ? 'Saving...' : 'Save Initiative'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {initiatives?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No initiatives yet</h3>
              <p className="text-gray-500 mb-4">
                Create your first sustainability initiative to start tracking progress
              </p>
              <Button onClick={() => { resetForm(); setEditingInitiative(null); setIsDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Initiative
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {initiatives?.map((initiative) => {
              const linkedKpi = kpiGoals?.find(goal => goal.id === initiative.linkedKpiGoalId);
              
              return (
                <Card key={initiative.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">{initiative.initiativeName}</CardTitle>
                          <Badge className={getStatusColor(initiative.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(initiative.status)}
                              {initiative.status}
                            </div>
                          </Badge>
                          {initiative.strategicPillar && (
                            <Badge variant="outline" className={getPillarColor(initiative.strategicPillar)}>
                              {initiative.strategicPillar}
                            </Badge>
                          )}
                        </div>
                        {initiative.description && (
                          <CardDescription className="text-sm text-gray-600 mb-3">
                            {initiative.description}
                          </CardDescription>
                        )}
                        {linkedKpi && (
                          <div className="flex items-center gap-2 text-sm text-blue-600">
                            <Link className="h-4 w-4" />
                            <span>
                              Linked to: {linkedKpi.kpiName} (Target: {linkedKpi.targetValue} by {new Date(linkedKpi.targetDate).toLocaleDateString()})
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(initiative)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {initiatives && initiatives.length > 0 && (
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Initiative Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-700 font-medium">Total:</span>
              <span className="ml-2">{initiatives.length}</span>
            </div>
            <div>
              <span className="text-green-700 font-medium">Active:</span>
              <span className="ml-2">{initiatives.filter(i => i.status === 'active').length}</span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Completed:</span>
              <span className="ml-2">{initiatives.filter(i => i.status === 'completed').length}</span>
            </div>
            <div>
              <span className="text-purple-700 font-medium">KPI Linked:</span>
              <span className="ml-2">{initiatives.filter(i => i.linkedKpiGoalId).length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}