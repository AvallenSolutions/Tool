import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useLocation, useRoute } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import EnhancedProductForm from '@/components/products/EnhancedProductForm';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CreateEnhancedProduct() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, params] = useRoute('/app/products/:id/enhanced');
  const isEditMode = !!params?.id;

  // Fetch existing product data if editing
  const { data: existingProduct, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['/api/products', params?.id],
    queryFn: async () => {
      if (!params?.id) return null;
      const response = await apiRequest("GET", `/api/products/${params.id}`);
      return response.json();
    },
    enabled: isEditMode,
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const method = isEditMode ? "PUT" : "POST";
      const url = isEditMode ? `/api/products/${params.id}` : "/api/products";
      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: isEditMode ? "Product Updated!" : "Enhanced Product Created!",
        description: `${product.name} has been ${isEditMode ? 'updated' : 'created'} with comprehensive LCA data for accurate environmental impact calculations.`,
      });
      navigate('/app/products');
    },
    onError: (error) => {
      console.error("Error saving product:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? 'update' : 'create'} product. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: any) => {
    // Transform the enhanced form data to match our API schema
    const transformedData = {
      // Basic fields
      name: data.name,
      sku: data.sku,
      type: data.type,
      volume: data.volume,
      description: data.description,
      productionModel: data.productionModel,
      annualProductionVolume: data.annualProductionVolume,
      productionUnit: data.productionUnit,
      status: data.status,
      isMainProduct: data.isMainProduct,
      
      // Ingredients array
      ingredients: data.ingredients,
      
      // Packaging details - flatten complex structure
      bottleMaterial: data.packaging.primaryContainer.material,
      bottleWeight: data.packaging.primaryContainer.weight,
      bottleRecycledContent: data.packaging.primaryContainer.recycledContent,
      labelMaterial: data.packaging.labeling.labelMaterial,
      labelWeight: data.packaging.labeling.labelWeight,
      closureMaterial: data.packaging.closure.material,
      closureWeight: data.packaging.closure.weight,
      hasBuiltInClosure: data.packaging.closure.hasLiner,
      
      // Store complex data as JSON for later processing
      enhancedData: {
        packaging: data.packaging,
        production: data.production,
        distribution: data.distribution,
        endOfLife: data.endOfLife,
        certifications: data.certifications,
      }
    };

    createProductMutation.mutate(transformedData);
  };

  const handleCancel = () => {
    navigate('/app/products');
  };

  // Show loading state while fetching existing product
  if (isEditMode && isLoadingProduct) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-avallen-green" />
          <span className="ml-2 text-gray-600">Loading product data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/app/products')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-gray">
            {isEditMode ? 'Edit Enhanced Product' : 'Enhanced Product Creation'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isEditMode ? 'Update' : 'Create'} a product with comprehensive environmental data for accurate LCA calculations
          </p>
        </div>
      </div>

      <EnhancedProductForm
        initialData={existingProduct}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        mode={isEditMode ? "edit" : "create"}
      />
    </div>
  );
}