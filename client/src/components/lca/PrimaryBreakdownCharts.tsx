import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

interface BreakdownData {
  stage: string;
  value: number;
  percentage: number;
}

interface PrimaryBreakdownChartsProps {
  carbonBreakdown: BreakdownData[];
  waterBreakdown: BreakdownData[];
}

// Chart configuration for consistent theming
const chartConfig = {
  Liquid: {
    label: "Liquid",
    color: "hsl(142, 76%, 36%)", // Green
  },
  Process: {
    label: "Process", 
    color: "hsl(221, 83%, 53%)", // Blue
  },
  Packaging: {
    label: "Packaging",
    color: "hsl(48, 96%, 53%)", // Yellow
  },
  Waste: {
    label: "Waste",
    color: "hsl(0, 84%, 60%)", // Red
  },
};

const getStageColor = (stage: string): string => {
  return chartConfig[stage as keyof typeof chartConfig]?.color || "hsl(0, 0%, 50%)";
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900">{data.stage}</p>
        <p className="text-sm text-gray-600">
          {data.value.toFixed(2)} ({data.percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

export default function PrimaryBreakdownCharts({ 
  carbonBreakdown, 
  waterBreakdown 
}: PrimaryBreakdownChartsProps) {
  console.log('PrimaryBreakdownCharts - carbonBreakdown:', carbonBreakdown);
  console.log('PrimaryBreakdownCharts - waterBreakdown:', waterBreakdown);

  // Use the data directly for simple bar charts instead of stacked format
  const carbonData = carbonBreakdown || [];
  const waterData = waterBreakdown || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Carbon Footprint Chart */}
      <Card className="border-light-gray">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            Carbon Footprint Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={carbonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="stage" />
                <YAxis />
                <ChartTooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#8884d8">
                  {carbonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getStageColor(entry.stage)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {carbonBreakdown.map((item) => (
              <div key={item.stage} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getStageColor(item.stage) }}
                ></div>
                <span className="text-sm text-gray-600">
                  {item.stage} ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Water Footprint Chart */}
      <Card className="border-light-gray">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            Water Footprint Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="stage" />
                <YAxis />
                <ChartTooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#8884d8">
                  {waterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getStageColor(entry.stage)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {waterBreakdown.map((item) => (
              <div key={item.stage} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getStageColor(item.stage) }}
                ></div>
                <span className="text-sm text-gray-600">
                  {item.stage} ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}