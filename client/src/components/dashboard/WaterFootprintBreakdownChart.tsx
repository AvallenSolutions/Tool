import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Droplets } from 'lucide-react';

interface WaterFootprintData {
  total: number;
  agricultural_water: number;
  processing_and_dilution_water: number;
  net_operational_water: number;
  total_m3: number;
  agricultural_water_m3: number;
  processing_and_dilution_water_m3: number;
  net_operational_water_m3: number;
}

interface ChartDataPoint {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

// Color scheme - avoiding brown colors as per user preference
const CHART_COLORS = {
  agricultural: '#10B981', // Emerald green
  processing: '#3B82F6',   // Blue
  operational: '#8B5CF6'   // Purple
};

export default function WaterFootprintBreakdownChart() {
  const { data: waterFootprintData, isLoading, error } = useQuery<{ success: boolean; data: WaterFootprintData }>({
    queryKey: ['/api/company/water-footprint'],
    enabled: true,
    retry: 1
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blue-600" />
            Water Footprint Breakdown
          </CardTitle>
          <CardDescription>Company water usage by category</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading water footprint data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !waterFootprintData?.success || !waterFootprintData?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blue-600" />
            Water Footprint Breakdown
          </CardTitle>
          <CardDescription>Company water usage by category</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <p className="mb-2">No water footprint data available</p>
            <p className="text-sm">Add your facility's water consumption in the Company settings to see the breakdown</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = waterFootprintData.data;
  const total = data.total_m3 || 0;

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blue-600" />
            Water Footprint Breakdown
          </CardTitle>
          <CardDescription>Company water usage by category</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <p className="mb-2">No water consumption data recorded</p>
            <p className="text-sm">Add your facility's water consumption in the Company settings</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData: ChartDataPoint[] = [
    {
      name: 'Agricultural Water',
      value: data.agricultural_water_m3,
      color: CHART_COLORS.agricultural,
      percentage: total > 0 ? (data.agricultural_water_m3 / total) * 100 : 0
    },
    {
      name: 'Processing & Dilution',
      value: data.processing_and_dilution_water_m3,
      color: CHART_COLORS.processing,
      percentage: total > 0 ? (data.processing_and_dilution_water_m3 / total) * 100 : 0
    },
    {
      name: 'Net Operational Water',
      value: data.net_operational_water_m3,
      color: CHART_COLORS.operational,
      percentage: total > 0 ? (data.net_operational_water_m3 / total) * 100 : 0
    }
  ].filter(item => item.value > 0); // Only show categories with data

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">{data.value.toFixed(1)} m³</span>
            <span className="ml-2">({data.percentage.toFixed(1)}%)</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-700">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-blue-600" />
          Water Footprint Breakdown
        </CardTitle>
        <CardDescription>
          Total: {total.toFixed(1)} m³ across all operations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {data.agricultural_water_m3.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">m³ Agricultural</div>
            <div className="text-xs text-gray-500">Off-site ingredient production</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {data.processing_and_dilution_water_m3.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">m³ Processing</div>
            <div className="text-xs text-gray-500">Water in your products</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {data.net_operational_water_m3.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">m³ Operational</div>
            <div className="text-xs text-gray-500">Cleaning & cooling</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}