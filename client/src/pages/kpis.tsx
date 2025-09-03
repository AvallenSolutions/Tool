import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Target, TrendingUp, TrendingDown, Award, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

interface KpiDefinition {
  id: string;
  kpiName: string;
  kpiCategory: string;
  unit: string;
  description?: string;
  formulaJson: {
    numerator: string;
    denominator?: string;
    calculation_type: 'ratio' | 'absolute' | 'percentage';
    description?: string;
  };
}

const categoryColors = {
  'Environmental': 'bg-green-100 text-green-800 border-green-200',
  'Supply Chain': 'bg-blue-100 text-blue-800 border-blue-200',
  'Production': 'bg-purple-100 text-purple-800 border-purple-200',
  'Purpose & Stakeholder Governance': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Worker Engagement': 'bg-rose-100 text-rose-800 border-rose-200',
  'Human Rights': 'bg-amber-100 text-amber-800 border-amber-200',
  'JEDI': 'bg-violet-100 text-violet-800 border-violet-200',
  'Climate Action': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Risk Standards': 'bg-orange-100 text-orange-800 border-orange-200',
  'Circularity': 'bg-teal-100 text-teal-800 border-teal-200',
};

export function KPIsPage() {
  const [viewMode, setViewMode] = useState<'categories' | 'category-detail'>('categories');
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('');

  // Fetch KPI definitions
  const { data: definitionsData, isLoading: definitionsLoading } = useQuery({
    queryKey: ['/api/enhanced-kpis/definitions'],
    queryFn: async () => {
      const response = await fetch('/api/enhanced-kpis/definitions');
      return await response.json();
    },
  });

  // Fetch B Corp KPIs
  const { data: bCorpKPIsData, isLoading: bCorpKPIsLoading } = useQuery({
    queryKey: ['/api/kpis/b-corp'],
    queryFn: async () => {
      const response = await fetch('/api/kpis/b-corp');
      return await response.json();
    },
  });

  const definitions = definitionsData?.success ? definitionsData.definitions : [];
  
  if (definitionsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header 
          title="KPI Management" 
          subtitle="Track key performance indicators and sustainability goals"
        />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">KPI & Goal Management</h1>
              <p className="text-gray-600">
                Set sustainability targets, track progress, and drive environmental improvements across your operations.
              </p>
            </div>

            {viewMode === 'categories' ? (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">KPI Categories</h2>
                  <p className="text-gray-600">Select a category to view and manage your sustainability KPIs</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  {Object.keys(categoryColors).map((category) => {
                    const categoryKPIs = definitions.filter((kpi: KpiDefinition) => kpi.kpiCategory === category);
                    const bCorpKPIs = bCorpKPIsData?.success ? (bCorpKPIsData.kpis[category] || []) : [];
                    const totalKPIs = categoryKPIs.length + (Array.isArray(bCorpKPIs) ? bCorpKPIs.length : 0);
                    
                    const categoryIcon = category === 'Environmental' ? '🌱' : 
                                       category === 'Supply Chain' ? '🔗' : 
                                       category === 'Production' ? '🏭' : 
                                       category.includes('Governance') ? '🏛️' : 
                                       category.includes('Worker') ? '👥' : 
                                       category.includes('Human Rights') ? '⚖️' : 
                                       category.includes('JEDI') ? '🤝' : 
                                       category.includes('Climate') ? '🌍' : 
                                       category.includes('Risk') ? '🛡️' : 
                                       category.includes('Circularity') ? '♻️' : '📊';
                    
                    return (
                      <Card 
                        key={category} 
                        className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-green-400"
                        onClick={() => {
                          setSelectedMainCategory(category);
                          setViewMode('category-detail');
                        }}
                      >
                        <CardContent className="p-6 text-center">
                          <div className="text-5xl mb-4">{categoryIcon}</div>
                          <CardTitle className="text-lg mb-3">{category}</CardTitle>
                          <Badge 
                            className={`${categoryColors[category as keyof typeof categoryColors]} mb-4`}
                            variant="outline"
                          >
                            {totalKPIs} KPIs
                          </Badge>
                          <CardDescription className="text-sm">
                            {category === 'Environmental' && 'Carbon footprint, waste, and resource metrics'}
                            {category === 'Supply Chain' && 'Supplier compliance and sourcing practices'}
                            {category === 'Production' && 'Operational efficiency and production metrics'}
                            {category.includes('Governance') && 'Mission accountability and stakeholder engagement'}
                            {category.includes('Worker') && 'Employee satisfaction and career development'}
                            {category.includes('Human Rights') && 'Labor practices and human rights compliance'}
                            {category.includes('JEDI') && 'Justice, equity, diversity, and inclusion metrics'}
                            {category.includes('Climate') && 'Environmental impact and climate action'}
                            {category.includes('Risk') && 'Risk management and governance standards'}
                            {category.includes('Circularity') && 'Circular economy and resource efficiency'}
                          </CardDescription>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => setViewMode('categories')}
                    className="flex items-center gap-2"
                  >
                    ← Back to Categories
                  </Button>
                  <Badge 
                    className={`${categoryColors[selectedMainCategory as keyof typeof categoryColors]} text-sm px-4 py-2`}
                    variant="outline"
                  >
                    {selectedMainCategory}
                  </Badge>
                </div>
                
                <div className="text-center py-12">
                  <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">Category Details Coming Soon</h3>
                  <p className="text-gray-600 mb-6">
                    Detailed KPI management for {selectedMainCategory} category will be implemented in the next phase.
                  </p>
                  <Button onClick={() => setViewMode('categories')}>
                    Return to Categories
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