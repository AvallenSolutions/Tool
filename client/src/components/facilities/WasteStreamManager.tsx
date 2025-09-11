import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, X, Trash2, Recycle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';

export interface WasteStream {
  id?: string;
  monthlyFacilityDataId: string;
  wasteType: string;
  weightKg: number;
  disposalRoute: string;
  createdAt?: string;
  updatedAt?: string;
}

interface WasteStreamManagerProps {
  monthlyFacilityDataId: string;
  onWasteStreamsChange: (wasteStreams: WasteStream[]) => void;
}

const WASTE_TYPES = [
  'General Waste (to Landfill)',
  'Dry Mixed Recycling (DMR)',
  'Glass Recycling',
  'Organic Waste',
  'Hazardous Waste'
];

const getDisposalRoutes = (wasteType: string): string[] => {
  const baseRoutes = ['Landfill', 'Recycling'];
  
  if (wasteType === 'Organic Waste') {
    return [...baseRoutes, 'Anaerobic Digestion', 'Composting', 'Animal Feed'];
  }
  
  return baseRoutes;
};

const getDefaultDisposalRoute = (wasteType: string): string => {
  switch (wasteType) {
    case 'General Waste (to Landfill)':
      return 'Landfill';
    case 'Dry Mixed Recycling (DMR)':
    case 'Glass Recycling':
      return 'Recycling';
    case 'Organic Waste':
      return 'Composting';
    case 'Hazardous Waste':
      return 'Landfill';
    default:
      return 'Landfill';
  }
};

export default function WasteStreamManager({ monthlyFacilityDataId, onWasteStreamsChange }: WasteStreamManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [localWasteStreams, setLocalWasteStreams] = useState<WasteStream[]>([]);
  const [errors, setErrors] = useState<{[key: number]: string}>({});

  // Query to load existing waste streams
  const { data: existingWasteStreams, isLoading } = useQuery({
    queryKey: [`/api/time-series/monthly-facility/${monthlyFacilityDataId}/waste-streams`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/time-series/monthly-facility/${monthlyFacilityDataId}/waste-streams`);
      return response.json();
    },
    enabled: !!monthlyFacilityDataId,
    retry: false,
  });

  // Initialize local state when data loads
  useEffect(() => {
    if (existingWasteStreams && Array.isArray(existingWasteStreams)) {
      setLocalWasteStreams(existingWasteStreams);
      onWasteStreamsChange(existingWasteStreams);
    }
  }, [existingWasteStreams, onWasteStreamsChange]);

  // Update parent component when local state changes
  useEffect(() => {
    onWasteStreamsChange(localWasteStreams);
  }, [localWasteStreams, onWasteStreamsChange]);

  const addWasteStream = () => {
    const newWasteStream: WasteStream = {
      monthlyFacilityDataId,
      wasteType: 'General Waste (to Landfill)',
      weightKg: 0,
      disposalRoute: 'Landfill'
    };
    
    setLocalWasteStreams(prev => [...prev, newWasteStream]);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[localWasteStreams.length];
      return newErrors;
    });
  };

  const removeWasteStream = (index: number) => {
    setLocalWasteStreams(prev => prev.filter((_, i) => i !== index));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[index];
      // Shift errors for indices after the removed one
      const shiftedErrors: {[key: number]: string} = {};
      Object.entries(newErrors).forEach(([key, value]) => {
        const numKey = parseInt(key);
        if (numKey > index) {
          shiftedErrors[numKey - 1] = value;
        } else if (numKey < index) {
          shiftedErrors[numKey] = value;
        }
      });
      return shiftedErrors;
    });
  };

  const updateWasteStream = (index: number, updates: Partial<WasteStream>) => {
    setLocalWasteStreams(prev => prev.map((stream, i) => {
      if (i === index) {
        const updated = { ...stream, ...updates };
        
        // Auto-update disposal route when waste type changes
        if (updates.wasteType && updates.wasteType !== stream.wasteType) {
          updated.disposalRoute = getDefaultDisposalRoute(updates.wasteType);
        }
        
        return updated;
      }
      return stream;
    }));

    // Clear error for this field if it's valid
    if (updates.weightKg !== undefined && updates.weightKg > 0) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[index];
        return newErrors;
      });
    }
  };

  const validateWasteStream = (stream: WasteStream, index: number): string | null => {
    if (!stream.wasteType) {
      return 'Waste type is required';
    }
    if (!WASTE_TYPES.includes(stream.wasteType)) {
      return 'Invalid waste type selected';
    }
    if (stream.weightKg <= 0) {
      return 'Weight must be greater than 0';
    }
    if (!stream.disposalRoute) {
      return 'Disposal route is required';
    }
    if (!getDisposalRoutes(stream.wasteType).includes(stream.disposalRoute)) {
      return 'Invalid disposal route for this waste type';
    }
    return null;
  };

  const validateAllStreams = (): boolean => {
    const newErrors: {[key: number]: string} = {};
    let hasErrors = false;

    localWasteStreams.forEach((stream, index) => {
      const error = validateWasteStream(stream, index);
      if (error) {
        newErrors[index] = error;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  };

  // Public method to get validation status and data
  const getWasteStreamsData = () => {
    const isValid = validateAllStreams();
    return {
      isValid,
      wasteStreams: localWasteStreams,
      errors
    };
  };

  // Expose validation method to parent component
  useEffect(() => {
    // Add validation method to the component for parent access
    if (onWasteStreamsChange) {
      (onWasteStreamsChange as any).validate = getWasteStreamsData;
    }
  }, [localWasteStreams, onWasteStreamsChange]);

  const getTotalWeightByType = () => {
    const totals: {[key: string]: number} = {};
    localWasteStreams.forEach(stream => {
      totals[stream.wasteType] = (totals[stream.wasteType] || 0) + stream.weightKg;
    });
    return totals;
  };

  const getTotalWeightByRoute = () => {
    const totals: {[key: string]: number} = {};
    localWasteStreams.forEach(stream => {
      totals[stream.disposalRoute] = (totals[stream.disposalRoute] || 0) + stream.weightKg;
    });
    return totals;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-800">Waste Streams</h4>
          <div className="animate-pulse h-8 w-32 bg-gray-200 rounded"></div>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-800">Waste Streams</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addWasteStream}
          className="flex items-center gap-2"
          data-testid="button-add-waste-stream"
        >
          <Plus className="w-4 h-4" />
          Add Waste Stream
        </Button>
      </div>

      {localWasteStreams.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <Recycle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">No waste streams added yet</p>
          <p className="text-xs text-gray-500 mt-1">Click "Add Waste Stream" to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {localWasteStreams.map((stream, index) => (
            <Card key={index} className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-700">Waste Type</Label>
                    <Select
                      value={stream.wasteType}
                      onValueChange={(value) => updateWasteStream(index, { wasteType: value })}
                    >
                      <SelectTrigger data-testid={`select-waste-type-${index}`}>
                        <SelectValue placeholder="Select waste type" />
                      </SelectTrigger>
                      <SelectContent>
                        {WASTE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-700">Weight (kg)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={stream.weightKg || ''}
                      onChange={(e) => updateWasteStream(index, { 
                        weightKg: parseFloat(e.target.value) || 0 
                      })}
                      data-testid={`input-weight-${index}`}
                      className={errors[index] ? 'border-red-500' : ''}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-700">Disposal Route</Label>
                    <Select
                      value={stream.disposalRoute}
                      onValueChange={(value) => updateWasteStream(index, { disposalRoute: value })}
                    >
                      <SelectTrigger data-testid={`select-disposal-route-${index}`}>
                        <SelectValue placeholder="Select disposal route" />
                      </SelectTrigger>
                      <SelectContent>
                        {getDisposalRoutes(stream.wasteType).map((route) => (
                          <SelectItem key={route} value={route}>
                            {route}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeWasteStream(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid={`button-remove-waste-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {errors[index] && (
                  <Alert className="mt-3 border-red-200 bg-red-50">
                    <AlertDescription className="text-red-700 text-sm">
                      {errors[index]}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {localWasteStreams.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-800">Waste Stream Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-medium text-blue-700 mb-2">By Waste Type</h5>
                {Object.entries(getTotalWeightByType()).map(([type, weight]) => (
                  <div key={type} className="flex justify-between text-blue-600">
                    <span className="truncate mr-2">{type}</span>
                    <span className="font-medium">{weight.toFixed(1)} kg</span>
                  </div>
                ))}
              </div>
              <div>
                <h5 className="font-medium text-blue-700 mb-2">By Disposal Route</h5>
                {Object.entries(getTotalWeightByRoute()).map(([route, weight]) => (
                  <div key={route} className="flex justify-between text-blue-600">
                    <span className="truncate mr-2">{route}</span>
                    <span className="font-medium">{weight.toFixed(1)} kg</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="flex justify-between font-medium text-blue-800">
                <span>Total Waste</span>
                <span>
                  {localWasteStreams.reduce((sum, stream) => sum + stream.weightKg, 0).toFixed(1)} kg
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}