import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Globe, 
  FileText, 
  Zap,
  Loader2,
  Info,
  Eye
} from "lucide-react";

interface ComplianceResult {
  score: number;
  status: 'compliant' | 'warning' | 'non-compliant';
  issues: ComplianceIssue[];
  recommendations: string[];
  analysisDetails: {
    claimsFound: string[];
    substantiationLevel: string;
    languageCompliance: string;
    evidencePresence: boolean;
  };
}

interface ComplianceIssue {
  type: 'critical' | 'warning' | 'info';
  category: string;
  description: string;
  dmccSection: string;
  solution: string;
}

export default function GreenwashGuardian() {
  const [activeTab, setActiveTab] = useState("url");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [marketingText, setMarketingText] = useState("");
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async (data: { type: 'website' | 'text'; content: string }) => {
      const response = await fetch('/api/greenwash-guardian/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Analysis failed');
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      setComplianceResult(result);
    }
  });

  const handleAnalysis = () => {
    if (activeTab === "url" && websiteUrl.trim()) {
      analyzeMutation.mutate({ type: 'website', content: websiteUrl });
    } else if (activeTab === "text" && marketingText.trim()) {
      analyzeMutation.mutate({ type: 'text', content: marketingText });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-green-500';
      case 'warning': return 'bg-amber-500';
      case 'non-compliant': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'compliant': return 'Compliant';
      case 'warning': return 'Warning';
      case 'non-compliant': return 'Non-Compliant';
      default: return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-12 h-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">GreenwashGuardian</h1>
          </div>
          <p className="text-lg text-gray-600">
            DMCC Act 2024 Compliance Checker for Environmental Claims
          </p>
          <div className="mt-4 inline-flex items-center px-4 py-2 bg-blue-100 rounded-full">
            <Info className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-800">UK Digital Markets, Competition and Consumers Act 2024</span>
          </div>
        </div>

        {/* Main Analysis Card */}
        <Card className="mb-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center text-xl">
              <Eye className="w-6 h-6 mr-3" />
              Environmental Claims Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="url" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Website URL
                </TabsTrigger>
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Marketing Text
                </TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="website-url" className="text-lg font-medium">Enter Website URL</Label>
                  <Input
                    id="website-url"
                    placeholder="https://example.com/sustainable-products"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="text-lg py-3 px-4"
                  />
                </div>
              </TabsContent>

              <TabsContent value="text" className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="marketing-text" className="text-lg font-medium">Enter Marketing Content</Label>
                  <Textarea
                    id="marketing-text"
                    placeholder="Paste your marketing copy, product descriptions, or environmental claims here..."
                    value={marketingText}
                    onChange={(e) => setMarketingText(e.target.value)}
                    rows={8}
                    className="text-lg py-3 px-4 min-h-[200px]"
                  />
                </div>
              </TabsContent>

              <Button 
                onClick={handleAnalysis}
                disabled={analyzeMutation.isPending || 
                  (activeTab === "url" && !websiteUrl.trim()) || 
                  (activeTab === "text" && !marketingText.trim())}
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white py-4 text-lg font-semibold"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-3" />
                    Analyzing Claims...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-3" />
                    Analyze for DMCC Compliance
                  </>
                )}
              </Button>
            </Tabs>
          </CardContent>
        </Card>

        {/* Results Section */}
        {complianceResult && (
          <div className="space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Shield className="w-8 h-8 text-green-600" />
                  GreenwashGuardian
                </h1>
                <p className="text-gray-600 mt-2">
                  Evaluate marketing materials for compliance with the UK DMCC Act 2024
                </p>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                DMCC Act 2024 Compliant
              </Badge>
            </div>

            {/* Analysis Tools */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Compliance Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="website" className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Website Analysis
                    </TabsTrigger>
                    <TabsTrigger value="text" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Marketing Text
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="website" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="website-url">Website URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="website-url"
                          placeholder="https://example.com/green-products"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          className="flex-1"
                        />
                        <Button 
                          onClick={handleWebsiteAnalysis}
                          disabled={analyzeMutation.isPending || !websiteUrl.trim()}
                        >
                          {analyzeMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Zap className="w-4 h-4 mr-2" />
                          )}
                          Analyze
                        </Button>
                      </div>
                    </div>
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Enter a website URL to analyze its environmental claims for DMCC Act 2024 compliance. 
                        The analysis will check for substantiation, clarity, and evidence backing.
                      </AlertDescription>
                    </Alert>
                  </TabsContent>

                  <TabsContent value="text" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="marketing-text">Marketing Content</Label>
                      <Textarea
                        id="marketing-text"
                        placeholder="Paste your marketing copy, product descriptions, or environmental claims here..."
                        value={marketingText}
                        onChange={(e) => setMarketingText(e.target.value)}
                        rows={6}
                        className="min-h-[150px]"
                      />
                      <Button 
                        onClick={handleTextAnalysis}
                        disabled={analyzeMutation.isPending || !marketingText.trim()}
                        className="w-full"
                      >
                        {analyzeMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Zap className="w-4 h-4 mr-2" />
                        )}
                        Analyze Marketing Content
                      </Button>
                    </div>
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Paste marketing copy to check for vague claims, unsubstantiated statements, 
                        and compliance with DMCC Act 2024 requirements for environmental marketing.
                      </AlertDescription>
                    </Alert>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Results */}
            {complianceResult && (
              <div className="space-y-6">
                
                {/* Overall Score */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Compliance Assessment</span>
                      <Badge className={getStatusColor(complianceResult.status)}>
                        {getStatusIcon(complianceResult.status)}
                        <span className="ml-2 capitalize">{complianceResult.status.replace('-', ' ')}</span>
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Compliance Score</span>
                        <span className="text-2xl font-bold">{complianceResult.score}/100</span>
                      </div>
                      <Progress value={complianceResult.score} className="w-full" />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{complianceResult.analysisDetails.claimsFound.length}</div>
                          <div className="text-sm text-gray-600">Claims Found</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{complianceResult.analysisDetails.evidencePresence ? 'Yes' : 'No'}</div>
                          <div className="text-sm text-gray-600">Evidence Present</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">{complianceResult.issues.length}</div>
                          <div className="text-sm text-gray-600">Issues Found</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Issues Found */}
                {complianceResult.issues.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Compliance Issues
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {complianceResult.issues.map((issue, index) => (
                          <div key={index} className={`p-4 rounded-lg border-l-4 ${
                            issue.type === 'critical' 
                              ? 'border-red-500 bg-red-50' 
                              : issue.type === 'warning' 
                              ? 'border-yellow-500 bg-yellow-50' 
                              : 'border-blue-500 bg-blue-50'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="text-xs">
                                    {issue.category}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {issue.dmccSection}
                                  </Badge>
                                </div>
                                <h4 className="font-medium text-gray-900 mb-1">{issue.description}</h4>
                                <p className="text-sm text-gray-600 mb-2">{issue.solution}</p>
                              </div>
                              <Badge className={
                                issue.type === 'critical' 
                                  ? 'bg-red-100 text-red-800' 
                                  : issue.type === 'warning' 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }>
                                {issue.type}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {complianceResult.recommendations.map((recommendation, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-700">{recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Analysis Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Analysis Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-3">Environmental Claims Found</h4>
                        <div className="space-y-2">
                          {complianceResult.analysisDetails.claimsFound.map((claim, index) => (
                            <Badge key={index} variant="outline" className="mr-2 mb-2">
                              {claim}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-3">Compliance Metrics</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Substantiation Level:</span>
                            <span className="text-sm font-medium">{complianceResult.analysisDetails.substantiationLevel}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Language Compliance:</span>
                            <span className="text-sm font-medium">{complianceResult.analysisDetails.languageCompliance}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Evidence Present:</span>
                            <span className="text-sm font-medium">
                              {complianceResult.analysisDetails.evidencePresence ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* DMCC Act 2024 Info */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  About DMCC Act 2024 Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="text-blue-800">
                <p className="mb-4">
                  The Digital Markets, Competition and Consumers Act 2024 strengthens consumer protection 
                  against misleading environmental claims. Key requirements include:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Environmental claims must be substantiated with credible evidence</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Claims must be clear, specific, and not misleading to consumers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Evidence supporting claims must be readily accessible to consumers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Vague terms like "eco-friendly" require specific qualification</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

          </div>
        </main>
      </div>
    </div>
  );
}