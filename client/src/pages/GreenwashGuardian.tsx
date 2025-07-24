import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Globe, 
  FileText, 
  Package,
  Share2,
  Loader2,
  ArrowLeft,
  ArrowRight
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

type ContentType = 'marketing' | 'website' | 'product' | 'social' | null;

export default function GreenwashGuardian() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedContentType, setSelectedContentType] = useState<ContentType>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [contentToAnalyze, setContentToAnalyze] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

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
      // Convert backend issues to frontend findings format
      const findings: ComplianceFinding[] = result.issues.map((issue: any) => ({
        riskLevel: issue.type === 'critical' ? 'red' : issue.type === 'warning' ? 'amber' : 'green',
        claim: issue.claim || issue.category,
        issue: issue.description,
        suggestion: issue.solution,
        violationRisk: issue.violationRisk || (issue.type === 'critical' ? 80 : issue.type === 'warning' ? 50 : 20),
        dmccSection: issue.dmccSection
      }));

      const analysisData: AnalysisResult = {
        overallRisk: result.status === 'compliant' ? 'low' as const : 
                     result.status === 'warning' ? 'medium' as const : 'high' as const,
        riskScore: result.score,
        findings,
        summary: result.recommendations.join('. ')
      };
      
      setAnalysisResult(analysisData);
      setCurrentStep(3);
    }
  });

  const contentTypes = [
    {
      id: 'marketing' as ContentType,
      title: 'Marketing Material',
      description: 'Advertisements, brochures, promotional content',
      icon: FileText,
      features: [
        'Focus on specific, measurable claims',
        'Avoid vague terms like "eco-friendly"',
        'Include evidence for all environmental claims',
        'Ensure claims are substantiated'
      ]
    },
    {
      id: 'website' as ContentType,
      title: 'Website Content',
      description: 'Web pages, product descriptions, company information',
      icon: Globe,
      features: [
        'Check homepage and product pages for consistency',
        'Ensure claims are substantiated across all pages',
        'Review meta descriptions and page titles'
      ]
    },
    {
      id: 'product' as ContentType,
      title: 'Product Information',
      description: 'Product labels, specifications, packaging',
      icon: Package,
      features: [
        'Complete full product lifecycle',
        'Be specific about what you\'re measuring',
        'Include relevant certifications and standards'
      ]
    },
    {
      id: 'social' as ContentType,
      title: 'Social Media',
      description: 'Social posts, campaigns, digital content',
      icon: Share2,
      features: [
        'Maintain consistency with other channels',
        'Use hashtags responsibly',
        'Ensure consistency with other channels'
      ]
    }
  ];

  const handleContentTypeSelect = (type: ContentType) => {
    setSelectedContentType(type);
    // Automatically advance to next step when a content type is selected
    setCurrentStep(2);
  };

  const handleContinue = () => {
    if (currentStep === 1 && selectedContentType) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
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
    <div className="min-h-screen bg-lightest-gray flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="GreenwashGuardian" />
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
        
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 1 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
              1
            </div>
            <div className={`w-16 h-0.5 ${currentStep >= 2 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 2 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
              2
            </div>
            <div className={`w-16 h-0.5 ${currentStep >= 3 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 3 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
              3
            </div>
            <div className={`w-16 h-0.5 ${currentStep >= 4 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 4 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
              4
            </div>
          </div>
        </div>

        {/* Step 1: Content Type Selection */}
        {currentStep === 1 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">What type of content are you analyzing?</h1>
              <p className="text-lg text-gray-600">Choose the category that best matches your content. This helps me provide more relevant guidance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {contentTypes.map((type) => {
                const IconComponent = type.icon;
                const isSelected = selectedContentType === type.id;
                
                return (
                  <Card 
                    key={type.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      isSelected 
                        ? 'ring-2 ring-green-500 border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleContentTypeSelect(type.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-lg ${isSelected ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{type.title}</h3>
                          <p className="text-gray-600 mb-4">{type.description}</p>
                          <ul className="space-y-2">
                            {type.features.map((feature, index) => (
                              <li key={index} className="flex items-start text-sm text-gray-600">
                                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Navigation removed - cards are directly clickable */}
          </div>
        )}

        {/* Step 2: Content Input */}
        {currentStep === 2 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Analyze Your {contentTypes.find(t => t.id === selectedContentType)?.title}
              </h1>
              <p className="text-lg text-gray-600">
                Paste your content below for DMCC Act 2024 compliance analysis
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content to Analyze
                </label>
                <textarea
                  placeholder={`Paste your ${contentTypes.find(t => t.id === selectedContentType)?.title.toLowerCase()} content here...`}
                  value={contentToAnalyze}
                  onChange={(e) => setContentToAnalyze(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {selectedContentType === 'website' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Or enter a website URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between pt-8">
              <Button 
                variant="outline" 
                onClick={handleBack}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
              
              <Button 
                onClick={() => {
                  const analysisData = selectedContentType === 'website' && websiteUrl 
                    ? { type: 'website' as const, content: websiteUrl }
                    : { type: 'text' as const, content: contentToAnalyze };
                  
                  analyzeMutation.mutate(analysisData);
                }}
                disabled={!contentToAnalyze && !websiteUrl}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Analyze Content</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Analysis Results */}
        {currentStep === 3 && analysisResult && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Analysis Results</h1>
              <p className="text-lg text-gray-600">DMCC Act 2024 compliance assessment for your content</p>
            </div>

            {/* Overall Risk Score */}
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Overall Risk Assessment</h3>
                  <Badge className={getRiskColor(analysisResult.overallRisk)}>
                    {analysisResult.overallRisk.charAt(0).toUpperCase() + analysisResult.overallRisk.slice(1)} Risk
                  </Badge>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Compliance Score</span>
                    <span>{analysisResult.riskScore}%</span>
                  </div>
                  <Progress value={analysisResult.riskScore} className="h-2" />
                </div>
                
                <p className="text-gray-600">{analysisResult.summary}</p>
              </CardContent>
            </Card>

            {/* Detailed Findings */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Detailed Findings</h3>
              <pre className="text-xs bg-gray-100 p-2">{JSON.stringify(analysisResult.findings, null, 2)}</pre>
              {analysisResult.findings.map((finding, index) => (
                <Card key={index} className={`bg-white border-l-4 ${
                  finding.riskLevel === 'red' ? 'border-l-red-500' : 
                  finding.riskLevel === 'amber' ? 'border-l-yellow-500' : 
                  'border-l-green-500'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Badge className={`${
                          finding.riskLevel === 'red' ? 'bg-red-100 text-red-800 border-red-200' : 
                          finding.riskLevel === 'amber' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
                          'bg-green-100 text-green-800 border-green-200'
                        }`}>
                          {finding.riskLevel === 'red' ? 'RED RISK' : 
                           finding.riskLevel === 'amber' ? 'AMBER RISK' : 
                           'GREEN RISK'}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 mb-1">DMCC Violation Risk:</div>
                        <div className="font-semibold text-sm">{finding.violationRisk}%</div>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="font-medium text-gray-900 mb-2">
                        {finding.claim}
                      </div>
                      {finding.issue && (
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Issue:</span> {finding.issue}
                        </div>
                      )}
                    </div>
                    
                    {finding.suggestion && (
                      <div className="mb-3">
                        <div className="text-sm">
                          <span className="font-medium text-green-700">Suggested Edit:</span>
                          <span className="text-gray-700 ml-1">{finding.suggestion}</span>
                        </div>
                      </div>
                    )}
                    
                    {finding.dmccSection && (
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">DMCC Section:</span> {finding.dmccSection}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-between pt-8">
              <Button 
                variant="outline" 
                onClick={handleBack}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
              
              <Button 
                onClick={() => setCurrentStep(4)}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
              >
                <span>Review & Download</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Download */}
        {currentStep === 4 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Review Complete</h1>
              <p className="text-lg text-gray-600">Your compliance analysis is ready</p>
            </div>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-900 mb-2">Analysis Complete</h3>
                <p className="text-green-700 mb-4">
                  Your content has been analyzed against the DMCC Act 2024 requirements.
                </p>
                <div className="space-y-3">
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    <FileText className="w-4 h-4 mr-2" />
                    Download Compliance Report
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setCurrentStep(1);
                      setSelectedContentType(null);
                      setContentToAnalyze('');
                      setWebsiteUrl('');
                      setAnalysisResult(null);
                    }}
                  >
                    Start New Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between pt-8">
              <Button 
                variant="outline" 
                onClick={handleBack}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
            </div>
          </div>
        )}

          </div>
        </main>
      </div>
    </div>
  );
}