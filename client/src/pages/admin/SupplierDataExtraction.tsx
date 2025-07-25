import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AutoDataExtractionEnhanced from "@/components/suppliers/AutoDataExtractionEnhanced";
import PDFUploadExtraction from "@/components/suppliers/PDFUploadExtraction";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { 
  Database, 
  Globe, 
  FileText, 
  TestTube,
  Info,
  Download,
  Eye
} from "lucide-react";

export default function SupplierDataExtraction() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isTestingUrl, setIsTestingUrl] = useState(false);

  const handleTestExtraction = (data: any) => {
    setTestResults(prev => [...prev, {
      timestamp: new Date().toISOString(),
      data,
      type: 'web'
    }]);
  };

  const handleTestPDFExtraction = (data: any) => {
    setTestResults(prev => [...prev, {
      timestamp: new Date().toISOString(),
      data,
      type: 'pdf'
    }]);
  };

  const testUrls = [
    "https://frugalpac.com/frugal-bottle/",
    "https://vetropack.com/en/products/",
    "https://www.ardagh.com/our-products/glass-bottles/",
    "https://www.verallia.com/en/products/bottles-jars",
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <TestTube className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Supplier Data Extraction Testing
                </h1>
                <p className="text-gray-600">
                  Test automated data extraction capabilities for supplier onboarding
                </p>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Use this admin tool to test web scraping and PDF extraction functionality before supplier onboarding. 
                All extracted data is displayed for verification and testing purposes.
              </AlertDescription>
            </Alert>

            <Tabs defaultValue="web-extraction">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="web-extraction">Web Extraction</TabsTrigger>
                <TabsTrigger value="pdf-extraction">PDF Extraction</TabsTrigger>
                <TabsTrigger value="test-results">Test Results</TabsTrigger>
              </TabsList>

              <TabsContent value="web-extraction" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      Web Data Extraction Testing
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AutoDataExtractionEnhanced 
                      onDataExtracted={handleTestExtraction}
                      disabled={false}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Test URLs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {testUrls.map((url, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="text-sm font-medium">{new URL(url).hostname}</div>
                            <div className="text-xs text-gray-500 truncate">{url}</div>
                          </div>
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4 mr-1" />
                            Test
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pdf-extraction" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      PDF Data Extraction Testing
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PDFUploadExtraction 
                      onDataExtracted={handleTestPDFExtraction}
                      disabled={false}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="test-results" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      Extraction Test Results
                      <Badge variant="outline">{testResults.length} tests</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {testResults.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No test results yet. Run some extractions to see results here.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {testResults.map((result, index) => (
                          <Card key={index} className="border-l-4 border-l-blue-500">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant={result.type === 'web' ? 'default' : 'secondary'}>
                                    {result.type === 'web' ? 'Web' : 'PDF'} Extraction
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {new Date(result.timestamp).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                                {Object.entries(result.data).map(([key, value]) => {
                                  if (key === 'confidence' || value === undefined) return null;
                                  return (
                                    <div key={key} className="space-y-1">
                                      <div className="font-medium text-gray-700 capitalize">
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                      </div>
                                      <div className="text-gray-900 truncate">
                                        {typeof value === 'object' 
                                          ? JSON.stringify(value) 
                                          : value?.toString() || 'N/A'
                                        }
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {result.data.productImage && (
                                <div className="mt-4">
                                  <div className="text-sm font-medium mb-2">Extracted Images:</div>
                                  <div className="flex gap-2">
                                    <img
                                      src={result.data.productImage}
                                      alt="Extracted product"
                                      className="w-16 h-16 object-cover rounded border"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                    {result.data.additionalImages?.map((img: string, imgIndex: number) => (
                                      <img
                                        key={imgIndex}
                                        src={img}
                                        alt={`Additional ${imgIndex + 1}`}
                                        className="w-16 h-16 object-cover rounded border opacity-75"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
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