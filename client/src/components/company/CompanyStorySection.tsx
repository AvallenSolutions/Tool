import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Target, Building2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import MissionVisionEditor from '@/components/company/MissionVisionEditor';
import StrategicPillarsEditor from '@/components/company/StrategicPillarsEditor';

interface CompanyStory {
  id?: string;
  companyId: number;
  missionStatement: string | null;
  visionStatement: string | null;
  strategicPillars: Array<{
    name: string;
    description: string;
  }>;
}

export default function CompanyStorySection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<CompanyStory | null>(null);

  // Fetch company story
  const { data: companyStory, isLoading } = useQuery<CompanyStory>({
    queryKey: ['/api/company/story'],
  });

  // Set form data when story loads
  useEffect(() => {
    if (companyStory) {
      setFormData(companyStory);
    }
  }, [companyStory]);

  // Save company story mutation
  const saveStoryMutation = useMutation({
    mutationFn: async (data: Partial<CompanyStory>) => {
      return apiRequest('/api/company/story', 'POST', data);
    },
    onSuccess: (data: any) => {
      setFormData(data);
      toast({
        title: "Success",
        description: "Company story saved successfully"
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/company/story'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save company story",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    if (!formData) return;
    saveStoryMutation.mutate({
      missionStatement: formData.missionStatement,
      visionStatement: formData.visionStatement,
      strategicPillars: formData.strategicPillars
    });
  };

  if (isLoading || !formData) {
    return (
      <Card className="border-l-4 border-l-purple-500">
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completionCount = [
    formData.missionStatement,
    formData.visionStatement,
    formData.strategicPillars?.length > 0 ? 'pillars' : null
  ].filter(Boolean).length;

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg mr-3">
              <BookOpen className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-slate-gray">Company Story</CardTitle>
              <CardDescription>
                Define your mission, vision, and strategic pillars for dynamic reporting
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge 
              variant="outline" 
              className="bg-purple-50 text-purple-700 border-purple-200"
            >
              {completionCount}/3 sections complete
            </Badge>
            {isEditing ? (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(companyStory || null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  onClick={handleSave}
                  disabled={saveStoryMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {saveStoryMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            ) : (
              <Button 
                size="sm" 
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="border-purple-200 text-purple-600 hover:bg-purple-50"
              >
                Edit Story
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="mission" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-gray-50">
            <TabsTrigger value="mission" className="flex items-center gap-2 data-[state=active]:bg-white">
              <Target className="h-4 w-4" />
              Mission & Vision
            </TabsTrigger>
            <TabsTrigger value="pillars" className="flex items-center gap-2 data-[state=active]:bg-white">
              <Building2 className="h-4 w-4" />
              Strategic Pillars
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2 data-[state=active]:bg-white">
              <Sparkles className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mission" className="space-y-4">
            <MissionVisionEditor
              formData={formData}
              setFormData={setFormData}
              isEditing={isEditing}
            />
          </TabsContent>

          <TabsContent value="pillars" className="space-y-4">
            <StrategicPillarsEditor
              formData={formData}
              setFormData={setFormData}
              isEditing={isEditing}
            />
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Story Preview</h3>
              
              {formData.missionStatement && (
                <div className="mb-6">
                  <h4 className="text-md font-medium text-purple-700 mb-2">Our Mission</h4>
                  <p className="text-gray-700 leading-relaxed">{formData.missionStatement}</p>
                </div>
              )}
              
              {formData.visionStatement && (
                <div className="mb-6">
                  <h4 className="text-md font-medium text-purple-700 mb-2">Our Vision</h4>
                  <p className="text-gray-700 leading-relaxed">{formData.visionStatement}</p>
                </div>
              )}
              
              {formData.strategicPillars && formData.strategicPillars.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-purple-700 mb-3">Strategic Pillars</h4>
                  <div className="grid gap-3">
                    {formData.strategicPillars.map((pillar, index) => (
                      <div key={index} className="bg-white p-4 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span className="font-medium text-gray-900">{pillar.name}</span>
                        </div>
                        <p className="text-sm text-gray-600 pl-4">{pillar.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {!formData.missionStatement && !formData.visionStatement && (!formData.strategicPillars || formData.strategicPillars.length === 0) && (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No company story content defined yet</p>
                  <p className="text-sm text-gray-400">Click "Edit Story" to get started</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}