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
                <div className="border-4 border-red-500 bg-yellow-200 p-8 rounded text-center">
                  <p className="text-black font-bold text-2xl">No suppliers found matching current filters.</p>
                  <p className="text-black font-bold text-lg mt-2">Total suppliers in database: {suppliers.length}</p>
                </div>
              ) : (
                <div>
                  <h2 className="text-3xl font-bold text-red-600 mb-4 bg-yellow-300 p-4 border-4 border-red-500">
                    FOUND {filteredSuppliers.length} SUPPLIER(S) - RENDERING NOW:
                  </h2>
                  {filteredSuppliers.map((supplier, index) => {
                    console.log(`🚀 Rendering supplier ${index + 1}:`, supplier.supplierName);
                    return (
                      <div 
                        key={supplier.id} 
                        className="border-8 border-red-600 bg-yellow-300 p-8 mb-6 rounded-lg shadow-2xl"
                        style={{
                          border: '8px solid red',
                          backgroundColor: 'yellow',
                          padding: '32px',
                          margin: '24px 0',
                          minHeight: '200px',
                          display: 'block',
                          visibility: 'visible',
                          position: 'relative',
                          zIndex: 9999
                        }}
                      >
                        <div className="bg-red-500 text-white p-4 mb-4 text-center">
                          <h1 className="text-4xl font-bold">SUPPLIER #{index + 1}</h1>
                        </div>
                        
                        <div className="bg-black text-yellow-300 p-6 rounded">
                          <h2 className="text-3xl font-bold mb-4">
                            🎯 SUPPLIER NAME: {supplier.supplierName}
                          </h2>
                          
                          <div className="text-xl space-y-2">
                            <p>🏢 <strong>Category:</strong> {supplier.supplierCategory}</p>
                            <p>🌍 <strong>Country:</strong> {supplier.addressCountry || 'Not specified'}</p>
                            <p>✅ <strong>Status:</strong> {supplier.verificationStatus}</p>
                            <p>📧 <strong>Email:</strong> {supplier.contactEmail || 'Not provided'}</p>
                            <p>🌐 <strong>Website:</strong> {supplier.website || 'Not provided'}</p>
                            <p>📅 <strong>Added:</strong> {new Date(supplier.createdAt).toLocaleDateString()}</p>
                          </div>
                          
                          <div className="mt-6 space-x-4">
                            <button className="bg-yellow-500 text-black px-6 py-3 rounded font-bold">
                              REVIEW SUPPLIER
                            </button>
                            <button className="bg-green-500 text-white px-6 py-3 rounded font-bold">
                              EDIT SUPPLIER
                            </button>
                            <button className="bg-red-600 text-white px-6 py-3 rounded font-bold">
                              DELETE SUPPLIER
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}