import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { X, ArrowRight, Loader2, CheckCircle, Globe, Building2 } from "lucide-react";
import ProgressBar from "./progress-bar";

interface OnboardingWizardProps {
  onComplete: (companyId: number) => void;
  onCancel: () => void;
}

interface ScrapedData {
  name?: string;
  address?: string;
  contactDetails?: string;
  products: Array<{
    name: string;
    category?: string;
    imageUrl?: string;
    isPrimary: boolean;
  }>;
}

interface WizardFormData {
  firstName: string;
  companyName: string;
  websiteUrl: string;
  scrapedData: ScrapedData | null;
  selectedProducts: Set<number>;
  primaryMotivations: string[];
}

export default function OnboardingWizard({ onComplete, onCancel }: OnboardingWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<WizardFormData>({
    firstName: '',
    companyName: '',
    websiteUrl: '',
    scrapedData: null,
    selectedProducts: new Set(),
    primaryMotivations: [],
  });

  // Website scraping mutation
  const scrapeMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/onboarding/scrape", { url });
      return response.json();
    },
    onSuccess: (data: ScrapedData) => {
      setFormData(prev => ({
        ...prev,
        scrapedData: data,
        // Auto-fill company name if scraped successfully and not already set
        companyName: prev.companyName || data.name || prev.companyName
      }));
      toast({
        title: "Website Scraped Successfully",
        description: "Found company and product information from your website.",
      });
      setCurrentStep(4); // Move to review step
    },
    onError: (error: any) => {
      toast({
        title: "Scraping Failed",
        description: error.message || "Could not extract data from website. You can continue manually.",
        variant: "destructive",
      });
    },
  });

  // Company creation mutation
  const createCompanyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", "/api/companies/update-onboarding", data);
      return response.json();
    },
    onSuccess: async (company) => {
      queryClient.invalidateQueries({ queryKey: ["/api/company"] });
      toast({
        title: "Welcome aboard!",
        description: `Setup complete. Welcome to your sustainability dashboard, ${formData.firstName}!`,
      });
      onComplete(company.id);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete setup. Please try again.",
        variant: "destructive",
      });
    },
  });

  const totalSteps = 5;

  const handleNext = () => {
    if (currentStep === 3 && formData.websiteUrl) {
      // Trigger scraping on step 3
      scrapeMutation.mutate(formData.websiteUrl);
      return;
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    // Collect selected products
    const selectedProductList = formData.scrapedData?.products.filter((_, index) => 
      formData.selectedProducts.has(index)
    ) || [];

    const companyData = {
      name: formData.companyName,
      website: formData.websiteUrl,
      address: formData.scrapedData?.address,
      primaryMotivations: formData.primaryMotivations,
      onboardingComplete: true,
    };

    // Update user's first name separately if needed
    // For now we'll use the existing fallback user pattern
    
    createCompanyMutation.mutate(companyData);
  };

  const handleProductToggle = (productIndex: number) => {
    setFormData(prev => {
      const newSelected = new Set(prev.selectedProducts);
      if (newSelected.has(productIndex)) {
        newSelected.delete(productIndex);
      } else {
        newSelected.add(productIndex);
      }
      return { ...prev, selectedProducts: newSelected };
    });
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.firstName.trim().length > 0;
      case 2:
        return formData.companyName.trim().length > 0;
      case 3:
        return formData.websiteUrl.trim().length > 0;
      case 4:
        return true; // Review step is always valid
      case 5:
        return formData.primaryMotivations.length > 0;
      default:
        return false;
    }
  };



  const renderStep = () => {
    switch (currentStep) {
      case 1:
        // Step 1: Personal Welcome
        return (
          <div className="space-y-6 text-center">
            <div className="mb-8">
              <CheckCircle className="w-16 h-16 text-avallen-green mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-gray mb-2">
                Welcome to the Sustainability Tool!
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                We're going to help you measure and manage your brand's impact. 
                First, what should we call you?
              </p>
            </div>
            
            <div className="max-w-sm mx-auto">
              <Label htmlFor="firstName">Your First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="Enter your first name"
                className="text-center text-lg"
              />
            </div>
          </div>
        );
      
      case 2:
        // Step 2: Company Name
        return (
          <div className="space-y-6 text-center">
            <div className="mb-8">
              <Building2 className="w-16 h-16 text-avallen-green mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-gray mb-2">
                Great to meet you, {formData.firstName}!
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                What is the name of your company? This will be used as your account name.
              </p>
            </div>
            
            <div className="max-w-sm mx-auto">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Enter company name"
                className="text-center text-lg"
              />
            </div>
          </div>
        );
      
      case 3:
        // Step 3: Website Scraping
        return (
          <div className="space-y-6 text-center">
            <div className="mb-8">
              <Globe className="w-16 h-16 text-avallen-green mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-gray mb-2">
                Let's Import Your Data
              </h3>
              <p className="text-gray-600 max-w-lg mx-auto">
                To save you time, let's try to automatically import your company and 
                product details. Please enter your company's primary website address below.
              </p>
            </div>
            
            <div className="max-w-md mx-auto">
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input
                id="websiteUrl"
                value={formData.websiteUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                placeholder="https://yourcompany.com"
                className="text-center"
              />
              {scrapeMutation.isError && (
                <p className="text-sm text-red-600 mt-2">
                  Could not scrape website. You can continue manually.
                </p>
              )}
            </div>
          </div>
        );
      
      case 4:
        // Step 4: Review & Confirm Scraped Data
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle className="w-12 h-12 text-avallen-green mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-gray mb-2">
                Review Your Information
              </h3>
              <p className="text-gray-600">
                {formData.scrapedData ? 
                  "Here's what we found. Please check the details and make any corrections." :
                  "Please enter your company information manually."
                }
              </p>
            </div>
            
            {formData.scrapedData ? (
              <div className="space-y-4">
                <div>
                  <Label>Company Name</Label>
                  <Input
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Company name"
                  />
                </div>
                
                {formData.scrapedData.address && (
                  <div>
                    <Label>Address</Label>
                    <Textarea
                      value={formData.scrapedData.address}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        scrapedData: prev.scrapedData ? 
                          { ...prev.scrapedData, address: e.target.value } : null
                      }))}
                      rows={2}
                    />
                  </div>
                )}
                
                {formData.scrapedData.contactDetails && (
                  <div>
                    <Label>Contact Details</Label>
                    <Input
                      value={formData.scrapedData.contactDetails}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                )}
                
                {formData.scrapedData.products.length > 0 && (
                  <div>
                    <Label className="text-base font-semibold">Products Found</Label>
                    <p className="text-sm text-gray-600 mb-3">
                      Select the products you want to import:
                    </p>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {formData.scrapedData.products.map((product, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                          <Checkbox
                            id={`product-${index}`}
                            checked={formData.selectedProducts.has(index)}
                            onCheckedChange={() => handleProductToggle(index)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3">
                              {product.imageUrl && (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-12 h-12 object-cover rounded"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <div>
                                <p className="font-medium text-sm">{product.name}</p>
                                {product.category && (
                                  <p className="text-xs text-gray-500 capitalize">{product.category}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <p>No data was scraped. You can add your company details later from the dashboard.</p>
              </div>
            )}
          </div>
        );
      
      case 5:
        // Step 5: User Motivation
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle className="w-12 h-12 text-avallen-green mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-gray mb-2">
                Perfect!
              </h3>
              <p className="text-gray-600">
                To help us personalize your journey, what are your main goals with this tool? Select all that apply.
              </p>
            </div>
            
            <div className="space-y-3">
              {[
                { value: "measure_footprint", label: "Measure my company & product carbon footprint (LCA)" },
                { value: "sustainability_report", label: "Produce a professional annual sustainability report" },
                { value: "compliance", label: "Ensure compliance with new regulations (like DMCC)" },
                { value: "strategy", label: "Get help with my overall sustainability strategy" },
                { value: "net_zero", label: "Set and track progress towards Net Zero targets" }
              ].map(goal => (
                <div key={goal.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={goal.value}
                    checked={formData.primaryMotivations.includes(goal.value)}
                    onCheckedChange={(checked) => {
                      setFormData(prev => ({
                        ...prev,
                        primaryMotivations: checked
                          ? [...prev.primaryMotivations, goal.value]
                          : prev.primaryMotivations.filter(m => m !== goal.value)
                      }));
                    }}
                  />
                  <Label htmlFor={goal.value} className="cursor-pointer">
                    {goal.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-gray-200 shadow-xl">
        <CardHeader className="border-b border-light-gray">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-slate-gray">
              Complete Your Setup
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
        </CardHeader>
        
        <CardContent className="p-6">
          {renderStep()}
          
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="border-slate-gray text-slate-gray hover:bg-lightest-gray"
            >
              Back
            </Button>
            
            <div className="flex space-x-2">
              {currentStep === 4 && !formData.scrapedData && (
                <Button
                  variant="outline"
                  onClick={handleNext}
                  className="border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Continue Anyway
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!isStepValid() || scrapeMutation.isPending || createCompanyMutation.isPending}
                className="bg-avallen-green hover:bg-avallen-green-light text-white"
              >
                {scrapeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Importing Data...
                  </>
                ) : createCompanyMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Setting up...
                  </>
                ) : currentStep === 3 ? (
                  "Import My Data"
                ) : currentStep === totalSteps ? (
                  "Go to Dashboard"
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
