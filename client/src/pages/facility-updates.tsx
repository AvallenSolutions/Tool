import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, TrendingUp, Database, AlertCircle, BarChart3 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonthlyFacilityData {
  id: string;
  companyId: number;
  month: string;
  electricityKwh: string;
  naturalGasM3: string;
  waterM3: string;
  productionVolume: string;
  utilityBillUrl?: string;
  createdAt: string;
  updatedAt: string;
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

export default function FacilityUpdates() {
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

  // Fetch monthly facility data
  const { data: facilityData = [], isLoading: facilityLoading } = useQuery({
    queryKey: ['/api/time-series/monthly-facility/1'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/time-series/monthly-facility/1?limit=12');
      return response.json();
    },
  });

  // Fetch KPI analytics
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/time-series/analytics/1', selectedKpiForAnalytics],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/time-series/analytics/1?kpiDefinitionId=${selectedKpiForAnalytics}&monthsBack=12`);
      return response.json();
    },
    enabled: !!selectedKpiForAnalytics,
  });

  // Save facility data mutation
  const saveFacilityData = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/time-series/monthly-facility', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Monthly facility data saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/time-series/monthly-facility/1'] });
      queryClient.invalidateQueries({ queryKey: ['/api/time-series/analytics/1'] });
      setFormData({
        electricityKwh: '',
        naturalGasM3: '',
        waterM3: '',
        productionVolume: '',
      });
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
      const response = await apiRequest('POST', '/api/time-series/kpi-snapshots/initialize/1', { monthsBack: 12 });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "KPI snapshots initialized successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/time-series/analytics/1'] });
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
    <div className="container mx-auto py-8 space-y-6" data-testid="facility-updates-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monthly Facility Updates</h1>
          <p className="text-muted-foreground mt-2">
            Track operational data over time for enhanced KPI calculations and trend analysis
          </p>
        </div>
        <Button
          onClick={() => initializeSnapshots.mutate()}
          disabled={initializeSnapshots.isPending}
          variant="outline"
          data-testid="button-initialize-snapshots"
        >
          <Database className="w-4 h-4 mr-2" />
          {initializeSnapshots.isPending ? 'Initializing...' : 'Initialize KPI History'}
        </Button>
      </div>

      <Tabs defaultValue="entry" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="entry" data-testid="tab-data-entry">Data Entry</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">Historical Data</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          <TabsTrigger value="trends" data-testid="tab-trends">Trends</TabsTrigger>
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
              <form onSubmit={handleSubmit} className="space-y-6">
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
                      and improve the accuracy of your sustainability metrics.
                    </AlertDescription>
                  </Alert>
                </div>

                <Button 
                  type="submit" 
                  disabled={saveFacilityData.isPending}
                  className="w-full"
                  data-testid="button-save-facility-data"
                >
                  {saveFacilityData.isPending ? 'Saving...' : 'Save Monthly Data'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historical Facility Data</CardTitle>
              <CardDescription>
                Review previously entered monthly operational data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {facilityLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : facilityData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No facility data recorded yet. Start by entering data for the current month.
                </div>
              ) : (
                <div className="grid gap-4">
                  {facilityData.map((data: MonthlyFacilityData) => (
                    <div key={data.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{formatMonth(data.month)}</h3>
                        <Badge variant="secondary">
                          Updated {new Date(data.updatedAt).toLocaleDateString()}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Electricity:</span>
                          <div className="font-medium">{formatValue(data.electricityKwh, 'kWh')}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Natural Gas:</span>
                          <div className="font-medium">{formatValue(data.naturalGasM3, 'm³')}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Water:</span>
                          <div className="font-medium">{formatValue(data.waterM3, 'm³')}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Production:</span>
                          <div className="font-medium">{formatValue(data.productionVolume, 'units')}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                KPI Analytics
              </CardTitle>
              <CardDescription>
                Analyze KPI trends and performance over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Select KPI for Analysis</Label>
                  <Select value={selectedKpiForAnalytics} onValueChange={setSelectedKpiForAnalytics}>
                    <SelectTrigger data-testid="select-kpi-analytics">
                      <SelectValue placeholder="Select KPI" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="170a5cca-9363-4a0a-88ec-ff1b046fe2d7">Carbon Intensity per Bottle</SelectItem>
                      <SelectItem value="f934598b-5367-4024-8c82-3ed92f48b7da">Total Carbon Emissions</SelectItem>
                      <SelectItem value="2bf9535d-c36a-4010-819e-61c0d8f1c555">Water Efficiency</SelectItem>
                      <SelectItem value="91bc4cba-d22a-40c8-92f0-a17876c2dc35">Waste Reduction</SelectItem>
                      <SelectItem value="0e0edb33-634a-4c27-8c4c-5ca856c255cb">Renewable Energy Usage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {analyticsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : analyticsData ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm text-muted-foreground">Trend</div>
                          <div className={`font-bold text-lg flex items-center gap-1 ${getTrendColor(analyticsData.analytics.trend)}`}>
                            {getTrendIcon(analyticsData.analytics.trend)}
                            {analyticsData.analytics.trend}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm text-muted-foreground">Change</div>
                          <div className="font-bold text-lg">
                            {analyticsData.analytics.changePercentage > 0 ? '+' : ''}
                            {analyticsData.analytics.changePercentage.toFixed(1)}%
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm text-muted-foreground">Average</div>
                          <div className="font-bold text-lg">
                            {analyticsData.analytics.averageValue.toFixed(4)}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm text-muted-foreground">Data Points</div>
                          <div className="font-bold text-lg">
                            {analyticsData.analytics.dataPoints}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {analyticsData.snapshots.length > 0 && (
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={formatChartData(analyticsData.snapshots)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="month" 
                              tick={{ fontSize: 12 }}
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip 
                              labelFormatter={(label) => `Month: ${label}`}
                              formatter={(value: number) => [value.toFixed(4), 'Value']}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#2563eb" 
                              strokeWidth={2}
                              dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No analytics data available. Initialize KPI snapshots to see trends.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Operational Trends
              </CardTitle>
              <CardDescription>
                Track operational metrics over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {facilityData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={facilityData.map(data => ({
                      month: formatMonth(data.month),
                      electricity: parseFloat(data.electricityKwh || '0'),
                      water: parseFloat(data.waterM3 || '0'),
                      production: parseFloat(data.productionVolume || '0'),
                    })).reverse()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="electricity" 
                        stroke="#f59e0b" 
                        name="Electricity (kWh)"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="water" 
                        stroke="#3b82f6" 
                        name="Water (m³)"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="production" 
                        stroke="#10b981" 
                        name="Production (units)"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No operational data available for trend analysis.</p>
                  <p className="text-sm mt-2">
                    Enter monthly facility data to see operational trends.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}