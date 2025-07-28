import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2 } from 'lucide-react';

// Simplified product schema focused on essential supplier data extraction
const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  type: z.enum(['spirit', 'wine', 'beer', 'non-alcoholic', 'cider', 'liqueur', 'other']).default('spirit'),
  volume: z.string().min(1, "Volume is required"),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  isMainProduct: z.boolean().default(false),
});

type ProductForm = z.infer<typeof productSchema>;

interface OptimizedProductFormProps {
  initialData?: Partial<ProductForm>;
  onSubmit?: (data: ProductForm) => void;
  isEditing?: boolean;
}

export default function OptimizedProductForm({
  initialData,
  onSubmit,
  isEditing = false
}: OptimizedProductFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || '',
      sku: initialData?.sku || '',
      type: initialData?.type || 'spirit',
      volume: initialData?.volume || '',
      description: initialData?.description || '',
      status: initialData?.status || 'active',
      isMainProduct: initialData?.isMainProduct || false,
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      return apiRequest('POST', '/api/products', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ProductForm) => {
    if (onSubmit) {
      onSubmit(data);
    } else {
      createProductMutation.mutate(data);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Save className="h-5 w-5" />
          {isEditing ? 'Edit Product' : 'Create Product'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="Enter product name"
              />
              {form.formState.errors.name && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                {...form.register('sku')}
                placeholder="Enter SKU"
              />
              {form.formState.errors.sku && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.sku.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Product Type</Label>
              <Select value={form.watch('type')} onValueChange={(value) => form.setValue('type', value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spirit">Spirit</SelectItem>
                  <SelectItem value="wine">Wine</SelectItem>
                  <SelectItem value="beer">Beer</SelectItem>
                  <SelectItem value="non-alcoholic">Non-Alcoholic</SelectItem>
                  <SelectItem value="cider">Cider</SelectItem>
                  <SelectItem value="liqueur">Liqueur</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="volume">Volume *</Label>
              <Input
                id="volume"
                {...form.register('volume')}
                placeholder="e.g., 750ml"
              />
              {form.formState.errors.volume && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.volume.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Product description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={form.watch('status')} onValueChange={(value) => form.setValue('status', value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="isMainProduct"
                {...form.register('isMainProduct')}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isMainProduct">Main Product</Label>
            </div>
          </div>

          <Button
            type="submit"
            disabled={createProductMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {createProductMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? 'Update Product' : 'Create Product'}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}