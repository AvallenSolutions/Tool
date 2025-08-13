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
import { Save, Loader2, Upload, Package, FileText, X, Check, Image as ImageIcon } from 'lucide-react';
import { ImageUploader } from "@/components/ImageUploader";

// Dynamic product schema based on supplier category
const createProductSchema = (supplierCategory: string) => {
  const baseSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    supplierId: z.string().min(1, "Supplier selection is required"),
    description: z.string().optional(),
    co2Emissions: z.number().min(0, "CO2 emissions must be positive").optional(),
    lcaDocumentPath: z.string().optional(),
    certifications: z.string().optional(),
  });

  if (supplierCategory === 'bottle_producer') {
    return baseSchema.extend({
      type: z.string().min(1, "Bottle type is required"),
      material: z.string().min(1, "Material is required"),
      volume: z.string().min(1, "Volume is required"),
      weight: z.number().min(0, "Weight must be positive").optional(),
      recycledContent: z.number().min(0).max(100, "Must be between 0-100%").optional(),
    });
  }
  
  if (supplierCategory === 'ingredient_supplier') {
    return baseSchema.extend({
      type: z.string().min(1, "Ingredient name is required"),
      unit: z.string().min(1, "Unit of measurement is required"),
      measurement: z.number().min(0, "Measurement must be positive").optional(),
    });
  }
  
  if (supplierCategory === 'cap_closure_producer') {
    return baseSchema.extend({
      type: z.string().min(1, "Closure type is required"),
      material: z.string().min(1, "Material is required"),
      weight: z.number().min(0, "Weight must be positive").optional(),
      recycledContent: z.number().min(0).max(100, "Must be between 0-100%").optional(),
    });
  }
  
  if (supplierCategory === 'label_producer') {
    return baseSchema.extend({
      type: z.string().min(1, "Label type is required"),
      material: z.string().min(1, "Material is required"),
      weight: z.number().min(0, "Weight must be positive").optional(),
      recycledContent: z.number().min(0).max(100, "Must be between 0-100%").optional(),
    });
  }

  // Default schema for other categories
  return baseSchema.extend({
    type: z.string().min(1, "Product type is required"),
    material: z.string().optional(),
    weight: z.number().min(0, "Weight must be positive").optional(),
    volume: z.string().optional(),
  });
};

interface Supplier {
  id: string;
  supplierName: string;
  supplierCategory: string;
  verificationStatus: string;
  isVerified: boolean;
}

export default function OptimizedProductForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState<{path: string, name: string} | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [productImages, setProductImages] = useState<string[]>([]);

  // Fetch verified suppliers
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery<Supplier[]>({
    queryKey: ['/api/verified-suppliers'],
  });

  // Create dynamic form based on selected supplier
  const productSchema = selectedSupplier ? createProductSchema(selectedSupplier.supplierCategory) : z.object({});

  const form = useForm({
    resolver: selectedSupplier ? zodResolver(productSchema) : undefined,
    defaultValues: {
      name: '',
      supplierId: '',
      description: '',
      co2Emissions: undefined,
      lcaDocumentPath: '',
      certifications: '',
      type: '',
      material: '',
      weight: undefined,
      volume: '',
      recycledContent: undefined,
      unit: '',
      measurement: undefined,
    } as any,
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/supplier-products', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product created successfully and linked to supplier",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/supplier-products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      form.reset();
      setSelectedSupplier(null);
      setProductImages([]); // Clear uploaded images
      setUploadedDocument(null); // Clear uploaded document
      setIsSubmitting(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    setSelectedSupplier(supplier || null);
    form.setValue('supplierId', supplierId);
    // Reset form fields when supplier changes
    form.reset({
      supplierId,
      name: '',
      description: '',
      co2Emissions: undefined,
      lcaDocumentPath: '',
      certifications: '',
      type: '',
      material: '',
      weight: undefined,
      volume: '',
      recycledContent: undefined,
      unit: '',
      measurement: undefined,
    });
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('lcaDocument', file);

      const response = await fetch('/api/upload-lca-document', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        setUploadedDocument({
          path: result.documentPath,
          name: result.originalName
        });
        form.setValue('lcaDocumentPath', result.documentPath);
        toast({
          title: "Success",
          description: "LCA document uploaded successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to upload document",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload LCA document",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeUploadedDocument = () => {
    setUploadedDocument(null);
    form.setValue('lcaDocumentPath', '');
  };

  const handleSubmit = (data: any) => {
    if (!selectedSupplier) {
      toast({
        title: "Error",
        description: "Please select a supplier first",
        variant: "destructive",
      });
      return;
    }
    
    // Include product images in submission data
    const submissionData = {
      ...data,
      imageUrls: productImages,
    };
    
    console.log('Submitting product with data:', submissionData);
    setIsSubmitting(true);
    createProductMutation.mutate(submissionData);
  };

  const renderCategorySpecificFields = () => {
    if (!selectedSupplier) return null;

    const category = selectedSupplier.supplierCategory;

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Common Fields */}
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
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {category === 'bottle_producer' ? 'Bottle Type' : 
                     category === 'ingredient_supplier' ? 'Ingredient Name' : 
                     category === 'cap_closure_producer' ? 'Closure Type' : 
                     category === 'label_producer' ? 'Label Type' : 'Product Type'}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={`Enter ${category === 'bottle_producer' ? 'bottle type' : 
                                                  category === 'ingredient_supplier' ? 'ingredient name' : 
                                                  category === 'cap_closure_producer' ? 'closure type' : 
                                                  category === 'label_producer' ? 'label type' : 'product type'}`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Category-Specific Fields */}
          {(category === 'bottle_producer' || category === 'cap_closure_producer' || category === 'label_producer') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="material"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Glass">Glass</SelectItem>
                          <SelectItem value="Plastic">Plastic</SelectItem>
                          <SelectItem value="aluminium">Aluminium</SelectItem>
                          <SelectItem value="steel">Steel</SelectItem>
                          <SelectItem value="cardboard">Cardboard</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (grams)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Enter weight in grams" {...field} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {category === 'bottle_producer' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                name="recycledContent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recycled Content (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" placeholder="0-100" {...field} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {category === 'ingredient_supplier' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit of Measurement</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">Kilograms (kg)</SelectItem>
                          <SelectItem value="g">Grams (g)</SelectItem>
                          <SelectItem value="l">Liters (l)</SelectItem>
                          <SelectItem value="ml">Milliliters (ml)</SelectItem>
                          <SelectItem value="tonnes">Tonnes</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="measurement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Measurement</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Enter quantity" {...field} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {(category === 'cap_closure_producer' || category === 'label_producer') && (
            <FormField
              control={form.control}
              name="recycledContent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recycled Content (%)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" max="100" placeholder="0-100" {...field} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Common Fields for All Categories */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter product description" rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="co2Emissions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CO2 Emissions (g CO2e)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="0.01" placeholder="Enter CO2 emissions" {...field} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lcaDocumentPath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LCA Document Upload</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {!uploadedDocument ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600 mb-2">Upload LCA document (PDF, DOC, DOCX)</p>
                          <Input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(file);
                              }
                            }}
                            disabled={isUploading}
                            className="hidden"
                            id="lca-upload"
                          />
                          <Label 
                            htmlFor="lca-upload" 
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-md cursor-pointer hover:bg-blue-100"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                Choose File
                              </>
                            )}
                          </Label>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <Check className="w-5 h-5 text-green-600" />
                          <div className="flex-1">
                            <p className="text-sm text-green-800 font-medium">{uploadedDocument.name}</p>
                            <a 
                              href={`/uploads/${uploadedDocument.path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              📄 View LCA Document
                            </a>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removeUploadedDocument}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="certifications"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Certifications</FormLabel>
                <FormControl>
                  <Textarea placeholder="List relevant certifications (e.g., FSC, ISO 14001, etc.)" rows={2} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Product Images */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              <Label className="text-base font-medium">Product Images (Optional)</Label>
            </div>
            <p className="text-sm text-gray-600">
              Upload product photos to showcase your items. These images will be visible to customers.
            </p>
            
            <div className="border rounded-lg p-4">
              <ImageUploader 
                onUpload={(urls) => {
                  console.log('ImageUploader onUpload called with:', urls);
                  setProductImages(urls);
                  // Prevent form submission by not calling any form methods
                }}
                maxImages={5}
                existingImages={productImages}
                placeholder="Upload Product Images"
              />
              {productImages.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-green-600 mb-2">
                    {productImages.length} image(s) ready for submission
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {productImages.map((url, index) => (
                      <div key={index} className="relative">
                        <img 
                          src={url} 
                          alt={`Upload ${index + 1}`} 
                          className="w-full h-20 object-cover rounded border"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={isSubmitting || createProductMutation.isPending}
          >
            {isSubmitting || createProductMutation.isPending ? (
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
        </form>
      </Form>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Register New Product
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Supplier Selection */}
        <div className="space-y-2">
          <Label>Select Supplier</Label>
          <Select onValueChange={handleSupplierChange} disabled={suppliersLoading}>
            <SelectTrigger>
              <SelectValue placeholder={suppliersLoading ? "Loading suppliers..." : "Choose a verified supplier"} />
            </SelectTrigger>
            <SelectContent>
              {suppliers.filter(s => s.isVerified).map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.supplierName} ({supplier.supplierCategory.replace('_', ' ')})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSupplier && (
            <p className="text-sm text-muted-foreground">
              Selected: {selectedSupplier.supplierName} - {selectedSupplier.supplierCategory.replace('_', ' ')}
            </p>
          )}
        </div>

        {selectedSupplier ? (
          renderCategorySpecificFields()
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Please select a supplier to continue with product registration</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}