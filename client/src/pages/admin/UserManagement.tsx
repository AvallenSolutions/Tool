import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { 
  Users, 
  Search, 
  Eye, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';

interface UserListItem {
  companyId: number;
  companyName: string;
  ownerName: string;
  ownerEmail: string;
  overallCompleteness: number;
  lastActivity: string;
  onboardingComplete: boolean;
  needsAttention: boolean;
}

interface UserListResponse {
  success: boolean;
  data: UserListItem[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export default function UserManagement() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  const { data: userResponse, isLoading, error } = useQuery<UserListResponse>({
    queryKey: ['/api/admin/users', { 
      search: searchTerm, 
      limit: pageSize, 
      offset: currentPage * pageSize 
    }],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const users = userResponse?.data || [];

  const getCompletenessVariant = (completeness: number) => {
    if (completeness >= 80) return 'default';
    if (completeness >= 50) return 'secondary';
    return 'destructive';
  };

  const getCompletenessIcon = (completeness: number) => {
    if (completeness >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (completeness >= 50) return <Clock className="h-4 w-4 text-orange-600" />;
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  const handleViewProfile = (companyId: number) => {
    navigate(`/app/admin/users/${companyId}`);
  };

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      user.companyName.toLowerCase().includes(searchLower) ||
      user.ownerName.toLowerCase().includes(searchLower) ||
      user.ownerEmail.toLowerCase().includes(searchLower)
    );
  });

  const needsAttentionCount = users.filter(user => user.needsAttention).length;
  const highCompletenessCount = users.filter(user => user.overallCompleteness >= 80).length;
  const lowCompletenessCount = users.filter(user => user.overallCompleteness < 50).length;

  if (isLoading) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="User Management" subtitle="Loading user data..." />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                <Badge variant="outline">Loading...</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded"></div>
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

  if (error) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="User Management" subtitle="Error loading user data" />
          <main className="flex-1 p-6 overflow-y-auto">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <h3 className="font-medium text-red-800">Error Loading Users</h3>
                    <p className="text-sm text-red-700 mt-1">
                      Failed to load user data. Please refresh the page or contact support if the issue persists.
                    </p>
                  </div>
                </div>
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
          title="User Management" 
          subtitle={`Managing ${users.length} client companies and their sustainability profiles`}
        />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                <p className="text-muted-foreground">
                  Monitor client progress and provide proactive support
                </p>
              </div>
              <Badge variant="outline" className="bg-avallen-green text-white">
                {users.length} Active Users
              </Badge>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Needs Attention</p>
                      <p className="text-2xl font-bold text-gray-900">{needsAttentionCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">High Completeness</p>
                      <p className="text-2xl font-bold text-gray-900">{highCompletenessCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Low Completeness</p>
                      <p className="text-2xl font-bold text-gray-900">{lowCompletenessCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Client Companies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by company name, owner name, or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Users Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Completeness</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Activity</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            {searchTerm ? 'No users match your search criteria.' : 'No users found.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user.companyId}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{user.companyName}</div>
                                <div className="text-sm text-muted-foreground">ID: {user.companyId}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{user.ownerName}</div>
                                <div className="text-sm text-muted-foreground">{user.ownerEmail}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getCompletenessIcon(user.overallCompleteness)}
                                <Badge variant={getCompletenessVariant(user.overallCompleteness)}>
                                  {user.overallCompleteness}%
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {user.onboardingComplete ? (
                                  <Badge variant="outline" className="w-fit text-xs">
                                    Onboarded
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="w-fit text-xs">
                                    Onboarding
                                  </Badge>
                                )}
                                {user.needsAttention && (
                                  <Badge variant="destructive" className="w-fit text-xs">
                                    Needs Attention
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground">
                                {new Date(user.lastActivity).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewProfile(user.companyId)}
                                className="flex items-center gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}