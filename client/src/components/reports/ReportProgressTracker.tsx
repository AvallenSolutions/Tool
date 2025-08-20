import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface ProgressData {
  reportId: number;
  progress: number;
  stage: string;
  completed: boolean;
  error: boolean;
  startTime: number;
  completedAt?: number;
  elapsedTime: number;
}

interface ReportProgressTrackerProps {
  reportId: number;
  onComplete?: () => void;
}

export function ReportProgressTracker({ reportId, onComplete }: ReportProgressTrackerProps) {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    if (!isPolling || !reportId) return;

    const pollProgress = async () => {
      try {
        console.log(`📊 Polling progress for report ${reportId}...`);
        const response = await fetch(`/api/reports/${reportId}/progress`);
        const data = await response.json();
        console.log(`📊 Progress API response:`, data);

        if (data.progress !== null && data.progress !== undefined) {
          console.log(`📊 Setting progress data:`, data);
          setProgressData(data);
          
          // Stop polling if completed or error
          if (data.completed || data.error) {
            console.log(`📊 Report ${reportId} finished:`, { completed: data.completed, error: data.error });
            setIsPolling(false);
            if (data.completed && !data.error && onComplete) {
              onComplete();
            }
          }
        } else {
          console.log(`📊 No progress data found for report ${reportId}, continuing to poll...`);
          // Keep polling for a bit longer before giving up
        }
      } catch (error) {
        console.error('📊 Error fetching progress:', error);
        setIsPolling(false);
      }
    };

    // Poll immediately
    pollProgress();

    // Set up polling interval
    const interval = setInterval(pollProgress, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [reportId, isPolling, onComplete]);

  if (!progressData) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Waiting for report generation to start...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatElapsedTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const getStatusIcon = () => {
    if (progressData.error) return <AlertCircle className="h-5 w-5 text-red-500" />;
    if (progressData.completed) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
  };

  const getStatusBadge = () => {
    if (progressData.error) return <Badge variant="destructive">Failed</Badge>;
    if (progressData.completed) return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    return <Badge variant="secondary">Generating</Badge>;
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center space-x-2">
            {getStatusIcon()}
            <span>Report Generation</span>
          </span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progressData.progress}%</span>
          </div>
          <Progress 
            value={progressData.progress} 
            className="h-2"
          />
        </div>

        {/* Current Stage */}
        <div className="space-y-1">
          <div className="text-sm font-medium text-foreground">
            Current Stage
          </div>
          <div className="text-sm text-muted-foreground">
            {progressData.stage}
          </div>
        </div>

        {/* Elapsed Time */}
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {progressData.completed 
              ? `Completed in ${formatElapsedTime(progressData.elapsedTime)}`
              : `Running for ${formatElapsedTime(progressData.elapsedTime)}`
            }
          </span>
        </div>

        {/* Report ID */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Report ID: {progressData.reportId}
        </div>
      </CardContent>
    </Card>
  );
}