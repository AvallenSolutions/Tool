import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { SupplierInvitationManager } from '@/components/admin/SupplierInvitationManager';

export default function SupplierInvitations() {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <SupplierInvitationManager />
        </main>
      </div>
    </div>
  );
}