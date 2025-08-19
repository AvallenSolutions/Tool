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
  // Prepare data for stacked bar chart format
  const carbonData = [{
    name: 'Carbon Footprint',
    ...carbonBreakdown.reduce((acc, item) => {
      acc[item.stage] = item.value;
      return acc;
    }, {} as Record<string, number>)
  }];

  const waterData = [{
    name: 'Water Footprint',
    ...waterBreakdown.reduce((acc, item) => {
      acc[item.stage] = item.value;
      return acc;
    }, {} as Record<string, number>)
  }];

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
          <ChartContainer config={chartConfig} className="h-64">
            <BarChart data={carbonData} layout="horizontal">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" hide />
              <ChartTooltip content={<CustomTooltip />} />
              
              {/* Stacked bars for each lifecycle stage */}
              <Bar dataKey="Liquid" stackId="carbon" fill={getStageColor('Liquid')} />
              <Bar dataKey="Process" stackId="carbon" fill={getStageColor('Process')} />
              <Bar dataKey="Packaging" stackId="carbon" fill={getStageColor('Packaging')} />
              <Bar dataKey="Waste" stackId="carbon" fill={getStageColor('Waste')} />
            </BarChart>
          </ChartContainer>
          
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
          <ChartContainer config={chartConfig} className="h-64">
            <BarChart data={waterData} layout="horizontal">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" hide />
              <ChartTooltip content={<CustomTooltip />} />
              
              {/* Stacked bars for each lifecycle stage */}
              <Bar dataKey="Liquid" stackId="water" fill={getStageColor('Liquid')} />
              <Bar dataKey="Process" stackId="water" fill={getStageColor('Process')} />
              <Bar dataKey="Packaging" stackId="water" fill={getStageColor('Packaging')} />
              <Bar dataKey="Waste" stackId="water" fill={getStageColor('Waste')} />
            </BarChart>
          </ChartContainer>
          
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