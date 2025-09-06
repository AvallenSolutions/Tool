import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import SupplierManagementLayout from "./SupplierManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Package, 
  Users, 
  Globe, 
  UserPlus, 
  Database, 
  Upload,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BarChart3
} from "lucide-react";

interface AnalyticsData {
  totalSuppliers: number;
  totalProducts: number;
  pendingSuppliers: number;
  verifiedSuppliers: number;
  pendingProducts: number;
  approvedProducts: number;
}

export default function SupplierManagementOverview() {
  const [, navigate] = useLocation();

  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/supplier-analytics"],
    queryFn: async () => {
      const response = await fetch("/api/admin/analytics");
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ["/api/admin/suppliers"],
  });

  const { data: supplierProducts } = useQuery({
    queryKey: ["/api/admin/supplier-products"],
  });

  const quickActions = [
    {
      title: "Add New Supplier",
      description: "Register a new verified supplier in the network",
      icon: Building2,
      color: "blue",
      path: "/app/admin/supplier-management/onboarding",
    },
    {
      title: "Create Product",
      description: "Add a new supplier product with specifications",
      icon: Package,
      color: "purple",
      path: "/app/admin/supplier-management/products/create",
    },
    {
      title: "Data Extraction",
      description: "Extract supplier data from web sources and documents",
      icon: Globe,
      color: "green",
      path: "/app/admin/supplier-management/data-extraction",
    },
    {
      title: "Manage Suppliers",
      description: "View and manage all registered suppliers",
      icon: Database,
      color: "orange",
      path: "/app/admin/supplier-management/suppliers",
    },
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
      purple: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
      green: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
      orange: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <SupplierManagementLayout title="Supplier Management" subtitle="Overview and management of supplier network">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Supplier Management Overview</h1>
            <p className="text-muted-foreground">
              Centralized management for suppliers, products, and collaboration
            </p>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            <Activity className="w-4 h-4 mr-1" />
            System Active
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalSuppliers || Array.isArray(suppliers) ? suppliers.length : 0}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">
                  {analytics?.verifiedSuppliers || 0} verified
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Supplier Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Array.isArray(supplierProducts) ? supplierProducts.length : 0}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-blue-600">
                  Available for selection
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.pendingSuppliers || 0}</div>
              <p className="text-xs text-muted-foreground">
                Suppliers awaiting verification
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Healthy</div>
              <p className="text-xs text-muted-foreground">
                All systems operational
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Card 
                    key={action.path}
                    className={`hover:shadow-md transition-shadow cursor-pointer border ${getColorClasses(action.color)}`}
                    onClick={() => navigate(action.path)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-white/80 border">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{action.title}</h3>
                          <p className="text-sm opacity-80 mt-1">{action.description}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 opacity-60" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Management Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Supplier Directory</p>
                    <p className="text-sm text-muted-foreground">View and manage all registered suppliers</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/app/admin/supplier-management/suppliers')}
                >
                  View Suppliers
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium">Product Catalog</p>
                    <p className="text-sm text-muted-foreground">Browse and manage supplier product offerings</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/app/admin/supplier-management/products')}
                >
                  View Products
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Upload className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium">Data Import & Extraction</p>
                    <p className="text-sm text-muted-foreground">Extract supplier data from websites and documents</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/app/admin/supplier-management/data-extraction')}
                >
                  Launch Tool
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SupplierManagementLayout>
  );
}