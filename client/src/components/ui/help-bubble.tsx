import { HelpCircle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface HelpBubbleProps {
  title?: string;
  content: string;
  className?: string;
}

export function HelpBubble({ title, content, className = "" }: HelpBubbleProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className={`p-1 h-auto text-gray-400 hover:text-gray-600 ${className}`}
        >
          <HelpCircle className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-white border shadow-lg rounded-lg p-4" side="top" align="start">
        {title && <h4 className="font-semibold text-sm mb-2 text-gray-900">{title}</h4>}
        <div className="text-xs text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />
      </PopoverContent>
    </Popover>
  );
}