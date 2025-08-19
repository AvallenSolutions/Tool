import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Droplets, Trash2, TrendingUp, TrendingDown } from "lucide-react";

export default function MetricsCards() {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    retry: false,
  });

  console.log('📊 MetricsCards Debug:', {
    isLoading,
    metrics,
    error: error?.message
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-light-gray">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalCO2e = metrics?.totalCO2e || 0;
  const waterUsage = metrics?.waterUsage || 0;
  const wasteGenerated = metrics?.wasteGenerated || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="border-light-gray" id="metrics-co2e">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-gray">Total CO2e</CardTitle>
            <div className="p-2 bg-avallen-green/10 rounded-lg">
              <Zap className="w-5 h-5 text-avallen-green" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-slate-gray mb-2">
            {totalCO2e.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 mb-4">tonnes CO2e</div>
          <div className="flex items-center text-sm">
            <TrendingDown className="w-4 h-4 text-success-green mr-1" />
            <span className="text-success-green">12%</span>
            <span className="text-gray-500 ml-1">vs last period</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-light-gray" id="metrics-water">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-gray">Water Usage</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Droplets className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-slate-gray mb-2">
            {waterUsage.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 mb-4">litres</div>
          <div className="flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-error-red mr-1" />
            <span className="text-error-red">3%</span>
            <span className="text-gray-500 ml-1">vs last period</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-light-gray" id="metrics-waste">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-gray">Waste Generated</CardTitle>
            <div className="p-2 bg-muted-gold/10 rounded-lg">
              <Trash2 className="w-5 h-5 text-muted-gold" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-slate-gray mb-2">
            {wasteGenerated.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 mb-4">tonnes</div>
          <div className="flex items-center text-sm">
            <TrendingDown className="w-4 h-4 text-success-green mr-1" />
            <span className="text-success-green">8%</span>
            <span className="text-gray-500 ml-1">vs last period</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
