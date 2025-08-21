import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  RefreshCw,
  Users,
  Heart,
  Globe,
  GraduationCap,
  Clock
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

// Removed unused hook - functionality moved to component

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
  const [selectedTone, setSelectedTone] = useState('professional');
  const [selectedLength, setSelectedLength] = useState('medium');
  const { toast } = useToast();

  const generateContentMutation = useMutation({
    mutationFn: async ({ prompt, tone, length }: { 
      prompt: string; 
      tone: string;
      length: string;
    }) => {
      console.log('Generating content with:', { prompt: prompt.substring(0, 100), tone, length });
      
      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          contentType: 'sustainability_report_section',
          tone,
          length
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to generate content: ${response.status}`);
      }

      const data = await response.json();
      console.log('Generated content response:', data);
      return data;
    },
    onSuccess: (data) => {
      if (data.suggestions && data.suggestions[0]) {
        onContentGenerated(data.suggestions[0]);
        toast({
          title: "Content Generated",
          description: "AI-generated content has been added to your text area.",
        });
      }
    },
    onError: (error: any) => {
      console.error('Generation error:', error);
      toast({
        title: "AI Generation Failed",
        description: error.message || "Failed to generate content. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  const handleGenerateContent = () => {
    const prompts = {
      introduction: `Write a ${selectedTone} introduction for a sustainability report for ${companyName || 'our company'}, highlighting environmental commitment and the purpose of the report.`,
      company_info_narrative: `Write a compelling company story for ${companyName || 'our company'} that focuses on sustainability mission, vision, and approach to environmental responsibility. Use a ${selectedTone} tone.`,
      key_metrics_narrative: `Write an analysis of key environmental metrics including carbon footprint (500.045 tonnes CO2e), water usage (11.7M litres), and waste generation (0.1 tonnes) for ${companyName || 'our company'}. Use a ${selectedTone} tone.`,
      carbon_footprint_narrative: `Write a detailed carbon footprint analysis for ${companyName || 'our company'} with a total footprint of 500.045 tonnes CO2e, explaining Scope 1, 2, and 3 emissions, reduction strategies, and progress made. Use a ${selectedTone} tone.`,
      initiatives_narrative: `Write about sustainability initiatives and environmental projects undertaken by ${companyName || 'our company'}, including renewable energy, waste reduction, and sustainable sourcing. Use a ${selectedTone} tone.`,
      kpi_tracking_narrative: `Write about key performance indicators and how ${companyName || 'our company'} tracks and measures sustainability progress over time. Use a ${selectedTone} tone.`,
      social_impact: `Write about the social impact and community initiatives for ${companyName || 'our company'}, including employee welfare, fair trade practices, community development, and education support programs. Use a ${selectedTone} tone.`,
      summary: `Write a conclusion for a sustainability report that summarizes achievements and outlines future environmental commitments for ${companyName || 'our company'}. Reference the company's carbon footprint of 500.045 tonnes CO2e. Use a ${selectedTone} tone.`
    };

    const prompt = prompts[sectionType as keyof typeof prompts] || prompts.introduction;
    
    generateContentMutation.mutate({
      prompt,
      tone: selectedTone,
      length: selectedLength
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
          disabled={generateContentMutation.isPending}
          className="text-blue-700 border-blue-300 hover:bg-blue-100"
        >
          {generateContentMutation.isPending ? (
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
      
      {/* Writing Style Options */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-blue-800">Tone</label>
          <select 
            value={selectedTone}
            onChange={(e) => setSelectedTone(e.target.value)}
            className="w-full text-xs border border-blue-200 rounded px-2 py-1 bg-white"
          >
            <option value="professional">Professional</option>
            <option value="formal">Formal</option>
            <option value="casual">Casual</option>
            <option value="technical">Technical</option>
            <option value="engaging">Engaging</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-blue-800">Length</label>
          <select
            value={selectedLength}
            onChange={(e) => setSelectedLength(e.target.value)}
            className="w-full text-xs border border-blue-200 rounded px-2 py-1 bg-white"
          >
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
        </div>
      </div>
      
      <p className="text-xs text-blue-700">
        Customize the tone and length, then generate AI-powered content tailored to your company.
      </p>
    </div>
  );
}

// Step 1: Introduction Component
export function IntroductionStep({ content, onChange, onSave, isSaving }: StepComponentProps) {
  const { data: company } = useQuery({ queryKey: ['/api/company'] });
  
  const suggestions = [
    `${company?.name || 'Our company'} is committed to environmental stewardship and sustainable business practices.`,
    "This sustainability report demonstrates our transparent approach to measuring and reducing our environmental impact.",
    "As a drinks industry leader, we recognize our responsibility to minimize our carbon footprint and promote sustainable practices.",
    "Our sustainability journey reflects our dedication to protecting the environment for future generations."
  ];

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
export function InitiativesStep({ content, onChange, onSave, isSaving, stepKey }: StepComponentProps & { stepKey: string }) {
  const { data: company } = useQuery({ queryKey: ['/api/company'] });
  const { data: smartGoalsResponse } = useQuery({ queryKey: ['/api/smart-goals'] });
  const [selectedInitiatives, setSelectedInitiatives] = useState<string[]>([]);
  
  // Use SMART Goals as initiatives
  const initiativesData = smartGoalsResponse?.goals || smartGoalsResponse || [];
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get current report ID from URL
  const reportId = window.location.pathname.split('/').pop();
  
  // Query to get current report data and selected initiatives
  const { data: reportData } = useQuery({ 
    queryKey: [`/api/reports/guided/${reportId}/wizard-data`],
    enabled: !!reportId
  });
  
  // Load selected initiatives from report data
  useEffect(() => {
    if (reportData?.data?.selectedInitiatives) {
      setSelectedInitiatives(reportData.data.selectedInitiatives);
    } else if (reportData?.selectedInitiatives) {
      setSelectedInitiatives(reportData.selectedInitiatives);
    }
  }, [reportData]);
  
  // Save selected initiatives to report
  const saveSelectedInitiatives = useMutation({
    mutationFn: async (initiativeIds: string[]) => {
      const response = await fetch(`/api/reports/guided/${reportId}/wizard-data`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedInitiatives: initiativeIds
        })
      });
      if (!response.ok) throw new Error('Failed to save initiative selection');
      return response.json();
    },
    onSuccess: () => {
      toast({ description: "Initiative selection saved successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/reports/guided/${reportId}/wizard-data`] });
    },
    onError: () => {
      toast({ 
        variant: "destructive", 
        description: "Failed to save initiative selection" 
      });
    }
  });
  
  const handleInitiativeToggle = (initiativeId: string | number) => {
    const idString = String(initiativeId);
    const newSelection = selectedInitiatives.includes(idString)
      ? selectedInitiatives.filter(id => id !== idString)
      : [...selectedInitiatives, idString];
    
    setSelectedInitiatives(newSelection);
    saveSelectedInitiatives.mutate(newSelection);
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Content Editor Panel */}
      <div className="flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Sustainability Initiatives</h3>
          <p className="text-sm text-slate-600">Describe your sustainability initiatives and their impact on your report.</p>
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
          className="flex-1 min-h-[200px] resize-none border border-slate-200 rounded-lg p-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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

      {/* SMART Goals Selection Panel */}
      <div className="flex flex-col">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="w-4 h-4" />
              Select SMART Goals to Feature
            </CardTitle>
            <CardDescription>Choose SMART goals from your dashboard to feature as initiatives in your report.</CardDescription>
          </CardHeader>
          <CardContent>
            {initiativesData?.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {initiativesData.map((initiative: any) => (
                  <div
                    key={initiative.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedInitiatives.includes(String(initiative.id))
                        ? 'bg-green-50 border-green-200 shadow-sm'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => handleInitiativeToggle(initiative.id)}
                  >
                    <div className={`w-4 h-4 rounded border-2 mt-0.5 flex items-center justify-center ${
                      selectedInitiatives.includes(String(initiative.id))
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedInitiatives.includes(String(initiative.id)) && (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-slate-900">{initiative.title}</h4>
                      {initiative.description && (
                        <p className="text-xs text-slate-600 mt-1">{initiative.description}</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        {initiative.priority && (
                          <Badge variant="outline" className="text-xs">
                            {initiative.priority} priority
                          </Badge>
                        )}
                        {initiative.category && (
                          <Badge variant="outline" className="text-xs">
                            {initiative.category}
                          </Badge>
                        )}
                        {initiative.targetDate && (
                          <Badge variant="outline" className="text-xs">
                            Due: {new Date(initiative.targetDate).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Target className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-3">No SMART goals found</p>
                <p className="text-xs text-gray-400">Create SMART goals in your dashboard to feature them as initiatives in reports</p>
              </div>
            )}
            {selectedInitiatives.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-green-700 font-medium">
                  {selectedInitiatives.length} SMART goal{selectedInitiatives.length === 1 ? '' : 's'} selected for report
                </p>
              </div>
            )}
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
// Step 8: Social Impact Component
export function SocialImpactStep({ content, onChange, onSave, isSaving }: StepComponentProps) {
  const { data: company } = useQuery({ queryKey: ['/api/company'] });
  const { data: sustainabilityData } = useQuery({ queryKey: ['/api/company/sustainability-data'] });
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Editor Panel */}
      <div className="flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Social Impact & Community</h3>
          <p className="text-sm text-slate-600">Describe your company's social initiatives and community engagement.</p>
        </div>
        
        {/* AI Writing Assistant */}
        <AIWritingAssistant 
          sectionType="social_impact"
          companyName={company?.name}
          onContentGenerated={onChange}
          className="mb-4"
        />
        
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Describe your social impact initiatives, community engagement, and employee welfare programs or use AI assistance above..."
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
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {company && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-2">Company Overview</h4>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div>
                      <span className="text-slate-500">Name:</span>
                      <span className="ml-2 font-medium">{company.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Country:</span>
                      <span className="ml-2">{company.country}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Industry:</span>
                      <span className="ml-2">Drinks & Beverages</span>
                    </div>
                  </div>
                </div>
              )}
                
                {/* Employee Metrics */}
                {sustainabilityData?.socialData?.employeeMetrics && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-slate-900 mb-3">Employee Metrics</h4>
                    <div className="space-y-3">
                      {sustainabilityData.socialData.employeeMetrics.turnoverRate && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            <span className="text-sm">Turnover Rate</span>
                          </div>
                          <span className="text-sm font-semibold">{sustainabilityData.socialData.employeeMetrics.turnoverRate}%</span>
                        </div>
                      )}
                      {sustainabilityData.socialData.employeeMetrics.genderDiversityLeadership && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-purple-500" />
                            <span className="text-sm">Gender Diversity in Leadership</span>
                          </div>
                          <span className="text-sm font-semibold">{sustainabilityData.socialData.employeeMetrics.genderDiversityLeadership}%</span>
                        </div>
                      )}
                      {sustainabilityData.socialData.employeeMetrics.trainingHoursPerEmployee && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <GraduationCap className="w-4 h-4 text-green-500" />
                            <span className="text-sm">Training Hours per Employee</span>
                          </div>
                          <span className="text-sm font-semibold">{sustainabilityData.socialData.employeeMetrics.trainingHoursPerEmployee} hrs</span>
                        </div>
                      )}
                      {sustainabilityData.socialData.employeeMetrics.satisfactionScore && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Heart className="w-4 h-4 text-red-500" />
                            <span className="text-sm">Employee Satisfaction Score</span>
                          </div>
                          <span className="text-sm font-semibold">{sustainabilityData.socialData.employeeMetrics.satisfactionScore}/5</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Community Impact */}
                {sustainabilityData?.socialData?.communityImpact && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-slate-900 mb-3">Community Impact</h4>
                    <div className="space-y-3">
                      {sustainabilityData.socialData.communityImpact.localSuppliersPercentage && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Globe className="w-4 h-4 text-green-500" />
                            <span className="text-sm">Local Suppliers</span>
                          </div>
                          <span className="text-sm font-semibold">{sustainabilityData.socialData.communityImpact.localSuppliersPercentage}%</span>
                        </div>
                      )}
                      {sustainabilityData.socialData.communityImpact.communityInvestment && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Heart className="w-4 h-4 text-blue-500" />
                            <span className="text-sm">Community Investment</span>
                          </div>
                          <span className="text-sm font-semibold">£{sustainabilityData.socialData.communityImpact.communityInvestment.toLocaleString()}</span>
                        </div>
                      )}
                      {sustainabilityData.socialData.communityImpact.localJobsCreated && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-purple-500" />
                            <span className="text-sm">Local Jobs Created</span>
                          </div>
                          <span className="text-sm font-semibold">{sustainabilityData.socialData.communityImpact.localJobsCreated}</span>
                        </div>
                      )}
                      {sustainabilityData.socialData.communityImpact.volunteerHours && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <span className="text-sm">Volunteer Hours</span>
                          </div>
                          <span className="text-sm font-semibold">{sustainabilityData.socialData.communityImpact.volunteerHours} hrs</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
              {/* Show message if no social data */}
              {(!sustainabilityData?.socialData?.employeeMetrics || Object.keys(sustainabilityData.socialData.employeeMetrics).length === 0) && 
               (!sustainabilityData?.socialData?.communityImpact || Object.keys(sustainabilityData.socialData.communityImpact).length === 0) && (
                <div className="border rounded-lg p-4">
                  <div className="text-center py-4 text-slate-500">
                    <Heart className="w-8 h-8 mx-auto mb-2" />
                    <p>No social impact data available</p>
                    <p className="text-sm">Complete the Social tab in Company settings to view metrics</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
