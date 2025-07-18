import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Activity, Database, Shield } from "lucide-react";
import LCAStatusDashboard from "@/components/lca/LCAStatusDashboard";

export default function Admin() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-lightest-gray flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-avallen-green border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-lightest-gray flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-gray mb-4">Access Denied</h2>
          <p className="text-gray-600">You must be logged in to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lightest-gray">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-64">
          <Header />
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-gray mb-2">System Administration</h1>
                <p className="text-gray-600">
                  Manage system settings, monitor services, and view operational metrics
                </p>
              </div>

              <Tabs defaultValue="lca" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="lca" className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    LCA Service
                  </TabsTrigger>
                  <TabsTrigger value="database" className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Database
                  </TabsTrigger>
                  <TabsTrigger value="security" className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Security
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Settings
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="lca" className="space-y-6">
                  <LCAStatusDashboard />
                </TabsContent>

                <TabsContent value="database" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-avallen-green" />
                        Database Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-avallen-green mb-2">PostgreSQL</div>
                          <div className="text-sm text-gray-600">Database Type</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-avallen-green mb-2">Neon</div>
                          <div className="text-sm text-gray-600">Provider</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-avallen-green mb-2">Drizzle</div>
                          <div className="text-sm text-gray-600">ORM</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-avallen-green" />
                        Security Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 rounded-lg">
                          <h3 className="font-semibold text-green-800 mb-2">Authentication</h3>
                          <p className="text-sm text-green-700">
                            Replit Auth with OpenID Connect is enabled and configured.
                          </p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                          <h3 className="font-semibold text-green-800 mb-2">Session Management</h3>
                          <p className="text-sm text-green-700">
                            PostgreSQL-backed sessions with secure HTTP-only cookies.
                          </p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                          <h3 className="font-semibold text-green-800 mb-2">Data Protection</h3>
                          <p className="text-sm text-green-700">
                            All sensitive data is encrypted at rest and in transit.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-avallen-green" />
                        System Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h3 className="font-semibold text-slate-gray">Environment</h3>
                            <p className="text-sm text-gray-600">Current deployment environment</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-avallen-green">Development</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h3 className="font-semibold text-slate-gray">Frontend Framework</h3>
                            <p className="text-sm text-gray-600">React with TypeScript</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-avallen-green">React 18</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h3 className="font-semibold text-slate-gray">Backend Framework</h3>
                            <p className="text-sm text-gray-600">Node.js with Express</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-avallen-green">Express 4</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}