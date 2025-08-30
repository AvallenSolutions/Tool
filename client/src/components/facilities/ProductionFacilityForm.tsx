import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Building2, Zap, Droplets, Trash2, Settings, Shield, CheckCircle, AlertCircle, Info, Loader2, Calendar, ArrowRight, BarChart3, Factory, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import MonthlyDataTab from "./MonthlyDataTab";

// Production Facility Form Schema
const productionFacilitySchema = z.object({
  // Basic Information
  facilityName: z.string().min(1, "Facility name is required"),
  facilityType: z.enum(['distillery', 'brewery', 'winery', 'cidery', 'blending', 'bottling', 'contract_facility']),
  location: z.string().min(1, "Location is required"),
  isOwnFacility: z.boolean().default(true),
  contractPartnerId: z.string().optional(),
  
  // Production Capacity
  annualCapacityVolume: z.string().refine(val => !val || parseFloat(val) >= 0, "Capacity must be positive").optional(),
  capacityUnit: z.enum(['liters', 'bottles', 'cases', 'kg']).default('liters'),
  operatingDaysPerYear: z.coerce.number().min(1).max(365).default(250),
  shiftsPerDay: z.coerce.number().min(1).max(3).default(1),
  
  // Energy Infrastructure (total facility consumption)
  totalElectricityKwhPerYear: z.string().refine(val => !val || parseFloat(val) >= 0, "Must be positive").optional(),
  totalGasM3PerYear: z.string().refine(val => !val || parseFloat(val) >= 0, "Must be positive").optional(),
  totalSteamKgPerYear: z.string().refine(val => !val || parseFloat(val) >= 0, "Must be positive").optional(),
  totalFuelLitersPerYear: z.string().refine(val => !val || parseFloat(val) >= 0, "Must be positive").optional(),
  renewableEnergyPercent: z.string().refine(val => !val || (parseFloat(val) >= 0 && parseFloat(val) <= 100), "Must be between 0-100").optional(),
  energySource: z.enum(['grid', 'solar', 'wind', 'mixed']).optional(),
  
  // Water Infrastructure (total facility consumption)
  totalProcessWaterLitersPerYear: z.string().refine(val => !val || parseFloat(val) >= 0, "Must be positive").optional(),
  totalCleaningWaterLitersPerYear: z.string().refine(val => !val || parseFloat(val) >= 0, "Must be positive").optional(),
  totalCoolingWaterLitersPerYear: z.string().refine(val => !val || parseFloat(val) >= 0, "Must be positive").optional(),
  waterSource: z.enum(['municipal', 'well', 'surface', 'mixed']).optional(),
  wasteWaterTreatment: z.boolean().default(false),
  waterRecyclingPercent: z.string().refine(val => !val || (parseFloat(val) >= 0 && parseFloat(val) <= 100), "Must be between 0-100").optional(),
  
  // Waste Management (total facility waste)
  totalOrganicWasteKgPerYear: z.string().refine(val => !val || parseFloat(val) >= 0, "Must be positive").optional(),
  totalPackagingWasteKgPerYear: z.string().refine(val => !val || parseFloat(val) >= 0, "Must be positive").optional(),
  totalHazardousWasteKgPerYear: z.string().refine(val => !val || parseFloat(val) >= 0, "Must be positive").optional(),
  wasteRecycledPercent: z.string().refine(val => !val || (parseFloat(val) >= 0 && parseFloat(val) <= 100), "Must be between 0-100").optional(),
  wasteDisposalMethod: z.enum(['recycling', 'landfill', 'incineration', 'composting']).optional(),
  
  // Operational Parameters
  averageUtilizationPercent: z.string().refine(val => !val || (parseFloat(val) >= 0 && parseFloat(val) <= 100), "Must be between 0-100").optional(),
  isPrimaryFacility: z.boolean().default(false),
});

type ProductionFacilityForm = z.infer<typeof productionFacilitySchema>;

interface ProductionFacilityFormProps {
  facilityId?: number;
  existingData?: Partial<ProductionFacilityForm>;
  onComplete?: () => void;
  onCancel?: () => void;
  defaultTab?: string;
}

const facilityTypeOptions = [
  { value: 'distillery', label: 'Distillery' },
  { value: 'brewery', label: 'Brewery' },
  { value: 'winery', label: 'Winery' },
  { value: 'cidery', label: 'Cidery' },
  { value: 'blending', label: 'Blending Facility' },
  { value: 'bottling', label: 'Bottling Plant' },
  { value: 'contract_facility', label: 'Contract Facility' },
];

const energySourceOptions = [
  { value: 'grid', label: 'Grid Electricity' },
  { value: 'solar', label: 'Solar Power' },
  { value: 'wind', label: 'Wind Power' },
  { value: 'mixed', label: 'Mixed Sources' },
];

const waterSourceOptions = [
  { value: 'municipal', label: 'Municipal Water' },
  { value: 'well', label: 'Well Water' },
  { value: 'surface', label: 'Surface Water' },
  { value: 'mixed', label: 'Mixed Sources' },
];

const capacityUnitOptions = [
  { value: 'liters', label: 'Liters' },
  { value: 'bottles', label: 'Bottles' },
  { value: 'cases', label: 'Cases' },
  { value: 'kg', label: 'Kilograms' },
];

const wasteDisposalOptions = [
  { value: 'recycling', label: 'Recycling' },
  { value: 'landfill', label: 'Landfill' },
  { value: 'incineration', label: 'Incineration' },
  { value: 'composting', label: 'Composting' },
];

export default function ProductionFacilityForm({ 
  facilityId, 
  existingData, 
  onComplete, 
  onCancel,
  defaultTab = "basic"
}: ProductionFacilityFormProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Clean existing data to convert null values to empty strings or default values
  const cleanedExistingData = existingData ? {
    ...existingData,
    // Numeric fields - convert null to empty string
    annualCapacityVolume: existingData.annualCapacityVolume || '',
    totalElectricityKwhPerYear: existingData.totalElectricityKwhPerYear || '',
    totalGasM3PerYear: existingData.totalGasM3PerYear || '',
    totalSteamKgPerYear: existingData.totalSteamKgPerYear || '',
    totalFuelLitersPerYear: existingData.totalFuelLitersPerYear || '',
    renewableEnergyPercent: existingData.renewableEnergyPercent || '',
    totalProcessWaterLitersPerYear: existingData.totalProcessWaterLitersPerYear || '',
    totalCleaningWaterLitersPerYear: existingData.totalCleaningWaterLitersPerYear || '',
    totalCoolingWaterLitersPerYear: existingData.totalCoolingWaterLitersPerYear || '',
    waterRecyclingPercent: existingData.waterRecyclingPercent || '',
    totalOrganicWasteKgPerYear: existingData.totalOrganicWasteKgPerYear || '',
    totalPackagingWasteKgPerYear: existingData.totalPackagingWasteKgPerYear || '',
    totalHazardousWasteKgPerYear: existingData.totalHazardousWasteKgPerYear || '',
    wasteRecycledPercent: existingData.wasteRecycledPercent || '',
    averageUtilizationPercent: existingData.averageUtilizationPercent || '',
    // Fix the validation error fields - convert null to appropriate defaults
    contractPartnerId: existingData.contractPartnerId || '',
    waterSource: existingData.waterSource || 'municipal',
    wasteDisposalMethod: existingData.wasteDisposalMethod || 'recycling',
  } : null;

  const form = useForm<ProductionFacilityForm>({
    resolver: zodResolver(productionFacilitySchema),
    defaultValues: cleanedExistingData || {
      facilityName: '',
      facilityType: 'distillery',
      location: '',
      isOwnFacility: true,
      annualCapacityVolume: '',
      capacityUnit: 'liters',
      operatingDaysPerYear: 250,
      shiftsPerDay: 1,
      averageUtilizationPercent: '80',
      isPrimaryFacility: false,
      wasteWaterTreatment: false,
      // Energy consumption defaults
      totalElectricityKwhPerYear: '',
      totalGasM3PerYear: '',
      totalSteamKgPerYear: '',
      totalFuelLitersPerYear: '',
      renewableEnergyPercent: '',
      // Water consumption defaults
      totalProcessWaterLitersPerYear: '',
      totalCleaningWaterLitersPerYear: '',
      totalCoolingWaterLitersPerYear: '',
      waterRecyclingPercent: '',
      // Waste generation defaults
      totalOrganicWasteKgPerYear: '',
      totalPackagingWasteKgPerYear: '',
      totalHazardousWasteKgPerYear: '',
      wasteRecycledPercent: '',
    },
  });

  // Save facility mutation
  const saveFacilityMutation = useMutation({
    mutationFn: async (data: ProductionFacilityForm) => {
      const endpoint = facilityId 
        ? `/api/production-facilities/${facilityId}` 
        : '/api/production-facilities';
      const method = facilityId ? 'PUT' : 'POST';
      
      return apiRequest(method, endpoint, data);
    },
    onSuccess: () => {
      toast({
        title: "Facility Saved",
        description: `Production facility has been ${facilityId ? 'updated' : 'created'} successfully.`,
        className: "bg-[#209d50] text-white border-[#209d50]",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/production-facilities'] });
      onComplete?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save production facility.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ProductionFacilityForm) => {
    setIsSubmitting(true);
    try {
      // Convert empty strings to undefined for numeric fields
      const cleanedData = {
        ...data,
        // Optional ID fields - convert empty string to undefined
        contractPartnerId: data.contractPartnerId || undefined,
        // Numeric measurement fields - convert empty string to undefined  
        annualCapacityVolume: data.annualCapacityVolume || undefined,
        totalElectricityKwhPerYear: data.totalElectricityKwhPerYear || undefined,
        totalGasM3PerYear: data.totalGasM3PerYear || undefined,
        totalSteamKgPerYear: data.totalSteamKgPerYear || undefined,
        totalFuelLitersPerYear: data.totalFuelLitersPerYear || undefined,
        renewableEnergyPercent: data.renewableEnergyPercent || undefined,
        totalProcessWaterLitersPerYear: data.totalProcessWaterLitersPerYear || undefined,
        totalCleaningWaterLitersPerYear: data.totalCleaningWaterLitersPerYear || undefined,
        totalCoolingWaterLitersPerYear: data.totalCoolingWaterLitersPerYear || undefined,
        waterRecyclingPercent: data.waterRecyclingPercent || undefined,
        totalOrganicWasteKgPerYear: data.totalOrganicWasteKgPerYear || undefined,
        totalPackagingWasteKgPerYear: data.totalPackagingWasteKgPerYear || undefined,
        totalHazardousWasteKgPerYear: data.totalHazardousWasteKgPerYear || undefined,
        wasteRecycledPercent: data.wasteRecycledPercent || undefined,
        averageUtilizationPercent: data.averageUtilizationPercent || undefined,
      };
      
      await saveFacilityMutation.mutateAsync(cleanedData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateCompleteness = () => {
    const values = form.getValues();
    const requiredFields = ['facilityName', 'facilityType', 'location', 'annualCapacityVolume'];
    const optionalFields = [
      'totalElectricityKwhPerYear', 'totalGasM3PerYear', 'totalProcessWaterLitersPerYear',
      'totalOrganicWasteKgPerYear', 'renewableEnergyPercent', 'wasteRecycledPercent'
    ];
    
    const requiredComplete = requiredFields.filter(field => {
      const value = values[field as keyof ProductionFacilityForm];
      return value !== undefined && value !== null && value !== '';
    }).length;
    
    const optionalComplete = optionalFields.filter(field => {
      const value = values[field as keyof ProductionFacilityForm];
      return value !== undefined && value !== null && value !== '';
    }).length;
    
    const requiredPercentage = (requiredComplete / requiredFields.length) * 70; // 70% weight for required
    const optionalPercentage = (optionalComplete / optionalFields.length) * 30; // 30% weight for optional
    
    return Math.round(requiredPercentage + optionalPercentage);
  };

  const completeness = calculateCompleteness();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="bg-gradient-to-r from-green-50 to-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-green-600" />
                {facilityId ? 'Edit Production Facility' : 'New Production Facility'}
              </CardTitle>
              <CardDescription>
                Define detailed production metrics for this facility that will feed into product LCA calculations
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`${
                  completeness >= 80 ? 'bg-green-50 text-green-700 border-green-200' :
                  completeness >= 60 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {completeness >= 80 ? <CheckCircle className="w-3 h-3 mr-1" /> : 
                 completeness >= 60 ? <AlertCircle className="w-3 h-3 mr-1" /> :
                 <AlertCircle className="w-3 h-3 mr-1" />}
                {completeness}% Complete
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="operations" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Operations
              </TabsTrigger>
              <TabsTrigger value="monthly-data" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Monthly Data
              </TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Facility Information
                  </CardTitle>
                  <CardDescription>
                    Basic details about your production facility
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="facilityName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Facility Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Main Distillery" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="facilityType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Facility Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select facility type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {facilityTypeOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Glasgow, Scotland" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="annualCapacityVolume"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Annual Capacity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              placeholder="0"
                              {...field}
                              onChange={e => field.onChange(e.target.value || "")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="capacityUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Capacity Unit</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {capacityUnitOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="averageUtilizationPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Utilization %</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              min="0"
                              max="100"
                              placeholder="80"
                              {...field}
                              onChange={e => field.onChange(e.target.value || "80")}
                            />
                          </FormControl>
                          <FormDescription>
                            Average capacity utilization
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <FormField
                      control={form.control}
                      name="isPrimaryFacility"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Primary Facility
                            </FormLabel>
                            <FormDescription>
                              Mark as the main production facility for your company
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Operations Tab */}
            <TabsContent value="operations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Operational Parameters
                  </CardTitle>
                  <CardDescription>
                    Operating schedules and capacity utilization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="operatingDaysPerYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Operating Days per Year</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              min="1"
                              max="365"
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value) || 250)}
                            />
                          </FormControl>
                          <FormDescription>
                            Number of operational days annually
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="shiftsPerDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shifts per Day</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              min="1"
                              max="3"
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormDescription>
                            Number of production shifts per day
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Monthly Data Tab */}
            <TabsContent value="monthly-data" className="space-y-6">
              <MonthlyDataTab 
                facilityId={facilityId} 
                facilityName={existingData?.facilityName}
              />
            </TabsContent>
          </Tabs>

          {/* Form Actions */}
          <div className="flex justify-between items-center pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {facilityId ? 'Update Facility' : 'Create Facility'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
