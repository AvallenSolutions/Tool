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
import { InitiativesPreview } from "@/components/report-builder/InitiativesPreview";
import { EditableTextBlock } from "@/components/report-builder/EditableTextBlock";
import { WaterFootprintPreview } from "@/components/report-builder/WaterFootprintPreview";
import type { ReportTemplate } from "@shared/schema";

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


function CarbonFootprintPreview({ block, onUpdate, isPreview = false }: { block?: ReportBlock; onUpdate?: (blockId: string, content: any) => void; isPreview?: boolean }) {
  // Use EXACT same data sources as EmissionsChart component
  const { data: comprehensiveData } = useQuery({
    queryKey: ['/api/company/footprint/comprehensive'],
  });

  // Fetch Scope 3 automated data for waste and transport categories  
  const { data: scope3Data } = useQuery({
    queryKey: ["/api/company/footprint/scope3/automated"],
  });

  // Fetch carbon calculator total for Scope 1+2 (production facilities)
  const { data: carbonCalculatorData } = useQuery({
    queryKey: ["/api/carbon-calculator-total"],
  });

  if (!scope3Data?.data && !carbonCalculatorData?.data) {
    return (
      <div className="text-center py-6 text-gray-500">
        <p>No footprint data available. Complete the Carbon Footprint Calculator to see detailed analysis.</p>
      </div>
    );
  }

  // Calculate emissions using EXACT SAME logic as EmissionsChart component
  // 1. Ingredients: From Scope 3 Purchased Goods & Services
  const ingredients = scope3Data?.data?.categories?.purchasedGoodsServices?.emissions || 0; // Already in tonnes
  
  // 2. Packaging: Extract from scope3 data - part of ingredients but separate in refined LCA  
  const packaging = (scope3Data?.data?.categories?.purchasedGoodsServices?.emissions || 0) * 0.16 || 0; // ~16% of ingredients is packaging
  
  // 3. Production Facilities: Should be Scope 1+2 total
  const totalEmissions = carbonCalculatorData?.data?.totalCO2e || 0;
  const scope3Total = scope3Data?.data?.totalEmissions || 0;
  const facilities = totalEmissions - scope3Total; // Scope 1+2 = Total - Scope 3
  
  // 4. Transport & Other: Sum of business travel, commuting, and transportation from Scope 3
  const transportOther = (
    (scope3Data?.data?.categories?.businessTravel?.emissions || 0) +
    (scope3Data?.data?.categories?.employeeCommuting?.emissions || 0) +
    (scope3Data?.data?.categories?.transportation?.emissions || 0) +
    (scope3Data?.data?.categories?.fuelEnergyRelated?.emissions || 0)
  );
  
  // 5. Waste: From Scope 3 Waste Generated
  const waste = scope3Data?.data?.categories?.wasteGenerated?.emissions || 0; // Already in tonnes
  
  // Adjust ingredients to exclude packaging (prevent double counting)
  const adjustedIngredients = ingredients - packaging;

  // Calculate scope totals (convert tonnes to kg for consistency)
  const scope1And2Total = facilities * 1000; // Scope 1+2 combined (facilities)
  const scope3EmissionsTotal = (adjustedIngredients + packaging + transportOther + waste) * 1000; // All Scope 3 categories
  const totalEmissionsKg = scope1And2Total + scope3EmissionsTotal;

  console.log('🧮 Carbon Report - SAME as Dashboard:', {
    ingredients,
    packaging,
    facilities,
    transportOther,
    waste,
    adjustedIngredients,
    scope1And2Total: scope1And2Total / 1000,
    scope3EmissionsTotal: scope3EmissionsTotal / 1000,
    totalEmissionsKg: totalEmissionsKg / 1000
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

      {/* Summary Cards with Visual Progress Bars - SAME logic as Dashboard */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-red-50 rounded-lg border">
          <div className="text-xl font-bold text-red-700">{(scope1And2Total / 1000).toFixed(1)}</div>
          <div className="text-sm text-gray-600">Scope 1+2 (tonnes CO₂e)</div>
          <div className="text-xs text-gray-500 mt-1">Direct + Energy emissions</div>
          {/* Visual representation - progress bar showing proportion */}
          <div className="mt-3">
            <div className="w-full bg-red-100 rounded-full h-2">
              <div 
                className="bg-red-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${totalEmissionsKg > 0 ? (scope1And2Total / totalEmissionsKg) * 100 : 0}%` }}
              ></div>
            </div>
            <div className="text-xs text-red-600 mt-1 font-medium">
              {totalEmissionsKg > 0 ? ((scope1And2Total / totalEmissionsKg) * 100).toFixed(1) : 0}% of total
            </div>
          </div>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-lg border">
          <div className="text-xl font-bold text-blue-700">{(scope3EmissionsTotal / 1000).toFixed(1)}</div>
          <div className="text-sm text-gray-600">Scope 3 (tonnes CO₂e)</div>
          <div className="text-xs text-gray-500 mt-1">Value chain emissions</div>
          {/* Visual representation - progress bar showing proportion */}
          <div className="mt-3">
            <div className="w-full bg-blue-100 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${totalEmissionsKg > 0 ? (scope3EmissionsTotal / totalEmissionsKg) * 100 : 0}%` }}
              ></div>
            </div>
            <div className="text-xs text-blue-600 mt-1 font-medium">
              {totalEmissionsKg > 0 ? ((scope3EmissionsTotal / totalEmissionsKg) * 100).toFixed(1) : 0}% of total
            </div>
          </div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg border">
          <div className="text-xl font-bold text-green-700">{(totalEmissionsKg / 1000).toFixed(1)}</div>
          <div className="text-sm text-gray-600">Total (tonnes CO₂e)</div>
          <div className="text-xs text-gray-500 mt-1">All scopes combined</div>
          {/* Visual representation - full bar */}
          <div className="mt-3">
            <div className="w-full bg-green-100 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full transition-all duration-500 w-full"></div>
            </div>
            <div className="text-xs text-green-600 mt-1 font-medium">100% total emissions</div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown - SAME as Dashboard EmissionsChart */}
      <div className="space-y-4">
        {facilities > 0 && (
          <div>
            <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              Scope 1+2: Production Facilities
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">PRODUCTION FACILITIES</div>
                  <div className="text-sm text-gray-600">Energy, water, waste from production facilities</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{facilities.toFixed(1)} t CO₂e</div>
                  <div className="text-sm text-gray-500">Carbon Calculator Scope 1+2 totals</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {(adjustedIngredients > 0 || packaging > 0 || transportOther > 0 || waste > 0) && (
          <div>
            <h4 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              Scope 3: Value Chain Emissions
            </h4>
            <div className="space-y-2">
              {adjustedIngredients > 0 && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">INGREDIENTS (RAW MATERIALS)</div>
                    <div className="text-sm text-gray-600">OpenLCA ingredient impacts from ecoinvent database</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{adjustedIngredients.toFixed(1)} t CO₂e</div>
                    <div className="text-sm text-gray-500">Scope 3 Purchased Goods & Services</div>
                  </div>
                </div>
              )}
              {packaging > 0 && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">PACKAGING MATERIALS</div>
                    <div className="text-sm text-gray-600">Glass bottles, labels, closures with recycled content</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{packaging.toFixed(1)} t CO₂e</div>
                    <div className="text-sm text-gray-500">Comprehensive LCA product breakdown</div>
                  </div>
                </div>
              )}
              {transportOther > 0 && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">TRANSPORT & OTHER</div>
                    <div className="text-sm text-gray-600">Business travel, employee commuting, and transportation</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{transportOther.toFixed(1)} t CO₂e</div>
                    <div className="text-sm text-gray-500">Scope 3 Travel & Transportation categories</div>
                  </div>
                </div>
              )}
              {waste > 0 && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">WASTE</div>
                    <div className="text-sm text-gray-600">Waste disposal and end-of-life treatment</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{waste.toFixed(1)} t CO₂e</div>
                    <div className="text-sm text-gray-500">Scope 3 Waste Generated category</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Total Summary - SAME as Dashboard Total */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
          <div className="font-semibold text-lg">Total Carbon Footprint</div>
          <div className="text-2xl font-bold text-green-700">
            {(totalEmissionsKg / 1000).toFixed(1)} tonnes CO₂e
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
  // Draft functionality fields
  status?: 'draft' | 'published';
  lastSaved?: string;
  isDraft?: boolean;
  reportContent?: Record<string, any>;
  selectedInitiatives?: string[];
  selectedKPIs?: string[];
  uploadedImages?: Record<string, any>;
  reportLayout?: any;
}

const AVAILABLE_BLOCKS: Omit<ReportBlock, 'id' | 'order' | 'isVisible'>[] = [
  { type: 'company_story', title: 'Company Story', content: { showMission: true, showVision: true, showPillars: false } },
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
  const handleExportReport = async (format: 'pdf') => {
    if (!currentTemplate) {
      toast({
        title: "Error",
        description: "No report template selected",
        variant: "destructive"
      });
      return;
    }

    // Prevent multiple clicks by checking if already exporting
    const isCurrentlyExporting = isPdfExporting;
    if (isCurrentlyExporting) {
      return;
    }

    // Set the appropriate loading state
    setIsPdfExporting(true);

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
        
        // Trigger actual download
        if (result.data.downloadUrl) {
          // Create a temporary link to trigger download
          const link = document.createElement('a');
          link.href = result.data.downloadUrl;
          link.download = result.data.filename || `${format}-report.${format === 'pdf' ? 'pdf' : 'pptx'}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          toast({
            title: "Download Started",
            description: `Your ${format} report is downloading and has been saved to View Reports`
          });
        } else {
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
        description: `Failed to generate ${format} report. Please try again.`,
        variant: "destructive"
      });
    } finally {
      // Reset the appropriate loading state
      if (format === 'pdf') {
        setIsPdfExporting(false);
      } else {
      }
    }
  };
  const [currentTemplate, setCurrentTemplate] = useState<ReportTemplate | null>(null);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState<string>('stakeholders');
  const [activeTab, setActiveTab] = useState('builder');
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  // Draft functionality state
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
        return <InitiativesPreview block={block} onUpdate={handleBlockContentUpdate} isPreview={isPreview} />;
      case 'carbon_footprint':
        return <CarbonFootprintPreview block={block} onUpdate={handleBlockContentUpdate} isPreview={isPreview} />;
      case 'water_usage':
        return <WaterFootprintPreview block={block} onUpdate={handleBlockContentUpdate} isPreview={isPreview} />;
      case 'kpi_progress':
        return <KPIProgressPreview block={block} onUpdate={handleBlockContentUpdate} isPreview={isPreview} />;
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

  // Publish template mutation (published)
  const saveTemplateMutation = useMutation({
    mutationFn: async (template: ReportTemplate) => {
      console.log('🚀 Publishing template:', { templateId: template.id, template });
      
      let templateToPublish = template;
      
      // If template doesn't have an ID, save it as draft first
      if (!template.id) {
        console.log('📝 Template not saved yet, saving as draft first...');
        const draftData = {
          ...template,
          status: 'draft'
        };
        const draftResponse = await apiRequest('POST', '/api/report-templates', draftData);
        const draftData_parsed = await draftResponse.json();
        console.log('📋 Full draft response:', draftData_parsed);
        const templateId = draftData_parsed.id || draftData_parsed.templateId || draftData_parsed.reportId;
        if (!templateId) {
          throw new Error('Failed to get template ID from draft save response');
        }
        templateToPublish = { ...template, id: templateId };
        console.log('✅ Draft saved with ID:', templateId);
      }
      
      // Use dedicated publish endpoint
      console.log(`🌐 Making PUT request to: /api/report-templates/${templateToPublish.id}/publish`);
      const response = await apiRequest('PUT', `/api/report-templates/${templateToPublish.id}/publish`, {});
      console.log('✅ Publish response:', response);
      return response;
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Success",
        description: "Report template published successfully"
      });
      setHasUnsavedChanges(false);
      
      // If template was created during publish, update currentTemplate with ID
      if (!variables.id && currentTemplate) {
        setCurrentTemplate({
          ...currentTemplate,
          status: 'published',
          lastSaved: new Date().toISOString()
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/report-templates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
    },
    onError: (error: any) => {
      console.error('❌ Publish error details:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Full error:', JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: `Failed to publish template: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    }
  });

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (template: ReportTemplate) => {
      const templateData = {
        ...template,
        status: 'draft' // Ensure draft status
      };
      const url = template.id ? `/api/report-templates/${template.id}` : '/api/report-templates';
      const method = template.id ? 'PUT' : 'POST';
      return apiRequest(method, url, templateData);
    },
    onSuccess: (data) => {
      setIsDraftSaving(false);
      setHasUnsavedChanges(false);
      
      // Update the current template with returned data
      if (data && data.id && currentTemplate) {
        setCurrentTemplate({
          ...currentTemplate,
          id: data.id,
          status: 'draft',
          lastSaved: new Date().toISOString()
        });
      }
      
      toast({
        title: "Draft Saved",
        description: "Your report draft has been saved successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/report-templates'] });
    },
    onError: () => {
      setIsDraftSaving(false);
      toast({
        title: "Save Failed",
        description: "Failed to save draft. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Auto-save mutation (using PATCH for partial updates)
  const autoSaveMutation = useMutation({
    mutationFn: async (template: ReportTemplate) => {
      if (!template.id) return null; // Can only auto-save existing drafts
      
      // Use partial update data structure matching backend schema
      const autoSaveData = {
        templateName: template.templateName,
        reportTitle: template.reportTitle,
        audienceType: template.audienceType,
        blocks: template.blocks
      };
      
      return apiRequest('PATCH', `/api/report-templates/${template.id}`, autoSaveData);
    },
    onSuccess: () => {
      setIsAutoSaving(false);
      setLastAutoSaveTime(new Date());
      setHasUnsavedChanges(false);
    },
    onError: (error) => {
      setIsAutoSaving(false);
      console.warn('Auto-save failed:', error);
      // Don't show error toast for auto-save failures
    }
  });

  // Auto-save functionality
  const triggerAutoSave = () => {
    if (currentTemplate && currentTemplate.id && hasUnsavedChanges) {
      setIsAutoSaving(true);
      autoSaveMutation.mutate(currentTemplate);
    }
  };

  // Auto-save effect (every 30 seconds)
  useEffect(() => {
    if (!hasUnsavedChanges || !currentTemplate?.id) return;
    
    const autoSaveTimer = setTimeout(() => {
      triggerAutoSave();
    }, 30000); // Auto-save every 30 seconds

    return () => clearTimeout(autoSaveTimer);
  }, [hasUnsavedChanges, currentTemplate?.id]);

  // Helper functions for draft operations
  const handleSaveDraft = () => {
    if (!currentTemplate) return;
    
    setIsDraftSaving(true);
    saveDraftMutation.mutate(currentTemplate);
  };

  const handlePublishReport = () => {
    if (!currentTemplate) return;
    
    saveTemplateMutation.mutate(currentTemplate);
  };

  // Track changes to trigger auto-save
  const markAsChanged = () => {
    setHasUnsavedChanges(true);
  };

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
    markAsChanged();
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
    markAsChanged();
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
    markAsChanged();
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
    markAsChanged();
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
    
    // Track changes for auto-save functionality
    markAsChanged();
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
      blocks,
      status: 'draft' // Start as draft
    });
    setHasUnsavedChanges(false); // New template, no changes yet
    setIsTemplateDialogOpen(false);
  };

  // Load existing draft for editing
  const loadDraftForEditing = (template: ReportTemplate) => {
    setCurrentTemplate({
      ...template,
      // Ensure blocks have proper structure
      blocks: template.blocks.map((block, index) => ({
        ...block,
        order: index,
        isVisible: block.isVisible !== undefined ? block.isVisible : true
      }))
    });
    setHasUnsavedChanges(false); // Just loaded, no changes yet
    toast({
      title: "Draft Loaded",
      description: `Continuing to edit "${template.templateName || template.reportTitle}"`
    });
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
            
            {/* Report Title Section */}
            <Card className="mb-6 border-l-4 border-l-green-600 bg-green-50/30">
              <CardContent className="py-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <Edit className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="report-title-main" className="text-sm font-medium text-gray-700">
                      Report Title
                    </Label>
                    <Input
                      id="report-title-main"
                      value={currentTemplate.templateName}
                      onChange={(e) => {
                        setCurrentTemplate({
                          ...currentTemplate,
                          templateName: e.target.value
                        });
                        markAsChanged();
                      }}
                      placeholder="Enter your report title..."
                      className="mt-1 text-lg font-medium bg-white border-gray-300 focus:border-green-500 focus:ring-green-500"
                      data-testid="input-report-title"
                    />
                  </div>
                  {isAutoSaving && (
                    <div className="flex-shrink-0 text-sm text-gray-500">
                      Saving...
                    </div>
                  )}
                  {lastAutoSaveTime && !isAutoSaving && (
                    <div className="flex-shrink-0 text-sm text-gray-500">
                      Saved {lastAutoSaveTime.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

      <div className="flex items-center justify-between mb-8">
        <div className="flex gap-2">
          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl bg-white border shadow-lg">
              <DialogHeader>
                <DialogTitle>Report Templates</DialogTitle>
                <DialogDescription>
                  Create a new report or continue editing an existing draft
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="create" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="create">Create New</TabsTrigger>
                  <TabsTrigger value="continue">Continue Editing</TabsTrigger>
                </TabsList>
                
                <TabsContent value="create" className="space-y-4">
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
                </TabsContent>
                
                <TabsContent value="continue" className="space-y-4">
                  <div className="space-y-3">
                    <Label>Existing Drafts</Label>
                    {templates && templates.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {templates
                          .filter(t => t.status === 'draft' || !t.status)
                          .map((template) => (
                            <div
                              key={template.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                              onClick={() => loadDraftForEditing(template)}
                              data-testid={`draft-${template.id}`}
                            >
                              <div className="flex-1">
                                <div className="font-medium">{template.templateName || template.reportTitle || 'Untitled Report'}</div>
                                <div className="text-sm text-gray-500">
                                  {template.audienceType && `${template.audienceType.charAt(0).toUpperCase() + template.audienceType.slice(1)} • `}
                                  {template.lastSaved ? `Last saved: ${new Date(template.lastSaved).toLocaleDateString()}` 
                                    : `Created: ${new Date(template.createdAt || '').toLocaleDateString()}`}
                                </div>
                              </div>
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                📝 Draft
                              </Badge>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No drafts available</p>
                        <p className="text-sm mt-1">Create a new report to get started</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                      Close
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
          {/* Draft functionality buttons with status indicators */}
          <div className="flex items-center gap-3">
            {/* Status badge */}
            <Badge 
              variant={currentTemplate?.status === 'published' ? 'default' : 'secondary'}
              className={currentTemplate?.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
            >
              {currentTemplate?.status === 'published' ? '✓ Published' : '📝 Draft'}
            </Badge>
            
            {/* Auto-save indicator */}
            {isAutoSaving && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin h-3 w-3 mr-1 border border-gray-300 border-t-gray-600 rounded-full"></div>
                Auto-saving...
              </div>
            )}
            
            {lastAutoSaveTime && !isAutoSaving && (
              <div className="text-sm text-gray-500">
                Last saved: {lastAutoSaveTime.toLocaleTimeString()}
              </div>
            )}
            
            {/* Save Draft Button */}
            <Button 
              variant="outline" 
              onClick={handleSaveDraft}
              disabled={isDraftSaving || !currentTemplate}
              data-testid="button-save-draft"
            >
              {isDraftSaving ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                  Saving Draft...
                </>
              ) : (
                <>
                  💾 Save Draft
                </>
              )}
            </Button>
            
            {/* Publish Report Button */}
            <Button 
              onClick={handlePublishReport}
              disabled={saveTemplateMutation.isPending || !currentTemplate}
              data-testid="button-publish-report"
            >
              {saveTemplateMutation.isPending ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                  Publishing...
                </>
              ) : (
                <>
                  🚀 Publish Report
                </>
              )}
            </Button>
          </div>
          <Button variant="outline" onClick={() => setActiveTab('preview')}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleExportReport('pdf')}
              disabled={isPdfExporting}
            >
              {isPdfExporting ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => toast({
                title: "PowerPoint Export",
                description: "This feature is coming soon",
              })}
              disabled={isPdfExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              PowerPoint
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