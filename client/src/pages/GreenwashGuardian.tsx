import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  };

  const handleContinue = () => {
    if (currentStep === 1 && selectedContentType) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
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
    <div className="space-y-8">
      <div className="max-w-4xl mx-auto px-4">
        
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

            <div className="flex justify-between pt-8">
              <Button 
                variant="outline" 
                onClick={handleBack}
                disabled={currentStep === 1}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
              
              <Button 
                onClick={handleContinue}
                disabled={!selectedContentType}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Analysis Results (placeholder for now) */}
        {currentStep === 2 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Analysis Complete</h1>
              <p className="text-lg text-gray-600">Content type selected: {selectedContentType}</p>
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
            </div>
          </div>
        )}

      </div>
    </div>
  );
}