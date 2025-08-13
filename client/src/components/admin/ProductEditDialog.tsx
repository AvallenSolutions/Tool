import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ImageUploader } from '@/components/ImageUploader';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Upload, FileText, ImageIcon } from 'lucide-react';

const materialOptions = [
  { value: 'glass', label: 'Glass' },
  { value: 'plastic', label: 'Plastic' },
  { value: 'aluminium', label: 'Aluminium' },
  { value: 'steel', label: 'Steel' },
  { value: 'cardboard', label: 'Cardboard' },
];

const productEditSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  productDescription: z.string().optional(),
  sku: z.string().optional(),
  type: z.string().optional(),
  material: z.string().optional(),
  weight: z.coerce.number().optional(),
  volume: z.string().optional(),
  recycledContent: z.coerce.number().min(0).max(100).optional(),
  co2Emissions: z.coerce.number().min(0).optional(),
  certifications: z.string().optional(),
  lcaDocumentPath: z.string().optional(),
});

type ProductEditFormData = z.infer<typeof productEditSchema>;

interface ProductEditDialogProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductEditDialog({ product, isOpen, onClose }: ProductEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [uploadedDocument, setUploadedDocument] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProductEditFormData>({
    resolver: zodResolver(productEditSchema),
    defaultValues: {
      productName: '',
      productDescription: '',
      sku: '',
      type: '',
      material: '',
      weight: undefined,
      volume: '',
      recycledContent: undefined,
      co2Emissions: undefined,
      certifications: '',
      lcaDocumentPath: '',
    },
  });

  // Update form when product changes
  useEffect(() => {
    if (product && isOpen) {
      const attributes = product.productAttributes || {};
      form.reset({
        productName: product.productName || '',
        productDescription: product.productDescription || '',
        sku: product.sku || '',
        type: attributes.type || '',
        material: attributes.material || '',
        weight: attributes.weight || undefined,
        volume: attributes.volume || '',
        recycledContent: attributes.recycledContent || undefined,
        co2Emissions: attributes.co2Emissions || undefined,
        certifications: attributes.certifications || '',
        lcaDocumentPath: attributes.lcaDocumentPath || '',
      });
      
      // Set existing images
      if (attributes.imageUrls && Array.isArray(attributes.imageUrls)) {
        setProductImages(attributes.imageUrls);
      }
      
      // Set existing document
      if (attributes.lcaDocumentPath) {
        setUploadedDocument(attributes.lcaDocumentPath);
      }
    }
  }, [product, isOpen, form]);

  const updateProductMutation = useMutation({
    mutationFn: async (data: ProductEditFormData) => {
      if (!product?.id) throw new Error('Product ID is required');
      
      const updateData = {
        ...data,
        productAttributes: {
          ...product.productAttributes,
          type: data.type,
          material: data.material,
          weight: data.weight,
          volume: data.volume,
          recycledContent: data.recycledContent,
          co2Emissions: data.co2Emissions,
          certifications: data.certifications,
          lcaDocumentPath: uploadedDocument || data.lcaDocumentPath,
          imageUrls: productImages,
        }
      };

      return apiRequest('PUT', `/api/supplier-products/${product.id}`, updateData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/supplier-products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      setIsSubmitting(false);
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return data.filename;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  };

  const onSubmit = (data: ProductEditFormData) => {
    setIsSubmitting(true);
    updateProductMutation.mutate(data);
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update product information and specifications
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="productName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name *</FormLabel>
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
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter SKU" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter product description" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Product Specifications */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Type</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Wine/Spirits, Beer, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="material"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Material *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {materialOptions.map((option) => (
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (g)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Weight in grams" 
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
                name="volume"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Volume (ml)</FormLabel>
                    <FormControl>
                      <Input placeholder="Volume in ml" {...field} />
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
                      <Input 
                        type="number" 
                        placeholder="0-100%" 
                        min="0" 
                        max="100" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Environmental Data */}
            <FormField
              control={form.control}
              name="co2Emissions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CO2 Emissions (g CO2e per unit)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Enter CO2 emissions" 
                      min="0"
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
              name="certifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certifications</FormLabel>
                  <FormControl>
                    <Textarea placeholder="List relevant certifications" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Product Images */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                <Label className="text-base font-medium">Product Images</Label>
              </div>
              
              <div className="border rounded-lg p-4">
                <ImageUploader 
                  onUpload={(urls) => {
                    console.log('Edit form - ImageUploader onUpload called with:', urls);
                    setProductImages(urls);
                  }}
                  maxImages={5}
                  existingImages={productImages}
                  placeholder="Upload Product Images"
                />
                {productImages.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-green-600 mb-2">
                      {productImages.length} image(s) uploaded
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {productImages.map((url, index) => (
                        <div key={index} className="relative">
                          <img 
                            src={url.startsWith('http') ? `/objects/${url.split('/uploads/')[1]}` : url}
                            alt={`Upload ${index + 1}`} 
                            className="w-full h-20 object-cover rounded border"
                            onError={(e) => {
                              console.error('Image failed to load:', url);
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* LCA Document Upload */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <Label className="text-base font-medium">LCA Document</Label>
              </div>
              
              {uploadedDocument ? (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">LCA document uploaded</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/uploads/${uploadedDocument}`, '_blank')}
                    >
                      View
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUploadedDocument(null);
                        form.setValue('lcaDocumentPath', '');
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-4">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const filename = await handleFileUpload(file);
                          setUploadedDocument(filename);
                          form.setValue('lcaDocumentPath', filename);
                          toast({
                            title: "Success",
                            description: "LCA document uploaded successfully",
                          });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to upload LCA document",
                            variant: "destructive",
                          });
                        }
                      }
                    }}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Upload PDF, DOC, or DOCX files</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || updateProductMutation.isPending}
              >
                {isSubmitting || updateProductMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Product'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}