import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Download, 
  FileText, 
  Image, 
  Mail, 
  Globe, 
  Printer,
  Settings,
  Calendar,
  Users,
  Crown
} from "lucide-react";

interface ExportOption {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  format: string;
  features: string[];
  premium?: boolean;
}

interface ExportOptionsProps {
  onExport: (format: string, options?: any) => void;
  isExporting: boolean;
  currentFormat?: string;
}

const exportOptions: ExportOption[] = [
  {
    id: 'pdf-standard',
    name: 'Standard PDF',
    description: 'Professional PDF report with standard formatting',
    icon: FileText,
    format: 'pdf',
    features: [
      'Professional layout',
      'Print-ready format', 
      'Searchable text',
      'Universal compatibility'
    ]
  },
  {
    id: 'pdf-branded',
    name: 'Branded PDF',
    description: 'Customized PDF with your company branding and colors',
    icon: Crown,
    format: 'pdf-branded',
    premium: true,
    features: [
      'Custom company branding',
      'Color theme matching',
      'Logo integration',
      'Enhanced visual design'
    ]
  },
  {
    id: 'web-interactive',
    name: 'Interactive Web Report',
    description: 'Dynamic web-based report with interactive charts and navigation',
    icon: Globe,
    format: 'web',
    premium: true,
    features: [
      'Interactive charts',
      'Clickable navigation',
      'Mobile responsive',
      'Share via URL'
    ]
  },
  {
    id: 'presentation',
    name: 'Presentation Slides',
    description: 'PowerPoint-ready slides for stakeholder presentations',
    icon: Image,
    format: 'pptx',
    features: [
      'Executive summary format',
      'Visual storytelling',
      'Key metrics highlights',
      'Editable templates'
    ]
  }
];

const deliveryOptions = [
  {
    id: 'download',
    name: 'Direct Download',
    description: 'Download immediately to your device',
    icon: Download
  },
  {
    id: 'email',
    name: 'Send via Email',
    description: 'Email report to stakeholders',
    icon: Mail,
    premium: true
  },
  {
    id: 'schedule',
    name: 'Scheduled Delivery',
    description: 'Automatically generate and send reports on schedule',
    icon: Calendar,
    premium: true
  }
];

export function ExportOptions({ onExport, isExporting, currentFormat }: ExportOptionsProps) {
  const [selectedOption, setSelectedOption] = useState('pdf-standard');
  const [selectedDelivery, setSelectedDelivery] = useState('download');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleExport = () => {
    const option = exportOptions.find(opt => opt.id === selectedOption);
    const delivery = deliveryOptions.find(opt => opt.id === selectedDelivery);
    
    onExport(option?.format || 'pdf', {
      optionId: selectedOption,
      deliveryMethod: selectedDelivery,
      advanced: showAdvanced
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-slate-900 mb-2">Export Your Report</h3>
        <p className="text-slate-600">Choose your preferred format and delivery method</p>
      </div>

      {/* Export Format Options */}
      <div>
        <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Format Options
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exportOptions.map((option) => {
            const IconComponent = option.icon;
            const isSelected = selectedOption === option.id;
            
            return (
              <Card 
                key={option.id}
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => setSelectedOption(option.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        isSelected ? 'bg-green-100' : 'bg-slate-100'
                      }`}>
                        <IconComponent className={`w-5 h-5 ${
                          isSelected ? 'text-green-600' : 'text-slate-600'
                        }`} />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {option.name}
                          {option.premium && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                              <Crown className="w-3 h-3 mr-1" />
                              Pro
                            </Badge>
                          )}
                        </CardTitle>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <p className="text-slate-600 text-sm mb-3">
                    {option.description}
                  </p>
                  
                  <div className="space-y-1">
                    {option.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-xs text-slate-500">
                        <div className="w-1 h-1 bg-slate-400 rounded-full mr-2 flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Delivery Options */}
      <div>
        <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
          <Mail className="w-5 h-5 mr-2" />
          Delivery Method
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {deliveryOptions.map((delivery) => {
            const IconComponent = delivery.icon;
            const isSelected = selectedDelivery === delivery.id;
            
            return (
              <Card 
                key={delivery.id}
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => setSelectedDelivery(delivery.id)}
              >
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className={`p-3 rounded-lg mx-auto w-fit mb-3 ${
                      isSelected ? 'bg-green-100' : 'bg-slate-100'
                    }`}>
                      <IconComponent className={`w-6 h-6 ${
                        isSelected ? 'text-green-600' : 'text-slate-600'
                      }`} />
                    </div>
                    <h5 className="font-medium text-slate-900 mb-1 flex items-center justify-center gap-2">
                      {delivery.name}
                      {delivery.premium && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                          Pro
                        </Badge>
                      )}
                    </h5>
                    <p className="text-xs text-slate-600">{delivery.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Advanced Options Toggle */}
      <div className="flex items-center justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-slate-600 hover:text-slate-900"
        >
          <Settings className="w-4 h-4 mr-2" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced Options
        </Button>
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Advanced Export Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Page Size
                </label>
                <select className="w-full p-2 border border-slate-200 rounded-md text-sm">
                  <option>A4 (Default)</option>
                  <option>Letter</option>
                  <option>Legal</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Quality
                </label>
                <select className="w-full p-2 border border-slate-200 rounded-md text-sm">
                  <option>Standard</option>
                  <option>High Quality</option>
                  <option>Print Ready</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm text-slate-700">Include data sources and methodology</span>
              </label>
            </div>
            
            <div className="mt-2">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded" defaultChecked />
                <span className="text-sm text-slate-700">Add generation timestamp</span>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Summary */}
      <Card className="bg-slate-50">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-medium text-slate-900 mb-1">Export Summary</h5>
              <div className="text-sm text-slate-600 space-y-1">
                <div>Format: {exportOptions.find(opt => opt.id === selectedOption)?.name}</div>
                <div>Delivery: {deliveryOptions.find(opt => opt.id === selectedDelivery)?.name}</div>
                <div>Estimated size: 2-4 MB</div>
              </div>
            </div>
            
            <Button 
              onClick={handleExport}
              disabled={isExporting}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pro Features Notice */}
      <div className="text-center">
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Crown className="w-5 h-5 text-amber-600" />
              <span className="font-medium text-amber-800">Unlock Pro Features</span>
            </div>
            <p className="text-sm text-amber-700 mb-3">
              Get branded PDFs, interactive web reports, and automated delivery
            </p>
            <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100">
              <Users className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}