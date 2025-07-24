import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Globe, 
  FileText, 
  Upload,
  Bot,
  MessageCircle,
  Loader2,
  Info,
  Eye,
  Star
} from "lucide-react";

// Original GreenwashGuardian interfaces
interface ComplianceFinding {
  riskLevel: 'green' | 'amber' | 'red';
  claim: string;
  issue?: string;
  suggestion?: string;
  violationRisk: number;
  dmccSection?: string;
}

interface AnalysisResult {
  overallRisk: 'low' | 'medium' | 'high';
  riskScore: number;
  findings: ComplianceFinding[];
  summary: string;
}

export default function GreenwashGuardian() {
  const [activeTab, setActiveTab] = useState("guided");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [marketingText, setMarketingText] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async (data: { type: 'website' | 'text' | 'file'; content: string }) => {
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
      // Convert to original format
      const findings: ComplianceFinding[] = result.issues.map((issue: any) => ({
        riskLevel: issue.type === 'critical' ? 'red' : issue.type === 'warning' ? 'amber' : 'green',
        claim: issue.category,
        issue: issue.description,
        suggestion: issue.solution,
        violationRisk: issue.type === 'critical' ? 80 : issue.type === 'warning' ? 50 : 20,
        dmccSection: issue.dmccSection
      }));

      setAnalysisResult({
        overallRisk: result.status === 'compliant' ? 'low' : result.status === 'warning' ? 'medium' : 'high',
        riskScore: result.score,
        findings,
        summary: result.recommendations.join(' ')
      });
    }
  });

  const handleAnalysis = () => {
    if (activeTab === "guided" && websiteUrl.trim()) {
      analyzeMutation.mutate({ type: 'website', content: websiteUrl });
    } else if (activeTab === "url" && websiteUrl.trim()) {
      analyzeMutation.mutate({ type: 'website', content: websiteUrl });
    } else if (activeTab === "text" && marketingText.trim()) {
      analyzeMutation.mutate({ type: 'text', content: marketingText });
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getFindingColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'green': return 'bg-green-500';
      case 'amber': return 'bg-amber-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-green-600 p-4 rounded-full mr-4">
              <Shield className="w-12 h-12 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-5xl font-bold text-gray-900 mb-2">DMCC 2024</h1>
              <h2 className="text-3xl font-semibold text-gray-700">Compliance Evaluator</h2>
            </div>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Evaluate your environmental claims against the UK's Digital Markets, Competition and Consumers Act 2024
          </p>
          <div className="mt-6 inline-flex items-center px-6 py-3 bg-blue-100 rounded-full">
            <Bot className="w-5 h-5 text-blue-600 mr-3" />
            <span className="text-lg font-medium text-blue-800">Powered by The Guided Assistant</span>
          </div>
        </div>

        {/* Main Interface */}
        <Card className="mb-8 shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center text-2xl">
              <MessageCircle className="w-8 h-8 mr-4" />
              The Guided Assistant
            </CardTitle>
            <p className="text-blue-100 mt-2">Let me help you evaluate your environmental claims step by step</p>
          </CardHeader>
          <CardContent className="p-8">
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="guided" className="flex items-center gap-2 text-lg py-3">
                  <Bot className="w-5 h-5" />
                  Guided Analysis
                </TabsTrigger>
                <TabsTrigger value="url" className="flex items-center gap-2 text-lg py-3">
                  <Globe className="w-5 h-5" />
                  Website Scanner
                </TabsTrigger>
                <TabsTrigger value="text" className="flex items-center gap-2 text-lg py-3">
                  <FileText className="w-5 h-5" />
                  Text Analysis
                </TabsTrigger>
              </TabsList>

              <TabsContent value="guided" className="space-y-8">
                <div className="bg-gradient-to-r from-blue-50 to-green-50 p-8 rounded-xl">
                  <div className="flex items-start gap-6">
                    <div className="bg-white p-4 rounded-full">
                      <Bot className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">Hi! I'm your DMCC Compliance Assistant</h3>
                      <p className="text-gray-700 text-lg leading-relaxed mb-6">
                        I'll help you evaluate your environmental claims against the new UK regulations. 
                        Let's start by analyzing your website or marketing materials.
                      </p>
                      
                      <div className="space-y-4">
                        <Label htmlFor="guided-url" className="text-lg font-medium text-gray-800">
                          What's your website URL?
                        </Label>
                        <Input
                          id="guided-url"
                          placeholder="https://your-company.com"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          className="text-lg py-4 px-6 border-2 border-gray-200 focus:border-blue-500"
                        />
                        
                        <Button 
                          onClick={handleAnalysis}
                          disabled={analyzeMutation.isPending || !websiteUrl.trim()}
                          className="w-full mt-6 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white py-4 text-lg font-semibold"
                        >
                          {analyzeMutation.isPending ? (
                            <>
                              <Loader2 className="w-6 h-6 animate-spin mr-3" />
                              Analyzing your website...
                            </>
                          ) : (
                            <>
                              <Eye className="w-6 h-6 mr-3" />
                              Start Guided Analysis
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="url" className="space-y-6">
                <div className="space-y-4">
                  <Label htmlFor="website-url" className="text-xl font-medium">Website URL Analysis</Label>
                  <p className="text-gray-600">Enter your website URL for comprehensive scanning</p>
                  <Input
                    id="website-url"
                    placeholder="https://example.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="text-lg py-4 px-6"
                  />
                  <Button 
                    onClick={handleAnalysis}
                    disabled={analyzeMutation.isPending || !websiteUrl.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg"
                  >
                    {analyzeMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-3" />
                        Scanning Website...
                      </>
                    ) : (
                      <>
                        <Globe className="w-5 h-5 mr-3" />
                        Scan Website
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="text" className="space-y-6">
                <div className="space-y-4">
                  <Label htmlFor="marketing-text" className="text-xl font-medium">Marketing Text Analysis</Label>
                  <p className="text-gray-600">Paste your marketing copy, product descriptions, or environmental claims</p>
                  <Textarea
                    id="marketing-text"
                    placeholder="Enter your marketing text here..."
                    value={marketingText}
                    onChange={(e) => setMarketingText(e.target.value)}
                    rows={10}
                    className="text-lg py-4 px-6 min-h-[200px]"
                  />
                  <Button 
                    onClick={handleAnalysis}
                    disabled={analyzeMutation.isPending || !marketingText.trim()}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg"
                  >
                    {analyzeMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-3" />
                        Analyzing Text...
                      </>
                    ) : (
                      <>
                        <FileText className="w-5 h-5 mr-3" />
                        Analyze Text
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Results Section */}
        {analysisResult && (
          <div className="space-y-8">
            
            {/* Overall Risk Assessment */}
            <Card className="shadow-xl">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className={`inline-block w-32 h-32 rounded-full ${getRiskColor(analysisResult.overallRisk)} border-4 flex items-center justify-center mb-6`}>
                    <div className="text-center">
                      <div className="text-3xl font-bold">{analysisResult.riskScore}</div>
                      <div className="text-sm font-medium">/ 100</div>
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">
                    {analysisResult.overallRisk === 'low' ? 'Low Risk' : 
                     analysisResult.overallRisk === 'medium' ? 'Medium Risk' : 'High Risk'}
                  </h3>
                  <p className="text-xl text-gray-600 max-w-2xl mx-auto">{analysisResult.summary}</p>
                  <Progress value={analysisResult.riskScore} className="mt-6 h-4" />
                </div>
              </CardContent>
            </Card>



            {/* Individual Findings */}
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <AlertTriangle className="w-7 h-7 text-amber-600" />
                  Detailed Findings ({analysisResult.findings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {analysisResult.findings.map((finding, index) => (
                    <div key={index} className="border-l-4 border-gray-200 pl-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${getFindingColor(finding.riskLevel)}`}></div>
                          <h4 className="text-lg font-semibold text-gray-900">{finding.claim}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{finding.dmccSection}</Badge>
                          <Badge className={`${getFindingColor(finding.riskLevel)} text-white`}>
                            {finding.violationRisk}% Risk
                          </Badge>
                        </div>
                      </div>
                      {finding.issue && (
                        <p className="text-gray-700 mb-2"><strong>Issue:</strong> {finding.issue}</p>
                      )}
                      {finding.suggestion && (
                        <p className="text-gray-700"><strong>Suggestion:</strong> {finding.suggestion}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer Info */}
        <Card className="mt-12 bg-slate-50 border-slate-200">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <Info className="w-6 h-6 text-slate-600 mr-2" />
                <span className="text-lg font-medium text-slate-800">About DMCC Act 2024</span>
              </div>
              <p className="text-slate-600 max-w-4xl mx-auto leading-relaxed">
                The Digital Markets, Competition and Consumers Act 2024 strengthens consumer protection 
                by requiring environmental claims to be substantiated with credible evidence, clear and specific, 
                and not misleading to consumers. Violations can result in significant penalties.
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}