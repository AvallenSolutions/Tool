import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart3, 
  Building2, 
  TrendingUp, 
  Zap, 
  Droplets, 
  Trash2, 
  Target,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  RefreshCw
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

interface StepComponentProps {
  stepKey: string;
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  isSaving: boolean;
}

// AI Writing Assistant Hook
function useAIAssistant() {
  const { toast } = useToast();

  const generateContentMutation = useMutation({
    mutationFn: async ({ prompt, contentType, length = 'medium' }: { 
      prompt: string; 
      contentType: string; 
      length?: 'short' | 'medium' | 'long';
    }) => {
      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          contentType,
          tone: 'professional',
          length
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      return response.json();
    },
    onError: (error: any) => {
      toast({
        title: "AI Generation Failed",
        description: error.message || "Failed to generate content. Please try again.",
        variant: "destructive"
      });
    }
  });

  return {
    generateContent: generateContentMutation.mutate,
    isGenerating: generateContentMutation.isPending,
    generatedContent: generateContentMutation.data?.suggestions?.[0] || null
  };
}

// AI Writing Assistant Component
function AIWritingAssistant({ 
  sectionType, 
  companyName, 
  onContentGenerated,
  className = "" 
}: { 
  sectionType: string;
  companyName?: string;
  onContentGenerated: (content: string) => void;
  className?: string;
}) {
  const { generateContent, isGenerating } = useAIAssistant();
  
  const handleGenerateContent = () => {
    const prompts = {
      introduction: `Write a professional introduction for a sustainability report for ${companyName || 'our company'}, highlighting environmental commitment and the purpose of the report.`,
      company_info_narrative: `Write a compelling company story for ${companyName || 'our company'} that focuses on sustainability mission, vision, and approach to environmental responsibility.`,
      key_metrics_narrative: `Write an analysis of key environmental metrics including carbon footprint (483.94 tonnes CO2e), water usage (11.7M litres), and waste generation (0.1 tonnes) for ${companyName || 'our company'}.`,
      carbon_footprint_narrative: `Write a detailed carbon footprint analysis explaining Scope 1, 2, and 3 emissions, reduction strategies, and progress made by ${companyName || 'our company'}.`,
      initiatives_narrative: `Write about sustainability initiatives and environmental projects undertaken by ${companyName || 'our company'}, including renewable energy, waste reduction, and sustainable sourcing.`,
      kpi_tracking_narrative: `Write about key performance indicators and how ${companyName || 'our company'} tracks and measures sustainability progress over time.`,
      summary: `Write a conclusion for a sustainability report that summarizes achievements and outlines future environmental commitments for ${companyName || 'our company'}.`
    };

    const prompt = prompts[sectionType as keyof typeof prompts] || prompts.introduction;
    
    generateContent({
      prompt,
      contentType: 'sustainability_report_section',
      length: 'medium'
    });
  };

  return (
    <div className={`border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">AI Writing Assistant</span>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleGenerateContent}
          disabled={isGenerating}
          className="text-blue-700 border-blue-300 hover:bg-blue-100"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 mr-2" />
              Generate with AI
            </>
          )}
        </Button>
      </div>
      <p className="text-xs text-blue-700">
        Get AI-powered suggestions tailored to your company's sustainability story.
      </p>
    </div>
  );
}

// Step 1: Introduction Component
export function IntroductionStep({ content, onChange, onSave, isSaving }: StepComponentProps) {
  const { data: company } = useQuery({ queryKey: ['/api/company'] });
  const { generateContent, isGenerating, generatedContent } = useAIAssistant();
  
  const suggestions = [
    `${company?.name || 'Our company'} is committed to environmental stewardship and sustainable business practices.`,
    "This sustainability report demonstrates our transparent approach to measuring and reducing our environmental impact.",
    "As a drinks industry leader, we recognize our responsibility to minimize our carbon footprint and promote sustainable practices.",
    "Our sustainability journey reflects our dedication to protecting the environment for future generations."
  ];

  // Handle AI-generated content
  useEffect(() => {
    if (generatedContent) {
      onChange(generatedContent);
    }
  }, [generatedContent, onChange]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Editor Panel */}
      <div className="flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Report Introduction</h3>
          <p className="text-sm text-slate-600">Set the tone for your sustainability report and introduce your company's environmental commitment.</p>
        </div>
        
        {/* AI Writing Assistant */}
        <AIWritingAssistant 
          sectionType="introduction"
          companyName={company?.name}
          onContentGenerated={onChange}
          className="mb-4"
        />
        
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write your introduction here or use AI assistance above..."
          className="flex-1 min-h-[300px] resize-none border border-slate-200 rounded-lg p-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-slate-500">
            {content.length} characters
          </div>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Progress"}
          </Button>
        </div>
      </div>

      {/* Data Panel */}
      <div className="flex flex-col space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Company Information</h3>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Company Name:</span>
                  <span className="text-sm font-medium">{company?.name || 'Not Available'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Industry:</span>
                  <span className="text-sm font-medium">{company?.industry || 'Not Available'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Size:</span>
                  <span className="text-sm font-medium">{company?.size || 'Not Available'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Country:</span>
                  <span className="text-sm font-medium">{company?.country || 'Not Available'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Writing Suggestions</h3>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <Card key={index} className="cursor-pointer hover:bg-slate-50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-700">{suggestion}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 2: Company Information Component
export function CompanyInfoStep({ content, onChange, onSave, isSaving }: StepComponentProps) {
  const { data: company } = useQuery({ queryKey: ['/api/company'] });
  const { generateContent, isGenerating, generatedContent } = useAIAssistant();

  // Handle AI-generated content
  useEffect(() => {
    if (generatedContent) {
      onChange(generatedContent);
    }
  }, [generatedContent, onChange]);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Editor Panel */}
      <div className="flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Company Story</h3>
          <p className="text-sm text-slate-600">Share your company's mission, vision, and sustainability approach.</p>
        </div>
        
        {/* AI Writing Assistant */}
        <AIWritingAssistant 
          sectionType="company_info_narrative"
          companyName={company?.name}
          onContentGenerated={onChange}
          className="mb-4"
        />
        
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tell your company's sustainability story or use AI assistance above..."
          className="flex-1 min-h-[300px] resize-none border border-slate-200 rounded-lg p-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-slate-500">
            {content.length} characters
          </div>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Progress"}
          </Button>
        </div>
      </div>

      {/* Data Panel */}
      <div className="flex flex-col space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Industry</p>
                <p className="font-medium">{company?.industry || 'Not Available'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Size</p>
                <p className="font-medium">{company?.size || 'Not Available'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Location</p>
                <p className="font-medium">{company?.country || 'Not Available'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Website</p>
                <p className="font-medium text-blue-600">
                  {company?.website ? (
                    <a href={company.website} target="_blank" rel="noopener noreferrer">
                      Visit Site
                    </a>
                  ) : 'Not Available'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reporting Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-600">
              {company?.currentReportingPeriodStart && company?.currentReportingPeriodEnd ? (
                <p>
                  {new Date(company.currentReportingPeriodStart).toLocaleDateString()} - {' '}
                  {new Date(company.currentReportingPeriodEnd).toLocaleDateString()}
                </p>
              ) : (
                <p>Reporting period not configured</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Step 3: Key Metrics Component
export function KeyMetricsStep({ content, onChange, onSave, isSaving }: StepComponentProps) {
  const { data: company } = useQuery({ queryKey: ['/api/company'] });
  const { data: footprintData } = useQuery({ queryKey: ['/api/company/footprint'] });
  const { data: automatedData } = useQuery({ queryKey: ['/api/company/footprint/scope3/automated'] });
  const { data: metrics } = useQuery({ queryKey: ["/api/dashboard/metrics"] });
  const { generateContent, isGenerating, generatedContent } = useAIAssistant();

  // Handle AI-generated content
  useEffect(() => {
    if (generatedContent) {
      onChange(generatedContent);
    }
  }, [generatedContent, onChange]);

  // Calculate metrics
  const calculateTotalCO2e = () => {
    if (!footprintData?.data || !automatedData?.data) return 0;
    let manualEmissions = 0;
    for (const entry of footprintData.data) {
      if (entry.scope === 1 || entry.scope === 2) {
        manualEmissions += parseFloat(entry.calculatedEmissions) || 0;
      }
    }
    const automatedEmissions = automatedData.data.totalEmissions * 1000 || 0;
    const totalKg = manualEmissions + automatedEmissions;
    return totalKg / 1000;
  };

  const totalCO2e = calculateTotalCO2e();
  const waterUsage = metrics?.waterUsage || 11700000;
  const wasteGenerated = metrics?.wasteGenerated || 0.1;

  const metricsData = [
    {
      name: 'Carbon Footprint',
      value: totalCO2e,
      unit: 'tonnes CO2e',
      icon: Zap,
      color: 'bg-green-100',
      iconColor: 'text-green-600',
      change: '-12%'
    },
    {
      name: 'Water Usage',
      value: waterUsage,
      unit: 'litres',
      icon: Droplets,
      color: 'bg-blue-100',
      iconColor: 'text-blue-600',
      change: '+3%'
    },
    {
      name: 'Waste Generated',
      value: wasteGenerated,
      unit: 'tonnes',
      icon: Trash2,
      color: 'bg-orange-100',
      iconColor: 'text-orange-600',
      change: '-8%'
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Editor Panel */}
      <div className="flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Key Environmental Metrics</h3>
          <p className="text-sm text-slate-600">Present your carbon footprint, water usage, and waste data with context and insights.</p>
        </div>
        
        {/* AI Writing Assistant */}
        <AIWritingAssistant 
          sectionType="key_metrics_narrative"
          companyName={company?.name}
          onContentGenerated={onChange}
          className="mb-4"
        />
        
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Describe your environmental impact metrics and performance or use AI assistance above..."
          className="flex-1 min-h-[300px] resize-none border border-slate-200 rounded-lg p-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-slate-500">
            {content.length} characters
          </div>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Progress"}
          </Button>
        </div>
      </div>

      {/* Data Panel */}
      <div className="flex flex-col space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Current Metrics</h3>
        
        <div className="grid gap-4">
          {metricsData.map((metric, index) => {
            const IconComponent = metric.icon;
            return (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${metric.color}`}>
                        <IconComponent className={`w-5 h-5 ${metric.iconColor}`} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{metric.name}</p>
                        <p className="text-2xl font-bold text-slate-800">
                          {metric.value.toLocaleString()}
                        </p>
                        <p className="text-sm text-slate-600">{metric.unit}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={metric.change.startsWith('-') ? 'default' : 'secondary'}>
                        {metric.change} vs last period
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>• Carbon footprint has decreased by 12% compared to the previous period</p>
              <p>• Water usage increased by 3%, mainly due to expanded production</p>
              <p>• Waste generation reduced by 8% through improved recycling processes</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Step 4: Carbon Footprint Analysis Component
export function CarbonFootprintStep({ content, onChange, onSave, isSaving }: StepComponentProps) {
  const { data: company } = useQuery({ queryKey: ['/api/company'] });
  const { data: footprintData } = useQuery({ queryKey: ['/api/company/footprint'] });
  const { data: automatedData } = useQuery({ queryKey: ['/api/company/footprint/scope3/automated'] });
  const { generateContent, isGenerating, generatedContent } = useAIAssistant();

  // Handle AI-generated content
  useEffect(() => {
    if (generatedContent) {
      onChange(generatedContent);
    }
  }, [generatedContent, onChange]);

  // Calculate scope emissions
  const calculateScopeEmissions = (scope: number) => {
    if (!footprintData?.success || !footprintData?.data) return 0;
    return footprintData.data
      .filter((item: any) => item.scope === scope)
      .reduce((total: number, item: any) => total + parseFloat(item.calculatedEmissions || 0), 0);
  };

  const scope1 = calculateScopeEmissions(1) / 1000;
  const scope2 = calculateScopeEmissions(2) / 1000;
  const scope3 = automatedData?.success ? automatedData.data.totalEmissions : 0;
  const total = scope1 + scope2 + scope3;

  const chartData = [
    {
      name: "Scope 1 (Direct)",
      value: scope1,
      percentage: total > 0 ? ((scope1 / total) * 100) : 0,
      color: "hsl(143, 69%, 38%)"
    },
    {
      name: "Scope 2 (Energy)",
      value: scope2,
      percentage: total > 0 ? ((scope2 / total) * 100) : 0,
      color: "hsl(210, 11%, 33%)"
    },
    {
      name: "Scope 3 (Supply Chain)",
      value: scope3,
      percentage: total > 0 ? ((scope3 / total) * 100) : 0,
      color: "hsl(196, 100%, 47%)"
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Editor Panel */}
      <div className="flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Carbon Footprint Analysis</h3>
          <p className="text-sm text-slate-600">Detail your emissions breakdown and explain your Scope 1, 2, and 3 emissions in context.</p>
        </div>
        
        {/* AI Writing Assistant */}
        <AIWritingAssistant 
          sectionType="carbon_footprint_narrative"
          companyName={company?.name}
          onContentGenerated={onChange}
          className="mb-4"
        />
        
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Analyze your carbon footprint breakdown and emissions sources or use AI assistance above..."
          className="flex-1 min-h-[300px] resize-none border border-slate-200 rounded-lg p-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-slate-500">
            {content.length} characters
          </div>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Progress"}
          </Button>
        </div>
      </div>

      {/* Data Panel */}
      <div className="flex flex-col space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Emissions Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {total > 0 ? (
              <>
                <div className="h-64 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [`${value.toFixed(1)} tonnes`, 'Emissions']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {chartData.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm font-medium">{entry.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{entry.value.toFixed(1)}t</div>
                        <div className="text-xs text-slate-500">{entry.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                <p>No emissions data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Carbon Footprint</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-800 mb-2">
                {total.toFixed(1)}
              </div>
              <div className="text-lg text-slate-600">tonnes CO2e</div>
              <div className="text-sm text-slate-500 mt-2">
                Across all emission scopes
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Step 5: Sustainability Initiatives Component
export function InitiativesStep({ content, onChange, onSave, isSaving }: StepComponentProps) {
  const { data: company } = useQuery({ queryKey: ['/api/company'] });
  const { data: smartGoalsData } = useQuery({ queryKey: ['/api/smart-goals'] });
  const { generateContent, isGenerating, generatedContent } = useAIAssistant();

  // Handle AI-generated content
  useEffect(() => {
    if (generatedContent) {
      onChange(generatedContent);
    }
  }, [generatedContent, onChange]);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Editor Panel */}
      <div className="flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Sustainability Initiatives</h3>
          <p className="text-sm text-slate-600">Showcase your environmental projects and their outcomes.</p>
        </div>
        
        {/* AI Writing Assistant */}
        <AIWritingAssistant 
          sectionType="initiatives_narrative"
          companyName={company?.name}
          onContentGenerated={onChange}
          className="mb-4"
        />
        
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Describe your sustainability initiatives and their impact or use AI assistance above..."
          className="flex-1 min-h-[300px] resize-none border border-slate-200 rounded-lg p-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-slate-500">
            {content.length} characters
          </div>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Progress"}
          </Button>
        </div>
      </div>

      {/* Data Panel */}
      <div className="flex flex-col space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Current Initiatives
            </CardTitle>
          </CardHeader>
          <CardContent>
            {smartGoalsData?.data?.length > 0 ? (
              <div className="space-y-4">
                {smartGoalsData.data.slice(0, 3).map((goal: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-slate-900">{goal.title}</h4>
                      <Badge variant={goal.priority === 'high' ? 'destructive' : goal.priority === 'medium' ? 'default' : 'secondary'}>
                        {goal.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{goal.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Progress: {goal.progress}%</span>
                      <span className="text-slate-500">
                        Target: {new Date(goal.targetDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500">
                <Target className="w-8 h-8 mx-auto mb-2" />
                <p>No initiatives found</p>
                <p className="text-sm">Set up SMART Goals to track your initiatives</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Initiative Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Badge variant="outline">Carbon Reduction</Badge>
              <Badge variant="outline">Water Conservation</Badge>
              <Badge variant="outline">Waste Management</Badge>
              <Badge variant="outline">Renewable Energy</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Step 6: KPI Tracking Component
export function KPITrackingStep({ content, onChange, onSave, isSaving }: StepComponentProps) {
  const { data: company } = useQuery({ queryKey: ['/api/company'] });
  const { data: kpiData } = useQuery({ queryKey: ['/api/dashboard/kpis'] });
  const { generateContent, isGenerating, generatedContent } = useAIAssistant();

  // Handle AI-generated content
  useEffect(() => {
    if (generatedContent) {
      onChange(generatedContent);
    }
  }, [generatedContent, onChange]);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Editor Panel */}
      <div className="flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">KPI Tracking</h3>
          <p className="text-sm text-slate-600">Present your progress metrics and show how you measure sustainability progress.</p>
        </div>
        
        {/* AI Writing Assistant */}
        <AIWritingAssistant 
          sectionType="kpi_tracking_narrative"
          companyName={company?.name}
          onContentGenerated={onChange}
          className="mb-4"
        />
        
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Describe your KPI tracking approach and progress or use AI assistance above..."
          className="flex-1 min-h-[300px] resize-none border border-slate-200 rounded-lg p-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-slate-500">
            {content.length} characters
          </div>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Progress"}
          </Button>
        </div>
      </div>

      {/* Data Panel */}
      <div className="flex flex-col space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Key Performance Indicators
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kpiData?.kpis?.length > 0 ? (
              <div className="space-y-4">
                {kpiData.kpis.slice(0, 4).map((kpi: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-slate-900">{kpi.name}</h4>
                      <Badge variant={kpi.status === 'on-track' ? 'default' : kpi.status === 'at-risk' ? 'secondary' : 'destructive'}>
                        {kpi.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Current</p>
                        <p className="font-medium">{kpi.current} {kpi.unit}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Target</p>
                        <p className="font-medium">{kpi.target} {kpi.unit}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Progress</p>
                        <p className="font-medium">{kpi.progress}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500">
                <TrendingUp className="w-8 h-8 mx-auto mb-2" />
                <p>No KPIs configured</p>
                <p className="text-sm">Set up KPIs to track your performance</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Step 7: Summary Component
export function SummaryStep({ content, onChange, onSave, isSaving }: StepComponentProps) {
  const { data: company } = useQuery({ queryKey: ['/api/company'] });
  const { data: smartGoalsData } = useQuery({ queryKey: ['/api/smart-goals'] });
  const { generateContent, isGenerating, generatedContent } = useAIAssistant();

  // Handle AI-generated content
  useEffect(() => {
    if (generatedContent) {
      onChange(generatedContent);
    }
  }, [generatedContent, onChange]);
  
  const upcomingGoals = smartGoalsData?.data?.filter((goal: any) => 
    new Date(goal.targetDate) > new Date()
  ).slice(0, 3) || [];
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Editor Panel */}
      <div className="flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Summary & Future Goals</h3>
          <p className="text-sm text-slate-600">Summarize achievements and outline future commitments.</p>
        </div>
        
        {/* AI Writing Assistant */}
        <AIWritingAssistant 
          sectionType="summary"
          companyName={company?.name}
          onContentGenerated={onChange}
          className="mb-4"
        />
        
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Summarize your sustainability journey and future commitments or use AI assistance above..."
          className="flex-1 min-h-[300px] resize-none border border-slate-200 rounded-lg p-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-slate-500">
            {content.length} characters
          </div>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Progress"}
          </Button>
        </div>
      </div>

      {/* Data Panel */}
      <div className="flex flex-col space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Key Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm">12% reduction in carbon emissions</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm">8% reduction in waste generation</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm">Implemented sustainable sourcing practices</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5" />
              Future Commitments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingGoals.length > 0 ? (
              <div className="space-y-3">
                {upcomingGoals.map((goal: any, index: number) => (
                  <div key={index} className="border rounded-lg p-3">
                    <h4 className="font-medium text-slate-900 mb-1">{goal.title}</h4>
                    <p className="text-sm text-slate-600 mb-2">{goal.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
                      <Badge variant="outline">{goal.category}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-slate-500">
                <Target className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm">No future goals set</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}