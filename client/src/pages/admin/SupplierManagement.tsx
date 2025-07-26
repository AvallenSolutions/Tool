import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Eye, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Building2, 
  Mail,
  Globe,
  MapPin,
  User,
  Calendar,
  Edit,
  Trash2,
  Plus
} from "lucide-react";

interface SupplierWithDetails {
  id: number;
  supplierName: string;
  supplierCategory: string;
  verificationStatus: 'verified' | 'pending_review' | 'client_provided';
  website?: string;
  contactEmail?: string;
  description?: string;
  addressCountry?: string;
  submittedBy?: string;
  submittedByCompanyId?: number;
  createdAt: string;
  submitterEmail?: string;
  submitterName?: string;
  companyName?: string;
}

export default function SupplierManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierWithDetails | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<SupplierWithDetails | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<SupplierWithDetails | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const { data: supplierResponse, isLoading } = useQuery<{success: boolean, data: SupplierWithDetails[]}>({
    queryKey: ['/api/admin/suppliers'],
    refetchInterval: 30000,
  });

  const suppliers = supplierResponse?.data || [];

  const verifySupplierMutation = useMutation({
    mutationFn: (supplierId: number) => 
      apiRequest(`/api/admin/suppliers/${supplierId}/verify`, 'PUT'),
    onSuccess: () => {
      toast({
        title: "Supplier Verified",
        description: "Supplier has been successfully verified.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
      setSelectedSupplier(null);
    },
    onError: (error) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify supplier.",
        variant: "destructive",
      });
    },
  });

  // Edit supplier mutation
  const editSupplierMutation = useMutation({
    mutationFn: (data: { id: number; supplierData: Partial<SupplierWithDetails> }) => 
      apiRequest(`/api/admin/suppliers/${data.id}`, 'PUT', data.supplierData),
    onSuccess: () => {
      toast({
        title: "Supplier Updated",
        description: "Supplier information has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers'] });
      setEditingSupplier(null);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update supplier.",
        variant: "destructive",
      });
    },
  });

  // Delete supplier mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: (supplierId: number) => 
      apiRequest(`/api/admin/suppliers/${supplierId}`, 'DELETE'),
    onSuccess: () => {
      toast({
        title: "Supplier Deleted",
        description: "Supplier and all associated products have been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/supplier-products'] });
      setDeletingSupplier(null);
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete supplier.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Verified</Badge>;
      case 'pending_review':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Pending Review</Badge>;
      case 'client_provided':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Client Provided</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending_review':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'client_provided':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredSuppliers = suppliers?.filter(supplier => {
    const matchesStatus = statusFilter === 'all' || supplier.verificationStatus === statusFilter;
    const matchesSearch = !searchFilter || 
      supplier.supplierName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      supplier.supplierCategory.toLowerCase().includes(searchFilter.toLowerCase()) ||
      supplier.addressCountry?.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  const pendingCount = suppliers?.filter(s => s.verificationStatus === 'pending_review').length || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Supplier Management</h1>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header 
            title="Supplier Management" 
            subtitle="Review and verify supplier data submissions"
          />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Supplier Management</h1>
                <p className="text-muted-foreground">
                  Review and verify supplier data submissions
                </p>
              </div>
              <Badge variant={pendingCount > 0 ? "destructive" : "secondary"}>
                {pendingCount} pending review
              </Badge>
            </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Input
                placeholder="Search suppliers by name, category, or country..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="client_provided">Client Provided</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers List */}
      <div className="space-y-4">
        {filteredSuppliers.map((supplier) => (
          <Card key={supplier.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(supplier.verificationStatus)}
                      <h3 className="text-lg font-semibold">{supplier.supplierName}</h3>
                    </div>
                    {getStatusBadge(supplier.verificationStatus)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{supplier.supplierCategory}</span>
                    </div>
                    
                    {supplier.addressCountry && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{supplier.addressCountry}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Added {new Date(supplier.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {supplier.submitterName && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>
                          Submitted by {supplier.submitterName}
                          {supplier.companyName && ` (${supplier.companyName})`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedSupplier(supplier)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          {selectedSupplier?.supplierName}
                        </DialogTitle>
                      </DialogHeader>
                      
                      {selectedSupplier && (
                        <div className="space-y-6">
                          {/* Status and Basic Info */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Status</label>
                              <div className="mt-1">
                                {getStatusBadge(selectedSupplier.verificationStatus)}
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Category</label>
                              <p className="mt-1 text-sm">{selectedSupplier.supplierCategory}</p>
                            </div>
                          </div>

                          {/* Contact Information */}
                          <div className="space-y-3">
                            <h4 className="font-medium">Contact Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {selectedSupplier.contactEmail && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{selectedSupplier.contactEmail}</span>
                                </div>
                              )}
                              {selectedSupplier.website && (
                                <div className="flex items-center gap-2">
                                  <Globe className="h-4 w-4 text-muted-foreground" />
                                  <a 
                                    href={selectedSupplier.website} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline"
                                  >
                                    {selectedSupplier.website}
                                  </a>
                                </div>
                              )}
                              {selectedSupplier.addressCountry && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{selectedSupplier.addressCountry}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Description */}
                          {selectedSupplier.description && (
                            <div>
                              <h4 className="font-medium mb-2">Description</h4>
                              <p className="text-sm text-muted-foreground">
                                {selectedSupplier.description}
                              </p>
                            </div>
                          )}

                          {/* Submission Info */}
                          <div className="border-t pt-4">
                            <h4 className="font-medium mb-2">Submission Details</h4>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div>Added: {new Date(selectedSupplier.createdAt).toLocaleString()}</div>
                              {selectedSupplier.submitterName && (
                                <div>
                                  Submitted by: {selectedSupplier.submitterName}
                                  {selectedSupplier.companyName && ` (${selectedSupplier.companyName})`}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          {selectedSupplier.verificationStatus === 'pending_review' && (
                            <div className="flex justify-end gap-2 border-t pt-4">
                              <Button
                                onClick={() => verifySupplierMutation.mutate(selectedSupplier.id)}
                                disabled={verifySupplierMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                {verifySupplierMutation.isPending ? 'Verifying...' : 'Approve Supplier'}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingSupplier(supplier)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletingSupplier(supplier)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>

                  {supplier.verificationStatus === 'pending_review' && (
                    <Button
                      size="sm"
                      onClick={() => verifySupplierMutation.mutate(supplier.id)}
                      disabled={verifySupplierMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {verifySupplierMutation.isPending ? 'Verifying...' : 'Verify'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredSuppliers.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No suppliers found</h3>
              <p className="text-muted-foreground">
                {statusFilter === 'all' 
                  ? "No suppliers match your search criteria."
                  : `No suppliers with status "${statusFilter}" found.`
                }
              </p>
            </CardContent>
          </Card>
        )}
            </div>
          </div>
        </main>
      </div>
    </div>

    {/* Edit Supplier Dialog */}
    {editingSupplier && (
      <Dialog open={!!editingSupplier} onOpenChange={() => setEditingSupplier(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Supplier Name</Label>
                <Input
                  value={editingSupplier.supplierName}
                  onChange={(e) => setEditingSupplier({
                    ...editingSupplier,
                    supplierName: e.target.value
                  })}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select 
                  value={editingSupplier.supplierCategory} 
                  onValueChange={(value) => setEditingSupplier({
                    ...editingSupplier,
                    supplierCategory: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottle_producer">Bottle Producer</SelectItem>
                    <SelectItem value="cap_closure_producer">Cap & Closure Producer</SelectItem>
                    <SelectItem value="label_producer">Label Producer</SelectItem>
                    <SelectItem value="ingredient_supplier">Ingredient Supplier</SelectItem>
                    <SelectItem value="packaging_supplier">Packaging Supplier</SelectItem>
                    <SelectItem value="contract_distillery">Contract Distillery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editingSupplier.description || ''}
                onChange={(e) => setEditingSupplier({
                  ...editingSupplier,
                  description: e.target.value
                })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Website</Label>
                <Input
                  value={editingSupplier.website || ''}
                  onChange={(e) => setEditingSupplier({
                    ...editingSupplier,
                    website: e.target.value
                  })}
                />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input
                  value={editingSupplier.contactEmail || ''}
                  onChange={(e) => setEditingSupplier({
                    ...editingSupplier,
                    contactEmail: e.target.value
                  })}
                />
              </div>
            </div>
            <div>
              <Label>Country</Label>
              <Input
                value={editingSupplier.addressCountry || ''}
                onChange={(e) => setEditingSupplier({
                  ...editingSupplier,
                  addressCountry: e.target.value
                })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingSupplier(null)}>
                Cancel
              </Button>
              <Button 
                onClick={() => editSupplierMutation.mutate({
                  id: editingSupplier.id,
                  supplierData: editingSupplier
                })}
                disabled={editSupplierMutation.isPending}
              >
                {editSupplierMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )}

    {/* Delete Supplier Dialog */}
    {deletingSupplier && (
      <Dialog open={!!deletingSupplier} onOpenChange={() => setDeletingSupplier(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to delete <strong>{deletingSupplier.supplierName}</strong>? 
              This action cannot be undone and will also remove all associated products.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeletingSupplier(null)}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => deleteSupplierMutation.mutate(deletingSupplier.id)}
                disabled={deleteSupplierMutation.isPending}
              >
                {deleteSupplierMutation.isPending ? 'Deleting...' : 'Delete Supplier'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}