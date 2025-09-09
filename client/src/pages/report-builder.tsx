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
import { GripVertical, Plus, Eye, Download, Settings, BarChart3, FileText, Users, Leaf, Target, Sparkles, Edit } from 'lucide-react';
import AIWritingAssistant from '@/components/ai-writing-assistant';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { KPIProgressPreview } from "@/components/report-builder/KPIProgressPreview";
import { EditableTextBlock } from "@/components/report-builder/EditableTextBlock";

// Preview components for each block type
function CompanyStoryPreview({ block, onUpdate, isPreview = false }: { block?: ReportBlock; onUpdate?: (blockId: string, content: any) => void; isPreview?: boolean }) {
  const { data: companyStory } = useQuery({
    queryKey: ['/api/company/story'],
  });

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
          <h4 className="font-semibold text-blue-700 mb-2">📝 Add Your Introduction</h4>
          <EditableTextBlock
            block={{
              id: `${block.id}_intro`,
              content: {
                text: block.content?.customText?.introduction || 'Add an introduction to your company story...',
                formatting: { fontSize: 'medium', alignment: 'left', style: 'normal' }
              }
            }}
            onUpdate={(_, content) => updateCustomText('introduction', content.text)}
            isPreview={false}
          />
        </div>
      )}
      
      {/* Platform Data */}
      {companyStory?.missionStatement && (
        <div>
          <h4 className="font-semibold text-green-700 mb-2">Mission Statement</h4>
          <p className="text-gray-700">{companyStory.missionStatement}</p>
          
          {/* Mission Context */}
          {block && onUpdate && !isPreview && (
            <div className="mt-3 bg-green-50 p-3 rounded border border-green-200">
              <h5 className="font-medium text-green-700 mb-2">📝 Add Context</h5>
              <EditableTextBlock
                block={{
                  id: `${block.id}_mission`,
                  content: {
                    text: block.content?.customText?.missionContext || 'Add context about your mission...',
                    formatting: { fontSize: 'small', alignment: 'left', style: 'normal' }
                  }
                }}
                onUpdate={(_, content) => updateCustomText('missionContext', content.text)}
                isPreview={false}
              />
            </div>
          )}
        </div>
      )}
      
      {companyStory?.visionStatement && (
        <div>
          <h4 className="font-semibold text-green-700 mb-2">Vision Statement</h4>
          <p className="text-gray-700">{companyStory.visionStatement}</p>
          
          {/* Vision Context */}
          {block && onUpdate && !isPreview && (
            <div className="mt-3 bg-green-50 p-3 rounded border border-green-200">
              <h5 className="font-medium text-green-700 mb-2">📝 Add Context</h5>
              <EditableTextBlock
                block={{
                  id: `${block.id}_vision`,
                  content: {
                    text: block.content?.customText?.visionContext || 'Add context about your vision...',
                    formatting: { fontSize: 'small', alignment: 'left', style: 'normal' }
                  }
                }}
                onUpdate={(_, content) => updateCustomText('visionContext', content.text)}
                isPreview={false}
              />
            </div>
          )}
        </div>
      )}
      

      {/* Conclusion Section */}
      {block && onUpdate && !isPreview && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-700 mb-2">📝 Add Your Conclusion</h4>
          <EditableTextBlock
            block={{
              id: `${block.id}_conclusion`,
              content: {
                text: block.content?.customText?.conclusion || 'Add a conclusion to your company story...',
                formatting: { fontSize: 'medium', alignment: 'left', style: 'normal' }
              }
            }}
            onUpdate={(_, content) => updateCustomText('conclusion', content.text)}
            isPreview={false}
          />
        </div>
      )}
    </div>
  );
}

function MetricsSummaryPreview({ block, onUpdate, isPreview = false }: { block?: ReportBlock; onUpdate?: (blockId: string, content: any) => void; isPreview?: boolean }) {
  // Use EXACTLY the same queries as the dashboard metrics cards
  const { data: metrics } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    retry: false,
  });

  // Fetch comprehensive footprint data to match Carbon Footprint Calculator total exactly
  const { data: comprehensiveData } = useQuery({
    queryKey: ['/api/company/footprint/comprehensive'],
  });

  // Fetch the exact Carbon Footprint Calculator total via API endpoint
  const { data: carbonCalculatorTotal } = useQuery({
    queryKey: ['/api/carbon-calculator-total'],
  });

  // EXACT COPY of dashboard getCarbonCalculatorTotal function
  const getCarbonCalculatorTotal = () => {
    // Return the exact number from Carbon Footprint Calculator comprehensive endpoint
    if (carbonCalculatorTotal?.data?.totalCO2e) {
      return carbonCalculatorTotal.data.totalCO2e;
    }
    // Fallback: Use the comprehensive data directly (same source as Carbon Calculator)
    if (comprehensiveData?.data?.totalFootprint?.co2e_tonnes) {
      return comprehensiveData.data.totalFootprint.co2e_tonnes;
    }
    return (metrics?.totalCO2e || 0);
  };

  // Use EXACT same values as dashboard
  const totalCO2e = getCarbonCalculatorTotal();
  const waterUsage = metrics?.waterUsage || 11700000; // fallback to 11.7M litres
  const wasteGenerated = metrics?.wasteGenerated || 0.1; // fallback to 0.1 tonnes

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
      {/* Executive Summary */}
      {block && onUpdate && !isPreview && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-700 mb-2">📊 Executive Summary</h4>
          <EditableTextBlock
            block={{
              id: `${block.id}_summary`,
              content: {
                text: block.content?.customText?.executiveSummary || 'Add an executive summary of your environmental performance...',
                formatting: { fontSize: 'medium', alignment: 'left', style: 'normal' }
              }
            }}
            onUpdate={(_, content) => updateCustomText('executiveSummary', content.text)}
            isPreview={false}
          />
        </div>
      )}

      {/* Key Metrics - EXACT same formatting as dashboard */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-700">
            {totalCO2e.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </div>
          <div className="text-sm text-gray-600">tonnes CO₂e</div>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-700">
            {(waterUsage / 1000000).toFixed(1)}M
          </div>
          <div className="text-sm text-gray-600">litres water</div>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-700">{wasteGenerated.toFixed(1)}</div>
          <div className="text-sm text-gray-600">tonnes waste</div>
        </div>
      </div>

      {/* Data Analysis */}
      {block && onUpdate && !isPreview && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-700 mb-2">📈 Data Analysis</h4>
          <EditableTextBlock
            block={{
              id: `${block.id}_analysis`,
              content: {
                text: block.content?.customText?.dataAnalysis || 'Provide analysis and context for these metrics...',
                formatting: { fontSize: 'medium', alignment: 'left', style: 'normal' }
              }
            }}
            onUpdate={(_, content) => updateCustomText('dataAnalysis', content.text)}
            isPreview={false}
          />
        </div>
      )}

      {/* Key Insights */}
      {block && onUpdate && !isPreview && (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-yellow-700 mb-2">💡 Key Insights</h4>
          <EditableTextBlock
            block={{
              id: `${block.id}_insights`,
              content: {
                text: block.content?.customText?.keyInsights || 'Share key insights and takeaways from your environmental data...',
                formatting: { fontSize: 'medium', alignment: 'left', style: 'normal' }
              }
            }}
            onUpdate={(_, content) => updateCustomText('keyInsights', content.text)}
            isPreview={false}
          />
        </div>
      )}
    </div>
  );
}

function InitiativesPreview() {
  const { data: selectedGoals } = useQuery({
    queryKey: ['/api/smart-goals/selected'],
  });

  return (
    <div className="space-y-4">
      {selectedGoals && selectedGoals.length > 0 ? (
        selectedGoals.map((goal: any) => (
          <div key={goal.id} className="p-4 border border-gray-200 rounded-lg bg-white">
            <div className="flex items-start justify-between mb-2">
              <h5 className="font-semibold text-gray-900">{goal.title}</h5>
              <div className="flex gap-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  goal.priority === 'high' ? 'bg-red-100 text-red-700' :
                  goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {goal.priority} priority
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  goal.status === 'active' ? 'bg-green-100 text-green-700' :
                  goal.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {goal.status}
                </span>
              </div>
            </div>
            
            {goal.description && (
              <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
            )}
            
            {goal.narrative && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                <h6 className="font-medium text-blue-900 text-sm mb-1">Report Narrative</h6>
                <p className="text-sm text-blue-700">{goal.narrative}</p>
              </div>
            )}
            
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span>Category: {goal.category}</span>
              <span>Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-6 text-gray-500">
          <p>No sustainability initiatives selected yet.</p>
          <p className="text-sm mt-1">Select goals from the Initiatives page to include them in your report.</p>
        </div>
      )}
    </div>
  );
}

function CarbonFootprintPreview({ block, onUpdate, isPreview = false }: { block?: ReportBlock; onUpdate?: (blockId: string, content: any) => void; isPreview?: boolean }) {
  // Use EXACT same data sources as dashboard metrics
  const { data: comprehensiveData } = useQuery({
    queryKey: ['/api/company/footprint/comprehensive'],
  });

  // Fetch the exact Carbon Footprint Calculator total via API endpoint
  const { data: carbonCalculatorTotal } = useQuery({
    queryKey: ['/api/carbon-calculator-total'],
  });

  // Fetch automated Scope 1 data for facility emissions  
  const { data: automatedScope1Data } = useQuery({
    queryKey: ['/api/company/footprint/scope1/automated'],
  });

  if (!comprehensiveData?.data && !carbonCalculatorTotal?.data) {
    return (
      <div className="text-center py-6 text-gray-500">
        <p>No footprint data available. Complete the Carbon Footprint Calculator to see detailed analysis.</p>
      </div>
    );
  }

  // Calculate scope emissions using the SAME method as dashboard
  // Scope 1: Use automated scope 1 data
  const scope1Total = (automatedScope1Data?.data?.totalEmissions || 0) * 1000; // Convert tonnes to kg
  
  // Scope 2: Calculate from comprehensive facility data (electricity)
  const scope2Total = ((comprehensiveData?.data?.detailedBreakdown?.facilities || 0) - (automatedScope1Data?.data?.totalEmissions || 0) * 1000) || 0; // Subtract Scope 1 from facilities total
  
  // Scope 3: Use comprehensive breakdown
  const scope3Ingredients = comprehensiveData?.data?.detailedBreakdown?.ingredients || 0;
  const scope3Packaging = comprehensiveData?.data?.detailedBreakdown?.packaging || 0;
  const scope3Waste = comprehensiveData?.data?.detailedBreakdown?.waste || 0;
  const scope3Total = scope3Ingredients + scope3Packaging + scope3Waste;

  const totalEmissions = scope1Total + scope2Total + scope3Total;

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
      {/* Introduction */}
      {block && onUpdate && !isPreview && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-700 mb-2">🌍 Carbon Footprint Introduction</h4>
          <EditableTextBlock
            block={{
              id: `${block.id}_intro`,
              content: {
                text: block.content?.customText?.introduction || 'Introduce your carbon footprint analysis methodology and approach...',
                formatting: { fontSize: 'medium', alignment: 'left', style: 'normal' }
              }
            }}
            onUpdate={(_, content) => updateCustomText('introduction', content.text)}
            isPreview={false}
          />
        </div>
      )}

      {/* Summary Cards with Visual Progress Bars */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-red-50 rounded-lg border">
          <div className="text-xl font-bold text-red-700">{(scope1Total / 1000).toFixed(1)}</div>
          <div className="text-sm text-gray-600">Scope 1 (tonnes CO₂e)</div>
          <div className="text-xs text-gray-500 mt-1">Direct emissions</div>
          {/* Visual representation - progress bar showing proportion */}
          <div className="mt-3">
            <div className="w-full bg-red-100 rounded-full h-2">
              <div 
                className="bg-red-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${totalEmissions > 0 ? (scope1Total / totalEmissions) * 100 : 0}%` }}
              ></div>
            </div>
            <div className="text-xs text-red-600 mt-1 font-medium">
              {totalEmissions > 0 ? ((scope1Total / totalEmissions) * 100).toFixed(1) : 0}% of total
            </div>
          </div>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg border">
          <div className="text-xl font-bold text-orange-700">{(scope2Total / 1000).toFixed(1)}</div>
          <div className="text-sm text-gray-600">Scope 2 (tonnes CO₂e)</div>
          <div className="text-xs text-gray-500 mt-1">Energy emissions</div>
          {/* Visual representation - progress bar showing proportion */}
          <div className="mt-3">
            <div className="w-full bg-orange-100 rounded-full h-2">
              <div 
                className="bg-orange-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${totalEmissions > 0 ? (scope2Total / totalEmissions) * 100 : 0}%` }}
              ></div>
            </div>
            <div className="text-xs text-orange-600 mt-1 font-medium">
              {totalEmissions > 0 ? ((scope2Total / totalEmissions) * 100).toFixed(1) : 0}% of total
            </div>
          </div>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-lg border">
          <div className="text-xl font-bold text-blue-700">{(scope3Total / 1000).toFixed(1)}</div>
          <div className="text-sm text-gray-600">Scope 3 (tonnes CO₂e)</div>
          <div className="text-xs text-gray-500 mt-1">Value chain emissions</div>
          {/* Visual representation - progress bar showing proportion */}
          <div className="mt-3">
            <div className="w-full bg-blue-100 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${totalEmissions > 0 ? (scope3Total / totalEmissions) * 100 : 0}%` }}
              ></div>
            </div>
            <div className="text-xs text-blue-600 mt-1 font-medium">
              {totalEmissions > 0 ? ((scope3Total / totalEmissions) * 100).toFixed(1) : 0}% of total
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown - Using Carbon Calculator Data */}
      <div className="space-y-4">
        {automatedScope1Data?.data && (
          <div>
            <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              Scope 1: Direct Emissions
            </h4>
            <div className="space-y-2">
              {automatedScope1Data.data.naturalGasEmissions > 0 && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">NATURAL GAS</div>
                    <div className="text-sm text-gray-600">{automatedScope1Data.data.naturalGasVolume.toLocaleString()} m³</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{automatedScope1Data.data.naturalGasEmissions.toFixed(2)} t CO₂e</div>
                    <div className="text-sm text-gray-500">DEFRA 2024</div>
                  </div>
                </div>
              )}
              {automatedScope1Data.data.fuelEmissions > 0 && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">FUEL COMBUSTION</div>
                    <div className="text-sm text-gray-600">{automatedScope1Data.data.fuelVolume.toLocaleString()} L</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{automatedScope1Data.data.fuelEmissions.toFixed(2)} t CO₂e</div>
                    <div className="text-sm text-gray-500">DEFRA 2024</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {comprehensiveData?.data?.detailedBreakdown && scope2Total > 0 && (
          <div>
            <h4 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              Scope 2: Energy Emissions
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">ELECTRICITY</div>
                  <div className="text-sm text-gray-600">Grid electricity consumption</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{(scope2Total / 1000).toFixed(1)} t CO₂e</div>
                  <div className="text-sm text-gray-500">DEFRA 2024</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {comprehensiveData?.data?.detailedBreakdown && (
          <div>
            <h4 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              Scope 3: Value Chain Emissions
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">INGREDIENTS</div>
                  <div className="text-sm text-gray-600">Product recipe components</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{((comprehensiveData.data.detailedBreakdown.ingredients || 0) / 1000).toFixed(1)} t CO₂e</div>
                  <div className="text-sm text-gray-500">OpenLCA database</div>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">PACKAGING</div>
                  <div className="text-sm text-gray-600">Materials & production</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{((comprehensiveData.data.detailedBreakdown.packaging || 0) / 1000).toFixed(1)} t CO₂e</div>
                  <div className="text-sm text-gray-500">DEFRA 2024</div>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">WASTE</div>
                  <div className="text-sm text-gray-600">Production & end-of-life waste</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{((comprehensiveData.data.detailedBreakdown.waste || 0) / 1000).toFixed(1)} t CO₂e</div>
                  <div className="text-sm text-gray-500">Regional disposal rates</div>
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
          <div className="text-2xl font-bold text-green-700">
            {carbonCalculatorTotal?.data?.totalCO2e?.toFixed(1) || comprehensiveData?.data?.totalFootprint?.co2e_tonnes?.toFixed(1) || (totalEmissions / 1000).toFixed(1)} tonnes CO₂e
          </div>
        </div>
      </div>

      {/* Analysis Section */}
      {block && onUpdate && !isPreview && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-700 mb-2">📊 Carbon Footprint Analysis</h4>
          <EditableTextBlock
            block={{
              id: `${block.id}_analysis`,
              content: {
                text: block.content?.customText?.carbonAnalysis || 'Add your analysis of the carbon footprint results and trends...',
                formatting: { fontSize: 'medium', alignment: 'left', style: 'normal' }
              }
            }}
            onUpdate={(_, content) => updateCustomText('carbonAnalysis', content.text)}
            isPreview={false}
          />
        </div>
      )}
    </div>
  );
}

interface ReportBlock {
  id: string;
  type: 'company_story' | 'metrics_summary' | 'initiatives' | 'kpi_progress' | 'carbon_footprint' | 'water_usage' | 'custom_text' | 'editable_text';
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
  { type: 'custom_text', title: 'Custom Text Block', content: { text: 'Add your custom content here...' } },
  { type: 'editable_text', title: 'Rich Text Block', content: { text: 'Click to edit this text...', formatting: { fontSize: 'medium', alignment: 'left', style: 'normal' } } }
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
  
  // Export report using new Report Builder API
  const handleExportReport = async (format: 'pdf' | 'powerpoint' | 'web') => {
    if (!currentTemplate) {
      toast({
        title: "Error",
        description: "No report template selected",
        variant: "destructive"
      });
      return;
    }

    try {
      const exportData = {
        reportType: 'sustainability',
        exportFormat: format,
        templateOptions: {
          includeMetrics: true,
          includeCharts: true,
          customTitle: currentTemplate.templateName
        },
        dataSelections: {
          timeRange: {
            startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString()
          }
        },
        blocks: currentTemplate.blocks
      };

      const response = await fetch('/api/report/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData)
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Export Successful",
          description: `Your ${format} report has been generated successfully`
        });
        
        if (format === 'web' && result.data.html) {
          // Open web report in new tab
          const newWindow = window.open('', '_blank');
          if (newWindow) {
            newWindow.document.write(result.data.html);
            newWindow.document.close();
          }
        } else {
          // Handle PDF/PowerPoint download (placeholder for now)
          console.log('Download URL:', result.data.downloadUrl);
          toast({
            title: "Download Ready",
            description: `Your ${format} report is ready for download`
          });
        }
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    }
  };
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
  const renderBlockPreview = (block: ReportBlock, isPreview: boolean = false) => {
    const blockType = block.type;
    switch (blockType) {
      case 'company_story':
        return <CompanyStoryPreview block={block} onUpdate={handleBlockContentUpdate} isPreview={isPreview} />;
      case 'metrics_summary':
        return <MetricsSummaryPreview block={block} onUpdate={handleBlockContentUpdate} isPreview={isPreview} />;
      case 'initiatives':
        return <InitiativesPreview />;
      case 'carbon_footprint':
        return <CarbonFootprintPreview block={block} onUpdate={handleBlockContentUpdate} isPreview={isPreview} />;
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
        return <KPIProgressPreview />;
      case 'custom_text':
        return (
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700">Your custom text content will appear here. Use the settings to edit this content.</p>
          </div>
        );
      case 'editable_text':
        return (
          <EditableTextBlock
            block={block}
            onUpdate={handleBlockContentUpdate}
            isPreview={true}
          />
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

  const handleBlockContentUpdate = (blockId: string, updatedContent: any) => {
    if (!currentTemplate) return;

    const updatedBlocks = currentTemplate.blocks.map(block =>
      block.id === blockId ? { ...block, content: updatedContent } : block
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
      case 'editable_text': return <Edit className="h-4 w-4" />;
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleExportReport('pdf')}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" onClick={() => handleExportReport('powerpoint')}>
              <Download className="h-4 w-4 mr-2" />
              PowerPoint
            </Button>
            <Button variant="outline" onClick={() => handleExportReport('web')}>
              <Eye className="h-4 w-4 mr-2" />
              Web Preview
            </Button>
          </div>
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
                                className={`p-6 bg-white border rounded-lg ${
                                  snapshot.isDragging ? 'shadow-lg bg-white' : ''
                                } ${!block.isVisible ? 'opacity-50' : ''}`}
                              >
                                {/* Block Header */}
                                <div className="flex items-center justify-between mb-4">
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
                                
                                {/* Block Content with Embedded Text Editing */}
                                <div className="prose prose-sm max-w-none">
                                  {renderBlockPreview(block, false)}
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
                      {renderBlockPreview(block, true)}
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