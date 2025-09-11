import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, TrendingUp, Database, AlertCircle, BarChart3, TestTube, Edit, Save, X, Factory, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiRequest } from '@/lib/queryClient';
import WasteStreamManager, { WasteStream } from './WasteStreamManager';

interface MonthlyFacilityData {
  id: string;
  facilityId: number | null;
  companyId: number;
  month: string;
  electricityKwh: string | null;
  naturalGasM3: string | null;
  waterM3: string | null;
  productionVolume: string | null;
  
  // Waste data fields (kept for backward compatibility)
  organicWasteKg: string | null;
  packagingWasteKg: string | null;
  hazardousWasteKg: string | null;
  generalWasteKg: string | null;
  
  createdAt: string;
  updatedAt: string;
  _metadata?: {
    isAggregated: boolean;
    facilityCount: number;
    aggregationType: string;
  };
  
  // New waste streams data
  wasteStreams?: WasteStream[];
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
  const [currentWasteStreams, setCurrentWasteStreams] = useState<WasteStream[]>([]);

  // Query for facility data from facility 1 (Main Distillery) instead of aggregated data
  const facilityQueryUrl = `/api/time-series/monthly-facility/1`;
  const { data: allFacilityData, isLoading: isFacilityLoading, error: facilityError } = useQuery({
    queryKey: [facilityQueryUrl],
    queryFn: async () => {
      const response = await apiRequest('GET', `${facilityQueryUrl}?limit=12`);
      return response.json();
    },
    retry: false,
    refetchOnMount: 'always',
  });

  // Query for analytics data 
  const analyticsQueryUrl = `/api/time-series/analytics/1`;
  const { data: analyticsData, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: [analyticsQueryUrl, selectedKpiForAnalytics],
    queryFn: async () => {
      const response = await apiRequest('GET', `${analyticsQueryUrl}?kpiDefinitionId=${selectedKpiForAnalytics}&monthsBack=12`);
      return response.json();
    },
    retry: false,
    enabled: !!selectedKpiForAnalytics,
  });

  // Update facility data mutation for editing existing records
  const updateFacilityData = useMutation({
    mutationFn: async ({ month, data }: { month: string, data: any }) => {
      const facilityData = {
        companyId: 1,
        facilityId: 1, // Main Distillery
        month: month,
        ...data
      };
      const response = await apiRequest('POST', `/api/time-series/monthly-facility`, facilityData);
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
    onError: (error: any) => {
      console.error('Update error:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update facility data",
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
    setCurrentWasteStreams(record.wasteStreams || []);
  };

  const cancelEdit = () => {
    setEditingRecord(null);
    setEditFormData({
      electricityKwh: '',
      naturalGasM3: '',
      waterM3: '',
      productionVolume: '',
    });
    setCurrentWasteStreams([]);
  };

  const saveEdit = async () => {
    if (!editingRecord || !allFacilityData) return;
    
    // Find the record being edited to get its month
    const currentRecord = allFacilityData.find((record: any) => record.id === editingRecord);
    if (!currentRecord) return;

    // Validate waste streams if any exist
    if (currentWasteStreams.length > 0) {
      const invalidStreams = currentWasteStreams.some(stream => 
        !stream.wasteType || stream.weightKg <= 0 || !stream.disposalRoute
      );
      
      if (invalidStreams) {
        toast({
          title: "Validation Error",
          description: "Please ensure all waste streams have valid waste type, weight > 0, and disposal route.",
          variant: "destructive",
        });
        return;
      }
    }

    const payload = {
      electricityKwh: editFormData.electricityKwh || null,
      naturalGasM3: editFormData.naturalGasM3 || null,
      waterM3: editFormData.waterM3 || null,
      productionVolume: editFormData.productionVolume || null,
      wasteStreams: currentWasteStreams,
    };

    updateFacilityData.mutate({ month: currentRecord.month, data: payload });
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
          <TabsList className="grid w-full grid-cols-3 bg-gray-50 m-0 rounded-none">
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
          </TabsList>

          <div className="p-6">
            <TabsContent value="historical" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Historical Monthly Data</h3>
                  <Badge variant="outline">
                    {Array.isArray(allFacilityData) ? allFacilityData.length : 0} records
                  </Badge>
                </div>

                {!allFacilityData || (Array.isArray(allFacilityData) && allFacilityData.length === 0) ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Monthly Data Available</h3>
                    <p className="text-sm text-gray-600">Start by entering your first monthly data entry.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {(Array.isArray(allFacilityData) ? allFacilityData : []).slice(0, 12).map((data: MonthlyFacilityData) => (
                      <Card key={data.id} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{formatMonth(data.month)}</CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {new Date(data.updatedAt).toLocaleDateString()}
                              </Badge>
                              {data._metadata?.facilityCount && (
                                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                  <Factory className="w-3 h-3" />
                                  {data._metadata.facilityCount} {data._metadata.facilityCount === 1 ? 'facility' : 'facilities'}
                                </Badge>
                              )}
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
                            <div className="space-y-4">
                              {/* Energy & Production Row */}
                              <div>
                                <h4 className="text-sm font-medium text-gray-800 mb-3">Energy & Production</h4>
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
                              </div>
                              
                              {/* Dynamic Waste Stream Management */}
                              <div>
                                <WasteStreamManager
                                  monthlyFacilityDataId={data.id}
                                  onWasteStreamsChange={setCurrentWasteStreams}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Energy & Production Display */}
                              <div>
                                <h4 className="text-sm font-medium text-gray-800 mb-3">Energy & Production</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <div className="font-medium text-gray-700">Electricity</div>
                                    <div className="text-gray-900" data-testid={`text-electricity-${data.id}`}>{formatValue(data.electricityKwh, 'kWh')}</div>
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-700">Natural Gas</div>
                                    <div className="text-gray-900" data-testid={`text-gas-${data.id}`}>{formatValue(data.naturalGasM3, 'm³')}</div>
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-700">Water</div>
                                    <div className="text-gray-900" data-testid={`text-water-${data.id}`}>{formatValue(data.waterM3, 'm³')}</div>
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-700">Production</div>
                                    <div className="text-gray-900" data-testid={`text-production-${data.id}`}>{formatValue(data.productionVolume, 'units')}</div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Waste Streams Display */}
                              <div>
                                <h4 className="text-sm font-medium text-gray-800 mb-3">Waste Streams</h4>
                                {data.wasteStreams && data.wasteStreams.length > 0 ? (
                                  <div className="space-y-3">
                                    {data.wasteStreams.map((stream, index) => (
                                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm">
                                        <div className="flex-1">
                                          <div className="font-medium text-gray-700">{stream.wasteType}</div>
                                          <div className="text-xs text-gray-600">{stream.disposalRoute}</div>
                                        </div>
                                        <div className="font-medium text-gray-900" data-testid={`text-waste-stream-${data.id}-${index}`}>
                                          {stream.weightKg.toFixed(1)} kg
                                        </div>
                                      </div>
                                    ))}
                                    <div className="pt-2 border-t border-gray-200">
                                      <div className="flex justify-between font-medium text-gray-800">
                                        <span>Total Waste:</span>
                                        <span data-testid={`text-total-waste-${data.id}`}>
                                          {data.wasteStreams.reduce((sum, stream) => sum + stream.weightKg, 0).toFixed(1)} kg
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-600" data-testid={`text-no-waste-data-${data.id}`}>
                                    No waste streams recorded
                                  </div>
                                )}
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
                      <SelectItem value="2bf9535d-c36a-4010-819e-61c0d8f1c555">Water Usage Efficiency</SelectItem>
                      <SelectItem value="a1b2c3d4-5678-90ab-cdef-123456789012">Waste Generation per Unit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isAnalyticsLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : analyticsData?.snapshots?.length > 0 ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-blue-600">{analyticsData.snapshots.length}</div>
                          <div className="text-sm text-gray-600">Data Points</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-green-600">
                            {analyticsData.snapshots.length > 0 ? 
                              parseFloat(analyticsData.snapshots[analyticsData.snapshots.length - 1].value).toFixed(3) : 
                              'N/A'
                            }
                          </div>
                          <div className="text-sm text-gray-600">Latest Value</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-purple-600">
                            {analyticsData.snapshots.length > 0 ? 
                              (analyticsData.snapshots.reduce((sum, snap) => sum + parseFloat(snap.value), 0) / analyticsData.snapshots.length).toFixed(3) : 
                              'N/A'
                            }
                          </div>
                          <div className="text-sm text-gray-600">Average</div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>KPI Performance Trend</CardTitle>
                        <CardDescription>Historical snapshots for Carbon Intensity per Bottle</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={analyticsData.snapshots.map(snap => ({ 
                            date: snap.snapshotDate, 
                            value: parseFloat(snap.value),
                            month: new Date(snap.snapshotDate).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="month" 
                            />
                            <YAxis />
                            <Tooltip 
                              labelFormatter={(value, payload) => {
                                if (payload && payload[0]) {
                                  return new Date(payload[0].payload.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                                }
                                return value;
                              }}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#10b981" 
                              strokeWidth={2}
                              dot={{ fill: '#10b981' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
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
                <h3 className="text-lg font-semibold">Facility Data Trends</h3>
                
                {Array.isArray(allFacilityData) && allFacilityData.length > 0 ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Electricity Usage (kWh)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={allFacilityData
                              .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
                              .map(d => ({
                                month: new Date(d.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                                value: parseFloat(d.electricityKwh || '0')
                              }))}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <Tooltip />
                              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Natural Gas Usage (m³)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={allFacilityData
                              .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
                              .map(d => ({
                                month: new Date(d.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                                value: parseFloat(d.naturalGasM3 || '0')
                              }))}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <Tooltip />
                              <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Water Usage (m³)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={allFacilityData
                              .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
                              .map(d => ({
                                month: new Date(d.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                                value: parseFloat(d.waterM3 || '0')
                              }))}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <Tooltip />
                              <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Production Volume (units)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={allFacilityData
                              .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
                              .map(d => ({
                                month: new Date(d.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                                value: parseFloat(d.productionVolume || '0')
                              }))}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <Tooltip />
                              <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>Data Quality Overview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {allFacilityData
                            .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
                            .map((data) => {
                              const completeness = [
                                data.electricityKwh, 
                                data.naturalGasM3, 
                                data.waterM3, 
                                data.productionVolume
                              ].filter(Boolean).length;
                              const percentage = (completeness / 4) * 100;
                              
                              return (
                                <div key={data.id} className="flex items-center justify-between">
                                  <span className="font-medium">{formatMonth(data.month)}</span>
                                  <div className="flex items-center space-x-3">
                                    <Progress value={percentage} className="w-32" />
                                    <span className="text-sm text-gray-600 w-12">{percentage.toFixed(0)}%</span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Alert>
                    <TrendingUp className="w-4 h-4" />
                    <AlertDescription>
                      Add more monthly data entries to see trend analysis and patterns.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}