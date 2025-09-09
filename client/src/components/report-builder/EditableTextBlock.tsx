import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Settings } from 'lucide-react';
import { TextFormatting } from './TextFormatting';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const handleFormattingUpdate = (newFormatting: any) => {
    onUpdate(block.id, {
      ...block.content,
      formatting: { ...formatting, ...newFormatting }
    });
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
      <div className="space-y-3">
        <Textarea
          ref={textareaRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[100px] resize-y"
          placeholder="Enter your text content..."
        />
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
      <div className="flex items-center justify-between">
        {!isPreview && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleStartEditing}
              size="sm"
              variant="outline"
              className="h-8"
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Button>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8">
                  <Settings className="w-3 h-3 mr-1" />
                  Format
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Text Formatting</DialogTitle>
                  <DialogDescription>
                    Customize the appearance of your text block
                  </DialogDescription>
                </DialogHeader>
                <TextFormatting 
                  formatting={formatting}
                  onUpdate={handleFormattingUpdate}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
      
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