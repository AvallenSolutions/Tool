import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Mail, Clock, CheckCircle, Users } from "lucide-react";

export default function Suppliers() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactPerson: '',
    phone: '',
    address: '',
    supplierType: '',
  });

  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ["/api/suppliers"],
    retry: false,
  });

  const createSupplierMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/suppliers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setIsDialogOpen(false);
      setFormData({
        name: '',
        email: '',
        contactPerson: '',
        phone: '',
        address: '',
        supplierType: '',
      });
      toast({
        title: "Success",
        description: "Supplier invited successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create supplier",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-lightest-gray flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-avallen-green border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSupplierMutation.mutate(formData);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-success-green" />;
      case 'invited':
      case 'in_progress':
        return <Clock className="w-5 h-5 text-muted-gold" />;
      default:
        return <Mail className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success-green/20 text-success-green">Complete</Badge>;
      case 'invited':
        return <Badge className="bg-blue-100 text-blue-600">Invited</Badge>;
      case 'in_progress':
        return <Badge className="bg-muted-gold/20 text-muted-gold">In Progress</Badge>;
      default:
        return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Suppliers" subtitle="Manage your supplier data collection" />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="mb-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-avallen-green hover:bg-avallen-green-light text-white">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite New Supplier
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite New Supplier</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Company Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input
                      id="contactPerson"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplierType">Supplier Type</Label>
                    <Select value={formData.supplierType} onValueChange={(value) => setFormData({ ...formData, supplierType: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ingredient">Ingredient Supplier</SelectItem>
                        <SelectItem value="packaging">Packaging Supplier</SelectItem>
                        <SelectItem value="contract_manufacturer">Contract Manufacturer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createSupplierMutation.isPending}
                      className="bg-avallen-green hover:bg-avallen-green-light text-white"
                    >
                      {createSupplierMutation.isPending ? "Inviting..." : "Send Invitation"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {suppliersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-avallen-green border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="grid gap-6">
              {suppliers && suppliers.length > 0 ? (
                suppliers.map((supplier: any) => (
                  <Card key={supplier.id} className="border-light-gray">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(supplier.status)}
                          <div>
                            <CardTitle className="text-slate-gray">{supplier.name}</CardTitle>
                            <p className="text-sm text-gray-500">{supplier.email}</p>
                          </div>
                        </div>
                        {getStatusBadge(supplier.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <Label className="text-sm text-gray-600">Contact Person</Label>
                          <p className="font-medium text-slate-gray">{supplier.contactPerson || 'Not provided'}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Phone</Label>
                          <p className="font-medium text-slate-gray">{supplier.phone || 'Not provided'}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Supplier Type</Label>
                          <p className="font-medium text-slate-gray capitalize">{supplier.supplierType?.replace('_', ' ') || 'Not specified'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          {supplier.submittedAt ? `Submitted: ${new Date(supplier.submittedAt).toLocaleDateString()}` : 'Not submitted yet'}
                        </div>
                        <div className="flex space-x-2">
                          {supplier.status === 'not_started' && (
                            <Button size="sm" variant="outline" className="border-slate-gray text-slate-gray">
                              Resend Invitation
                            </Button>
                          )}
                          {supplier.status === 'completed' && (
                            <Button size="sm" className="bg-avallen-green hover:bg-avallen-green-light text-white">
                              View Data
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="border-light-gray">
                  <CardContent className="py-12 text-center">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-gray mb-2">No suppliers yet</h3>
                    <p className="text-gray-600 mb-4">
                      Invite your suppliers to start collecting Scope 3 emissions data.
                    </p>
                    <Button className="bg-avallen-green hover:bg-avallen-green-light text-white">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite First Supplier
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
