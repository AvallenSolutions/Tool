import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { BarChart3, Loader2 } from "lucide-react";

export default function EmissionsChart() {
  // Fetch comprehensive footprint data for ingredients and packaging breakdown
  const { data: comprehensiveData, isLoading: comprehensiveLoading } = useQuery({
    queryKey: ["/api/company/footprint/comprehensive"],
    retry: false,
  });
  
  // Fetch Scope 3 automated data for waste and transport categories
  const { data: scope3Data, isLoading: scope3Loading } = useQuery({
    queryKey: ["/api/company/footprint/scope3/automated"],
    retry: false,
  });
  
  // Fetch carbon calculator total for Scope 1+2 (production facilities)
  const { data: carbonCalculatorData, isLoading: carbonLoading } = useQuery({
    queryKey: ["/api/carbon-calculator-total"],
    retry: false,
  });

  const isLoading = comprehensiveLoading || scope3Loading || carbonLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            Emissions Breakdown
          </CardTitle>
          <CardDescription>Company greenhouse gas emissions by category using authentic data sources</CardDescription>
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

  // Calculate emissions using real data from authentic sources
  
  // 1. Ingredients: From Scope 3 Purchased Goods & Services (OpenLCA calculations)
  const ingredients = scope3Data?.data?.categories?.purchasedGoodsServices?.emissions || 0; // Already in tonnes
  
  // 2. Packaging: Extract from comprehensive data product breakdown
  let packaging = 0;
  if (comprehensiveData?.data?.productDetails) {
    packaging = comprehensiveData.data.productDetails.reduce((total: number, product: any) => {
      return total + (product.breakdown?.packaging?.co2e || 0);
    }, 0) / 1000; // Convert kg to tonnes
  }
  
  // 3. Production Facilities: Scope 1+2 from carbon calculator
  const facilities = carbonCalculatorData?.data?.totalCO2e || 0; // Already in tonnes
  
  // 4. Transport & Other: Sum of business travel, commuting, and transportation from Scope 3
  const transportOther = (
    (scope3Data?.data?.categories?.businessTravel?.emissions || 0) +
    (scope3Data?.data?.categories?.employeeCommuting?.emissions || 0) +
    (scope3Data?.data?.categories?.transportation?.emissions || 0)
  );
  
  // 5. Waste: New category from Scope 3 Waste Generated
  const waste = scope3Data?.data?.categories?.wasteGenerated?.emissions || 0; // Already in tonnes
  
  const total = ingredients + packaging + facilities + transportOther + waste;

  const data = [
    {
      name: "Ingredients (Raw Materials)",
      value: ingredients,
      percentage: total > 0 ? ((ingredients / total) * 100) : 0,
      color: "hsl(143, 69%, 38%)", // avallen-green
      description: "OpenLCA ingredient impacts from ecoinvent database",
      source: "Scope 3 Purchased Goods & Services"
    },
    {
      name: "Packaging Materials", 
      value: packaging,
      percentage: total > 0 ? ((packaging / total) * 100) : 0,
      color: "hsl(210, 11%, 33%)", // slate-gray
      description: "Glass bottles, labels, closures with recycled content",
      source: "Comprehensive LCA product breakdown"
    },
    {
      name: "Production Facilities",
      value: facilities,
      percentage: total > 0 ? ((facilities / total) * 100) : 0,
      color: "hsl(196, 100%, 47%)", // bright blue
      description: "Energy, water, waste from production facilities",
      source: "Carbon Calculator Scope 1+2 totals"
    },
    {
      name: "Transport & Other",
      value: transportOther,
      percentage: total > 0 ? ((transportOther / total) * 100) : 0,
      color: "hsl(45, 93%, 47%)", // muted gold
      description: "Business travel, employee commuting, and transportation",
      source: "Scope 3 Travel & Transportation categories"
    },
    {
      name: "Waste",
      value: waste,
      percentage: total > 0 ? ((waste / total) * 100) : 0,
      color: "hsl(25, 95%, 53%)", // orange
      description: "Waste disposal and end-of-life treatment",
      source: "Scope 3 Waste Generated category"
    },
  ].filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-light-gray rounded-lg shadow-lg min-w-[250px]">
          <p className="text-slate-gray font-medium mb-2">{data.name}</p>
          <p className="text-slate-gray font-semibold">
            {data.value.toFixed(1)} tonnes CO2e ({data.percentage.toFixed(1)}%)
          </p>
          {data.description && (
            <p className="text-xs text-gray-600 mt-2">{data.description}</p>
          )}
          {data.source && (
            <p className="text-xs text-blue-600 mt-1 italic">Source: {data.source}</p>
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
          <CardDescription>Company greenhouse gas emissions by category using authentic data sources</CardDescription>
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
              {ingredients.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">tonnes Ingredients</div>
            <div className="text-xs text-gray-500">Raw materials</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-600">
              {packaging.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">tonnes Packaging</div>
            <div className="text-xs text-gray-500">Bottles, labels, closures</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {facilities.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">tonnes Facilities</div>
            <div className="text-xs text-gray-500">Energy, water, waste</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
