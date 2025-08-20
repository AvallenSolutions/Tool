import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GripVertical, Plus, Eye, Download, Settings, BarChart3, FileText, Users, Leaf, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ReportBlock {
  id: string;
  type: 'company_story' | 'metrics_summary' | 'initiatives' | 'kpi_progress' | 'carbon_footprint' | 'water_usage' | 'custom_text';
  title: string;
  content?: any;
  order: number;
  isVisible: boolean;
}

interface ReportTemplate {
  id?: string;
  companyId: number;
  templateName: string;
  audienceType: 'stakeholders' | 'customers' | 'investors' | 'employees' | 'regulators';
  blocks: ReportBlock[];
  createdAt?: string;
  updatedAt?: string;
}

const AVAILABLE_BLOCKS: Omit<ReportBlock, 'id' | 'order' | 'isVisible'>[] = [
  { type: 'company_story', title: 'Company Story', content: { showMission: true, showVision: true, showPillars: true } },
  { type: 'metrics_summary', title: 'Key Metrics Dashboard', content: { showCO2: true, showWater: true, showWaste: true } },
  { type: 'carbon_footprint', title: 'Carbon Footprint Analysis', content: { showBreakdown: true, showTrends: false } },
  { type: 'water_usage', title: 'Water Footprint', content: { showBreakdown: true, showSources: true } },
  { type: 'initiatives', title: 'Sustainability Initiatives', content: { showActive: true, showCompleted: false } },
  { type: 'kpi_progress', title: 'KPI Progress Tracking', content: { showCharts: true, showTargets: true } },
  { type: 'custom_text', title: 'Custom Text Block', content: { text: 'Add your custom content here...' } }
];

const AUDIENCE_TEMPLATES = {
  stakeholders: ['company_story', 'metrics_summary', 'carbon_footprint', 'initiatives', 'kpi_progress'],
  customers: ['company_story', 'metrics_summary', 'initiatives'],
  investors: ['metrics_summary', 'carbon_footprint', 'kpi_progress', 'initiatives'],
  employees: ['company_story', 'initiatives', 'kpi_progress'],
  regulators: ['metrics_summary', 'carbon_footprint', 'water_usage', 'kpi_progress']
};

export default function ReportBuilderPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTemplate, setCurrentTemplate] = useState<ReportTemplate | null>(null);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState<string>('stakeholders');

  // Fetch existing templates
  const { data: templates } = useQuery<ReportTemplate[]>({
    queryKey: ['/api/report-templates'],
  });

  // Initialize with default template
  useEffect(() => {
    if (!currentTemplate) {
      const defaultBlocks: ReportBlock[] = AUDIENCE_TEMPLATES.stakeholders.map((type, index) => {
        const blockTemplate = AVAILABLE_BLOCKS.find(b => b.type === type);
        return {
          id: `${type}_${Date.now()}_${index}`,
          type: type as any,
          title: blockTemplate?.title || type,
          content: blockTemplate?.content || {},
          order: index,
          isVisible: true
        };
      });

      setCurrentTemplate({
        companyId: 1, // Will be set from auth
        templateName: 'Stakeholder Report',
        audienceType: 'stakeholders',
        blocks: defaultBlocks
      });
    }
  }, [currentTemplate]);

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (template: ReportTemplate) => {
      const url = template.id ? `/api/report-templates/${template.id}` : '/api/report-templates';
      const method = template.id ? 'PUT' : 'POST';
      return apiRequest(url, method, template);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Report template saved successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/report-templates'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive"
      });
    }
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !currentTemplate) return;

    const newBlocks = Array.from(currentTemplate.blocks);
    const [reorderedItem] = newBlocks.splice(result.source.index, 1);
    newBlocks.splice(result.destination.index, 0, reorderedItem);

    // Update order values
    const updatedBlocks = newBlocks.map((block, index) => ({
      ...block,
      order: index
    }));

    setCurrentTemplate({
      ...currentTemplate,
      blocks: updatedBlocks
    });
  };

  const addBlock = (blockType: ReportBlock['type']) => {
    if (!currentTemplate) return;

    const blockTemplate = AVAILABLE_BLOCKS.find(b => b.type === blockType);
    const newBlock: ReportBlock = {
      id: `${blockType}_${Date.now()}`,
      type: blockType,
      title: blockTemplate?.title || blockType,
      content: blockTemplate?.content || {},
      order: currentTemplate.blocks.length,
      isVisible: true
    };

    setCurrentTemplate({
      ...currentTemplate,
      blocks: [...currentTemplate.blocks, newBlock]
    });
    setIsBlockDialogOpen(false);
  };

  const removeBlock = (blockId: string) => {
    if (!currentTemplate) return;

    const updatedBlocks = currentTemplate.blocks
      .filter(block => block.id !== blockId)
      .map((block, index) => ({ ...block, order: index }));

    setCurrentTemplate({
      ...currentTemplate,
      blocks: updatedBlocks
    });
  };

  const toggleBlockVisibility = (blockId: string) => {
    if (!currentTemplate) return;

    const updatedBlocks = currentTemplate.blocks.map(block =>
      block.id === blockId ? { ...block, isVisible: !block.isVisible } : block
    );

    setCurrentTemplate({
      ...currentTemplate,
      blocks: updatedBlocks
    });
  };

  const createFromAudience = (audience: string) => {
    const blockTypes = AUDIENCE_TEMPLATES[audience as keyof typeof AUDIENCE_TEMPLATES] || [];
    const blocks: ReportBlock[] = blockTypes.map((type, index) => {
      const blockTemplate = AVAILABLE_BLOCKS.find(b => b.type === type);
      return {
        id: `${type}_${Date.now()}_${index}`,
        type: type as any,
        title: blockTemplate?.title || type,
        content: blockTemplate?.content || {},
        order: index,
        isVisible: true
      };
    });

    setCurrentTemplate({
      companyId: 1,
      templateName: `${audience.charAt(0).toUpperCase() + audience.slice(1)} Report`,
      audienceType: audience as any,
      blocks
    });
    setIsTemplateDialogOpen(false);
  };

  const getBlockIcon = (type: ReportBlock['type']) => {
    switch (type) {
      case 'company_story': return <FileText className="h-4 w-4" />;
      case 'metrics_summary': return <BarChart3 className="h-4 w-4" />;
      case 'carbon_footprint': return <Leaf className="h-4 w-4" />;
      case 'water_usage': return <Users className="h-4 w-4" />;
      case 'initiatives': return <Target className="h-4 w-4" />;
      case 'kpi_progress': return <BarChart3 className="h-4 w-4" />;
      case 'custom_text': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (!currentTemplate) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dynamic Report Builder</h1>
          <p className="text-gray-600 mt-2">
            Create customized sustainability reports with drag-and-drop content blocks
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white border shadow-lg">
              <DialogHeader>
                <DialogTitle>Create Report Template</DialogTitle>
                <DialogDescription>
                  Choose an audience to generate a pre-configured report template
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="audience">Target Audience</Label>
                  <Select value={selectedAudience} onValueChange={setSelectedAudience}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border shadow-lg">
                      <SelectItem value="stakeholders">Stakeholders</SelectItem>
                      <SelectItem value="customers">Customers</SelectItem>
                      <SelectItem value="investors">Investors</SelectItem>
                      <SelectItem value="employees">Employees</SelectItem>
                      <SelectItem value="regulators">Regulators</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => createFromAudience(selectedAudience)}>
                    Create Template
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={() => currentTemplate && saveTemplateMutation.mutate(currentTemplate)}>
            Save Template
          </Button>
          <Button variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="builder" className="space-y-6">
        <TabsList>
          <TabsTrigger value="builder">Report Builder</TabsTrigger>
          <TabsTrigger value="preview">Live Preview</TabsTrigger>
          <TabsTrigger value="settings">Template Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Content Blocks Palette */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Available Blocks</CardTitle>
                <CardDescription>Drag blocks to add them to your report</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Block
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-white border shadow-lg">
                    <DialogHeader>
                      <DialogTitle>Add Content Block</DialogTitle>
                      <DialogDescription>
                        Choose a block type to add to your report
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                      {AVAILABLE_BLOCKS.map((block) => (
                        <Button
                          key={block.type}
                          variant="outline"
                          className="justify-start"
                          onClick={() => addBlock(block.type)}
                        >
                          {getBlockIcon(block.type)}
                          <span className="ml-2">{block.title}</span>
                        </Button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>

          {/* Report Builder Area */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {currentTemplate.templateName}
                </CardTitle>
                <CardDescription>
                  Audience: {currentTemplate.audienceType} • {currentTemplate.blocks.length} blocks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="report-blocks">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                        {currentTemplate.blocks.map((block, index) => (
                          <Draggable key={block.id} draggableId={block.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`p-4 bg-gray-50 border rounded-lg ${
                                  snapshot.isDragging ? 'shadow-lg bg-white' : ''
                                } ${!block.isVisible ? 'opacity-50' : ''}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div {...provided.dragHandleProps}>
                                      <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                                    </div>
                                    {getBlockIcon(block.type)}
                                    <div>
                                      <div className="font-medium">{block.title}</div>
                                      <div className="text-sm text-gray-500">
                                        Block {index + 1} • {block.type}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={block.isVisible ? "default" : "secondary"}>
                                      {block.isVisible ? "Visible" : "Hidden"}
                                    </Badge>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => toggleBlockVisibility(block.id)}
                                    >
                                      {block.isVisible ? <Eye className="h-4 w-4" /> : <Eye className="h-4 w-4 opacity-50" />}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeBlock(block.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Preview</CardTitle>
              <CardDescription>
                Live preview of how your report will look when generated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentTemplate.blocks
                .filter(block => block.isVisible)
                .sort((a, b) => a.order - b.order)
                .map((block) => (
                  <div key={block.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      {getBlockIcon(block.type)}
                      <h3 className="font-semibold">{block.title}</h3>
                    </div>
                    <div className="text-gray-600 bg-gray-50 p-3 rounded">
                      <em>[{block.type} content will be rendered here with live data]</em>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Settings</CardTitle>
              <CardDescription>
                Configure your report template properties
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={currentTemplate.templateName}
                  onChange={(e) => setCurrentTemplate({
                    ...currentTemplate,
                    templateName: e.target.value
                  })}
                />
              </div>
              <div>
                <Label htmlFor="audience-type">Audience Type</Label>
                <Select 
                  value={currentTemplate.audienceType} 
                  onValueChange={(value: any) => setCurrentTemplate({
                    ...currentTemplate,
                    audienceType: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg">
                    <SelectItem value="stakeholders">Stakeholders</SelectItem>
                    <SelectItem value="customers">Customers</SelectItem>
                    <SelectItem value="investors">Investors</SelectItem>
                    <SelectItem value="employees">Employees</SelectItem>
                    <SelectItem value="regulators">Regulators</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}