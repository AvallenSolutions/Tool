import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export default function EmissionsChart() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    retry: false,
  });

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

  const scope1 = metrics?.scope1 || 0;
  const scope2 = metrics?.scope2 || 0;
  const scope3 = metrics?.scope3 || 0;
  const total = scope1 + scope2 + scope3;

  const data = [
    {
      name: "Scope 1 (Direct)",
      value: scope1,
      percentage: total > 0 ? Math.round((scope1 / total) * 100) : 0,
      color: "hsl(143, 69%, 38%)", // avallen-green
    },
    {
      name: "Scope 2 (Energy)",
      value: scope2,
      percentage: total > 0 ? Math.round((scope2 / total) * 100) : 0,
      color: "hsl(210, 11%, 33%)", // slate-gray
    },
    {
      name: "Scope 3 (Supply Chain)",
      value: scope3,
      percentage: total > 0 ? Math.round((scope3 / total) * 100) : 0,
      color: "hsl(40, 85%, 39%)", // muted-gold
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-light-gray rounded-lg shadow-lg">
          <p className="text-slate-gray font-medium">{data.name}</p>
          <p className="text-slate-gray">
            {data.value.toFixed(1)}t ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
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
              {entry.payload.value.toFixed(1)}t ({entry.payload.percentage}%)
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
        <CustomLegend payload={data} />
      </CardContent>
    </Card>
  );
}
