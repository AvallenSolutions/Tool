import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Building2, 
  TrendingUp, 
  AlertCircle, 
  FileCheck,
  UserCheck,
  BarChart3,
  Activity
} from "lucide-react";
import { useLocation } from "wouter";

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

export default function AdminDashboard() {
  const [, navigate] = useLocation();

  const { data: analytics, isLoading } = useQuery<AdminAnalytics>({
    queryKey: ['/api/admin/analytics'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Platform Analytics</h1>
          <Badge variant="outline">Loading...</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const formatGrowth = (percentage: number) => {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(1)}%`;
  };

  const getGrowthColor = (percentage: number) => {
    if (percentage > 0) return 'text-green-600';
    if (percentage < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Platform Analytics</h1>
        <Badge variant="outline">
          Last updated: {analytics ? new Date(analytics.lastUpdated).toLocaleTimeString() : 'Never'}
        </Badge>
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
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
              </span> from last period
            </p>
          </CardContent>
        </Card>

        {/* New Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Users (30d)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.newUserCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Users registered this month
            </p>
          </CardContent>
        </Card>

        {/* Total Suppliers */}
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
              </span> from last period
            </p>
          </CardContent>
        </Card>

        {/* Pending Reviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending LCA Reviews</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{analytics?.pendingLcaReviews || 0}</div>
            <p className="text-xs text-muted-foreground">
              Reports awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/app/admin/suppliers')}
            >
              <UserCheck className="h-6 w-6" />
              <span>Verify Suppliers</span>
              <Badge variant="secondary" className="text-xs">
                {analytics?.newSupplierCount || 0} pending
              </Badge>
            </Button>

            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/app/admin/lca-approvals')}
            >
              <FileCheck className="h-6 w-6" />
              <span>Approve LCAs</span>
              <Badge variant={analytics?.pendingLcaReviews ? "destructive" : "secondary"} className="text-xs">
                {analytics?.pendingLcaReviews || 0} pending
              </Badge>
            </Button>

            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/app/admin/supplier-data')}
            >
              <Building2 className="h-6 w-6" />
              <span>Add Supplier Data</span>
              <Badge variant="secondary" className="text-xs">
                Admin Only
              </Badge>
            </Button>

            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/app/admin/analytics')}
            >
              <BarChart3 className="h-6 w-6" />
              <span>View Reports</span>
              <Badge variant="secondary" className="text-xs">
                Analytics
              </Badge>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Platform Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Companies</span>
                <Badge variant="secondary">{analytics?.totalCompanies || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">User Growth Rate</span>
                <Badge 
                  variant={analytics?.userGrowthPercentage && analytics.userGrowthPercentage > 0 ? "default" : "secondary"}
                  className={getGrowthColor(analytics?.userGrowthPercentage || 0)}
                >
                  {formatGrowth(analytics?.userGrowthPercentage || 0)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Supplier Growth Rate</span>
                <Badge 
                  variant={analytics?.supplierGrowthPercentage && analytics.supplierGrowthPercentage > 0 ? "default" : "secondary"}
                  className={getGrowthColor(analytics?.supplierGrowthPercentage || 0)}
                >
                  {formatGrowth(analytics?.supplierGrowthPercentage || 0)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Action Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.pendingLcaReviews && analytics.pendingLcaReviews > 0 && (
                <div className="flex items-center gap-2 p-3 border rounded-lg border-orange-200 bg-orange-50">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm">
                    {analytics.pendingLcaReviews} LCA reports need review
                  </span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate('/app/admin/lca-approvals')}
                  >
                    Review
                  </Button>
                </div>
              )}
              
              {analytics?.newSupplierCount && analytics.newSupplierCount > 0 && (
                <div className="flex items-center gap-2 p-3 border rounded-lg border-blue-200 bg-blue-50">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">
                    {analytics.newSupplierCount} new suppliers to verify
                  </span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate('/app/admin/suppliers')}
                  >
                    Verify
                  </Button>
                </div>
              )}

              {(!analytics?.pendingLcaReviews || analytics.pendingLcaReviews === 0) && 
               (!analytics?.newSupplierCount || analytics.newSupplierCount === 0) && (
                <div className="flex items-center gap-2 p-3 border rounded-lg border-green-200 bg-green-50">
                  <FileCheck className="h-4 w-4 text-green-600" />
                  <span className="text-sm">All caught up! No pending actions.</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}