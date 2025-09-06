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
      console.log('📥 EDIT MODE: Fetching product data for ID:', productId);
      const response = await apiRequest("GET", `/api/products/${productId}`);
      const product = await response.json();
      console.log('📦 EDIT MODE: Fetched product raw data:', product);
      console.log('🔍 EDIT MODE: waterDilution in raw data:', product.waterDilution, 'Type:', typeof product.waterDilution);
      return product;
    },
    enabled: Boolean(isEditMode && productId),
  });

  // Transform database product to form structure for loading
  const transformDatabaseToForm = (product: any) => {
    console.log('🔧 transformDatabaseToForm called with:', product);
    if (!product) {
      console.log('❌ No product data - returning null');
      return null;
    }
    
    console.log('🔍 Database product data:', {
      packagingSupplier: product.packagingSupplier,
      packagingSupplierId: product.packagingSupplierId,
      packagingSupplierCategory: product.packagingSupplierCategory,
      waterDilution: product.waterDilution,
      certifications: product.certifications,
      recyclingRate: product.recyclingRate,
      disposalMethod: product.disposalMethod
    });
    
    console.log('📋 All product keys:', Object.keys(product));
    
    const result = {
      ...product,
      // Reconstruct nested structures from flattened database fields
      ingredients: typeof product.ingredients === 'string' 
        ? JSON.parse(product.ingredients) 
        : product.ingredients || [],
      
      // Water dilution - ensure we always get the correct data structure
      waterDilution: (() => {
        console.log('🔍 TRANSFORM: Raw waterDilution from database:', product.waterDilution, 'Type:', typeof product.waterDilution);
        
        if (typeof product.waterDilution === 'string' && product.waterDilution.trim()) {
          try {
            const parsed = JSON.parse(product.waterDilution);
            console.log('🔧 TRANSFORM: Parsed waterDilution:', parsed);
            return parsed;
          } catch (e) {
            console.warn('🚨 TRANSFORM: Failed to parse waterDilution string:', product.waterDilution, e);
            return { amount: 0, unit: 'ml' };
          }
        }
        
        if (product.waterDilution && typeof product.waterDilution === 'object') {
          console.log('🔧 TRANSFORM: Using object waterDilution:', product.waterDilution);
          return product.waterDilution;
        }
        
        const fallback = { amount: 0, unit: 'ml' };
        console.log('🔧 TRANSFORM: Using fallback waterDilution:', fallback);
        return fallback;
      })(),
        
      packaging: {
        primaryContainer: {
          material: product.bottleMaterial || '',
          weight: product.bottleWeight || 0,
          recycledContent: product.bottleRecycledContent || 0,
          recyclability: product.bottleRecyclability || '',
          color: product.bottleColor || '',
          thickness: product.bottleThickness || 0,
          origin: product.bottleOrigin || '',
        },
        labeling: {
          labelMaterial: product.labelMaterial || '',
          labelWeight: product.labelWeight || 0,
          printingMethod: product.labelPrintingMethod || '',
          inkType: product.labelInkType || '',
          labelSize: product.labelSize || 0,
        },
        closure: {
          closureType: product.closureType || '',
          material: product.closureMaterial || '',
          weight: product.closureWeight || 0,
          hasLiner: product.hasBuiltInClosure || false,
          linerMaterial: product.linerMaterial || '',
        },
        secondaryPackaging: {
          hasSecondaryPackaging: product.hasSecondaryPackaging || false,
          boxMaterial: product.boxMaterial || '',
          boxWeight: product.boxWeight || 0,
          fillerMaterial: product.fillerMaterial || '',
          fillerWeight: product.fillerWeight || 0,
        },
        supplierInformation: {
          selectedSupplierId: product.packagingSupplierId || '',
          supplierName: product.packagingSupplier || '',
          supplierCategory: product.packagingSupplierCategory || '',
          selectedProductId: product.packagingSelectedProductId || '',
          selectedProductName: product.packagingSelectedProductName || '',
        }
      },
      
      production: {
        productionModel: product.productionModel || '',
        annualProductionVolume: product.annualProductionVolume || 0,
        productionUnit: product.productionUnit || 'bottles',
        facilityLocation: product.facilityLocation || '',
        energySource: product.energySource || '',
        waterSourceType: product.waterSourceType || '',
        heatRecoverySystem: product.heatRecoverySystem || false,
        wasteManagement: product.wasteManagement || '',
        processSteps: typeof product.productionMethods === 'string'
          ? JSON.parse(product.productionMethods)?.processSteps || []
          : product.productionMethods?.processSteps || [],
        
        // Reconstruct nested energy consumption structure
        energyConsumption: {
          electricityKwh: product.electricityKwh || 0,
          gasM3: product.gasM3 || 0,
          steamKg: product.steamKg || 0,
          fuelLiters: product.fuelLiters || 0,
          renewableEnergyPercent: product.renewableEnergyPercent || 0,
        },
        
        // Reconstruct nested water usage structure
        waterUsage: {
          processWaterLiters: product.processWaterLiters || 0,
          cleaningWaterLiters: product.cleaningWaterLiters || 0,
          coolingWaterLiters: product.coolingWaterLiters || 0,
          wasteWaterTreatment: product.wasteWaterTreatment || false,
        },
        
        // Reconstruct nested waste generation structure
        wasteGeneration: {
          organicWasteKg: product.organicWasteKg || 0,
          packagingWasteKg: product.packagingWasteKg || 0,
          hazardousWasteKg: product.hazardousWasteKg || 0,
          wasteRecycledPercent: product.wasteRecycledPercent || 0,
        },
      },
      
      environmental: {
        carbonFootprint: product.carbonFootprint || 0,
        waterFootprint: product.waterFootprint || 0,
      },
      
      certifications: typeof product.certifications === 'string'
        ? JSON.parse(product.certifications)
        : product.certifications || [],
        
      distribution: {
        averageTransportDistance: product.averageTransportDistance || 0,
        primaryTransportMode: product.primaryTransportMode || '',
        coldChainRequired: product.coldChainRequired || false,
      },
      
      endOfLife: {
        returnableContainer: product.returnableContainer || false,
        recyclingRate: product.recyclingRate || 0,
        disposalMethod: product.disposalMethod || '',
      }
    };
    
    console.log('🔄 Final transformed data structure:', {
      waterDilution: result.waterDilution,
      certifications: result.certifications,
      production: result.production,
      distribution: result.distribution,
      endOfLife: result.endOfLife
    });
    
    return result;
  };

  // Transform form data to database format (shared by both draft save and final submit)
  const transformFormDataToDatabase = (data: any, isDraft: boolean = false) => {
    console.log('🔄 Transforming form data:', { isDraft, hasWaterDilution: !!data.waterDilution, hasIngredients: !!data.ingredients });
    
    return {
      // Basic fields
      name: data.name,
      sku: data.sku,
      type: data.type,
      volume: data.volume,
      description: data.description,
      productionModel: data.productionModel,
      annualProductionVolume: data.annualProductionVolume,
      productionUnit: data.productionUnit,
      status: isDraft ? 'draft' : (isEditMode ? 'confirmed' : (data.status || 'draft')),
      isMainProduct: data.isMainProduct,
      packShotUrl: data.productImage,
      productImages: data.productImages || [],
      
      // Water dilution (serialize as JSON)
      waterDilution: data.waterDilution ? JSON.stringify(data.waterDilution) : null,
      
      // Ingredients array (serialize as JSON)
      ingredients: data.ingredients ? JSON.stringify(data.ingredients) : null,
      
      // Packaging - Primary Container (with null safety)
      bottleName: data.packaging?.primaryContainer?.name || null,
      bottleMaterial: data.packaging?.primaryContainer?.material || '',
      bottleWeight: data.packaging?.primaryContainer?.weight || null,
      bottleRecycledContent: data.packaging?.primaryContainer?.recycledContent || null,
      bottleRecyclability: data.packaging?.primaryContainer?.recyclability || null,
      bottleColor: data.packaging?.primaryContainer?.color || '',
      bottleThickness: data.packaging?.primaryContainer?.thickness || null,
      
      // Packaging - Labels & Printing (with null safety)
      labelMaterial: data.packaging?.labeling?.labelMaterial || '',
      labelWeight: data.packaging?.labeling?.labelWeight || null,
      labelPrintingMethod: data.packaging?.labeling?.printingMethod || null,
      labelInkType: data.packaging?.labeling?.inkType || null,
      labelSize: data.packaging?.labeling?.labelSize || null,
      
      // Packaging - Closure System (with null safety)
      closureType: data.packaging?.closure?.closureType || '',
      closureMaterial: data.packaging?.closure?.material || '',
      closureWeight: data.packaging?.closure?.weight || null,
      hasBuiltInClosure: data.packaging?.closure?.hasLiner || false,
      linerMaterial: data.packaging?.closure?.linerMaterial || null,
      
      // Packaging - Secondary (with null safety)
      hasSecondaryPackaging: data.packaging?.secondaryPackaging?.hasSecondaryPackaging || false,
      boxMaterial: data.packaging?.secondaryPackaging?.boxMaterial || null,
      boxWeight: data.packaging?.secondaryPackaging?.boxWeight || null,
      fillerMaterial: data.packaging?.secondaryPackaging?.fillerMaterial || null,
      fillerWeight: data.packaging?.secondaryPackaging?.fillerWeight || null,
      
      // Packaging - Supplier Information (with null safety)
      packagingSupplier: data.packaging?.supplierInformation?.supplierName || '',
      packagingSupplierId: data.packaging?.supplierInformation?.selectedSupplierId || '',
      packagingSupplierCategory: data.packaging?.supplierInformation?.supplierCategory || '',
      packagingSelectedProductId: data.packaging?.supplierInformation?.selectedProductId || '',
      packagingSelectedProductName: data.packaging?.supplierInformation?.selectedProductName || '',
      
      // Production Process - Energy (with null safety)
      electricityKwh: data.production?.energyConsumption?.electricityKwh || null,
      gasM3: data.production?.energyConsumption?.gasM3 || null,
      steamKg: data.production?.energyConsumption?.steamKg || null,
      fuelLiters: data.production?.energyConsumption?.fuelLiters || null,
      renewableEnergyPercent: data.production?.energyConsumption?.renewableEnergyPercent || null,
      
      // Production Process - Water (with null safety)
      processWaterLiters: data.production?.waterUsage?.processWaterLiters || null,
      cleaningWaterLiters: data.production?.waterUsage?.cleaningWaterLiters || null,
      coolingWaterLiters: data.production?.waterUsage?.coolingWaterLiters || null,
      wasteWaterTreatment: data.production?.waterUsage?.wasteWaterTreatment || false,
      
      // Production Process - Waste (with null safety)
      organicWasteKg: data.production?.wasteGeneration?.organicWasteKg || null,
      packagingWasteKg: data.production?.wasteGeneration?.packagingWasteKg || null,
      hazardousWasteKg: data.production?.wasteGeneration?.hazardousWasteKg || null,
      wasteRecycledPercent: data.production?.wasteGeneration?.wasteRecycledPercent || null,
      
      // Production Basic Fields (with null safety)
      facilityLocation: data.production?.facilityLocation || '',
      energySource: data.production?.energySource || '',
      waterSourceType: data.production?.waterSourceType || '',
      heatRecoverySystem: data.production?.heatRecoverySystem || false,
      wasteManagement: data.production?.wasteManagement || '',
      
      // Production Methods (serialize as JSON with null safety)
      productionMethods: data.production ? JSON.stringify(data.production) : null,
      
      // Distribution (with null safety)
      averageTransportDistance: data.distribution?.averageTransportDistance || null,
      primaryTransportMode: data.distribution?.primaryTransportMode || '',
      distributionCenters: data.distribution?.distributionCenters || null,
      coldChainRequired: data.distribution?.coldChainRequired || false,
      packagingEfficiency: data.distribution?.packagingEfficiency || null,
      
      // Environmental (with null safety)
      carbonFootprint: data.environmental?.carbonFootprint || null,
      waterFootprint: data.environmental?.waterFootprint || null,
      
      // End of Life (with null safety)
      returnableContainer: data.endOfLife?.returnableContainer || false,
      recyclingRate: data.endOfLife?.recyclingRate || null,
      disposalMethod: data.endOfLife?.disposalMethod || '',
      consumerEducation: data.endOfLife?.consumerEducation || null,
      
      // Certifications (serialize as JSON)
      certifications: data.certifications ? JSON.stringify(data.certifications) : null,
    };
  };

  // Draft saving mutation (now using proper data transformation)
  const saveDraftMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('💾 Draft save - raw form data:', data);
      
      // Transform form data using the shared transformation function
      const transformedData = transformFormDataToDatabase(data, true);
      
      // Add product ID if editing existing product
      const draftData = {
        ...transformedData,
        id: productId ? parseInt(productId) : undefined,
      };
      
      console.log('💾 Draft save - transformed data:', { 
        hasWaterDilution: !!draftData.waterDilution,
        hasIngredients: !!draftData.ingredients,
        hasProductImages: !!draftData.productImages
      });
      
      const response = await apiRequest("POST", "/api/products/draft", draftData);
      return response.json();
    },
    onSuccess: (savedProduct) => {
      console.log('✅ Draft saved successfully:', savedProduct);
      
      // Invalidate and refetch product data to show updated draft
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ["/api/products", productId] });
        queryClient.refetchQueries({ queryKey: ["/api/products", productId] });
      }
      
      toast({
        title: "✅ Draft Saved",
        description: "Your progress has been saved. You can continue editing later.",
        duration: 3000,
      });
    },
    onError: (error) => {
      console.error("❌ Error saving draft:", error);
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
        // Invalidate queries safely with more aggressive cache clearing
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
        if (product.id) {
          queryClient.invalidateQueries({ queryKey: ["/api/products", product.id.toString()] });
          // Also invalidate any cached ProductDetail queries (matches ProductDetail.tsx queryKey)
          queryClient.invalidateQueries({ queryKey: ["product", product.id.toString()] });
          queryClient.invalidateQueries({ queryKey: ["product", product.id] });
          
          // Force refetch the specific product data
          queryClient.refetchQueries({ queryKey: ["product", product.id.toString()] });
        }
        
        console.log('🔄 Query cache invalidated and refetched for product:', product.id);
        
        toast({
          title: isEditMode ? "✅ Product Updated Successfully!" : "✅ Enhanced Product Created!",
          description: `${product.name} has been ${isEditMode ? 'updated' : 'created'} with comprehensive environmental data. All changes have been saved to the database.`,
          duration: 5000,
          variant: "default",
        });
        
        // Handle navigation after successful save
        if (isEditMode) {
          // Navigate back to products list after successful update
          setTimeout(() => navigate('/app/products'), 1000);
        } else {
          // Navigate to products list after creation
          setTimeout(() => navigate('/app/products'), 1000);
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
    console.log('🚀 handleSubmit called with data:', data);
    console.log('🏷️ isEditMode:', isEditMode, 'productId:', productId);
    
    // Prevent double submission
    if (createProductMutation.isPending) {
      console.log('⏳ Mutation already pending, skipping...');
      return;
    }
    
    const startTime = Date.now();
    
    // Use shared transformation function
    const transformedData = transformFormDataToDatabase(data, false);
    
    const transformTime = Date.now() - startTime;
    
    console.log('📦 Transformed data for API:', {
      status: transformedData.status,
      name: transformedData.name,
      id: productId
    });
    console.log('📡 Calling mutation with method:', isEditMode ? 'PATCH' : 'POST');
    
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
        initialData={(() => {
          console.log('🎯 RENDER: About to transform existingProduct:', !!existingProduct);
          if (!existingProduct) {
            console.log('🎯 RENDER: No existingProduct, returning null');
            return null;
          }
          console.log('🎯 RENDER: Calling transformDatabaseToForm...');
          const transformed = transformDatabaseToForm(existingProduct);
          console.log('🎯 RENDER: Transformation complete, result:', transformed?.waterDilution);
          return transformed;
        })()}
        onSubmit={handleSubmit}
        onSaveDraft={(data) => saveDraftMutation.mutate(data)}
        isEditing={Boolean(isEditMode)}
        isSubmitting={createProductMutation.isPending}
        isDraftSaving={saveDraftMutation.isPending}
        productId={productId}
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