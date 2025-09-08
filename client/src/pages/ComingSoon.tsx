import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Sparkles, 
  TreePine, 
  FileBarChart, 
  Target, 
  Building2, 
  Calculator, 
  Calendar, 
  Award,
  Plus,
  Send,
  Lightbulb,
  Rocket
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface FeatureRequest {
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
}

const upcomingFeatures = [
  {
    icon: TreePine,
    title: "Biodiversity Impact Reporting",
    description: "Comprehensive biodiversity assessment and impact measurement tools",
    timeline: "Q2 2025",
    priority: "High"
  },
  {
    icon: FileBarChart,
    title: "CSRD-Compliant Metrics",
    description: "Full Corporate Sustainability Reporting Directive compliance framework",
    timeline: "Q1 2025",
    priority: "High"
  },
  {
    icon: Target,
    title: "SBTI Alignment Module",
    description: "Science Based Targets initiative validation and tracking system",
    timeline: "Q2 2025",
    priority: "High"
  },
  {
    icon: Building2,
    title: "International Standard Reporting",
    description: "GRI, TCFD, and other international sustainability standards support",
    timeline: "Q3 2025",
    priority: "Medium"
  },
  {
    icon: Calculator,
    title: "Accounting Software Integration",
    description: "Direct integration with Xero, QuickBooks, and other accounting platforms",
    timeline: "Q2 2025",
    priority: "Medium"
  },
  {
    icon: Calendar,
    title: "Monthly Reporting Cadence",
    description: "Automated monthly sustainability reports and progress tracking",
    timeline: "Q1 2025",
    priority: "High"
  },
  {
    icon: Award,
    title: "B Corp Certification Support",
    description: "Complete B Corporation assessment and certification preparation tools",
    timeline: "Q3 2025",
    priority: "High"
  }
];

export default function ComingSoon() {
  const [featureRequest, setFeatureRequest] = useState<FeatureRequest>({
    title: '',
    description: '',
    priority: 'Medium'
  });
  const { toast } = useToast();

  const submitFeatureRequestMutation = useMutation({
    mutationFn: async (data: FeatureRequest) => {
      return apiRequest('/api/feature-requests', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Feature Request Submitted!",
        description: "Thank you for your input! We'll review your suggestion and consider it for our roadmap.",
      });
      setFeatureRequest({ title: '', description: '', priority: 'Medium' });
    },
    onError: () => {
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitFeatureRequest = () => {
    if (!featureRequest.title.trim() || !featureRequest.description.trim()) {
      toast({
        title: "Incomplete Request",
        description: "Please provide both a title and description for your feature request.",
        variant: "destructive",
      });
      return;
    }
    
    submitFeatureRequestMutation.mutate(featureRequest);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'Medium':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'Low':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-lightest-gray via-white to-green-500/5">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white/10 rounded-full">
              <Rocket className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Coming Soon...</h1>
          <p className="text-xl text-green-100 mb-2">Exciting new features on the horizon</p>
          <p className="text-green-200">We're constantly evolving to meet your sustainability needs</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        {/* Upcoming Features */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-gray mb-4">Our Roadmap</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              These features are currently in development and will be rolled out over the coming months. 
              Each one is designed to enhance your sustainability journey and reporting capabilities.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="bg-white shadow-lg hover:shadow-xl transition-shadow border-0">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="p-3 bg-green-500/10 rounded-lg">
                        <IconComponent className="w-6 h-6 text-green-500" />
                      </div>
                      <Badge className={getPriorityColor(feature.priority)}>
                        {feature.priority}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg text-slate-gray">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                        {feature.timeline}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* "And Much More" Card */}
            <Card className="bg-gradient-to-br from-green-50 to-blue-50 shadow-lg border-0 flex items-center justify-center">
              <CardContent className="text-center py-12">
                <Sparkles className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-gray mb-2">And Much More!</h3>
                <p className="text-gray-600 text-sm">
                  We have many more exciting features planned. Have an idea? 
                  Let us know below!
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Feature Request Section */}
        <section className="bg-white rounded-2xl shadow-xl p-8 border">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <Lightbulb className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-gray mb-2">Suggest a Feature</h2>
            <p className="text-gray-600">
              This is a collaborative project! Help us shape the future of sustainable business tools 
              by sharing your ideas and needs.
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feature Title
              </label>
              <Input
                placeholder="e.g., Carbon Offset Marketplace Integration"
                value={featureRequest.title}
                onChange={(e) => setFeatureRequest(prev => ({ ...prev, title: e.target.value }))}
                data-testid="feature-title-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <Textarea
                placeholder="Describe the feature, how it would help your business, and any specific requirements..."
                value={featureRequest.description}
                onChange={(e) => setFeatureRequest(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[120px] resize-none"
                data-testid="feature-description-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['Low', 'Medium', 'High'] as const).map((priority) => (
                  <Button
                    key={priority}
                    variant={featureRequest.priority === priority ? "default" : "outline"}
                    className={featureRequest.priority === priority ? 
                      "bg-green-500 hover:bg-green-600" : 
                      "hover:bg-green-50"
                    }
                    onClick={() => setFeatureRequest(prev => ({ ...prev, priority }))}
                    data-testid={`priority-${priority.toLowerCase()}`}
                  >
                    {priority}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSubmitFeatureRequest}
              disabled={submitFeatureRequestMutation.isPending}
              className="w-full bg-green-500 hover:bg-green-600"
              data-testid="submit-feature-request"
            >
              {submitFeatureRequestMutation.isPending ? (
                "Submitting..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Feature Request
                </>
              )}
            </Button>
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-2xl p-12">
          <h2 className="text-2xl font-bold mb-4">Ready to Transform Your Business?</h2>
          <p className="text-green-100 mb-6 max-w-2xl mx-auto">
            While we're building these exciting new features, you can already start your 
            sustainability journey with our comprehensive platform today.
          </p>
          <Button className="bg-white text-green-600 hover:bg-gray-100">
            <Plus className="w-4 h-4 mr-2" />
            Explore Current Features
          </Button>
        </section>
      </div>
    </div>
  );
}