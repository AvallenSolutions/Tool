import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Leaf, Truck, Factory, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Simple LCA data schema focusing on essential fields only
const simpleLCASchema = z.object({
  // Agriculture - Most Important for Spirits
  agriculture: z.object({
    mainCropType: z.string().min(1, "Please specify your main ingredient"),
    yieldTonPerHectare: z.number().min(0.1, "Yield must be positive").max(100, "Please enter a realistic yield"),
    dieselLPerHectare: z.number().min(0, "Fuel use cannot be negative").max(1000, "Please check fuel amount"),
    sequestrationTonCo2PerTonCrop: z.number().min(0).max(10).optional(),
  }),
  
  // Transport - Simple distance and mode
  inboundTransport: z.object({
    distanceKm: z.number().min(0, "Distance cannot be negative").max(25000, "Please check distance"),
    mode: z.enum(['truck', 'rail', 'ship', 'air']),
  }),
  
  // Processing - Key production metrics
  processing: z.object({
    waterM3PerTonCrop: z.number().min(0, "Water use cannot be negative").max(100, "Please check water amount"),
    electricityKwhPerTonCrop: z.number().min(0, "Electricity use cannot be negative").max(10000, "Please check electricity amount"),
    netWaterUseLPerBottle: z.number().min(0, "Water use cannot be negative").max(20, "Please check water per bottle"),
    // Spirit-specific fields (optional)
    spiritYieldLPerTonCrop: z.number().min(0).max(1000).optional(),
    angelsSharePercentage: z.number().min(0).max(50).optional(),
  }),
});

type SimpleLCAForm = z.infer<typeof simpleLCASchema>;

interface SimpleLCAFormProps {
  productId: number;
  existingData?: any;
  onComplete?: () => void;
  className?: string;
}

// Helper text and defaults for common crops
const cropDefaults: Record<string, Partial<SimpleLCAForm['agriculture']>> = {
  'barley': { yieldTonPerHectare: 3.5, dieselLPerHectare: 120 },
  'wheat': { yieldTonPerHectare: 4.0, dieselLPerHectare: 130 },
  'corn': { yieldTonPerHectare: 8.0, dieselLPerHectare: 150 },
  'grapes': { yieldTonPerHectare: 12.0, dieselLPerHectare: 200 },
  'apples': { yieldTonPerHectare: 25.0, dieselLPerHectare: 180 },
  'sugarcane': { yieldTonPerHectare: 60.0, dieselLPerHectare: 300 },
};

export default function SimpleLCAForm({ productId, existingData, onComplete, className }: SimpleLCAFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current reporting period (simplified - use current year)
  const currentYear = new Date().getFullYear();
  const reportingPeriodStart = `${currentYear}-01-01`;
  const reportingPeriodEnd = `${currentYear}-12-31`;

  const form = useForm<SimpleLCAForm>({
    resolver: zodResolver(simpleLCASchema),
    defaultValues: existingData || {
      agriculture: {
        mainCropType: '',
        yieldTonPerHectare: 3.5,
        dieselLPerHectare: 120,
        sequestrationTonCo2PerTonCrop: 0,
      },
      inboundTransport: {
        distanceKm: 100,
        mode: 'truck',
      },
      processing: {
        waterM3PerTonCrop: 5,
        electricityKwhPerTonCrop: 500,
        netWaterUseLPerBottle: 3,
        spiritYieldLPerTonCrop: 40,
        angelsSharePercentage: 2,
      },
    },
  });

  // Auto-update agriculture defaults when crop type changes
  const selectedCrop = form.watch('agriculture.mainCropType');
  const handleCropChange = (crop: string) => {
    form.setValue('agriculture.mainCropType', crop);
    const defaults = cropDefaults[crop.toLowerCase()];
    if (defaults) {
      if (defaults.yieldTonPerHectare) {
        form.setValue('agriculture.yieldTonPerHectare', defaults.yieldTonPerHectare);
      }
      if (defaults.dieselLPerHectare) {
        form.setValue('agriculture.dieselLPerHectare', defaults.dieselLPerHectare);
      }
    }
  };

  const saveLCAMutation = useMutation({
    mutationFn: async (data: SimpleLCAForm) => {
      const lcaData = {
        productId,
        reportingPeriodStart,
        reportingPeriodEnd,
        lcaData: {
          ...data,
          packaging: [], // Will be filled from product form
        },
        status: 'complete',
      };
      
      return apiRequest('/api/lca-questionnaires', 'POST', lcaData);
    },
    onSuccess: () => {
      toast({
        title: "LCA Data Saved",
        description: "Your environmental data has been recorded successfully.",
        className: "bg-[#209d50] text-white border-[#209d50]",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/lca-questionnaires'] });
      onComplete?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving Data",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: SimpleLCAForm) => {
    setIsSubmitting(true);
    try {
      await saveLCAMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-green-600" />
            Environmental Impact Assessment
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Answer these 3 simple sections to calculate your product's environmental footprint.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Section 1: Agriculture */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Leaf className="h-4 w-4 text-green-600" />
                  1. Main Ingredient
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="mainCropType">What is your main ingredient?</Label>
                  <Select 
                    value={form.watch('agriculture.mainCropType')} 
                    onValueChange={handleCropChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your main ingredient" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="barley">Barley</SelectItem>
                      <SelectItem value="wheat">Wheat</SelectItem>
                      <SelectItem value="corn">Corn/Maize</SelectItem>
                      <SelectItem value="grapes">Grapes</SelectItem>
                      <SelectItem value="apples">Apples</SelectItem>
                      <SelectItem value="sugarcane">Sugarcane</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.agriculture?.mainCropType && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.agriculture.mainCropType.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="yieldTonPerHectare">Farm yield (tons per hectare)</Label>
                    <Input
                      id="yieldTonPerHectare"
                      type="number"
                      step="0.1"
                      {...form.register('agriculture.yieldTonPerHectare', { valueAsNumber: true })}
                    />
                    {form.formState.errors.agriculture?.yieldTonPerHectare && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.agriculture.yieldTonPerHectare.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="dieselLPerHectare">Fuel use (liters per hectare)</Label>
                    <Input
                      id="dieselLPerHectare"
                      type="number"
                      step="1"
                      {...form.register('agriculture.dieselLPerHectare', { valueAsNumber: true })}
                    />
                    {form.formState.errors.agriculture?.dieselLPerHectare && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.agriculture.dieselLPerHectare.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Transport */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Truck className="h-4 w-4 text-blue-600" />
                  2. Transportation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="distanceKm">Distance from farm (km)</Label>
                    <Input
                      id="distanceKm"
                      type="number"
                      step="1"
                      {...form.register('inboundTransport.distanceKm', { valueAsNumber: true })}
                    />
                    {form.formState.errors.inboundTransport?.distanceKm && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.inboundTransport.distanceKm.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="transportMode">Transport method</Label>
                    <Select 
                      value={form.watch('inboundTransport.mode')} 
                      onValueChange={(value) => form.setValue('inboundTransport.mode', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="truck">Truck</SelectItem>
                        <SelectItem value="rail">Rail</SelectItem>
                        <SelectItem value="ship">Ship</SelectItem>
                        <SelectItem value="air">Air</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Processing */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Factory className="h-4 w-4 text-purple-600" />
                  3. Production Process
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="waterM3PerTonCrop">Water use (m³ per ton of ingredient)</Label>
                    <Input
                      id="waterM3PerTonCrop"
                      type="number"
                      step="0.1"
                      {...form.register('processing.waterM3PerTonCrop', { valueAsNumber: true })}
                    />
                    {form.formState.errors.processing?.waterM3PerTonCrop && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.processing.waterM3PerTonCrop.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="electricityKwhPerTonCrop">Electricity (kWh per ton of ingredient)</Label>
                    <Input
                      id="electricityKwhPerTonCrop"
                      type="number"
                      step="1"
                      {...form.register('processing.electricityKwhPerTonCrop', { valueAsNumber: true })}
                    />
                    {form.formState.errors.processing?.electricityKwhPerTonCrop && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.processing.electricityKwhPerTonCrop.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="netWaterUseLPerBottle">Total water per bottle (liters)</Label>
                  <Input
                    id="netWaterUseLPerBottle"
                    type="number"
                    step="0.1"
                    {...form.register('processing.netWaterUseLPerBottle', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Include process water, cleaning, and cooling
                  </p>
                  {form.formState.errors.processing?.netWaterUseLPerBottle && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.processing.netWaterUseLPerBottle.message}
                    </p>
                  )}
                </div>

                {selectedCrop && ['barley', 'wheat', 'corn'].includes(selectedCrop.toLowerCase()) && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div>
                      <Label htmlFor="spiritYieldLPerTonCrop">Spirit yield (liters per ton)</Label>
                      <Input
                        id="spiritYieldLPerTonCrop"
                        type="number"
                        step="1"
                        {...form.register('processing.spiritYieldLPerTonCrop', { valueAsNumber: true })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="angelsSharePercentage">Angel's share (%)</Label>
                      <Input
                        id="angelsSharePercentage"
                        type="number"
                        step="0.1"
                        {...form.register('processing.angelsSharePercentage', { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-[#209d50] hover:bg-[#1a7d40] text-white min-w-[120px]"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save LCA Data
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}