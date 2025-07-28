import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useLocation, useRoute } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import EnhancedProductForm from '@/components/products/EnhancedProductForm';
import { LoadingTimerPopup } from '@/components/ui/loading-timer-popup';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CreateEnhancedProduct() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Reset navigating state when component mounts and ensure cleanup
  useEffect(() => {
    setIsNavigating(false);
    
    // Cleanup function to reset state when component unmounts
    return () => {
      setIsNavigating(false);
    };
  }, []);
  
  // Check both routes to determine if we're editing or creating
  const [matchEdit, paramsEdit] = useRoute('/app/products/:id/enhanced');
  const [matchCreate] = useRoute('/app/products/create/enhanced');
  
  const isEditMode = matchEdit && paramsEdit?.id && paramsEdit.id !== 'create';
  const productId = isEditMode ? paramsEdit.id : null;

  // Fetch existing product data if editing
  const { data: existingProduct, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['/api/products', productId],
    queryFn: async () => {
      if (!productId) return null;
      const response = await apiRequest("GET", `/api/products/${productId}`);
      return response.json();
    },
    enabled: Boolean(isEditMode && productId),
  });

  // Draft saving mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/products/draft", { ...data, status: 'draft' });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Draft Saved",
        description: "Your progress has been saved. You can continue editing later.",
        duration: 3000,
      });
    },
    onError: (error) => {
      console.error("Error saving draft:", error);
      toast({
        title: "❌ Error",
        description: "Failed to save draft. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const method = isEditMode ? "PATCH" : "POST";
      const url = isEditMode ? `/api/products/${productId}` : "/api/products";
      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: (product) => {
      
      
      // Ensure navigation state is cleared
      setIsNavigating(false);
      
      try {
        // Invalidate queries safely
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
        if (product.id) {
          queryClient.invalidateQueries({ queryKey: ["/api/products", product.id.toString()] });
        }
        
        toast({
          title: isEditMode ? "✅ Product Updated Successfully!" : "✅ Enhanced Product Created!",
          description: `${product.name} has been ${isEditMode ? 'updated' : 'created'} with comprehensive environmental data. All changes have been saved to the database.`,
          duration: 5000,
          variant: "default",
        });
        
        // Handle navigation - stay on enhanced form page instead of redirecting
        if (isEditMode) {
          // Stay on the same page for edit mode
          return;
        } else {
          // Stay on enhanced form page after creation instead of navigating away
          
          
          // No navigation - user stays on the enhanced form page
        }
      } catch (error) {
        console.error('❌ Error in success handler:', error);
        setIsNavigating(false);
        toast({
          title: "Product Created",
          description: "Product was created successfully, but there was an issue with the interface. Refreshing...",
          variant: "default",
        });
        // Fallback to products list if anything fails
        setTimeout(() => navigate('/app/products'), 1000);
      }
    },
    onError: (error) => {
      console.error("❌ Error saving product:", error);
      // Ensure navigation state is cleared on error
      setIsNavigating(false);
      toast({
        title: "❌ Error",
        description: `Failed to ${isEditMode ? 'update' : 'create'} product. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: any) => {
    
    
    // Prevent double submission
    if (createProductMutation.isPending) {
      
      return;
    }
    
    const startTime = Date.now();
    
    // Transform the enhanced form data to match the database schema columns
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
      packShotUrl: data.productImage,
      
      // Ingredients array
      ingredients: data.ingredients,
      
      // Packaging - Primary Container
      bottleMaterial: data.packaging.primaryContainer.material,
      bottleWeight: data.packaging.primaryContainer.weight,
      bottleRecycledContent: data.packaging.primaryContainer.recycledContent,
      bottleRecyclability: data.packaging.primaryContainer.recyclability,
      bottleColor: data.packaging.primaryContainer.color,
      bottleThickness: data.packaging.primaryContainer.thickness,
      
      // Packaging - Labels & Printing
      labelMaterial: data.packaging.labeling.labelMaterial,
      labelWeight: data.packaging.labeling.labelWeight,
      labelPrintingMethod: data.packaging.labeling.printingMethod,
      labelInkType: data.packaging.labeling.inkType,
      labelSize: data.packaging.labeling.labelSize,
      
      // Packaging - Closure System
      closureType: data.packaging.closure.closureType,
      closureMaterial: data.packaging.closure.material,
      closureWeight: data.packaging.closure.weight,
      hasBuiltInClosure: data.packaging.closure.hasLiner,
      linerMaterial: data.packaging.closure.linerMaterial,
      
      // Packaging - Secondary
      hasSecondaryPackaging: data.packaging.secondaryPackaging.hasSecondaryPackaging,
      boxMaterial: data.packaging.secondaryPackaging.boxMaterial,
      boxWeight: data.packaging.secondaryPackaging.boxWeight,
      fillerMaterial: data.packaging.secondaryPackaging.fillerMaterial,
      fillerWeight: data.packaging.secondaryPackaging.fillerWeight,
      
      // Production Process - Energy
      electricityKwh: data.production.energyConsumption.electricityKwh,
      gasM3: data.production.energyConsumption.gasM3,
      steamKg: data.production.energyConsumption.steamKg,
      fuelLiters: data.production.energyConsumption.fuelLiters,
      renewableEnergyPercent: data.production.energyConsumption.renewableEnergyPercent,
      
      // Production Process - Water
      processWaterLiters: data.production.waterUsage.processWaterLiters,
      cleaningWaterLiters: data.production.waterUsage.cleaningWaterLiters,
      coolingWaterLiters: data.production.waterUsage.coolingWaterLiters,
      wasteWaterTreatment: data.production.waterUsage.wasteWaterTreatment,
      
      // Production Process - Waste
      organicWasteKg: data.production.wasteGeneration.organicWasteKg,
      packagingWasteKg: data.production.wasteGeneration.packagingWasteKg,
      hazardousWasteKg: data.production.wasteGeneration.hazardousWasteKg,
      wasteRecycledPercent: data.production.wasteGeneration.wasteRecycledPercent,
      
      // Production Methods (as JSONB)
      productionMethods: data.production.productionMethods,
      
      // Distribution
      averageTransportDistance: data.distribution.averageTransportDistance,
      primaryTransportMode: data.distribution.primaryTransportMode,
      distributionCenters: data.distribution.distributionCenters,
      coldChainRequired: data.distribution.coldChainRequired,
      packagingEfficiency: data.distribution.packagingEfficiency,
      
      // End of Life
      returnableContainer: data.endOfLife.returnableContainer,
      recyclingRate: data.endOfLife.recyclingRate,
      disposalMethod: data.endOfLife.disposalMethod,
      consumerEducation: data.endOfLife.consumerEducation,
      
      // Certifications
      certifications: data.certifications,
    };
    
    const transformTime = Date.now() - startTime;
    
    
    
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
        onSaveDraft={(data) => saveDraftMutation.mutate(data)}
        isEditing={Boolean(isEditMode)}
        isSubmitting={createProductMutation.isPending}
        isDraftSaving={saveDraftMutation.isPending}
      />
      
      {/* Loading Timer Popup */}
      <LoadingTimerPopup
        isOpen={createProductMutation.isPending || isNavigating}
        title={isNavigating ? "Redirecting..." : (isEditMode ? "Updating Product" : "Creating Product")}
        description={
          isNavigating 
            ? "Taking you to the product details page..." 
            : "Processing your data and saving to the database. This may take a few moments..."
        }
        estimatedTime={isNavigating ? 1000 : 3000}
      />
    </div>
  );
}