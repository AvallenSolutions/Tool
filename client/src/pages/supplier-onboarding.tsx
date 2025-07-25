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
import AutoDataExtractionEnhanced from "@/components/suppliers/AutoDataExtractionEnhanced";
import PDFUploadExtraction from "@/components/suppliers/PDFUploadExtraction";
import VerificationWorkflow from "@/components/suppliers/VerificationWorkflow";
import ImageUpload from "@/components/suppliers/ImageUpload";
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
  const [savedProductId, setSavedProductId] = useState<string | null>(null);
  const [showImageUpload, setShowImageUpload] = useState(false);

  const form = useForm<SupplierProductForm>({
    resolver: zodResolver(supplierProductSchema),
    defaultValues: {
      hasPrecalculatedLca: false,
      certifications: [],
    }
  });

  const submitMutation = useMutation({
    mutationFn: async (data: SupplierProductForm) => {
      // If we have auto-extracted data with supplier info, use enhanced endpoint
      if (autoExtractedData?.supplierData) {
        const response = await apiRequest("POST", "/api/supplier-products/enhanced", {
          supplierData: autoExtractedData.supplierData,
          productData: {
            productName: data.productName,
            description: data.description,
            materialType: data.materialType,
            weight: data.weight,
            weightUnit: data.weightUnit,
            capacity: data.capacity,
            capacityUnit: data.capacityUnit,
            dimensions: data.height || data.width || data.depth ? {
              height: data.height,
              width: data.width,
              depth: data.depth,
              unit: data.dimensionUnit
            } : undefined,
            recycledContent: data.recycledContent,
            color: data.color,
            sku: data.sku,
            price: data.unitPrice,
            currency: data.currency,
            certifications: data.certifications
          },
          selectedImages: autoExtractedData.selectedImages || []
        });
        return response.json();
      } else {
        // Use regular endpoint if no supplier data
        const response = await apiRequest("POST", "/api/supplier-products", data);
        return response.json();
      }
    },
    onSuccess: (response) => {
      const productData = response.data || response;
      setSavedProductId(productData.id);
      
      // Check if we have images from auto-extraction
      const hasImages = autoExtractedData?.selectedImages?.length > 0 || 
                       autoExtractedData?.productImage || 
                       autoExtractedData?.additionalImages?.length > 0;
      
      if (!hasImages) {
        setShowImageUpload(true);
        toast({
          title: "Product Saved Successfully",
          description: "Your product has been saved. You can now upload images if needed.",
        });
      } else {
        toast({
          title: "Product Submitted Successfully",
          description: "Your product has been added to our supplier network for review.",
        });
        setCurrentStep(3);
      }
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
    // Handle both supplier and product data
    const productData = extractedData.productData;
    const supplierData = extractedData.supplierData;
    // Map extracted product data to form fields
    const mappedData: Partial<SupplierProductForm> = {};

    if (productData?.productName) {
      mappedData.productName = productData.productName;
    }
    if (productData?.description) {
      mappedData.description = productData.description;
    }
    if (productData?.materialType) {
      mappedData.materialType = productData.materialType;
    }
    if (productData?.weight) {
      mappedData.weight = productData.weight;
      mappedData.weightUnit = productData.weightUnit || 'g';
    }
    if (productData?.capacity) {
      mappedData.capacity = productData.capacity;
      mappedData.capacityUnit = productData.capacityUnit || 'ml';
    }
    if (productData?.dimensions) {
      if (productData.dimensions.height) mappedData.height = productData.dimensions.height;
      if (productData.dimensions.width) mappedData.width = productData.dimensions.width;
      if (productData.dimensions.depth) mappedData.depth = productData.dimensions.depth;
      if (productData.dimensions.unit) mappedData.dimensionUnit = productData.dimensions.unit;
    }
    if (productData?.recycledContent) {
      mappedData.recycledContent = productData.recycledContent;
    }
    if (productData?.certifications) {
      mappedData.certifications = productData.certifications;
    }
    if (productData?.sku) {
      mappedData.sku = productData.sku;
    }
    if (productData?.color) {
      mappedData.color = productData.color;
    }
    if (productData?.price) {
      mappedData.unitPrice = productData.price;
      mappedData.currency = productData.currency || 'USD';
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

  const handleImagesUploaded = (imageUrls: string[]) => {
    toast({
      title: "Images Uploaded Successfully",
      description: `${imageUrls.length} image${imageUrls.length !== 1 ? 's' : ''} have been added to your product.`,
    });
    setShowImageUpload(false);
    setCurrentStep(3); // Move to completion step
  };

  const skipImageUpload = () => {
    toast({
      title: "Product Submitted",
      description: "Your product has been submitted without images. You can add images later if needed.",
    });
    setShowImageUpload(false);
    setCurrentStep(3);
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
                <AutoDataExtractionEnhanced 
                  onDataExtracted={handleAutoDataExtracted}
                  disabled={submitMutation.isPending}
                />
                
                <div className="text-center text-gray-500 font-medium">
                  — OR —
                </div>
                
                <PDFUploadExtraction 
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

            {/* Image Upload Step - Show when product is saved but no images */}
            {showImageUpload && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-avallen-green" />
                      Add Product Images
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <p className="text-gray-600">
                        Your product has been saved successfully! Since no suitable images were found during data extraction, 
                        you can upload your own product images here.
                      </p>
                    </div>
                    
                    <ImageUpload 
                      onImagesUploaded={handleImagesUploaded}
                      maxImages={5}
                      disabled={false}
                    />
                    
                    <div className="flex justify-between mt-6">
                      <Button 
                        variant="outline"
                        onClick={skipImageUpload}
                      >
                        Skip Images
                      </Button>
                      <p className="text-sm text-gray-500 self-center">
                        You can add images later if needed
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 3: Success */}
            {currentStep === 3 && (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-avallen-green mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                    Product Submitted Successfully!
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Your product information has been submitted for review and will be added to our verified supplier network once approved.
                  </p>
                  <Button 
                    onClick={() => {
                      setCurrentStep(1);
                      setAutoExtractedData(null);
                      setSavedProductId(null);
                      setShowImageUpload(false);
                      form.reset();
                    }}
                    className="bg-avallen-green hover:bg-green-600 text-white"
                  >
                    Submit Another Product
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}