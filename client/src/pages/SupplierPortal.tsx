import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, Plus, Building2, Package, CheckCircle, 
  AlertCircle, FileText, Upload, Trash2, Edit, 
  ShieldCheck, Globe, Mail, MapPin, Save
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SupplierPortalData {
  id: string;
  supplierName: string;
  supplierCategory: string;
  website?: string;
  contactEmail?: string;
  description?: string;
  addressStreet?: string;
  addressCity?: string;
  addressCountry?: string;
  submissionStatus: 'draft' | 'submitted' | 'approved' | 'rejected';
  isComplete: boolean;
  invitedBy: string;
  invitedByCompany: string;
  token: string;
}

interface ProductData {
  id?: number;
  productName: string;
  productDescription: string;
  sku: string;
  productAttributes: Record<string, any>;
  hasPrecalculatedLca: boolean;
  lcaDataJson?: Record<string, any>;
  environmentalCertifications: string[];
  sustainabilityMetrics: {
    carbonFootprint?: number;
    waterUsage?: number;
    recyclableContent?: number;
    energyUsage?: number;
  };
}

const supplierCategories = [
  { value: 'bottle_producer', label: 'Bottle Producer' },
  { value: 'cap_closure_producer', label: 'Cap & Closure Producer' },
  { value: 'label_producer', label: 'Label Producer' },
  { value: 'ingredient_supplier', label: 'Ingredient Supplier' },
  { value: 'packaging_supplier', label: 'Packaging Supplier' },
  { value: 'logistics_provider', label: 'Logistics Provider' },
  { value: 'other', label: 'Other' },
];

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

export default function SupplierPortal() {
  const { token } = useParams();
  const [selectedTab, setSelectedTab] = useState('company');
  const [supplierData, setSupplierData] = useState<SupplierPortalData>({
    id: '',
    supplierName: '',
    supplierCategory: 'none',
    website: '',
    contactEmail: '',
    description: '',
    addressStreet: '',
    addressCity: '',
    addressCountry: '',
    submissionStatus: 'draft',
    isComplete: false,
    invitedBy: '',
    invitedByCompany: '',
    token: token || '',
  });

  const [products, setProducts] = useState<ProductData[]>([]);
  const [newProduct, setNewProduct] = useState<ProductData>({
    productName: '',
    productDescription: '',
    sku: '',
    productAttributes: {},
    hasPrecalculatedLca: false,
    lcaDataJson: {},
    environmentalCertifications: [],
    sustainabilityMetrics: {},
  });
  
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();

  // Mock data for development - will be replaced with real API calls
  useEffect(() => {
    if (token) {
      // Simulate loading supplier portal data
      setSupplierData({
        id: '1',
        supplierName: 'EcoGlass Solutions',
        supplierCategory: 'bottle_producer',
        website: 'https://ecoglass.com',
        contactEmail: 'sustainability@ecoglass.com',
        description: 'Leading producer of sustainable glass bottles for the drinks industry',
        addressStreet: '123 Green Industrial Park',
        addressCity: 'Bristol',
        addressCountry: 'United Kingdom',
        submissionStatus: 'draft',
        isComplete: false,
        invitedBy: 'tim@avallen.solutions',
        invitedByCompany: 'Avallen Solutions',
        token: token,
      });
    }
  }, [token]);

  const handleSaveCompanyData = async () => {
    setIsSaving(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Company Information Saved',
        description: 'Your company details have been successfully updated.',
      });
      
      setSupplierData(prev => ({ ...prev, submissionStatus: 'draft' }));
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'There was an error saving your company information.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddProduct = () => {
    if (!newProduct.productName || !newProduct.sku) {
      toast({
        title: 'Validation Error',
        description: 'Product name and SKU are required.',
        variant: 'destructive',
      });
      return;
    }

    setProducts(prev => [...prev, { ...newProduct, id: Date.now() }]);
    setNewProduct({
      productName: '',
      productDescription: '',
      sku: '',
      productAttributes: {},
      hasPrecalculatedLca: false,
      lcaDataJson: {},
      environmentalCertifications: [],
      sustainabilityMetrics: {},
    });
    setIsAddingProduct(false);
    
    toast({
      title: 'Product Added',
      description: 'Your product has been added to the submission.',
    });
  };

  const handleRemoveProduct = (id: number) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    toast({
      title: 'Product Removed',
      description: 'The product has been removed from your submission.',
    });
  };

  const handleSubmitForReview = async () => {
    if (!supplierData.supplierName || supplierData.supplierCategory === 'none') {
      toast({
        title: 'Incomplete Submission',
        description: 'Please complete your company information before submitting.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSupplierData(prev => ({ 
        ...prev, 
        submissionStatus: 'submitted',
        isComplete: true 
      }));
      
      toast({
        title: 'Submission Complete',
        description: 'Your supplier information has been submitted for review. You will receive an email notification once reviewed.',
      });
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: 'There was an error submitting your information.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = () => {
    switch (supplierData.submissionStatus) {
      case 'draft':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
            <Edit className="w-3 h-3 mr-1" />
            Draft
          </Badge>
        );
      case 'submitted':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Under Review
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            <AlertCircle className="w-3 h-3 mr-1" />
            Needs Revision
          </Badge>
        );
      default:
        return null;
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Invalid Access</CardTitle>
            <CardDescription>
              This supplier portal requires a valid invitation token.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please use the invitation link provided in your email to access this portal.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Supplier Portal</h1>
                <p className="text-gray-600">
                  Invited by {supplierData.invitedByCompany}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {getStatusBadge()}
              {supplierData.submissionStatus === 'draft' && (
                <Button
                  onClick={handleSubmitForReview}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Submit for Review
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {supplierData.submissionStatus === 'submitted' ? (
          <Card>
            <CardHeader className="text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <CardTitle className="text-2xl text-green-600">Submission Complete</CardTitle>
              <CardDescription>
                Thank you for submitting your supplier information. Our team will review your submission 
                and you'll receive an email notification within 3-5 business days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">What happens next?</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Our sustainability team will review your company and product information</li>
                  <li>• We may contact you for additional information or clarification</li>
                  <li>• Once approved, you'll be added to our verified supplier network</li>
                  <li>• Your products will be available to our partner companies for sustainable sourcing</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="company">Company Information</TabsTrigger>
              <TabsTrigger value="products">Products & Services</TabsTrigger>
              <TabsTrigger value="sustainability">Sustainability Data</TabsTrigger>
            </TabsList>

            <TabsContent value="company" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Company Details</CardTitle>
                  <CardDescription>
                    Provide your company information to help us understand your business and capabilities.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="supplierName">Company Name *</Label>
                      <Input
                        id="supplierName"
                        value={supplierData.supplierName}
                        onChange={(e) => setSupplierData(prev => ({ 
                          ...prev, 
                          supplierName: e.target.value 
                        }))}
                        placeholder="Enter your company name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="supplierCategory">Industry Category *</Label>
                      <Select 
                        value={supplierData.supplierCategory} 
                        onValueChange={(value) => setSupplierData(prev => ({ 
                          ...prev, 
                          supplierCategory: value 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select category</SelectItem>
                          {supplierCategories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={supplierData.website}
                        onChange={(e) => setSupplierData(prev => ({ 
                          ...prev, 
                          website: e.target.value 
                        }))}
                        placeholder="https://yourcompany.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contactEmail">Contact Email *</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={supplierData.contactEmail}
                        onChange={(e) => setSupplierData(prev => ({ 
                          ...prev, 
                          contactEmail: e.target.value 
                        }))}
                        placeholder="sustainability@yourcompany.com"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Company Description</Label>
                    <Textarea
                      id="description"
                      value={supplierData.description}
                      onChange={(e) => setSupplierData(prev => ({ 
                        ...prev, 
                        description: e.target.value 
                      }))}
                      placeholder="Describe your company, capabilities, and sustainability focus"
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="addressStreet">Street Address</Label>
                      <Input
                        id="addressStreet"
                        value={supplierData.addressStreet}
                        onChange={(e) => setSupplierData(prev => ({ 
                          ...prev, 
                          addressStreet: e.target.value 
                        }))}
                        placeholder="123 Business Street"
                      />
                    </div>
                    <div>
                      <Label htmlFor="addressCity">City</Label>
                      <Input
                        id="addressCity"
                        value={supplierData.addressCity}
                        onChange={(e) => setSupplierData(prev => ({ 
                          ...prev, 
                          addressCity: e.target.value 
                        }))}
                        placeholder="London"
                      />
                    </div>
                    <div>
                      <Label htmlFor="addressCountry">Country</Label>
                      <Input
                        id="addressCountry"
                        value={supplierData.addressCountry}
                        onChange={(e) => setSupplierData(prev => ({ 
                          ...prev, 
                          addressCountry: e.target.value 
                        }))}
                        placeholder="United Kingdom"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveCompanyData}
                      disabled={isSaving}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Company Information
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Products & Services</CardTitle>
                      <CardDescription>
                        Add your products and services with detailed environmental information.
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => setIsAddingProduct(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Product
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {products.length === 0 ? (
                    <Alert>
                      <Package className="h-4 w-4" />
                      <AlertDescription>
                        No products added yet. Add your first product to help companies understand your offerings.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      {products.map((product) => (
                        <Card key={product.id} className="border-gray-200">
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{product.productName}</h3>
                                <p className="text-gray-600">SKU: {product.sku}</p>
                                {product.productDescription && (
                                  <p className="text-gray-700 mt-2">{product.productDescription}</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                {product.hasPrecalculatedLca && (
                                  <Badge className="bg-green-100 text-green-800 border-green-300">
                                    <FileText className="w-3 h-3 mr-1" />
                                    LCA Data
                                  </Badge>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRemoveProduct(product.id!)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {product.environmentalCertifications.length > 0 && (
                              <div className="mb-3">
                                <p className="text-sm font-medium text-gray-700 mb-2">Certifications:</p>
                                <div className="flex flex-wrap gap-2">
                                  {product.environmentalCertifications.map((cert, index) => (
                                    <Badge key={index} variant="outline">{cert}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {Object.keys(product.sustainabilityMetrics).length > 0 && (
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 mb-2">Sustainability Metrics:</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  {product.sustainabilityMetrics.carbonFootprint && (
                                    <div>Carbon Footprint: {product.sustainabilityMetrics.carbonFootprint} kg CO2e</div>
                                  )}
                                  {product.sustainabilityMetrics.waterUsage && (
                                    <div>Water Usage: {product.sustainabilityMetrics.waterUsage} L</div>
                                  )}
                                  {product.sustainabilityMetrics.recyclableContent && (
                                    <div>Recyclable Content: {product.sustainabilityMetrics.recyclableContent}%</div>
                                  )}
                                  {product.sustainabilityMetrics.energyUsage && (
                                    <div>Energy Usage: {product.sustainabilityMetrics.energyUsage} kWh</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {isAddingProduct && (
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-lg">Add New Product</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="productName">Product Name *</Label>
                            <Input
                              id="productName"
                              value={newProduct.productName}
                              onChange={(e) => setNewProduct(prev => ({ 
                                ...prev, 
                                productName: e.target.value 
                              }))}
                              placeholder="Enter product name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="sku">SKU *</Label>
                            <Input
                              id="sku"
                              value={newProduct.sku}
                              onChange={(e) => setNewProduct(prev => ({ 
                                ...prev, 
                                sku: e.target.value 
                              }))}
                              placeholder="Product SKU"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="productDescription">Description</Label>
                          <Textarea
                            id="productDescription"
                            value={newProduct.productDescription}
                            onChange={(e) => setNewProduct(prev => ({ 
                              ...prev, 
                              productDescription: e.target.value 
                            }))}
                            placeholder="Product description and specifications"
                            rows={3}
                          />
                        </div>

                        <div>
                          <Label>Environmental Certifications</Label>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {certificationOptions.map((cert) => (
                              <div key={cert} className="flex items-center space-x-2">
                                <Checkbox
                                  id={cert}
                                  checked={newProduct.environmentalCertifications.includes(cert)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setNewProduct(prev => ({
                                        ...prev,
                                        environmentalCertifications: [...prev.environmentalCertifications, cert]
                                      }));
                                    } else {
                                      setNewProduct(prev => ({
                                        ...prev,
                                        environmentalCertifications: prev.environmentalCertifications.filter(c => c !== cert)
                                      }));
                                    }
                                  }}
                                />
                                <Label htmlFor={cert} className="text-sm">{cert}</Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <Label>Sustainability Metrics (Optional)</Label>
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div>
                              <Label htmlFor="carbonFootprint">Carbon Footprint (kg CO2e)</Label>
                              <Input
                                id="carbonFootprint"
                                type="number"
                                value={newProduct.sustainabilityMetrics.carbonFootprint || ''}
                                onChange={(e) => setNewProduct(prev => ({
                                  ...prev,
                                  sustainabilityMetrics: {
                                    ...prev.sustainabilityMetrics,
                                    carbonFootprint: parseFloat(e.target.value) || undefined
                                  }
                                }))}
                                placeholder="0.0"
                              />
                            </div>
                            <div>
                              <Label htmlFor="waterUsage">Water Usage (L)</Label>
                              <Input
                                id="waterUsage"
                                type="number"
                                value={newProduct.sustainabilityMetrics.waterUsage || ''}
                                onChange={(e) => setNewProduct(prev => ({
                                  ...prev,
                                  sustainabilityMetrics: {
                                    ...prev.sustainabilityMetrics,
                                    waterUsage: parseFloat(e.target.value) || undefined
                                  }
                                }))}
                                placeholder="0.0"
                              />
                            </div>
                            <div>
                              <Label htmlFor="recyclableContent">Recyclable Content (%)</Label>
                              <Input
                                id="recyclableContent"
                                type="number"
                                min="0"
                                max="100"
                                value={newProduct.sustainabilityMetrics.recyclableContent || ''}
                                onChange={(e) => setNewProduct(prev => ({
                                  ...prev,
                                  sustainabilityMetrics: {
                                    ...prev.sustainabilityMetrics,
                                    recyclableContent: parseFloat(e.target.value) || undefined
                                  }
                                }))}
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <Label htmlFor="energyUsage">Energy Usage (kWh)</Label>
                              <Input
                                id="energyUsage"
                                type="number"
                                value={newProduct.sustainabilityMetrics.energyUsage || ''}
                                onChange={(e) => setNewProduct(prev => ({
                                  ...prev,
                                  sustainabilityMetrics: {
                                    ...prev.sustainabilityMetrics,
                                    energyUsage: parseFloat(e.target.value) || undefined
                                  }
                                }))}
                                placeholder="0.0"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasPrecalculatedLca"
                            checked={newProduct.hasPrecalculatedLca}
                            onCheckedChange={(checked) => setNewProduct(prev => ({
                              ...prev,
                              hasPrecalculatedLca: checked as boolean
                            }))}
                          />
                          <Label htmlFor="hasPrecalculatedLca">
                            I have precalculated LCA data for this product
                          </Label>
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button 
                            onClick={handleAddProduct}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Add Product
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setIsAddingProduct(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sustainability" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sustainability Information</CardTitle>
                  <CardDescription>
                    Provide information about your company's sustainability practices and environmental commitments.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Phase 4 Implementation:</strong> This section will include comprehensive sustainability 
                      data collection forms, document upload capabilities, and integration with LCA databases 
                      for verified environmental impact calculations.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}