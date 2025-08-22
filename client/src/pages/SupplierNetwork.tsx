import { useState } from 'react';
import { useLocation } from 'wouter';
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
  ExternalLink, ChevronDown, ChevronRight, X, AlertCircle, Trash2, Edit
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ObjectUploader } from '@/components/ObjectUploader';
import { SupplierLogo } from '@/components/SupplierLogo';
import type { UploadResult } from '@uppy/core';

interface Supplier {
  id: string;
  supplierName: string;
  supplierCategory: string;
  website?: string;
  contactEmail?: string;
  description?: string;
  location?: string;
  addressCountry?: string;
  logoUrl?: string;
  verificationStatus: 'verified' | 'pending_review' | 'client_provided';
  submittedBy: 'ADMIN' | 'SUPPLIER' | 'CLIENT';
  isVerified: boolean;
  createdAt: string;
}

interface SupplierProduct {
  id: string;
  supplierId: string;
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
  const [isEditSupplierOpen, setIsEditSupplierOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewSupplier, setReviewSupplier] = useState<any>(null);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [, setLocation] = useLocation();

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



  // Fetch real data from API
  const { data: suppliersResponse, isLoading: suppliersLoading, error: suppliersError } = useQuery<{success: boolean, data: Supplier[]}>({
    queryKey: ['/api/admin/suppliers'],
    queryFn: async () => {
      const response = await fetch('/api/admin/suppliers', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load suppliers');
      return response.json();
    },
  });

  const suppliers = suppliersResponse?.data || [];

  const { data: products, isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ['/api/supplier-products'],
    queryFn: async () => {
      const response = await fetch('/api/supplier-products', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load supplier products');
      return response.json();
    },
  });

  const filteredSuppliers = (suppliers || []).filter((supplier: Supplier) => {
    const matchesSearch = supplier.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || selectedCategory === 'none' || supplier.supplierCategory === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const verifiedSuppliers = filteredSuppliers.filter((s: Supplier) => s.verificationStatus === 'verified');
  const clientSuppliers = filteredSuppliers.filter((s: Supplier) => s.verificationStatus === 'client_provided');

  const addSupplierMutation = useMutation({
    mutationFn: async (invitationData: {
      email: string;
      category: string;
      companyName: string;
      contactName?: string;
      message?: string;
    }) => {
      const response = await fetch('/api/admin/supplier-invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(invitationData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send invitation');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-invitations'] });
      toast({
        title: 'Invitation Sent',
        description: `Invitation sent to ${newSupplier.contactEmail}. They will receive an email to complete their registration.`,
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
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: (error as any)?.message || 'Failed to send invitation',
        variant: 'destructive',
      });
    },
  });

  const handleAddSupplier = () => {
    if (!newSupplier.supplierName || !newSupplier.supplierCategory || newSupplier.supplierCategory === 'none') {
      toast({
        title: 'Validation Error',
        description: 'Supplier name and category are required',
        variant: 'destructive',
      });
      return;
    }

    if (!newSupplier.contactEmail) {
      toast({
        title: 'Validation Error',
        description: 'Contact email is required to send invitation',
        variant: 'destructive',
      });
      return;
    }

    const invitationData = {
      email: newSupplier.contactEmail,
      category: newSupplier.supplierCategory,
      companyName: newSupplier.supplierName,
      contactName: '', // Could be extracted from other fields if needed
      message: newSupplier.description || 'Welcome to our supplier network!',
    };

    addSupplierMutation.mutate(invitationData);
  };

  const handleEditSupplier = (supplier: any) => {
    setEditingSupplier({
      id: supplier.id,
      supplierName: supplier.supplierName,
      supplierCategory: supplier.supplierCategory,
      website: supplier.website || '',
      contactEmail: supplier.contactEmail || '',
      description: supplier.description || '',
      addressStreet: supplier.addressLine1 || '',
      addressCity: supplier.city || '',
      addressCountry: supplier.addressCountry || '',
    });
    setIsEditSupplierOpen(true);
  };

  const updateSupplierMutation = useMutation({
    mutationFn: async (supplierData: any) => {
      const response = await fetch(`/api/verified-suppliers/${supplierData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(supplierData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update supplier');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      toast({
        title: 'Supplier Updated',
        description: 'Supplier information has been successfully updated.',
      });
      
      setIsEditSupplierOpen(false);
      setEditingSupplier(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: (error as any)?.message || 'Failed to update supplier',
        variant: 'destructive',
      });
    },
  });

  const handleUpdateSupplier = () => {
    if (!editingSupplier?.supplierName || !editingSupplier?.supplierCategory || editingSupplier.supplierCategory === 'none') {
      toast({
        title: 'Validation Error',
        description: 'Supplier name and category are required',
        variant: 'destructive',
      });
      return;
    }

    updateSupplierMutation.mutate(editingSupplier);
  };

  const handleEditProduct = (product: any) => {
    // For now, just show a toast - full product editing would require a separate component
    toast({
      title: 'Feature Coming Soon',
      description: 'Product editing functionality is being developed. You can currently add new products through the Product Registration page.',
    });
  };

  const handleReviewSupplier = (supplier: any) => {
    setReviewSupplier(supplier);
    setIsReviewOpen(true);
  };

  const handleDeleteSupplier = (supplierId: number) => {
    if (confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) {
      deleteSupplierMutation.mutate(supplierId);
    }
  };

  const handleGetUploadParameters = async () => {
    const response = await fetch('/api/objects/upload', {
      method: 'POST',
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to get upload parameters');
    }
    
    const { uploadURL } = await response.json();
    
    return {
      method: 'PUT' as const,
      url: uploadURL,
    };
  };

  const handleImageUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFiles = result.successful.map(file => ({
        name: file.name,
        url: file.uploadURL,
        size: file.size,
      }));
      
      toast({
        title: 'Images Uploaded',
        description: `Successfully uploaded ${uploadedFiles.length} image(s)`,
      });
      
      // Update the editing supplier with the new images
      if (editingSupplier) {
        setEditingSupplier(prev => ({
          ...prev,
          images: [...(prev.images || []), ...uploadedFiles]
        }));
      }
    }
  };

  const deleteSupplierMutation = useMutation({
    mutationFn: async (supplierId: number) => {
      const response = await fetch(`/api/verified-suppliers/${supplierId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete supplier');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      toast({
        title: 'Supplier Deleted',
        description: 'Supplier has been successfully deleted.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: (error as any)?.message || 'Failed to delete supplier',
        variant: 'destructive',
      });
    },
  });

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
    <div className="flex min-h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="Supplier Network" subtitle="Browse verified suppliers and manage your supplier network" />
        <main className="flex-1 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-gray">Supplier Network</h1>
              <p className="text-gray-600">Browse verified suppliers and manage your supplier network</p>
            </div>
            <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Invite Your Supplier
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
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
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={addSupplierMutation.isPending}
                >
                  {addSupplierMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending Invitation...
                    </>
                  ) : (
                    'Send Invitation'
                  )}
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
                    {verifiedSuppliers.map((supplier: Supplier) => (
                      <Card 
                        key={supplier.id} 
                        className="border-green-200 hover:shadow-md transition-shadow"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3 flex-1">
                              <SupplierLogo 
                                logoUrl={supplier.logoUrl} 
                                supplierName={supplier.supplierName}
                                size="sm"
                              />
                              <div>
                                <CardTitle className="text-lg">{supplier.supplierName}</CardTitle>
                                <p className="text-sm text-gray-600 capitalize">
                                  {supplier.supplierCategory.replace('_', ' ')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(supplier)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {supplier.description && (
                            <p className="text-sm text-gray-700 mb-3">
                              {supplier.description.length > 300 ? `${supplier.description.substring(0, 300)}...` : supplier.description}
                            </p>
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
                            <div className="flex items-center gap-3 flex-1">
                              <SupplierLogo 
                                logoUrl={supplier.logoUrl} 
                                supplierName={supplier.supplierName}
                                size="sm"
                              />
                              <div>
                                <CardTitle className="text-lg">{supplier.supplierName}</CardTitle>
                                <p className="text-sm text-gray-600 capitalize">
                                  {supplier.supplierCategory.replace('_', ' ')}
                                </p>
                              </div>
                            </div>
                            {getStatusBadge(supplier)}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {supplier.description && (
                            <p className="text-sm text-gray-700 mb-3">
                              {supplier.description.length > 300 ? `${supplier.description.substring(0, 300)}...` : supplier.description}
                            </p>
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
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Supplier Products</CardTitle>
                  <CardDescription>Browse products available from your supplier network</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search products..."
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(products || [])
                  .filter((product: any) => {
                    const matchesSearch = product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                         product.productDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                         product.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesCategory = selectedCategory === 'all' || product.supplierCategory === selectedCategory;
                    return matchesSearch && matchesCategory;
                  })
                  .map((product: any) => (
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
                        <p className="text-sm text-gray-700 mb-3">
                          {product.productDescription.length > 300 ? `${product.productDescription.substring(0, 300)}...` : product.productDescription}
                        </p>
                      )}
                      {product.sku && (
                        <p className="text-xs text-gray-500 mb-2">SKU: {product.sku}</p>
                      )}

                      
                      {/* LCA Document Link */}
                      {product.productAttributes?.lcaDocumentPath && (
                        <div className="mb-2">
                          <a 
                            href={`/uploads/${product.productAttributes.lcaDocumentPath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            View LCA Document
                          </a>
                        </div>
                      )}

                      {/* CO2 Emissions Display */}
                      {product.productAttributes?.co2Emissions && (
                        <div className="flex items-center gap-2 mb-3 p-2 bg-green-50 rounded-md">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-green-800">
                            CO2: {product.productAttributes.co2Emissions}g CO2e
                          </span>
                        </div>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-3"
                        onClick={() => setLocation(`/app/supplier-network/product/${product.id}`)}
                      >
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
                  {clientSuppliers.map((supplier: Supplier) => (
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
                              <p className="text-gray-700 mb-3">
                                {supplier.description.length > 300 ? `${supplier.description.substring(0, 300)}...` : supplier.description}
                              </p>
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
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleReviewSupplier(supplier)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditSupplier(supplier)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteSupplier(supplier.id)}
                              className="text-red-600 hover:text-red-700 hover:border-red-300"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
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

          {/* Edit Supplier Dialog */}
          <Dialog open={isEditSupplierOpen} onOpenChange={setIsEditSupplierOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
              <DialogHeader>
                <DialogTitle>Edit Supplier</DialogTitle>
                <DialogDescription>
                  Update supplier information and upload images.
                </DialogDescription>
              </DialogHeader>
              {editingSupplier && (
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="editSupplierName">Supplier Name *</Label>
                      <Input
                        id="editSupplierName"
                        value={editingSupplier.supplierName}
                        onChange={(e) => setEditingSupplier(prev => ({ ...prev, supplierName: e.target.value }))}
                        placeholder="Enter supplier name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="editSupplierCategory">Category *</Label>
                      <Select 
                        value={editingSupplier.supplierCategory} 
                        onValueChange={(value) => setEditingSupplier(prev => ({ ...prev, supplierCategory: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {supplierCategories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="editWebsite">Website</Label>
                      <Input
                        id="editWebsite"
                        type="url"
                        value={editingSupplier.website}
                        onChange={(e) => setEditingSupplier(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://supplier.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="editContactEmail">Contact Email</Label>
                      <Input
                        id="editContactEmail"
                        type="email"
                        value={editingSupplier.contactEmail}
                        onChange={(e) => setEditingSupplier(prev => ({ ...prev, contactEmail: e.target.value }))}
                        placeholder="contact@supplier.com"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="editDescription">Description</Label>
                    <Textarea
                      id="editDescription"
                      value={editingSupplier.description}
                      onChange={(e) => setEditingSupplier(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the supplier and their capabilities"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="editAddressStreet">Street Address</Label>
                      <Input
                        id="editAddressStreet"
                        value={editingSupplier.addressStreet}
                        onChange={(e) => setEditingSupplier(prev => ({ ...prev, addressStreet: e.target.value }))}
                        placeholder="123 Main Street"
                      />
                    </div>
                    <div>
                      <Label htmlFor="editAddressCity">City</Label>
                      <Input
                        id="editAddressCity"
                        value={editingSupplier.addressCity}
                        onChange={(e) => setEditingSupplier(prev => ({ ...prev, addressCity: e.target.value }))}
                        placeholder="London"
                      />
                    </div>
                    <div>
                      <Label htmlFor="editAddressCountry">Country</Label>
                      <Input
                        id="editAddressCountry"
                        value={editingSupplier.addressCountry}
                        onChange={(e) => setEditingSupplier(prev => ({ ...prev, addressCountry: e.target.value }))}
                        placeholder="United Kingdom"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-base font-medium">Supplier Images</Label>
                    <p className="text-sm text-gray-600 mb-3">Upload images for this supplier (logo, facility photos, etc.)</p>
                    <ObjectUploader
                      maxNumberOfFiles={5}
                      maxFileSize={10485760}
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleImageUploadComplete}
                      buttonClassName="w-full"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        <span>Upload Images</span>
                      </div>
                    </ObjectUploader>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsEditSupplierOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpdateSupplier}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={updateSupplierMutation.isPending}
                    >
                      {updateSupplierMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Supplier'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Review Supplier Dialog */}
          <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-gray-200 shadow-xl">
              <div className="bg-white rounded-lg">
              <DialogHeader className="bg-gray-50 p-6 rounded-t-lg border-b">
                <DialogTitle className="font-headline text-xl text-gray-900">Supplier Review</DialogTitle>
                <DialogDescription className="text-gray-600 font-body">
                  Review detailed information about this supplier.
                </DialogDescription>
              </DialogHeader>
              {reviewSupplier && (
                <div className="p-6 space-y-4 bg-white">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Supplier Name</Label>
                      <p className="text-gray-900 font-medium">{reviewSupplier.supplierName}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Category</Label>
                      <p className="text-gray-900 capitalize">{reviewSupplier.supplierCategory?.replace('_', ' ')}</p>
                    </div>
                  </div>

                  {reviewSupplier.description && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Description</Label>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-md">{reviewSupplier.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {reviewSupplier.website && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Website</Label>
                        <a 
                          href={reviewSupplier.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center"
                        >
                          {reviewSupplier.website}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </div>
                    )}
                    {reviewSupplier.contactEmail && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Contact Email</Label>
                        <a href={`mailto:${reviewSupplier.contactEmail}`} className="text-blue-600 hover:underline">
                          {reviewSupplier.contactEmail}
                        </a>
                      </div>
                    )}
                  </div>

                  {reviewSupplier.location && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Location</Label>
                      <p className="text-gray-900">{reviewSupplier.location}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Status</Label>
                    <div>{getStatusBadge(reviewSupplier)}</div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                    <Button variant="outline" onClick={() => setIsReviewOpen(false)}>
                      Close
                    </Button>
                    <Button 
                      onClick={() => {
                        setIsReviewOpen(false);
                        handleEditSupplier(reviewSupplier);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Supplier
                    </Button>
                  </div>
                </div>
              )}
              </div>
            </DialogContent>
          </Dialog>

        </main>
      </div>
    </div>
  );
}