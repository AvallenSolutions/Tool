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

// Enhanced Product Schema with all 8 tabs
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
  
  // Packaging Tab
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
          <TabsList className="grid w-full grid-cols-7 mb-6">
            <TabsTrigger value="basic" className="text-xs">Basic Info</TabsTrigger>
            <TabsTrigger value="ingredients" className="text-xs">Ingredients</TabsTrigger>
            <TabsTrigger value="packaging" className="text-xs">Packaging</TabsTrigger>
            <TabsTrigger value="production" className="text-xs">Production</TabsTrigger>
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
                              // Auto-fill packaging data from supplier product
                              const productAttrs = supplier.productAttributes || {};
                              const lcaData = supplier.lcaDataJson || {};
                              
                              const supplierAddr = supplier.supplierAddress || {};
                              form.setValue('packaging.primaryContainer.material', productAttrs.material || '');
                              form.setValue('packaging.primaryContainer.weight', productAttrs.weight || productAttrs.weight_grams || 0);
                              form.setValue('packaging.primaryContainer.recycledContent', productAttrs.recycledContent || productAttrs.recycled_content_percent || 0);
                              form.setValue('packaging.primaryContainer.color', productAttrs.color || '');
                              form.setValue('packaging.primaryContainer.origin', `${supplierAddr.city || ''}, ${supplierAddr.country || ''}`.replace(/^, |, $/, '') || '');
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
                          // Auto-fill packaging data from supplier product
                          const productAttrs = supplier.productAttributes || {};
                          const lcaData = supplier.lcaDataJson || {};
                          
                          const supplierAddr = supplier.supplierAddress || {};
                          form.setValue('packaging.primaryContainer.material', productAttrs.material || '');
                          form.setValue('packaging.primaryContainer.weight', productAttrs.weight || productAttrs.weight_grams || 0);
                          form.setValue('packaging.primaryContainer.recycledContent', productAttrs.recycledContent || productAttrs.recycled_content_percent || 0);
                          form.setValue('packaging.primaryContainer.color', productAttrs.color || '');
                          form.setValue('packaging.primaryContainer.origin', `${supplierAddr.city || ''}, ${supplierAddr.country || ''}`.replace(/^, |, $/, '') || '');
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
                      name="packaging.primaryContainer.name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Container Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 750ml Burgundy Bottle" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="packaging.primaryContainer.material"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Material *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                            <Input placeholder="Clear, Green, Amber" {...field} />
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
                            <Input placeholder="e.g., Paris, France" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
                    const tabs = ['basic', 'ingredients', 'packaging', 'production', 'certifications', 'distribution', 'endoflife'];
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
                    const tabs = ['basic', 'ingredients', 'packaging', 'production', 'certifications', 'distribution', 'endoflife'];
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