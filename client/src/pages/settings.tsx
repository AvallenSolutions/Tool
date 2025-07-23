import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Building, CreditCard, Settings as SettingsIcon, FileText, Leaf, Save, Loader2 } from "lucide-react";
import DocumentUpload from "@/components/documents/document-upload";

// Sustainability data constants
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

export default function Settings() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const { data: company } = useQuery({
    queryKey: ["/api/company"],
    retry: false,
  });

  // Initialize sustainability data
  const [sustainabilityData, setSustainabilityData] = useState({
    certifications: [],
    environmentalPolicies: {
      wasteManagement: '',
      energyEfficiency: '',
      waterConservation: '',
      carbonReduction: '',
    },
    facilitiesData: {
      energySource: '',
      renewableEnergyPercentage: undefined,
      wasteRecyclingPercentage: undefined,
      waterTreatment: '',
      transportationMethods: [],
    },
    sustainabilityReporting: {
      hasAnnualReport: false,
      reportingStandards: [],
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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-lightest-gray flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-avallen-green border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleSaveSustainabilityData = async () => {
    setIsSaving(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Sustainability Data Saved',
        description: 'Your sustainability information has been successfully updated.',
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'There was an error saving your sustainability data.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Settings" subtitle="Manage your account and company settings" />
        <main className="flex-1 p-6 overflow-y-auto">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="company">Company</TabsTrigger>
              <TabsTrigger value="sustainability">Sustainability</TabsTrigger>
              <TabsTrigger value="data">Data Management</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card className="border-light-gray">
                <CardHeader>
                  <CardTitle className="flex items-center text-slate-gray">
                    <User className="w-5 h-5 mr-2" />
                    Profile Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={user?.profileImageUrl} alt={user?.firstName} />
                      <AvatarFallback className="bg-avallen-green text-white text-lg">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-gray">
                        {user?.firstName} {user?.lastName}
                      </h3>
                      <p className="text-gray-600">{user?.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={user?.firstName || ''}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={user?.lastName || ''}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>

                  <p className="text-sm text-gray-600">
                    Profile information is managed through your authentication provider and cannot be changed here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="company">
              <Card className="border-light-gray">
                <CardHeader>
                  <CardTitle className="flex items-center text-slate-gray">
                    <Building className="w-5 h-5 mr-2" />
                    Company Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={company?.name || ''}
                      placeholder="Enter company name"
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="industry">Industry</Label>
                      <Input
                        id="industry"
                        value={company?.industry || ''}
                        placeholder="e.g., Alcoholic Beverages"
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="size">Company Size</Label>
                      <Input
                        id="size"
                        value={company?.size || ''}
                        placeholder="e.g., Small, Medium, Large"
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={company?.website || ''}
                      placeholder="https://example.com"
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={company?.address || ''}
                      placeholder="Enter company address"
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={company?.country || ''}
                        placeholder="Enter country"
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label>Onboarding Status</Label>
                      <div className="mt-2">
                        <Badge className={company?.onboardingComplete ? "bg-success-green/20 text-success-green" : "bg-muted-gold/20 text-muted-gold"}>
                          {company?.onboardingComplete ? "Complete" : "In Progress"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Button className="bg-avallen-green hover:bg-avallen-green-light text-white">
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sustainability" className="space-y-6">
              {/* Environmental Certifications */}
              <Card className="border-light-gray">
                <CardHeader>
                  <CardTitle className="flex items-center text-slate-gray">
                    <Leaf className="w-5 h-5 mr-2" />
                    Environmental Certifications
                  </CardTitle>
                  <CardDescription>
                    Select all environmental certifications your company currently holds.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {certificationOptions.map((cert) => (
                      <div key={cert} className="flex items-center space-x-2">
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
                        />
                        <Label htmlFor={`cert-${cert}`} className="text-sm">{cert}</Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Environmental Policies */}
              <Card className="border-light-gray">
                <CardHeader>
                  <CardTitle className="text-slate-gray">Environmental Policies</CardTitle>
                  <CardDescription>
                    Describe your company's environmental policies and practices.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="wasteManagement">Waste Management Policy</Label>
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
                      placeholder="Describe your waste reduction, recycling, and disposal practices..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="energyEfficiency">Energy Efficiency Measures</Label>
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
                      placeholder="Describe your energy conservation and efficiency initiatives..."
                      rows={3}
                    />
                  </div>
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

              {/* Facilities and Operations */}
              <Card className="border-light-gray">
                <CardHeader>
                  <CardTitle className="text-slate-gray">Facilities and Operations Data</CardTitle>
                  <CardDescription>
                    Provide details about your facilities' environmental performance.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="energySource">Primary Energy Source</Label>
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
                        <SelectTrigger>
                          <SelectValue placeholder="Select energy source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select energy source</SelectItem>
                          {energySourceOptions.map(source => (
                            <SelectItem key={source} value={source}>{source}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="renewableEnergyPercentage">Renewable Energy Percentage (%)</Label>
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
                        placeholder="0-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="wasteRecyclingPercentage">Waste Recycling Percentage (%)</Label>
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
                        placeholder="0-100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="waterTreatment">Water Treatment Method</Label>
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
                        placeholder="e.g., On-site treatment, Municipal treatment"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Transportation Methods Used</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {transportationOptions.map((method) => (
                        <div key={method} className="flex items-center space-x-2">
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
                          />
                          <Label htmlFor={`transport-${method}`} className="text-sm">{method}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sustainability Reporting */}
              <Card className="border-light-gray">
                <CardHeader>
                  <CardTitle className="text-slate-gray">Sustainability Reporting</CardTitle>
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
              <Card className="border-light-gray">
                <CardHeader>
                  <CardTitle className="text-slate-gray">Sustainability Goals and Commitments</CardTitle>
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
                  
                  <div className="flex justify-end pt-4">
                    <Button 
                      onClick={handleSaveSustainabilityData}
                      disabled={isSaving}
                      className="bg-avallen-green hover:bg-avallen-green-light text-white"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Sustainability Data
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="data">
              <div className="space-y-6">
                <Card className="border-light-gray">
                  <CardHeader>
                    <CardTitle className="flex items-center text-slate-gray">
                      <FileText className="w-5 h-5 mr-2" />
                      Document Upload & OCR
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DocumentUpload
                      title="Upload Environmental Documents"
                      description="Upload utility bills, energy certificates, or waste reports to automatically extract environmental data using OCR technology"
                      onDataExtracted={(data) => {
                        toast({
                          title: "Data Extracted",
                          description: "Environmental data has been successfully extracted from your document",
                        });
                      }}
                    />
                  </CardContent>
                </Card>
                
                <Card className="border-light-gray">
                  <CardHeader>
                    <CardTitle className="text-slate-gray">Manual Data Entry</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-600">
                      Prefer to enter data manually? You can also input your environmental data directly.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="electricity">Electricity Consumption (kWh)</Label>
                        <Input id="electricity" type="number" placeholder="Enter electricity usage" />
                      </div>
                      <div>
                        <Label htmlFor="gas">Gas Consumption (m³)</Label>
                        <Input id="gas" type="number" placeholder="Enter gas usage" />
                      </div>
                      <div>
                        <Label htmlFor="water">Water Consumption (m³)</Label>
                        <Input id="water" type="number" placeholder="Enter water usage" />
                      </div>
                      <div>
                        <Label htmlFor="waste">Waste Generated (kg)</Label>
                        <Input id="waste" type="number" placeholder="Enter waste amount" />
                      </div>
                    </div>
                    <Button className="bg-avallen-green hover:bg-avallen-green-light text-white">
                      Save Manual Data
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="billing">
              <Card className="border-light-gray">
                <CardHeader>
                  <CardTitle className="flex items-center text-slate-gray">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Billing & Subscription
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-lightest-gray rounded-lg">
                    <h3 className="font-semibold text-slate-gray mb-2">Current Plan</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-slate-gray">Professional</p>
                        <p className="text-gray-600">$299/month</p>
                      </div>
                      <Badge className="bg-success-green/20 text-success-green">Active</Badge>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-gray">Billing Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="billingName">Billing Name</Label>
                        <Input
                          id="billingName"
                          placeholder="Company name for billing"
                        />
                      </div>
                      <div>
                        <Label htmlFor="billingEmail">Billing Email</Label>
                        <Input
                          id="billingEmail"
                          type="email"
                          placeholder="billing@company.com"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-gray">Payment Method</h3>
                    <div className="p-4 border border-light-gray rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <CreditCard className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-slate-gray">•••• •••• •••• 4242</p>
                            <p className="text-sm text-gray-600">Expires 12/25</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Update
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button className="bg-avallen-green hover:bg-avallen-green-light text-white">
                      Update Billing
                    </Button>
                    <Button variant="outline" className="border-slate-gray text-slate-gray">
                      Download Invoice
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="account">
              <Card className="border-light-gray">
                <CardHeader>
                  <CardTitle className="flex items-center text-slate-gray">
                    <SettingsIcon className="w-5 h-5 mr-2" />
                    Account Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-gray">Preferences</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium text-slate-gray">Email Notifications</Label>
                          <p className="text-sm text-gray-600">Receive updates about your reports and account</p>
                        </div>
                        <input type="checkbox" className="toggle" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium text-slate-gray">Report Reminders</Label>
                          <p className="text-sm text-gray-600">Get reminded when it's time to generate reports</p>
                        </div>
                        <input type="checkbox" className="toggle" defaultChecked />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-gray">Account Actions</h3>
                    <div className="space-y-3">
                      <Button 
                        onClick={handleLogout}
                        variant="outline" 
                        className="border-slate-gray text-slate-gray"
                      >
                        Sign Out
                      </Button>
                      <Button 
                        variant="outline" 
                        className="border-error-red text-error-red hover:bg-error-red hover:text-white"
                      >
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
