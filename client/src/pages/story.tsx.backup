import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import AIWritingAssistant from '@/components/ai-writing-assistant';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Building2, Target, Users, Leaf } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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

export default function CompanyStoryPage() {
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
    onSuccess: (data) => {
      setFormData(data as CompanyStory);
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

  const handlePillarUpdate = (index: number, field: 'name' | 'description', value: string) => {
    if (!formData) return;
    const newPillars = [...formData.strategicPillars];
    newPillars[index] = { ...newPillars[index], [field]: value };
    setFormData({ ...formData, strategicPillars: newPillars });
  };

  const addNewPillar = () => {
    if (!formData) return;
    setFormData({
      ...formData,
      strategicPillars: [...formData.strategicPillars, { name: '', description: '' }]
    });
  };

  const removePillar = (index: number) => {
    if (!formData || formData.strategicPillars.length <= 1) return;
    const newPillars = formData.strategicPillars.filter((_, i) => i !== index);
    setFormData({ ...formData, strategicPillars: newPillars });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-gray-500">
          Failed to load company story data
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Company Story</h1>
          <p className="text-gray-600 mt-2">
            Define your mission, vision, and strategic pillars for dynamic reporting
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditing(false);
                  setFormData(companyStory);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saveStoryMutation.isPending}
              >
                {saveStoryMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              Edit Story
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="mission" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mission" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Mission & Vision
          </TabsTrigger>
          <TabsTrigger value="pillars" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Strategic Pillars
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mission" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Mission Statement
              </CardTitle>
              <CardDescription>
                Your company's core purpose and reason for existence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isEditing ? (
                  <Textarea
                    placeholder="Enter your mission statement..."
                    value={formData.missionStatement || ''}
                    onChange={(e) => setFormData({ ...formData, missionStatement: e.target.value })}
                    rows={4}
                    className="min-h-[100px]"
                  />
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg min-h-[100px] flex items-center">
                    <p className="text-gray-700">
                      {formData.missionStatement || (
                        <span className="text-gray-400 italic">No mission statement defined yet</span>
                      )}
                    </p>
                  </div>
                )}
                {isEditing && (
                  <AIWritingAssistant
                    currentText={formData.missionStatement || ''}
                    contentType="mission"
                    onTextUpdate={(newText) => setFormData({ ...formData, missionStatement: newText })}
                    companyContext={{
                      industry: 'Beverages',
                      size: 'SME',
                      values: ['Sustainability', 'Innovation', 'Quality']
                    }}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Vision Statement
              </CardTitle>
              <CardDescription>
                Your aspirational long-term goals and desired future state
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isEditing ? (
                  <Textarea
                    placeholder="Enter your vision statement..."
                    value={formData.visionStatement || ''}
                    onChange={(e) => setFormData({ ...formData, visionStatement: e.target.value })}
                    rows={4}
                    className="min-h-[100px]"
                  />
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg min-h-[100px] flex items-center">
                    <p className="text-gray-700">
                      {formData.visionStatement || (
                        <span className="text-gray-400 italic">No vision statement defined yet</span>
                      )}
                    </p>
                  </div>
                )}
                {isEditing && (
                  <AIWritingAssistant
                    currentText={formData.visionStatement || ''}
                    contentType="vision"
                    onTextUpdate={(newText) => setFormData({ ...formData, visionStatement: newText })}
                    companyContext={{
                      industry: 'Beverages',
                      size: 'SME',
                      values: ['Sustainability', 'Innovation', 'Quality']
                    }}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pillars" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Strategic Pillars</h3>
              <p className="text-sm text-gray-600">
                Define the core areas that guide your sustainability strategy
              </p>
            </div>
            {isEditing && (
              <Button onClick={addNewPillar} variant="outline" size="sm">
                Add Pillar
              </Button>
            )}
          </div>

          <div className="grid gap-4">
            {formData.strategicPillars.map((pillar, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Leaf className="h-5 w-5 text-green-600" />
                        <Label>Pillar {index + 1}</Label>
                      </div>
                      {isEditing && formData.strategicPillars.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePillar(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      {isEditing ? (
                        <>
                          <Input
                            placeholder="Pillar name (e.g., Planet, People, Principles)"
                            value={pillar.name}
                            onChange={(e) => handlePillarUpdate(index, 'name', e.target.value)}
                          />
                          <Textarea
                            placeholder="Describe this strategic pillar..."
                            value={pillar.description}
                            onChange={(e) => handlePillarUpdate(index, 'description', e.target.value)}
                            rows={3}
                          />
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{pillar.name || 'Unnamed Pillar'}</Badge>
                          </div>
                          <p className="text-gray-700 text-sm">
                            {pillar.description || (
                              <span className="text-gray-400 italic">No description provided</span>
                            )}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Story Preview</CardTitle>
              <CardDescription>
                How your company story will appear in dynamic reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Mission</h4>
                <p className="text-gray-700 italic">
                  "{formData.missionStatement || 'Mission statement not defined'}"
                </p>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold mb-2">Vision</h4>
                <p className="text-gray-700 italic">
                  "{formData.visionStatement || 'Vision statement not defined'}"
                </p>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold mb-3">Strategic Focus Areas</h4>
                <div className="grid gap-3">
                  {formData.strategicPillars.map((pillar, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Leaf className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <div className="font-medium">{pillar.name || 'Unnamed Pillar'}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {pillar.description || 'No description provided'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}