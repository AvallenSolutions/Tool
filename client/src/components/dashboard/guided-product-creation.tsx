import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Package, ArrowRight, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
    fields: ['name', 'sku', 'type']
  },
  {
    id: 'production-details',
    title: 'Production Details',
    content: 'Now tell us about how this product is made. This helps us calculate the right environmental metrics.',
    showForm: true,
    fields: ['size', 'productionModel', 'annualVolume']
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
    size: '',
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
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
      ...formData,
      annualProductionVolume: formData.annualVolume ? parseInt(formData.annualVolume) : null,
      productionUnit: 'bottles'
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
        return formData.name && formData.sku && formData.type;
      case 2:
        return formData.size && formData.productionModel;
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
                      <SelectTrigger>
                        <SelectValue placeholder="Select product type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spirit">Spirit</SelectItem>
                        <SelectItem value="beer">Beer</SelectItem>
                        <SelectItem value="wine">Wine</SelectItem>
                        <SelectItem value="cocktail">Cocktail</SelectItem>
                        <SelectItem value="non-alcoholic">Non-Alcoholic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {currentGuidedStep.fields?.includes('size') && (
                  <div className="space-y-2">
                    <Label htmlFor="size">Size *</Label>
                    <Select onValueChange={(value) => handleInputChange('size', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50ml">50ml</SelectItem>
                        <SelectItem value="200ml">200ml</SelectItem>
                        <SelectItem value="375ml">375ml</SelectItem>
                        <SelectItem value="500ml">500ml</SelectItem>
                        <SelectItem value="750ml">750ml</SelectItem>
                        <SelectItem value="1L">1L</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {currentGuidedStep.fields?.includes('productionModel') && (
                  <div className="space-y-2">
                    <Label htmlFor="productionModel">Production Model *</Label>
                    <Select onValueChange={(value) => handleInputChange('productionModel', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="How is this product made?" />
                      </SelectTrigger>
                      <SelectContent>
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
                      <h4 className="font-semibold text-slate-gray mb-2">Product Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div><strong>Name:</strong> {formData.name}</div>
                        <div><strong>SKU:</strong> {formData.sku}</div>
                        <div><strong>Type:</strong> {formData.type}</div>
                        <div><strong>Size:</strong> {formData.size}</div>
                        <div><strong>Production:</strong> {formData.productionModel}</div>
                        {formData.annualVolume && <div><strong>Annual Volume:</strong> {formData.annualVolume} bottles</div>}
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