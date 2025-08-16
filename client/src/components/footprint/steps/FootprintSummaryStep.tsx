import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, FileText, TrendingUp, Target, Award, AlertTriangle } from 'lucide-react';
import { FootprintData } from '../FootprintWizard';

interface FootprintSummaryStepProps {
  data: Record<string, any>;
  onDataChange: (data: Record<string, any>) => void;
  existingData: FootprintData[];
  onSave: (data: Partial<FootprintData>) => void;
  isLoading: boolean;
}

const SCOPE_COLORS = {
  1: '#ef4444', // Red for Scope 1
  2: '#f97316', // Orange for Scope 2  
  3: '#22c55e', // Green for Scope 3
};

// Industry benchmarks (kg CO2e per employee per year)
const INDUSTRY_BENCHMARKS = {
  'Food & Beverage': { low: 2000, high: 8000, average: 4500 },
  'Technology': { low: 800, high: 3000, average: 1500 },
  'Manufacturing': { low: 3000, high: 12000, average: 7000 },
  'Services': { low: 1000, high: 4000, average: 2200 },
  'Retail': { low: 1500, high: 5000, average: 2800 },
};

export function FootprintSummaryStep({ data, onDataChange, existingData, onSave, isLoading }: FootprintSummaryStepProps) {
  
  // Fetch automated Scope 3 data
  const { data: automatedData } = useQuery({
    queryKey: ['/api/company/footprint/scope3/automated'],
  });

  // Calculate emissions by scope including automated Scope 3
  const scopeEmissions = useMemo(() => {
    const scope1 = existingData.filter(item => item.scope === 1)
      .reduce((sum, item) => sum + parseFloat(item.calculatedEmissions || '0'), 0);
    const scope2 = existingData.filter(item => item.scope === 2)
      .reduce((sum, item) => sum + parseFloat(item.calculatedEmissions || '0'), 0);
    const scope3Manual = existingData.filter(item => item.scope === 3)
      .reduce((sum, item) => sum + parseFloat(item.calculatedEmissions || '0'), 0);
    
    // Add automated Scope 3 emissions (converted from tonnes to kg)
    const scope3Automated = automatedData?.data?.totalEmissions ? (automatedData.data.totalEmissions * 1000) : 0;
    const scope3Total = scope3Manual + scope3Automated;
    
    return { 
      scope1, 
      scope2, 
      scope3: scope3Total, 
      scope3Manual, 
      scope3Automated,
      total: scope1 + scope2 + scope3Total 
    };
  }, [existingData, automatedData]);

  // Prepare chart data
  const barChartData = [
    { name: 'Scope 1\nDirect', emissions: scopeEmissions.scope1, color: SCOPE_COLORS[1] },
    { name: 'Scope 2\nElectricity', emissions: scopeEmissions.scope2, color: SCOPE_COLORS[2] },
    { name: 'Scope 3\nValue Chain', emissions: scopeEmissions.scope3, color: SCOPE_COLORS[3] },
  ];

  const pieChartData = barChartData.filter(item => item.emissions > 0);

  // Calculate key metrics
  const calculateIntensityMetrics = () => {
    // These would typically come from company profile data
    const estimatedEmployees = 50; // Placeholder - would come from company data
    const estimatedRevenue = 2000000; // Placeholder - would come from company data
    
    return {
      perEmployee: scopeEmissions.total / estimatedEmployees,
      perRevenue: (scopeEmissions.total / estimatedRevenue) * 1000000, // per £1M revenue
    };
  };

  const intensityMetrics = calculateIntensityMetrics();

  // Determine industry benchmark comparison with actionable insights
  const getBenchmarkComparison = () => {
    const benchmark = INDUSTRY_BENCHMARKS['Food & Beverage']; // Default for drinks industry
    const perEmployee = intensityMetrics.perEmployee;
    
    let performance = 'average';
    let message = '';
    let recommendations: string[] = [];
    
    if (perEmployee < benchmark.low) {
      performance = 'excellent';
      message = `Outstanding performance! ${perEmployee.toFixed(0)} kg CO₂e per employee is well below industry standards.`;
      recommendations = [
        'Document and share your best practices',
        'Consider setting science-based targets for further reductions',
        'Explore carbon-negative initiatives'
      ];
    } else if (perEmployee > benchmark.high) {
      performance = 'needs-improvement';
      message = `Above industry average at ${perEmployee.toFixed(0)} kg CO₂e per employee. Significant opportunities for improvement.`;
      recommendations = [
        'Prioritize energy efficiency improvements',
        'Switch to renewable electricity contracts',
        'Optimize transportation and logistics',
        'Implement waste reduction programs'
      ];
    } else {
      performance = 'average';
      message = `Within industry range at ${perEmployee.toFixed(0)} kg CO₂e per employee.`;
      recommendations = [
        'Set reduction targets to move toward industry best practice',
        'Focus on highest-impact emission sources',
        'Consider renewable energy procurement'
      ];
    }
    
    return { performance, message, recommendations, benchmark };
  };
  
  // Get specific reduction recommendations by scope
  const getReductionRecommendations = () => {
    const recommendations: { scope: number; title: string; actions: string[]; impact: 'high' | 'medium' | 'low' }[] = [];
    
    // Scope 1 recommendations
    if (scopeEmissions.scope1 > 0) {
      recommendations.push({
        scope: 1,
        title: 'Direct Emissions Reduction',
        actions: [
          'Switch to electric or hybrid company vehicles',
          'Improve building insulation and heating efficiency',
          'Regular maintenance of refrigeration systems to prevent leaks',
          'Consider renewable heating systems (heat pumps, solar thermal)'
        ],
        impact: 'high'
      });
    }
    
    // Scope 2 recommendations
    if (scopeEmissions.scope2 > 0) {
      recommendations.push({
        scope: 2,
        title: 'Electricity & Energy Procurement',
        actions: [
          'Switch to renewable electricity tariff (100% impact on Scope 2)',
          'Install LED lighting throughout facilities',
          'Upgrade to energy-efficient equipment and HVAC systems',
          'Consider on-site renewable energy (solar panels)'
        ],
        impact: 'high'
      });
    }
    
    // Scope 3 recommendations
    if (scopeEmissions.scope3 > 0) {
      recommendations.push({
        scope: 3,
        title: 'Supply Chain & Operations',
        actions: [
          'Work with suppliers to reduce their emissions',
          'Optimize packaging design and materials',
          'Reduce business travel through virtual meetings',
          'Implement circular economy principles in product design'
        ],
        impact: 'medium'
      });
    }
    
    return recommendations;
  };

  const benchmarkComparison = getBenchmarkComparison();
  const reductionRecommendations = getReductionRecommendations();

  const handleDownloadReport = () => {
    // TODO: Implement PDF report generation
    console.log('Generating PDF report...');
  };

  const handleSubmitForValidation = () => {
    // TODO: Implement expert validation request
    console.log('Submitting for expert validation...');
  };

  return (
    <div className="space-y-6">
      {/* Header Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-900">
              {scopeEmissions.total.toLocaleString()}
            </div>
            <p className="text-sm text-slate-600">kg CO₂e Total</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-700">
              {scopeEmissions.scope1.toLocaleString()}
            </div>
            <p className="text-sm text-red-600">kg CO₂e Scope 1</p>
            <p className="text-xs text-slate-500">
              {scopeEmissions.total > 0 ? ((scopeEmissions.scope1 / scopeEmissions.total) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-700">
              {scopeEmissions.scope2.toLocaleString()}
            </div>
            <p className="text-sm text-orange-600">kg CO₂e Scope 2</p>
            <p className="text-xs text-slate-500">
              {scopeEmissions.total > 0 ? ((scopeEmissions.scope2 / scopeEmissions.total) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-700">
              {scopeEmissions.scope3.toLocaleString()}
            </div>
            <p className="text-sm text-green-600">kg CO₂e Scope 3</p>
            <p className="text-xs text-slate-500">
              {scopeEmissions.total > 0 ? ((scopeEmissions.scope3 / scopeEmissions.total) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Emissions by Scope</CardTitle>
            <CardDescription>Breakdown of your carbon footprint across all three scopes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value.toLocaleString()} kg CO₂e`, 'Emissions']} />
                <Bar dataKey="emissions" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Emission Distribution</CardTitle>
            <CardDescription>Proportional breakdown of your carbon footprint</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="emissions"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value.toLocaleString()} kg CO₂e`, 'Emissions']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Performance Metrics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-xl font-semibold text-slate-900">
                {intensityMetrics.perEmployee.toLocaleString()} kg CO₂e
              </div>
              <p className="text-sm text-slate-600">Per Employee</p>
              <div className={`text-sm font-medium ${
                benchmarkComparison.performance === 'excellent' ? 'text-green-600' : 
                benchmarkComparison.performance === 'average' ? 'text-yellow-600' :
                'text-red-600'
              } mt-1`}>
                {benchmarkComparison.message}
              </div>
            </div>
            
            <div>
              <div className="text-xl font-semibold text-slate-900">
                {intensityMetrics.perRevenue.toLocaleString()} kg CO₂e
              </div>
              <p className="text-sm text-slate-600">Per £1M Revenue</p>
              <p className="text-sm text-slate-500 mt-1">Industry comparison coming soon</p>
            </div>
            
            <div>
              <div className="text-xl font-semibold text-green-600">
                {existingData.length}
              </div>
              <p className="text-sm text-slate-600">Data Points Collected</p>
              <p className="text-sm text-slate-500 mt-1">
                Data completeness: {((existingData.length / 15) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Industry Benchmarking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Industry Benchmarking & Recommendations</span>
          </CardTitle>
          <CardDescription>
            Performance comparison with drinks industry peers and specific reduction strategies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Benchmark Performance */}
          <div className={`p-4 rounded-lg border-l-4 ${
            benchmarkComparison.performance === 'excellent' ? 'bg-green-50 border-green-500' : 
            benchmarkComparison.performance === 'average' ? 'bg-yellow-50 border-yellow-500' :
            'bg-red-50 border-red-500'
          }`}>
            <div className="flex items-start space-x-3">
              <Award className={`h-5 w-5 mt-1 ${
                benchmarkComparison.performance === 'excellent' ? 'text-green-600' : 
                benchmarkComparison.performance === 'average' ? 'text-yellow-600' :
                'text-red-600'
              }`} />
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Industry Performance</h4>
                <p className="text-sm text-slate-700 mb-3">{benchmarkComparison.message}</p>
                
                {/* General Recommendations */}
                <div className="space-y-1">
                  {benchmarkComparison.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-center text-sm text-slate-600">
                      <span className="mr-2">•</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Scope-specific Recommendations */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900">Targeted Reduction Strategies</h4>
            <div className="grid gap-4">
              {reductionRecommendations.map((rec, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        rec.scope === 1 ? 'bg-red-500' : 
                        rec.scope === 2 ? 'bg-orange-500' : 'bg-green-500'
                      }`}></div>
                      <h5 className="font-medium text-slate-900">Scope {rec.scope}: {rec.title}</h5>
                    </div>
                    <Badge variant={rec.impact === 'high' ? 'destructive' : 'secondary'}>
                      {rec.impact} impact
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {rec.actions.map((action, idx) => (
                      <div key={idx} className="flex items-start text-sm text-slate-600">
                        <span className="mr-2 text-green-600">→</span>
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleDownloadReport}>
          <CardContent className="p-6 text-center">
            <Download className="h-8 w-8 mx-auto mb-3 text-blue-600" />
            <h3 className="font-semibold text-slate-900 mb-2">Download Report</h3>
            <p className="text-sm text-slate-600">Generate a comprehensive PDF report of your carbon footprint</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleSubmitForValidation}>
          <CardContent className="p-6 text-center">
            <Award className="h-8 w-8 mx-auto mb-3 text-green-600" />
            <h3 className="font-semibold text-slate-900 mb-2">Expert Validation</h3>
            <p className="text-sm text-slate-600">Submit for professional review and third-party verification</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <FileText className="h-8 w-8 mx-auto mb-3 text-purple-600" />
            <h3 className="font-semibold text-slate-900 mb-2">Set Targets</h3>
            <p className="text-sm text-slate-600">Define science-based targets and reduction goals</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Quality Alert */}
      {existingData.length < 10 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <h4 className="font-medium text-yellow-800">Improve Data Quality</h4>
                <p className="text-sm text-yellow-700">
                  Consider adding more emission sources to improve the accuracy and completeness of your carbon footprint. 
                  More comprehensive data will lead to better insights and reduction opportunities.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}