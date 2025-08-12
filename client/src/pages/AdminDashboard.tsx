import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Building2, Package, CheckCircle, Clock, Eye, Users, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import SupplierEditDialog from '@/components/admin/SupplierEditDialog';
import BulkImportDialog from '@/components/admin/BulkImportDialog';
import SupplierProductsTable from '@/components/admin/SupplierProductsTable';

const supplierCategories = [
  { value: 'bottle_producer', label: 'Bottle Producer' },
  { value: 'cap_closure_producer', label: 'Cap & Closure Producer' },
  { value: 'label_producer', label: 'Label Producer' },
  { value: 'ingredient_supplier', label: 'Ingredient Supplier' },
  { value: 'packaging_supplier', label: 'Packaging Supplier' },
  { value: 'logistics_provider', label: 'Logistics Provider' },
  { value: 'other', label: 'Other' },
];

export default function AdminDashboard() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [selectedSupplierForEdit, setSelectedSupplierForEdit] = useState(null);
  const [newSupplier, setNewSupplier] = useState({
    supplierName: '',
    supplierCategory: '',
    website: '',
    contactEmail: '',
    description: '',
    addressStreet: '',
    addressCity: '',
    addressCountry: '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch suppliers for management
  const { data: suppliersData, isLoading: suppliersLoading } = useQuery({
    queryKey: ['/api/admin/suppliers'],
  });

  // Mock data for Phase 2 development - will be replaced with real API calls
  const mockStats = {
    verifiedSuppliers: 12,
    pendingReview: 3,
    clientProvided: 8,
    totalProducts: 45,
    productsWithLCA: 28,
  };

  const mockRecentActivity = [
    {
      id: 1,
      supplierName: 'EcoGlass Solutions',
      category: 'bottle_producer',
      status: 'verified',
      submittedBy: 'ADMIN',
      createdAt: '2025-01-20',
    },
    {
      id: 2,
      supplierName: 'Green Cap Manufacturing',
      category: 'cap_closure_producer',
      status: 'pending_review',
      submittedBy: 'SUPPLIER',
      createdAt: '2025-01-19',
    },
    {
      id: 3,
      supplierName: 'Sustainable Labels Ltd',
      category: 'label_producer',
      status: 'verified',
      submittedBy: 'CLIENT',
      createdAt: '2025-01-18',
    },
  ];

  const handleAddSupplier = () => {
    if (!newSupplier.supplierName || !newSupplier.supplierCategory) {
      toast({
        title: 'Validation Error',
        description: 'Supplier name and category are required',
        variant: 'destructive',
      });
      return;
    }

    // For Phase 2 development - simulate API call
    toast({
      title: 'Feature Coming Soon',
      description: 'Admin supplier submission will be available when the API routes are fully integrated',
    });

    setIsAddSupplierOpen(false);
    setNewSupplier({
      supplierName: '',
      supplierCategory: '',
      website: '',
      contactEmail: '',
      description: '',
      addressStreet: '',
      addressCity: '',
      addressCountry: '',
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'verified') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verified
        </span>
      );
    } else if (status === 'pending_review') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
          <Clock className="w-3 h-3 mr-1" />
          Pending Review
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
          <Building2 className="w-3 h-3 mr-1" />
          Client Provided
        </span>
      );
    }
  };

  const getSubmissionBadge = (submittedBy: string) => {
    const colors = {
      ADMIN: 'bg-purple-100 text-purple-800 border-purple-300',
      SUPPLIER: 'bg-blue-100 text-blue-800 border-blue-300',
      CLIENT: 'bg-orange-100 text-orange-800 border-orange-300',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[submittedBy as keyof typeof colors]}`}>
        {submittedBy}
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Admin Dashboard" subtitle="Manage the verified supplier network" />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-2">Manage the verified supplier network</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsBulkImportOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Package className="w-4 h-4 mr-2" />
                Bulk Import
              </Button>
              <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Verified Supplier
                  </Button>
                </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Verified Supplier</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
                  placeholder="Brief description of the supplier"
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

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddSupplierOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddSupplier}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Add Supplier
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
            </div>
          </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Verified Suppliers</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{mockStats.verifiedSuppliers}</div>
                <p className="text-xs text-muted-foreground">Active in network</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{mockStats.pendingReview}</div>
                <p className="text-xs text-muted-foreground">Awaiting verification</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Client Provided</CardTitle>
                <Building2 className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{mockStats.clientProvided}</div>
                <p className="text-xs text-muted-foreground">Company-specific</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{mockStats.totalProducts}</div>
                <p className="text-xs text-muted-foreground">{mockStats.productsWithLCA} with LCA data</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Network Growth</CardTitle>
                <TrendingUp className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">+18%</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest supplier submissions and verifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockRecentActivity.map((supplier) => (
                  <div key={supplier.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{supplier.supplierName}</p>
                        <p className="text-sm text-gray-600">{supplier.category.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(supplier.status)}
                      {getSubmissionBadge(supplier.submittedBy)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Suppliers ({suppliersData?.data?.length || 0})</CardTitle>
              <CardDescription>Manage and verify suppliers in the network</CardDescription>
            </CardHeader>
            <CardContent>
              {suppliersLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Loading suppliers...
                </div>
              ) : suppliersData?.data?.length > 0 ? (
                <div className="space-y-4">
                  {suppliersData.data.map((supplier: any) => (
                    <div key={supplier.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{supplier.supplierName}</h3>
                          {getStatusBadge(supplier.verificationStatus)}
                          {getSubmissionBadge(supplier.submittedBy)}
                        </div>
                        <p className="text-sm text-gray-600">{supplier.supplierCategory}</p>
                        <p className="text-xs text-gray-500">Created: {new Date(supplier.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedSupplierForEdit(supplier)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <Building2 className="h-4 w-4" />
                  <AlertDescription>
                    No suppliers found. Use the "Add Verified Supplier" button or "Bulk Import" to add suppliers to the network.
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
              <CardDescription>Products created through the supplier network</CardDescription>
            </CardHeader>
            <CardContent>
              <SupplierProductsTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Review</CardTitle>
              <CardDescription>Suppliers and products awaiting verification</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>Phase 2 Implementation:</strong> Pending review interface will enable efficient 
                  verification workflows with bulk actions, detailed review forms, and automated notifications.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Dialogs */}
      <SupplierEditDialog
        supplier={selectedSupplierForEdit}
        isOpen={!!selectedSupplierForEdit}
        onClose={() => setSelectedSupplierForEdit(null)}
      />
      
      <BulkImportDialog
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
      />
    </div>
  );
}