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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const { data: supplierResponse, isLoading, error } = useQuery<{success: boolean, data: SupplierWithDetails[]}>({
    queryKey: ['/api/admin/suppliers'],
    refetchInterval: 30000,
  });

  const suppliers = supplierResponse?.data || [];

  const filteredSuppliers = suppliers?.filter(supplier => {
    const matchesStatus = statusFilter === 'all' || supplier.verificationStatus === statusFilter;
    const matchesSearch = !searchFilter || 
      supplier.supplierName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      supplier.supplierCategory.toLowerCase().includes(searchFilter.toLowerCase()) ||
      supplier.addressCountry?.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

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

            {/* Suppliers List */}
            <div className="space-y-4">
              {filteredSuppliers.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No suppliers found</h3>
                    <p className="text-gray-500">
                      {suppliers.length === 0 
                        ? "No suppliers have been added yet. Start by adding your first supplier."
                        : "No suppliers match your current filters. Try adjusting your search criteria."
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {filteredSuppliers.map((supplier) => (
                    <Card key={supplier.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              {getStatusIcon(supplier.verificationStatus)}
                              <h3 className="text-xl font-semibold text-gray-900">
                                {supplier.supplierName}
                              </h3>
                              {getStatusBadge(supplier.verificationStatus)}
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4" />
                                  <span>Category: {supplier.supplierCategory}</span>
                                </div>
                                {supplier.addressCountry && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    <span>Country: {supplier.addressCountry}</span>
                                  </div>
                                )}
                                {supplier.contactEmail && (
                                  <div className="flex items-center gap-2">
                                    <span>Email: {supplier.contactEmail}</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>Added: {new Date(supplier.createdAt).toLocaleDateString()}</span>
                                </div>
                                {supplier.website && (
                                  <div className="flex items-center gap-2">
                                    <span>Website: {supplier.website}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {supplier.description && (
                              <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                                {supplier.description}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex gap-2 ml-6">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}