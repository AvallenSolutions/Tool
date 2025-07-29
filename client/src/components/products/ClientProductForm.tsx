import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, Loader2, Plus, X, Wine, Wheat, FileText, Box } from 'lucide-react';

// Client product schema
const clientProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  sku: z.string().optional(),
  type: z.string().min(1, "Product type is required"),
  volume: z.string().min(1, "Volume is required"),
  annualProductionVolume: z.number().min(1, "Annual production volume is required"),
  productionUnit: z.string().min(1, "Production unit is required"),
  productionModel: z.string().min(1, "Production model is required"),
});

interface SupplierProduct {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  supplierName: string;
  supplierCategory: string;
  productAttributes?: {
    type?: string;
    material?: string;
    weight?: number;
    volume?: string;
    co2Emissions?: number;
    recycledContent?: number;
    unit?: string;
    measurement?: number;
  };
}

interface SelectedComponent {
  id: string;
  supplierProduct: SupplierProduct;
  category: string;
  quantity: number;
  unit: string;
}

const PRODUCT_COMPONENT_CATEGORIES = [
  { id: 'primary_container', label: 'Primary Container', icon: Wine, description: 'Bottles, cans, pouches' },
  { id: 'ingredients', label: 'Ingredients', icon: Wheat, description: 'Main product ingredients' },
  { id: 'closure', label: 'Closure', icon: Box, description: 'Caps, corks, stoppers' },
  { id: 'label', label: 'Labels', icon: FileText, description: 'Product labeling' },
  { id: 'secondary_packaging', label: 'Secondary Packaging', icon: Package, description: 'Outer packaging, cases' },
];

export default function ClientProductForm({ onSuccess }: { onSuccess?: () => void }) {
  console.log('ClientProductForm component rendered');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedComponents, setSelectedComponents] = useState<SelectedComponent[]>([]);
  const [showComponentSelector, setShowComponentSelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const form = useForm({
    resolver: zodResolver(clientProductSchema),
    defaultValues: {
      name: '',
      description: '',
      sku: '',
      type: '',
      volume: '',
      annualProductionVolume: 0,
      productionUnit: 'units',
      productionModel: 'own',
    },
  });

  // Fetch supplier products for component selection
  const { data: supplierProducts = [], isLoading: supplierProductsLoading, error: supplierProductsError } = useQuery<SupplierProduct[]>({
    queryKey: ['/api/supplier-products'],
    retry: false,
  });

  // Debug logging
  console.log('Supplier products loading:', supplierProductsLoading);
  console.log('Supplier products data:', supplierProducts);
  console.log('Supplier products error:', supplierProductsError);

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const productData = {
        ...data,
        components: selectedComponents.map(comp => ({
          supplierProductId: comp.id,
          category: comp.category,
          quantity: comp.quantity,
          unit: comp.unit,
        })),
      };
      return apiRequest('POST', '/api/client-products', productData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product created successfully with selected components",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      form.reset();
      setSelectedComponents([]);
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: any) => {
    if (selectedComponents.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one component to your product",
        variant: "destructive",
      });
      return;
    }
    createProductMutation.mutate(data);
  };

  const addComponent = (supplierProduct: SupplierProduct, category: string) => {
    const newComponent: SelectedComponent = {
      id: supplierProduct.id,
      supplierProduct,
      category,
      quantity: 1,
      unit: supplierProduct.productAttributes?.unit || 'units',
    };
    
    setSelectedComponents(prev => [...prev, newComponent]);
    setShowComponentSelector(false);
    setSelectedCategory('');
  };

  const removeComponent = (componentId: string) => {
    setSelectedComponents(prev => prev.filter(comp => comp.id !== componentId));
  };

  const updateComponentQuantity = (componentId: string, quantity: number) => {
    setSelectedComponents(prev => 
      prev.map(comp => 
        comp.id === componentId ? { ...comp, quantity } : comp
      )
    );
  };

  const getProductsByCategory = (category: string) => {
    const categoryMapping: Record<string, string[]> = {
      primary_container: ['bottle_producer'],
      ingredients: ['ingredient_supplier'],
      closure: ['cap_closure_producer'],
      label: ['label_producer'],
      secondary_packaging: ['secondary_packaging_supplier'],
    };
    
    const relevantCategories = categoryMapping[category] || [];
    return supplierProducts.filter(product => 
      relevantCategories.includes(product.supplierCategory)
    );
  };

  const calculateTotalEnvironmentalImpact = () => {
    const totals = {
      co2: 0,
      weight: 0,
    };

    selectedComponents.forEach(comp => {
      const attributes = comp.supplierProduct.productAttributes;
      if (attributes) {
        // Convert CO2 emissions from grams to kg for calculation
        totals.co2 += ((attributes.co2Emissions || 0) / 1000) * comp.quantity;
        totals.weight += (attributes.weight || 0) * comp.quantity;
      }
    });

    return totals;
  };

  const environmentalImpact = calculateTotalEnvironmentalImpact();

  return (
    <div className="space-y-6 p-1">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Create Product
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Basic Product Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter product name" {...field} />
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
                      <FormLabel>SKU (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Product SKU" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Type</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="spirits">Spirits</SelectItem>
                            <SelectItem value="wine">Wine</SelectItem>
                            <SelectItem value="beer">Beer</SelectItem>
                            <SelectItem value="cider">Cider</SelectItem>
                            <SelectItem value="ready_to_drink">Ready to Drink</SelectItem>
                            <SelectItem value="non_alcoholic">Non-Alcoholic</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="volume"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Volume</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 750ml, 500ml" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="productionModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Production Model</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="own">Own Production</SelectItem>
                            <SelectItem value="contract">Contract Production</SelectItem>
                            <SelectItem value="co_packing">Co-packing</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="annualProductionVolume"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annual Production Volume</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Enter annual volume" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="productionUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Production Unit</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="units">Units</SelectItem>
                            <SelectItem value="cases">Cases</SelectItem>
                            <SelectItem value="pallets">Pallets</SelectItem>
                            <SelectItem value="liters">Liters</SelectItem>
                          </SelectContent>
                        </Select>
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
                      <Textarea placeholder="Product description" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Product Components Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Box className="w-5 h-5" />
                Product Components
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Select supplier products that make up your final product
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowComponentSelector(true)}
              disabled={showComponentSelector}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Component
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Component Selector */}
          {showComponentSelector && (
            <Card className="border-2 border-dashed border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select Component Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {PRODUCT_COMPONENT_CATEGORIES.map(category => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setSelectedCategory(category.id)}
                        className={`p-3 border rounded-lg text-left hover:bg-white transition-colors ${
                          selectedCategory === category.id 
                            ? 'border-blue-500 bg-white shadow-md' 
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-sm">{category.label}</span>
                        </div>
                        <p className="text-xs text-gray-600">{category.description}</p>
                      </button>
                    );
                  })}
                </div>

                {selectedCategory && (
                  <div className="space-y-3">
                    <Separator />
                    <h4 className="font-medium text-sm">
                      Available {PRODUCT_COMPONENT_CATEGORIES.find(c => c.id === selectedCategory)?.label}
                    </h4>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {getProductsByCategory(selectedCategory).map(product => (
                        <div 
                          key={product.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-white hover:shadow-sm transition-shadow"
                        >
                          <div className="flex-1">
                            <h5 className="font-medium text-sm">{product.name}</h5>
                            <p className="text-xs text-gray-600">by {product.supplierName}</p>
                            {product.productAttributes?.co2Emissions && (
                              <p className="text-xs text-green-600">
                                CO₂: {product.productAttributes.co2Emissions}g CO₂e
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => addComponent(product, selectedCategory)}
                            disabled={selectedComponents.some(comp => comp.id === product.id)}
                          >
                            {selectedComponents.some(comp => comp.id === product.id) ? 'Added' : 'Add'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowComponentSelector(false);
                      setSelectedCategory('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selected Components */}
          {selectedComponents.length > 0 ? (
            <div className="space-y-3">
              {selectedComponents.map(component => (
                <div key={component.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {PRODUCT_COMPONENT_CATEGORIES.find(c => c.id === component.category)?.label}
                      </Badge>
                      <h4 className="font-medium text-sm">{component.supplierProduct.name}</h4>
                    </div>
                    <p className="text-xs text-gray-600">by {component.supplierProduct.supplierName}</p>
                    {component.supplierProduct.productAttributes?.co2Emissions && (
                      <p className="text-xs text-green-600">
                        CO₂ per unit: {component.supplierProduct.productAttributes.co2Emissions}g CO₂e
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Qty:</Label>
                      <Input
                        type="number"
                        min="1"
                        value={component.quantity}
                        onChange={(e) => updateComponentQuantity(component.id, parseInt(e.target.value) || 1)}
                        className="w-20 h-8 text-xs"
                      />
                      <span className="text-xs text-gray-500">{component.unit}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeComponent(component.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No components added yet</p>
              <p className="text-sm">Add supplier products to build your final product</p>
            </div>
          )}

          {/* Environmental Impact Summary */}
          {selectedComponents.length > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-green-800">Environmental Impact Estimate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-green-700 font-medium">Total CO₂ Emissions</p>
                    <p className="text-green-800 text-lg font-semibold">
                      {environmentalImpact.co2.toFixed(2)} kg CO₂e
                    </p>
                  </div>
                  <div>
                    <p className="text-green-700 font-medium">Total Weight</p>
                    <p className="text-green-800 text-lg font-semibold">
                      {environmentalImpact.weight.toFixed(0)}g
                    </p>
                  </div>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  * Based on selected components and quantities
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button 
          onClick={form.handleSubmit(handleSubmit)}
          disabled={createProductMutation.isPending || selectedComponents.length === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          {createProductMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Product...
            </>
          ) : (
            <>
              <Package className="w-4 h-4 mr-2" />
              Create Product
            </>
          )}
        </Button>
      </div>
    </div>
  );
}