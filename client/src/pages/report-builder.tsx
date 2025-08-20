import { useState, useEffect, useRef } from 'react';
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
import { GripVertical, Plus, Eye, Download, Settings, BarChart3, FileText, Users, Leaf, Target, Sparkles } from 'lucide-react';
import AIWritingAssistant from '@/components/ai-writing-assistant';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';

// Preview components for each block type
function CompanyStoryPreview() {
  const { data: companyStory } = useQuery({
    queryKey: ['/api/company/story'],
  });

  return (
    <div className="space-y-4">
      {companyStory?.missionStatement && (
        <div>
          <h4 className="font-semibold text-green-700 mb-2">Mission Statement</h4>
          <p className="text-gray-700">{companyStory.missionStatement}</p>
        </div>
      )}
      {companyStory?.visionStatement && (
        <div>
          <h4 className="font-semibold text-green-700 mb-2">Vision Statement</h4>
          <p className="text-gray-700">{companyStory.visionStatement}</p>
        </div>
      )}
      {companyStory?.strategicPillars && companyStory.strategicPillars.length > 0 && (
        <div>
          <h4 className="font-semibold text-green-700 mb-2">Strategic Pillars</h4>
          <div className="space-y-2">
            {companyStory.strategicPillars.map((pillar: any, index: number) => (
              <div key={index} className="border-l-4 border-green-500 pl-4">
                <h5 className="font-medium">{pillar.name}</h5>
                <p className="text-sm text-gray-600">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricsSummaryPreview() {
  // Use the exact same API endpoints as the dashboard
  const { data: footprintData } = useQuery({
    queryKey: ['/api/company/footprint'],
    staleTime: 0,
  });

  const { data: automatedData } = useQuery({
    queryKey: ['/api/company/footprint/scope3/automated'],
  });

  const { data: dashboardMetrics } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
  });

  // Calculate CO2e exactly the same way as the dashboard
  const calculateTotalCO2e = () => {
    if (!footprintData?.data || !automatedData?.data) return 0;
    
    // Manual Scope 1 + 2 emissions from footprint data
    let manualEmissions = 0;
    for (const entry of footprintData.data) {
      if (entry.scope === 1 || entry.scope === 2) {
        manualEmissions += parseFloat(entry.calculatedEmissions) || 0;
      }
    }
    
    // Automated Scope 3 emissions
    const automatedEmissions = automatedData.data.totalEmissions * 1000 || 0; // Convert tonnes to kg
    
    const totalKg = manualEmissions + automatedEmissions;
    return totalKg / 1000; // Convert back to tonnes for display
  };

  const totalCO2e = calculateTotalCO2e();
  const waterUsage = dashboardMetrics?.waterUsage || 11700000; // 11.7M litres (same as dashboard)
  const wasteGenerated = dashboardMetrics?.wasteGenerated || 0.1;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="text-center p-4 bg-green-50 rounded-lg">
        <div className="text-2xl font-bold text-green-700">{totalCO2e.toLocaleString()}</div>
        <div className="text-sm text-gray-600">tonnes CO₂e</div>
      </div>
      <div className="text-center p-4 bg-blue-50 rounded-lg">
        <div className="text-2xl font-bold text-blue-700">{(waterUsage / 1000000).toFixed(1)}M</div>
        <div className="text-sm text-gray-600">litres water</div>
      </div>
      <div className="text-center p-4 bg-purple-50 rounded-lg">
        <div className="text-2xl font-bold text-purple-700">{wasteGenerated}</div>
        <div className="text-sm text-gray-600">tonnes waste</div>
      </div>
    </div>
  );
}

function InitiativesPreview() {
  const { data: initiatives } = useQuery({
    queryKey: ['/api/initiatives'],
  });

  return (
    <div className="space-y-3">
      {initiatives && initiatives.length > 0 ? (
        initiatives.map((initiative: any) => (
          <div key={initiative.id} className="p-3 border border-gray-200 rounded-lg">
            <h5 className="font-medium text-gray-900">{initiative.initiativeName}</h5>
            <p className="text-sm text-gray-600 mt-1">{initiative.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2 py-1 text-xs rounded-full ${
                initiative.status === 'active' ? 'bg-green-100 text-green-700' :
                initiative.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {initiative.status}
              </span>
              {initiative.strategicPillar && (
                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                  {initiative.strategicPillar}
                </span>
              )}
            </div>
          </div>
        ))
      ) : (
        <p className="text-gray-500 italic">No initiatives found. Create some in the Initiatives section.</p>
      )}
    </div>
  );
}

function CarbonFootprintPreview() {
  const { data: footprintData } = useQuery({
    queryKey: ['/api/company/footprint'],
  });

  const { data: automatedData } = useQuery({
    queryKey: ['/api/company/footprint/scope3/automated'],
  });

  if (!footprintData?.data && !automatedData?.data) {
    return (
      <div className="text-center py-6 text-gray-500">
        <p>No footprint data available. Complete the Carbon Footprint Calculator to see detailed analysis.</p>
      </div>
    );
  }

  // Group manual data by scope
  const scope1Data = footprintData?.data?.filter((item: any) => item.scope === 1) || [];
  const scope2Data = footprintData?.data?.filter((item: any) => item.scope === 2) || [];
  
  // Calculate totals
  const scope1Total = scope1Data.reduce((sum: number, item: any) => sum + parseFloat(item.calculatedEmissions || 0), 0);
  const scope2Total = scope2Data.reduce((sum: number, item: any) => sum + parseFloat(item.calculatedEmissions || 0), 0);
  const scope3Total = (automatedData?.data?.totalEmissions || 0) * 1000; // Convert tonnes to kg

  const totalEmissions = scope1Total + scope2Total + scope3Total;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-red-50 rounded-lg border">
          <div className="text-xl font-bold text-red-700">{(scope1Total / 1000).toFixed(1)}</div>
          <div className="text-sm text-gray-600">Scope 1 (tonnes CO₂e)</div>
          <div className="text-xs text-gray-500 mt-1">Direct emissions</div>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg border">
          <div className="text-xl font-bold text-orange-700">{(scope2Total / 1000).toFixed(1)}</div>
          <div className="text-sm text-gray-600">Scope 2 (tonnes CO₂e)</div>
          <div className="text-xs text-gray-500 mt-1">Energy emissions</div>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-lg border">
          <div className="text-xl font-bold text-blue-700">{(scope3Total / 1000).toFixed(1)}</div>
          <div className="text-sm text-gray-600">Scope 3 (tonnes CO₂e)</div>
          <div className="text-xs text-gray-500 mt-1">Value chain emissions</div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="space-y-4">
        {scope1Data.length > 0 && (
          <div>
            <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              Scope 1: Direct Emissions
            </h4>
            <div className="space-y-2">
              {scope1Data.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{item.dataType.replace(/_/g, ' ').toUpperCase()}</div>
                    <div className="text-sm text-gray-600">{item.value} {item.unit}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{(parseFloat(item.calculatedEmissions) / 1000).toFixed(2)} t CO₂e</div>
                    <div className="text-sm text-gray-500">Factor: {item.emissionsFactor}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {scope2Data.length > 0 && (
          <div>
            <h4 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              Scope 2: Energy Emissions
            </h4>
            <div className="space-y-2">
              {scope2Data.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{item.dataType.replace(/_/g, ' ').toUpperCase()}</div>
                    <div className="text-sm text-gray-600">{item.value} {item.unit}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{(parseFloat(item.calculatedEmissions) / 1000).toFixed(2)} t CO₂e</div>
                    <div className="text-sm text-gray-500">Factor: {item.emissionsFactor}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {automatedData?.data && (
          <div>
            <h4 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              Scope 3: Value Chain Emissions
            </h4>
            <div className="p-3 bg-gray-50 rounded">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">PURCHASED GOODS & SERVICES</div>
                  <div className="text-sm text-gray-600">Automated product-based calculations</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{automatedData.data.totalEmissions.toFixed(1)} t CO₂e</div>
                  <div className="text-sm text-gray-500">From {automatedData.data.productCount} products</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Total Summary */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
          <div className="font-semibold text-lg">Total Carbon Footprint</div>
          <div className="text-2xl font-bold text-green-700">{(totalEmissions / 1000).toFixed(1)} tonnes CO₂e</div>
        </div>
      </div>
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState('builder');

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

  // Render preview for each block type
  const renderBlockPreview = (blockType: string) => {
    switch (blockType) {
      case 'company_story':
        return <CompanyStoryPreview />;
      case 'metrics_summary':
        return <MetricsSummaryPreview />;
      case 'initiatives':
        return <InitiativesPreview />;
      case 'carbon_footprint':
        return <CarbonFootprintPreview />;
      case 'water_usage':
        return (
          <div className="space-y-3">
            <p className="text-gray-700">Water footprint analysis showing consumption patterns and conservation efforts.</p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-700">Water usage data will be displayed with charts and trends.</p>
            </div>
          </div>
        );
      case 'kpi_progress':
        return (
          <div className="space-y-3">
            <p className="text-gray-700">Key Performance Indicators tracking progress toward sustainability goals.</p>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-700">KPI data and progress charts will be shown here.</p>
            </div>
          </div>
        );
      case 'custom_text':
        return (
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700">Your custom text content will appear here. Use the settings to edit this content.</p>
          </div>
        );
      default:
        return (
          <div className="bg-gray-50 p-3 rounded">
            <em className="text-gray-600">Preview for {blockType} will be implemented soon.</em>
          </div>
        );
    }
  };

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
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Report Builder" subtitle="Loading report templates..." />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
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
        <Header title="Dynamic Report Builder" subtitle="Create customized sustainability reports with drag-and-drop content blocks" />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="container mx-auto max-w-7xl">
      <div className="flex items-center justify-between mb-8">
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
          <Button variant="outline" onClick={() => setActiveTab('preview')}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
                  <div key={block.id} className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      {getBlockIcon(block.type)}
                      <h3 className="text-lg font-semibold text-gray-900">{block.title}</h3>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      {renderBlockPreview(block.type)}
                    </div>
                  </div>
                ))}
              {currentTemplate.blocks.filter(block => block.isVisible).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No visible blocks in this report template.</p>
                  <p className="text-sm">Add blocks in the Report Builder tab to see a preview.</p>
                </div>
              )}
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
        </main>
      </div>
    </div>
  );
}