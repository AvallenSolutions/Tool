import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, Plus, Search, Filter, Building2, Package, CheckCircle, 
  Clock, Globe, Mail, MapPin, Star, ShieldCheck, Users, FileText,
  ExternalLink, Trash2, Edit
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Supplier {
  id: number;
  supplierName: string;
  supplierCategory: string;
  website?: string;
  contactEmail?: string;
  description?: string;
  location?: string;
  verificationStatus: 'verified' | 'pending_review' | 'client_provided';
  submittedBy: 'ADMIN' | 'SUPPLIER' | 'CLIENT';
  isVerified: boolean;
  createdAt: string;
}

interface SupplierProduct {
  id: number;
  supplierId: number;
  productName: string;
  productDescription?: string;
  sku?: string;
  hasPrecalculatedLca: boolean;
  supplierName: string;
  supplierCategory: string;
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

export default function SupplierNetwork() {
  const [selectedTab, setSelectedTab] = useState('browse');
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newSupplier, setNewSupplier] = useState({
    supplierName: '',
    supplierCategory: 'none',
    website: '',
    contactEmail: '',
    description: '',
    addressStreet: '',
    addressCity: '',
    addressCountry: '',
    products: [] as Array<{
      productName: string;
      productDescription: string;
      sku: string;
      hasPrecalculatedLca: boolean;
    }>
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data for Phase 3 development - represents both verified and client-provided suppliers
  const mockSuppliers: Supplier[] = [
    {
      id: 1,
      supplierName: 'EcoGlass Solutions',
      supplierCategory: 'bottle_producer',
      website: 'https://ecoglass.com',
      contactEmail: 'info@ecoglass.com',
      description: 'Leading producer of sustainable glass bottles for the drinks industry',
      location: 'Bristol, UK',
      verificationStatus: 'verified',
      submittedBy: 'ADMIN',
      isVerified: true,
      createdAt: '2025-01-15',
    },
    {
      id: 2,
      supplierName: 'Green Cap Manufacturing',
      supplierCategory: 'cap_closure_producer',
      website: 'https://greencaps.co.uk',
      contactEmail: 'sales@greencaps.co.uk',
      description: 'Recyclable bottle caps and closures made from sustainable materials',
      location: 'Manchester, UK',
      verificationStatus: 'verified',
      submittedBy: 'ADMIN',
      isVerified: true,
      createdAt: '2025-01-12',
    },
    {
      id: 3,
      supplierName: 'Regional Packaging Ltd',
      supplierCategory: 'packaging_supplier',
      contactEmail: 'contact@regionalpackaging.com',
      description: 'Local packaging supplier for secondary packaging needs',
      location: 'Edinburgh, UK',
      verificationStatus: 'client_provided',
      submittedBy: 'CLIENT',
      isVerified: false,
      createdAt: '2025-01-20',
    }
  ];

  const mockProducts: SupplierProduct[] = [
    {
      id: 1,
      supplierId: 1,
      productName: 'Premium Clear Glass Bottle 750ml',
      productDescription: 'High-quality clear glass bottle with optimized weight distribution',
      sku: 'ECO-750-CLR',
      hasPrecalculatedLca: true,
      supplierName: 'EcoGlass Solutions',
      supplierCategory: 'bottle_producer',
    },
    {
      id: 2,
      supplierId: 2,
      productName: 'Cork-Style Synthetic Cap',
      productDescription: 'Recyclable synthetic cap with cork appearance',
      sku: 'GC-CORK-28',
      hasPrecalculatedLca: true,
      supplierName: 'Green Cap Manufacturing',
      supplierCategory: 'cap_closure_producer',
    },
  ];

  const filteredSuppliers = mockSuppliers.filter(supplier => {
    const matchesSearch = supplier.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || selectedCategory === 'none' || supplier.supplierCategory === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const verifiedSuppliers = filteredSuppliers.filter(s => s.verificationStatus === 'verified');
  const clientSuppliers = filteredSuppliers.filter(s => s.verificationStatus === 'client_provided');

  const handleAddSupplier = () => {
    if (!newSupplier.supplierName || !newSupplier.supplierCategory || newSupplier.supplierCategory === 'none') {
      toast({
        title: 'Validation Error',
        description: 'Supplier name and category are required',
        variant: 'destructive',
      });
      return;
    }

    // For Phase 3 development - simulate API call
    toast({
      title: 'Supplier Added',
      description: `${newSupplier.supplierName} has been added to your supplier network and will be reviewed by our team for potential inclusion in the verified network.`,
    });

    setIsAddSupplierOpen(false);
    setNewSupplier({
      supplierName: '',
      supplierCategory: 'none',
      website: '',
      contactEmail: '',
      description: '',
      addressStreet: '',
      addressCity: '',
      addressCountry: '',
      products: []
    });
  };

  const addProductToSupplier = () => {
    setNewSupplier(prev => ({
      ...prev,
      products: [...prev.products, {
        productName: '',
        productDescription: '',
        sku: '',
        hasPrecalculatedLca: false
      }]
    }));
  };

  const removeProductFromSupplier = (index: number) => {
    setNewSupplier(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  const updateProduct = (index: number, field: string, value: any) => {
    setNewSupplier(prev => ({
      ...prev,
      products: prev.products.map((product, i) => 
        i === index ? { ...product, [field]: value } : product
      )
    }));
  };

  const getStatusBadge = (supplier: Supplier) => {
    if (supplier.verificationStatus === 'verified') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300">
          <ShieldCheck className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      );
    } else if (supplier.verificationStatus === 'pending_review') {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
          <Clock className="w-3 h-3 mr-1" />
          Under Review
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-300">
          <Building2 className="w-3 h-3 mr-1" />
          Your Network
        </Badge>
      );
    }
  };

  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Supplier Network" subtitle="Browse verified suppliers and manage your supplier network" />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-gray">Supplier Network</h1>
              <p className="text-gray-600">Browse verified suppliers and manage your supplier network</p>
            </div>
            <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
              <DialogTrigger asChild>
                <Button className="bg-avallen-green hover:bg-avallen-green-light text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Invite Your Supplier
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Invite Your Supplier</DialogTitle>
              <DialogDescription>
                Invite suppliers to join your network and provide environmental data. They'll receive an email invitation to complete their supplier profile.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplierName">Supplier Name *</Label>
                  <Input
                    id="supplierName"
                    value={newSupplier.supplierName}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, supplierName: e.target.value }))}
                    placeholder="Enter supplier name"
                  />
                </div>
                <div>
                  <Label htmlFor="supplierCategory">Category *</Label>
                  <Select 
                    value={newSupplier.supplierCategory} 
                    onValueChange={(value) => setNewSupplier(prev => ({ ...prev, supplierCategory: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
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
                    value={newSupplier.website}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://supplier.com"
                  />
                </div>
                <div>
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={newSupplier.contactEmail}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="contact@supplier.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newSupplier.description}
                  onChange={(e) => setNewSupplier(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the supplier and their capabilities"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="addressStreet">Street Address</Label>
                  <Input
                    id="addressStreet"
                    value={newSupplier.addressStreet}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, addressStreet: e.target.value }))}
                    placeholder="123 Main Street"
                  />
                </div>
                <div>
                  <Label htmlFor="addressCity">City</Label>
                  <Input
                    id="addressCity"
                    value={newSupplier.addressCity}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, addressCity: e.target.value }))}
                    placeholder="London"
                  />
                </div>
                <div>
                  <Label htmlFor="addressCountry">Country</Label>
                  <Input
                    id="addressCountry"
                    value={newSupplier.addressCountry}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, addressCountry: e.target.value }))}
                    placeholder="United Kingdom"
                  />
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <Label className="text-lg font-medium">Products (Optional)</Label>
                    <p className="text-sm text-gray-600">Add specific products from this supplier</p>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addProductToSupplier}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Product
                  </Button>
                </div>

                {newSupplier.products.map((product, index) => (
                  <Card key={index} className="mb-4">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-medium">Product {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProductFromSupplier(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Product Name</Label>
                          <Input
                            value={product.productName}
                            onChange={(e) => updateProduct(index, 'productName', e.target.value)}
                            placeholder="Enter product name"
                          />
                        </div>
                        <div>
                          <Label>SKU</Label>
                          <Input
                            value={product.sku}
                            onChange={(e) => updateProduct(index, 'sku', e.target.value)}
                            placeholder="Product SKU"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <Label>Description</Label>
                        <Textarea
                          value={product.productDescription}
                          onChange={(e) => updateProduct(index, 'productDescription', e.target.value)}
                          placeholder="Product description"
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddSupplierOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddSupplier}
                  className="bg-avallen-green hover:bg-avallen-green-light text-white"
                >
                  Send Invitation
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="browse">Browse Network</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="your-suppliers">Your Suppliers</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Supplier Network</CardTitle>
                  <CardDescription>
                    Browse verified suppliers and those added by your company
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search suppliers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {supplierCategories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {verifiedSuppliers.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold">Verified Suppliers</h3>
                    <Badge variant="outline">{verifiedSuppliers.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {verifiedSuppliers.map((supplier) => (
                      <Card key={supplier.id} className="border-green-200">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{supplier.supplierName}</CardTitle>
                              <p className="text-sm text-gray-600 capitalize">
                                {supplier.supplierCategory.replace('_', ' ')}
                              </p>
                            </div>
                            {getStatusBadge(supplier)}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {supplier.description && (
                            <p className="text-sm text-gray-700 mb-3">{supplier.description}</p>
                          )}
                          <div className="space-y-2">
                            {supplier.location && (
                              <div className="flex items-center text-sm text-gray-600">
                                <MapPin className="w-4 h-4 mr-2" />
                                {supplier.location}
                              </div>
                            )}
                            {supplier.website && (
                              <div className="flex items-center text-sm">
                                <Globe className="w-4 h-4 mr-2" />
                                <a 
                                  href={supplier.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center"
                                >
                                  Visit Website
                                  <ExternalLink className="w-3 h-3 ml-1" />
                                </a>
                              </div>
                            )}
                            {supplier.contactEmail && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Mail className="w-4 h-4 mr-2" />
                                <a href={`mailto:${supplier.contactEmail}`} className="text-blue-600 hover:underline">
                                  {supplier.contactEmail}
                                </a>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {clientSuppliers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold">Your Company Suppliers</h3>
                    <Badge variant="outline">{clientSuppliers.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clientSuppliers.map((supplier) => (
                      <Card key={supplier.id} className="border-blue-200">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{supplier.supplierName}</CardTitle>
                              <p className="text-sm text-gray-600 capitalize">
                                {supplier.supplierCategory.replace('_', ' ')}
                              </p>
                            </div>
                            {getStatusBadge(supplier)}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {supplier.description && (
                            <p className="text-sm text-gray-700 mb-3">{supplier.description}</p>
                          )}
                          <div className="space-y-2">
                            {supplier.location && (
                              <div className="flex items-center text-sm text-gray-600">
                                <MapPin className="w-4 h-4 mr-2" />
                                {supplier.location}
                              </div>
                            )}
                            {supplier.contactEmail && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Mail className="w-4 h-4 mr-2" />
                                <a href={`mailto:${supplier.contactEmail}`} className="text-blue-600 hover:underline">
                                  {supplier.contactEmail}
                                </a>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button variant="outline" size="sm">
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-3 h-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {filteredSuppliers.length === 0 && (
                <Alert>
                  <Search className="h-4 w-4" />
                  <AlertDescription>
                    No suppliers found matching your search criteria. Try adjusting your search terms or category filter.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Products</CardTitle>
              <CardDescription>Browse products available from your supplier network</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockProducts.map((product) => (
                  <Card key={product.id} className="border-gray-200">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{product.productName}</CardTitle>
                          <p className="text-sm text-gray-600">{product.supplierName}</p>
                        </div>
                        {product.hasPrecalculatedLca && (
                          <Badge className="bg-green-100 text-green-800 border-green-300">
                            <FileText className="w-3 h-3 mr-1" />
                            LCA Data
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {product.productDescription && (
                        <p className="text-sm text-gray-700 mb-3">{product.productDescription}</p>
                      )}
                      {product.sku && (
                        <p className="text-xs text-gray-500 mb-3">SKU: {product.sku}</p>
                      )}
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="your-suppliers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Company Suppliers</CardTitle>
              <CardDescription>Manage suppliers you've added to your network</CardDescription>
            </CardHeader>
            <CardContent>
              {clientSuppliers.length === 0 ? (
                <Alert>
                  <Building2 className="h-4 w-4" />
                  <AlertDescription>
                    You haven't added any suppliers yet. Use the "Add Your Supplier" button to get started.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {clientSuppliers.map((supplier) => (
                    <Card key={supplier.id} className="border-blue-200">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{supplier.supplierName}</h3>
                              {getStatusBadge(supplier)}
                            </div>
                            <p className="text-gray-600 capitalize mb-2">
                              {supplier.supplierCategory.replace('_', ' ')}
                            </p>
                            {supplier.description && (
                              <p className="text-gray-700 mb-3">{supplier.description}</p>
                            )}
                            <div className="flex gap-6 text-sm text-gray-600">
                              {supplier.location && (
                                <div className="flex items-center">
                                  <MapPin className="w-4 h-4 mr-1" />
                                  {supplier.location}
                                </div>
                              )}
                              {supplier.contactEmail && (
                                <div className="flex items-center">
                                  <Mail className="w-4 h-4 mr-1" />
                                  <a href={`mailto:${supplier.contactEmail}`} className="text-blue-600 hover:underline">
                                    {supplier.contactEmail}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}