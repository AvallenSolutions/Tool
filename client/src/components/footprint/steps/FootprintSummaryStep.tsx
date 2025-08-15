import { useMemo } from 'react';
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
  
  // Calculate emissions by scope
  const scopeEmissions = useMemo(() => {
    const scope1 = existingData.filter(item => item.scope === 1)
      .reduce((sum, item) => sum + parseFloat(item.calculatedEmissions || '0'), 0);
    const scope2 = existingData.filter(item => item.scope === 2)
      .reduce((sum, item) => sum + parseFloat(item.calculatedEmissions || '0'), 0);
    const scope3 = existingData.filter(item => item.scope === 3)
      .reduce((sum, item) => sum + parseFloat(item.calculatedEmissions || '0'), 0);
    
    return { scope1, scope2, scope3, total: scope1 + scope2 + scope3 };
  }, [existingData]);

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

  // Determine industry benchmark comparison
  const getBenchmarkComparison = () => {
    const benchmark = INDUSTRY_BENCHMARKS['Food & Beverage']; // Default for drinks industry
    const perEmployee = intensityMetrics.perEmployee;
    
    if (perEmployee <= benchmark.low) return { level: 'excellent', color: 'text-green-600', message: 'Excellent - Below industry low benchmark' };
    if (perEmployee <= benchmark.average) return { level: 'good', color: 'text-green-500', message: 'Good - Below industry average' };
    if (perEmployee <= benchmark.high) return { level: 'average', color: 'text-yellow-600', message: 'Average - Within typical industry range' };
    return { level: 'high', color: 'text-red-600', message: 'Above average - Opportunities for improvement' };
  };

  const benchmarkComparison = getBenchmarkComparison();

  // Generate recommendations
  const getRecommendations = () => {
    const recommendations = [];
    
    if (scopeEmissions.scope3 > (scopeEmissions.scope1 + scopeEmissions.scope2) * 2) {
      recommendations.push({
        priority: 'high',
        title: 'Focus on Supply Chain',
        description: 'Scope 3 represents the majority of your emissions. Engage with suppliers on their carbon reduction initiatives.',
        action: 'Develop supplier engagement strategy'
      });
    }
    
    if (scopeEmissions.scope2 > scopeEmissions.scope1 * 1.5) {
      recommendations.push({
        priority: 'medium',
        title: 'Switch to Renewable Energy',
        description: 'Your electricity emissions are significant. Consider renewable energy contracts or on-site solar.',
        action: 'Investigate renewable energy options'
      });
    }
    
    if (scopeEmissions.scope1 > 1000) {
      recommendations.push({
        priority: 'medium',
        title: 'Improve Energy Efficiency',
        description: 'Direct emissions from fuel use can be reduced through efficiency measures and electrification.',
        action: 'Conduct energy audit'
      });
    }
    
    return recommendations;
  };

  const recommendations = getRecommendations();

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
              <div className={`text-sm font-medium ${benchmarkComparison.color} mt-1`}>
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

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Reduction Recommendations</span>
            </CardTitle>
            <CardDescription>
              Based on your footprint analysis, here are priority actions to reduce emissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-slate-900">{rec.title}</h4>
                    <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'}>
                      {rec.priority} priority
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{rec.description}</p>
                  <p className="text-sm font-medium text-green-600">→ {rec.action}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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