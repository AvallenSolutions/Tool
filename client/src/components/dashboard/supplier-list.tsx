import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Check, Clock, Mail, UserPlus } from "lucide-react";

export default function SupplierList() {
  const [, navigate] = useLocation();

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["/api/suppliers"],
    retry: false,
  });

  if (isLoading) {
    return (
      <Card className="border-light-gray">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-gray">
            Supplier Database
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
            <div className="h-16 bg-gray-200 rounded-lg"></div>
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="w-4 h-4 text-success-green" />;
      case 'invited':
      case 'in_progress':
        return <Clock className="w-4 h-4 text-muted-gold" />;
      default:
        return <Mail className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-success-green/20 text-success-green">
            Complete
          </Badge>
        );
      case 'invited':
        return (
          <Badge className="bg-blue-100 text-blue-600">
            Invited
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-muted-gold/20 text-muted-gold">
            Pending
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-600">
            Not Started
          </Badge>
        );
    }
  };

  const supplierList = suppliers || [];
  const previewSuppliers = supplierList.slice(0, 3);

  return (
    <Card className="border-light-gray">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-gray">
            Supplier Database
          </CardTitle>
          <Button
            variant="ghost"
            className="text-avallen-green hover:text-avallen-green-dark text-sm font-medium"
            onClick={() => navigate("/app/suppliers")}
          >
            View all
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {previewSuppliers.length > 0 ? (
            previewSuppliers.map((supplier: any) => (
              <div
                key={supplier.id}
                className="flex items-center justify-between p-4 bg-lightest-gray rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    {getStatusIcon(supplier.status)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-gray">{supplier.name}</p>
                    <p className="text-sm text-gray-500">{supplier.email}</p>
                  </div>
                </div>
                {getStatusBadge(supplier.status)}
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No suppliers added yet</p>
              <p className="text-sm text-gray-400">
                Invite suppliers to start collecting Scope 3 data
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-light-gray">
            <Button
              variant="outline"
              className="w-full border-light-gray text-slate-gray hover:bg-lightest-gray"
              onClick={() => navigate("/app/suppliers")}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {supplierList.length > 0 ? "Invite New Supplier" : "Invite First Supplier"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
