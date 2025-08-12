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
  CheckCircle
} from "lucide-react";

interface Supplier {
  id: string;
  supplierName: string;
  supplierCategory: string;
  website?: string;
  contactEmail?: string;
  description?: string;
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
  { value: 'bottle_producer', label: 'Bottle Producer' },
  { value: 'label_maker', label: 'Label Maker' },
  { value: 'closure_producer', label: 'Closure Producer' },
  { value: 'secondary_packaging', label: 'Secondary Packaging' },
  { value: 'ingredient_supplier', label: 'Ingredient Supplier' },
  { value: 'contract_distillery', label: 'Contract Distillery' },
  { value: 'general_supplier', label: 'General Supplier' },
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

  // Initialize form when supplier changes
  useEffect(() => {
    if (supplier) {
      setFormData({
        supplierName: supplier.supplierName,
        supplierCategory: supplier.supplierCategory,
        website: supplier.website || '',
        contactEmail: supplier.contactEmail || '',
        description: supplier.description || '',
        location: supplier.location || '',
        verificationStatus: supplier.verificationStatus,
      });
      setHasChanges(false);
    }
  }, [supplier]);

  const updateSupplierMutation = useMutation({
    mutationFn: async (data: Partial<Supplier>) => {
      const response = await apiRequest("PUT", `/api/admin/suppliers/${supplier?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/verified-suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers'] });
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

  const handleSave = () => {
    if (!supplier || !hasChanges) return;
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
        location: supplier.location || '',
        verificationStatus: supplier.verificationStatus,
      });
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

          {/* Edit form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplierName">Supplier Name *</Label>
              <Input
                id="supplierName"
                value={formData.supplierName || ''}
                onChange={(e) => handleInputChange('supplierName', e.target.value)}
                placeholder="Enter supplier name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplierCategory">Category *</Label>
              <Select
                value={formData.supplierCategory || ''}
                onValueChange={(value) => handleInputChange('supplierCategory', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
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
                placeholder="https://supplier-website.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail" className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                Contact Email
              </Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail || ''}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                placeholder="contact@supplier.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Location
              </Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="City, Country"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="verificationStatus">Verification Status</Label>
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

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of the supplier's products and services"
              rows={3}
            />
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
              disabled={!hasChanges || updateSupplierMutation.isPending}
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