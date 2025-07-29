import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import SupplierSelectionModal from '@/components/supplier-network/SupplierSelectionModal';
import { Save, Loader2, Package, Wheat, Box, Factory, Leaf, Award, Truck, Recycle, Plus, Trash2, Search, Building2 } from 'lucide-react';

// Enhanced Product Schema with all 8 tabs including LCA Data Collection
const enhancedProductSchema = z.object({
  // Basic Info Tab
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  type: z.string().min(1, "Product type is required"),
  volume: z.string().min(1, "Volume is required"),
  description: z.string().optional(),
  productImage: z.string().optional(),
  isMainProduct: z.boolean().default(false),
  status: z.string().default('active'),
  
  // Ingredients Tab
  ingredients: z.array(z.object({
    name: z.string().min(1, "Ingredient name is required"),
    amount: z.number().min(0, "Amount must be positive"),
    unit: z.string().min(1, "Unit is required"),
    type: z.string().optional(),
    origin: z.string().optional(),
    organic: z.boolean().default(false),
    supplier: z.string().optional(),
  })).min(1, "At least one ingredient is required"),
  
  // Packaging Tab - User-friendly input that auto-syncs to LCA Data
  packaging: z.object({
    primaryContainer: z.object({
      material: z.string().min(1, "Container material is required"),
      weight: z.number().min(0, "Weight must be positive"),
      recycledContent: z.number().min(0).max(100).optional(),
      recyclability: z.string().optional(),
      color: z.string().optional(),
      thickness: z.number().optional(),
      origin: z.string().optional(),
    }),
    labeling: z.object({
      labelMaterial: z.string().optional(),
      labelWeight: z.number().optional(),
      printingMethod: z.string().optional(),
      inkType: z.string().optional(),
      labelSize: z.number().optional(),
      origin: z.string().optional(),
    }),
    closure: z.object({
      closureType: z.string().optional(),
      material: z.string().optional(),
      weight: z.number().optional(),
      hasLiner: z.boolean().default(false),
      linerMaterial: z.string().optional(),
      origin: z.string().optional(),
    }),
    secondaryPackaging: z.object({
      hasSecondaryPackaging: z.boolean().default(false),
      boxMaterial: z.string().optional(),
      boxWeight: z.number().optional(),
      fillerMaterial: z.string().optional(),
      fillerWeight: z.number().optional(),
      origin: z.string().optional(),
    }),
    // Additional fields
    packagingNotes: z.string().optional(),
    qualityStandards: z.array(z.string()).optional(),
    supplierInformation: z.object({
      selectedSupplierId: z.string().optional(),
      supplierName: z.string().optional(),
      supplierCategory: z.string().optional(),
    }).optional(),
  }),
  
  // Production Tab
  production: z.object({
    productionModel: z.string().min(1, "Production model is required"),
    annualProductionVolume: z.number().min(0, "Production volume must be positive"),
    productionUnit: z.string().default('units'),
    facilityLocation: z.string().optional(),
    facilityAddress: z.string().optional(),
    energyConsumption: z.object({
      electricityKwh: z.number().optional(),
      gasM3: z.number().optional(),
      steamKg: z.number().optional(),
      fuelLiters: z.number().optional(),
      renewableEnergyPercent: z.number().min(0).max(100).optional(),
    }),
    waterUsage: z.object({
      processWaterLiters: z.number().optional(),
      cleaningWaterLiters: z.number().optional(),
      coolingWaterLiters: z.number().optional(),
      wasteWaterTreatment: z.string().optional(),
    }),
    wasteGeneration: z.object({
      organicWasteKg: z.number().optional(),
      packagingWasteKg: z.number().optional(),
      hazardousWasteKg: z.number().optional(),
      wasteRecycledPercent: z.number().min(0).max(100).optional(),
    }),
    productionMethods: z.array(z.string()).optional(),
  }),
  
  // Environmental Impact Tab
  environmentalImpact: z.object({
    calculationMethod: z.string().optional(),
    co2Emissions: z.number().optional(),
    waterFootprint: z.number().optional(),
    landUse: z.number().optional(),
    biodiversityImpact: z.string().optional(),
  }),
  
  // Certifications & Awards Tab
  certifications: z.array(z.string()).optional(),
  awards: z.array(z.string()).optional(),
  
  // Distribution Tab
  distribution: z.object({
    averageTransportDistance: z.number().optional(),
    primaryTransportMode: z.string().optional(),
    distributionCenters: z.number().optional(),
    coldChainRequired: z.boolean().default(false),
    packagingEfficiency: z.number().optional(),
  }),
  
  // End of Life Tab
  endOfLife: z.object({
    returnableContainer: z.boolean().default(false),
    recyclingRate: z.number().min(0).max(100).optional(),
    disposalMethod: z.string().optional(),
    consumerEducation: z.string().optional(),
  }),
  
  // LCA Data Collection Tab - Enhanced granular data collection
  lcaData: z.object({
    // Section 1: Agriculture & Raw Materials
    agriculture: z.object({
      mainCropType: z.string().optional(),
      yieldTonPerHectare: z.number().positive().optional(),
      dieselLPerHectare: z.number().nonnegative().optional(),
      sequestrationTonCo2PerTonCrop: z.number().nonnegative().optional(),
      fertilizer: z.object({
        nitrogenKgPerHectare: z.number().nonnegative().optional(),
        phosphorusKgPerHectare: z.number().nonnegative().optional(),
        potassiumKgPerHectare: z.number().nonnegative().optional(),
        organicFertilizerTonPerHectare: z.number().nonnegative().optional(),
      }).optional(),
      landUse: z.object({
        farmingPractice: z.enum(['conventional', 'organic', 'biodynamic', 'regenerative']).optional(),
        biodiversityIndex: z.number().min(0).max(10).optional(),
        soilQualityIndex: z.number().min(0).max(10).optional(),
      }).optional(),
    }),
    
    // Section 2: Inbound Transport
    inboundTransport: z.object({
      distanceKm: z.number().positive().optional(),
      mode: z.enum(['truck', 'rail', 'ship', 'air', 'multimodal']).optional(),
      fuelEfficiencyLper100km: z.number().positive().optional(),
      loadFactor: z.number().min(0).max(100).optional(),
      refrigerationRequired: z.boolean().default(false),
    }),
    
    // Section 3: Processing & Production
    processing: z.object({
      waterM3PerTonCrop: z.number().nonnegative().optional(),
      electricityKwhPerTonCrop: z.number().nonnegative().optional(),
      lpgKgPerLAlcohol: z.number().nonnegative().optional(),
      netWaterUseLPerBottle: z.number().nonnegative().optional(),
      angelsSharePercentage: z.number().min(0).max(100).optional(),
      fermentation: z.object({
        fermentationTime: z.number().positive().optional(), // days
        temperatureControl: z.boolean().default(false),
        yeastType: z.string().optional(),
        sugarAddedKg: z.number().nonnegative().optional(),
      }).optional(),
      distillation: z.object({
        distillationRounds: z.number().positive().optional(),
        energySourceType: z.enum(['electric', 'gas', 'biomass', 'steam']).optional(),
        heatRecoverySystem: z.boolean().default(false),
        copperUsageKg: z.number().nonnegative().optional(),
      }).optional(),
      maturation: z.object({
        maturationTimeMonths: z.number().nonnegative().optional(),
        barrelType: z.enum(['new_oak', 'used_oak', 'stainless_steel', 'other']).optional(),
        warehouseType: z.enum(['traditional', 'racked', 'climate_controlled']).optional(),
        evaporationLossPercentage: z.number().min(0).max(100).optional(),
      }).optional(),
    }),
    
    // Section 4: Packaging (Enhanced) - Master Source for All Packaging Data
    packagingDetailed: z.object({
      container: z.object({
        // Core fields (required for LCA calculations)
        materialType: z.enum(['glass', 'plastic', 'aluminum', 'steel', 'ceramic']).optional(),
        weightGrams: z.number().positive().optional(),
        recycledContentPercentage: z.number().min(0).max(100).optional(),
        manufacturingLocation: z.string().optional(),
        transportDistanceKm: z.number().nonnegative().optional(),
        // Additional fields from original packaging tab
        color: z.string().optional(),
        thickness: z.number().optional(),
        recyclability: z.string().optional(),
      }),
      label: z.object({
        materialType: z.enum(['paper', 'plastic', 'foil', 'biodegradable']).optional(),
        weightGrams: z.number().positive().optional(),
        inkType: z.enum(['conventional', 'eco_friendly', 'soy_based']).optional(),
        adhesiveType: z.enum(['water_based', 'solvent_based', 'hot_melt']).optional(),
        // Additional fields from original packaging tab
        printingMethod: z.string().optional(),
        labelSize: z.number().optional(),
      }).optional(),
      closure: z.object({
        materialType: z.enum(['cork', 'synthetic_cork', 'screw_cap', 'crown_cap']).optional(),
        weightGrams: z.number().positive().optional(),
        hasLiner: z.boolean().default(false),
        linerMaterial: z.string().optional(),
      }).optional(),
      secondaryPackaging: z.object({
        hasBox: z.boolean().default(false),
        boxMaterial: z.enum(['cardboard', 'wood', 'plastic', 'metal']).optional(),
        boxWeightGrams: z.number().positive().optional(),
        protectiveMaterial: z.string().optional(),
        protectiveMaterialWeightGrams: z.number().nonnegative().optional(),
        // Additional fields from original packaging tab
        fillerMaterial: z.string().optional(),
        fillerWeight: z.number().optional(),
      }).optional(),
    }),
    
    // Section 5: Distribution & Transport
    distribution: z.object({
      avgDistanceToDcKm: z.number().positive().optional(),
      primaryTransportMode: z.enum(['truck', 'rail', 'ship', 'air']).optional(),
      palletizationEfficiency: z.number().min(0).max(100).optional(),
      coldChainRequirement: z.boolean().default(false),
      temperatureRangeCelsius: z.object({
        min: z.number().optional(),
        max: z.number().optional(),
      }).optional(),
      distributionCenters: z.array(z.object({
        location: z.string(),
        distanceFromProducerKm: z.number().nonnegative(),
        energySource: z.enum(['grid', 'renewable', 'mixed']).optional(),
      })).optional(),
    }),
    
    // Section 6: End of Life (Enhanced)
    endOfLifeDetailed: z.object({
      recyclingRatePercentage: z.number().min(0).max(100).optional(),
      primaryDisposalMethod: z.enum(['recycling', 'landfill', 'incineration', 'composting']).optional(),
      containerRecyclability: z.object({
        isRecyclable: z.boolean().default(true),
        recyclingInfrastructureAvailable: z.boolean().default(true),
        contaminationRate: z.number().min(0).max(100).optional(),
      }).optional(),
      labelRemovalRequired: z.boolean().default(false),
      consumerEducationProgram: z.boolean().default(false),
      takeback_program: z.boolean().default(false),
    }),
  }).optional(),
});

type EnhancedProductFormData = z.infer<typeof enhancedProductSchema>;

interface EnhancedProductFormProps {
  initialData?: Partial<EnhancedProductFormData>;
  onSubmit: (data: EnhancedProductFormData) => void;
  onSaveDraft?: (data: EnhancedProductFormData) => void;
  isEditing?: boolean;
  isSubmitting?: boolean;
  isDraftSaving?: boolean;
}

export default function EnhancedProductForm({ 
  initialData, 
  onSubmit, 
  onSaveDraft,
  isEditing = false, 
  isSubmitting = false,
  isDraftSaving = false
}: EnhancedProductFormProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedIngredientSuppliers, setSelectedIngredientSuppliers] = useState<any[]>([]);
  const [selectedPackagingSupplier, setSelectedPackagingSupplier] = useState<any>(null);
  const [selectedProductionSupplier, setSelectedProductionSupplier] = useState<any>(null);

  const form = useForm<EnhancedProductFormData>({
    resolver: zodResolver(enhancedProductSchema),
    defaultValues: initialData || {
      name: '',
      sku: '',
      type: '',
      volume: '',
      description: '',
      productImage: '',
      isMainProduct: false,
      status: 'active',
      ingredients: [{ name: '', amount: 0, unit: 'ml', type: '', origin: '', organic: false, supplier: '' }],
      packaging: {
        primaryContainer: { material: '', weight: 0, recycledContent: 0, recyclability: '', color: '', thickness: 0, origin: '' },
        labeling: { labelMaterial: '', labelWeight: 0, printingMethod: '', inkType: '', labelSize: 0, origin: '' },
        closure: { closureType: '', material: '', weight: 0, hasLiner: false, linerMaterial: '', origin: '' },
        secondaryPackaging: { hasSecondaryPackaging: false, boxMaterial: '', boxWeight: 0, fillerMaterial: '', fillerWeight: 0, origin: '' },
        packagingNotes: '',
        qualityStandards: [],
        supplierInformation: {
          selectedSupplierId: '',
          supplierName: '',
          supplierCategory: '',
        },
      },
      production: {
        productionModel: '',
        annualProductionVolume: 0,
        productionUnit: 'units',
        facilityLocation: '',
        facilityAddress: '',
        energyConsumption: { electricityKwh: 0, gasM3: 0, steamKg: 0, fuelLiters: 0, renewableEnergyPercent: 0 },
        waterUsage: { processWaterLiters: 0, cleaningWaterLiters: 0, coolingWaterLiters: 0, wasteWaterTreatment: '' },
        wasteGeneration: { organicWasteKg: 0, packagingWasteKg: 0, hazardousWasteKg: 0, wasteRecycledPercent: 0 },
        productionMethods: [],
      },
      environmentalImpact: { calculationMethod: '', co2Emissions: 0, waterFootprint: 0, landUse: 0, biodiversityImpact: '' },
      certifications: [],
      awards: [],
      distribution: { averageTransportDistance: 0, primaryTransportMode: '', distributionCenters: 0, coldChainRequired: false, packagingEfficiency: 0 },
      endOfLife: { returnableContainer: false, recyclingRate: 0, disposalMethod: '', consumerEducation: '' },
      lcaData: {
        agriculture: {
          mainCropType: '',
          yieldTonPerHectare: 0,
          dieselLPerHectare: 0,
          sequestrationTonCo2PerTonCrop: 0,
          fertilizer: { nitrogenKgPerHectare: 0, phosphorusKgPerHectare: 0, potassiumKgPerHectare: 0, organicFertilizerTonPerHectare: 0 },
          landUse: { farmingPractice: undefined, biodiversityIndex: 0, soilQualityIndex: 0 },
        },
        inboundTransport: { distanceKm: 0, mode: undefined, fuelEfficiencyLper100km: 0, loadFactor: 0, refrigerationRequired: false },
        processing: {
          waterM3PerTonCrop: 0,
          electricityKwhPerTonCrop: 0,
          lpgKgPerLAlcohol: 0,
          netWaterUseLPerBottle: 0,
          angelsSharePercentage: 0,
          fermentation: { fermentationTime: 0, temperatureControl: false, yeastType: '', sugarAddedKg: 0 },
          distillation: { distillationRounds: 0, energySourceType: undefined, heatRecoverySystem: false, copperUsageKg: 0 },
          maturation: { maturationTimeMonths: 0, barrelType: undefined, warehouseType: undefined, evaporationLossPercentage: 0 },
        },
        packagingDetailed: {
          container: { 
            materialType: undefined, 
            weightGrams: 0, 
            recycledContentPercentage: 0, 
            manufacturingLocation: '', 
            transportDistanceKm: 0,
            color: '',
            thickness: 0,
            recyclability: '',
          },
          label: { 
            materialType: undefined, 
            weightGrams: 0, 
            inkType: undefined, 
            adhesiveType: undefined,
            printingMethod: '',
            labelSize: 0,
          },
          closure: { 
            materialType: undefined, 
            weightGrams: 0, 
            hasLiner: false, 
            linerMaterial: '',
          },
          secondaryPackaging: { 
            hasBox: false, 
            boxMaterial: undefined, 
            boxWeightGrams: 0, 
            protectiveMaterial: '', 
            protectiveMaterialWeightGrams: 0,
            fillerMaterial: '',
            fillerWeight: 0,
          },
        },
        distribution: { 
          avgDistanceToDcKm: 0, 
          primaryTransportMode: undefined, 
          palletizationEfficiency: 0, 
          coldChainRequirement: false,
          temperatureRangeCelsius: { min: 0, max: 0 },
          distributionCenters: [],
        },
        endOfLifeDetailed: {
          recyclingRatePercentage: 0,
          primaryDisposalMethod: undefined,
          containerRecyclability: { isRecyclable: true, recyclingInfrastructureAvailable: true, contaminationRate: 0 },
          labelRemovalRequired: false,
          consumerEducationProgram: false,
          takeback_program: false,
        },
      },
    },
  });

  const handleSubmit = (data: EnhancedProductFormData) => {
    onSubmit(data);
  };

  const handleSaveDraft = () => {
    const currentData = form.getValues();
    onSaveDraft?.(currentData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="w-full" onKeyDown={(e) => {
        // Prevent form submission on Enter key unless we're on the last tab
        if (e.key === 'Enter' && activeTab !== 'endoflife') {
          e.preventDefault();
        }
      }}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8 mb-6">
            <TabsTrigger value="basic" className="text-xs">Basic Info</TabsTrigger>
            <TabsTrigger value="ingredients" className="text-xs">Ingredients</TabsTrigger>
            <TabsTrigger value="packaging" className="text-xs">Packaging</TabsTrigger>
            <TabsTrigger value="production" className="text-xs">Production</TabsTrigger>
            <TabsTrigger value="lcadata" className="text-xs">LCA Data</TabsTrigger>
            <TabsTrigger value="certifications" className="text-xs">Certifications</TabsTrigger>
            <TabsTrigger value="distribution" className="text-xs">Distribution</TabsTrigger>
            <TabsTrigger value="endoflife" className="text-xs">End of Life</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-avallen-green" />
                  Basic Product Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Avallen Calvados" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., AVALLEN-CALVADOS-750ML" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select product type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="spirits">Spirits</SelectItem>
                            <SelectItem value="wine">Wine</SelectItem>
                            <SelectItem value="beer">Beer</SelectItem>
                            <SelectItem value="liqueur">Liqueur</SelectItem>
                            <SelectItem value="cider">Cider</SelectItem>
                            <SelectItem value="non-alcoholic">Non-Alcoholic</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="volume"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Volume *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 750ml" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your product..." 
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Pack Shot Upload */}
                <div className="space-y-4">
                  <FormLabel>Product Images (Pack Shots)</FormLabel>
                  <p className="text-sm text-gray-600">Upload up to 3 product images. Maximum 10MB each.</p>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      max={3}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 3) {
                          alert('Maximum 3 images allowed');
                          return;
                        }
                        // Handle file upload logic here
                        console.log('Files selected:', files);
                      }}
                      className="w-full"
                    />
                    <div className="text-center text-sm text-gray-500 mt-2">
                      Drag and drop images here, or click to select
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="isMainProduct"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Mark as main product</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          This will be your primary product for reporting
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ingredients Tab */}
          <TabsContent value="ingredients" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wheat className="w-5 h-5 text-avallen-green" />
                  Recipe & Ingredients
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Supplier Selection for Ingredients */}
                <div className="p-4 bg-blue-50 rounded-lg mb-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Select from Verified Ingredient Suppliers
                  </h4>
                  <SupplierSelectionModal
                    inputType="ingredient"
                    onSelect={(supplier) => {
                      // Auto-fill ingredient data from supplier product in FIRST empty slot
                      const currentIngredients = form.getValues('ingredients');
                      
                      // Find first empty ingredient slot (name is empty)
                      const firstEmptyIndex = currentIngredients.findIndex(ing => !ing.name);
                      
                      // Extract data from supplier product structure
                      const productAttrs = supplier.productAttributes || {};
                      const lcaData = supplier.lcaDataJson || {};
                      const supplierAddr = supplier.supplierAddress || {};
                      
                      const newIngredient = {
                        name: supplier.productName || '',
                        amount: productAttrs.typical_usage_per_unit || productAttrs.weight || 0,
                        unit: productAttrs.usage_unit || productAttrs.unit || 'kg',
                        type: productAttrs.ingredient_type || productAttrs.type || '',
                        origin: `${supplierAddr.city || ''}, ${supplierAddr.country || ''}`.replace(/^, |, $/, '') || productAttrs.origin_country || '',
                        organic: productAttrs.organic_certified || false,
                        supplier: supplier.supplierName || '',
                        supplierAddress: supplierAddr
                      };
                      
                      if (firstEmptyIndex !== -1) {
                        // Fill first empty slot
                        form.setValue(`ingredients.${firstEmptyIndex}`, newIngredient);
                      } else {
                        // Add new ingredient if no empty slots
                        form.setValue('ingredients', [...currentIngredients, newIngredient]);
                      }
                      setSelectedIngredientSuppliers([...selectedIngredientSuppliers, supplier]);
                    }}
                    onManualEntry={() => {
                      // Add blank ingredient for manual entry
                      const currentIngredients = form.getValues('ingredients');
                      form.setValue('ingredients', [
                        ...currentIngredients, 
                        { name: '', amount: 0, unit: 'kg', type: '', origin: '', organic: false, supplier: '' }
                      ]);
                    }}
                    selectedProduct={null}
                  >
                    <Button type="button" variant="outline">
                      <Building2 className="w-4 h-4 mr-2" />
                      Add Ingredient from Supplier
                    </Button>
                  </SupplierSelectionModal>
                </div>

                <div className="space-y-4">
                  {form.watch('ingredients').map((_, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name={`ingredients.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ingredient Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Apples" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`ingredients.${index}.amount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="100" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`ingredients.${index}.unit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select unit" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="kg">Kilograms</SelectItem>
                                  <SelectItem value="g">Grams</SelectItem>
                                  <SelectItem value="l">Liters</SelectItem>
                                  <SelectItem value="ml">Milliliters</SelectItem>
                                  <SelectItem value="tonnes">Tonnes</SelectItem>
                                  <SelectItem value="units">Units</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name={`ingredients.${index}.type`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ingredient Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
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
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`ingredients.${index}.origin`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Origin</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Normandy, France" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`ingredients.${index}.supplier`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Supplier</FormLabel>
                              <FormControl>
                                <Input placeholder="Supplier name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <FormField
                            control={form.control}
                            name={`ingredients.${index}.organic`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel>Organic certified</FormLabel>
                              </FormItem>
                            )}
                          />
                          
                          <SupplierSelectionModal
                            inputType="ingredient"
                            onSelect={(supplier) => {
                              // Auto-fill this specific ingredient with supplier data
                              const productAttrs = supplier.productAttributes || {};
                              form.setValue(`ingredients.${index}.name`, supplier.productName || '');
                              form.setValue(`ingredients.${index}.origin`, productAttrs.origin_country || '');
                              form.setValue(`ingredients.${index}.supplier`, supplier.supplierName || '');
                              form.setValue(`ingredients.${index}.organic`, productAttrs.organic_certified || false);
                              if (productAttrs.typical_usage_per_unit) {
                                form.setValue(`ingredients.${index}.amount`, productAttrs.typical_usage_per_unit);
                              }
                            }}
                            onManualEntry={() => {}}
                            selectedProduct={null}
                          >
                            <Button type="button" variant="ghost" size="sm">
                              <Search className="w-3 h-3 mr-1" />
                              Select Supplier
                            </Button>
                          </SupplierSelectionModal>
                        </div>
                        
                        {form.watch('ingredients').length > 1 && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const currentIngredients = form.getValues('ingredients');
                              form.setValue('ingredients', currentIngredients.filter((_, i) => i !== index));
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {form.watch('ingredients').length < 50 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        const currentIngredients = form.getValues('ingredients');
                        form.setValue('ingredients', [
                          ...currentIngredients, 
                          { name: '', amount: 0, unit: 'kg', type: '', origin: '', organic: false, supplier: '' }
                        ]);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Ingredient ({form.watch('ingredients').length}/50)
                    </Button>
                  )}
                  
                  {form.watch('ingredients').length >= 50 && (
                    <div className="text-center py-4 bg-gray-50 rounded-lg">
                      <p className="text-muted-foreground">Maximum of 50 ingredients reached</p>
                      <p className="text-sm text-muted-foreground mt-1">Remove an ingredient to add new ones</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Packaging Tab */}
          <TabsContent value="packaging" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Box className="w-5 h-5 text-avallen-green" />
                  Packaging Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Supplier Selection for Packaging */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Select from Verified Packaging Suppliers
                  </h4>
                  
                  {selectedPackagingSupplier ? (
                    <Card className="border-green-200 bg-green-50">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-green-800">{selectedPackagingSupplier.supplierName}</h4>
                            <p className="text-sm text-green-600">{selectedPackagingSupplier.productName}</p>
                            <Badge className="mt-2 bg-green-100 text-green-800">
                              Selected Packaging
                            </Badge>
                          </div>
                          <SupplierSelectionModal
                            inputType="bottle"
                            onSelect={(supplier) => {
                              setSelectedPackagingSupplier(supplier);
                              // Auto-fill packaging data from supplier product (user-friendly fields + auto-sync to LCA)
                              const productAttrs = supplier.productAttributes || {};
                              const lcaData = supplier.lcaDataJson || {};
                              const supplierAddr = supplier.supplierAddress || {};
                              const origin = `${supplierAddr.city || ''}, ${supplierAddr.country || ''}`.replace(/^, |, $/, '') || '';
                              
                              // Update user-friendly packaging tab fields
                              form.setValue('packaging.primaryContainer.material', productAttrs.material || '');
                              form.setValue('packaging.primaryContainer.weight', productAttrs.weight || productAttrs.weight_grams || 0);
                              form.setValue('packaging.primaryContainer.recycledContent', productAttrs.recycledContent || productAttrs.recycled_content_percent || 0);
                              form.setValue('packaging.primaryContainer.color', productAttrs.color || '');
                              form.setValue('packaging.primaryContainer.origin', origin);
                              if (productAttrs.thickness) {
                                form.setValue('packaging.primaryContainer.thickness', productAttrs.thickness);
                              }
                              if (productAttrs.recyclability) {
                                form.setValue('packaging.primaryContainer.recyclability', productAttrs.recyclability);
                              }
                              
                              // Update supplier information
                              form.setValue('packaging.supplierInformation.selectedSupplierId', supplier.id);
                              form.setValue('packaging.supplierInformation.supplierName', supplier.supplierName);
                              form.setValue('packaging.supplierInformation.supplierCategory', supplier.supplierCategory);
                              
                              // Auto-sync to LCA Data (for calculations)
                              form.setValue('lcaData.packagingDetailed.container.materialType', productAttrs.material?.toLowerCase() as any);
                              form.setValue('lcaData.packagingDetailed.container.weightGrams', productAttrs.weight || productAttrs.weight_grams || 0);
                              form.setValue('lcaData.packagingDetailed.container.recycledContentPercentage', productAttrs.recycledContent || productAttrs.recycled_content_percent || 0);
                              form.setValue('lcaData.packagingDetailed.container.color', productAttrs.color || '');
                              form.setValue('lcaData.packagingDetailed.container.manufacturingLocation', origin);
                              if (productAttrs.thickness) {
                                form.setValue('lcaData.packagingDetailed.container.thickness', productAttrs.thickness);
                              }
                              if (productAttrs.recyclability) {
                                form.setValue('lcaData.packagingDetailed.container.recyclability', productAttrs.recyclability);
                              }
                            }}
                            onManualEntry={() => {
                              setSelectedPackagingSupplier(null);
                            }}
                            selectedProduct={selectedPackagingSupplier}
                          >
                            <Button type="button" variant="outline" size="sm">
                              Change Selection
                            </Button>
                          </SupplierSelectionModal>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Packaging Selected</h3>
                      <p className="text-muted-foreground mb-4">
                        Choose packaging components from our verified supplier network
                      </p>
                      <SupplierSelectionModal
                        inputType="bottle"
                        onSelect={(supplier) => {
                          setSelectedPackagingSupplier(supplier);
                          // Auto-fill packaging data from supplier product (user-friendly fields + auto-sync to LCA)
                          const productAttrs = supplier.productAttributes || {};
                          const lcaData = supplier.lcaDataJson || {};
                          const supplierAddr = supplier.supplierAddress || {};
                          const origin = `${supplierAddr.city || ''}, ${supplierAddr.country || ''}`.replace(/^, |, $/, '') || '';
                          
                          // Update user-friendly packaging tab fields
                          form.setValue('packaging.primaryContainer.material', productAttrs.material || '');
                          form.setValue('packaging.primaryContainer.weight', productAttrs.weight || productAttrs.weight_grams || 0);
                          form.setValue('packaging.primaryContainer.recycledContent', productAttrs.recycledContent || productAttrs.recycled_content_percent || 0);
                          form.setValue('packaging.primaryContainer.color', productAttrs.color || '');
                          form.setValue('packaging.primaryContainer.origin', origin);
                          if (productAttrs.thickness) {
                            form.setValue('packaging.primaryContainer.thickness', productAttrs.thickness);
                          }
                          if (productAttrs.recyclability) {
                            form.setValue('packaging.primaryContainer.recyclability', productAttrs.recyclability);
                          }
                          
                          // Update supplier information
                          form.setValue('packaging.supplierInformation.selectedSupplierId', supplier.id);
                          form.setValue('packaging.supplierInformation.supplierName', supplier.supplierName);
                          form.setValue('packaging.supplierInformation.supplierCategory', supplier.supplierCategory);
                          
                          // Auto-sync to LCA Data (for calculations)
                          form.setValue('lcaData.packagingDetailed.container.materialType', productAttrs.material?.toLowerCase() as any);
                          form.setValue('lcaData.packagingDetailed.container.weightGrams', productAttrs.weight || productAttrs.weight_grams || 0);
                          form.setValue('lcaData.packagingDetailed.container.recycledContentPercentage', productAttrs.recycledContent || productAttrs.recycled_content_percent || 0);
                          form.setValue('lcaData.packagingDetailed.container.color', productAttrs.color || '');
                          form.setValue('lcaData.packagingDetailed.container.manufacturingLocation', origin);
                          if (productAttrs.thickness) {
                            form.setValue('lcaData.packagingDetailed.container.thickness', productAttrs.thickness);
                          }
                          if (productAttrs.recyclability) {
                            form.setValue('lcaData.packagingDetailed.container.recyclability', productAttrs.recyclability);
                          }
                        }}
                        onManualEntry={() => {
                          setSelectedPackagingSupplier(null);
                        }}
                        selectedProduct={null}
                      >
                        <Button type="button">
                          <Search className="h-4 w-4 mr-2" />
                          Browse Packaging Suppliers
                        </Button>
                      </SupplierSelectionModal>
                    </div>
                  )}
                </div>

                {/* Primary Container */}
                <div className="space-y-4">
                  <h4 className="font-medium">Primary Container</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="packaging.primaryContainer.material"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Material *</FormLabel>
                          <Select onValueChange={(value) => {
                            field.onChange(value);
                            // Auto-sync to LCA Data
                            form.setValue('lcaData.packagingDetailed.container.materialType', value.toLowerCase() as any);
                          }} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select material" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="glass">Glass</SelectItem>
                              <SelectItem value="plastic">Plastic</SelectItem>
                              <SelectItem value="aluminum">Aluminum</SelectItem>
                              <SelectItem value="steel">Steel</SelectItem>
                              <SelectItem value="cardboard">Cardboard</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="packaging.primaryContainer.weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (g) *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="500" 
                              {...field} 
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                field.onChange(value);
                                // Auto-sync to LCA Data
                                form.setValue('lcaData.packagingDetailed.container.weightGrams', value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="packaging.primaryContainer.recycledContent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recycled Content (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="30" 
                              min="0" 
                              max="100"
                              {...field} 
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                field.onChange(value);
                                // Auto-sync to LCA Data
                                form.setValue('lcaData.packagingDetailed.container.recycledContentPercentage', value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="packaging.primaryContainer.color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Clear, Green, Amber" 
                              {...field} 
                              onChange={(e) => {
                                field.onChange(e.target.value);
                                // Auto-sync to LCA Data
                                form.setValue('lcaData.packagingDetailed.container.color', e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="packaging.primaryContainer.origin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Origin Location</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Paris, France" 
                              {...field} 
                              onChange={(e) => {
                                field.onChange(e.target.value);
                                // Auto-sync to LCA Data
                                form.setValue('lcaData.packagingDetailed.container.manufacturingLocation', e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="packaging.primaryContainer.recyclability"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recyclability</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Fully recyclable" 
                              {...field} 
                              onChange={(e) => {
                                field.onChange(e.target.value);
                                // Auto-sync to LCA Data
                                form.setValue('lcaData.packagingDetailed.container.recyclability', e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Auto-Sync Status */}
                <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-sm text-green-700">
                      Packaging data automatically syncs to LCA calculations
                    </p>
                  </div>
                </div>

                {/* Additional Packaging Information */}
                <div className="space-y-4">
                  <h4 className="font-medium">Additional Information</h4>
                  
                  <FormField
                    control={form.control}
                    name="packaging.packagingNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Packaging Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional packaging specifications or notes..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Any additional packaging information not covered above
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="packaging.qualityStandards"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quality Standards & Certifications</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., FDA approved, ISO 9001, BRC certified" 
                            value={field.value?.join(', ') || ''}
                            onChange={(e) => {
                              const standards = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                              field.onChange(standards);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Comma-separated list of quality standards and certifications
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Labels & Printing */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Labels & Printing</h4>
                    <SupplierSelectionModal
                      inputType="label"
                      onSelect={(supplier) => {
                        // Auto-fill label data from supplier product
                        const productAttrs = supplier.productAttributes || {};
                        const supplierAddr = supplier.supplierAddress || {};
                        form.setValue('packaging.labeling.labelMaterial', productAttrs.material || '');
                        form.setValue('packaging.labeling.labelWeight', productAttrs.weight || 0);
                        form.setValue('packaging.labeling.printingMethod', productAttrs.printing_method || '');
                        form.setValue('packaging.labeling.origin', `${supplierAddr.city || ''}, ${supplierAddr.country || ''}`.replace(/^, |, $/, '') || '');
                      }}
                      onManualEntry={() => {}}
                      selectedProduct={null}
                    >
                      <Button type="button" variant="outline" size="sm">
                        <Search className="h-3 w-3 mr-1" />
                        Browse Label Suppliers
                      </Button>
                    </SupplierSelectionModal>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="packaging.labeling.labelMaterial"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Label Material</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select material" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="paper">Paper</SelectItem>
                              <SelectItem value="plastic">Plastic</SelectItem>
                              <SelectItem value="metal">Metal</SelectItem>
                              <SelectItem value="fabric">Fabric</SelectItem>
                              <SelectItem value="none">No Labels</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="packaging.labeling.labelWeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Label Weight (g)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="15" 
                              step="0.1"
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="packaging.labeling.printingMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Printing Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="digital">Digital</SelectItem>
                              <SelectItem value="offset">Offset</SelectItem>
                              <SelectItem value="flexographic">Flexographic</SelectItem>
                              <SelectItem value="screen">Screen</SelectItem>
                              <SelectItem value="none">No Printing</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="packaging.labeling.inkType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ink Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select ink type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="water-based">Water-based</SelectItem>
                              <SelectItem value="solvent-based">Solvent-based</SelectItem>
                              <SelectItem value="uv-cured">UV-cured</SelectItem>
                              <SelectItem value="eco-friendly">Eco-friendly</SelectItem>
                              <SelectItem value="none">No Ink</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="packaging.labeling.labelSize"
                    render={({ field }) => (
                      <FormItem className="md:w-1/2">
                        <FormLabel>Label Size (cm²)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="45.5" 
                            step="0.1"
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>Total surface area of all labels</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="packaging.labeling.origin"
                    render={({ field }) => (
                      <FormItem className="md:w-1/2">
                        <FormLabel>Origin Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Milan, Italy" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Closure System */}
                <div className="space-y-4">
                  <h4 className="font-medium">Closure System</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="packaging.closure.closureType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Closure Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select closure type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cork">Cork</SelectItem>
                              <SelectItem value="screw-cap">Screw Cap</SelectItem>
                              <SelectItem value="crown-cap">Crown Cap</SelectItem>
                              <SelectItem value="swing-top">Swing Top</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="packaging.closure.material"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Closure Material</FormLabel>
                          <FormControl>
                            <Input placeholder="Natural cork, Aluminum, Plastic" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="packaging.closure.weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Closure Weight (g)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="2.5" 
                              step="0.1"
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="packaging.closure.origin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Origin Location</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Porto, Portugal" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Secondary Packaging */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Secondary Packaging</h4>
                    <SupplierSelectionModal
                      inputType="secondary"
                      onSelect={(supplier) => {
                        // Auto-fill secondary packaging data from supplier product
                        const productAttrs = supplier.productAttributes || {};
                        const supplierAddr = supplier.supplierAddress || {};
                        form.setValue('packaging.secondaryPackaging.hasSecondaryPackaging', true);
                        form.setValue('packaging.secondaryPackaging.boxMaterial', productAttrs.material || '');
                        form.setValue('packaging.secondaryPackaging.boxWeight', productAttrs.weight || 0);
                        form.setValue('packaging.secondaryPackaging.origin', `${supplierAddr.city || ''}, ${supplierAddr.country || ''}`.replace(/^, |, $/, '') || '');
                      }}
                      onManualEntry={() => {}}
                      selectedProduct={null}
                    >
                      <Button type="button" variant="outline" size="sm">
                        <Search className="h-3 w-3 mr-1" />
                        Browse Secondary Packaging
                      </Button>
                    </SupplierSelectionModal>
                  </div>

                  <FormField
                    control={form.control}
                    name="packaging.secondaryPackaging.hasSecondaryPackaging"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Uses Secondary Packaging</FormLabel>
                          <FormDescription>
                            Product is packaged in boxes, cases, or additional protective materials
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {form.watch('packaging.secondaryPackaging.hasSecondaryPackaging') && (
                    <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="packaging.secondaryPackaging.boxMaterial"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Box/Case Material</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select material" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="cardboard">Cardboard</SelectItem>
                                  <SelectItem value="plastic">Plastic</SelectItem>
                                  <SelectItem value="wood">Wood</SelectItem>
                                  <SelectItem value="metal">Metal</SelectItem>
                                  <SelectItem value="none">None</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="packaging.secondaryPackaging.boxWeight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Box Weight (g)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="120" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="packaging.secondaryPackaging.fillerMaterial"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Filler Material</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select filler" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="foam">Foam</SelectItem>
                                  <SelectItem value="paper">Paper</SelectItem>
                                  <SelectItem value="plastic">Plastic</SelectItem>
                                  <SelectItem value="biodegradable">Biodegradable Packing</SelectItem>
                                  <SelectItem value="none">No Filler</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="packaging.secondaryPackaging.fillerWeight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Filler Weight (g)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="25" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="packaging.secondaryPackaging.origin"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Origin Location</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Berlin, Germany" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Production Tab */}
          <TabsContent value="production" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="w-5 h-5 text-avallen-green" />
                  Production Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Supplier Selection for Production */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Select Production Partner
                  </h4>
                  
                  {selectedProductionSupplier ? (
                    <Card className="border-green-200 bg-green-50">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-green-800">{selectedProductionSupplier.supplierName}</h4>
                            <p className="text-sm text-green-600">{selectedProductionSupplier.location}</p>
                            <Badge className="mt-2 bg-green-100 text-green-800">
                              Selected Producer
                            </Badge>
                          </div>
                          <SupplierSelectionModal
                            inputType="contract"
                            onSelect={(supplier) => {
                              setSelectedProductionSupplier(supplier);
                              // Auto-fill production data from supplier product
                              const productAttrs = supplier.productAttributes || {};
                              const lcaData = supplier.lcaDataJson || {};
                              
                              form.setValue('production.productionModel', 'contract');
                              form.setValue('production.annualProductionVolume', productAttrs.annual_capacity || 0);
                              
                              // Auto-fill energy data if available
                              if (lcaData.energy_consumption) {
                                form.setValue('production.energyConsumption.electricityKwh', lcaData.energy_consumption);
                              }
                            }}
                            onManualEntry={() => {
                              setSelectedProductionSupplier(null);
                            }}
                            selectedProduct={selectedProductionSupplier}
                          >
                            <Button type="button" variant="outline" size="sm">
                              Change Selection
                            </Button>
                          </SupplierSelectionModal>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Producer Selected</h3>
                      <p className="text-muted-foreground mb-4">
                        Choose a verified producer from our network
                      </p>
                      <SupplierSelectionModal
                        inputType="contract"
                        onSelect={(supplier) => {
                          setSelectedProductionSupplier(supplier);
                          // Auto-fill production data from supplier product
                          const productAttrs = supplier.productAttributes || {};
                          const lcaData = supplier.lcaDataJson || {};
                          
                          form.setValue('production.productionModel', 'contract');
                          form.setValue('production.annualProductionVolume', productAttrs.annual_capacity || 0);
                          
                          // Auto-fill energy data if available
                          if (lcaData.energy_consumption) {
                            form.setValue('production.energyConsumption.electricityKwh', lcaData.energy_consumption);
                          }
                        }}
                        onManualEntry={() => {
                          setSelectedProductionSupplier(null);
                        }}
                        selectedProduct={null}
                      >
                        <Button type="button">
                          <Search className="h-4 w-4 mr-2" />
                          Browse Verified Producers
                        </Button>
                      </SupplierSelectionModal>
                    </div>
                  )}
                </div>

                {/* Production Model */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="production.productionModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Production Model *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select production model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="in-house">In-house Production</SelectItem>
                            <SelectItem value="contract">Contract Manufacturing</SelectItem>
                            <SelectItem value="co-packing">Co-packing</SelectItem>
                            <SelectItem value="hybrid">Hybrid Model</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="production.annualProductionVolume"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Annual Production Volume *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="10000" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Production Location Details */}
                <div className="space-y-4">
                  <h4 className="font-medium">Production Location Details</h4>
                  <p className="text-sm text-gray-600">Required for transportation distance calculations and fuel emission estimates</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="production.facilityLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Production Facility Location *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Edinburgh, Scotland, UK" {...field} />
                          </FormControl>
                          <FormDescription>City, Country for transportation calculations</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="production.facilityAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Facility Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Full address for precise location" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Energy Consumption */}
                <div className="space-y-4">
                  <h4 className="font-medium">Energy Consumption</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="production.energyConsumption.electricityKwh"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Electricity (kWh)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="1000" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="production.energyConsumption.renewableEnergyPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Renewable Energy (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="50" 
                              min="0" 
                              max="100"
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Water Usage */}
                <div className="space-y-4">
                  <h4 className="font-medium">Water Usage</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="production.waterUsage.processWaterLiters"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Process Water (L)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="500" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="production.waterUsage.cleaningWaterLiters"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cleaning Water (L)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="200" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>



          {/* Certifications & Awards Tab */}
          <TabsContent value="certifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-avallen-green" />
                  Certifications & Awards
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Certifications</h4>
                  <div className="space-y-2">
                    {['Organic', 'Fairtrade', 'B-Corp', 'Carbon Neutral', 'ISO 14001', 'LEED Certified', 'EU Eco-label'].map((cert) => (
                      <FormField
                        key={cert}
                        control={form.control}
                        name="certifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(cert)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, cert]);
                                  } else {
                                    field.onChange(current.filter((c: string) => c !== cert));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{cert}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Awards</h4>
                  <FormField
                    control={form.control}
                    name="awards"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>List any awards or recognitions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter awards separated by commas (e.g., Best Sustainable Product 2024, Green Business Award 2023)" 
                            rows={3}
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
                            value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distribution Tab */}
          <TabsContent value="distribution" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-avallen-green" />
                  Distribution & Logistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="distribution.averageTransportDistance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Average Transport Distance (km)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="500" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="distribution.primaryTransportMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Transport Mode</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select transport mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="road">Road Transport</SelectItem>
                            <SelectItem value="rail">Rail Transport</SelectItem>
                            <SelectItem value="sea">Sea Transport</SelectItem>
                            <SelectItem value="air">Air Transport</SelectItem>
                            <SelectItem value="multimodal">Multimodal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="distribution.distributionCenters"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Distribution Centers</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="3" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="distribution.coldChainRequired"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Cold chain required</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LCA Data Collection Tab */}
          <TabsContent value="lcadata" className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="font-medium text-blue-900 mb-2">Enhanced LCA Data Collection</h3>
              <p className="text-sm text-blue-700">
                Collect granular life cycle assessment data points for accurate environmental impact calculations. 
                This data feeds directly into ISO 14040/14044 compliant LCA reports.
              </p>
            </div>

            {/* Section 1: Agriculture & Raw Materials */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wheat className="w-5 h-5 text-avallen-green" />
                  Agriculture & Raw Materials
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lcaData.agriculture.mainCropType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Main Crop Type</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Apples, Grapes, Barley" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lcaData.agriculture.yieldTonPerHectare"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Yield (tons/hectare)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            placeholder="25.5" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lcaData.agriculture.dieselLPerHectare"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Diesel Consumption (L/hectare)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            placeholder="120.5" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lcaData.agriculture.sequestrationTonCo2PerTonCrop"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Carbon Sequestration (tCO2/ton crop)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="0.15" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Fertilizer Sub-section */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Fertilizer Application</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.agriculture.fertilizer.nitrogenKgPerHectare"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nitrogen (kg/hectare)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="150" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.agriculture.fertilizer.phosphorusKgPerHectare"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phosphorus (kg/hectare)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="60" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Land Use Sub-section */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Land Use & Practices</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.agriculture.landUse.farmingPractice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Farming Practice</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select practice" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="conventional">Conventional</SelectItem>
                              <SelectItem value="organic">Organic</SelectItem>
                              <SelectItem value="biodynamic">Biodynamic</SelectItem>
                              <SelectItem value="regenerative">Regenerative</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.agriculture.landUse.biodiversityIndex"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Biodiversity Index (0-10)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="10"
                              step="0.1"
                              placeholder="7.5" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.agriculture.landUse.soilQualityIndex"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Soil Quality Index (0-10)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="10"
                              step="0.1"
                              placeholder="8.0" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Inbound Transport */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-avallen-green" />
                  Inbound Transport
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lcaData.inboundTransport.distanceKm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transport Distance (km)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            placeholder="350" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lcaData.inboundTransport.mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transport Mode</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select transport mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="truck">Truck</SelectItem>
                            <SelectItem value="rail">Rail</SelectItem>
                            <SelectItem value="ship">Ship</SelectItem>
                            <SelectItem value="air">Air</SelectItem>
                            <SelectItem value="multimodal">Multimodal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lcaData.inboundTransport.fuelEfficiencyLper100km"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fuel Efficiency (L/100km)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            placeholder="32.5" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lcaData.inboundTransport.loadFactor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Load Factor (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="100"
                            step="1"
                            placeholder="75" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="lcaData.inboundTransport.refrigerationRequired"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Refrigeration Required</FormLabel>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 3: Processing & Production */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="w-5 h-5 text-avallen-green" />
                  Processing & Production
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Processing */}
                <div className="space-y-4">
                  <h4 className="font-medium">Basic Processing Data</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.processing.waterM3PerTonCrop"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Water Usage (m³/ton crop)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="3.5" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.processing.electricityKwhPerTonCrop"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Electricity (kWh/ton crop)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="150" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.processing.lpgKgPerLAlcohol"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>LPG Usage (kg/L alcohol)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="0.25" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.processing.angelsSharePercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Angel's Share (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="100"
                              step="0.1"
                              placeholder="2.5" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Fermentation Sub-section */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Fermentation Process</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.processing.fermentation.fermentationTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fermentation Time (days)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="1"
                              placeholder="14" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.processing.fermentation.yeastType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Yeast Type</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Wild, Commercial, House strain" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.processing.fermentation.temperatureControl"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Temperature Controlled</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.processing.fermentation.sugarAddedKg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Added Sugar (kg)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="0" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Distillation Sub-section */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Distillation Process</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.processing.distillation.distillationRounds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Distillation Rounds</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="1"
                              placeholder="2" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.processing.distillation.energySourceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Energy Source</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select energy source" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="electric">Electric</SelectItem>
                              <SelectItem value="gas">Gas</SelectItem>
                              <SelectItem value="biomass">Biomass</SelectItem>
                              <SelectItem value="steam">Steam</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.processing.distillation.heatRecoverySystem"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Heat Recovery System</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.processing.distillation.copperUsageKg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Copper Usage (kg)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="500" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Maturation Sub-section */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Maturation Process</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.processing.maturation.maturationTimeMonths"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maturation Time (months)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="1"
                              placeholder="24" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.processing.maturation.barrelType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Barrel Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select barrel type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="new_oak">New Oak</SelectItem>
                              <SelectItem value="used_oak">Used Oak</SelectItem>
                              <SelectItem value="stainless_steel">Stainless Steel</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.processing.maturation.warehouseType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warehouse Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select warehouse type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="traditional">Traditional</SelectItem>
                              <SelectItem value="racked">Racked</SelectItem>
                              <SelectItem value="climate_controlled">Climate Controlled</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.processing.maturation.evaporationLossPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Evaporation Loss (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="100"
                              step="0.1"
                              placeholder="2.0" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 4: Enhanced Packaging Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Box className="w-5 h-5 text-avallen-green" />
                  Enhanced Packaging Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Container */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Container Specifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.packagingDetailed.container.materialType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Material Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select material" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="glass">Glass</SelectItem>
                              <SelectItem value="plastic">Plastic</SelectItem>
                              <SelectItem value="aluminum">Aluminum</SelectItem>
                              <SelectItem value="steel">Steel</SelectItem>
                              <SelectItem value="ceramic">Ceramic</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.packagingDetailed.container.weightGrams"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (grams)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="500" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.packagingDetailed.container.recycledContentPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recycled Content (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="100"
                              step="1"
                              placeholder="25" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.packagingDetailed.container.transportDistanceKm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transport Distance (km)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="200" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="lcaData.packagingDetailed.container.manufacturingLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manufacturing Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Barcelona, Spain" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Label */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Label Specifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.packagingDetailed.label.materialType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Label Material</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select material" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="paper">Paper</SelectItem>
                              <SelectItem value="plastic">Plastic</SelectItem>
                              <SelectItem value="foil">Foil</SelectItem>
                              <SelectItem value="biodegradable">Biodegradable</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.packagingDetailed.label.weightGrams"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Label Weight (grams)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="3.5" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.packagingDetailed.label.inkType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ink Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select ink type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="conventional">Conventional</SelectItem>
                              <SelectItem value="eco_friendly">Eco-Friendly</SelectItem>
                              <SelectItem value="soy_based">Soy-Based</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.packagingDetailed.label.adhesiveType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adhesive Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select adhesive" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="water_based">Water-Based</SelectItem>
                              <SelectItem value="solvent_based">Solvent-Based</SelectItem>
                              <SelectItem value="hot_melt">Hot Melt</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Closure */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Closure System</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.packagingDetailed.closure.materialType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Closure Material</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select closure type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cork">Cork</SelectItem>
                              <SelectItem value="synthetic_cork">Synthetic Cork</SelectItem>
                              <SelectItem value="screw_cap">Screw Cap</SelectItem>
                              <SelectItem value="crown_cap">Crown Cap</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.packagingDetailed.closure.weightGrams"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Closure Weight (grams)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="2.5" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.packagingDetailed.closure.hasLiner"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Has Liner</FormLabel>
                        </FormItem>
                      )}
                    />

                    {form.watch('lcaData.packagingDetailed.closure.hasLiner') && (
                      <FormField
                        control={form.control}
                        name="lcaData.packagingDetailed.closure.linerMaterial"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Liner Material</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Saranex, PVdC" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                {/* Secondary Packaging */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Secondary Packaging</h4>
                  <FormField
                    control={form.control}
                    name="lcaData.packagingDetailed.secondaryPackaging.hasBox"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Uses Secondary Packaging</FormLabel>
                      </FormItem>
                    )}
                  />

                  {form.watch('lcaData.packagingDetailed.secondaryPackaging.hasBox') && (
                    <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="lcaData.packagingDetailed.secondaryPackaging.boxMaterial"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Box Material</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select material" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="cardboard">Cardboard</SelectItem>
                                  <SelectItem value="wood">Wood</SelectItem>
                                  <SelectItem value="plastic">Plastic</SelectItem>
                                  <SelectItem value="metal">Metal</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="lcaData.packagingDetailed.secondaryPackaging.boxWeightGrams"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Box Weight (grams)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.1"
                                  placeholder="150" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="lcaData.packagingDetailed.secondaryPackaging.protectiveMaterial"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Protective Material</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Foam, Bubble wrap, Paper" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="lcaData.packagingDetailed.secondaryPackaging.protectiveMaterialWeightGrams"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Protective Material Weight (grams)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.1"
                                  placeholder="25" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section 5: Distribution & Transport */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-avallen-green" />
                  Distribution & Transport
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lcaData.distribution.avgDistanceToDcKm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Average Distance to DC (km)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            placeholder="450" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lcaData.distribution.primaryTransportMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Transport Mode</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select transport mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="truck">Truck</SelectItem>
                            <SelectItem value="rail">Rail</SelectItem>
                            <SelectItem value="ship">Ship</SelectItem>
                            <SelectItem value="air">Air</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lcaData.distribution.palletizationEfficiency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Palletization Efficiency (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="100"
                            step="1"
                            placeholder="85" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lcaData.distribution.coldChainRequirement"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Cold Chain Required</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch('lcaData.distribution.coldChainRequirement') && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium">Temperature Requirements</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="lcaData.distribution.temperatureRangeCelsius.min"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Temperature (°C)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1"
                                placeholder="2" 
                                {...field} 
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lcaData.distribution.temperatureRangeCelsius.max"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maximum Temperature (°C)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1"
                                placeholder="8" 
                                {...field} 
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 6: End of Life Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Recycle className="w-5 h-5 text-avallen-green" />
                  End of Life Management (Detailed)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lcaData.endOfLifeDetailed.recyclingRatePercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recycling Rate (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="100"
                            step="1"
                            placeholder="75" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lcaData.endOfLifeDetailed.primaryDisposalMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Disposal Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select disposal method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="recycling">Recycling</SelectItem>
                            <SelectItem value="landfill">Landfill</SelectItem>
                            <SelectItem value="incineration">Incineration</SelectItem>
                            <SelectItem value="composting">Composting</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Container Recyclability */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Container Recyclability</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.endOfLifeDetailed.containerRecyclability.isRecyclable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Container is Recyclable</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.endOfLifeDetailed.containerRecyclability.recyclingInfrastructureAvailable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Recycling Infrastructure Available</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="lcaData.endOfLifeDetailed.containerRecyclability.contaminationRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contamination Rate (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="100"
                            step="1"
                            placeholder="15" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Consumer Programs */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Consumer Programs</h4>
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="lcaData.endOfLifeDetailed.labelRemovalRequired"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Label Removal Required for Recycling</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.endOfLifeDetailed.consumerEducationProgram"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Consumer Education Program</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.endOfLifeDetailed.takeback_program"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Take-back Program Available</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* End of Life Tab */}
          <TabsContent value="endoflife" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Recycle className="w-5 h-5 text-avallen-green" />
                  End of Life Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="endOfLife.recyclingRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recycling Rate (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="85" 
                            min="0" 
                            max="100"
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="endOfLife.returnableContainer"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Returnable container system</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="endOfLife.disposalMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Disposal Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select disposal method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="recycling">Recycling</SelectItem>
                          <SelectItem value="composting">Composting</SelectItem>
                          <SelectItem value="energy-recovery">Energy Recovery</SelectItem>
                          <SelectItem value="landfill">Landfill</SelectItem>
                          <SelectItem value="reuse">Reuse</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endOfLife.consumerEducation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consumer Education Initiatives</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your consumer education programs for proper disposal..." 
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Submit Button */}
          <div className="flex justify-between pt-6">
            <div className="text-sm text-gray-500">
              Tab {activeTab === 'basic' ? '1' : activeTab === 'ingredients' ? '2' : activeTab === 'packaging' ? '3' : activeTab === 'production' ? '4' : activeTab === 'certifications' ? '5' : activeTab === 'distribution' ? '6' : '7'} of 7
            </div>
            
            <div className="flex gap-3">
              {onSaveDraft && (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isDraftSaving}
                  className="text-gray-600 border-gray-300"
                >
                  {isDraftSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving Draft...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save as Draft
                    </>
                  )}
                </Button>
              )}
              
              {activeTab !== 'basic' && (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    const tabs = ['basic', 'ingredients', 'packaging', 'production', 'lcadata', 'certifications', 'distribution', 'endoflife'];
                    const currentIndex = tabs.indexOf(activeTab);
                    if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1]);
                  }}
                >
                  Previous
                </Button>
              )}
              
              {activeTab !== 'endoflife' ? (
                <Button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const tabs = ['basic', 'ingredients', 'packaging', 'production', 'lcadata', 'certifications', 'distribution', 'endoflife'];
                    const currentIndex = tabs.indexOf(activeTab);
                    if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1]);
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-[#209d50] hover:bg-[#1a8442] text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isEditing ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isEditing ? 'Update Product' : 'Create Product'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Tabs>
      </form>
    </Form>
  );
}