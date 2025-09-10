import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Droplets, TrendingUp, AlertCircle, Factory, Sprout } from 'lucide-react';
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

interface ComprehensiveWaterFootprint {
  total: number;
  total_m3: number;
  agricultural_water: number;
  agricultural_water_m3: number;
  processing_and_dilution_water: number;
  processing_and_dilution_water_m3: number;
  net_operational_water: number;
  net_operational_water_m3: number;
}

export function WaterFootprintPreview({ block, onUpdate, isPreview = false }: WaterFootprintPreviewProps) {
  // Fetch monthly data summary for facility water usage
  const { data: monthlyData, isLoading: monthlyLoading } = useQuery<MonthlyDataSummary>({
    queryKey: ['/api/monthly-data-summary'],
  });

  // Fetch comprehensive water footprint (includes OpenLCA ingredients + packaging)
  const { data: comprehensiveWater, isLoading: comprehensiveLoading } = useQuery<ComprehensiveWaterFootprint>({
    queryKey: ['/api/company/water-footprint'],
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

  if (monthlyLoading || comprehensiveLoading) {
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

  if (!comprehensiveWater?.data?.total || comprehensiveWater.data.total === 0) {
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
            Complete your product data and facility information to see comprehensive water footprint analysis.
          </p>
          <p className="text-sm text-blue-500">
            Add product ingredients and monthly facility data to generate your water footprint report.
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

  // Calculate comprehensive water metrics
  const waterData = comprehensiveWater.data;
  const totalWaterLiters = waterData.total; // Already in liters
  const facilityWaterLiters = waterData.net_operational_water; // Facility operational water
  const productWaterLiters = waterData.agricultural_water + waterData.processing_and_dilution_water; // Ingredients + packaging
  
  // Get facility production data for efficiency calculations
  const facilityData = monthlyData?.aggregated;
  const totalProductionVolume = facilityData?.totalProductionVolume || 1;
  
  // Calculate water efficiency metrics
  const totalWaterEfficiency = totalWaterLiters / totalProductionVolume;
  const facilityWaterEfficiency = facilityWaterLiters / totalProductionVolume;
  const productWaterEfficiency = productWaterLiters / totalProductionVolume;

  // Generate breakdown chart data for comprehensive water footprint
  const generateBreakdownData = () => {
    return [
      {
        category: 'Ingredients',
        liters: waterData.agricultural_water,
        percentage: ((waterData.agricultural_water / totalWaterLiters) * 100).toFixed(1)
      },
      {
        category: 'Packaging',
        liters: waterData.processing_and_dilution_water,
        percentage: ((waterData.processing_and_dilution_water / totalWaterLiters) * 100).toFixed(1)
      },
      {
        category: 'Facility Operations',
        liters: waterData.net_operational_water,
        percentage: ((waterData.net_operational_water / totalWaterLiters) * 100).toFixed(1)
      }
    ];
  };

  const breakdownData = generateBreakdownData();

  // Calculate water source percentages
  const facilityPercentage = ((facilityWaterLiters / totalWaterLiters) * 100).toFixed(1);
  const productPercentage = ((productWaterLiters / totalWaterLiters) * 100).toFixed(1);

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

      {/* Comprehensive Water Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-blue-700">Total Water Footprint</h4>
          </div>
          <p className="text-2xl font-bold text-blue-800">
            {totalWaterLiters.toLocaleString()} L
          </p>
          <p className="text-sm text-blue-600">
            {(totalWaterLiters / 1000).toFixed(1)} m³ annually
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Sprout className="h-5 w-5 text-green-600" />
            <h4 className="font-semibold text-green-700">Ingredients & Packaging</h4>
          </div>
          <p className="text-2xl font-bold text-green-800">
            {productWaterLiters.toLocaleString()} L
          </p>
          <p className="text-sm text-green-600">
            {productPercentage}% - Ingredients & packaging
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Factory className="h-5 w-5 text-slate-600" />
            <h4 className="font-semibold text-slate-700">Facility Water</h4>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {facilityWaterLiters.toLocaleString()} L
          </p>
          <p className="text-sm text-slate-600">
            {facilityPercentage}% - Operations
          </p>
        </div>
      </div>

      {/* Water Footprint Breakdown Chart */}
      <div className="bg-white p-6 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-700 mb-4 flex items-center gap-2">
          <Droplets className="h-5 w-5" />
          Water Footprint Breakdown
        </h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdownData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3f2fd" />
              <XAxis 
                dataKey="category" 
                stroke="#1976d2"
                fontSize={12}
              />
              <YAxis 
                stroke="#1976d2"
                fontSize={12}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString()} L`,
                  'Water Usage'
                ]}
                contentStyle={{
                  backgroundColor: '#e3f2fd',
                  border: '1px solid #1976d2',
                  borderRadius: '6px'
                }}
              />
              <Bar 
                dataKey="liters" 
                fill="#1976d2"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="bg-green-50 p-3 rounded">
            <span className="font-medium text-green-700">Ingredients:</span>
            <span className="text-green-800 ml-2">{waterData.agricultural_water.toLocaleString()} L</span>
          </div>
          <div className="bg-blue-50 p-3 rounded">
            <span className="font-medium text-blue-700">Packaging:</span>
            <span className="text-blue-800 ml-2">{waterData.processing_and_dilution_water.toLocaleString()} L</span>
          </div>
          <div className="bg-slate-50 p-3 rounded">
            <span className="font-medium text-slate-700">Operations:</span>
            <span className="text-slate-800 ml-2">{waterData.net_operational_water.toLocaleString()} L</span>
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