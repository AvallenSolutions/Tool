import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Users } from 'lucide-react';
import AIWritingAssistant from '@/components/ai-writing-assistant';

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

interface MissionVisionEditorProps {
  formData: CompanyStory;
  setFormData: (data: CompanyStory) => void;
  isEditing: boolean;
}

export default function MissionVisionEditor({ formData, setFormData, isEditing }: MissionVisionEditorProps) {
  return (
    <div className="space-y-4">
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-purple-600" />
            Mission Statement
          </CardTitle>
          <CardDescription>
            Your company's core purpose and reason for existence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <Textarea
                placeholder="Enter your mission statement..."
                value={formData.missionStatement || ''}
                onChange={(e) => setFormData({ ...formData, missionStatement: e.target.value })}
                rows={4}
                className="min-h-[100px] border-gray-300 focus:border-purple-500 focus:ring-purple-500"
              />
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
            </>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg min-h-[100px] flex items-center border">
              <p className="text-gray-700">
                {formData.missionStatement || (
                  <span className="text-gray-400 italic">No mission statement defined yet</span>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-purple-600" />
            Vision Statement
          </CardTitle>
          <CardDescription>
            Your aspirational long-term goals and desired future state
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <Textarea
                placeholder="Enter your vision statement..."
                value={formData.visionStatement || ''}
                onChange={(e) => setFormData({ ...formData, visionStatement: e.target.value })}
                rows={4}
                className="min-h-[100px] border-gray-300 focus:border-purple-500 focus:ring-purple-500"
              />
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
            </>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg min-h-[100px] flex items-center border">
              <p className="text-gray-700">
                {formData.visionStatement || (
                  <span className="text-gray-400 italic">No vision statement defined yet</span>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}