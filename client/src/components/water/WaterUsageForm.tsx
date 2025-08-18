import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, Upload } from 'lucide-react';

interface WaterUsageData {
  total_consumption_m3: number;
  reporting_period?: {
    start: string;
    end: string;
  };
}

export default function WaterUsageForm() {
  const [waterConsumption, setWaterConsumption] = useState<number | ''>('');
  const [dataSource, setDataSource] = useState<File | null>(null);
  const { toast } = useToast();

  // Get current water consumption data
  const { data: currentWaterData, isLoading: waterDataLoading } = useQuery({
    queryKey: ['/api/company/water-footprint'],
    enabled: true
  });

  // Mutation for submitting water consumption data
  const waterMutation = useMutation({
    mutationFn: async (data: WaterUsageData) => {
      const response = await fetch('/api/company/water', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to save water consumption data');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Water consumption data saved successfully'
      });
      // Invalidate and refetch water footprint data
      queryClient.invalidateQueries({ queryKey: ['/api/company/water-footprint'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save water consumption data',
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!waterConsumption || waterConsumption <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid water consumption amount',
        variant: 'destructive'
      });
      return;
    }

    const submissionData: WaterUsageData = {
      total_consumption_m3: Number(waterConsumption)
    };

    waterMutation.mutate(submissionData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (PDF, images)
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a PDF or image file',
          variant: 'destructive'
        });
        return;
      }
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Please upload a file smaller than 10MB',
          variant: 'destructive'
        });
        return;
      }
      
      setDataSource(file);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Water Consumption Input */}
        <div className="space-y-2">
          <Label htmlFor="waterConsumption" className="text-sm font-medium">
            Total Metered Water Consumption (m³) *
          </Label>
          <Input
            id="waterConsumption"
            type="number"
            step="0.01"
            min="0"
            value={waterConsumption}
            onChange={(e) => setWaterConsumption(e.target.value ? Number(e.target.value) : '')}
            placeholder="e.g., 1500"
            required
            className="w-full"
          />
          <p className="text-xs text-gray-600">
            Enter the total from your utility bill for the reporting period
          </p>
        </div>

        {/* Data Source File Upload */}
        <div className="space-y-2">
          <Label htmlFor="dataSource" className="text-sm font-medium">
            Data Source (Optional)
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="dataSource"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('dataSource')?.click()}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Water Bill
            </Button>
            {dataSource && (
              <span className="text-sm text-green-600">
                {dataSource.name}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600">
            Upload your water utility bill for reference (PDF or image)
          </p>
        </div>
      </div>

      {/* Current Data Display */}
      {currentWaterData?.data && (
        <div className="bg-green-50 p-3 rounded border">
          <h5 className="font-medium text-sm text-green-800 mb-2">Current Water Footprint Breakdown:</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-gray-600">Total:</span>
              <div className="font-medium">{(currentWaterData.data as any)?.total_m3?.toFixed(1) || '0.0'} m³</div>
            </div>
            <div>
              <span className="text-gray-600">Agricultural:</span>
              <div className="font-medium">{(currentWaterData.data as any)?.agricultural_water_m3?.toFixed(1) || '0.0'} m³</div>
            </div>
            <div>
              <span className="text-gray-600">Processing:</span>
              <div className="font-medium">{(currentWaterData.data as any)?.processing_and_dilution_water_m3?.toFixed(1) || '0.0'} m³</div>
            </div>
            <div>
              <span className="text-gray-600">Operational:</span>
              <div className="font-medium">{(currentWaterData.data as any)?.net_operational_water_m3?.toFixed(1) || '0.0'} m³</div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={waterMutation.isPending || !waterConsumption}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {waterMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Water Data'
          )}
        </Button>
      </div>
    </form>
  );
}