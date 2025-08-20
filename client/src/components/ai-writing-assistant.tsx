import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Wand2, RefreshCw, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface AIWritingAssistantProps {
  currentText: string;
  contentType: 'mission' | 'vision' | 'initiative_description' | 'custom_text' | 'executive_summary';
  onTextUpdate: (newText: string) => void;
  companyContext?: {
    industry?: string;
    size?: string;
    values?: string[];
  };
}

const CONTENT_PROMPTS = {
  mission: "Help me write a compelling mission statement that clearly defines our company's purpose and core reason for existence. It should be authentic, inspiring, and reflect our commitment to sustainability.",
  vision: "Help me create an aspirational vision statement that describes our long-term goals and desired future impact. It should be forward-looking and motivational.",
  initiative_description: "Help me write a clear and engaging description for this sustainability initiative that explains its goals, expected impact, and importance to our overall sustainability strategy.",
  custom_text: "Help me improve and enhance this text content to be more engaging, clear, and professional while maintaining the original intent.",
  executive_summary: "Help me write an executive summary that concisely presents key sustainability achievements, metrics, and strategic priorities for stakeholders."
};

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional & Formal' },
  { value: 'conversational', label: 'Conversational & Approachable' },
  { value: 'inspirational', label: 'Inspirational & Motivational' },
  { value: 'technical', label: 'Technical & Data-Driven' },
  { value: 'storytelling', label: 'Storytelling & Narrative' }
];

const LENGTH_OPTIONS = [
  { value: 'concise', label: 'Concise (1-2 sentences)' },
  { value: 'brief', label: 'Brief (1 paragraph)' },
  { value: 'moderate', label: 'Moderate (2-3 paragraphs)' },
  { value: 'detailed', label: 'Detailed (4+ paragraphs)' }
];

export default function AIWritingAssistant({ 
  currentText, 
  contentType, 
  onTextUpdate,
  companyContext 
}: AIWritingAssistantProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOptions, setGeneratedOptions] = useState<string[]>([]);
  const [selectedTone, setSelectedTone] = useState('professional');
  const [selectedLength, setSelectedLength] = useState('brief');
  const [customPrompt, setCustomPrompt] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generateContent = async (mode: 'improve' | 'rewrite' | 'custom') => {
    setIsGenerating(true);
    setGeneratedOptions([]);

    try {
      let prompt = '';
      
      if (mode === 'improve') {
        prompt = `Please improve the following ${contentType.replace('_', ' ')} while maintaining its core message. Make it more engaging, clear, and professional:\n\n"${currentText}"`;
      } else if (mode === 'rewrite') {
        prompt = `Please rewrite the following ${contentType.replace('_', ' ')} with a ${selectedTone} tone and ${selectedLength} length:\n\n"${currentText}"`;
      } else if (mode === 'custom') {
        prompt = customPrompt || CONTENT_PROMPTS[contentType];
        if (currentText) {
          prompt += `\n\nCurrent text: "${currentText}"`;
        }
      }

      // Add company context
      if (companyContext) {
        prompt += `\n\nCompany context: Industry: ${companyContext.industry || 'Not specified'}, Size: ${companyContext.size || 'Not specified'}`;
        if (companyContext.values?.length) {
          prompt += `, Core values: ${companyContext.values.join(', ')}`;
        }
      }

      const res = await apiRequest('POST', '/api/ai/generate-content', {
        prompt,
        contentType,
        tone: selectedTone,
        length: selectedLength,
        generateMultiple: true
      });
      
      const response = await res.json();

      if (response?.suggestions && response.suggestions.length > 0) {
        setGeneratedOptions(response.suggestions);
      } else {
        toast({
          title: "No suggestions generated",
          description: "Please try again with a different approach",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast({
        title: "Generation failed",
        description: "Unable to generate content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      toast({
        title: "Copied to clipboard",
        description: "Text has been copied successfully"
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy text to clipboard",
        variant: "destructive"
      });
    }
  };

  const useText = (text: string) => {
    onTextUpdate(text);
    setIsOpen(false);
    toast({
      title: "Text updated",
      description: "The generated content has been applied"
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Writing Assistant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto bg-white border shadow-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            AI Writing Assistant
          </DialogTitle>
          <DialogDescription>
            Enhance your {contentType.replace('_', ' ')} with AI-powered suggestions and improvements
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="improve" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="improve">Improve</TabsTrigger>
            <TabsTrigger value="rewrite">Rewrite</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="improve" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Improve Current Text</CardTitle>
                <CardDescription>
                  Enhance your existing content while maintaining its core message
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-2">Current Text:</div>
                  <div className="text-gray-600">
                    {currentText || <em className="text-gray-400">No content yet</em>}
                  </div>
                </div>
                <Button 
                  onClick={() => generateContent('improve')} 
                  disabled={!currentText || isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating improvements...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Improve Text
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewrite" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rewrite with Style</CardTitle>
                <CardDescription>
                  Rewrite your content with specific tone and length preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Tone</label>
                    <Select value={selectedTone} onValueChange={setSelectedTone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border shadow-lg">
                        {TONE_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Length</label>
                    <Select value={selectedLength} onValueChange={setSelectedLength}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border shadow-lg">
                        {LENGTH_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  onClick={() => generateContent('rewrite')} 
                  disabled={!currentText || isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Rewriting content...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Rewrite Text
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Custom Generation</CardTitle>
                <CardDescription>
                  Provide specific instructions for content generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Custom Prompt</label>
                  <Textarea
                    placeholder={CONTENT_PROMPTS[contentType]}
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={4}
                    className="mt-1"
                  />
                </div>
                <Button 
                  onClick={() => generateContent('custom')} 
                  disabled={!customPrompt && !currentText || isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating content...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Content
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Generated Options */}
        {generatedOptions.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Generated Options</h3>
            <div className="space-y-3">
              {generatedOptions.map((option, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <Badge variant="outline">Option {index + 1}</Badge>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(option, index)}
                        >
                          {copiedIndex === index ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => useText(option)}
                        >
                          Use This
                        </Button>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{option}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}