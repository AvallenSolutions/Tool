import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Clock, Target, AlertCircle } from 'lucide-react';
import { Link } from 'wouter';

interface NextStepSuggestion {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionUrl: string;
  estimatedTime: string;
}

interface NextStepsResponse {
  suggestions: NextStepSuggestion[];
}

const priorityConfig = {
  high: { 
    color: 'bg-red-100 text-red-800 border-red-200', 
    icon: AlertCircle, 
    label: 'High Priority' 
  },
  medium: { 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    icon: Target, 
    label: 'Medium Priority' 
  },
  low: { 
    color: 'bg-green-100 text-green-800 border-green-200', 
    icon: Clock, 
    label: 'Low Priority' 
  },
};

export function WhatsNextModule() {
  const { data, isLoading, error } = useQuery<NextStepsResponse>({
    queryKey: ['/api/suggestions/next-steps'],
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="bg-white border shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            What's Next?
          </CardTitle>
          <CardDescription>Your personalized action items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            What's Next?
          </CardTitle>
          <CardDescription>Your personalized action items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Target className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">API Authentication Issue</p>
            <p className="text-sm text-gray-500">The suggestions service is temporarily unavailable due to authentication configuration</p>
            <details className="mt-2 text-xs text-gray-400">
              <summary>Debug Info</summary>
              <pre>{JSON.stringify(error, null, 2)}</pre>
            </details>
          </div>
        </CardContent>
      </Card>
    );
  }

  const suggestions = data?.suggestions || [];

  if (suggestions.length === 0) {
    return (
      <Card className="bg-white border shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            What's Next?
          </CardTitle>
          <CardDescription>Your personalized action items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Target className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">No suggestions at the moment</p>
            <p className="text-sm text-gray-500">Upload more data so we can personalise an action plan for you</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          What's Next?
        </CardTitle>
        <CardDescription>
          Your personalized action items to advance your sustainability journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestions.map((suggestion, index) => {
            const config = priorityConfig[suggestion.priority];
            const Icon = config.icon;
            
            return (
              <div
                key={suggestion.id}
                className="group border rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50 hover:bg-white"
              >
                <div className="flex items-start gap-3">
                  {/* Priority Indicator */}
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900 mb-1">
                          {suggestion.title}
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">
                          {suggestion.description}
                        </p>
                        
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <Badge variant="outline" className={config.color}>
                            {config.label}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {suggestion.estimatedTime}
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      <Link href={suggestion.actionUrl}>
                        <Button 
                          size="sm" 
                          className="flex items-center gap-1 opacity-75 group-hover:opacity-100 transition-opacity"
                        >
                          Start
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
                
                {/* Step Indicator */}
                {index === 0 && suggestions.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Recommended next step
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Progress Indicator */}
          {suggestions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Your action items</span>
                <span>{suggestions.length} suggested actions</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}