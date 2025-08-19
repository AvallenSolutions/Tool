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

const countries = [
  { value: 'AF', label: 'Afghanistan' },
  { value: 'AL', label: 'Albania' },
  { value: 'DZ', label: 'Algeria' },
  { value: 'AD', label: 'Andorra' },
  { value: 'AO', label: 'Angola' },
  { value: 'AG', label: 'Antigua and Barbuda' },
  { value: 'AR', label: 'Argentina' },
  { value: 'AM', label: 'Armenia' },
  { value: 'AU', label: 'Australia' },
  { value: 'AT', label: 'Austria' },
  { value: 'AZ', label: 'Azerbaijan' },
  { value: 'BS', label: 'Bahamas' },
  { value: 'BH', label: 'Bahrain' },
  { value: 'BD', label: 'Bangladesh' },
  { value: 'BB', label: 'Barbados' },
  { value: 'BY', label: 'Belarus' },
  { value: 'BE', label: 'Belgium' },
  { value: 'BZ', label: 'Belize' },
  { value: 'BJ', label: 'Benin' },
  { value: 'BT', label: 'Bhutan' },
  { value: 'BO', label: 'Bolivia' },
  { value: 'BA', label: 'Bosnia and Herzegovina' },
  { value: 'BW', label: 'Botswana' },
  { value: 'BR', label: 'Brazil' },
  { value: 'BN', label: 'Brunei' },
  { value: 'BG', label: 'Bulgaria' },
  { value: 'BF', label: 'Burkina Faso' },
  { value: 'BI', label: 'Burundi' },
  { value: 'CV', label: 'Cabo Verde' },
  { value: 'KH', label: 'Cambodia' },
  { value: 'CM', label: 'Cameroon' },
  { value: 'CA', label: 'Canada' },
  { value: 'CF', label: 'Central African Republic' },
  { value: 'TD', label: 'Chad' },
  { value: 'CL', label: 'Chile' },
  { value: 'CN', label: 'China' },
  { value: 'CO', label: 'Colombia' },
  { value: 'KM', label: 'Comoros' },
  { value: 'CD', label: 'Congo (Democratic Republic)' },
  { value: 'CG', label: 'Congo (Republic)' },
  { value: 'CR', label: 'Costa Rica' },
  { value: 'HR', label: 'Croatia' },
  { value: 'CU', label: 'Cuba' },
  { value: 'CY', label: 'Cyprus' },
  { value: 'CZ', label: 'Czech Republic' },
  { value: 'DK', label: 'Denmark' },
  { value: 'DJ', label: 'Djibouti' },
  { value: 'DM', label: 'Dominica' },
  { value: 'DO', label: 'Dominican Republic' },
  { value: 'EC', label: 'Ecuador' },
  { value: 'EG', label: 'Egypt' },
  { value: 'SV', label: 'El Salvador' },
  { value: 'GQ', label: 'Equatorial Guinea' },
  { value: 'ER', label: 'Eritrea' },
  { value: 'EE', label: 'Estonia' },
  { value: 'SZ', label: 'Eswatini' },
  { value: 'ET', label: 'Ethiopia' },
  { value: 'FJ', label: 'Fiji' },
  { value: 'FI', label: 'Finland' },
  { value: 'FR', label: 'France' },
  { value: 'GA', label: 'Gabon' },
  { value: 'GM', label: 'Gambia' },
  { value: 'GE', label: 'Georgia' },
  { value: 'DE', label: 'Germany' },
  { value: 'GH', label: 'Ghana' },
  { value: 'GR', label: 'Greece' },
  { value: 'GD', label: 'Grenada' },
  { value: 'GT', label: 'Guatemala' },
  { value: 'GN', label: 'Guinea' },
  { value: 'GW', label: 'Guinea-Bissau' },
  { value: 'GY', label: 'Guyana' },
  { value: 'HT', label: 'Haiti' },
  { value: 'HN', label: 'Honduras' },
  { value: 'HU', label: 'Hungary' },
  { value: 'IS', label: 'Iceland' },
  { value: 'IN', label: 'India' },
  { value: 'ID', label: 'Indonesia' },
  { value: 'IR', label: 'Iran' },
  { value: 'IQ', label: 'Iraq' },
  { value: 'IE', label: 'Ireland' },
  { value: 'IT', label: 'Italy' },
  { value: 'CI', label: 'Ivory Coast' },
  { value: 'JM', label: 'Jamaica' },
  { value: 'JP', label: 'Japan' },
  { value: 'JO', label: 'Jordan' },
  { value: 'KZ', label: 'Kazakhstan' },
  { value: 'KE', label: 'Kenya' },
  { value: 'KI', label: 'Kiribati' },
  { value: 'KP', label: 'Korea (North)' },
  { value: 'KR', label: 'Korea (South)' },
  { value: 'KW', label: 'Kuwait' },
  { value: 'KG', label: 'Kyrgyzstan' },
  { value: 'LA', label: 'Laos' },
  { value: 'LV', label: 'Latvia' },
  { value: 'LB', label: 'Lebanon' },
  { value: 'LS', label: 'Lesotho' },
  { value: 'LR', label: 'Liberia' },
  { value: 'LY', label: 'Libya' },
  { value: 'LI', label: 'Liechtenstein' },
  { value: 'LT', label: 'Lithuania' },
  { value: 'LU', label: 'Luxembourg' },
  { value: 'MG', label: 'Madagascar' },
  { value: 'MW', label: 'Malawi' },
  { value: 'MY', label: 'Malaysia' },
  { value: 'MV', label: 'Maldives' },
  { value: 'ML', label: 'Mali' },
  { value: 'MT', label: 'Malta' },
  { value: 'MH', label: 'Marshall Islands' },
  { value: 'MR', label: 'Mauritania' },
  { value: 'MU', label: 'Mauritius' },
  { value: 'MX', label: 'Mexico' },
  { value: 'FM', label: 'Micronesia' },
  { value: 'MD', label: 'Moldova' },
  { value: 'MC', label: 'Monaco' },
  { value: 'MN', label: 'Mongolia' },
  { value: 'ME', label: 'Montenegro' },
  { value: 'MA', label: 'Morocco' },
  { value: 'MZ', label: 'Mozambique' },
  { value: 'MM', label: 'Myanmar' },
  { value: 'NA', label: 'Namibia' },
  { value: 'NR', label: 'Nauru' },
  { value: 'NP', label: 'Nepal' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'NI', label: 'Nicaragua' },
  { value: 'NE', label: 'Niger' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'MK', label: 'North Macedonia' },
  { value: 'NO', label: 'Norway' },
  { value: 'OM', label: 'Oman' },
  { value: 'PK', label: 'Pakistan' },
  { value: 'PW', label: 'Palau' },
  { value: 'PS', label: 'Palestine' },
  { value: 'PA', label: 'Panama' },
  { value: 'PG', label: 'Papua New Guinea' },
  { value: 'PY', label: 'Paraguay' },
  { value: 'PE', label: 'Peru' },
  { value: 'PH', label: 'Philippines' },
  { value: 'PL', label: 'Poland' },
  { value: 'PT', label: 'Portugal' },
  { value: 'QA', label: 'Qatar' },
  { value: 'RO', label: 'Romania' },
  { value: 'RU', label: 'Russia' },
  { value: 'RW', label: 'Rwanda' },
  { value: 'KN', label: 'Saint Kitts and Nevis' },
  { value: 'LC', label: 'Saint Lucia' },
  { value: 'VC', label: 'Saint Vincent and the Grenadines' },
  { value: 'WS', label: 'Samoa' },
  { value: 'SM', label: 'San Marino' },
  { value: 'ST', label: 'Sao Tome and Principe' },
  { value: 'SA', label: 'Saudi Arabia' },
  { value: 'SN', label: 'Senegal' },
  { value: 'RS', label: 'Serbia' },
  { value: 'SC', label: 'Seychelles' },
  { value: 'SL', label: 'Sierra Leone' },
  { value: 'SG', label: 'Singapore' },
  { value: 'SK', label: 'Slovakia' },
  { value: 'SI', label: 'Slovenia' },
  { value: 'SB', label: 'Solomon Islands' },
  { value: 'SO', label: 'Somalia' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'SS', label: 'South Sudan' },
  { value: 'ES', label: 'Spain' },
  { value: 'LK', label: 'Sri Lanka' },
  { value: 'SD', label: 'Sudan' },
  { value: 'SR', label: 'Suriname' },
  { value: 'SE', label: 'Sweden' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'SY', label: 'Syria' },
  { value: 'TW', label: 'Taiwan' },
  { value: 'TJ', label: 'Tajikistan' },
  { value: 'TZ', label: 'Tanzania' },
  { value: 'TH', label: 'Thailand' },
  { value: 'TL', label: 'Timor-Leste' },
  { value: 'TG', label: 'Togo' },
  { value: 'TO', label: 'Tonga' },
  { value: 'TT', label: 'Trinidad and Tobago' },
  { value: 'TN', label: 'Tunisia' },
  { value: 'TR', label: 'Turkey' },
  { value: 'TM', label: 'Turkmenistan' },
  { value: 'TV', label: 'Tuvalu' },
  { value: 'UG', label: 'Uganda' },
  { value: 'UA', label: 'Ukraine' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'UY', label: 'Uruguay' },
  { value: 'UZ', label: 'Uzbekistan' },
  { value: 'VU', label: 'Vanuatu' },
  { value: 'VA', label: 'Vatican City' },
  { value: 'VE', label: 'Venezuela' },
  { value: 'VN', label: 'Vietnam' },
  { value: 'YE', label: 'Yemen' },
  { value: 'ZM', label: 'Zambia' },
  { value: 'ZW', label: 'Zimbabwe' },
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

  // Convert Google Cloud Storage upload URL to object storage path
  const convertUploadURLToObjectPath = (uploadURL: string): string => {
    try {
      // Extract the object path from the Google Cloud Storage URL
      const url = new URL(uploadURL);
      const pathParts = url.pathname.split('/');
      // Remove empty first element and bucket name to get the object path
      const objectPath = pathParts.slice(2).join('/');
      console.log('Converting URL:', uploadURL, 'to path:', objectPath);
      // Return as objects path that our API can serve (without .private prefix in URL)
      const cleanPath = objectPath.replace('.private/uploads/', 'uploads/');
      return `/api/objects/${cleanPath}`;
    } catch (error) {
      console.error('Error converting upload URL:', error);
      return uploadURL; // Fallback to original URL
    }
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
                        <div onClick={(e) => e.stopPropagation()}>
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
                              console.log('Upload complete:', result);
                              if (result.successful && result.successful.length > 0) {
                                const uploadedFile = result.successful[0];
                                const uploadURL = uploadedFile.uploadURL;
                                if (uploadURL) {
                                  // Convert the upload URL to object storage path
                                  const objectPath = convertUploadURLToObjectPath(uploadURL);
                                  handleInputChange('logoUrl', objectPath);
                                  toast({
                                    title: 'Success',
                                    description: 'Logo uploaded successfully',
                                  });
                                }
                              }
                            }}
                            buttonClassName="w-full"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload New Logo
                          </ObjectUploader>
                        </div>
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
                      <Select 
                        value={formData.addressCountry || ''} 
                        onValueChange={(value) => handleInputChange('addressCountry', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {countries.map(country => (
                            <SelectItem key={country.value} value={country.label}>
                              {country.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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