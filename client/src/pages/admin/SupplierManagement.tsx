import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Building2, 
  MapPin,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Plus
} from "lucide-react";
import { useLocation } from "wouter";

interface SupplierWithDetails {
  id: string;
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
  console.log('🚀 SupplierManagement component mounted!');
  console.log('🚀 Current URL:', window.location.pathname);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const { data: supplierResponse, isLoading, error } = useQuery<{success: boolean, data: SupplierWithDetails[]}>({
    queryKey: ['/api/admin/suppliers'],
    refetchInterval: 30000,
  });

  // Debug logging
  console.log('🚀 SupplierManagement - Component mounted and query initiated');
  console.log('🚀 Supplier query - loading:', isLoading, 'error:', error, 'data:', supplierResponse);
  console.log('🚀 Full response structure:', supplierResponse);

  const suppliers = supplierResponse?.data || [];
  console.log('Extracted suppliers array:', suppliers);
  console.log('Number of suppliers:', suppliers.length);

  const filteredSuppliers = suppliers?.filter(supplier => {
    const matchesStatus = statusFilter === 'all' || supplier.verificationStatus === statusFilter;
    const matchesSearch = !searchFilter || 
      supplier.supplierName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      supplier.supplierCategory.toLowerCase().includes(searchFilter.toLowerCase()) ||
      supplier.addressCountry?.toLowerCase().includes(searchFilter.toLowerCase());
    console.log(`Supplier ${supplier.supplierName}: status=${supplier.verificationStatus}, filter=${statusFilter}, matches=${matchesStatus && matchesSearch}`);
    return matchesStatus && matchesSearch;
  }) || [];

  console.log('Filtered suppliers:', filteredSuppliers);
  console.log('Number of filtered suppliers:', filteredSuppliers.length);

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

  const pendingCount = suppliers?.filter(s => s.verificationStatus === 'pending_review').length || 0;

  if (isLoading) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header 
            title="Supplier Management" 
            subtitle="Loading suppliers..."
          />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Loading...</h1>
              </div>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
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
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => navigate('/app/supplier-registration')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Supplier
                </Button>
                <Badge variant={pendingCount > 0 ? "destructive" : "secondary"}>
                  {pendingCount} pending review
                </Badge>
              </div>
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

            {/* Debug info */}
            <div className="bg-blue-100 p-4 rounded">
              <p className="font-bold">Debug Info:</p>
              <p>Loading: {isLoading ? 'YES' : 'NO'}</p>
              <p>Error: {error ? String(error) : 'NONE'}</p>
              <p>Raw response: {JSON.stringify(supplierResponse)}</p>
              <p>Suppliers array length: {suppliers.length}</p>
              <p>Filtered suppliers length: {filteredSuppliers.length}</p>
              <p>Status filter: {statusFilter}</p>
              <p>Search filter: {searchFilter}</p>
              {filteredSuppliers.map((s, i) => (
                <p key={i}>Supplier {i + 1}: {s.supplierName} (Status: {s.verificationStatus})</p>
              ))}
            </div>

            {/* Suppliers List */}
            <div className="space-y-4">
              {filteredSuppliers.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No suppliers found matching current filters.</p>
                    <p className="text-sm text-gray-500 mt-2">Total suppliers in database: {suppliers.length}</p>
                  </CardContent>
                </Card>
              ) : (
                filteredSuppliers.map((supplier) => {
                  console.log('Rendering supplier card for:', supplier.supplierName);
                  return (
                    <Card key={supplier.id} className="border-4 border-red-500 bg-yellow-200 shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(supplier.verificationStatus)}
                                <h3 className="text-xl font-bold text-black">{supplier.supplierName}</h3>
                              </div>
                              {getStatusBadge(supplier.verificationStatus)}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                <span><strong>Category:</strong> {supplier.supplierCategory}</span>
                              </div>
                              
                              {supplier.addressCountry && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  <span><strong>Country:</strong> {supplier.addressCountry}</span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span><strong>Added:</strong> {new Date(supplier.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              Review
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}