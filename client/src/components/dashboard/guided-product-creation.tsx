import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Package, ArrowRight, CheckCircle, Plus, Trash2, Upload, Image } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface GuidedProductCreationProps {
  onComplete: () => void;
  onSkip: () => void;
}

const guidedSteps = [
  {
    id: 'welcome',
    title: 'Let\'s Add Your First Product',
    content: 'We\'ll walk you through adding a new product to your catalog. This will help you track individual product footprints.',
    showForm: false
  },
  {
    id: 'basic-info',
    title: 'Basic Product Information',
    content: 'First, let\'s enter the basic details about your product. This information will be used for tracking and reporting.',
    showForm: true,
    fields: ['name', 'sku', 'type', 'volume', 'packShot']
  },
  {
    id: 'ingredients',
    title: 'Ingredients & Recipe',
    content: 'Tell us about the ingredients used in making this product. This is critical for accurate LCA calculations.',
    showForm: true,
    fields: ['ingredients']
  },
  {
    id: 'packaging',
    title: 'Packaging Materials',
    content: 'Now let\'s capture the packaging details. This includes bottle, labels, and closures.',
    showForm: true,
    fields: ['bottleMaterial', 'bottleRecycledContent', 'labelMaterial', 'labelWeight', 'closureMaterial', 'closureWeight']
  },
  {
    id: 'production-details',
    title: 'Production Details',
    content: 'Finally, tell us about how this product is made and produced annually.',
    showForm: true,
    fields: ['productionModel', 'annualVolume']
  },
  {
    id: 'review',
    title: 'Review and Create',
    content: 'Perfect! Let\'s review your product details and create your first product entry.',
    showForm: true,
    fields: ['review']
  }
];

export default function GuidedProductCreation({ onComplete, onSkip }: GuidedProductCreationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    type: '',
    volume: '',
    packShotUrl: '',
    ingredients: [{ name: '', amount: 0, unit: 'ml' }],
    bottleMaterial: '',
    bottleRecycledContent: '',
    labelMaterial: '',
    labelWeight: '',
    closureMaterial: '',
    closureWeight: '',
    hasBuiltInClosure: false,
    productionModel: '',
    annualVolume: '',
    status: 'active'
  });
  const [isVisible, setIsVisible] = useState(true);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/products", data);
      return response.json();
    },
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Product Created!",
        description: `${product.name} has been added to your catalog.`,
      });
      handleComplete();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create product. Please try again.",
        variant: "destructive",
      });
    },
  });

  const currentGuidedStep = guidedSteps[currentStep];

  const handleInputChange = (field: string, value: string | boolean | any[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', amount: 0, unit: 'ml' }]
    }));
  };

  const removeIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const updateIngredient = (index: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient, i) => 
        i === index ? { ...ingredient, [field]: value } : ingredient
      )
    }));
  };

  const handleNext = () => {
    if (currentStep < guidedSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleCreateProduct();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateProduct = () => {
    const productData = {
      name: formData.name,
      sku: formData.sku,
      type: formData.type,
      size: formData.volume, // Map volume to size for current database
      productionModel: formData.productionModel,
      annualProductionVolume: formData.annualVolume ? parseInt(formData.annualVolume) : null,
      productionUnit: 'bottles',
      status: 'active',
      // Store comprehensive data in description field for now
      description: JSON.stringify({
        ingredients: formData.ingredients,
        bottleMaterial: formData.bottleMaterial,
        bottleRecycledContent: formData.bottleRecycledContent,
        labelMaterial: formData.labelMaterial,
        labelWeight: formData.labelWeight,
        closureMaterial: formData.closureMaterial,
        closureWeight: formData.closureWeight,
        hasBuiltInClosure: formData.hasBuiltInClosure,
        packShotUrl: formData.packShotUrl
      })
    };
    createProductMutation.mutate(productData);
  };

  const handleComplete = () => {
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    setIsVisible(false);
    onSkip();
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.name && formData.sku && formData.type && formData.volume;
      case 2:
        return formData.ingredients.length > 0 && formData.ingredients.every(ing => ing.name && ing.amount > 0);
      case 3:
        return formData.bottleMaterial && formData.labelMaterial && formData.labelWeight;
      case 4:
        return formData.productionModel;
      default:
        return true;
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <Card className="w-full max-w-lg bg-white border-2 border-avallen-green shadow-2xl">
          <CardHeader className="pb-3 bg-lightest-gray">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-avallen-green" />
                <CardTitle className="text-lg font-semibold text-slate-gray">
                  {currentGuidedStep.title}
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Badge variant="outline" className="w-fit border-avallen-green text-avallen-green">
              Step {currentStep + 1} of {guidedSteps.length}
            </Badge>
          </CardHeader>
          
          <CardContent className="pb-6 bg-white">
            <p className="text-slate-gray mb-6 leading-relaxed font-medium">
              {currentGuidedStep.content}
            </p>
            
            {currentGuidedStep.showForm && (
              <div className="space-y-4 mb-6">
                {currentGuidedStep.fields?.includes('name') && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="e.g., Avallen Calvados"
                    />
                  </div>
                )}
                
                {currentGuidedStep.fields?.includes('sku') && (
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU Code *</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                      placeholder="e.g., AVALLEN-CALVADOS-750ML"
                    />
                  </div>
                )}
                
                {currentGuidedStep.fields?.includes('type') && (
                  <div className="space-y-2">
                    <Label htmlFor="type">Product Type *</Label>
                    <Select onValueChange={(value) => handleInputChange('type', value)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select product type" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg">
                        <SelectItem value="spirit">Spirit</SelectItem>
                        <SelectItem value="beer">Beer</SelectItem>
                        <SelectItem value="wine">Wine</SelectItem>
                        <SelectItem value="cocktail">Cocktail</SelectItem>
                        <SelectItem value="non-alcoholic">Non-Alcoholic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {currentGuidedStep.fields?.includes('volume') && (
                  <div className="space-y-2">
                    <Label htmlFor="volume">Volume *</Label>
                    <Input
                      id="volume"
                      value={formData.volume}
                      onChange={(e) => handleInputChange('volume', e.target.value)}
                      placeholder="e.g., 750ml, 500ml, 1L"
                    />
                  </div>
                )}

                {currentGuidedStep.fields?.includes('packShot') && (
                  <div className="space-y-2">
                    <Label htmlFor="packShot">Pack Shot Image</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">Click to upload product image</p>
                      <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                      <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // In a real app, you'd upload this to a storage service
                            handleInputChange('packShotUrl', URL.createObjectURL(file));
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {currentGuidedStep.fields?.includes('ingredients') && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Ingredients & Recipe *</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addIngredient}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Ingredient
                      </Button>
                    </div>
                    
                    {formData.ingredients.map((ingredient, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Ingredient {index + 1}</span>
                          {formData.ingredients.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeIngredient(index)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            placeholder="Ingredient name"
                            value={ingredient.name}
                            onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                          />
                          <Input
                            type="number"
                            placeholder="Amount"
                            value={ingredient.amount}
                            onChange={(e) => updateIngredient(index, 'amount', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        
                        <Select onValueChange={(value) => updateIngredient(index, 'unit', value)}>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200 shadow-lg">
                            <SelectItem value="ml">ml</SelectItem>
                            <SelectItem value="L">L</SelectItem>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="%">%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
                
                {currentGuidedStep.fields?.includes('bottleMaterial') && (
                  <div className="space-y-2">
                    <Label htmlFor="bottleMaterial">Bottle Material *</Label>
                    <Select onValueChange={(value) => handleInputChange('bottleMaterial', value)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select bottle material" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg">
                        <SelectItem value="glass">Glass</SelectItem>
                        <SelectItem value="aluminium">Aluminium</SelectItem>
                        <SelectItem value="PET">PET Plastic</SelectItem>
                        <SelectItem value="paper">Paper</SelectItem>
                        <SelectItem value="tetrapak">Tetrapak</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {currentGuidedStep.fields?.includes('bottleRecycledContent') && (
                  <div className="space-y-2">
                    <Label htmlFor="bottleRecycledContent">% Recycled Content in Bottle</Label>
                    <Input
                      id="bottleRecycledContent"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.bottleRecycledContent}
                      onChange={(e) => handleInputChange('bottleRecycledContent', e.target.value)}
                      placeholder="e.g., 30"
                    />
                  </div>
                )}

                {currentGuidedStep.fields?.includes('labelMaterial') && (
                  <div className="space-y-2">
                    <Label htmlFor="labelMaterial">Label Material *</Label>
                    <Select onValueChange={(value) => handleInputChange('labelMaterial', value)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select label material" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg">
                        <SelectItem value="paper">Paper</SelectItem>
                        <SelectItem value="plastic">Plastic</SelectItem>
                        <SelectItem value="vinyl">Vinyl</SelectItem>
                        <SelectItem value="foil">Foil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {currentGuidedStep.fields?.includes('labelWeight') && (
                  <div className="space-y-2">
                    <Label htmlFor="labelWeight">Label Weight (grams) *</Label>
                    <Input
                      id="labelWeight"
                      type="number"
                      step="0.1"
                      value={formData.labelWeight}
                      onChange={(e) => handleInputChange('labelWeight', e.target.value)}
                      placeholder="e.g., 5.2"
                    />
                  </div>
                )}

                {currentGuidedStep.fields?.includes('closureMaterial') && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasBuiltInClosure"
                        checked={formData.hasBuiltInClosure}
                        onCheckedChange={(checked) => handleInputChange('hasBuiltInClosure', checked)}
                      />
                      <Label htmlFor="hasBuiltInClosure" className="text-sm">
                        Product has built-in closure (e.g., cans)
                      </Label>
                    </div>
                    
                    {!formData.hasBuiltInClosure && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="closureMaterial">Closure Material *</Label>
                          <Select onValueChange={(value) => handleInputChange('closureMaterial', value)}>
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Select closure material" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-gray-200 shadow-lg">
                              <SelectItem value="cork">Cork</SelectItem>
                              <SelectItem value="plastic">Plastic Cap</SelectItem>
                              <SelectItem value="metal">Metal Cap</SelectItem>
                              <SelectItem value="synthetic">Synthetic Cork</SelectItem>
                              <SelectItem value="screw">Screw Cap</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="closureWeight">Closure Weight (grams) *</Label>
                          <Input
                            id="closureWeight"
                            type="number"
                            step="0.1"
                            value={formData.closureWeight}
                            onChange={(e) => handleInputChange('closureWeight', e.target.value)}
                            placeholder="e.g., 3.5"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {currentGuidedStep.fields?.includes('productionModel') && (
                  <div className="space-y-2">
                    <Label htmlFor="productionModel">Production Model *</Label>
                    <Select onValueChange={(value) => handleInputChange('productionModel', value)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="How is this product made?" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg">
                        <SelectItem value="own">Own Production</SelectItem>
                        <SelectItem value="contract">Contract Manufacturing</SelectItem>
                        <SelectItem value="hybrid">Hybrid Model</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {currentGuidedStep.fields?.includes('annualVolume') && (
                  <div className="space-y-2">
                    <Label htmlFor="annualVolume">Annual Production Volume</Label>
                    <Input
                      id="annualVolume"
                      type="number"
                      value={formData.annualVolume}
                      onChange={(e) => handleInputChange('annualVolume', e.target.value)}
                      placeholder="e.g., 10000"
                    />
                  </div>
                )}
                
                {currentGuidedStep.fields?.includes('review') && (
                  <div className="space-y-3">
                    <div className="bg-lightest-gray p-4 rounded-lg">
                      <h4 className="font-semibold text-slate-gray mb-3">Product Summary</h4>
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div><strong>Name:</strong> {formData.name}</div>
                          <div><strong>SKU:</strong> {formData.sku}</div>
                          <div><strong>Type:</strong> {formData.type}</div>
                          <div><strong>Volume:</strong> {formData.volume}</div>
                        </div>
                        
                        {formData.ingredients.length > 0 && (
                          <div>
                            <strong>Ingredients:</strong>
                            <ul className="ml-4 mt-1 space-y-1">
                              {formData.ingredients.map((ing, idx) => (
                                <li key={idx} className="text-xs">
                                  {ing.name} - {ing.amount} {ing.unit}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div><strong>Bottle:</strong> {formData.bottleMaterial}</div>
                          <div><strong>Recycled Content:</strong> {formData.bottleRecycledContent}%</div>
                          <div><strong>Label:</strong> {formData.labelMaterial} ({formData.labelWeight}g)</div>
                          <div><strong>Closure:</strong> {formData.hasBuiltInClosure ? 'Built-in' : `${formData.closureMaterial} (${formData.closureWeight}g)`}</div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div><strong>Production:</strong> {formData.productionModel}</div>
                          {formData.annualVolume && <div><strong>Annual Volume:</strong> {formData.annualVolume} bottles</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="flex items-center gap-2"
              >
                Previous
              </Button>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Skip for now
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!isStepValid() || createProductMutation.isPending}
                  className="bg-avallen-green hover:bg-green-600 text-white flex items-center gap-2 px-6 py-2 font-medium opacity-100 visible"
                  style={{ backgroundColor: 'hsl(var(--avallen-green))', color: 'white' }}
                >
                  {createProductMutation.isPending ? "Creating..." : 
                   currentStep === guidedSteps.length - 1 ? (
                     <>
                       <CheckCircle className="w-4 h-4" />
                       Create Product
                     </>
                   ) : (
                     <>
                       Next
                       <ArrowRight className="w-4 h-4" />
                     </>
                   )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}