import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

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
      <Card className="border-light-gray">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-gray">
            Emissions Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-avallen-green border-t-transparent rounded-full" />
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
  const scope3 = automatedData?.success ? (automatedData.data.totalEmissions / 1000) : 0; // Convert to tonnes
  
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
      percentage: total > 0 ? Math.round((scope1 / total) * 100) : 0,
      color: "hsl(143, 69%, 38%)", // avallen-green
      details: getScope1Details(),
    },
    {
      name: "Scope 2 (Energy)", 
      value: scope2,
      percentage: total > 0 ? Math.round((scope2 / total) * 100) : 0,
      color: "hsl(210, 11%, 33%)", // slate-gray
      details: [{ type: 'Electricity', emissions: scope2, unit: 'kWh' }],
    },
    {
      name: "Scope 3 (Supply Chain)",
      value: scope3,
      percentage: total > 0 ? Math.round((scope3 / total) * 100) : 0,
      color: "hsl(40, 85%, 39%)", // muted-gold
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
            {data.value.toFixed(1)} tonnes CO2e ({data.percentage}%)
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
    if (!payload || payload.length === 0) {
      return (
        <div className="text-center text-gray-500 mt-4">
          No emissions data available
        </div>
      );
    }
    
    return (
      <div className="mt-4 space-y-2">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-slate-gray">{entry.value}</span>
            </div>
            <span className="text-sm font-medium text-slate-gray">
              {entry.payload?.value?.toFixed(1) || 0} tonnes ({entry.payload?.percentage || 0}%)
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="border-light-gray">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-gray">
          Emissions Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="relative">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-32 text-center">
            <div className="text-2xl font-bold text-slate-gray">
              {total.toFixed(1)}
            </div>
            <div className="text-sm text-gray-500">tonnes CO2e</div>
          </div>
        </div>
        <CustomLegend payload={data?.length ? data : []} />
      </CardContent>
    </Card>
  );
}
