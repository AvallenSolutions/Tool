import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, TrendingUp, Database, AlertCircle, BarChart3, TestTube, Edit, Save, X } from 'lucide-react';
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Monthly Facility Data</h3>
          <p className="text-sm text-muted-foreground">
            {facilityName ? `Track operational data for ${facilityName}` : 'Track operational data over time'}
          </p>
        </div>
        <Button
          onClick={() => initializeSnapshots.mutate()}
          disabled={initializeSnapshots.isPending}
          variant="outline"
          data-testid="button-initialize-snapshots"
          size="sm"
        >
          <Database className="w-4 h-4 mr-2" />
          {initializeSnapshots.isPending ? 'Initializing...' : 'Initialize KPI History'}
        </Button>
      </div>

      <Tabs defaultValue="entry" className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="entry" data-testid="tab-data-entry">Data Entry</TabsTrigger>
        </TabsList>

        <TabsContent value="entry" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Monthly Data Entry
              </CardTitle>
              <CardDescription>
                Enter operational data for accurate KPI calculations and trend tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="month">Month</Label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger data-testid="select-month">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="electricityKwh">Electricity (kWh)</Label>
                      <Input
                        id="electricityKwh"
                        type="number"
                        step="0.01"
                        placeholder="15000"
                        value={formData.electricityKwh}
                        onChange={(e) => setFormData(prev => ({ ...prev, electricityKwh: e.target.value }))}
                        data-testid="input-electricity"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="naturalGasM3">Natural Gas (m³)</Label>
                      <Input
                        id="naturalGasM3"
                        type="number"
                        step="0.01"
                        placeholder="2500"
                        value={formData.naturalGasM3}
                        onChange={(e) => setFormData(prev => ({ ...prev, naturalGasM3: e.target.value }))}
                        data-testid="input-natural-gas"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="waterM3">Water Consumption (m³)</Label>
                      <Input
                        id="waterM3"
                        type="number"
                        step="0.01"
                        placeholder="1200"
                        value={formData.waterM3}
                        onChange={(e) => setFormData(prev => ({ ...prev, waterM3: e.target.value }))}
                        data-testid="input-water"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="productionVolume">Production Volume (units)</Label>
                      <Input
                        id="productionVolume"
                        type="number"
                        step="1"
                        placeholder="25000"
                        value={formData.productionVolume}
                        onChange={(e) => setFormData(prev => ({ ...prev, productionVolume: e.target.value }))}
                        data-testid="input-production-volume"
                      />
                    </div>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Enter data for {formatMonth(selectedMonth)}. This will enable time-aware KPI calculations
                      and improve accuracy of sustainability metrics.
                    </AlertDescription>
                  </Alert>

                  <Button 
                    type="button"
                    onClick={handleSubmit}
                    disabled={saveFacilityData.isPending}
                    className="w-full"
                    data-testid="button-save-facility-data"
                  >
                    {saveFacilityData.isPending ? 'Saving...' : 'Save Monthly Data'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
    </div>
  );
}