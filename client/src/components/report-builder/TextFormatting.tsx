import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Type, Bold, Italic } from 'lucide-react';

interface TextFormattingProps {
  formatting: {
    fontSize?: 'small' | 'medium' | 'large';
    alignment?: 'left' | 'center' | 'right' | 'justify';
    style?: 'normal' | 'bold' | 'italic';
  };
  onUpdate: (formatting: any) => void;
}

export function TextFormatting({ formatting, onUpdate }: TextFormattingProps) {
  const handleFontSizeChange = (fontSize: string) => {
    onUpdate({ fontSize });
  };

  const handleAlignmentChange = (alignment: string) => {
    onUpdate({ alignment });
  };

  const handleStyleChange = (style: string) => {
    onUpdate({ style });
  };

  const alignmentIcons = {
    left: AlignLeft,
    center: AlignCenter,
    right: AlignRight,
    justify: AlignJustify
  };

  return (
    <div className="space-y-6">
      {/* Font Size */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Type className="w-4 h-4" />
          Font Size
        </Label>
        <Select 
          value={formatting.fontSize || 'medium'} 
          onValueChange={handleFontSizeChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select font size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Small</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Large</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Text Alignment */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Text Alignment</Label>
        <div className="flex gap-1">
          {Object.entries(alignmentIcons).map(([alignment, Icon]) => (
            <Button
              key={alignment}
              variant={formatting.alignment === alignment ? "default" : "outline"}
              size="sm"
              onClick={() => handleAlignmentChange(alignment)}
              className="p-2"
            >
              <Icon className="w-4 h-4" />
            </Button>
          ))}
        </div>
      </div>

      {/* Font Style */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Font Style</Label>
        <div className="flex gap-1">
          <Button
            variant={formatting.style === 'normal' ? "default" : "outline"}
            size="sm"
            onClick={() => handleStyleChange('normal')}
            className="px-3"
          >
            Normal
          </Button>
          <Button
            variant={formatting.style === 'bold' ? "default" : "outline"}
            size="sm"
            onClick={() => handleStyleChange('bold')}
            className="p-2"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            variant={formatting.style === 'italic' ? "default" : "outline"}
            size="sm"
            onClick={() => handleStyleChange('italic')}
            className="p-2"
          >
            <Italic className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Preview</Label>
        <div className="border rounded-lg p-4 bg-gray-50">
          <div 
            className={`
              ${formatting.fontSize === 'small' ? 'text-sm' : formatting.fontSize === 'large' ? 'text-lg' : 'text-base'}
              ${formatting.alignment === 'center' ? 'text-center' : formatting.alignment === 'right' ? 'text-right' : formatting.alignment === 'justify' ? 'text-justify' : 'text-left'}
              ${formatting.style === 'bold' ? 'font-bold' : formatting.style === 'italic' ? 'italic' : 'font-normal'}
            `}
          >
            This is how your text will appear in the report.
          </div>
        </div>
      </div>
    </div>
  );
}