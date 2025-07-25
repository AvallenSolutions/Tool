import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Building2, 
  Package, 
  Edit3, 
  Check,
  X,
  Trash2,
  GripVertical
} from "lucide-react";

// Schema for the editable data
const editableDataSchema = z.object({
  // Supplier Information
  companyName: z.string().min(1, "Company name is required"),
  type: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal("")),
  
  // Product Information
  name: z.string().min(1, "Product name is required"),
  productType: z.string().optional(),
  material: z.string().optional(),
  weight: z.coerce.number().min(0).optional(),
  weightUnit: z.string().optional(),
  recycledContent: z.coerce.number().min(0).max(100).optional(),
});

type EditableDataForm = z.infer<typeof editableDataSchema>;

interface ExtractedSupplierData {
  companyName?: string;
  type?: string;
  address?: string;
  website?: string;
  contactEmail?: string;
}

interface ExtractedProductData {
  name?: string;
  photos?: string[];
  type?: string;
  material?: string;
  weight?: number;
  weightUnit?: string;
  recycledContent?: number;
}

interface EditableDataPreviewProps {
  extractedData: {
    supplierData?: ExtractedSupplierData;
    productData?: ExtractedProductData;
  };
  onApprove: (approvedData: EditableDataForm & { selectedPhotos: string[] }) => void;
  onCancel: () => void;
}

export default function EditableDataPreview({ 
  extractedData, 
  onApprove, 
  onCancel 
}: EditableDataPreviewProps) {
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>(
    extractedData.productData?.photos || []
  );

  const form = useForm<EditableDataForm>({
    resolver: zodResolver(editableDataSchema),
    defaultValues: {
      // Supplier data
      companyName: extractedData.supplierData?.companyName || "",
      type: extractedData.supplierData?.type || "",
      address: extractedData.supplierData?.address || "",
      website: extractedData.supplierData?.website || "",
      contactEmail: extractedData.supplierData?.contactEmail || "",
      
      // Product data
      name: extractedData.productData?.name || "",
      productType: extractedData.productData?.type || "",
      material: extractedData.productData?.material || "",
      weight: extractedData.productData?.weight || undefined,
      weightUnit: extractedData.productData?.weightUnit || "",
      recycledContent: extractedData.productData?.recycledContent || undefined,
    }
  });

  const onSubmit = (data: EditableDataForm) => {
    console.log('🎯 EditableDataPreview onSubmit called with data:', data);
    console.log('🎯 Selected photos:', selectedPhotos);
    const approvedData = {
      ...data,
      selectedPhotos
    };
    console.log('🎯 Final approved data being sent:', approvedData);
    onApprove(approvedData);
  };

  const handlePhotoSelect = (photoUrl: string) => {
    setSelectedPhotos(prev => 
      prev.includes(photoUrl) 
        ? prev.filter(url => url !== photoUrl)
        : prev.length < 5 ? [...prev, photoUrl] : prev
    );
  };

  const handlePhotoDelete = (photoUrl: string) => {
    setSelectedPhotos(prev => prev.filter(url => url !== photoUrl));
  };

  const handlePhotoReorder = (fromIndex: number, toIndex: number) => {
    setSelectedPhotos(prev => {
      const newOrder = [...prev];
      const [removed] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, removed);
      return newOrder;
    });
  };

  const allPhotos = extractedData.productData?.photos || [];
  const unselectedPhotos = allPhotos.filter(photo => !selectedPhotos.includes(photo));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-600" />
            Review & Edit Extracted Data
            <Badge variant="secondary" className="ml-2">
              {Object.keys(extractedData.supplierData || {}).length + Object.keys(extractedData.productData || {}).length} fields extracted
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Supplier Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Building2 className="w-5 h-5 text-avallen-green" />
                  <h3 className="text-lg font-semibold">Supplier Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter company name" {...field} />
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
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select supplier type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Bottle Producer">Bottle Producer</SelectItem>
                            <SelectItem value="Label Maker">Label Maker</SelectItem>
                            <SelectItem value="Closure Producer">Closure Producer</SelectItem>
                            <SelectItem value="Packaging Supplier">Packaging Supplier</SelectItem>
                            <SelectItem value="Ingredient Supplier">Ingredient Supplier</SelectItem>
                            <SelectItem value="Contract Manufacturer">Contract Manufacturer</SelectItem>
                            <SelectItem value="General Supplier">General Supplier</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter full address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://company-website.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input placeholder="contact@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Product Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Package className="w-5 h-5 text-avallen-green" />
                  <h3 className="text-lg font-semibold">Product Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
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
                    name="productType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select product type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Bottle">Bottle</SelectItem>
                            <SelectItem value="Label">Label</SelectItem>
                            <SelectItem value="Closure">Closure</SelectItem>
                            <SelectItem value="Packaging">Packaging</SelectItem>
                            <SelectItem value="Ingredient">Ingredient</SelectItem>
                            <SelectItem value="Equipment">Equipment</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="material"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Material</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Glass, Plastic, Aluminum" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="0.00" 
                              {...field} 
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
                          <FormLabel>Unit</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="g">g</SelectItem>
                              <SelectItem value="kg">kg</SelectItem>
                              <SelectItem value="lb">lb</SelectItem>
                              <SelectItem value="oz">oz</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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
                            placeholder="0" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Photo Selection Section */}
              {allPhotos.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <h3 className="text-lg font-semibold">Product Photos</h3>
                    <Badge variant="outline">
                      {selectedPhotos.length} of 5 selected
                    </Badge>
                  </div>

                  {/* Selected Photos */}
                  {selectedPhotos.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Selected Photos (Drag to reorder)</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {selectedPhotos.map((photo, index) => (
                          <div key={photo} className="relative group">
                            <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-green-500 bg-gray-100">
                              <img 
                                src={photo} 
                                alt={`Selected photo ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                              <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">
                                {index + 1}
                              </div>
                              <button
                                type="button"
                                onClick={() => handlePhotoDelete(photo)}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <div className="absolute bottom-1 right-1 cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Available Photos */}
                  {unselectedPhotos.length > 0 && selectedPhotos.length < 5 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Available Photos (Click to select)</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {unselectedPhotos.map((photo, index) => (
                          <div key={photo} className="relative group cursor-pointer">
                            <div 
                              className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-300 hover:border-blue-500 bg-gray-100 transition-colors"
                              onClick={() => handlePhotoSelect(photo)}
                            >
                              <img 
                                src={photo} 
                                alt={`Available photo ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-0 bg-blue-500 bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                                <div className="bg-blue-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Check className="w-4 h-4" />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Apply Data & Continue
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="text-gray-600"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}