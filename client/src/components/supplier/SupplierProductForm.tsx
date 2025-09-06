import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, Package, Award, Upload, Building2, CheckCircle, AlertCircle } from 'lucide-react';
import { ImageUploader } from '@/components/ImageUploader';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Supplier Product Schema - Based on supplierProducts table
const supplierProductSchema = z.object({
  // Basic Product Information
  productName: z.string().min(1, "Product name is required"),
  productDescription: z.string().min(1, "Product description is required"),
  sku: z.string().optional(),

  // Product Attributes (JSON) - Key specifications
  productAttributes: z.object({
    material: z.string().min(1, "Material is required"),
    weight: z.coerce.number().min(0, "Weight must be positive").optional(),
    weight_grams: z.coerce.number().min(0, "Weight must be positive").optional(),
    dimensions: z.string().optional(),
    color: z.string().optional(),
    thickness: z.coerce.number().optional(),
    recycledContent: z.coerce.number().min(0).max(100).optional(),
    recycled_content_percent: z.coerce.number().min(0).max(100).optional(),
    recyclability: z.string().optional(),
    co2Emissions: z.coerce.number().min(0).optional(), // grams CO2e per unit
    durability: z.string().optional(),
    certifications: z.array(z.string()).optional().default([]),
    specifications: z.record(z.string(), z.any()).optional().default({}),
  }),

  // LCA Data (Optional - can be uploaded as JSON)
  hasPrecalculatedLca: z.boolean().default(false),
  lcaDataJson: z.record(z.string(), z.any()).optional(),

  // Pricing and Availability
  basePrice: z.coerce.number().min(0).optional(),
  currency: z.string().default("USD"),
  minimumOrderQuantity: z.coerce.number().min(1).optional(),
  leadTimeDays: z.coerce.number().min(1).optional(),

  // Certifications (Array of strings)
  certifications: z.array(z.string()).optional().default([]),

  // Image
  imageUrl: z.string().optional(),

  // Workflow fields (populated automatically)
  submittedBy: z.literal('ADMIN').default('ADMIN'),
  submissionStatus: z.literal('approved').default('approved'), // Admin submissions are auto-approved
});

type SupplierProductFormData = z.infer<typeof supplierProductSchema>;

interface SupplierProductFormProps {
  supplierId: string;
  supplierName: string;
  supplierCategory: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: Partial<SupplierProductFormData>;
  isSubmitting?: boolean;
}

// Material options by supplier category
const materialOptions = {
  bottle_producer: ["Glass", "PET Plastic", "HDPE Plastic", "Aluminum", "Stainless Steel"],
  cap_closure_producer: ["Cork", "Aluminum", "Plastic (PP)", "Plastic (PE)", "Synthetic Cork", "Metal Screw Cap"],
  label_producer: ["Paper", "Vinyl", "Polyethylene", "Polypropylene", "Foil", "Waterproof Paper"],
  ingredient_supplier: ["Organic", "Conventional", "Fair Trade", "Local", "Imported"],
  packaging_supplier: ["Cardboard", "Corrugated", "Foam", "Bubble Wrap", "Paper", "Plastic"],
  other: ["Glass", "Metal", "Plastic", "Paper", "Cork", "Composite"]
};

const certificationOptions = [
  "ISO 9001", "ISO 14001", "FSC Certified", "Organic", "Fair Trade",
  "B Corp", "Carbon Neutral", "Recyclable", "Biodegradable", "Food Safe",
  "FDA Approved", "CE Marked", "REACH Compliant"
];

export default function SupplierProductForm({ 
  supplierId, 
  supplierName, 
  supplierCategory, 
  onSubmit, 
  onCancel, 
  initialData,
  isSubmitting = false 
}: SupplierProductFormProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("basic");

  const form = useForm<SupplierProductFormData>({
    resolver: zodResolver(supplierProductSchema),
    defaultValues: {
      productName: "",
      productDescription: "",
      sku: "",
      productAttributes: {
        material: "",
        certifications: [],
        specifications: {},
      },
      hasPrecalculatedLca: false,
      currency: "USD",
      certifications: [],
      submittedBy: 'ADMIN',
      submissionStatus: 'approved',
      ...initialData,
    },
  });

  const availableMaterials = materialOptions[supplierCategory as keyof typeof materialOptions] || materialOptions.other;

  const handleSubmit = (data: SupplierProductFormData) => {
    // Add supplier ID and auto-approval for admin submissions
    const supplierProductData = {
      ...data,
      supplierId,
      isVerified: true, // Admin submissions are auto-verified
      verifiedAt: new Date().toISOString(),
      submittedBy: 'ADMIN',
      submissionStatus: 'approved',
    };

    console.log('🚀 Submitting supplier product:', supplierProductData);
    onSubmit(supplierProductData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Create Supplier Product</h2>
          <p className="text-muted-foreground">
            Adding product for: <span className="font-medium">{supplierName}</span>
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Building2 className="w-3 h-3" />
          {supplierCategory.replace('_', ' ').split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')}
        </Badge>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="specifications" className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                Specifications
              </TabsTrigger>
              <TabsTrigger value="lca" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                LCA Data
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Pricing & Availability
              </TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="productName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Premium Glass Bottle 750ml" {...field} />
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
                          <FormLabel>SKU / Product Code</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., GB750-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="productDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Description *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Detailed description of the product, including key features and specifications..."
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Product Image */}
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Image</FormLabel>
                        <FormControl>
                          <ImageUploader
                            value={field.value ? [field.value] : []}
                            onChange={(urls) => field.onChange(urls[0] || "")}
                            maxImages={1}
                          />
                        </FormControl>
                        <FormDescription>
                          Upload a clear product image for supplier catalog
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Specifications Tab */}
            <TabsContent value="specifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Specifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="productAttributes.material"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Material *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select material" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableMaterials.map((material) => (
                                <SelectItem key={material} value={material}>
                                  {material}
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
                      name="productAttributes.weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (grams)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 530" 
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value ? Number(value) : undefined);
                                // Also set weight_grams for compatibility
                                form.setValue('productAttributes.weight_grams', value ? Number(value) : undefined);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="productAttributes.color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Clear" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="productAttributes.thickness"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Thickness (mm)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="e.g., 3.5" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="productAttributes.recycledContent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recycled Content (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="100"
                              placeholder="e.g., 61" 
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value ? Number(value) : undefined);
                                // Also set recycled_content_percent for compatibility
                                form.setValue('productAttributes.recycled_content_percent', value ? Number(value) : undefined);
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
                      name="productAttributes.dimensions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dimensions</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 30cm H x 8cm D" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="productAttributes.recyclability"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recyclability</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select recyclability" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="fully-recyclable">Fully Recyclable</SelectItem>
                              <SelectItem value="partially-recyclable">Partially Recyclable</SelectItem>
                              <SelectItem value="not-recyclable">Not Recyclable</SelectItem>
                              <SelectItem value="compostable">Compostable</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Certifications */}
                  <FormField
                    control={form.control}
                    name="certifications"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Certifications</FormLabel>
                        <FormDescription>
                          Select all applicable certifications for this product
                        </FormDescription>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {certificationOptions.map((cert) => (
                            <div key={cert} className="flex items-center space-x-2">
                              <Checkbox
                                id={cert}
                                checked={field.value?.includes(cert) || false}
                                onCheckedChange={(checked) => {
                                  const currentCerts = field.value || [];
                                  if (checked) {
                                    field.onChange([...currentCerts, cert]);
                                  } else {
                                    field.onChange(currentCerts.filter(c => c !== cert));
                                  }
                                }}
                              />
                              <label htmlFor={cert} className="text-sm">
                                {cert}
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* LCA Data Tab */}
            <TabsContent value="lca" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Environmental Impact Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="hasPrecalculatedLca"
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
                            I have pre-calculated LCA data for this product
                          </FormLabel>
                          <FormDescription>
                            Check this if you have existing environmental impact data
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="productAttributes.co2Emissions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CO₂ Emissions (grams CO₂e per unit)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            placeholder="e.g., 500.0" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormDescription>
                          Carbon footprint for manufacturing one unit of this product
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch('hasPrecalculatedLca') && (
                    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="mt-4">
                          <p className="text-sm text-gray-600">
                            LCA data upload functionality will be implemented here
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Support for JSON, CSV, and Excel formats
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pricing & Availability Tab */}
            <TabsContent value="pricing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pricing & Availability</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="basePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Price per Unit</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="e.g., 2.50" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="GBP">GBP (£)</SelectItem>
                              <SelectItem value="JPY">JPY (¥)</SelectItem>
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
                      name="minimumOrderQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Order Quantity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 1000" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="leadTimeDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lead Time (Days)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 30" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
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
          </Tabs>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Product...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Create Supplier Product
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}