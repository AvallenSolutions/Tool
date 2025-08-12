import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { ObjectUploader } from '@/components/ObjectUploader';
import { SupplierLogo } from '@/components/SupplierLogo';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { UploadResult } from '@uppy/core';

interface SupplierDetails {
  id: string;
  supplierName: string;
  supplierCategory: string;
  verificationStatus: 'verified' | 'pending_review' | 'client_provided';
  website?: string;
  contactEmail?: string;
  description?: string;
  addressStreet?: string;
  addressCity?: string;
  addressPostalCode?: string;
  addressCountry?: string;
  logoUrl?: string;
  submittedBy?: string;
  createdAt: string;
  updatedAt: string;
}

const supplierCategories = [
  { value: 'bottle_producer', label: 'Bottle Producer' },
  { value: 'cap_closure_producer', label: 'Cap & Closure Producer' },
  { value: 'label_producer', label: 'Label Producer' },
  { value: 'packaging_producer', label: 'Packaging Producer' },
  { value: 'ingredient_supplier', label: 'Ingredient Supplier' },
  { value: 'logistics_provider', label: 'Logistics Provider' },
  { value: 'equipment_supplier', label: 'Equipment Supplier' },
  { value: 'other', label: 'Other' },
];

export default function SupplierEdit() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Partial<SupplierDetails>>({});

  const { data: supplierResponse, isLoading } = useQuery<{success: boolean, data: SupplierDetails}>({
    queryKey: [`/api/admin/suppliers/${id}`],
    enabled: !!id,
  });

  const supplier = supplierResponse?.data;

  useEffect(() => {
    if (supplier) {
      setFormData({
        supplierName: supplier.supplierName,
        supplierCategory: supplier.supplierCategory,
        verificationStatus: supplier.verificationStatus,
        website: supplier.website || '',
        contactEmail: supplier.contactEmail || '',
        description: supplier.description || '',
        addressStreet: supplier.addressStreet || '',
        addressCity: supplier.addressCity || '',
        addressPostalCode: supplier.addressPostalCode || '',
        addressCountry: supplier.addressCountry || '',
        logoUrl: supplier.logoUrl || '',
      });
    }
  }, [supplier]);

  const updateSupplierMutation = useMutation({
    mutationFn: async (data: Partial<SupplierDetails>) => {
      const response = await fetch(`/api/admin/suppliers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update supplier');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/suppliers/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers'] });
      toast({
        title: 'Success',
        description: 'Supplier updated successfully',
      });
      navigate(`/app/admin/suppliers/${id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update supplier',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSupplierMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof SupplierDetails, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Edit Supplier" subtitle="Loading..." />
          <main className="flex-1 p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Edit Supplier" subtitle="Supplier not found" />
          <main className="flex-1 p-6">
            <Card>
              <CardContent className="p-12 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Supplier not found</h3>
                <p className="text-gray-500 mb-4">The supplier you're trying to edit doesn't exist.</p>
                <Button onClick={() => navigate('/app/admin/suppliers')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Suppliers
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header 
          title="Edit Supplier" 
          subtitle={supplier.supplierName}
        />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/app/admin/suppliers/${id}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Details
              </Button>
            </div>

            {/* Edit Form */}
            <Card>
              <CardHeader>
                <CardTitle>Supplier Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="supplierName">Supplier Name</Label>
                      <Input
                        id="supplierName"
                        value={formData.supplierName || ''}
                        onChange={(e) => handleInputChange('supplierName', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="supplierCategory">Category</Label>
                      <Select 
                        value={formData.supplierCategory || ''} 
                        onValueChange={(value) => handleInputChange('supplierCategory', value)}
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

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={formData.contactEmail || ''}
                        onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={formData.website || ''}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Supplier Logo</Label>
                    <div className="flex items-center gap-4">
                      <SupplierLogo 
                        logoUrl={formData.logoUrl} 
                        supplierName={formData.supplierName || 'Supplier'}
                        size="lg"
                      />
                      <div className="flex-1">
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={5242880} // 5MB
                          onGetUploadParameters={async () => {
                            const response = await fetch('/api/objects/upload', {
                              method: 'POST',
                              credentials: 'include',
                            });
                            if (!response.ok) {
                              throw new Error('Failed to get upload URL');
                            }
                            const { uploadURL } = await response.json();
                            return {
                              method: 'PUT' as const,
                              url: uploadURL,
                            };
                          }}
                          onComplete={(result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
                            if (result.successful && result.successful.length > 0) {
                              const uploadedFile = result.successful[0];
                              const imageUrl = uploadedFile.uploadURL;
                              if (imageUrl) {
                                handleInputChange('logoUrl', imageUrl);
                              }
                            }
                          }}
                          buttonClassName="w-full"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload New Logo
                        </ObjectUploader>
                        <p className="text-sm text-gray-500 mt-1">
                          Upload PNG, JPG, or SVG. Max 5MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="addressStreet">Street Address</Label>
                      <Input
                        id="addressStreet"
                        value={formData.addressStreet || ''}
                        onChange={(e) => handleInputChange('addressStreet', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="addressCity">City</Label>
                      <Input
                        id="addressCity"
                        value={formData.addressCity || ''}
                        onChange={(e) => handleInputChange('addressCity', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="addressPostalCode">Postal Code</Label>
                      <Input
                        id="addressPostalCode"
                        value={formData.addressPostalCode || ''}
                        onChange={(e) => handleInputChange('addressPostalCode', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="addressCountry">Country</Label>
                      <Input
                        id="addressCountry"
                        value={formData.addressCountry || ''}
                        onChange={(e) => handleInputChange('addressCountry', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="verificationStatus">Verification Status</Label>
                    <Select 
                      value={formData.verificationStatus || ''} 
                      onValueChange={(value: 'verified' | 'pending_review' | 'client_provided') => 
                        handleInputChange('verificationStatus', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="pending_review">Pending Review</SelectItem>
                        <SelectItem value="client_provided">Client Provided</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-3 pt-6">
                    <Button 
                      type="submit" 
                      className="bg-green-600 hover:bg-green-700"
                      disabled={updateSupplierMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateSupplierMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => navigate(`/app/admin/suppliers/${id}`)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}