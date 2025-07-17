import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Upload, FileText } from "lucide-react";

export default function SupplierPortal() {
  const { token } = useParams();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    energyConsumption: '',
    waterUsage: '',
    wasteGeneration: '',
    transportationData: '',
    rawMaterials: '',
    productionProcess: '',
    packagingMaterials: '',
    additionalInfo: '',
  });

  const { data: supplierData, isLoading, error } = useQuery({
    queryKey: [`/api/supplier-portal/${token}`],
    retry: false,
  });

  const submitDataMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", `/api/supplier-portal/${token}/submit`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your data has been submitted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit data",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitDataMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-lightest-gray flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-avallen-green border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-lightest-gray flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-light-gray">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-error-red mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-gray mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">
              This invitation link is invalid or has expired.
            </p>
            <p className="text-sm text-gray-500">
              Please contact the company that sent you this invitation for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const supplier = supplierData?.supplier;

  if (supplier?.status === 'completed') {
    return (
      <div className="min-h-screen bg-lightest-gray flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-light-gray">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-16 h-16 text-success-green mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-gray mb-2">Data Already Submitted</h1>
            <p className="text-gray-600 mb-4">
              Thank you! Your sustainability data has already been submitted.
            </p>
            <Badge className="bg-success-green/20 text-success-green">
              Completed
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lightest-gray py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-avallen-green rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-gray">Avallen Solutions</h1>
          </div>
          <p className="text-gray-600">Supplier Data Submission Portal</p>
        </div>

        {/* Supplier Info */}
        <Card className="mb-8 border-light-gray">
          <CardHeader>
            <CardTitle className="text-slate-gray">Supplier Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Company Name</Label>
                <p className="font-semibold text-slate-gray">{supplier?.name}</p>
              </div>
              <div>
                <Label className="text-gray-600">Contact Email</Label>
                <p className="font-semibold text-slate-gray">{supplier?.email}</p>
              </div>
              <div>
                <Label className="text-gray-600">Supplier Type</Label>
                <p className="font-semibold text-slate-gray capitalize">
                  {supplier?.supplierType?.replace('_', ' ')}
                </p>
              </div>
              <div>
                <Label className="text-gray-600">Status</Label>
                <Badge className="bg-muted-gold/20 text-muted-gold">
                  {supplier?.status === 'invited' ? 'Invited' : 'In Progress'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Submission Form */}
        <Card className="border-light-gray">
          <CardHeader>
            <CardTitle className="text-slate-gray">
              <FileText className="w-5 h-5 inline mr-2" />
              Sustainability Data Submission
            </CardTitle>
            <p className="text-gray-600">
              Please provide the following information to help calculate environmental impact.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Energy & Emissions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-gray">Energy & Emissions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="energyConsumption">Energy Consumption (kWh/year)</Label>
                    <Input
                      id="energyConsumption"
                      type="number"
                      value={formData.energyConsumption}
                      onChange={(e) => handleInputChange('energyConsumption', e.target.value)}
                      placeholder="e.g., 50000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="waterUsage">Water Usage (L/year)</Label>
                    <Input
                      id="waterUsage"
                      type="number"
                      value={formData.waterUsage}
                      onChange={(e) => handleInputChange('waterUsage', e.target.value)}
                      placeholder="e.g., 25000"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="wasteGeneration">Waste Generation (kg/year)</Label>
                  <Input
                    id="wasteGeneration"
                    type="number"
                    value={formData.wasteGeneration}
                    onChange={(e) => handleInputChange('wasteGeneration', e.target.value)}
                    placeholder="e.g., 1000"
                  />
                </div>
              </div>

              {/* Transportation */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-gray">Transportation</h3>
                <div>
                  <Label htmlFor="transportationData">Transportation Details</Label>
                  <Textarea
                    id="transportationData"
                    value={formData.transportationData}
                    onChange={(e) => handleInputChange('transportationData', e.target.value)}
                    placeholder="Describe your transportation methods, distances, and fuel types..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Materials & Production */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-gray">Materials & Production</h3>
                <div>
                  <Label htmlFor="rawMaterials">Raw Materials</Label>
                  <Textarea
                    id="rawMaterials"
                    value={formData.rawMaterials}
                    onChange={(e) => handleInputChange('rawMaterials', e.target.value)}
                    placeholder="List raw materials used, quantities, and sources..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="productionProcess">Production Process</Label>
                  <Textarea
                    id="productionProcess"
                    value={formData.productionProcess}
                    onChange={(e) => handleInputChange('productionProcess', e.target.value)}
                    placeholder="Describe your production processes and energy requirements..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="packagingMaterials">Packaging Materials</Label>
                  <Textarea
                    id="packagingMaterials"
                    value={formData.packagingMaterials}
                    onChange={(e) => handleInputChange('packagingMaterials', e.target.value)}
                    placeholder="Describe packaging materials and quantities..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-gray">Additional Information</h3>
                <div>
                  <Label htmlFor="additionalInfo">Additional Comments</Label>
                  <Textarea
                    id="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                    placeholder="Any additional information that might be relevant..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-6">
                <Button
                  type="submit"
                  disabled={submitDataMutation.isPending}
                  className="bg-avallen-green hover:bg-avallen-green-light text-white px-8 py-3"
                >
                  {submitDataMutation.isPending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Submit Data
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-600">
          <p>
            This data will be used to calculate environmental impact for sustainability reporting.
            All information is kept confidential and secure.
          </p>
        </div>
      </div>
    </div>
  );
}
