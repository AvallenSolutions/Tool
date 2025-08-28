import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, TrendingUp, Database, AlertCircle, BarChart3, TestTube, Edit, Save, X, Factory } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiRequest } from '@/lib/queryClient';

interface MonthlyFacilityData {
  id: string;
  facilityId: number;
  companyId: number;
  month: string;
  electricityKwh: string | null;
  naturalGasM3: string | null;
  waterM3: string | null;
  productionVolume: string | null;
  createdAt: string;
  updatedAt: string;
}

interface KpiSnapshot {
  id: string;
  kpiId: string;
  value: number;
  month: string;
  createdAt: string;
}

export default function MonthlyFacilityDataSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedKpiForAnalytics, setSelectedKpiForAnalytics] = useState('170a5cca-9363-4a0a-88ec-ff1b046fe2d7'); // Carbon Intensity per Bottle
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    electricityKwh: '',
    naturalGasM3: '',
    waterM3: '',
    productionVolume: '',
  });

  // Query for facility data across all facilities
  const facilityQueryUrl = `/api/time-series/monthly-facility`;
  const { data: allFacilityData, isLoading: isFacilityLoading } = useQuery({
    queryKey: [facilityQueryUrl],
    retry: false,
    refetchOnMount: 'always',
    select: (data: any) => data?.data || [],
  });

  // Query for analytics data
  const analyticsQueryUrl = `/api/time-series/kpi-snapshots/${selectedKpiForAnalytics}`;
  const { data: analyticsData, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: [analyticsQueryUrl, selectedKpiForAnalytics],
    retry: false,
    enabled: !!selectedKpiForAnalytics,
  });

  // Update facility data mutation for editing existing records
  const updateFacilityData = useMutation({
    mutationFn: async ({ recordId, data }: { recordId: string, data: any }) => {
      const response = await apiRequest('PUT', `/api/time-series/monthly-facility/${recordId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Monthly data updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: [facilityQueryUrl] });
      queryClient.invalidateQueries({ queryKey: [analyticsQueryUrl] });
      setEditingRecord(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update facility data",
        variant: "destructive",
      });
    },
  });

  const formatMonth = (monthStr: string) => {
    const date = new Date(monthStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const formatValue = (value: string | null, unit: string) => {
    if (!value) return 'Not recorded';
    return `${parseFloat(value).toLocaleString()} ${unit}`;
  };

  const startEdit = (record: MonthlyFacilityData) => {
    setEditingRecord(record.id);
    setEditFormData({
      electricityKwh: record.electricityKwh || '',
      naturalGasM3: record.naturalGasM3 || '',
      waterM3: record.waterM3 || '',
      productionVolume: record.productionVolume || '',
    });
  };

  const cancelEdit = () => {
    setEditingRecord(null);
    setEditFormData({
      electricityKwh: '',
      naturalGasM3: '',
      waterM3: '',
      productionVolume: '',
    });
  };

  const saveEdit = () => {
    if (!editingRecord) return;
    
    const payload = {
      companyId: 1,
      electricityKwh: editFormData.electricityKwh || null,
      naturalGasM3: editFormData.naturalGasM3 || null,
      waterM3: editFormData.waterM3 || null,
      productionVolume: editFormData.productionVolume || null,
    };

    updateFacilityData.mutate({ recordId: editingRecord, data: payload });
  };

  if (isFacilityLoading) {
    return (
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Loading Monthly Facility Data...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardHeader className="bg-gradient-to-r from-green-50 to-gray-50">
        <CardTitle className="flex items-center">
          <div className="p-2 rounded-lg mr-3 bg-green-100">
            <Database className="w-5 h-5 text-green-600" />
          </div>
          Monthly Facility Data
        </CardTitle>
        <CardDescription>
          Historical data, analytics, and management tools for monthly facility operations
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs defaultValue="historical" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-gray-50 m-0 rounded-none">
            <TabsTrigger value="historical" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Historical Data
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="migration" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Migration
            </TabsTrigger>
            <TabsTrigger value="testing" className="flex items-center gap-2">
              <TestTube className="w-4 h-4" />
              Testing
            </TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="historical" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Historical Monthly Data</h3>
                  <Badge variant="outline">
                    {allFacilityData?.length || 0} records
                  </Badge>
                </div>

                {!allFacilityData || allFacilityData.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Monthly Data Available</h3>
                    <p className="text-sm text-gray-600">Start by entering your first monthly data entry.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {allFacilityData.slice(0, 12).map((data: MonthlyFacilityData) => (
                      <Card key={data.id} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{formatMonth(data.month)}</CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {new Date(data.updatedAt).toLocaleDateString()}
                              </Badge>
                              {editingRecord === data.id ? (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={saveEdit}
                                    disabled={updateFacilityData.isPending}
                                    data-testid={`button-save-${data.id}`}
                                  >
                                    <Save className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelEdit}
                                    data-testid={`button-cancel-${data.id}`}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEdit(data)}
                                  data-testid={`button-edit-${data.id}`}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {editingRecord === data.id ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-gray-700">Electricity (kWh)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="15000"
                                  value={editFormData.electricityKwh}
                                  onChange={(e) => setEditFormData(prev => ({ ...prev, electricityKwh: e.target.value }))}
                                  data-testid={`input-edit-electricity-${data.id}`}
                                  className="text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-gray-700">Natural Gas (m³)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="2500"
                                  value={editFormData.naturalGasM3}
                                  onChange={(e) => setEditFormData(prev => ({ ...prev, naturalGasM3: e.target.value }))}
                                  data-testid={`input-edit-gas-${data.id}`}
                                  className="text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-gray-700">Water (m³)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="1200"
                                  value={editFormData.waterM3}
                                  onChange={(e) => setEditFormData(prev => ({ ...prev, waterM3: e.target.value }))}
                                  data-testid={`input-edit-water-${data.id}`}
                                  className="text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-gray-700">Production (units)</Label>
                                <Input
                                  type="number"
                                  step="1"
                                  placeholder="25000"
                                  value={editFormData.productionVolume}
                                  onChange={(e) => setEditFormData(prev => ({ ...prev, productionVolume: e.target.value }))}
                                  data-testid={`input-edit-production-${data.id}`}
                                  className="text-sm"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <div className="font-medium text-gray-700">Electricity</div>
                                <div className="text-gray-900">{formatValue(data.electricityKwh, 'kWh')}</div>
                              </div>
                              <div>
                                <div className="font-medium text-gray-700">Natural Gas</div>
                                <div className="text-gray-900">{formatValue(data.naturalGasM3, 'm³')}</div>
                              </div>
                              <div>
                                <div className="font-medium text-gray-700">Water</div>
                                <div className="text-gray-900">{formatValue(data.waterM3, 'm³')}</div>
                              </div>
                              <div>
                                <div className="font-medium text-gray-700">Production</div>
                                <div className="text-gray-900">{formatValue(data.productionVolume, 'units')}</div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="mt-0">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">KPI Analytics</h3>
                  <Select value={selectedKpiForAnalytics} onValueChange={setSelectedKpiForAnalytics}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select KPI" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="170a5cca-9363-4a0a-88ec-ff1b046fe2d7">Carbon Intensity per Bottle</SelectItem>
                      <SelectItem value="another-kpi-id">Water Usage Efficiency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isAnalyticsLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : analyticsData?.data?.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analyticsData.data}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="month" 
                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                          />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#8884d8" 
                            strokeWidth={2}
                            dot={{ fill: '#8884d8' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
                    <p className="text-sm text-gray-600">KPI snapshots will appear here once monthly data is processed.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="trends" className="mt-0">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Trend Analysis</h3>
                <Alert>
                  <TrendingUp className="w-4 h-4" />
                  <AlertDescription>
                    Trend analysis tools will help identify patterns in your monthly facility data over time.
                  </AlertDescription>
                </Alert>
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Trend Analysis Coming Soon</h3>
                  <p className="text-sm text-gray-600">Advanced trend analysis features are in development.</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="migration" className="mt-0">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Data Migration Tools</h3>
                <Alert>
                  <Database className="w-4 h-4" />
                  <AlertDescription>
                    Migration tools help transition from annual to monthly data collection systems.
                  </AlertDescription>
                </Alert>
                <div className="text-center py-8">
                  <Database className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Migration Tools Coming Soon</h3>
                  <p className="text-sm text-gray-600">Data migration utilities are in development.</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="testing" className="mt-0">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Testing & Validation</h3>
                <Alert>
                  <TestTube className="w-4 h-4" />
                  <AlertDescription>
                    Testing tools ensure data quality and system reliability for monthly facility data.
                  </AlertDescription>
                </Alert>
                <div className="text-center py-8">
                  <TestTube className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Testing Tools Coming Soon</h3>
                  <p className="text-sm text-gray-600">Data validation and testing features are in development.</p>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}