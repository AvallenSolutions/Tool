import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Edit, AlignLeft, AlignCenter, AlignRight, AlignJustify, Type, Bold, Italic } from 'lucide-react';

interface EditableTextBlockProps {
  block: {
    id: string;
    content: {
      text: string;
      formatting?: {
        fontSize?: 'small' | 'medium' | 'large';
        alignment?: 'left' | 'center' | 'right' | 'justify';
        style?: 'normal' | 'bold' | 'italic';
      };
    };
  };
  onUpdate: (blockId: string, updatedContent: any) => void;
  isPreview?: boolean;
}

export function EditableTextBlock({ block, onUpdate, isPreview = false }: EditableTextBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(block.content.text);
  // Remove modal state since we're doing inline formatting
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const formatting = block.content.formatting || { fontSize: 'medium', alignment: 'left', style: 'normal' };

  // Auto-focus when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleStartEditing = () => {
    if (isPreview) return;
    setIsEditing(true);
    setEditText(block.content.text);
  };

  const handleSaveText = () => {
    onUpdate(block.id, {
      ...block.content,
      text: editText
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(block.content.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSaveText();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleFormattingUpdate = (field: string, value: any) => {
    const newFormatting = { ...formatting, [field]: value };
    onUpdate(block.id, {
      ...block.content,
      formatting: newFormatting
    });
  };

  const alignmentIcons = {
    left: AlignLeft,
    center: AlignCenter,
    right: AlignRight,
    justify: AlignJustify
  };

  // Generate CSS classes based on formatting
  const getTextClasses = () => {
    const classes = ['w-full', 'transition-colors', 'duration-200'];
    
    // Font size
    switch (formatting.fontSize) {
      case 'small':
        classes.push('text-sm');
        break;
      case 'large':
        classes.push('text-lg');
        break;
      default:
        classes.push('text-base');
    }
    
    // Text alignment
    switch (formatting.alignment) {
      case 'center':
        classes.push('text-center');
        break;
      case 'right':
        classes.push('text-right');
        break;
      case 'justify':
        classes.push('text-justify');
        break;
      default:
        classes.push('text-left');
    }
    
    // Font style
    switch (formatting.style) {
      case 'bold':
        classes.push('font-bold');
        break;
      case 'italic':
        classes.push('italic');
        break;
      default:
        classes.push('font-normal');
    }

    // Interactive states
    if (!isPreview && !isEditing) {
      classes.push('hover:bg-gray-50', 'cursor-pointer', 'rounded', 'p-2', 'border-2', 'border-transparent', 'hover:border-blue-200');
    } else if (!isPreview) {
      classes.push('p-2');
    }

    return classes.join(' ');
  };

  if (isEditing) {
    return (
      <div className="space-y-3 border rounded-lg p-4 bg-white">
        {/* Inline Formatting Controls */}
        <div className="flex items-center gap-4 p-2 bg-gray-50 rounded border">
          {/* Font Size */}
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-gray-600" />
            <Select 
              value={formatting.fontSize || 'medium'} 
              onValueChange={(value) => handleFormattingUpdate('fontSize', value)}
            >
              <SelectTrigger className="w-20 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Text Alignment */}
          <div className="flex items-center gap-1">
            {Object.entries(alignmentIcons).map(([alignment, Icon]) => (
              <Button
                key={alignment}
                variant={formatting.alignment === alignment ? "default" : "outline"}
                size="sm"
                onClick={() => handleFormattingUpdate('alignment', alignment)}
                className="h-8 w-8 p-0"
              >
                <Icon className="w-4 h-4" />
              </Button>
            ))}
          </div>

          {/* Font Style */}
          <div className="flex items-center gap-1">
            <Button
              variant={formatting.style === 'bold' ? "default" : "outline"}
              size="sm"
              onClick={() => handleFormattingUpdate('style', formatting.style === 'bold' ? 'normal' : 'bold')}
              className="h-8 w-8 p-0"
            >
              <Bold className="w-4 h-4" />
            </Button>
            <Button
              variant={formatting.style === 'italic' ? "default" : "outline"}
              size="sm"
              onClick={() => handleFormattingUpdate('style', formatting.style === 'italic' ? 'normal' : 'italic')}
              className="h-8 w-8 p-0"
            >
              <Italic className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Text Area */}
        <Textarea
          ref={textareaRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`min-h-[100px] resize-y ${getTextClasses().replace('hover:bg-gray-50 cursor-pointer rounded p-2 border-2 border-transparent hover:border-blue-200', '')}`}
          placeholder="Enter your text content..."
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSaveText}
            size="sm"
            variant="default"
          >
            Save
          </Button>
          <Button
            onClick={handleCancelEdit}
            size="sm"
            variant="outline"
          >
            Cancel
          </Button>
          <div className="text-xs text-gray-500 ml-auto">
            Ctrl+Enter to save, Esc to cancel
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!isPreview && (
        <div className="flex items-center gap-2 mb-2">
          <Button
            onClick={handleStartEditing}
            size="sm"
            variant="outline"
            className="h-8"
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit Text
          </Button>
        </div>
      )}
      
      <div
        onClick={handleStartEditing}
        className={getTextClasses()}
        title={!isPreview ? "Click to edit text" : undefined}
      >
        {block.content.text || (
          <span className="text-gray-400 italic">Click to add text...</span>
        )}
      </div>
    </div>
  );
}