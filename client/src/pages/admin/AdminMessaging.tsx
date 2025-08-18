import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import AdminMessaging from '@/components/admin/AdminMessaging';
import { AlertTriangle } from 'lucide-react';

export default function AdminMessagingPage() {
  // Basic query to check if messaging system is accessible
  const { data: conversationsResponse, isLoading, error } = useQuery({
    queryKey: ['/api/admin/conversations'],
    queryFn: async () => {
      const response = await fetch('/api/admin/conversations?limit=1');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Admin Messaging" subtitle="Loading messaging system..." />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Admin Messaging</h1>
                <Badge variant="outline">Loading...</Badge>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Admin Messaging" subtitle="Error loading messaging system" />
          <main className="flex-1 p-6 overflow-y-auto">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <h3 className="font-medium text-red-800">Messaging System Error</h3>
                    <p className="text-sm text-red-700 mt-1">
                      Failed to load messaging system. Please refresh the page or contact support if the issue persists.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header 
          title="Admin Messaging" 
          subtitle="Direct communication with users and support conversation management"
        />
        <main className="flex-1 p-6 overflow-y-auto">
          <AdminMessaging />
        </main>
      </div>
    </div>
  );
}