import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Target, CheckCircle, Clock, Pause, Settings, Flag, Calendar } from "lucide-react";
import { EditableTextBlock } from "@/components/report-builder/EditableTextBlock";

// Live SMART Goals data structure from initiatives page
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

const statusConfig = {
  'active': { color: 'bg-green-100 text-green-800', label: 'Active', icon: Target },
  'completed': { color: 'bg-blue-100 text-blue-800', label: 'Completed', icon: CheckCircle },
  'paused': { color: 'bg-yellow-100 text-yellow-800', label: 'Paused', icon: Pause },
  'overdue': { color: 'bg-red-100 text-red-800', label: 'Overdue', icon: Clock },
};

const priorityConfig = {
  'high': { color: 'bg-red-100 text-red-700', label: 'High Priority' },
  'medium': { color: 'bg-yellow-100 text-yellow-700', label: 'Medium Priority' },
  'low': { color: 'bg-green-100 text-green-700', label: 'Low Priority' },
};

interface InitiativesPreviewProps {
  block?: {
    id: string;
    content?: {
      selectedGoals?: string[];
      customText?: {
        introduction?: string;
        summary?: string;
      };
    };
  };
  onUpdate?: (blockId: string, content: any) => void;
  isPreview?: boolean;
}

export function InitiativesPreview({ block, onUpdate, isPreview = false }: InitiativesPreviewProps) {
  // Fetch live SMART Goals data
  const { data: smartGoalsData, isLoading } = useQuery<SmartGoalsResponse>({
    queryKey: ['/api/smart-goals'],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Get live goals data
  const allGoals = smartGoalsData?.goals || [];
  const summary = smartGoalsData?.summary || { total: 0, active: 0, completed: 0, overdue: 0 };
  
  // Filter goals based on selection (default to first 6 if none selected)
  const selectedGoalIds = block?.content?.selectedGoals || [];
  const displayGoals = selectedGoalIds.length > 0 
    ? allGoals.filter(goal => selectedGoalIds.includes(goal.id))
    : allGoals.filter(goal => goal.selectedForReport).slice(0, 6);

  // Handle goal selection update
  const updateSelectedGoals = (goalId: string, isSelected: boolean) => {
    if (!block || !onUpdate) return;
    
    const currentSelection = block.content?.selectedGoals || [];
    const newSelection = isSelected 
      ? [...currentSelection, goalId]
      : currentSelection.filter(id => id !== goalId);
    
    onUpdate(block.id, {
      ...block.content,
      selectedGoals: newSelection
    });
  };

  // Handle custom text updates
  const updateCustomText = (field: string, value: string) => {
    if (!block || !onUpdate) return;
    const newContent = {
      ...block.content,
      customText: {
        ...block.content?.customText,
        [field]: value
      }
    };
    onUpdate(block.id, newContent);
  };

  return (
    <div className="space-y-6">
      {/* Introduction Section */}
      {block && onUpdate && !isPreview && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-700 mb-2">📝 Add Initiatives Introduction</h4>
          <EditableTextBlock
            block={{
              id: `${block.id}_intro`,
              content: {
                text: block.content?.customText?.introduction || 'Add an introduction to your Sustainability Initiatives section...',
                formatting: { fontSize: 'medium', alignment: 'left', style: 'normal' }
              }
            }}
            onUpdate={(_, content) => updateCustomText('introduction', content.text)}
            isPreview={false}
          />
        </div>
      )}

      {/* Display Introduction in Preview Mode */}
      {isPreview && block?.content?.customText?.introduction && (
        <div className="mb-6">
          <p className="text-gray-700">{block.content.customText.introduction}</p>
        </div>
      )}

      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Sustainability Initiatives</h3>
        <p className="text-gray-600 text-sm mb-4">
          Our strategic SMART goals driving environmental and social impact.
        </p>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{summary.completed}</div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{summary.active}</div>
            <div className="text-xs text-gray-600">Active</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-yellow-600">{summary.total - summary.completed - summary.active - summary.overdue}</div>
            <div className="text-xs text-gray-600">Planned</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-600">{summary.overdue}</div>
            <div className="text-xs text-gray-600">Overdue</div>
          </div>
        </div>
      </div>

      {/* Goal Selection Interface (only in edit mode) */}
      {!isPreview && block && onUpdate && (
        <div className="mb-6">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="mb-4">
                <Settings className="w-4 h-4 mr-2" />
                Select Goals for Report ({selectedGoalIds.length} selected)
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white border shadow">
              <DialogHeader>
                <DialogTitle>Select SMART Goals for Report</DialogTitle>
                <DialogDescription>
                  Choose which Sustainability Initiatives to include in your report.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {allGoals.map((goal) => {
                  const isSelected = selectedGoalIds.includes(goal.id);
                  const StatusIcon = statusConfig[goal.status as keyof typeof statusConfig]?.icon || Target;
                  const statusStyle = statusConfig[goal.status as keyof typeof statusConfig] || statusConfig.active;
                  const priorityStyle = priorityConfig[goal.priority as keyof typeof priorityConfig] || priorityConfig.medium;
                  
                  return (
                    <div key={goal.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={(checked) => updateSelectedGoals(goal.id, checked as boolean)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{goal.title}</span>
                          <Badge variant="outline" className={statusStyle.color}>
                            {statusStyle.label}
                          </Badge>
                          <Badge variant="outline" className={priorityStyle.color}>
                            {priorityStyle.label}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          {goal.description}
                        </div>
                        <div className="text-xs text-gray-500">
                          Category: {goal.category} | Target: {new Date(goal.targetDate).toLocaleDateString()}
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

      {/* Goals Grid */}
      <div className="space-y-4">
        {displayGoals.length > 0 ? (
          displayGoals.map((goal) => {
            const StatusIcon = statusConfig[goal.status as keyof typeof statusConfig]?.icon || Target;
            const statusStyle = statusConfig[goal.status as keyof typeof statusConfig] || statusConfig.active;
            const priorityStyle = priorityConfig[goal.priority as keyof typeof priorityConfig] || priorityConfig.medium;
            
            return (
              <Card key={goal.id} className="bg-white border border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className="w-5 h-5 text-gray-500" />
                      <CardTitle className="text-lg font-semibold">{goal.title}</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className={priorityStyle.color}>
                        {priorityStyle.label}
                      </Badge>
                      <Badge variant="outline" className={statusStyle.color}>
                        {statusStyle.label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Description */}
                    {goal.description && (
                      <p className="text-sm text-gray-600">{goal.description}</p>
                    )}
                    
                    {/* SMART Criteria Summary */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h6 className="font-medium text-gray-900 text-sm mb-2">SMART Criteria</h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div><strong>Specific:</strong> {goal.specific}</div>
                        <div><strong>Measurable:</strong> {goal.measurable}</div>
                        <div><strong>Achievable:</strong> {goal.achievable}</div>
                        <div><strong>Relevant:</strong> {goal.relevant}</div>
                        <div><strong>Time-bound:</strong> {goal.timeBound}</div>
                      </div>
                    </div>
                    
                    {/* Report Narrative */}
                    {goal.narrative && (
                      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                        <h6 className="font-medium text-blue-900 text-sm mb-1">Report Narrative</h6>
                        <p className="text-sm text-blue-700">{goal.narrative}</p>
                      </div>
                    )}
                    
                    {/* Meta Information */}
                    <div className="flex items-center gap-4 pt-2 text-xs text-gray-500 border-t">
                      <div className="flex items-center gap-1">
                        <Flag className="w-3 h-3" />
                        <span>Category: {goal.category}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No initiatives selected</p>
            <p className="text-sm">
              {!isPreview 
                ? 'Click "Select Goals for Report" to choose which initiatives to display.'
                : 'No sustainability initiatives have been selected for this report.'}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Note */}
      <div className="text-center text-xs text-gray-500 mt-4">
        <p>
          {displayGoals.length > 0 
            ? `Showing ${displayGoals.length} of ${allGoals.length} SMART goals. `
            : 'No goals selected. '}
          Initiatives are sourced from your SMART Goals and updated in real-time.
        </p>
      </div>

      {/* Summary Section - Edit Mode */}
      {block && onUpdate && !isPreview && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-700 mb-2">📝 Add Initiatives Summary</h4>
          <EditableTextBlock
            block={{
              id: `${block.id}_summary`,
              content: {
                text: block.content?.customText?.summary || 'Add a summary of your sustainability initiatives and their impact...',
                formatting: { fontSize: 'medium', alignment: 'left', style: 'normal' }
              }
            }}
            onUpdate={(_, content) => updateCustomText('summary', content.text)}
            isPreview={false}
          />
        </div>
      )}

      {/* Display Summary in Preview Mode */}
      {isPreview && block?.content?.customText?.summary && (
        <div className="mt-6">
          <p className="text-gray-700">{block.content.customText.summary}</p>
        </div>
      )}
    </div>
  );
}