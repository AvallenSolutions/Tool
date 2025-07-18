import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { X, Building, Calendar, Zap, Package, Users, FileText } from "lucide-react";
import ProgressBar from "./progress-bar";
import DocumentUpload from "@/components/documents/document-upload";

interface OnboardingWizardProps {
  onComplete: (companyId: number) => void;
  onCancel: () => void;
}

export default function OnboardingWizard({ onComplete, onCancel }: OnboardingWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Company data
    name: '',
    industry: '',
    size: '',
    address: '',
    country: '',
    website: '',
    reportingPeriodStart: '',
    reportingPeriodEnd: '',
    // Operational data
    electricityConsumption: '',
    gasConsumption: '',
    waterConsumption: '',
    wasteGenerated: '',
    // Product data
    productName: '',
    productType: '',
    productSize: '',
    productionModel: '',
    // Document upload tracking
    documentsUploaded: false,
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/company", data);
      return response.json();
    },
    onSuccess: (company) => {
      queryClient.invalidateQueries({ queryKey: ["/api/company"] });
      onComplete(company.id);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create company profile",
        variant: "destructive",
      });
    },
  });

  const totalSteps = 5;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
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
    const companyData = {
      name: formData.name,
      industry: formData.industry,
      size: formData.size,
      address: formData.address,
      country: formData.country,
      website: formData.website,
      currentReportingPeriodStart: formData.reportingPeriodStart,
      currentReportingPeriodEnd: formData.reportingPeriodEnd,
      onboardingComplete: true,
    };

    createCompanyMutation.mutate(companyData);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.name && formData.industry && formData.size;
      case 2:
        return formData.reportingPeriodStart && formData.reportingPeriodEnd;
      case 3:
        return true; // Document upload is optional
      case 4:
        return formData.electricityConsumption && formData.waterConsumption;
      case 5:
        return formData.productName && formData.productType && formData.productionModel;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Building className="w-12 h-12 text-avallen-green mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-gray mb-2">Company Profile</h3>
              <p className="text-gray-600">Tell us about your company</p>
            </div>
            
            <div>
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Craft Spirits Co."
              />
            </div>
            
            <div>
              <Label htmlFor="industry">Industry *</Label>
              <Select value={formData.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spirits">Spirits</SelectItem>
                  <SelectItem value="wine">Wine</SelectItem>
                  <SelectItem value="beer">Beer</SelectItem>
                  <SelectItem value="non-alcoholic">Non-alcoholic Beverages</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="size">Company Size *</Label>
              <Select value={formData.size} onValueChange={(value) => handleInputChange('size', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (1-50 employees)</SelectItem>
                  <SelectItem value="medium">Medium (51-250 employees)</SelectItem>
                  <SelectItem value="large">Large (250+ employees)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Company address"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  placeholder="e.g., United Kingdom"
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Calendar className="w-12 h-12 text-avallen-green mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-gray mb-2">Reporting Period</h3>
              <p className="text-gray-600">Define your sustainability reporting period</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reportingPeriodStart">Start Date *</Label>
                <Input
                  id="reportingPeriodStart"
                  type="date"
                  value={formData.reportingPeriodStart}
                  onChange={(e) => handleInputChange('reportingPeriodStart', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="reportingPeriodEnd">End Date *</Label>
                <Input
                  id="reportingPeriodEnd"
                  type="date"
                  value={formData.reportingPeriodEnd}
                  onChange={(e) => handleInputChange('reportingPeriodEnd', e.target.value)}
                />
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-800 text-sm">
                💡 Most companies use a 12-month period that aligns with their fiscal year.
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <FileText className="w-12 h-12 text-avallen-green mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-gray mb-2">Upload Documents</h3>
              <p className="text-gray-600">Upload utility bills and environmental documents for automatic data extraction</p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-blue-800 text-sm">
                💡 Upload your utility bills, energy certificates, and waste reports. Our AI will automatically extract key data to save you time in the next step.
              </p>
            </div>
            
            <DocumentUpload 
              onUploadSuccess={() => handleInputChange('documentsUploaded', 'true')}
              showApplyButton={false}
            />
            
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have documents ready? You can skip this step and enter data manually in the next step.
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Zap className="w-12 h-12 text-avallen-green mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-gray mb-2">Operational Footprint</h3>
              <p className="text-gray-600">Your direct operations (Scope 1 & 2)</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="electricityConsumption">Electricity Consumption (kWh/year) *</Label>
                <Input
                  id="electricityConsumption"
                  type="number"
                  value={formData.electricityConsumption}
                  onChange={(e) => handleInputChange('electricityConsumption', e.target.value)}
                  placeholder="e.g., 50000"
                />
              </div>
              <div>
                <Label htmlFor="gasConsumption">Gas Consumption (kWh/year)</Label>
                <Input
                  id="gasConsumption"
                  type="number"
                  value={formData.gasConsumption}
                  onChange={(e) => handleInputChange('gasConsumption', e.target.value)}
                  placeholder="e.g., 25000"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="waterConsumption">Water Consumption (L/year) *</Label>
                <Input
                  id="waterConsumption"
                  type="number"
                  value={formData.waterConsumption}
                  onChange={(e) => handleInputChange('waterConsumption', e.target.value)}
                  placeholder="e.g., 100000"
                />
              </div>
              <div>
                <Label htmlFor="wasteGenerated">Waste Generated (kg/year)</Label>
                <Input
                  id="wasteGenerated"
                  type="number"
                  value={formData.wasteGenerated}
                  onChange={(e) => handleInputChange('wasteGenerated', e.target.value)}
                  placeholder="e.g., 5000"
                />
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-green-800 text-sm">
                💡 Check your utility bills for accurate consumption data.
              </p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Package className="w-12 h-12 text-avallen-green mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-gray mb-2">Your #1 Selling Product</h3>
              <p className="text-gray-600">Tell us about your best-selling product. You can add additional SKUs later once setup is complete.</p>
            </div>
            
            <div>
              <Label htmlFor="productName">Product Name *</Label>
              <Input
                id="productName"
                value={formData.productName}
                onChange={(e) => handleInputChange('productName', e.target.value)}
                placeholder="e.g., Premium Gin (your top-selling product)"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="productType">Product Type *</Label>
                <Select value={formData.productType} onValueChange={(value) => handleInputChange('productType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spirit">Spirit</SelectItem>
                    <SelectItem value="wine">Wine</SelectItem>
                    <SelectItem value="beer">Beer</SelectItem>
                    <SelectItem value="non-alcoholic">Non-alcoholic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="productSize">Size</Label>
                <Input
                  id="productSize"
                  value={formData.productSize}
                  onChange={(e) => handleInputChange('productSize', e.target.value)}
                  placeholder="e.g., 500ml"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-slate-gray mb-3">How is this product made? *</Label>
              <RadioGroup 
                value={formData.productionModel} 
                onValueChange={(value) => handleInputChange('productionModel', value)}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2 border border-light-gray rounded-lg p-4 cursor-pointer hover:border-avallen-green">
                  <RadioGroupItem value="own" id="own" />
                  <div className="flex-1">
                    <Label htmlFor="own" className="font-medium text-slate-gray cursor-pointer">
                      Own Production
                    </Label>
                    <p className="text-sm text-gray-500">We make this product in our own facilities</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 border border-light-gray rounded-lg p-4 cursor-pointer hover:border-avallen-green">
                  <RadioGroupItem value="contract" id="contract" />
                  <div className="flex-1">
                    <Label htmlFor="contract" className="font-medium text-slate-gray cursor-pointer">
                      Contract Manufacturing
                    </Label>
                    <p className="text-sm text-gray-500">This product is made by a third-party manufacturer</p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-light-gray">
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
              {currentStep === 3 && (
                <Button
                  variant="outline"
                  onClick={handleNext}
                  className="border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Skip for now
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!isStepValid() || createCompanyMutation.isPending}
                className="bg-avallen-green hover:bg-avallen-green-light text-white"
              >
                {createCompanyMutation.isPending ? "Setting up..." : 
                 currentStep === totalSteps ? "Complete Setup" : "Continue"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
