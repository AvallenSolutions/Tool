import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Building2, 
  Leaf, 
  TrendingUp, 
  Award,
  Check,
  Sparkles
} from "lucide-react";

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sustainability' | 'compliance' | 'impact';
  icon: React.ComponentType<any>;
  features: string[];
  sections: string[];
  recommended?: boolean;
  preview?: string;
}

interface TemplateSelectorProps {
  onSelectTemplate: (template: ReportTemplate) => void;
  selectedTemplate?: ReportTemplate;
}

const templates: ReportTemplate[] = [
  {
    id: 'comprehensive-sustainability',
    name: 'Comprehensive Sustainability Report',
    description: 'Complete annual sustainability report with all environmental, social, and governance metrics',
    category: 'sustainability',
    icon: Leaf,
    recommended: true,
    features: [
      'Full ESG reporting',
      'Carbon footprint analysis',
      'Water & waste tracking',
      'Stakeholder engagement',
      'Future commitments'
    ],
    sections: [
      'Executive Summary',
      'Company Overview',
      'Environmental Performance', 
      'Social Impact',
      'Governance',
      'Goals & Commitments'
    ],
    preview: 'Professional 15-20 page report suitable for stakeholders, investors, and regulatory compliance.'
  },
  {
    id: 'carbon-focused',
    name: 'Carbon Impact Report',
    description: 'Focused report on carbon emissions, reduction strategies, and climate commitments',
    category: 'impact',
    icon: TrendingUp,
    features: [
      'Detailed emissions breakdown',
      'Scope 1/2/3 analysis',
      'Reduction strategies',
      'Science-based targets',
      'Climate risk assessment'
    ],
    sections: [
      'Introduction',
      'Emissions Inventory',
      'Carbon Footprint Analysis',
      'Reduction Initiatives',
      'Future Targets'
    ],
    preview: 'Specialized 8-12 page report focusing exclusively on carbon management and climate action.'
  },
  {
    id: 'compliance-basic',
    name: 'Basic Compliance Report',
    description: 'Essential compliance report meeting minimum regulatory requirements',
    category: 'compliance',
    icon: Award,
    features: [
      'Regulatory compliance',
      'Key metrics only',
      'Simplified structure',
      'Fast generation',
      'Cost-effective'
    ],
    sections: [
      'Company Information',
      'Environmental Metrics',
      'Compliance Status',
      'Summary'
    ],
    preview: 'Streamlined 4-6 page report meeting basic regulatory and disclosure requirements.'
  },
  {
    id: 'stakeholder-engagement',
    name: 'Stakeholder Engagement Report',
    description: 'Comprehensive report designed for investors, customers, and community stakeholders',
    category: 'sustainability',
    icon: Building2,
    features: [
      'Stakeholder-focused content',
      'Visual storytelling',
      'Impact narratives',
      'Community initiatives',
      'Brand positioning'
    ],
    sections: [
      'Our Sustainability Story',
      'Environmental Impact',
      'Community Engagement',
      'Innovation & Leadership',
      'Looking Forward'
    ],
    preview: 'Engaging 10-15 page report with compelling narratives and visual elements for external audiences.'
  }
];

export function TemplateSelector({ onSelectTemplate, selectedTemplate }: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All Templates' },
    { id: 'sustainability', name: 'Sustainability' },
    { id: 'compliance', name: 'Compliance' },
    { id: 'impact', name: 'Impact' }
  ];

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Choose Your Report Template</h2>
        <p className="text-slate-600">Select a template that best fits your reporting needs and audience</p>
      </div>

      {/* Category Filter */}
      <div className="flex justify-center">
        <div className="flex space-x-2 p-1 bg-slate-100 rounded-lg">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className={selectedCategory === category.id ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTemplates.map((template) => {
          const IconComponent = template.icon;
          const isSelected = selectedTemplate?.id === template.id;
          
          return (
            <Card 
              key={template.id} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected 
                  ? 'border-green-500 bg-green-50 shadow-lg' 
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => onSelectTemplate(template)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      isSelected ? 'bg-green-100' : 'bg-slate-100'
                    }`}>
                      <IconComponent className={`w-6 h-6 ${
                        isSelected ? 'text-green-600' : 'text-slate-600'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {template.name}
                        {template.recommended && (
                          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Recommended
                          </Badge>
                        )}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs mt-1 capitalize">
                        {template.category}
                      </Badge>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="p-1 bg-green-600 rounded-full">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                  {template.description}
                </p>

                {template.preview && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 font-medium mb-1">Preview:</p>
                    <p className="text-sm text-slate-700">{template.preview}</p>
                  </div>
                )}

                {/* Features */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">Key Features:</p>
                  <div className="space-y-1">
                    {template.features.slice(0, 3).map((feature, index) => (
                      <div key={index} className="flex items-center text-sm text-slate-600">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                    {template.features.length > 3 && (
                      <div className="text-xs text-slate-400 ml-3.5">
                        +{template.features.length - 3} more features
                      </div>
                    )}
                  </div>
                </div>

                {/* Sections Preview */}
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">Report Sections:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.sections.slice(0, 4).map((section, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {section}
                      </Badge>
                    ))}
                    {template.sections.length > 4 && (
                      <Badge variant="outline" className="text-xs text-slate-400">
                        +{template.sections.length - 4}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Action Button */}
      {selectedTemplate && (
        <div className="text-center pt-4">
          <Button 
            size="lg"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => onSelectTemplate(selectedTemplate)}
          >
            <FileText className="w-4 h-4 mr-2" />
            Start Building with {selectedTemplate.name}
          </Button>
        </div>
      )}
    </div>
  );
}