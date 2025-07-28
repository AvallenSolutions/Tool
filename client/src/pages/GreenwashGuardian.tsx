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
  ArrowRight,
  Share,
  Download
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
      const findings: ComplianceFinding[] = (result.issues || []).map((issue: any) => ({
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
          <>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Side - Analysis Results */}
            <div className="lg:col-span-3 space-y-6">
              {/* DMCC Act Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <h3 className="font-semibold text-blue-900">DMCC Act Now Active</h3>
                </div>
                <p className="text-sm text-blue-800">
                  The consumer protection provisions came into force on 6 April 2025. CMA can now fine up to 10% of global turnover for misleading environmental claims.
                </p>
              </div>

              {/* Compliance Analysis Results Header */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Compliance Analysis Results</h2>
                      <p className="text-sm text-gray-600 mt-1">{websiteUrl || 'Content analysis'}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Button variant="outline" size="sm" className="flex items-center space-x-2">
                        <Share className="w-4 h-4" />
                        <span>Share</span>
                      </Button>
                      <Button variant="outline" size="sm" className="flex items-center space-x-2 bg-green-600 text-white hover:bg-green-700">
                        <Download className="w-4 h-4" />
                        <span>Download Report</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Overall Risk Assessment */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Risk Assessment</h3>
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600">MEDIUM RISK</div>
                      <div className="text-lg text-amber-600">({analysisResult.riskScore}%)</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span className="text-sm text-gray-600">Low Risk</span>
                        <div className="w-3 h-3 bg-amber-500 rounded ml-4"></div>
                        <span className="text-sm text-gray-600">Medium Risk</span>
                        <div className="w-3 h-3 bg-red-500 rounded ml-4"></div>
                        <span className="text-sm text-gray-600">High Risk</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-amber-500 h-2 rounded-full" style={{width: `${analysisResult.riskScore}%`}}></div>
                      </div>
                    </div>
                  </div>

                  {/* Risk Breakdown */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="w-8 h-8 bg-green-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">GREEN</span>
                      </div>
                      <div className="text-xs text-gray-600 mb-1">Compliant claims with proper substantiation</div>
                      <div className="text-2xl font-bold text-green-600">
                        {analysisResult.findings.filter(f => f.riskLevel === 'green').length}
                      </div>
                    </div>
                    
                    <div className="text-center p-4 bg-amber-50 rounded-lg">
                      <div className="w-8 h-8 bg-amber-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                        <span className="text-white font-semibold text-xs">AMBER</span>
                      </div>
                      <div className="text-xs text-gray-600 mb-1">Requires clarification or additional evidence</div>
                      <div className="text-2xl font-bold text-amber-600">
                        {analysisResult.findings.filter(f => f.riskLevel === 'amber').length}
                      </div>
                    </div>
                    
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="w-8 h-8 bg-red-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">RED</span>
                      </div>
                      <div className="text-xs text-gray-600 mb-1">Potentially misleading claims requiring immediate attention</div>
                      <div className="text-2xl font-bold text-red-600">
                        {analysisResult.findings.filter(f => f.riskLevel === 'red').length}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Findings */}
                  <div className="space-y-4">
                    {analysisResult.findings.map((finding, index) => (
                      <div key={index} className={`border-l-4 bg-white rounded-r-lg shadow-sm border ${
                        finding.riskLevel === 'red' ? 'border-l-red-500 border-red-100' : 
                        finding.riskLevel === 'amber' ? 'border-l-amber-500 border-amber-100' : 
                        'border-l-green-500 border-green-100'
                      }`}>
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className={`${
                                finding.riskLevel === 'red' ? 'text-red-700 border-red-300' : 
                                finding.riskLevel === 'amber' ? 'text-amber-700 border-amber-300' : 
                                'text-green-700 border-green-300'
                              }`}>
                                {finding.riskLevel === 'red' ? 'HIGH RISK' : 
                                 finding.riskLevel === 'amber' ? 'MEDIUM RISK' : 
                                 'LOW RISK'}
                              </Badge>
                              <span className="text-sm font-medium text-gray-900">{finding.claim}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-500">Violation Risk</div>
                              <div className="font-semibold text-sm">{finding.violationRisk}%</div>
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-700 mb-3">
                            {finding.issue}
                          </div>
                          
                          {finding.suggestion && (
                            <div className="bg-gray-50 rounded p-3 mb-3">
                              <div className="text-xs font-medium text-gray-600 mb-1">RECOMMENDED ACTION</div>
                              <div className="text-sm text-gray-700">{finding.suggestion}</div>
                            </div>
                          )}
                          
                          {finding.dmccSection && (
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">DMCC Reference:</span> {finding.dmccSection}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* DMCC 2024 Quick Reference */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-4">DMCC 2024 Quick Reference</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-red-600 mb-1">Maximum Penalties</h4>
                    <p className="text-xs text-gray-600">Up to 10% of global turnover for consumer protection breaches</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-blue-600 mb-1">Enforcement Active</h4>
                    <p className="text-xs text-gray-600">CMA can investigate and fine directly without court proceedings</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-green-600 mb-1">Green Claims Code</h4>
                    <p className="text-xs text-gray-600">6 core principles: truthful, clear, substantiated, comparable, consider full lifecycle, meaningful</p>
                  </div>
                </div>
              </div>

              {/* Recent Analysis */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Recent Analysis</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    <span className="text-gray-600">https://avallenspirits.com</span>
                  </div>
                  <div className="text-xs text-gray-500">Just now</div>
                </div>
              </div>

              {/* Expert Review Call-to-Action */}
              <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                <h3 className="font-semibold text-green-900 mb-2">Need Expert Review?</h3>
                <p className="text-sm text-green-800 mb-3">Get professional compliance consulting from our sustainability experts.</p>
                <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white">
                  Contact Avallen Solutions
                </Button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 flex justify-between pt-8">
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
          </>
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