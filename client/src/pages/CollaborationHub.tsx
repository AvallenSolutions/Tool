import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import CollaborationDashboard from '@/components/collaboration/CollaborationDashboard';

export default function CollaborationHub() {
  return (
    <div className="flex h-screen bg-lightest-gray overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full">
        <Header 
          title="Collaboration Hub" 
          subtitle="Real-time communication and task management with suppliers"
        />
        <main className="flex-1 overflow-hidden">
          <CollaborationDashboard />
        </main>
      </div>
    </div>
  );
}