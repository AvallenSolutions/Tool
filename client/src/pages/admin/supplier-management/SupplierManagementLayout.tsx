import { ReactNode } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

interface SupplierManagementLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export default function SupplierManagementLayout({ 
  children, 
  title, 
  subtitle = "Comprehensive supplier management and collaboration tools" 
}: SupplierManagementLayoutProps) {
  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}