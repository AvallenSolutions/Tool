import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { BarChart3, Loader2 } from "lucide-react";

export default function EmissionsChart() {
  // Fetch actual footprint data from carbon calculator
  const { data: footprintData, isLoading: footprintLoading } = useQuery({
    queryKey: ["/api/company/footprint"],
    retry: false,
  });
  
  const { data: automatedData, isLoading: automatedLoading } = useQuery({
    queryKey: ["/api/company/footprint/scope3/automated"],
    retry: false,
  });
  
  const isLoading = footprintLoading || automatedLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            Emissions Breakdown
          </CardTitle>
          <CardDescription>Company greenhouse gas emissions by scope</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading emissions data...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate scope emissions from real footprint data
  const calculateScopeEmissions = (scope: number) => {
    if (!footprintData?.success || !footprintData?.data) return 0;
    
    return footprintData.data
      .filter((item: any) => item.scope === scope)
      .reduce((total: number, item: any) => total + parseFloat(item.calculatedEmissions || 0), 0);
  };
  
  const scope1 = calculateScopeEmissions(1) / 1000; // Convert kg to tonnes
  const scope2 = calculateScopeEmissions(2) / 1000; // Convert kg to tonnes
  
  // Get Scope 3 from automated calculations (includes product LCA + fuel-related)
  const scope3 = automatedData?.success ? automatedData.data.totalEmissions : 0; // Already in tonnes
  
  const total = scope1 + scope2 + scope3;

  // Get detailed breakdown for tooltips
  const getScope1Details = () => {
    if (!footprintData?.success || !footprintData?.data) return [];
    return footprintData.data
      .filter((item: any) => item.scope === 1)
      .map((item: any) => ({
        type: item.dataType,
        emissions: parseFloat(item.calculatedEmissions || 0) / 1000,
        unit: item.unit
      }));
  };
  
  const getScope3Details = () => {
    if (!automatedData?.success || !automatedData?.data?.categories) return [];
    const cats = automatedData.data.categories;
    return [
      { type: 'Purchased Goods & Services', emissions: cats.purchasedGoodsServices?.emissions || 0 },
      { type: 'Fuel & Energy Related', emissions: cats.fuelEnergyRelated?.emissions || 0 }
    ];
  };

  const data = [
    {
      name: "Scope 1 (Direct)",
      value: scope1,
      percentage: total > 0 ? ((scope1 / total) * 100) : 0,
      color: "hsl(143, 69%, 38%)", // avallen-green
      details: getScope1Details(),
    },
    {
      name: "Scope 2 (Energy)", 
      value: scope2,
      percentage: total > 0 ? ((scope2 / total) * 100) : 0,
      color: "hsl(210, 11%, 33%)", // slate-gray
      details: [{ type: 'Electricity', emissions: scope2, unit: 'kWh' }],
    },
    {
      name: "Scope 3 (Supply Chain)",
      value: scope3,
      percentage: total > 0 ? ((scope3 / total) * 100) : 0,
      color: "hsl(196, 100%, 47%)", // bright blue instead of brown
      details: getScope3Details(),
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-light-gray rounded-lg shadow-lg min-w-[200px]">
          <p className="text-slate-gray font-medium mb-2">{data.name}</p>
          <p className="text-slate-gray font-semibold">
            {data.value.toFixed(1)} tonnes CO2e ({data.percentage.toFixed(1)}%)
          </p>
          {data.details && data.details.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Breakdown:</p>
              {data.details.map((detail: any, index: number) => (
                <div key={index} className="text-xs text-gray-600 flex justify-between">
                  <span>{detail.type}</span>
                  <span>{detail.emissions.toFixed(1)}t</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload && payload.map((entry: any, index: number) => (
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

  // No data state
  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            Emissions Breakdown
          </CardTitle>
          <CardDescription>Company greenhouse gas emissions by scope</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <p className="mb-2">No emissions data available</p>
            <p className="text-sm">Add your company's emissions data in the Carbon Footprint Calculator</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-green-600" />
          Emissions Breakdown
        </CardTitle>
        <CardDescription>
          Total: {total.toFixed(1)} tonnes CO2e across all scopes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
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
            <div className="text-2xl font-bold text-green-600">
              {scope1.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">tonnes Scope 1</div>
            <div className="text-xs text-gray-500">Direct emissions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-600">
              {scope2.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">tonnes Scope 2</div>
            <div className="text-xs text-gray-500">Energy indirect</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {scope3.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">tonnes Scope 3</div>
            <div className="text-xs text-gray-500">Supply chain</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
