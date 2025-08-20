import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leaf, Plus } from 'lucide-react';

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

interface StrategicPillarsEditorProps {
  formData: CompanyStory;
  setFormData: (data: CompanyStory) => void;
  isEditing: boolean;
}

export default function StrategicPillarsEditor({ formData, setFormData, isEditing }: StrategicPillarsEditorProps) {
  const addNewPillar = () => {
    const newPillars = [...(formData.strategicPillars || []), { name: '', description: '' }];
    setFormData({ ...formData, strategicPillars: newPillars });
  };

  const removePillar = (index: number) => {
    const newPillars = formData.strategicPillars.filter((_, i) => i !== index);
    setFormData({ ...formData, strategicPillars: newPillars });
  };

  const handlePillarUpdate = (index: number, field: 'name' | 'description', value: string) => {
    const newPillars = [...formData.strategicPillars];
    newPillars[index] = { ...newPillars[index], [field]: value };
    setFormData({ ...formData, strategicPillars: newPillars });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Strategic Pillars</h3>
          <p className="text-sm text-gray-600">
            Define the core areas that guide your sustainability strategy
          </p>
        </div>
        {isEditing && (
          <Button 
            onClick={addNewPillar} 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2 border-purple-200 text-purple-600 hover:bg-purple-50"
          >
            <Plus className="h-4 w-4" />
            Add Pillar
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {(!formData.strategicPillars || formData.strategicPillars.length === 0) ? (
          <Card className="border-2 border-dashed border-gray-200">
            <CardContent className="pt-6">
              <div className="text-center py-6">
                <Leaf className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No strategic pillars defined yet</p>
                {isEditing ? (
                  <Button 
                    onClick={addNewPillar} 
                    variant="outline" 
                    size="sm"
                    className="border-purple-200 text-purple-600 hover:bg-purple-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Pillar
                  </Button>
                ) : (
                  <p className="text-sm text-gray-400">Click "Edit Story" to add pillars</p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          formData.strategicPillars.map((pillar, index) => (
            <Card key={index} className="border border-gray-200">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Leaf className="h-5 w-5 text-purple-600" />
                      <Label className="text-sm font-medium text-gray-700">Pillar {index + 1}</Label>
                    </div>
                    {isEditing && formData.strategicPillars.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePillar(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                          className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                        />
                        <Textarea
                          placeholder="Describe this strategic pillar..."
                          value={pillar.description}
                          onChange={(e) => handlePillarUpdate(index, 'description', e.target.value)}
                          rows={3}
                          className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                        />
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className="bg-purple-50 text-purple-700 border-purple-200"
                          >
                            {pillar.name || 'Unnamed Pillar'}
                          </Badge>
                        </div>
                        <p className="text-gray-700 text-sm pl-4 border-l-2 border-purple-100">
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
          ))
        )}
      </div>
    </div>
  );
}