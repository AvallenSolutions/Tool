import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Target, CheckCircle, Clock, Pause, Filter, Calendar, Flag } from 'lucide-react';
import AIWritingAssistant from '@/components/ai-writing-assistant';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SmartGoal {
  id: string;
  title: string;
  description: string;
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
  priority: string;
  targetDate: string;
  category: string;
  status: string;
  narrative?: string;
  selectedForReport?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SmartGoalsResponse {
  goals: SmartGoal[];
  summary: {
    total: number;
    active: number;
    completed: number;
    overdue: number;
  };
}

export default function InitiativesPage() {
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());
  const [goalNarratives, setGoalNarratives] = useState<Map<string, string>>(new Map());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch SMART Goals
  const { data: smartGoalsResponse, isLoading: goalsLoading } = useQuery<SmartGoalsResponse>({
    queryKey: ['/api/smart-goals'],
  });
  
  const goals = smartGoalsResponse?.goals || [];
  const summary = smartGoalsResponse?.summary;

  // Initialize selected goals and narratives from database data
  useEffect(() => {
    if (goals.length > 0) {
      const selectedFromDb = new Set<string>();
      const narrativesFromDb = new Map<string, string>();
      
      goals.forEach(goal => {
        if (goal.selectedForReport) {
          selectedFromDb.add(goal.id);
        }
        if (goal.narrative) {
          narrativesFromDb.set(goal.id, goal.narrative);
        }
      });
      
      setSelectedGoals(selectedFromDb);
      setGoalNarratives(narrativesFromDb);
    }
  }, [goals]);

  // Filter goals based on current filter settings
  const filteredGoals = goals.filter(goal => {
    if (statusFilter !== 'all' && goal.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && goal.priority !== priorityFilter) return false;
    if (categoryFilter !== 'all' && goal.category !== categoryFilter) return false;
    return true;
  });

  const handleGoalSelection = (goalId: string, isSelected: boolean) => {
    const newSelected = new Set(selectedGoals);
    if (isSelected) {
      newSelected.add(goalId);
    } else {
      newSelected.delete(goalId);
      // Remove narrative when deselecting
      const newNarratives = new Map(goalNarratives);
      newNarratives.delete(goalId);
      setGoalNarratives(newNarratives);
    }
    setSelectedGoals(newSelected);
  };

  const updateNarrative = (goalId: string, narrative: string) => {
    const newNarratives = new Map(goalNarratives);
    newNarratives.set(goalId, narrative);
    setGoalNarratives(newNarratives);
  };

  // Save selected goals and narratives to database
  const saveSelectedGoals = async () => {
    setIsSaving(true);
    try {
      const goalUpdates = goals.map(goal => ({
        id: goal.id,
        selectedForReport: selectedGoals.has(goal.id),
        narrative: goalNarratives.get(goal.id) || null
      }));
      
      console.log('Sending goal updates:', goalUpdates);

      const response = await apiRequest('PUT', '/api/smart-goals/batch', { goalUpdates });
      const result = await response.json();
      
      console.log('Save response:', result);
      
      // Refresh the goals data to reflect the saved changes
      queryClient.invalidateQueries({ queryKey: ['/api/smart-goals'] });
      
      toast({
        title: "✅ Goals Saved Successfully!",
        description: `${result.updated || selectedGoals.size} SMART goals and their narratives have been saved for the Report Builder. You can now access them in the Sustainability Initiatives block.`,
        duration: 5000,
      });
    } catch (error: any) {
      console.error('Error saving goals:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
      toast({
        title: "❌ Save Failed",
        description: `There was an error saving your goals: ${errorMessage}. Please try again.`,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectAllVisible = () => {
    const allVisibleIds = new Set([...selectedGoals, ...filteredGoals.map(g => g.id)]);
    setSelectedGoals(allVisibleIds);
  };

  const clearSelection = () => {
    setSelectedGoals(new Set());
    setGoalNarratives(new Map());
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'emissions': return 'bg-red-100 text-red-800';
      case 'efficiency': return 'bg-blue-100 text-blue-800';
      case 'sustainability': return 'bg-green-100 text-green-800';
      case 'compliance': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTimeProgress = (targetDate: string) => {
    const target = new Date(targetDate);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: 'Overdue', color: 'text-red-600', days: Math.abs(diffDays) };
    if (diffDays <= 30) return { label: 'Due soon', color: 'text-yellow-600', days: diffDays };
    return { label: 'On track', color: 'text-green-600', days: diffDays };
  };

  if (goalsLoading) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="SMART Goals Reporting" subtitle="Loading goals..." />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="SMART Goals Reporting" subtitle="Select goals and create compelling narratives for your sustainability reports" />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="container mx-auto max-w-7xl">
            
            {/* Summary Statistics */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-slate-gray">{summary.total}</div>
                    <div className="text-sm text-gray-600">Total Goals</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">{summary.active}</div>
                    <div className="text-sm text-gray-600">Active Goals</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">{summary.completed}</div>
                    <div className="text-sm text-gray-600">Completed Goals</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">{summary.overdue}</div>
                    <div className="text-sm text-gray-600">Overdue Goals</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Filter Controls */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters & Selection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border shadow-lg">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border shadow-lg">
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border shadow-lg">
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="emissions">Emissions</SelectItem>
                        <SelectItem value="efficiency">Efficiency</SelectItem>
                        <SelectItem value="sustainability">Sustainability</SelectItem>
                        <SelectItem value="compliance">Compliance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1"></div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllVisible}>
                      Select All Visible
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearSelection}>
                      Clear Selection
                    </Button>
                  </div>
                </div>
                
                {selectedGoals.size > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm font-medium text-blue-900">
                      {selectedGoals.size} goal{selectedGoals.size !== 1 ? 's' : ''} selected for reporting
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SMART Goals Grid */}
            {filteredGoals.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No goals found</h3>
                  <p className="text-gray-600 mb-6">
                    {goals.length === 0 
                      ? 'Create your first SMART goal to get started with reporting' 
                      : 'Try adjusting your filters to see more goals'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {filteredGoals.map((goal) => {
                  const isSelected = selectedGoals.has(goal.id);
                  const narrative = goalNarratives.get(goal.id) || '';
                  const timeProgress = getTimeProgress(goal.targetDate);
                  
                  return (
                    <Card key={goal.id} className={`hover:shadow-md transition-all ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                      <CardHeader className="pb-4">
                        <div className="flex items-start gap-4">
                          {/* Selection Checkbox */}
                          <div className="pt-1">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleGoalSelection(goal.id, !!checked)}
                              className="data-[state=checked]:bg-blue-600"
                            />
                          </div>
                          
                          {/* Goal Content */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <CardTitle className="text-lg mb-2">{goal.title}</CardTitle>
                                <div className="flex flex-wrap gap-2 mb-3">
                                  <Badge className={getStatusColor(goal.status)}>
                                    <div className="flex items-center gap-1">
                                      {getStatusIcon(goal.status)}
                                      {goal.status}
                                    </div>
                                  </Badge>
                                  <Badge className={getPriorityColor(goal.priority)}>
                                    <Flag className="h-3 w-3 mr-1" />
                                    {goal.priority}
                                  </Badge>
                                  <Badge className={getCategoryColor(goal.category)} variant="outline">
                                    {goal.category}
                                  </Badge>
                                  <Badge variant="outline" className={timeProgress.color}>
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {timeProgress.label} ({timeProgress.days} days)
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            {/* Goal Description */}
                            {goal.description && (
                              <CardDescription className="text-sm text-gray-600 mb-4">
                                {goal.description}
                              </CardDescription>
                            )}
                            
                            {/* SMART Framework Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm">
                              {goal.specific && (
                                <div className="bg-gray-50 p-3 rounded">
                                  <div className="font-semibold text-gray-700 mb-1">Specific</div>
                                  <div className="text-gray-600">{goal.specific}</div>
                                </div>
                              )}
                              {goal.measurable && (
                                <div className="bg-gray-50 p-3 rounded">
                                  <div className="font-semibold text-gray-700 mb-1">Measurable</div>
                                  <div className="text-gray-600">{goal.measurable}</div>
                                </div>
                              )}
                              {goal.achievable && (
                                <div className="bg-gray-50 p-3 rounded">
                                  <div className="font-semibold text-gray-700 mb-1">Achievable</div>
                                  <div className="text-gray-600">{goal.achievable}</div>
                                </div>
                              )}
                              {goal.relevant && (
                                <div className="bg-gray-50 p-3 rounded">
                                  <div className="font-semibold text-gray-700 mb-1">Relevant</div>
                                  <div className="text-gray-600">{goal.relevant}</div>
                                </div>
                              )}
                            </div>
                            
                            {/* Time Bound */}
                            {goal.timeBound && (
                              <div className="bg-blue-50 p-3 rounded mb-4 text-sm">
                                <div className="font-semibold text-blue-700 mb-1">Time-bound</div>
                                <div className="text-blue-600">{goal.timeBound}</div>
                                <div className="text-xs text-blue-500 mt-1">
                                  Target Date: {new Date(goal.targetDate).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                            
                            {/* Narrative Section - Only show when selected */}
                            {isSelected && (
                              <div className="border-t pt-4 mt-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-gray-700">Goal Narrative for Report</h4>
                                  <AIWritingAssistant
                                    currentText={narrative}
                                    contentType="initiative_description"
                                    onTextUpdate={(newText) => updateNarrative(goal.id, newText)}
                                    companyContext={{
                                      industry: 'Beverages',
                                      size: 'SME',
                                      values: ['Sustainability', 'Innovation', 'Quality']
                                    }}
                                  />
                                </div>
                                <Textarea
                                  placeholder={`Write a compelling narrative about "${goal.title}" for your sustainability report. Describe progress, impact, and strategic importance...`}
                                  value={narrative}
                                  onChange={(e) => updateNarrative(goal.id, e.target.value)}
                                  rows={4}
                                  className="resize-none"
                                />
                                <div className="text-xs text-gray-500 mt-1">
                                  This narrative will be included in your sustainability report for this goal.
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Reporting Summary - Only show when goals are selected */}
            {selectedGoals.size > 0 && (
              <Card className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Report Preparation Summary
                  </CardTitle>
                  <CardDescription>
                    Review your selected goals and narratives before generating your sustainability report
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{selectedGoals.size}</div>
                      <div className="text-sm text-gray-600">Goals Selected</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Array.from(goalNarratives.values()).filter(n => n?.trim().length > 0).length}
                      </div>
                      <div className="text-sm text-gray-600">Narratives Written</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedGoals.size > 0 ? Math.round((Array.from(goalNarratives.values()).filter(n => n?.trim().length > 0).length / selectedGoals.size) * 100) : 0}%
                      </div>
                      <div className="text-sm text-gray-600">Completion Rate</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      onClick={saveSelectedGoals}
                      disabled={isSaving || selectedGoals.size === 0}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        'Save for Report Builder'
                      )}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => window.location.href = '/report-builder'}
                      disabled={selectedGoals.size === 0}
                    >
                      Open Report Builder
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
          </div>
        </main>
      </div>
    </div>
  );
}