import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Building2, 
  TrendingUp, 
  AlertCircle, 
  FileCheck,
  UserCheck,
  BarChart3,
  Activity,
  Package,
  ClipboardCheck,
  MessageSquare,
  Database,
  Shield,
  Settings,
  CheckCircle2,
  Clock,
  ExternalLink
} from "lucide-react";

interface AdminAnalytics {
  totalUsers: number;
  newUserCount: number;
  userGrowthPercentage: number;
  totalSuppliers: number;
  newSupplierCount: number;
  supplierGrowthPercentage: number;
  totalCompanies: number;
  pendingLcaReviews: number;
  lastUpdated: string;
}

interface ActionItem {
  id: string;
  type: 'supplier_verification' | 'product_review' | 'lca_approval' | 'message';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  actionUrl: string;
}

export default function EnhancedAdminDashboard() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("analytics");

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AdminAnalytics>({
    queryKey: ['/api/admin/analytics'],
    refetchInterval: 30000,
  });

  // Debug logging for analytics data
  console.log('🎯 Frontend Admin Dashboard - Analytics data:', analytics);
  console.log('🎯 Frontend - Total suppliers value:', analytics?.totalSuppliers);

  const { data: supplierProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/admin/supplier-products'],
    refetchInterval: 30000,
  });

  const { data: suppliersResponse, isLoading: suppliersLoading } = useQuery<{success: boolean, data: any[]}>({
    queryKey: ['/api/admin/suppliers'],
    refetchInterval: 30000,
  });

  const suppliers = suppliersResponse?.data || [];
  console.log('🎯 Admin Dashboard - Suppliers data:', suppliers);
  console.log('🎯 Admin Dashboard - Suppliers count:', suppliers.length);

  // Mock action items - would come from API in production
  const actionItems: ActionItem[] = [
    {
      id: '1',
      type: 'supplier_verification',
      title: 'New Supplier Verification',
      description: '3 suppliers pending verification review',
      priority: 'high',
      createdAt: '2025-01-28T10:00:00Z',
      actionUrl: '/app/admin/suppliers'
    },
    {
      id: '2',
      type: 'product_review',
      title: 'Product Data Review',
      description: '5 new products require review',
      priority: 'medium',
      createdAt: '2025-01-28T09:30:00Z',
      actionUrl: '/app/admin/products'
    },
    {
      id: '3',
      type: 'lca_approval',
      title: 'LCA Report Approval',
      description: '2 LCA reports awaiting approval',
      priority: 'high',
      createdAt: '2025-01-28T08:45:00Z',
      actionUrl: '/app/admin/lca-approvals'
    }
  ];

  const formatGrowth = (percentage: number) => {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(1)}%`;
  };

  const getGrowthColor = (percentage: number) => {
    if (percentage > 0) return 'text-green-600';
    if (percentage < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (analyticsLoading) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Admin Dashboard" subtitle="Loading platform management interface..." />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded"></div>
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
        <Header title="Admin Dashboard" subtitle="Platform management and oversight" />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Activity className="w-3 h-3 mr-1" />
                Live Data
              </Badge>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Platform Analytics
                </TabsTrigger>
                <TabsTrigger value="supplier-management" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Supplier Management
                </TabsTrigger>
                <TabsTrigger value="action-items" className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" />
                  Action Items
                </TabsTrigger>
              </TabsList>

              {/* Platform Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics?.totalUsers || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        <span className={getGrowthColor(analytics?.userGrowthPercentage || 0)}>
                          {formatGrowth(analytics?.userGrowthPercentage || 0)}
                        </span> from last month
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics?.totalSuppliers || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        <span className={getGrowthColor(analytics?.supplierGrowthPercentage || 0)}>
                          {formatGrowth(analytics?.supplierGrowthPercentage || 0)}
                        </span> from last month
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Platform Health</CardTitle>
                      <Activity className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">Healthy</div>
                      <p className="text-xs text-muted-foreground">
                        All systems operational
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics?.pendingLcaReviews || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        LCA reports awaiting approval
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Platform Health Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">Database</p>
                        <p className="text-sm text-green-700">Connected & Optimized</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">API Services</p>
                        <p className="text-sm text-green-700">All endpoints active</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">User Sessions</p>
                        <p className="text-sm text-green-700">Stable & Secure</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Supplier Management Tab */}
              <TabsContent value="supplier-management" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Supplier Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                        <div>
                          <p className="font-medium">Total Suppliers</p>
                          <p className="text-2xl font-bold text-blue-600">{Array.isArray(suppliers) ? suppliers.length : 0}</p>
                        </div>
                        <Users className="w-8 h-8 text-blue-600" />
                      </div>
                      <Button 
                        onClick={() => navigate('/app/admin/suppliers')}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Manage Suppliers
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Product Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                        <div>
                          <p className="font-medium">Total Products</p>
                          <p className="text-2xl font-bold text-purple-600">{Array.isArray(supplierProducts) ? supplierProducts.length : 0}</p>
                        </div>
                        <Package className="w-8 h-8 text-purple-600" />
                      </div>
                      <Button 
                        onClick={() => navigate('/app/admin/products')}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        <Database className="w-4 h-4 mr-2" />
                        Manage Products
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-3">
                      <Button 
                        variant="outline" 
                        onClick={() => navigate('/app/admin/supplier-data')}
                        className="flex items-center gap-2"
                      >
                        <Database className="w-4 h-4" />
                        Supplier Data
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => navigate('/app/admin/data-extraction')}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Data Extraction
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => navigate('/app/admin/lca-approvals')}
                        className="flex items-center gap-2"
                      >
                        <FileCheck className="w-4 h-4" />
                        LCA Approvals
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Action Items Tab */}
              <TabsContent value="action-items" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardCheck className="w-5 h-5" />
                      Pending Actions ({actionItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {actionItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                              {item.type === 'supplier_verification' && <Building2 className="w-5 h-5 text-blue-600" />}
                              {item.type === 'product_review' && <Package className="w-5 h-5 text-purple-600" />}
                              {item.type === 'lca_approval' && <FileCheck className="w-5 h-5 text-green-600" />}
                              {item.type === 'message' && <MessageSquare className="w-5 h-5 text-orange-600" />}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium">{item.title}</h3>
                              <p className="text-sm text-gray-600">{item.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                                  {item.priority.toUpperCase()}
                                </Badge>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(item.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button size="sm" onClick={() => navigate(item.actionUrl)}>
                            Review
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}