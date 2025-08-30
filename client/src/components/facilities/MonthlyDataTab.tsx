import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, TrendingUp, Database, AlertCircle, BarChart3, TestTube, Edit, Save, X, Zap, Droplets, Factory, CheckCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonthlyFacilityData {
  id: string;
  companyId: number;
  facilityId?: number | null;
  month: string;
  electricityKwh: string;
  naturalGasM3: string;
  waterM3: string;
  productionVolume: string;
  utilityBillUrl?: string;
  createdAt: string;
  updatedAt: string;
  _metadata?: {
    isAggregated: boolean;
    facilityCount: number;
    aggregationType: string;
  };
}

interface KpiSnapshot {
  id: string;
  companyId: number;
  kpiDefinitionId: string;
  snapshotDate: string;
  value: string;
  metadata?: {
    calculationMethod?: string;
    dataSource?: string;
    facilityDataMonth?: string;
    notes?: string;
  };
  createdAt: string;
}

interface AnalyticsData {
  snapshots: KpiSnapshot[];
  analytics: {
    trend: string;
    changePercentage: number;
    averageValue: number;
    minValue: number;
    maxValue: number;
    dataPoints: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
}

interface MonthlyDataTabProps {
  facilityId?: number;
  facilityName?: string;
}

export default function MonthlyDataTab({ facilityId, facilityName }: MonthlyDataTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });

  const [selectedKpiForAnalytics, setSelectedKpiForAnalytics] = useState('170a5cca-9363-4a0a-88ec-ff1b046fe2d7'); // Carbon Intensity per Bottle

  const [formData, setFormData] = useState({
    electricityKwh: '',
    naturalGasM3: '',
    waterM3: '',
    productionVolume: '',
  });



  // Use aggregated company data instead of facility-specific data
  const facilityQueryUrl = `/api/time-series/monthly-aggregated/1`;
  
  const analyticsQueryUrl = facilityId
    ? `/api/time-series/analytics/${facilityId}`
    : '/api/time-series/analytics/1';

  // Fetch monthly facility data
  const { data: facilityData = [], isLoading: facilityLoading } = useQuery({
    queryKey: [facilityQueryUrl],
    queryFn: async () => {
      const response = await apiRequest('GET', `${facilityQueryUrl}?limit=12`);
      return response.json();
    },
  });

  // Fetch KPI analytics
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: [analyticsQueryUrl, selectedKpiForAnalytics],
    queryFn: async () => {
      const response = await apiRequest('GET', `${analyticsQueryUrl}?kpiDefinitionId=${selectedKpiForAnalytics}&monthsBack=12`);
      return response.json();
    },
    enabled: !!selectedKpiForAnalytics,
  });

  // Save facility data mutation
  const saveFacilityData = useMutation({
    mutationFn: async (data: any) => {
      const facilitySpecificData = facilityId ? { ...data, facilityId } : data;
      const response = await apiRequest('POST', '/api/time-series/monthly-facility', facilitySpecificData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Monthly data saved for ${facilityName || 'facility'}`,
      });
      queryClient.invalidateQueries({ queryKey: [facilityQueryUrl] });
      queryClient.invalidateQueries({ queryKey: [analyticsQueryUrl] });
      // Don't clear form data - keep it filled for potential further edits
      // setFormData({
      //   electricityKwh: '',
      //   naturalGasM3: '',
      //   waterM3: '',
      //   productionVolume: '',
      // });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save facility data",
        variant: "destructive",
      });
    },
  });



  // Initialize KPI snapshots mutation
  const initializeSnapshots = useMutation({
    mutationFn: async () => {
      const companyId = facilityId || 1; // Use facilityId or fallback to company 1
      const response = await apiRequest('POST', `/api/time-series/kpi-snapshots/initialize/${companyId}`, { monthsBack: 12 });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "KPI snapshots initialized successfully",
      });
      queryClient.invalidateQueries({ queryKey: [analyticsQueryUrl] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to initialize KPI snapshots",
        variant: "destructive",
      });
    },
  });

  // Load existing data when month changes
  useEffect(() => {
    const existingData = facilityData.find((data: MonthlyFacilityData) => data.month === selectedMonth);
    if (existingData) {
      setFormData({
        electricityKwh: existingData.electricityKwh || '',
        naturalGasM3: existingData.naturalGasM3 || '',
        waterM3: existingData.waterM3 || '',
        productionVolume: existingData.productionVolume || '',
      });
    } else {
      setFormData({
        electricityKwh: '',
        naturalGasM3: '',
        waterM3: '',
        productionVolume: '',
      });
    }
  }, [selectedMonth, facilityData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent parent form submission
    
    const payload = {
      companyId: 1,
      month: selectedMonth,
      electricityKwh: formData.electricityKwh || null,
      naturalGasM3: formData.naturalGasM3 || null,
      waterM3: formData.waterM3 || null,
      productionVolume: formData.productionVolume || null,
    };

    saveFacilityData.mutate(payload);
  };

  const formatMonth = (monthStr: string) => {
    const date = new Date(monthStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const formatValue = (value: string | null, unit: string) => {
    if (!value) return 'Not recorded';
    return `${parseFloat(value).toLocaleString()} ${unit}`;
  };



  const formatChartData = (snapshots: KpiSnapshot[]) => {
    return snapshots.map(snapshot => ({
      date: snapshot.snapshotDate,
      value: parseFloat(snapshot.value),
      month: formatMonth(snapshot.snapshotDate + '-01')
    })).sort((a, b) => a.date.localeCompare(b.date));
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing': return 'text-red-600';
      case 'decreasing': return 'text-green-600';
      default: return 'text-blue-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return '↗';
      case 'decreasing': return '↘';
      default: return '→';
    }
  };

  return (
    <div className="space-y-6" data-testid="monthly-data-tab">
      {/* Header with guidance */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Monthly Data Collection</h3>
            <p className="text-sm text-blue-800 mb-4">
              {facilityName ? `Track monthly operational data for ${facilityName}` : 'Track your facility\'s monthly operational data'} to ensure accurate sustainability calculations and KPI tracking.
            </p>
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Info className="w-4 h-4" />
              <span>Enter actual meter readings and utility bill data for best accuracy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Data Entry
          </CardTitle>
          <CardDescription>
            Select a month and enter your operational data from utility bills and production records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Month Selection - Prominent */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <Label htmlFor="month" className="text-base font-medium">Select Month</Label>
              <p className="text-sm text-muted-foreground mb-3">Choose the month you want to enter data for</p>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger data-testid="select-month" className="text-base">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
                    return (
                      <SelectItem key={value} value={value}>
                        {formatMonth(value)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Data Input Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Energy Consumption */}
              <Card className="border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Zap className="w-5 h-5 text-blue-600" />
                    Energy Consumption
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="electricityKwh" className="flex items-center gap-2">
                      Electricity Consumption
                      <span className="text-xs text-muted-foreground">(kWh)</span>
                    </Label>
                    <Input
                      id="electricityKwh"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 15000"
                      value={formData.electricityKwh}
                      onChange={(e) => setFormData(prev => ({ ...prev, electricityKwh: e.target.value }))}
                      data-testid="input-electricity"
                      className="text-base"
                    />
                    <p className="text-xs text-muted-foreground">From your electricity bill for {formatMonth(selectedMonth)}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="naturalGasM3" className="flex items-center gap-2">
                      Natural Gas Usage
                      <span className="text-xs text-muted-foreground">(m³)</span>
                    </Label>
                    <Input
                      id="naturalGasM3"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 2500"
                      value={formData.naturalGasM3}
                      onChange={(e) => setFormData(prev => ({ ...prev, naturalGasM3: e.target.value }))}
                      data-testid="input-natural-gas"
                      className="text-base"
                    />
                    <p className="text-xs text-muted-foreground">From your gas bill for {formatMonth(selectedMonth)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Water & Production */}
              <Card className="border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-900">
                    <Factory className="w-5 h-5 text-green-600" />
                    Water & Production
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="waterM3" className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-cyan-600" />
                      Water Consumption
                      <span className="text-xs text-muted-foreground">(m³)</span>
                    </Label>
                    <Input
                      id="waterM3"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 1200"
                      value={formData.waterM3}
                      onChange={(e) => setFormData(prev => ({ ...prev, waterM3: e.target.value }))}
                      data-testid="input-water"
                      className="text-base"
                    />
                    <p className="text-xs text-muted-foreground">From your water bill for {formatMonth(selectedMonth)}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="productionVolume" className="flex items-center gap-2">
                      <Factory className="w-4 h-4 text-green-600" />
                      Production Volume
                      <span className="text-xs text-muted-foreground">(units)</span>
                    </Label>
                    <Input
                      id="productionVolume"
                      type="number"
                      step="1"
                      placeholder="e.g., 25000"
                      value={formData.productionVolume}
                      onChange={(e) => setFormData(prev => ({ ...prev, productionVolume: e.target.value }))}
                      data-testid="input-production-volume"
                      className="text-base"
                    />
                    <p className="text-xs text-muted-foreground">Total units produced in {formatMonth(selectedMonth)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Help Section */}
            <Alert className="border-amber-200 bg-amber-50">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Tip:</strong> Use actual meter readings from your utility bills for the most accurate carbon footprint calculations. 
                This data feeds directly into your sustainability metrics and KPI tracking.
              </AlertDescription>
            </Alert>

            {/* Save Button */}
            <div className="flex justify-center">
              <Button 
                type="button"
                onClick={handleSubmit}
                disabled={saveFacilityData.isPending}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-base"
                data-testid="button-save-facility-data"
              >
                {saveFacilityData.isPending ? (
                  <>
                    <Database className="w-4 h-4 mr-2 animate-spin" />
                    Saving Data...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save {formatMonth(selectedMonth)} Data
                  </>
                )}
              </Button>
            </div>

            {/* Data Preview - Show current entries */}
            {facilityData.length > 0 && (
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <BarChart3 className="w-5 h-5" />
                    Recent Entries
                  </CardTitle>
                  <CardDescription>
                    Your latest monthly data entries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {facilityData.slice(0, 3).map((data: MonthlyFacilityData) => (
                      <div key={data.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{formatMonth(data.month)}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {new Date(data.updatedAt).toLocaleDateString()}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Zap className="w-3 h-3 text-blue-500" />
                            <span className="text-muted-foreground">Electricity:</span>
                            <span className="font-medium">{formatValue(data.electricityKwh, 'kWh')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 bg-orange-500 rounded-full" />
                            <span className="text-muted-foreground">Gas:</span>
                            <span className="font-medium">{formatValue(data.naturalGasM3, 'm³')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Droplets className="w-3 h-3 text-cyan-500" />
                            <span className="text-muted-foreground">Water:</span>
                            <span className="font-medium">{formatValue(data.waterM3, 'm³')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Factory className="w-3 h-3 text-green-500" />
                            <span className="text-muted-foreground">Production:</span>
                            <span className="font-medium">{formatValue(data.productionVolume, 'units')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {facilityData.length > 3 && (
                      <div className="text-center text-sm text-muted-foreground">
                        ... and {facilityData.length - 3} more entries
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}