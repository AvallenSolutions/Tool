import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Bug, Lightbulb, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';

interface FeedbackSubmission {
  id: number;
  companyId: number;
  feedbackType: 'Bug Report' | 'Feature Suggestion';
  message: string;
  pageUrl?: string;
  submittedAt: string;
  status: 'new' | 'in_progress' | 'resolved';
  company?: {
    id: number;
    name: string;
  };
}

export default function FeedbackDashboard() {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: feedbackData, isLoading } = useQuery({
    queryKey: ['/api/admin/feedback'],
    queryFn: async () => {
      const response = await fetch('/api/admin/feedback', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch feedback');
      }
      return response.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`/api/admin/feedback/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/feedback'] });
      toast({
        title: "Status Updated",
        description: "Feedback status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const submissions: FeedbackSubmission[] = feedbackData?.data || [];

  // Filter submissions
  const filteredSubmissions = submissions.filter((submission) => {
    const statusMatch = selectedStatus === 'all' || submission.status === selectedStatus;
    const typeMatch = selectedType === 'all' || submission.feedbackType === selectedType;
    return statusMatch && typeMatch;
  });

  // Calculate stats
  const stats = {
    total: submissions.length,
    new: submissions.filter(s => s.status === 'new').length,
    inProgress: submissions.filter(s => s.status === 'in_progress').length,
    resolved: submissions.filter(s => s.status === 'resolved').length,
    bugs: submissions.filter(s => s.feedbackType === 'Bug Report').length,
    features: submissions.filter(s => s.feedbackType === 'Feature Suggestion').length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <AlertCircle className="w-4 h-4" />;
      case 'resolved': return <CheckCircle className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'Bug Report' ? 
      <Bug className="w-4 h-4 text-red-500" /> : 
      <Lightbulb className="w-4 h-4 text-yellow-500" />;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500">Loading feedback submissions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="Beta Feedback Dashboard" subtitle="Monitor and manage user feedback submissions" />
        <main className="flex-1 p-6">
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Submissions</CardTitle>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">New</CardTitle>
                  <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Bug Reports</CardTitle>
                  <div className="text-2xl font-bold text-red-600">{stats.bugs}</div>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Feature Requests</CardTitle>
                  <div className="text-2xl font-bold text-yellow-600">{stats.features}</div>
                </CardHeader>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Bug Report">Bug Reports</SelectItem>
                  <SelectItem value="Feature Suggestion">Feature Suggestions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Feedback List */}
            <div className="space-y-4">
              {filteredSubmissions.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No feedback submissions found</p>
                  </CardContent>
                </Card>
              ) : (
                filteredSubmissions.map((submission) => (
                  <Card key={submission.id} className="border border-gray-200 dark:border-gray-800">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(submission.feedbackType)}
                          <CardTitle className="text-lg">{submission.feedbackType}</CardTitle>
                          <Badge className={getStatusColor(submission.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(submission.status)}
                              {submission.status.replace('_', ' ')}
                            </div>
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Select
                            value={submission.status}
                            onValueChange={(status) => updateStatusMutation.mutate({ id: submission.id, status })}
                            disabled={updateStatusMutation.isPending}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <CardDescription>
                        Submitted {format(new Date(submission.submittedAt), 'PPp')}
                        {submission.company && ` by ${submission.company.name}`}
                        {submission.pageUrl && ` on ${submission.pageUrl}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {submission.message}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}