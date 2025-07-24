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
            
            {/* Traffic Light Status */}
            <Card className="shadow-lg">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className={`inline-block w-24 h-24 rounded-full ${getStatusColor(complianceResult.status)} flex items-center justify-center mb-4`}>
                    <span className="text-white text-2xl font-bold">{complianceResult.score}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{getStatusText(complianceResult.status)}</h3>
                  <p className="text-gray-600">Compliance Score: {complianceResult.score}/100</p>
                  <Progress value={complianceResult.score} className="mt-4 h-3" />
                </div>
              </CardContent>
            </Card>

            {/* Issues Found */}
            {complianceResult.issues.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                    Issues Found ({complianceResult.issues.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {complianceResult.issues.map((issue, index) => (
                      <div key={index} className={`p-4 rounded-lg border-l-4 ${
                        issue.type === 'critical' 
                          ? 'border-red-500 bg-red-50' 
                          : issue.type === 'warning' 
                          ? 'border-amber-500 bg-amber-50' 
                          : 'border-blue-500 bg-blue-50'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs font-medium">
                                {issue.category}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {issue.dmccSection}
                              </Badge>
                            </div>
                            <h4 className="font-semibold text-gray-900 mb-2">{issue.description}</h4>
                            <p className="text-sm text-gray-700">{issue.solution}</p>
                          </div>
                          <Badge className={
                            issue.type === 'critical' 
                              ? 'bg-red-100 text-red-800 border-red-200' 
                              : issue.type === 'warning' 
                              ? 'bg-amber-100 text-amber-800 border-amber-200' 
                              : 'bg-blue-100 text-blue-800 border-blue-200'
                          }>
                            {issue.type.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {complianceResult.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Analysis Details */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Analysis Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3 text-gray-900">Environmental Claims Found</h4>
                    <div className="flex flex-wrap gap-2">
                      {complianceResult.analysisDetails.claimsFound.map((claim, index) => (
                        <Badge key={index} variant="secondary" className="mb-1">
                          {claim}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3 text-gray-900">Compliance Metrics</h4>
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

        {/* DMCC Act Info */}
        <Card className="bg-blue-50 border-blue-200 shadow-lg">
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
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                <span>Environmental claims must be substantiated with credible evidence</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                <span>Claims must be clear, specific, and not misleading to consumers</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                <span>Evidence supporting claims must be readily accessible to consumers</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                <span>Vague terms like "eco-friendly" require specific qualification</span>
              </li>
            </ul>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}