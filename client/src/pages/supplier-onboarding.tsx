import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import AutoDataExtraction from "@/components/suppliers/AutoDataExtraction";
import VerificationWorkflow from "@/components/suppliers/VerificationWorkflow";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { 
  Package, 
  Building2, 
  FileText, 
  CheckCircle, 
  ArrowLeft,
  ArrowRight,
  Save
} from "lucide-react";

const supplierProductSchema = z.object({
  // Basic Product Information
  productName: z.string().min(1, "Product name is required"),
  sku: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),

  // Material & Physical Properties
  materialType: z.string().optional(),
  weight: z.number().optional(),
  weightUnit: z.string().optional(),
  capacity: z.number().optional(),
  capacityUnit: z.string().optional(),
  color: z.string().optional(),

  // Dimensions
  height: z.number().optional(),
  width: z.number().optional(),
  depth: z.number().optional(),
  dimensionUnit: z.string().optional(),

  // Sustainability
  recycledContent: z.number().min(0).max(100).optional(),
  certifications: z.array(z.string()).optional(),

  // Pricing & Availability
  unitPrice: z.number().min(0).optional(),
  currency: z.string().optional(),
  minimumOrderQuantity: z.number().min(1).optional(),
  leadTimeDays: z.number().min(0).optional(),

  // LCA Data
  hasPrecalculatedLca: z.boolean().default(false),
  lcaCarbonFootprint: z.number().optional(),
  lcaWaterFootprint: z.number().optional(),
});

type SupplierProductForm = z.infer<typeof supplierProductSchema>;

export default function SupplierOnboarding() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [autoExtractedData, setAutoExtractedData] = useState<any>(null);

  const form = useForm<SupplierProductForm>({
    resolver: zodResolver(supplierProductSchema),
    defaultValues: {
      hasPrecalculatedLca: false,
      certifications: [],
    }
  });

  const submitMutation = useMutation({
    mutationFn: async (data: SupplierProductForm) => {
      const response = await apiRequest("POST", "/api/supplier-products", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Product Submitted Successfully",
        description: "Your product information has been submitted for review.",
      });
      form.reset();
      setCurrentStep(1);
      setAutoExtractedData(null);
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: "Failed to submit product information. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAutoDataExtracted = (extractedData: any) => {
    // Map extracted data to form fields
    const mappedData: Partial<SupplierProductForm> = {};

    if (extractedData.productName) {
      mappedData.productName = extractedData.productName;
    }
    if (extractedData.description) {
      mappedData.description = extractedData.description;
    }
    if (extractedData.materialType) {
      mappedData.materialType = extractedData.materialType;
    }
    if (extractedData.weight) {
      mappedData.weight = extractedData.weight;
      mappedData.weightUnit = extractedData.weightUnit || 'g';
    }
    if (extractedData.capacity) {
      mappedData.capacity = extractedData.capacity;
      mappedData.capacityUnit = extractedData.capacityUnit || 'ml';
    }
    if (extractedData.dimensions) {
      if (extractedData.dimensions.height) mappedData.height = extractedData.dimensions.height;
      if (extractedData.dimensions.width) mappedData.width = extractedData.dimensions.width;
      if (extractedData.dimensions.depth) mappedData.depth = extractedData.dimensions.depth;
      if (extractedData.dimensions.unit) mappedData.dimensionUnit = extractedData.dimensions.unit;
    }
    if (extractedData.recycledContent) {
      mappedData.recycledContent = extractedData.recycledContent;
    }
    if (extractedData.certifications) {
      mappedData.certifications = extractedData.certifications;
    }
    if (extractedData.sku) {
      mappedData.sku = extractedData.sku;
    }
    if (extractedData.color) {
      mappedData.color = extractedData.color;
    }
    if (extractedData.price) {
      mappedData.unitPrice = extractedData.price;
      mappedData.currency = extractedData.currency || 'USD';
    }

    // Set the form values
    Object.entries(mappedData).forEach(([key, value]) => {
      form.setValue(key as keyof SupplierProductForm, value as any);
    });

    setAutoExtractedData(extractedData);
    setCurrentStep(2); // Move to the form step

    toast({
      title: "Data Imported Successfully",
      description: "Product information has been pre-filled. Please review and complete any missing fields.",
    });
  };

  const onSubmit = (data: SupplierProductForm) => {
    submitMutation.mutate(data);
  };

  const progress = ((currentStep - 1) / 2) * 100;

  const steps = [
    { number: 1, title: "Import Data", icon: Package },
    { number: 2, title: "Review & Complete", icon: FileText },
    { number: 3, title: "Submit", icon: CheckCircle },
  ];

  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header 
          title="Supplier Product Onboarding" 
          subtitle="Add your product to our verified supplier network" 
        />
        
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Progress Header */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-avallen-green" />
                  Product Onboarding Process
                </CardTitle>
                <div className="space-y-4">
                  <Progress value={progress} className="w-full" />
                  <div className="flex justify-between">
                    {steps.map((step) => (
                      <div key={step.number} className="flex items-center space-x-2">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                          ${currentStep >= step.number 
                            ? 'bg-avallen-green text-white' 
                            : 'bg-gray-200 text-gray-600'
                          }
                        `}>
                          {currentStep > step.number ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            step.number
                          )}
                        </div>
                        <span className={`text-sm font-medium ${
                          currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {step.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Step 1: Auto Data Extraction */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <AutoDataExtraction 
                  onDataExtracted={handleAutoDataExtracted}
                  disabled={submitMutation.isPending}
                />
                
                <div className="flex justify-between">
                  <Button variant="outline" disabled>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep(2)}
                    variant="outline"
                  >
                    Skip Auto-Import
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Manual Form */}
            {currentStep === 2 && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-avallen-green" />
                        Product Information
                        {autoExtractedData && (
                          <Badge variant="secondary" className="ml-2">
                            Auto-imported data
                          </Badge>
                        )}
                      </CardTitle>
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
                                <Input placeholder="e.g., 750ml Glass Bottle" {...field} />
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
                              <FormLabel>SKU</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., GB-750-CLEAR" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="packaging">Packaging</SelectItem>
                                  <SelectItem value="ingredient">Ingredient</SelectItem>
                                  <SelectItem value="equipment">Equipment</SelectItem>
                                  <SelectItem value="service">Service</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="materialType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Material Type</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Glass, Plastic, Aluminum" {...field} />
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
                                placeholder="Describe your product, its features, and benefits..."
                                className="min-h-[100px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="weight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weight</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="540" 
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="weightUnit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weight Unit</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Unit" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="g">grams (g)</SelectItem>
                                  <SelectItem value="kg">kilograms (kg)</SelectItem>
                                  <SelectItem value="lbs">pounds (lbs)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="recycledContent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Recycled Content (%)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max="100" 
                                  placeholder="50" 
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                          name="capacity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Capacity</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="750" 
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                                    <SelectValue placeholder="Unit" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="ml">milliliters (ml)</SelectItem>
                                  <SelectItem value="l">liters (l)</SelectItem>
                                  <SelectItem value="fl oz">fluid ounces (fl oz)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name="height"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Height</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="300" 
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="width"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Width</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="85" 
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="depth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Depth</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="85" 
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="dimensionUnit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dimension Unit</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Unit" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="mm">millimeters (mm)</SelectItem>
                                  <SelectItem value="cm">centimeters (cm)</SelectItem>
                                  <SelectItem value="in">inches (in)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-between">
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => setCurrentStep(1)}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                    <div className="flex gap-2">
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => {
                          // Save as draft
                          toast({
                            title: "Draft Saved",
                            description: "Your progress has been saved.",
                          });
                        }}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Draft
                      </Button>
                      <Button 
                        type="submit"
                        disabled={submitMutation.isPending}
                        className="bg-avallen-green hover:bg-green-600 text-white"
                      >
                        {submitMutation.isPending ? (
                          <>
                            <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            Submit for Review
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}