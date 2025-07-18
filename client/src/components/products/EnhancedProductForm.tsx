import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  X, 
  Package, 
  Leaf, 
  Droplets, 
  Truck, 
  Factory, 
  Recycle,
  AlertCircle,
  Info,
  Save,
  CheckCircle,
  Upload,
  Camera
} from 'lucide-react';

// Enhanced validation schema for comprehensive LCA data
const enhancedProductSchema = z.object({
  // Basic Information
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  type: z.enum(['spirit', 'wine', 'beer', 'non-alcoholic', 'cider', 'liqueur', 'other']),
  volume: z.string().min(1, "Volume is required"),
  description: z.string().optional(),
  productImage: z.string().optional(), // Product photo URL
  
  // Production Information
  productionModel: z.enum(['own', 'contract', 'hybrid']),
  annualProductionVolume: z.number().min(0, "Production volume must be positive"),
  productionUnit: z.enum(['bottles', 'liters', 'cases', 'kg']),
  
  // Detailed Ingredients
  ingredients: z.array(z.object({
    name: z.string().min(1, "Ingredient name is required"),
    type: z.enum(['grain', 'fruit', 'botanical', 'additive', 'water', 'yeast', 'other']),
    amount: z.number().min(0, "Amount must be positive"),
    unit: z.string().min(1, "Unit is required"),
    origin: z.string().optional(),
    organicCertified: z.boolean().default(false),
    transportDistance: z.number().min(0).optional(),
    transportMode: z.enum(['truck', 'rail', 'ship', 'air', 'pipeline']).optional(),
    supplier: z.string().optional(),
    processingMethod: z.string().optional(),
  })).min(1, "At least one ingredient is required"),
  
  // Packaging Details
  packaging: z.object({
    // Primary Packaging (Bottle/Container)
    primaryContainer: z.object({
      material: z.enum(['glass', 'aluminum', 'pet', 'hdpe', 'paperboard', 'tetrapack', 'bag-in-box']),
      weight: z.number().min(0, "Weight must be positive"),
      recycledContent: z.number().min(0).max(100, "Recycled content must be 0-100%"),
      recyclability: z.enum(['fully-recyclable', 'partially-recyclable', 'not-recyclable']),
      color: z.string().optional(),
      thickness: z.number().min(0).optional(),
    }),
    
    // Labels & Printing
    labeling: z.object({
      labelMaterial: z.enum(['paper', 'plastic', 'metal', 'fabric', 'none']),
      labelWeight: z.number().min(0),
      printingMethod: z.enum(['digital', 'offset', 'flexographic', 'screen', 'none']).optional(),
      inkType: z.enum(['water-based', 'solvent-based', 'uv-cured', 'eco-friendly', 'none']).optional(),
      labelSize: z.number().min(0).optional(),
    }),
    
    // Closure System
    closure: z.object({
      closureType: z.enum(['cork', 'screw-cap', 'crown-cap', 'can-top', 'pump', 'none']),
      material: z.enum(['aluminum', 'plastic', 'cork', 'synthetic-cork', 'other']),
      weight: z.number().min(0),
      hasLiner: z.boolean().default(false),
      linerMaterial: z.string().optional(),
    }),
    
    // Secondary Packaging
    secondaryPackaging: z.object({
      hasSecondaryPackaging: z.boolean().default(false),
      boxMaterial: z.enum(['cardboard', 'plastic', 'wood', 'metal', 'none']).optional(),
      boxWeight: z.number().min(0).optional(),
      fillerMaterial: z.enum(['foam', 'paper', 'plastic', 'none']).optional(),
      fillerWeight: z.number().min(0).optional(),
    }),
  }),
  
  // Production Process Details
  production: z.object({
    // Energy Consumption
    energyConsumption: z.object({
      electricityKwh: z.number().min(0),
      gasM3: z.number().min(0),
      steamKg: z.number().min(0),
      fuelLiters: z.number().min(0),
      renewableEnergyPercent: z.number().min(0).max(100),
    }),
    
    // Water Usage
    waterUsage: z.object({
      processWaterLiters: z.number().min(0),
      cleaningWaterLiters: z.number().min(0),
      coolingWaterLiters: z.number().min(0),
      wasteWaterTreatment: z.boolean().default(false),
    }),
    
    // Waste Generation
    wasteGeneration: z.object({
      organicWasteKg: z.number().min(0),
      packagingWasteKg: z.number().min(0),
      hazardousWasteKg: z.number().min(0),
      wasteRecycledPercent: z.number().min(0).max(100),
    }),
    
    // Production Methods
    productionMethods: z.object({
      fermentationMethod: z.enum(['traditional', 'controlled', 'wild', 'mixed', 'none']).optional(),
      distillationMethod: z.enum(['pot-still', 'column-still', 'hybrid', 'none']).optional(),
      agingProcess: z.enum(['oak-barrel', 'steel-tank', 'concrete', 'clay', 'none']).optional(),
      agingDurationMonths: z.number().min(0).optional(),
      filtrationMethod: z.enum(['mechanical', 'chemical', 'carbon', 'none']).optional(),
    }),
  }),
  
  // Transportation & Distribution
  distribution: z.object({
    averageTransportDistance: z.number().min(0),
    primaryTransportMode: z.enum(['truck', 'rail', 'ship', 'air', 'pipeline']),
    distributionCenters: z.number().min(0),
    coldChainRequired: z.boolean().default(false),
    packagingEfficiency: z.number().min(0).max(100), // bottles per transport unit
  }),
  
  // End of Life
  endOfLife: z.object({
    returnableContainer: z.boolean().default(false),
    recyclingRate: z.number().min(0).max(100),
    disposalMethod: z.enum(['recycling', 'landfill', 'incineration', 'composting', 'mixed']),
    consumerEducation: z.boolean().default(false),
  }),
  
  // Quality & Certifications
  certifications: z.array(z.enum([
    'organic', 'fair-trade', 'carbon-neutral', 'b-corp', 'iso-14001', 
    'sustainable-packaging', 'renewable-energy', 'water-stewardship', 'other'
  ])).default([]),
  
  // Status
  status: z.enum(['active', 'discontinued', 'development']).default('active'),
  isMainProduct: z.boolean().default(false),
});

type EnhancedProductForm = z.infer<typeof enhancedProductSchema>;

interface EnhancedProductFormProps {
  initialData?: any; // Database product data
  onSubmit: (data: EnhancedProductForm) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
}



export default function EnhancedProductForm({ 
  initialData, 
  onSubmit, 
  onCancel,
  mode = 'create'
}: EnhancedProductFormProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please choose an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setUploadedImage(imageUrl);
        form.setValue('productImage', imageUrl);
        toast({
          title: "Photo uploaded",
          description: "Product photo uploaded successfully",
        });
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Transform database data for editing mode
  const getInitialFormData = () => {
    const baseDefaults = {
      name: '',
      sku: '',
      type: 'spirit' as const,
      volume: '',
      description: '',
      productionModel: 'own' as const,
      annualProductionVolume: 0,
      productionUnit: 'bottles' as const,
      ingredients: [{ 
        name: '', 
        type: 'grain' as const, 
        amount: 0, 
        unit: 'kg', 
        organicCertified: false 
      }],
      packaging: {
        primaryContainer: {
          material: 'glass' as const,
          weight: 0,
          recycledContent: 0,
          recyclability: 'fully-recyclable' as const,
        },
        labeling: {
          labelMaterial: 'paper' as const,
          labelWeight: 0,
        },
        closure: {
          closureType: 'cork' as const,
          material: 'cork' as const,
          weight: 0,
          hasLiner: false,
        },
        secondaryPackaging: {
          hasSecondaryPackaging: false,
          boxWeight: 0,
          fillerWeight: 0,
        },
      },
      production: {
        energyConsumption: {
          electricityKwh: 0,
          gasM3: 0,
          steamKg: 0,
          fuelLiters: 0,
          renewableEnergyPercent: 0,
        },
        waterUsage: {
          processWaterLiters: 0,
          cleaningWaterLiters: 0,
          coolingWaterLiters: 0,
          wasteWaterTreatment: false,
        },
        wasteGeneration: {
          organicWasteKg: 0,
          packagingWasteKg: 0,
          hazardousWasteKg: 0,
          wasteRecycledPercent: 0,
        },
        productionMethods: {},
      },
      distribution: {
        averageTransportDistance: 0,
        primaryTransportMode: 'truck' as const,
        distributionCenters: 0,
        coldChainRequired: false,
        packagingEfficiency: 0,
      },
      endOfLife: {
        returnableContainer: false,
        recyclingRate: 0,
        disposalMethod: 'recycling' as const,
        consumerEducation: false,
      },
      certifications: [] as string[],
      status: 'active' as const,
      isMainProduct: false,
    };

    if (!initialData) return baseDefaults;

    // Transform database data to form structure
    return {
      ...baseDefaults,
      name: initialData.name || '',
      sku: initialData.sku || '',
      type: initialData.type || 'spirit',
      volume: initialData.volume || '',
      description: initialData.description || '',
      productImage: initialData.packShotUrl || '',
      productionModel: initialData.productionModel || 'own',
      annualProductionVolume: initialData.annualProductionVolume || 0,
      productionUnit: initialData.productionUnit || 'bottles',
      ingredients: initialData.ingredients || baseDefaults.ingredients,
      packaging: {
        primaryContainer: {
          material: initialData.bottleMaterial || 'glass',
          weight: initialData.bottleWeight || 0,
          recycledContent: initialData.bottleRecycledContent || 0,
          recyclability: initialData.bottleRecyclability || 'fully-recyclable',
          color: initialData.bottleColor || '',
          thickness: initialData.bottleThickness || 0,
        },
        labeling: {
          labelMaterial: initialData.labelMaterial || 'paper',
          labelWeight: initialData.labelWeight || 0,
          printingMethod: initialData.labelPrintingMethod || 'digital',
          inkType: initialData.labelInkType || 'water-based',
          labelSize: initialData.labelSize || 0,
        },
        closure: {
          closureType: initialData.closureType || 'cork',
          material: initialData.closureMaterial || 'cork',
          weight: initialData.closureWeight || 0,
          hasLiner: initialData.hasBuiltInClosure || false,
          linerMaterial: initialData.linerMaterial || '',
        },
        secondaryPackaging: {
          hasSecondaryPackaging: initialData.hasSecondaryPackaging || false,
          boxMaterial: initialData.boxMaterial || 'cardboard',
          boxWeight: initialData.boxWeight || 0,
          fillerMaterial: initialData.fillerMaterial || 'paper',
          fillerWeight: initialData.fillerWeight || 0,
        },
      },
      production: {
        energyConsumption: {
          electricityKwh: initialData.electricityKwh || 0,
          gasM3: initialData.gasM3 || 0,
          steamKg: initialData.steamKg || 0,
          fuelLiters: initialData.fuelLiters || 0,
          renewableEnergyPercent: initialData.renewableEnergyPercent || 0,
        },
        waterUsage: {
          processWaterLiters: initialData.processWaterLiters || 0,
          cleaningWaterLiters: initialData.cleaningWaterLiters || 0,
          coolingWaterLiters: initialData.coolingWaterLiters || 0,
          wasteWaterTreatment: initialData.wasteWaterTreatment || false,
        },
        wasteGeneration: {
          organicWasteKg: initialData.organicWasteKg || 0,
          packagingWasteKg: initialData.packagingWasteKg || 0,
          hazardousWasteKg: initialData.hazardousWasteKg || 0,
          wasteRecycledPercent: initialData.wasteRecycledPercent || 0,
        },
        productionMethods: initialData.productionMethods || {},
      },
      distribution: {
        averageTransportDistance: initialData.averageTransportDistance || 0,
        primaryTransportMode: initialData.primaryTransportMode || 'truck',
        distributionCenters: initialData.distributionCenters || 0,
        coldChainRequired: initialData.coldChainRequired || false,
        packagingEfficiency: initialData.packagingEfficiency || 0,
      },
      endOfLife: {
        returnableContainer: initialData.returnableContainer || false,
        recyclingRate: initialData.recyclingRate || 0,
        disposalMethod: initialData.disposalMethod || 'recycling',
        consumerEducation: initialData.consumerEducation || false,
      },
      certifications: initialData.certifications || [],
      status: initialData.status || 'active',
      isMainProduct: initialData.isMainProduct || false,
    };
  };
  
  const form = useForm<EnhancedProductForm>({
    resolver: zodResolver(enhancedProductSchema),
    defaultValues: getInitialFormData(),
  });
  
  const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient } = useFieldArray({
    control: form.control,
    name: 'ingredients',
  });

  // Initialize uploaded image from initial data
  useEffect(() => {
    if (initialData?.packShotUrl) {
      setUploadedImage(initialData.packShotUrl);
    }
  }, [initialData]);
  
  const handleSubmit = (data: EnhancedProductForm) => {
    setValidationErrors({});
    onSubmit(data);
  };
  
  const handleValidate = () => {
    const formData = form.getValues();
    const result = enhancedProductSchema.safeParse(formData);
    
    if (!result.success) {
      const errors: Record<string, string[]> = {};
      result.error.errors.forEach(error => {
        const path = error.path.join('.');
        if (!errors[path]) errors[path] = [];
        errors[path].push(error.message);
      });
      setValidationErrors(errors);
      
      // Show detailed validation errors
      const errorList = Object.entries(errors).map(([field, messages]) => 
        `${field}: ${messages.join(', ')}`
      ).join('\n');
      
      toast({
        title: "Validation Issues Found",
        description: `Found ${Object.keys(errors).length} validation issues. Check the highlighted fields and correct the errors.`,
        variant: "destructive",
      });
      return false;
    }
    
    toast({
      title: "Validation Passed",
      description: "All product data is valid and ready for LCA calculation.",
    });
    return true;
  };
  
  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Package },
    { id: 'ingredients', label: 'Ingredients', icon: Leaf },
    { id: 'packaging', label: 'Packaging', icon: Package },
    { id: 'production', label: 'Production', icon: Factory },
    { id: 'distribution', label: 'Distribution', icon: Truck },
    { id: 'endoflife', label: 'End of Life', icon: Recycle },
  ];
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-6 h-6 text-avallen-green" />
            {mode === 'create' ? 'Create Enhanced Product' : 'Edit Product'}
          </CardTitle>
          <p className="text-sm text-gray-600">
            Comprehensive product data collection for accurate LCA calculations
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1">
                    <tab.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {/* Basic Information Tab */}
              <TabsContent value="basic" className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    <h4 className="font-medium text-blue-900">Basic Information</h4>
                  </div>
                  <p className="text-sm text-blue-700">
                    Provide essential product details including name, SKU, type, and production information. This forms the foundation for your LCA analysis and helps identify your product in the system.
                  </p>
                </div>
                
                {/* Product Photo Upload */}
                <div className="space-y-4">
                  <h4 className="font-medium">Product Photo</h4>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    {uploadedImage ? (
                      <div className="space-y-2">
                        <img 
                          src={uploadedImage} 
                          alt="Product" 
                          className="w-32 h-32 object-cover mx-auto rounded-lg"
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => setUploadedImage(null)}
                        >
                          Remove Photo
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Camera className="w-12 h-12 text-gray-400 mx-auto" />
                        <p className="text-sm text-gray-600">
                          Upload a photo of your product to help with identification
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                            id="photo-upload"
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="flex items-center gap-2"
                            onClick={() => document.getElementById('photo-upload')?.click()}
                          >
                            <Upload className="w-4 h-4" />
                            Upload Photo
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      {...form.register('name')}
                      placeholder="e.g., Premium Single Malt Whisky"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU Code *</Label>
                    <Input
                      id="sku"
                      {...form.register('sku')}
                      placeholder="e.g., PSM-750-2024"
                    />
                    {form.formState.errors.sku && (
                      <p className="text-sm text-red-600">{form.formState.errors.sku.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="type">Product Type *</Label>
                    <Select 
                      value={form.watch('type')} 
                      onValueChange={(value) => form.setValue('type', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spirit">Spirit</SelectItem>
                        <SelectItem value="wine">Wine</SelectItem>
                        <SelectItem value="beer">Beer</SelectItem>
                        <SelectItem value="cider">Cider</SelectItem>
                        <SelectItem value="liqueur">Liqueur</SelectItem>
                        <SelectItem value="non-alcoholic">Non-alcoholic</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="volume">Volume *</Label>
                    <Input
                      id="volume"
                      {...form.register('volume')}
                      placeholder="e.g., 750ml"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="productionModel">Production Model *</Label>
                    <Select 
                      value={form.watch('productionModel')} 
                      onValueChange={(value) => form.setValue('productionModel', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select production model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="own">Own Production</SelectItem>
                        <SelectItem value="contract">Contract Manufacturing</SelectItem>
                        <SelectItem value="hybrid">Hybrid Model</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="annualProductionVolume">Annual Production Volume *</Label>
                    <Input
                      id="annualProductionVolume"
                      type="number"
                      min="0"
                      step="1"
                      {...form.register('annualProductionVolume', { valueAsNumber: true })}
                      placeholder="e.g., 10000"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Product Description</Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    placeholder="Describe your product, production process, and any unique characteristics..."
                    className="min-h-[100px]"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isMainProduct"
                    checked={form.watch('isMainProduct')}
                    onCheckedChange={(checked) => form.setValue('isMainProduct', checked as boolean)}
                  />
                  <Label htmlFor="isMainProduct">Mark as main product</Label>
                </div>
              </TabsContent>
              
              {/* Ingredients Tab */}
              <TabsContent value="ingredients" className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Leaf className="w-4 h-4 text-green-600" />
                    <h4 className="font-medium text-green-900">Ingredients & Recipe Information</h4>
                  </div>
                  <p className="text-sm text-green-700">
                    List all ingredients used in your product with accurate quantities, origins, and transport information. This data is crucial for calculating the carbon footprint of your raw materials and supply chain.
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Ingredients & Recipe</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendIngredient({
                      name: '',
                      type: 'grain',
                      amount: 0,
                      unit: 'kg',
                      organicCertified: false,
                    })}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Ingredient
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {ingredientFields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">Ingredient {index + 1}</h4>
                        {ingredientFields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeIngredient(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Ingredient Name *</Label>
                          <Input
                            {...form.register(`ingredients.${index}.name`)}
                            placeholder="e.g., Malted Barley"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Type *</Label>
                          <Select 
                            value={form.watch(`ingredients.${index}.type`)} 
                            onValueChange={(value) => form.setValue(`ingredients.${index}.type`, value as any)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="grain">Grain</SelectItem>
                              <SelectItem value="fruit">Fruit</SelectItem>
                              <SelectItem value="botanical">Botanical</SelectItem>
                              <SelectItem value="additive">Additive</SelectItem>
                              <SelectItem value="water">Water</SelectItem>
                              <SelectItem value="yeast">Yeast</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Amount *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            {...form.register(`ingredients.${index}.amount`, { valueAsNumber: true })}
                            placeholder="0.00"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Unit *</Label>
                          <Input
                            {...form.register(`ingredients.${index}.unit`)}
                            placeholder="e.g., kg, L, g"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Origin Location</Label>
                          <Input
                            {...form.register(`ingredients.${index}.origin`)}
                            placeholder="e.g., Scotland, France"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Transport Distance (km)</Label>
                          <Input
                            type="number"
                            {...form.register(`ingredients.${index}.transportDistance`, { valueAsNumber: true })}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-4">
                        <Checkbox
                          id={`organic-${index}`}
                          checked={form.watch(`ingredients.${index}.organicCertified`)}
                          onCheckedChange={(checked) => 
                            form.setValue(`ingredients.${index}.organicCertified`, checked as boolean)
                          }
                        />
                        <Label htmlFor={`organic-${index}`}>Organic Certified</Label>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              
              {/* Packaging Tab */}
              <TabsContent value="packaging" className="space-y-6">
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-purple-600" />
                    <h4 className="font-medium text-purple-900">Packaging Details</h4>
                  </div>
                  <p className="text-sm text-purple-700">
                    Provide detailed information about all packaging materials including bottles, labels, closures, and secondary packaging. Include material types, weights, and recycled content for accurate lifecycle assessment.
                  </p>
                </div>
                
                <div className="space-y-6">
                  {/* Primary Container */}
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Primary Container (Bottle/Can)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Material *</Label>
                        <Select 
                          value={form.watch('packaging.primaryContainer.material')} 
                          onValueChange={(value) => form.setValue('packaging.primaryContainer.material', value as any)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select material" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="glass">Glass</SelectItem>
                            <SelectItem value="aluminum">Aluminum</SelectItem>
                            <SelectItem value="pet">PET Plastic</SelectItem>
                            <SelectItem value="hdpe">HDPE Plastic</SelectItem>
                            <SelectItem value="paperboard">Paperboard</SelectItem>
                            <SelectItem value="tetrapack">Tetrapack</SelectItem>
                            <SelectItem value="bag-in-box">Bag-in-Box</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Weight (grams) *</Label>
                        <Input
                          type="number"
                          step="0.1"
                          {...form.register('packaging.primaryContainer.weight', { valueAsNumber: true })}
                          placeholder="480"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Recycled Content (%) *</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          {...form.register('packaging.primaryContainer.recycledContent', { valueAsNumber: true })}
                          placeholder="25"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Recyclability *</Label>
                        <Select 
                          value={form.watch('packaging.primaryContainer.recyclability')} 
                          onValueChange={(value) => form.setValue('packaging.primaryContainer.recyclability', value as any)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select recyclability" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fully-recyclable">Fully Recyclable</SelectItem>
                            <SelectItem value="partially-recyclable">Partially Recyclable</SelectItem>
                            <SelectItem value="not-recyclable">Not Recyclable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                  
                  {/* Labeling */}
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Labels & Printing</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Label Material *</Label>
                        <Select 
                          value={form.watch('packaging.labeling.labelMaterial')} 
                          onValueChange={(value) => form.setValue('packaging.labeling.labelMaterial', value as any)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select material" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paper">Paper</SelectItem>
                            <SelectItem value="plastic">Plastic</SelectItem>
                            <SelectItem value="metal">Metal</SelectItem>
                            <SelectItem value="fabric">Fabric</SelectItem>
                            <SelectItem value="none">No Label</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Label Weight (grams) *</Label>
                        <Input
                          type="number"
                          step="0.1"
                          {...form.register('packaging.labeling.labelWeight', { valueAsNumber: true })}
                          placeholder="2.5"
                        />
                      </div>
                    </div>
                  </Card>
                  
                  {/* Closure */}
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Closure System</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Closure Type *</Label>
                        <Select 
                          value={form.watch('packaging.closure.closureType')} 
                          onValueChange={(value) => form.setValue('packaging.closure.closureType', value as any)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select closure type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cork">Cork</SelectItem>
                            <SelectItem value="screw-cap">Screw Cap</SelectItem>
                            <SelectItem value="crown-cap">Crown Cap</SelectItem>
                            <SelectItem value="can-top">Can Top</SelectItem>
                            <SelectItem value="pump">Pump</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Closure Material *</Label>
                        <Select 
                          value={form.watch('packaging.closure.material')} 
                          onValueChange={(value) => form.setValue('packaging.closure.material', value as any)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select material" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cork">Cork</SelectItem>
                            <SelectItem value="synthetic-cork">Synthetic Cork</SelectItem>
                            <SelectItem value="aluminum">Aluminum</SelectItem>
                            <SelectItem value="plastic">Plastic</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Closure Weight (grams) *</Label>
                        <Input
                          type="number"
                          step="0.1"
                          {...form.register('packaging.closure.weight', { valueAsNumber: true })}
                          placeholder="5.0"
                        />
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>
              
              {/* Production Tab */}
              <TabsContent value="production" className="space-y-6">
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Factory className="w-4 h-4 text-orange-600" />
                    <h4 className="font-medium text-orange-900">Production Process Details</h4>
                  </div>
                  <p className="text-sm text-orange-700">
                    Document energy consumption, water usage, and waste generation during production. Include renewable energy percentage and waste management practices to calculate the environmental impact of your manufacturing process.
                  </p>
                </div>
                
                <div className="space-y-6">
                  {/* Energy Consumption */}
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Energy Consumption (per unit)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Electricity (kWh)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register('production.energyConsumption.electricityKwh', { valueAsNumber: true })}
                          placeholder="0.5"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Natural Gas (m³)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register('production.energyConsumption.gasM3', { valueAsNumber: true })}
                          placeholder="0.1"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Steam (kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register('production.energyConsumption.steamKg', { valueAsNumber: true })}
                          placeholder="0.2"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Renewable Energy (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          {...form.register('production.energyConsumption.renewableEnergyPercent', { valueAsNumber: true })}
                          placeholder="30"
                        />
                      </div>
                    </div>
                  </Card>
                  
                  {/* Water Usage */}
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Water Usage (per unit)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Process Water (liters)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          {...form.register('production.waterUsage.processWaterLiters', { valueAsNumber: true })}
                          placeholder="5.0"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Cleaning Water (liters)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          {...form.register('production.waterUsage.cleaningWaterLiters', { valueAsNumber: true })}
                          placeholder="2.0"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Cooling Water (liters)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          {...form.register('production.waterUsage.coolingWaterLiters', { valueAsNumber: true })}
                          placeholder="1.5"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="wasteWaterTreatment"
                          checked={form.watch('production.waterUsage.wasteWaterTreatment')}
                          onCheckedChange={(checked) => 
                            form.setValue('production.waterUsage.wasteWaterTreatment', checked as boolean)
                          }
                        />
                        <Label htmlFor="wasteWaterTreatment">Waste Water Treatment</Label>
                      </div>
                    </div>
                  </Card>
                  
                  {/* Waste Generation */}
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Waste Generation (per unit)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Organic Waste (kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register('production.wasteGeneration.organicWasteKg', { valueAsNumber: true })}
                          placeholder="0.5"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Packaging Waste (kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register('production.wasteGeneration.packagingWasteKg', { valueAsNumber: true })}
                          placeholder="0.1"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Waste Recycled (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          {...form.register('production.wasteGeneration.wasteRecycledPercent', { valueAsNumber: true })}
                          placeholder="75"
                        />
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>
              
              {/* Distribution Tab */}
              <TabsContent value="distribution" className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <h4 className="font-medium text-blue-900">Transportation & Distribution</h4>
                  </div>
                  <p className="text-sm text-blue-700">
                    Specify transportation methods, distances, and distribution network details. This information helps calculate the carbon footprint of moving your product from production to consumers.
                  </p>
                </div>
                
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">Transportation & Distribution</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Average Transport Distance (km)</Label>
                      <Input
                        type="number"
                        {...form.register('distribution.averageTransportDistance', { valueAsNumber: true })}
                        placeholder="500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Primary Transport Mode</Label>
                      <Select 
                        value={form.watch('distribution.primaryTransportMode')} 
                        onValueChange={(value) => form.setValue('distribution.primaryTransportMode', value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select transport mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="truck">Truck</SelectItem>
                          <SelectItem value="rail">Rail</SelectItem>
                          <SelectItem value="ship">Ship</SelectItem>
                          <SelectItem value="air">Air</SelectItem>
                          <SelectItem value="pipeline">Pipeline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Distribution Centers</Label>
                      <Input
                        type="number"
                        {...form.register('distribution.distributionCenters', { valueAsNumber: true })}
                        placeholder="3"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Packaging Efficiency (units per transport)</Label>
                      <Input
                        type="number"
                        {...form.register('distribution.packagingEfficiency', { valueAsNumber: true })}
                        placeholder="24"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="coldChainRequired"
                      checked={form.watch('distribution.coldChainRequired')}
                      onCheckedChange={(checked) => 
                        form.setValue('distribution.coldChainRequired', checked as boolean)
                      }
                    />
                    <Label htmlFor="coldChainRequired">Cold Chain Required</Label>
                  </div>
                </Card>
              </TabsContent>
              
              {/* End of Life Tab */}
              <TabsContent value="endoflife" className="space-y-6">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Recycle className="w-4 h-4 text-green-600" />
                    <h4 className="font-medium text-green-900">End of Life Management</h4>
                  </div>
                  <p className="text-sm text-green-700">
                    Define how your product and packaging are disposed of or recycled at the end of their lifecycle. Include recycling rates, disposal methods, and consumer education programs to complete the LCA analysis.
                  </p>
                </div>
                
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">End of Life Management</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Recycling Rate (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        {...form.register('endOfLife.recyclingRate', { valueAsNumber: true })}
                        placeholder="85"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Primary Disposal Method</Label>
                      <Select 
                        value={form.watch('endOfLife.disposalMethod')} 
                        onValueChange={(value) => form.setValue('endOfLife.disposalMethod', value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select disposal method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recycling">Recycling</SelectItem>
                          <SelectItem value="landfill">Landfill</SelectItem>
                          <SelectItem value="incineration">Incineration</SelectItem>
                          <SelectItem value="composting">Composting</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="returnableContainer"
                        checked={form.watch('endOfLife.returnableContainer')}
                        onCheckedChange={(checked) => 
                          form.setValue('endOfLife.returnableContainer', checked as boolean)
                        }
                      />
                      <Label htmlFor="returnableContainer">Returnable Container</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="consumerEducation"
                        checked={form.watch('endOfLife.consumerEducation')}
                        onCheckedChange={(checked) => 
                          form.setValue('endOfLife.consumerEducation', checked as boolean)
                        }
                      />
                      <Label htmlFor="consumerEducation">Consumer Education Program</Label>
                    </div>
                  </div>
                </Card>
              </TabsContent>
              
            </Tabs>
            
            <Separator />
            
            {/* Validation Error Summary */}
            {Object.keys(validationErrors).length > 0 && (
              <Card className="p-4 border-red-200 bg-red-50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <h4 className="font-medium text-red-900">Validation Errors</h4>
                </div>
                <div className="space-y-1">
                  {Object.entries(validationErrors).map(([field, messages]) => (
                    <div key={field} className="text-sm">
                      <span className="font-medium text-red-800">{field}:</span>
                      <span className="text-red-700 ml-1">{messages.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleValidate}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Validate Data
                </Button>
                
                {Object.keys(validationErrors).length > 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {Object.keys(validationErrors).length} Issues
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {onCancel && (
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" className="bg-avallen-green hover:bg-green-600">
                  <Save className="w-4 h-4 mr-2" />
                  {mode === 'create' ? 'Create Product' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}