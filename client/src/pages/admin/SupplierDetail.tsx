import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { ArrowLeft, Building2, MapPin, Globe, Mail, Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { SupplierLogo } from '@/components/SupplierLogo';

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

export default function SupplierDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();

  const { data: supplierResponse, isLoading, error } = useQuery<{success: boolean, data: SupplierDetails}>({
    queryKey: [`/api/admin/suppliers/${id}`],
    enabled: !!id,
  });

  const supplier = supplierResponse?.data;

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
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending_review':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case 'client_provided':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Supplier Details" subtitle="Loading..." />
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

  if (error || !supplier) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Supplier Details" subtitle="Error loading supplier" />
          <main className="flex-1 p-6">
            <Card>
              <CardContent className="p-12 text-center">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Supplier not found</h3>
                <p className="text-gray-500 mb-4">The supplier you're looking for doesn't exist or has been removed.</p>
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
          title="Supplier Details" 
          subtitle={supplier.supplierName}
        />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                onClick={() => navigate('/app/admin/suppliers')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Suppliers
              </Button>
              <Button 
                onClick={() => navigate(`/app/admin/suppliers/${supplier.id}/edit`)}
                className="bg-green-600 hover:bg-green-700"
              >
                Edit Supplier
              </Button>
            </div>

            {/* Main Details Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <SupplierLogo 
                      logoUrl={supplier.logoUrl} 
                      supplierName={supplier.supplierName}
                      size="lg"
                    />
                    <div className="flex items-center gap-3">
                      {getStatusIcon(supplier.verificationStatus)}
                      <CardTitle className="text-2xl">{supplier.supplierName}</CardTitle>
                    </div>
                  </div>
                  {getStatusBadge(supplier.verificationStatus)}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Basic Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">Category:</span>
                          <span>{supplier.supplierCategory}</span>
                        </div>
                        {supplier.contactEmail && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">Email:</span>
                            <a href={`mailto:${supplier.contactEmail}`} className="text-blue-600 hover:underline">
                              {supplier.contactEmail}
                            </a>
                          </div>
                        )}
                        {supplier.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">Website:</span>
                            <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {supplier.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {(supplier.addressStreet || supplier.addressCity || supplier.addressCountry) && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Address</h3>
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                          <div>
                            {supplier.addressStreet && <div>{supplier.addressStreet}</div>}
                            {supplier.addressCity && <div>{supplier.addressCity} {supplier.addressPostalCode}</div>}
                            {supplier.addressCountry && <div>{supplier.addressCountry}</div>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">System Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">Added:</span>
                          <span>{new Date(supplier.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">Last Updated:</span>
                          <span>{new Date(supplier.updatedAt).toLocaleDateString()}</span>
                        </div>
                        {supplier.submittedBy && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Submitted By:</span>
                            <span>{supplier.submittedBy}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {supplier.description && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {supplier.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}