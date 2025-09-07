import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Bug, Lightbulb } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface FeedbackSubmission {
  feedbackType: 'Bug Report' | 'Feature Suggestion';
  message: string;
  pageUrl?: string;
}

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'Bug Report' | 'Feature Suggestion'>('Bug Report');
  const [message, setMessage] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: FeedbackSubmission) => {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          pageUrl: window.location.pathname
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit feedback');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! We'll review it soon.",
      });
      setMessage('');
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter your feedback message",
        variant: "destructive",
      });
      return;
    }

    submitFeedbackMutation.mutate({
      feedbackType,
      message: message.trim(),
    });
  };

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 0, 
      left: 0, 
      pointerEvents: 'none',
      zIndex: 9999 
    }}>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm" 
          className="fixed bottom-4 left-4 z-[9999] bg-white hover:!bg-white dark:bg-black dark:hover:!bg-black shadow-lg hover:shadow-xl transition-shadow duration-200 border border-gray-300 dark:border-gray-600"
          style={{
            position: 'fixed',
            bottom: '16px',
            left: '16px',
            zIndex: 9999,
            pointerEvents: 'auto',
            isolation: 'isolate'
          }}
          data-testid="feedback-trigger"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Beta Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-gray-50 border shadow-2xl">
        <DialogHeader className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6 -m-6 mb-0 rounded-t-lg">
          <DialogTitle className="text-white font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Share Your Feedback
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-6">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Feedback Type
            </label>
            <Select value={feedbackType} onValueChange={(value: 'Bug Report' | 'Feature Suggestion') => setFeedbackType(value)}>
              <SelectTrigger data-testid="feedback-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800">
                <SelectItem value="Bug Report">
                  <div className="flex items-center">
                    <Bug className="w-4 h-4 mr-2 text-red-500" />
                    Bug Report
                  </div>
                </SelectItem>
                <SelectItem value="Feature Suggestion">
                  <div className="flex items-center">
                    <Lightbulb className="w-4 h-4 mr-2 text-yellow-500" />
                    Feature Suggestion
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Your Feedback
            </label>
            <Textarea
              placeholder={
                feedbackType === 'Bug Report'
                  ? "Describe the issue you encountered, steps to reproduce it, and what you expected to happen..."
                  : "Tell us about the feature you'd like to see. How would it help you?"
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px] resize-none bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
              data-testid="feedback-message"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={submitFeedbackMutation.isPending}
              data-testid="feedback-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitFeedbackMutation.isPending || !message.trim()}
              data-testid="feedback-submit"
            >
              {submitFeedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </div>
  );
}