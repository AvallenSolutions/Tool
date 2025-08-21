import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  FileText, 
  Building2, 
  BarChart3, 
  Leaf, 
  Target, 
  TrendingUp, 
  CheckCircle2,
  Calendar,
  Users,
  Globe
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface ReportPreviewProps {
  reportData: any;
  stepContent: Record<string, string>;
  onExportPDF: () => void;
  isExporting: boolean;
}

export function ReportPreview({ reportData, stepContent, onExportPDF, isExporting }: ReportPreviewProps) {
  const { data: company } = useQuery({ queryKey: ['/api/company'] });
  const { data: footprintData } = useQuery({ queryKey: ['/api/company/footprint'] });
  const { data: automatedData } = useQuery({ queryKey: ['/api/company/footprint/scope3/automated'] });
  const { data: smartGoalsData } = useQuery({ queryKey: ['/api/smart-goals'] });
  const { data: kpiData } = useQuery({ queryKey: ['/api/dashboard/kpis'] });
  const { data: metrics } = useQuery({ queryKey: ["/api/dashboard/metrics"] });

  // Calculate metrics for preview
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

  const calculateScopeEmissions = (scope: number) => {
    if (!footprintData?.success || !footprintData?.data) return 0;
    return footprintData.data
      .filter((item: any) => item.scope === scope)
      .reduce((total: number, item: any) => total + parseFloat(item.calculatedEmissions || 0), 0);
  };

  const totalCO2e = calculateTotalCO2e();
  const waterUsage = metrics?.waterUsage || 11700000;
  const wasteGenerated = metrics?.wasteGenerated || 0.1;

  const scope1 = calculateScopeEmissions(1) / 1000;
  const scope2 = calculateScopeEmissions(2) / 1000;
  const scope3 = automatedData?.success ? automatedData.data.totalEmissions : 0;

  const emissionsChartData = [
    {
      name: "Scope 1",
      value: scope1,
      color: "hsl(143, 69%, 38%)"
    },
    {
      name: "Scope 2",
      value: scope2,
      color: "hsl(210, 11%, 33%)"
    },
    {
      name: "Scope 3",
      value: scope3,
      color: "hsl(196, 100%, 47%)"
    }
  ];

  const metricsChartData = [
    {
      name: 'Carbon Footprint',
      value: totalCO2e,
      unit: 'tonnes CO2e',
      color: '#10b981'
    },
    {
      name: 'Water Usage',
      value: waterUsage / 1000000, // Convert to millions
      unit: 'M litres',
      color: '#3b82f6'
    },
    {
      name: 'Waste Generated',
      value: wasteGenerated,
      unit: 'tonnes',
      color: '#f59e0b'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {reportData?.reportTitle || 'Sustainability Report'}
            </h1>
            <p className="text-lg text-slate-600">{company?.name || 'Company Name'}</p>
            <p className="text-sm text-slate-500 flex items-center gap-2 mt-2">
              <Calendar className="w-4 h-4" />
              {new Date().getFullYear()} Annual Report
            </p>
          </div>
          <Button onClick={onExportPDF} disabled={isExporting} className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Generating...' : 'Export PDF'}
          </Button>
        </div>

        {/* Company Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Industry</p>
              <p className="font-medium">{company?.industry || 'Not Available'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Size</p>
              <p className="font-medium">{company?.size || 'Not Available'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Globe className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Location</p>
              <p className="font-medium">{company?.country || 'Not Available'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="p-6 space-y-8">
        
        {/* 1. Introduction */}
        {stepContent.introduction && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Introduction</h2>
            </div>
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {stepContent.introduction}
              </p>
            </div>
          </section>
        )}

        {/* 2. Company Information */}
        {stepContent.company_info_narrative && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Building2 className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Company Information</h2>
            </div>
            <div className="prose prose-slate max-w-none mb-6">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {stepContent.company_info_narrative}
              </p>
            </div>
          </section>
        )}

        {/* 3. Key Metrics */}
        {stepContent.key_metrics_narrative && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Key Environmental Metrics</h2>
            </div>
            <div className="prose prose-slate max-w-none mb-6">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {stepContent.key_metrics_narrative}
              </p>
            </div>
            
            {/* Metrics Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Environmental Impact Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metricsChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any, name: any, props: any) => [
                          `${value} ${props.payload.unit}`, 
                          name
                        ]}
                      />
                      <Bar dataKey="value" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{totalCO2e.toFixed(1)}</div>
                    <div className="text-sm text-green-700">tonnes CO2e</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{(waterUsage / 1000000).toFixed(1)}</div>
                    <div className="text-sm text-blue-700">Million litres</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{wasteGenerated.toFixed(1)}</div>
                    <div className="text-sm text-orange-700">tonnes waste</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* 4. Carbon Footprint Analysis */}
        {stepContent.carbon_footprint_narrative && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Leaf className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Carbon Footprint Analysis</h2>
            </div>
            <div className="prose prose-slate max-w-none mb-6">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {stepContent.carbon_footprint_narrative}
              </p>
            </div>

            {/* Emissions Breakdown Chart */}
            <Card>
              <CardHeader>
                <CardTitle>GHG Emissions by Scope</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={emissionsChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {emissionsChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => [`${value.toFixed(1)} tonnes`, 'Emissions']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="space-y-4">
                    {emissionsChartData.map((entry, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="font-medium">{entry.name}</span>
                        </div>
                        <span className="font-bold">{entry.value.toFixed(1)}t</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* 5. Sustainability Initiatives */}
        {stepContent.initiatives_narrative && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Sustainability Initiatives</h2>
            </div>
            <div className="prose prose-slate max-w-none mb-6">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {stepContent.initiatives_narrative}
              </p>
            </div>

            {/* Selected Initiatives */}
            {(() => {
              // Filter SMART Goals based on selected initiatives in report data
              const selectedInitiatives = reportData?.selectedInitiatives || [];
              console.log('Selected initiatives from report:', selectedInitiatives);
              console.log('Available SMART goals:', smartGoalsData?.goals);
              console.log('Report data structure:', reportData);
              
              const selectedGoals = smartGoalsData?.goals?.filter((goal: any) => 
                selectedInitiatives.includes(goal.id)
              ) || [];
              
              console.log('Filtered selected goals for preview:', selectedGoals);
              
              return selectedGoals.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Selected Sustainability Initiatives</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {selectedGoals.map((goal: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-slate-900">{goal.title}</h4>
                          <Badge variant={goal.priority === 'high' ? 'destructive' : 'default'}>
                            {goal.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{goal.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <span className="text-slate-500">Status: </span>
                            <span className="font-medium capitalize">{goal.status}</span>
                          </div>
                          <div className="text-sm text-slate-500">
                            Target: {new Date(goal.targetDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              ) : null;
            })()}
          </section>
        )}

        {/* 6. KPI Tracking */}
        {stepContent.kpi_tracking_narrative && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Performance Tracking</h2>
            </div>
            <div className="prose prose-slate max-w-none mb-6">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {stepContent.kpi_tracking_narrative}
              </p>
            </div>

            {/* KPI Dashboard */}
            {kpiData?.kpis?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Key Performance Indicators</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {kpiData.kpis.slice(0, 4).map((kpi: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-slate-900">{kpi.name}</h4>
                          <Badge variant={kpi.status === 'on-track' ? 'default' : 'secondary'}>
                            {kpi.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Current</p>
                            <p className="font-medium text-lg">{kpi.current} {kpi.unit}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Target</p>
                            <p className="font-medium text-lg">{kpi.target} {kpi.unit}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Progress</p>
                            <p className="font-medium text-lg">{kpi.progress}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </section>
        )}

        {/* 7. Summary & Future Goals */}
        {stepContent.summary && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Summary & Future Commitments</h2>
            </div>
            <div className="prose prose-slate max-w-none mb-6">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {stepContent.summary}
              </p>
            </div>

            {/* Key Achievements */}
            <Card>
              <CardHeader>
                <CardTitle>Key Achievements This Period</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>12% reduction in carbon emissions</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>8% reduction in waste generation</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>Implemented sustainable sourcing practices</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Footer */}
        <div className="border-t border-slate-200 pt-6 mt-8">
          <div className="text-center text-slate-500">
            <p className="text-sm">
              This report was generated on {new Date().toLocaleDateString()} 
              using the {company?.name || 'Company'} Sustainability Management Platform
            </p>
            <p className="text-xs mt-2">
              For questions about this report, please contact our sustainability team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}