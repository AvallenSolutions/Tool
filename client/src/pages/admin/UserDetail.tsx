import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { 
  ArrowLeft,
  User,
  Building2,
  CheckCircle,
  AlertTriangle,
  Clock,
  MessageSquare,
  FileText,
  TrendingUp,
  Calendar,
  Mail
} from 'lucide-react';

interface ProfileCompletenessData {
  companyId: number;
  companyName: string;
  ownerName: string;
  ownerEmail: string;
  overallCompleteness: number;
  sections: {
    companyProfile: {
      completeness: number;
      missing: string[];
    };
    products: {
      completeness: number;
      totalProducts: number;
      productsWithLCA: number;
      missing: string[];
    };
    carbonFootprint: {
      completeness: number;
      scope1Complete: boolean;
      scope2Complete: boolean;
      scope3Complete: boolean;
      missing: string[];
    };
    reports: {
      completeness: number;
      totalReports: number;
      approvedReports: number;
      missing: string[];
    };
  };
  lastActivity: string;
  onboardingComplete: boolean;
}

interface ProfileResponse {
  success: boolean;
  data: ProfileCompletenessData;
}

export default function UserDetail() {
  const { companyId } = useParams();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: profileResponse, isLoading, error } = useQuery<ProfileResponse>({
    queryKey: ['/api/admin/users', companyId],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      
      const response = await fetch(`/api/admin/users/${companyId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!companyId,
    refetchInterval: 30000,
  });

  const profile = profileResponse?.data;

  const getCompletenessColor = (completeness: number) => {
    if (completeness >= 80) return 'text-green-600';
    if (completeness >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getProgressColor = (completeness: number) => {
    if (completeness >= 80) return 'bg-green-500';
    if (completeness >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getSectionIcon = (completeness: number) => {
    if (completeness >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (completeness >= 50) return <Clock className="h-5 w-5 text-orange-600" />;
    return <AlertTriangle className="h-5 w-5 text-red-600" />;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="User Profile" subtitle="Loading user details..." />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
                <div className="grid gap-4 md:grid-cols-3">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-8 bg-gray-200 rounded"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="User Profile" subtitle="Error loading user details" />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              <Button 
                variant="outline" 
                onClick={() => navigate('/app/admin/users')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to User Management
              </Button>
              
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div>
                      <h3 className="font-medium text-red-800">User Not Found</h3>
                      <p className="text-sm text-red-700 mt-1">
                        The user profile could not be loaded. The company may not exist or you may not have permission to view it.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
          title={`${profile.companyName} Profile`}
          subtitle={`Detailed user profile and completeness analysis for ${profile.ownerName}`}
        />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Navigation */}
            <Button 
              variant="outline" 
              onClick={() => navigate('/app/admin/users')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to User Management
            </Button>

            {/* User Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-avallen-green/10 rounded-lg">
                      <Building2 className="h-8 w-8 text-avallen-green" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold">{profile.companyName}</h1>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{profile.ownerName}</span>
                        <Mail className="h-4 w-4 ml-2" />
                        <span>{profile.ownerEmail}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-avallen-green">
                      {profile.overallCompleteness}%
                    </div>
                    <div className="text-sm text-muted-foreground">Overall Completeness</div>
                    {profile.onboardingComplete ? (
                      <Badge className="mt-2 bg-green-100 text-green-800">
                        Onboarding Complete
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="mt-2">
                        Onboarding In Progress
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabbed Interface */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Profile Overview
                </TabsTrigger>
                <TabsTrigger value="messaging" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Internal Messaging
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Document Review
                </TabsTrigger>
              </TabsList>

              {/* Profile Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Profile Completeness Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Completeness Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Overall Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-medium">Overall Progress</span>
                        <span className={`text-lg font-bold ${getCompletenessColor(profile.overallCompleteness)}`}>
                          {profile.overallCompleteness}%
                        </span>
                      </div>
                      <Progress 
                        value={profile.overallCompleteness} 
                        className="h-3"
                      />
                    </div>

                    {/* Section Breakdowns */}
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Company Profile */}
                      <Card className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getSectionIcon(profile.sections.companyProfile.completeness)}
                              <span className="font-medium">Company Profile</span>
                            </div>
                            <span className={`font-bold ${getCompletenessColor(profile.sections.companyProfile.completeness)}`}>
                              {profile.sections.companyProfile.completeness}%
                            </span>
                          </div>
                          <Progress 
                            value={profile.sections.companyProfile.completeness} 
                            className="h-2 mb-2"
                          />
                          {profile.sections.companyProfile.missing.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Missing:</span>
                              <ul className="list-disc list-inside mt-1">
                                {profile.sections.companyProfile.missing.map((item, index) => (
                                  <li key={index}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Products */}
                      <Card className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getSectionIcon(profile.sections.products.completeness)}
                              <span className="font-medium">Products & LCA</span>
                            </div>
                            <span className={`font-bold ${getCompletenessColor(profile.sections.products.completeness)}`}>
                              {profile.sections.products.completeness}%
                            </span>
                          </div>
                          <Progress 
                            value={profile.sections.products.completeness} 
                            className="h-2 mb-2"
                          />
                          <div className="text-sm text-muted-foreground">
                            <div>{profile.sections.products.totalProducts} products, {profile.sections.products.productsWithLCA} with LCA</div>
                            {profile.sections.products.missing.length > 0 && (
                              <div className="mt-1">
                                <span className="font-medium">Issues:</span>
                                <ul className="list-disc list-inside">
                                  {profile.sections.products.missing.map((item, index) => (
                                    <li key={index}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Carbon Footprint */}
                      <Card className="border-l-4 border-l-orange-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getSectionIcon(profile.sections.carbonFootprint.completeness)}
                              <span className="font-medium">Carbon Footprint</span>
                            </div>
                            <span className={`font-bold ${getCompletenessColor(profile.sections.carbonFootprint.completeness)}`}>
                              {profile.sections.carbonFootprint.completeness}%
                            </span>
                          </div>
                          <Progress 
                            value={profile.sections.carbonFootprint.completeness} 
                            className="h-2 mb-2"
                          />
                          <div className="text-sm text-muted-foreground">
                            <div className="flex gap-4">
                              <span>Scope 1: {profile.sections.carbonFootprint.scope1Complete ? '✓' : '✗'}</span>
                              <span>Scope 2: {profile.sections.carbonFootprint.scope2Complete ? '✓' : '✗'}</span>
                              <span>Scope 3: {profile.sections.carbonFootprint.scope3Complete ? '✓' : '✗'}</span>
                            </div>
                            {profile.sections.carbonFootprint.missing.length > 0 && (
                              <div className="mt-1">
                                <span className="font-medium">Missing:</span>
                                <ul className="list-disc list-inside">
                                  {profile.sections.carbonFootprint.missing.map((item, index) => (
                                    <li key={index}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Reports */}
                      <Card className="border-l-4 border-l-purple-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getSectionIcon(profile.sections.reports.completeness)}
                              <span className="font-medium">Reports</span>
                            </div>
                            <span className={`font-bold ${getCompletenessColor(profile.sections.reports.completeness)}`}>
                              {profile.sections.reports.completeness}%
                            </span>
                          </div>
                          <Progress 
                            value={profile.sections.reports.completeness} 
                            className="h-2 mb-2"
                          />
                          <div className="text-sm text-muted-foreground">
                            <div>{profile.sections.reports.totalReports} reports, {profile.sections.reports.approvedReports} approved</div>
                            {profile.sections.reports.missing.length > 0 && (
                              <div className="mt-1">
                                <span className="font-medium">Issues:</span>
                                <ul className="list-disc list-inside">
                                  {profile.sections.reports.missing.map((item, index) => (
                                    <li key={index}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Last Activity */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Last activity: {new Date(profile.lastActivity).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Internal Messaging Tab */}
              <TabsContent value="messaging" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Internal Messaging</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center p-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Messaging Coming Soon</h3>
                      <p>Direct messaging with clients will be available in Phase 2 of the Super Admin features.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Document Review Tab */}
              <TabsContent value="documents" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Document & Report Review</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center p-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Document Review Coming Soon</h3>
                      <p>Document commenting and review capabilities will be available in Phase 2 of the Super Admin features.</p>
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