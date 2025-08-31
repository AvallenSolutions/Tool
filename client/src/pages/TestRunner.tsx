import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, CheckCircle, XCircle, Database, TestTube, LogIn } from 'lucide-react';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';

interface TestResult {
  phase: string;
  test: string;
  status: 'PASS' | 'FAIL';
  details?: any;
  timestamp: string;
}

interface TestReport {
  summary: Array<{
    phase: string;
    passed: number;
    total: number;
    percentage: number;
  }>;
  overall: {
    passed: number;
    total: number;
    percentage: number;
  };
  details: TestResult[];
}

export default function TestRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [testReport, setTestReport] = useState<TestReport | null>(null);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runE2ETests = async () => {
    setIsRunning(true);
    setError(null);
    setTestReport(null);
    
    try {
      const response = await apiRequest('/api/test/e2e');
      setTestReport(response.report);
    } catch (err: any) {
      setError(err.message || 'Failed to run tests');
    } finally {
      setIsRunning(false);
    }
  };

  const seedTestData = async () => {
    setIsSeeding(true);
    setError(null);
    setSeedResult(null);
    
    try {
      const response = await apiRequest('/api/test/seed', {
        method: 'POST'
      });
      setSeedResult(response);
    } catch (err: any) {
      setError(err.message || 'Failed to seed test data');
    } finally {
      setIsSeeding(false);
    }
  };

  const getStatusColor = (status: 'PASS' | 'FAIL') => {
    return status === 'PASS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getPhaseColor = (percentage: number) => {
    if (percentage === 100) return 'bg-green-100 text-green-800';
    if (percentage >= 80) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="flex min-h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="Test Runner" subtitle="End-to-End Testing & Validation for Drinks Sustainability Tool" />
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Control Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="w-5 h-5" />
                  Test Control Panel
                </CardTitle>
                <CardDescription>
                  Run comprehensive End-to-End tests based on the validation plan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 flex-wrap">
                  <Button 
                    onClick={seedTestData} 
                    disabled={isSeeding}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                    {isSeeding ? 'Seeding...' : 'Seed Test Data'}
                  </Button>
                  
                  <Button 
                    onClick={runE2ETests} 
                    disabled={isRunning}
                    className="flex items-center gap-2"
                  >
                    {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    {isRunning ? 'Running Tests...' : 'Run E2E Tests'}
                  </Button>
                  
                  <Link href="/login">
                    <Button 
                      variant="secondary"
                      className="flex items-center gap-2 bg-avallen-green/10 text-avallen-green hover:bg-avallen-green/20 border-avallen-green/30"
                      data-testid="button-view-login"
                    >
                      <LogIn className="w-4 h-4" />
                      View Login Page
                    </Button>
                  </Link>
                </div>

                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Seed Results */}
            {seedResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Test Data Seeding Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-sm text-green-600">Company Created</div>
                      <div className="font-semibold">{seedResult.data?.company?.name}</div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-600">Product Created</div>
                      <div className="font-semibold">{seedResult.data?.product?.name}</div>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="text-sm text-purple-600">Suppliers Created</div>
                      <div className="font-semibold">{seedResult.data?.supplierCount} suppliers</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Test Results */}
            {testReport && (
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="summary">Test Summary</TabsTrigger>
                  <TabsTrigger value="details">Detailed Results</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {testReport.overall.percentage === 100 ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        Overall Test Results
                      </CardTitle>
                      <CardDescription>
                        {testReport.overall.passed}/{testReport.overall.total} tests passed ({testReport.overall.percentage}%)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {testReport.summary.map((phase) => (
                          <div key={phase.phase} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-semibold">{phase.phase}</h4>
                              <Badge className={getPhaseColor(phase.percentage)}>
                                {phase.percentage}%
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              {phase.passed}/{phase.total} tests passed
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Detailed Test Results</CardTitle>
                      <CardDescription>Individual test case results with details</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {testReport.details.map((result, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                            <Badge className={getStatusColor(result.status)}>
                              {result.status}
                            </Badge>
                            <div className="flex-1">
                              <div className="font-medium">{result.test}</div>
                              <div className="text-sm text-gray-600">{result.phase}</div>
                              {result.details && (
                                <pre className="text-xs mt-2 p-2 bg-gray-50 rounded overflow-x-auto">
                                  {JSON.stringify(result.details, null, 2)}
                                </pre>
                              )}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(result.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}

            {/* Test Plan Information */}
            <Card>
              <CardHeader>
                <CardTitle>Test Plan Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div><strong>Test Case:</strong> Full Lifecycle for Self-Producing Spirits Brand</div>
                  <div><strong>Company:</strong> Orchard Spirits Co. (Normandy, France)</div>
                  <div><strong>Product:</strong> Heritage Apple Brandy</div>
                  <div><strong>Phases:</strong></div>
                  <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                    <li>Phase 1: Company & Product Setup</li>
                    <li>Phase 2: Supplier & Product Data Setup (Admin Workflow)</li>
                    <li>Phase 3: LCA Data Collection & Supplier Linking (Client Workflow)</li>
                    <li>Phase 4: Validation & Report Generation</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

          </div>
        </main>
      </div>
    </div>
  );
}