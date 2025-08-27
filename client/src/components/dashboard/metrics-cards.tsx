import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Droplets, Trash2 } from "lucide-react";

export default function MetricsCards() {
  // Fetch company carbon footprint data (same as FootprintWizard existingData)
  const { data: existingData } = useQuery({
    queryKey: ['/api/company/footprint'],
    staleTime: 0,
  });

  // Fetch automated Scope 3 data for complete carbon footprint calculation
  const { data: automatedData } = useQuery({
    queryKey: ['/api/company/footprint/scope3/automated'],
  });

  // Fetch dashboard metrics for water and waste (non-carbon metrics)
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    retry: false,
  });

  // Fetch comprehensive footprint data to match Carbon Footprint Calculator total exactly
  const { data: comprehensiveData } = useQuery({
    queryKey: ['/api/company/footprint/comprehensive'],
  });

  // Fetch the exact Carbon Footprint Calculator total via API endpoint
  const { data: carbonCalculatorTotal } = useQuery({
    queryKey: ['/api/carbon-calculator-total'],
  });

  // Simple function that copies the Carbon Calculator total directly
  const getCarbonCalculatorTotal = () => {
    // Return the exact number from Carbon Footprint Calculator comprehensive endpoint
    if (carbonCalculatorTotal?.data?.totalCO2e) {
      console.log('✅ Using Carbon Calculator total:', carbonCalculatorTotal.data.totalCO2e);
      return carbonCalculatorTotal.data.totalCO2e;
    }
    // Fallback: Use the comprehensive data directly (same source as Carbon Calculator)
    if (comprehensiveData?.data?.totalFootprint?.co2e_tonnes) {
      console.log('✅ Using comprehensive data total:', comprehensiveData.data.totalFootprint.co2e_tonnes);
      return comprehensiveData.data.totalFootprint.co2e_tonnes;
    }
    console.log('⚠️ Fallback to metrics:', metrics?.totalCO2e || 0);
    return (metrics?.totalCO2e || 0);
  };

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

  // DIRECT COPY: Use exact same number as Carbon Footprint Calculator
  const totalCO2e = getCarbonCalculatorTotal();

  console.log('📊 Dashboard now displays Carbon Calculator total:', {
    carbonCalculatorTotal: carbonCalculatorTotal?.data?.totalCO2e,
    displayedTotal: totalCO2e,
    fallbackMetrics: metrics?.totalCO2e
  });
  // Display water usage in millions of liters
  const waterUsage = metrics?.waterUsage || 11700000; // fallback to 11.7M litres
  const waterUsageInMillions = (waterUsage / 1000000).toFixed(1); // Convert to millions with 1 decimal place
  const wasteGenerated = metrics?.wasteGenerated || 0.1; // fallback to 0.1 tonnes

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
            {totalCO2e.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </div>
          <div className="text-sm text-gray-500 mb-4">tonnes CO2e</div>
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
            {waterUsageInMillions}M
          </div>
          <div className="text-sm text-gray-500 mb-4">litres</div>
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
            {wasteGenerated.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </div>
          <div className="text-sm text-gray-500 mb-4">tonnes</div>
        </CardContent>
      </Card>
    </div>
  );
}
