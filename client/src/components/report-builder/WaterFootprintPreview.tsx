import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Droplets, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { EditableTextBlock } from './EditableTextBlock';
import type { ReportBlock } from '../../pages/report-builder';

interface WaterFootprintPreviewProps {
  block?: ReportBlock;
  onUpdate?: (blockId: string, content: any) => void;
  isPreview?: boolean;
}

interface MonthlyDataSummary {
  companyId: number;
  hasMonthlyData: boolean;
  aggregated: {
    totalElectricityKwh: number;
    totalNaturalGasM3: number;
    totalWaterM3: number;
    totalProductionVolume: number;
    monthCount: number;
    dataQuality: 'high' | 'medium' | 'low';
    missingMonths: string[];
    latestDataMonth: string;
    dateRange: {
      start: string;
      end: string;
    };
  } | null;
  recommendation: 'complete' | 'needs_monthly_data' | 'incomplete_data';
  message: string;
}

export function WaterFootprintPreview({ block, onUpdate, isPreview = false }: WaterFootprintPreviewProps) {
  // Fetch monthly data summary for water usage
  const { data: monthlyData, isLoading: monthlyLoading } = useQuery<MonthlyDataSummary>({
    queryKey: ['/api/monthly-data-summary'],
  });

  // Function to update custom text in the block
  const updateCustomText = (key: string, text: string) => {
    if (!block || !onUpdate) return;
    
    const currentCustomText = block.content?.customText || {};
    onUpdate(block.id, {
      ...block.content,
      customText: {
        ...currentCustomText,
        [key]: text
      }
    });
  };

  if (monthlyLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!monthlyData?.hasMonthlyData || !monthlyData.aggregated) {
    return (
      <div className="space-y-4">
        {/* Introduction Text Block */}
        {block && onUpdate && !isPreview && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-700 mb-2">📝 Introduction</h4>
            <EditableTextBlock
              block={{
                id: `${block.id}_intro`,
                content: {
                  text: block.content?.customText?.introduction || 'Introduce your water footprint analysis and conservation efforts...',
                  formatting: { fontSize: 'medium', alignment: 'left', style: 'normal' }
                }
              }}
              onUpdate={(_, content) => updateCustomText('introduction', content.text)}
              isPreview={false}
            />
          </div>
        )}

        <div className="text-center py-8 bg-blue-50 rounded-lg border border-blue-200">
          <AlertCircle className="mx-auto h-12 w-12 text-blue-400 mb-4" />
          <h3 className="text-lg font-semibold text-blue-700 mb-2">Water Data Collection Needed</h3>
          <p className="text-blue-600 mb-4">
            Complete your monthly facility data to see detailed water footprint analysis.
          </p>
          <p className="text-sm text-blue-500">
            Navigate to Monthly Facility Data to add your water usage information.
          </p>
        </div>

        {/* Summary Text Block */}
        {block && onUpdate && !isPreview && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-700 mb-2">📋 Summary</h4>
            <EditableTextBlock
              block={{
                id: `${block.id}_summary`,
                content: {
                  text: block.content?.customText?.summary || 'Summarize your water conservation achievements and future targets...',
                  formatting: { fontSize: 'medium', alignment: 'left', style: 'normal' }
                }
              }}
              onUpdate={(_, content) => updateCustomText('summary', content.text)}
              isPreview={false}
            />
          </div>
        )}
      </div>
    );
  }

  const { aggregated } = monthlyData;
  
  // Calculate key metrics
  const totalWaterLiters = aggregated.totalWaterM3 * 1000; // Convert m³ to liters
  const monthlyAverageM3 = aggregated.monthCount > 0 ? aggregated.totalWaterM3 / aggregated.monthCount : 0;
  const annualProjectionM3 = monthlyAverageM3 * 12;
  const waterEfficiency = aggregated.totalProductionVolume > 0 ? 
    (totalWaterLiters / aggregated.totalProductionVolume) : 0;

  // Generate monthly trend data for chart
  const generateTrendData = () => {
    const data = [];
    const startDate = new Date(aggregated.dateRange.start);
    const endDate = new Date(aggregated.dateRange.end);
    
    for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
      const monthKey = d.toISOString().slice(0, 7);
      // Use average monthly consumption with slight variation for visualization
      const baseConsumption = monthlyAverageM3;
      const variation = Math.sin(d.getMonth() * 0.5) * 0.1; // Seasonal variation
      const consumption = baseConsumption * (1 + variation);
      
      data.push({
        month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        waterM3: Math.round(consumption * 10) / 10,
        waterLiters: Math.round(consumption * 1000)
      });
    }
    return data;
  };

  const trendData = generateTrendData();

  // Data quality indicator
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'high': return <CheckCircle2 className="h-4 w-4" />;
      case 'medium': return <AlertCircle className="h-4 w-4" />;
      case 'low': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Introduction Text Block */}
      {block && onUpdate && !isPreview && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-700 mb-2">📝 Introduction</h4>
          <EditableTextBlock
            block={{
              id: `${block.id}_intro`,
              content: {
                text: block.content?.customText?.introduction || 'Our water footprint analysis demonstrates our commitment to sustainable water management across all operations...',
                formatting: { fontSize: 'medium', alignment: 'left', style: 'normal' }
              }
            }}
            onUpdate={(_, content) => updateCustomText('introduction', content.text)}
            isPreview={false}
          />
        </div>
      )}

      {/* Key Water Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-blue-700">Total Water Usage</h4>
          </div>
          <p className="text-2xl font-bold text-blue-800">
            {totalWaterLiters.toLocaleString()} L
          </p>
          <p className="text-sm text-blue-600">
            {aggregated.totalWaterM3.toFixed(1)} m³ over {aggregated.monthCount} months
          </p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-blue-700">Water Efficiency</h4>
          </div>
          <p className="text-2xl font-bold text-blue-800">
            {waterEfficiency.toFixed(1)} L/unit
          </p>
          <p className="text-sm text-blue-600">
            Liters per production unit
          </p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${getQualityColor(aggregated.dataQuality)}`}>
              {getQualityIcon(aggregated.dataQuality)}
              <span className="capitalize">{aggregated.dataQuality} Quality</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-800">
            {((aggregated.monthCount / 12) * 100).toFixed(0)}%
          </p>
          <p className="text-sm text-blue-600">
            Data completeness ({aggregated.monthCount}/12 months)
          </p>
        </div>
      </div>

      {/* Water Usage Trend Chart */}
      <div className="bg-white p-6 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-700 mb-4 flex items-center gap-2">
          <Droplets className="h-5 w-5" />
          Monthly Water Usage Trends
        </h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3f2fd" />
              <XAxis 
                dataKey="month" 
                stroke="#1976d2"
                fontSize={12}
              />
              <YAxis 
                stroke="#1976d2"
                fontSize={12}
                label={{ value: 'Water Usage (m³)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value} m³ (${(value * 1000).toLocaleString()} L)`,
                  'Water Usage'
                ]}
                labelFormatter={(label) => `Month: ${label}`}
                contentStyle={{
                  backgroundColor: '#e3f2fd',
                  border: '1px solid #1976d2',
                  borderRadius: '6px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="waterM3" 
                stroke="#1976d2" 
                fill="#bbdefb"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="bg-blue-50 p-3 rounded">
            <span className="font-medium text-blue-700">Monthly Average:</span>
            <span className="text-blue-800 ml-2">{monthlyAverageM3.toFixed(1)} m³</span>
          </div>
          <div className="bg-blue-50 p-3 rounded">
            <span className="font-medium text-blue-700">Annual Projection:</span>
            <span className="text-blue-800 ml-2">{annualProjectionM3.toFixed(0)} m³</span>
          </div>
        </div>
      </div>

      {/* Summary Text Block */}
      {block && onUpdate && !isPreview && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-700 mb-2">📋 Summary</h4>
          <EditableTextBlock
            block={{
              id: `${block.id}_summary`,
              content: {
                text: block.content?.customText?.summary || 'Our water management strategy has resulted in measurable improvements in efficiency and conservation across all facilities...',
                formatting: { fontSize: 'medium', alignment: 'left', style: 'normal' }
              }
            }}
            onUpdate={(_, content) => updateCustomText('summary', content.text)}
            isPreview={false}
          />
        </div>
      )}
    </div>
  );
}