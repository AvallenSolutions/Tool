import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface LoadingTimerPopupProps {
  isOpen: boolean;
  title: string;
  description?: string;
  estimatedTime?: number; // in milliseconds, default 3000ms
}

export function LoadingTimerPopup({ 
  isOpen, 
  title, 
  description = "Please wait while we process your request...",
  estimatedTime = 3000 
}: LoadingTimerPopupProps) {
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setElapsedTime(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setElapsedTime(elapsed);
      
      // Calculate progress based on estimated time, but slow down as we approach 100%
      const baseProgress = Math.min((elapsed / estimatedTime) * 100, 95);
      
      // Add some randomness to make it feel more natural
      const randomFactor = Math.random() * 2;
      const finalProgress = Math.min(baseProgress + randomFactor, 95);
      
      setProgress(finalProgress);
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, estimatedTime]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const remainingMs = ms % 1000;
    return `${seconds}.${Math.floor(remainingMs / 100)}s`;
  };

  return (
    <Dialog open={isOpen} modal>
      <DialogContent className="sm:max-w-md bg-white border-gray-200 text-gray-900 shadow-xl" onInteractOutside={(e) => e.preventDefault()}>
        <div className="flex flex-col items-center space-y-6 py-8">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-[#209d50]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-[#209d50] rounded-full animate-pulse" />
              </div>
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
          
          <div className="w-full space-y-2">
            <Progress value={progress} className="w-full h-2" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Processing...</span>
              <span>{formatTime(elapsedTime)}</span>
            </div>
          </div>
          
          {elapsedTime > estimatedTime * 1.5 && (
            <div className="text-center">
              <p className="text-xs text-orange-600">
                Taking longer than expected, but still processing...
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}