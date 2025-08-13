import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Edit3, 
  Save, 
  X, 
  Building2, 
  Mail, 
  Globe, 
  MapPin,
  AlertCircle,
  CheckCircle,
  Upload
} from "lucide-react";

interface Supplier {
  id: string;
  supplierName: string;
  supplierCategory: string;
  website?: string;
  contactEmail?: string;
  description?: string;
  addressStreet?: string;
  addressCity?: string;
  addressPostalCode?: string;
  addressCountry?: string;
  logoUrl?: string;
  location?: string;
  verificationStatus: 'verified' | 'pending_review' | 'client_provided';
  submittedBy: 'ADMIN' | 'SUPPLIER' | 'CLIENT';
  submittedByUserId?: string;
  submittedByCompanyId?: string;
  createdAt: string;
  updatedAt: string;
}

interface SupplierEditDialogProps {
  supplier: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
}

const SUPPLIER_CATEGORIES = [
  { value: "bottle_producer", label: "Bottle Producer" },
  { value: "cap_closure_producer", label: "Cap & Closure Producer" },
  { value: "label_producer", label: "Label Producer" },
  { value: "ingredient_supplier", label: "Ingredient Supplier" },
  { value: "packaging_supplier", label: "Packaging Supplier" },
  { value: "contract_distillery", label: "Contract Distillery" },
  { value: "logistics_provider", label: "Logistics Provider" },
  { value: "other", label: "Other" },
];

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", 
  "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", 
  "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", 
  "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", 
  "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", 
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", 
  "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", 
  "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", 
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", 
  "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", 
  "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", 
  "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", 
  "India", "Indonesia", "Iran", "Iraq", "Ireland", "Italy", "Jamaica", 
  "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", 
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", 
  "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", 
  "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", 
  "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", 
  "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", 
  "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", 
  "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", 
  "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", 
  "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", 
  "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", 
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", 
  "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", 
  "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", 
  "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", 
  "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", 
  "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", 
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", 
  "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const VERIFICATION_STATUSES = [
  { value: 'verified', label: 'Verified', color: 'bg-green-100 text-green-800' },
  { value: 'pending_review', label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'client_provided', label: 'Client Provided', color: 'bg-blue-100 text-blue-800' },
];

export default function SupplierEditDialog({ supplier, isOpen, onClose }: SupplierEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<Partial<Supplier>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");

  // Initialize form when supplier changes
  useEffect(() => {
    if (supplier) {
      setFormData({
        supplierName: supplier.supplierName,
        supplierCategory: supplier.supplierCategory,
        website: supplier.website || '',
        contactEmail: supplier.contactEmail || '',
        description: supplier.description || '',
        addressStreet: supplier.addressStreet || '',
        addressCity: supplier.addressCity || '',
        addressPostalCode: supplier.addressPostalCode || '',
        addressCountry: supplier.addressCountry || '',
        logoUrl: supplier.logoUrl || '',
        verificationStatus: supplier.verificationStatus,
      });
      setLogoUrl(supplier.logoUrl || '');
      setHasChanges(false);
    }
  }, [supplier]);

  const updateSupplierMutation = useMutation({
    mutationFn: async (data: Partial<Supplier>) => {
      const updateData = {
        ...data,
        logoUrl: logoUrl || data.logoUrl
      };
      const response = await apiRequest("PUT", `/api/admin/suppliers/${supplier?.id}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/verified-suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      toast({
        title: "Supplier updated successfully",
        description: "The supplier information has been saved.",
      });
      onClose();
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update supplier",
        description: error.message || "An error occurred while updating the supplier.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof Supplier, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleLogoUpload = async (urls: string[]) => {
    if (urls.length > 0) {
      setLogoUrl(urls[0]);
      setHasChanges(true);
    }
  };

  const handleSave = () => {
    if (!supplier || (!hasChanges && !logoUrl)) return;
    updateSupplierMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (supplier) {
      setFormData({
        supplierName: supplier.supplierName,
        supplierCategory: supplier.supplierCategory,
        website: supplier.website || '',
        contactEmail: supplier.contactEmail || '',
        description: supplier.description || '',
        addressStreet: supplier.addressStreet || '',
        addressCity: supplier.addressCity || '',
        addressPostalCode: supplier.addressPostalCode || '',
        addressCountry: supplier.addressCountry || '',
        logoUrl: supplier.logoUrl || '',
        verificationStatus: supplier.verificationStatus,
      });
      setLogoUrl(supplier.logoUrl || '');
    }
    setHasChanges(false);
    onClose();
  };

  if (!supplier) return null;

  const getStatusBadge = (status: string) => {
    const statusConfig = VERIFICATION_STATUSES.find(s => s.value === status);
    return statusConfig ? (
      <Badge className={statusConfig.color}>
        {statusConfig.label}
      </Badge>
    ) : (
      <Badge variant="secondary">{status}</Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="bg-white border border-gray-200 shadow-xl max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Edit Supplier: {supplier.supplierName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status and metadata */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              <div>
                <Label className="text-xs text-gray-500">Status</Label>
                <div>{getStatusBadge(supplier.verificationStatus)}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Submitted By</Label>
                <div className="text-sm font-medium">{supplier.submittedBy}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Created</Label>
                <div className="text-sm">{new Date(supplier.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          {hasChanges && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have unsaved changes. Click "Save Changes" to update the supplier.
              </AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplierName">Supplier Name *</Label>
                <Input
                  id="supplierName"
                  value={formData.supplierName || ''}
                  onChange={(e) => handleInputChange('supplierName', e.target.value)}
                  placeholder="Enter supplier company name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplierCategory">Supplier Category *</Label>
                <Select
                  value={formData.supplierCategory || ''}
                  onValueChange={(value) => handleInputChange('supplierCategory', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier category" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPLIER_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of the supplier and their services..."
                rows={3}
              />
            </div>

            {/* Supplier Logo Upload */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Supplier Logo
              </Label>
              <div className="flex items-center gap-4">
                {(logoUrl || formData.logoUrl) && (
                  <div className="relative">
                    <img 
                      src={logoUrl || formData.logoUrl} 
                      alt="Supplier Logo" 
                      className="w-20 h-20 object-contain border border-gray-200 rounded"
                    />
                  </div>
                )}
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={5 * 1024 * 1024} // 5MB
                  onGetUploadParameters={async () => {
                    const response = await apiRequest("POST", "/api/objects/upload");
                    const data = await response.json();
                    return {
                      method: "PUT" as const,
                      url: data.uploadURL,
                    };
                  }}
                  onComplete={(result) => {
                    if (result.successful && result.successful.length > 0) {
                      const uploadURL = result.successful[0].uploadURL;
                      if (uploadURL) {
                        console.log("Upload successful, URLs:", [uploadURL]);
                        handleLogoUpload([uploadURL]);
                      }
                    }
                  }}
                  buttonClassName="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Upload New Logo
                </ObjectUploader>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website || ''}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://www.example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail || ''}
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  placeholder="contact@supplier.com"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Address Information
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="addressStreet">Street Address *</Label>
                <Input
                  id="addressStreet"
                  value={formData.addressStreet || ''}
                  onChange={(e) => handleInputChange('addressStreet', e.target.value)}
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.addressCity || ''}
                    onChange={(e) => handleInputChange('addressCity', e.target.value)}
                    placeholder="City"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code *</Label>
                  <Input
                    id="postalCode"
                    value={formData.addressPostalCode || ''}
                    onChange={(e) => handleInputChange('addressPostalCode', e.target.value)}
                    placeholder="Postal code"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressCountry">Country *</Label>
                  <Select
                    value={formData.addressCountry || ''}
                    onValueChange={(value) => handleInputChange('addressCountry', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Status - Admin Only */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Verification Status
            </h3>
            <div className="space-y-2">
              <Label htmlFor="verificationStatus">Status</Label>
              <Select
                value={formData.verificationStatus || ''}
                onValueChange={(value) => handleInputChange('verificationStatus', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {VERIFICATION_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertCircle className="w-4 h-4" />
            Last updated: {new Date(supplier.updatedAt).toLocaleString()}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={updateSupplierMutation.isPending}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={(!hasChanges && !logoUrl) || updateSupplierMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateSupplierMutation.isPending ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}