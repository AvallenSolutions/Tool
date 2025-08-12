import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Leaf, Target, BarChart3, Save, Loader2, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

// Sustainability data constants extracted from Settings
const certificationOptions = [
  'ISO 14001',
  'FSC Certified', 
  'Cradle to Cradle',
  'Carbon Neutral',
  'Organic Certified',
  'Fair Trade',
  'B-Corp Certified',
  'LEED Certified',
  'Other'
];

const energySourceOptions = [
  'Grid Electricity (Mixed)',
  'Renewable Energy (100%)',
  'Solar Power',
  'Wind Power',
  'Hydroelectric',
  'Natural Gas',
  'Coal',
  'Nuclear',
  'Biomass',
  'Mixed Sources'
];

const reportingStandardOptions = [
  'GRI Standards',
  'CDP (Carbon Disclosure Project)',
  'SASB (Sustainability Accounting Standards Board)',
  'TCFD (Task Force on Climate-related Financial Disclosures)',
  'UN Global Compact',
  'ISO 26000',
  'B-Corp Impact Assessment',
  'Science Based Targets (SBTi)',
  'Other'
];

const transportationOptions = [
  'Road Transport (Truck)',
  'Rail Transport',
  'Sea Freight',
  'Air Freight',
  'Electric Vehicles',
  'Hybrid Vehicles',
  'Bicycle/Walking',
  'Public Transportation',
  'Multimodal Transport'
];

export default function Company() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();

  const { data: company } = useQuery({
    queryKey: ["/api/company"],
    retry: false,
  });

  // Fetch sustainability data from backend
  const { data: backendSustainabilityData, isLoading: sustainabilityLoading } = useQuery({
    queryKey: ["/api/company/sustainability-data"],
    retry: false,
    enabled: !!company,
  });

  // Update sustainability data mutation
  const sustainabilityMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/company/sustainability-data", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/sustainability-data"] });
      toast({
        title: 'Environmental Data Saved',
        description: 'Your company environmental information has been successfully updated.',
      });
    },
    onError: () => {
      toast({
        title: 'Save Failed',
        description: 'There was an error saving your environmental data.',
        variant: 'destructive',
      });
    },
  });

  // Initialize sustainability data with proper types
  const [sustainabilityData, setSustainabilityData] = useState({
    certifications: [] as string[],
    environmentalPolicies: {
      wasteManagement: '',
      energyEfficiency: '',
      waterConservation: '',
      carbonReduction: '',
    },
    facilitiesData: {
      energySource: '',
      renewableEnergyPercentage: undefined as number | undefined,
      wasteRecyclingPercentage: undefined as number | undefined,
      waterTreatment: '',
      transportationMethods: [] as string[],
    },
    sustainabilityReporting: {
      hasAnnualReport: false,
      reportingStandards: [] as string[],
      thirdPartyVerification: false,
      scopeEmissions: {
        scope1: false,
        scope2: false,
        scope3: false,
      },
    },
    goals: {
      carbonNeutralTarget: '',
      sustainabilityGoals: '',
      circularEconomyInitiatives: '',
    },
  });

  // Update state when backend data loads
  useEffect(() => {
    if (backendSustainabilityData && !sustainabilityLoading) {
      setSustainabilityData(prevData => ({
        ...prevData,
        ...backendSustainabilityData,
      }));
    }
  }, [backendSustainabilityData, sustainabilityLoading]);

  // Auto-save functionality - save changes after 2 seconds of inactivity
  useEffect(() => {
    if (!backendSustainabilityData || sustainabilityLoading) return;
    
    const timeoutId = setTimeout(() => {
      // Only auto-save if data has actually changed
      const hasChanges = JSON.stringify(sustainabilityData) !== JSON.stringify(backendSustainabilityData);
      if (hasChanges && !sustainabilityMutation.isPending) {
        sustainabilityMutation.mutate(sustainabilityData);
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [sustainabilityData, backendSustainabilityData, sustainabilityLoading, sustainabilityMutation]);

  // Use backend completion percentage if available, otherwise calculate locally
  const completionPercentage = backendSustainabilityData?.completionPercentage ?? (() => {
    const totalFields = 17; // Updated count for more accurate tracking
    let completedFields = 0;

    if (sustainabilityData.certifications.length > 0) completedFields++;
    if (sustainabilityData.environmentalPolicies.wasteManagement) completedFields++;
    if (sustainabilityData.environmentalPolicies.energyEfficiency) completedFields++;
    if (sustainabilityData.environmentalPolicies.waterConservation) completedFields++;
    if (sustainabilityData.environmentalPolicies.carbonReduction) completedFields++;
    if (sustainabilityData.facilitiesData.energySource) completedFields++;
    if (sustainabilityData.facilitiesData.renewableEnergyPercentage !== undefined) completedFields++;
    if (sustainabilityData.facilitiesData.wasteRecyclingPercentage !== undefined) completedFields++;
    if (sustainabilityData.facilitiesData.waterTreatment) completedFields++;
    if (sustainabilityData.facilitiesData.transportationMethods.length > 0) completedFields++;
    if (sustainabilityData.sustainabilityReporting.hasAnnualReport) completedFields++;
    if (sustainabilityData.sustainabilityReporting.reportingStandards.length > 0) completedFields++;
    if (sustainabilityData.sustainabilityReporting.thirdPartyVerification) completedFields++;
    if (sustainabilityData.sustainabilityReporting.scopeEmissions.scope1 || 
        sustainabilityData.sustainabilityReporting.scopeEmissions.scope2 || 
        sustainabilityData.sustainabilityReporting.scopeEmissions.scope3) completedFields++;
    if (sustainabilityData.goals.carbonNeutralTarget) completedFields++;
    if (sustainabilityData.goals.sustainabilityGoals) completedFields++;
    if (sustainabilityData.goals.circularEconomyInitiatives) completedFields++;

    return Math.round((completedFields / totalFields) * 100);
  })();

  const handleSaveSustainabilityData = async () => {
    setIsSaving(true);
    try {
      await sustainabilityMutation.mutateAsync(sustainabilityData);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-lightest-gray flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-avallen-green border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Company" subtitle="Manage your environmental impact and sustainability data" />
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Enhanced Progress Overview */}
          <Card className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-l-avallen-green">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-avallen-green/10 rounded-lg">
                    <Leaf className="w-6 h-6 text-avallen-green" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-gray">Environmental Data Collection</h3>
                    <p className="text-sm text-gray-600">
                      Complete your sustainability profile to generate comprehensive reports
                      {sustainabilityMutation.isPending && (
                        <span className="text-blue-600 ml-2 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Auto-saving...
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {backendSustainabilityData?.lastUpdated && (
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Last saved</div>
                      <div className="text-xs font-medium">
                        {new Date(backendSustainabilityData.lastUpdated).toLocaleTimeString()}
                      </div>
                    </div>
                  )}
                  <Badge 
                    variant={completionPercentage >= 100 ? "default" : "outline"} 
                    className={`px-3 py-1 ${
                      completionPercentage >= 100 
                        ? "bg-green-600 hover:bg-green-700" 
                        : completionPercentage >= 50 
                          ? "bg-blue-600 text-white" 
                          : "bg-gray-100"
                    }`}
                  >
                    {completionPercentage >= 100 ? (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    ) : completionPercentage >= 50 ? (
                      <Info className="w-3 h-3 mr-1" />
                    ) : (
                      <AlertCircle className="w-3 h-3 mr-1" />
                    )}
                    {completionPercentage}% Complete
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Progress 
                  value={completionPercentage} 
                  className="w-full h-3 bg-gray-200"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Getting Started</span>
                  <span>In Progress</span>
                  <span>Complete</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-gray-100">
              <TabsTrigger 
                value="overview" 
                className="flex flex-col items-center gap-2 py-4 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-avallen-green/20"
              >
                <Building2 className="w-5 h-5" />
                <span className="text-sm font-medium">Overview</span>
                <span className="text-xs text-gray-500">Company & Certifications</span>
              </TabsTrigger>
              <TabsTrigger 
                value="operations" 
                className="flex flex-col items-center gap-2 py-4 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-avallen-green/20"
              >
                <Leaf className="w-5 h-5" />
                <span className="text-sm font-medium">Operations</span>
                <span className="text-xs text-gray-500">Facilities & Practices</span>
              </TabsTrigger>
              <TabsTrigger 
                value="goals" 
                className="flex flex-col items-center gap-2 py-4 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-avallen-green/20"
              >
                <Target className="w-5 h-5" />
                <span className="text-sm font-medium">Goals</span>
                <span className="text-xs text-gray-500">Targets & Planning</span>
              </TabsTrigger>
              <TabsTrigger 
                value="impact" 
                className="flex flex-col items-center gap-2 py-4 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-avallen-green/20"
              >
                <BarChart3 className="w-5 h-5" />
                <span className="text-sm font-medium">Impact</span>
                <span className="text-xs text-gray-500">Progress & Results</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Enhanced Company Basic Info */}
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-gray-50">
                  <CardTitle className="flex items-center text-slate-gray">
                    <div className="p-2 bg-blue-100 rounded-lg mr-3">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    Company Information
                  </CardTitle>
                  <CardDescription>
                    Your company profile information is used as the foundation for all environmental reporting
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Company Name</Label>
                      <div className="relative">
                        <Input
                          value={company?.name || ''}
                          readOnly
                          className="bg-gray-50 border-gray-200 pl-10"
                        />
                        <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Industry</Label>
                      <div className="relative">
                        <Input
                          value={company?.industry || ''}
                          readOnly
                          className="bg-gray-50 border-gray-200 pl-10"
                        />
                        <Leaf className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Company Size</Label>
                      <Input
                        value={company?.size || ''}
                        readOnly
                        className="bg-gray-50 border-gray-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Country</Label>
                      <Input
                        value={company?.country || ''}
                        readOnly
                        className="bg-gray-50 border-gray-200"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Environmental Certifications */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="bg-gradient-to-r from-green-50 to-gray-50">
                  <CardTitle className="flex items-center text-slate-gray">
                    <div className="p-2 bg-green-100 rounded-lg mr-3">
                      <Leaf className="w-5 h-5 text-green-600" />
                    </div>
                    Environmental Certifications
                    {sustainabilityData.certifications.length > 0 && (
                      <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                        {sustainabilityData.certifications.length} selected
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Select all environmental certifications your company currently holds. These validate your sustainability commitments.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {certificationOptions.map((cert) => (
                      <div 
                        key={cert} 
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                          sustainabilityData.certifications.includes(cert)
                            ? 'bg-green-50 border-green-200 shadow-sm'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <Checkbox
                          id={`cert-${cert}`}
                          checked={sustainabilityData.certifications.includes(cert)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSustainabilityData(prev => ({
                                ...prev,
                                certifications: [...prev.certifications, cert]
                              }));
                            } else {
                              setSustainabilityData(prev => ({
                                ...prev,
                                certifications: prev.certifications.filter(c => c !== cert)
                              }));
                            }
                          }}
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                        <Label 
                          htmlFor={`cert-${cert}`} 
                          className={`text-sm font-medium cursor-pointer ${
                            sustainabilityData.certifications.includes(cert)
                              ? 'text-green-700'
                              : 'text-gray-700'
                          }`}
                        >
                          {cert}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {sustainabilityData.certifications.length === 0 && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">No certifications selected</span>
                      </div>
                      <p className="text-sm text-amber-600 mt-1">
                        Adding certifications helps demonstrate your environmental commitments to stakeholders
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Enhanced Environmental Policies */}
              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-gray-50">
                  <CardTitle className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg mr-3">
                      <Target className="w-5 h-5 text-purple-600" />
                    </div>
                    Environmental Policies
                  </CardTitle>
                  <CardDescription>
                    Describe your company's environmental policies and practices in detail. This information helps stakeholders understand your sustainability commitments.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="wasteManagement" className="text-sm font-semibold text-gray-700">
                        Waste Management Policy
                      </Label>
                      {sustainabilityData.environmentalPolicies.wasteManagement && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <Textarea
                      id="wasteManagement"
                      value={sustainabilityData.environmentalPolicies.wasteManagement}
                      onChange={(e) => setSustainabilityData(prev => ({
                        ...prev,
                        environmentalPolicies: {
                          ...prev.environmentalPolicies,
                          wasteManagement: e.target.value
                        }
                      }))}
                      placeholder="Describe your waste reduction, recycling programs, disposal practices, and circular economy initiatives..."
                      rows={4}
                      className="resize-none focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="text-xs text-gray-500">
                      Character count: {sustainabilityData.environmentalPolicies.wasteManagement.length}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="energyEfficiency" className="text-sm font-semibold text-gray-700">
                        Energy Efficiency Measures
                      </Label>
                      {sustainabilityData.environmentalPolicies.energyEfficiency && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <Textarea
                      id="energyEfficiency"
                      value={sustainabilityData.environmentalPolicies.energyEfficiency}
                      onChange={(e) => setSustainabilityData(prev => ({
                        ...prev,
                        environmentalPolicies: {
                          ...prev.environmentalPolicies,
                          energyEfficiency: e.target.value
                        }
                      }))}
                      placeholder="Describe your energy conservation initiatives, efficiency programs, renewable energy adoption, and reduction targets..."
                      rows={4}
                      className="resize-none focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="text-xs text-gray-500">
                      Character count: {sustainabilityData.environmentalPolicies.energyEfficiency.length}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="operations" className="space-y-6">
              {/* Enhanced Facilities and Operations */}
              <Card className="border-l-4 border-l-orange-500">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-gray-50">
                  <CardTitle className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg mr-3">
                      <Leaf className="w-5 h-5 text-orange-600" />
                    </div>
                    Facilities and Operations Data
                  </CardTitle>
                  <CardDescription>
                    Provide detailed information about your facilities' environmental performance and operational practices.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                  {/* Energy Section */}
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-800 flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      Energy Management
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="energySource" className="text-sm font-semibold text-gray-700">
                            Primary Energy Source
                          </Label>
                          {sustainabilityData.facilitiesData.energySource && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <Select 
                          value={sustainabilityData.facilitiesData.energySource} 
                          onValueChange={(value) => setSustainabilityData(prev => ({
                            ...prev,
                            facilitiesData: {
                              ...prev.facilitiesData,
                              energySource: value
                            }
                          }))}
                        >
                          <SelectTrigger className="focus:ring-2 focus:ring-orange-500">
                            <SelectValue placeholder="Select primary energy source" />
                          </SelectTrigger>
                          <SelectContent>
                            {energySourceOptions.map(source => (
                              <SelectItem key={source} value={source}>{source}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="renewableEnergyPercentage" className="text-sm font-semibold text-gray-700">
                            Renewable Energy Percentage (%)
                          </Label>
                          {sustainabilityData.facilitiesData.renewableEnergyPercentage !== undefined && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <Input
                          id="renewableEnergyPercentage"
                          type="number"
                          min="0"
                          max="100"
                          value={sustainabilityData.facilitiesData.renewableEnergyPercentage || ''}
                          onChange={(e) => setSustainabilityData(prev => ({
                            ...prev,
                            facilitiesData: {
                              ...prev.facilitiesData,
                              renewableEnergyPercentage: parseFloat(e.target.value) || undefined
                            }
                          }))}
                          placeholder="Enter percentage (0-100)"
                          className="focus:ring-2 focus:ring-orange-500"
                        />
                        <div className="text-xs text-gray-500">
                          What percentage of your energy comes from renewable sources?
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Waste & Water Section */}
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-800 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Waste & Water Management
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="wasteRecyclingPercentage" className="text-sm font-semibold text-gray-700">
                            Waste Recycling Percentage (%)
                          </Label>
                          {sustainabilityData.facilitiesData.wasteRecyclingPercentage !== undefined && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <Input
                          id="wasteRecyclingPercentage"
                          type="number"
                          min="0"
                          max="100"
                          value={sustainabilityData.facilitiesData.wasteRecyclingPercentage || ''}
                          onChange={(e) => setSustainabilityData(prev => ({
                            ...prev,
                            facilitiesData: {
                              ...prev.facilitiesData,
                              wasteRecyclingPercentage: parseFloat(e.target.value) || undefined
                            }
                          }))}
                          placeholder="Enter percentage (0-100)"
                          className="focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="text-xs text-gray-500">
                          Percentage of waste that is recycled or diverted from landfill
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="waterTreatment" className="text-sm font-semibold text-gray-700">
                            Water Treatment Method
                          </Label>
                          {sustainabilityData.facilitiesData.waterTreatment && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <Input
                          id="waterTreatment"
                          value={sustainabilityData.facilitiesData.waterTreatment}
                          onChange={(e) => setSustainabilityData(prev => ({
                            ...prev,
                            facilitiesData: {
                              ...prev.facilitiesData,
                              waterTreatment: e.target.value
                            }
                          }))}
                          placeholder="e.g., On-site treatment, Municipal system"
                          className="focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="text-xs text-gray-500">
                          How does your facility treat wastewater?
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transportation Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h4 className="text-md font-semibold text-gray-800 flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        Transportation Methods Used
                      </h4>
                      {sustainabilityData.facilitiesData.transportationMethods.length > 0 && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          {sustainabilityData.facilitiesData.transportationMethods.length} selected
                        </Badge>
                      )}
                    </div>
                    <div className="pl-4">
                      <p className="text-sm text-gray-600 mb-4">
                        Select all transportation methods your company uses for logistics and employee commuting
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {transportationOptions.map((method) => (
                          <div 
                            key={method} 
                            className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                              sustainabilityData.facilitiesData.transportationMethods.includes(method)
                                ? 'bg-purple-50 border-purple-200 shadow-sm'
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <Checkbox
                              id={`transport-${method}`}
                              checked={sustainabilityData.facilitiesData.transportationMethods.includes(method)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSustainabilityData(prev => ({
                                    ...prev,
                                    facilitiesData: {
                                      ...prev.facilitiesData,
                                      transportationMethods: [...prev.facilitiesData.transportationMethods, method]
                                    }
                                  }));
                                } else {
                                  setSustainabilityData(prev => ({
                                    ...prev,
                                    facilitiesData: {
                                      ...prev.facilitiesData,
                                      transportationMethods: prev.facilitiesData.transportationMethods.filter(m => m !== method)
                                    }
                                  }));
                                }
                              }}
                              className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                            />
                            <Label 
                              htmlFor={`transport-${method}`} 
                              className={`text-sm font-medium cursor-pointer ${
                                sustainabilityData.facilitiesData.transportationMethods.includes(method)
                                  ? 'text-purple-700'
                                  : 'text-gray-700'
                              }`}
                            >
                              {method}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {sustainabilityData.facilitiesData.transportationMethods.length === 0 && (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center gap-2 text-amber-700">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">No transportation methods selected</span>
                          </div>
                          <p className="text-sm text-amber-600 mt-1">
                            Selecting transportation methods helps track your logistics carbon footprint
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Environmental Policies continued */}
              <Card>
                <CardHeader>
                  <CardTitle>Environmental Policies (continued)</CardTitle>
                  <CardDescription>
                    Additional environmental practices and conservation measures.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="waterConservation">Water Conservation Practices</Label>
                    <Textarea
                      id="waterConservation"
                      value={sustainabilityData.environmentalPolicies.waterConservation}
                      onChange={(e) => setSustainabilityData(prev => ({
                        ...prev,
                        environmentalPolicies: {
                          ...prev.environmentalPolicies,
                          waterConservation: e.target.value
                        }
                      }))}
                      placeholder="Describe your water usage reduction and conservation measures..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="carbonReduction">Carbon Reduction Strategy</Label>
                    <Textarea
                      id="carbonReduction"
                      value={sustainabilityData.environmentalPolicies.carbonReduction}
                      onChange={(e) => setSustainabilityData(prev => ({
                        ...prev,
                        environmentalPolicies: {
                          ...prev.environmentalPolicies,
                          carbonReduction: e.target.value
                        }
                      }))}
                      placeholder="Describe your carbon footprint reduction initiatives and targets..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="goals" className="space-y-6">
              {/* Sustainability Reporting */}
              <Card>
                <CardHeader>
                  <CardTitle>Sustainability Reporting</CardTitle>
                  <CardDescription>
                    Information about your sustainability reporting practices and standards.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasAnnualReport"
                      checked={sustainabilityData.sustainabilityReporting.hasAnnualReport}
                      onCheckedChange={(checked) => setSustainabilityData(prev => ({
                        ...prev,
                        sustainabilityReporting: {
                          ...prev.sustainabilityReporting,
                          hasAnnualReport: checked as boolean
                        }
                      }))}
                    />
                    <Label htmlFor="hasAnnualReport">We publish an annual sustainability report</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="thirdPartyVerification"
                      checked={sustainabilityData.sustainabilityReporting.thirdPartyVerification}
                      onCheckedChange={(checked) => setSustainabilityData(prev => ({
                        ...prev,
                        sustainabilityReporting: {
                          ...prev.sustainabilityReporting,
                          thirdPartyVerification: checked as boolean
                        }
                      }))}
                    />
                    <Label htmlFor="thirdPartyVerification">Our sustainability data is third-party verified</Label>
                  </div>

                  <div>
                    <Label>Reporting Standards Used</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {reportingStandardOptions.map((standard) => (
                        <div key={standard} className="flex items-center space-x-2">
                          <Checkbox
                            id={`standard-${standard}`}
                            checked={sustainabilityData.sustainabilityReporting.reportingStandards.includes(standard)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSustainabilityData(prev => ({
                                  ...prev,
                                  sustainabilityReporting: {
                                    ...prev.sustainabilityReporting,
                                    reportingStandards: [...prev.sustainabilityReporting.reportingStandards, standard]
                                  }
                                }));
                              } else {
                                setSustainabilityData(prev => ({
                                  ...prev,
                                  sustainabilityReporting: {
                                    ...prev.sustainabilityReporting,
                                    reportingStandards: prev.sustainabilityReporting.reportingStandards.filter(s => s !== standard)
                                  }
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={`standard-${standard}`} className="text-sm">{standard}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Scope Emissions Reporting</Label>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="scope1"
                          checked={sustainabilityData.sustainabilityReporting.scopeEmissions.scope1}
                          onCheckedChange={(checked) => setSustainabilityData(prev => ({
                            ...prev,
                            sustainabilityReporting: {
                              ...prev.sustainabilityReporting,
                              scopeEmissions: {
                                ...prev.sustainabilityReporting.scopeEmissions,
                                scope1: checked as boolean
                              }
                            }
                          }))}
                        />
                        <Label htmlFor="scope1" className="text-sm">Scope 1 (Direct emissions)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="scope2"
                          checked={sustainabilityData.sustainabilityReporting.scopeEmissions.scope2}
                          onCheckedChange={(checked) => setSustainabilityData(prev => ({
                            ...prev,
                            sustainabilityReporting: {
                              ...prev.sustainabilityReporting,
                              scopeEmissions: {
                                ...prev.sustainabilityReporting.scopeEmissions,
                                scope2: checked as boolean
                              }
                            }
                          }))}
                        />
                        <Label htmlFor="scope2" className="text-sm">Scope 2 (Indirect emissions)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="scope3"
                          checked={sustainabilityData.sustainabilityReporting.scopeEmissions.scope3}
                          onCheckedChange={(checked) => setSustainabilityData(prev => ({
                            ...prev,
                            sustainabilityReporting: {
                              ...prev.sustainabilityReporting,
                              scopeEmissions: {
                                ...prev.sustainabilityReporting.scopeEmissions,
                                scope3: checked as boolean
                              }
                            }
                          }))}
                        />
                        <Label htmlFor="scope3" className="text-sm">Scope 3 (Value chain emissions)</Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sustainability Goals */}
              <Card>
                <CardHeader>
                  <CardTitle>Sustainability Goals and Commitments</CardTitle>
                  <CardDescription>
                    Share your company's sustainability targets and future commitments.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="carbonNeutralTarget">Carbon Neutrality Target</Label>
                    <Input
                      id="carbonNeutralTarget"
                      value={sustainabilityData.goals.carbonNeutralTarget}
                      onChange={(e) => setSustainabilityData(prev => ({
                        ...prev,
                        goals: {
                          ...prev.goals,
                          carbonNeutralTarget: e.target.value
                        }
                      }))}
                      placeholder="e.g., 2030, 2050, or describe your target"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sustainabilityGoals">Sustainability Goals and Targets</Label>
                    <Textarea
                      id="sustainabilityGoals"
                      value={sustainabilityData.goals.sustainabilityGoals}
                      onChange={(e) => setSustainabilityData(prev => ({
                        ...prev,
                        goals: {
                          ...prev.goals,
                          sustainabilityGoals: e.target.value
                        }
                      }))}
                      placeholder="Describe your specific sustainability goals, targets, and timelines..."
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="circularEconomyInitiatives">Circular Economy Initiatives</Label>
                    <Textarea
                      id="circularEconomyInitiatives"
                      value={sustainabilityData.goals.circularEconomyInitiatives}
                      onChange={(e) => setSustainabilityData(prev => ({
                        ...prev,
                        goals: {
                          ...prev.goals,
                          circularEconomyInitiatives: e.target.value
                        }
                      }))}
                      placeholder="Describe your circular economy practices, reuse programs, and waste reduction initiatives..."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="impact" className="space-y-6">
              {/* Environmental Impact Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Environmental Impact Summary</CardTitle>
                  <CardDescription>
                    Overview of your company's environmental data collection progress and next steps
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Progress Overview */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Data Collection Progress</span>
                      <span className="text-sm text-gray-600">{completionPercentage}%</span>
                    </div>
                    <Progress value={completionPercentage} className="w-full" />
                  </div>

                  {/* Data Categories Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Completed Sections:</h4>
                      <div className="space-y-1">
                        {sustainabilityData.certifications.length > 0 && (
                          <div className="flex items-center text-sm text-green-600">
                            <div className="w-2 h-2 bg-green-600 rounded-full mr-2" />
                            Environmental Certifications
                          </div>
                        )}
                        {sustainabilityData.facilitiesData.energySource && (
                          <div className="flex items-center text-sm text-green-600">
                            <div className="w-2 h-2 bg-green-600 rounded-full mr-2" />
                            Energy Source Data
                          </div>
                        )}
                        {sustainabilityData.goals.carbonNeutralTarget && (
                          <div className="flex items-center text-sm text-green-600">
                            <div className="w-2 h-2 bg-green-600 rounded-full mr-2" />
                            Carbon Neutrality Target
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Next Steps:</h4>
                      <div className="space-y-1">
                        {sustainabilityData.environmentalPolicies.wasteManagement === '' && (
                          <div className="flex items-center text-sm text-amber-600">
                            <div className="w-2 h-2 bg-amber-600 rounded-full mr-2" />
                            Complete Waste Management Policy
                          </div>
                        )}
                        {sustainabilityData.facilitiesData.renewableEnergyPercentage === undefined && (
                          <div className="flex items-center text-sm text-amber-600">
                            <div className="w-2 h-2 bg-amber-600 rounded-full mr-2" />
                            Add Renewable Energy Percentage
                          </div>
                        )}
                        {sustainabilityData.goals.sustainabilityGoals === '' && (
                          <div className="flex items-center text-sm text-amber-600">
                            <div className="w-2 h-2 bg-amber-600 rounded-full mr-2" />
                            Define Sustainability Goals
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Impact Metrics Placeholder */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium text-sm mb-2">Environmental Impact Visualization</h4>
                    <p className="text-sm text-gray-600">
                      Once you complete data collection, this section will display:
                    </p>
                    <ul className="text-sm text-gray-600 mt-2 space-y-1">
                      <li>• Energy consumption and renewable energy usage charts</li>
                      <li>• Waste generation and recycling rate visualizations</li>
                      <li>• Carbon footprint progress tracking</li>
                      <li>• Sustainability goal progress indicators</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {sustainabilityMutation.isPending ? (
                    <span className="flex items-center text-blue-600">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Auto-saving changes...
                    </span>
                  ) : backendSustainabilityData?.lastUpdated ? (
                    <span>
                      Last updated: {new Date(backendSustainabilityData.lastUpdated).toLocaleString()}
                    </span>
                  ) : (
                    <span>Changes are automatically saved</span>
                  )}
                </div>
                <Button 
                  onClick={handleSaveSustainabilityData}
                  disabled={isSaving || sustainabilityMutation.isPending}
                  className="bg-avallen-green hover:bg-avallen-green-light text-white"
                >
                  {(isSaving || sustainabilityMutation.isPending) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Now
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}