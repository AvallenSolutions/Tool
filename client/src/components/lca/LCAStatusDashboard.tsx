import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Server, 
  Database,
  BarChart3,
  AlertCircle
} from "lucide-react";

export default function LCAStatusDashboard() {
  // Fetch LCA service status
  const { data: serviceStatus, isLoading } = useQuery({
    queryKey: ["/api/lca/status"],
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Fetch queue statistics
  const { data: queueStats } = useQuery({
    queryKey: ["/api/lca/queue/stats"],
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-avallen-green" />
            LCA Service Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: boolean) => {
    return status ? (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Connected
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">
        <XCircle className="w-3 h-3 mr-1" />
        Disconnected
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-avallen-green" />
            LCA Service Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Service</span>
                {getStatusBadge(serviceStatus?.initialized)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">OpenLCA Connection</span>
                {getStatusBadge(serviceStatus?.openLCAConnected)}
              </div>
            </div>
            
            {serviceStatus?.databaseInfo && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">Database</span>
                </div>
                <p className="text-sm text-gray-600">{serviceStatus.databaseInfo.name}</p>
              </div>
            )}
          </div>

          {serviceStatus?.mappingStats && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Mapping Statistics</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Flow Mappings: </span>
                  <span className="font-medium">{serviceStatus.mappingStats.flowMappings}</span>
                </div>
                <div>
                  <span className="text-gray-600">Process Mappings: </span>
                  <span className="font-medium">{serviceStatus.mappingStats.processMappings}</span>
                </div>
              </div>
            </div>
          )}

          {!serviceStatus?.openLCAConnected && (
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  OpenLCA Not Available
                </span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Advanced LCA calculations require OpenLCA server connection. 
                Basic calculations will use simplified methods.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Queue Statistics */}
      {queueStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5 text-avallen-green" />
              Calculation Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium">Waiting</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">{queueStats.waiting}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Active</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{queueStats.active}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Completed</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{queueStats.completed}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium">Failed</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{queueStats.failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}