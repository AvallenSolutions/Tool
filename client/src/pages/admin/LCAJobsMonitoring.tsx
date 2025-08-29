import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Calendar,
  BarChart3,
  Database
} from "lucide-react";

interface LCAJob {
  id: string;
  reportId?: number;
  status: string;
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  errorMessage?: string;
}

interface LCAJobsResponse {
  success: boolean;
  data: {
    jobs: LCAJob[];
    summary: {
      totalJobs: number;
      statusBreakdown: Record<string, number>;
      lastUpdated: string;
    };
  };
}

export default function LCAJobsMonitoring() {
  const { data: jobsData, isLoading } = useQuery<LCAJobsResponse>({
    queryKey: ['/api/admin/lca-jobs'],
    refetchInterval: 15000, // Refresh every 15 seconds for real-time monitoring
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Activity className="w-3 h-3 mr-1" />Processing</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">LCA Jobs Monitoring</h1>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const jobs = jobsData?.data?.jobs || [];
  const summary = jobsData?.data?.summary;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">LCA Jobs Monitoring</h1>
                <p className="text-muted-foreground">
                  Monitor LCA calculation jobs and their execution status
                </p>
              </div>
              <Badge variant={jobs.length > 0 ? "default" : "secondary"}>
                <Database className="w-4 h-4 mr-1" />
                {summary?.totalJobs || 0} total jobs
              </Badge>
            </div>

            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(summary.statusBreakdown).map(([status, count]) => (
                  <Card key={status}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {status === 'completed' && <CheckCircle className="w-4 h-4 text-green-600" />}
                          {status === 'pending' && <Clock className="w-4 h-4 text-yellow-600" />}
                          {status === 'processing' && <Activity className="w-4 h-4 text-blue-600" />}
                          {status === 'failed' && <XCircle className="w-4 h-4 text-red-600" />}
                          <span className="text-sm font-medium capitalize">{status}</span>
                        </div>
                        <span className="text-2xl font-bold">{count}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Jobs List */}
            <div className="space-y-4">
              {jobs.length > 0 ? (
                jobs.map((job) => {
                  const startTime = formatDateTime(job.startedAt);
                  const completedTime = job.completedAt ? formatDateTime(job.completedAt) : null;

                  return (
                    <Card key={job.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-5 w-5 text-blue-600" />
                              <h3 className="text-lg font-semibold">Job #{job.id}</h3>
                            </div>
                            {getStatusBadge(job.status)}
                          </div>
                          {job.reportId && (
                            <Badge variant="outline">Report #{job.reportId}</Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <div>
                              <div>Started: {startTime.date}</div>
                              <div className="text-xs">{startTime.time}</div>
                            </div>
                          </div>
                          
                          {completedTime && (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              <div>
                                <div>Completed: {completedTime.date}</div>
                                <div className="text-xs">{completedTime.time}</div>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            <span>Duration: {formatDuration(job.durationSeconds)}</span>
                          </div>

                          {job.status === 'failed' && job.errorMessage && (
                            <div className="flex items-center gap-2 col-span-full">
                              <XCircle className="h-4 w-4 text-red-500" />
                              <span className="text-red-600 text-sm">{job.errorMessage}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-3 bg-gray-100 rounded-full">
                        <Database className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">No LCA Jobs Found</h3>
                        <p className="text-muted-foreground">
                          No LCA calculation jobs have been executed yet. Jobs will appear here when LCA calculations are triggered.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Last Updated */}
            {summary && (
              <div className="text-center text-sm text-muted-foreground">
                Last updated: {new Date(summary.lastUpdated).toLocaleString()}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}