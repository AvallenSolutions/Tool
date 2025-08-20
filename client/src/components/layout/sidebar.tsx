import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BarChart3, FileText, Users, Settings, LogOut, Package, Shield, Building2, TestTube, UserPlus, Mail, MessageSquare, ChevronDown, ChevronRight, Activity, Target, Sparkles } from "lucide-react";

export default function Sidebar() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [adminExpanded, setAdminExpanded] = useState(false);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const navItems = [
    { path: "/app/dashboard", label: "Dashboard", icon: BarChart3 },
    { path: "/app/company", label: "Company", icon: Building2 },
    { path: "/app/products", label: "Products", icon: Package },
    { path: "/app/reports", label: "Reports", icon: FileText },
    { path: "/app/initiatives", label: "Initiatives", icon: Target },
    { path: "/app/report-builder", label: "Report Builder", icon: Sparkles },
    { path: "/app/greenwash-guardian", label: "GreenwashGuardian", icon: Shield },
    { path: "/app/supplier-network", label: "Supplier Network", icon: Users },
    { path: "/app/collaboration", label: "Collaboration Hub", icon: MessageSquare },
    { path: "/app/settings", label: "Settings", icon: Settings },
    { path: "/app/test", label: "Test Runner", icon: TestTube },
  ];

  const adminSubItems = [
    { path: "/app/admin", label: "Overview", icon: BarChart3 },
    { path: "/app/admin/users", label: "User Management", icon: UserPlus },
    { path: "/app/admin/analytics", label: "Performance Analytics", icon: Activity },
    { path: "/app/admin/messaging", label: "Messaging", icon: MessageSquare },
  ];

  return (
    <nav className="w-64 bg-[#209d50] border-r border-green-600 flex flex-col" id="sidebar-nav">
      {/* Logo */}
      <div className="p-6 border-b border-green-600">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-[#209d50] font-bold text-sm">A</span>
          </div>
          <span className="text-xl font-headline text-white">Avallen Solutions</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <li key={item.path}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-white text-[#209d50] hover:bg-gray-100"
                      : "text-white hover:bg-green-600"
                  }`}
                  onClick={() => navigate(item.path)}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  <span className="font-body font-medium">{item.label}</span>
                </Button>
              </li>
            );
          })}
          
          {/* Admin Section */}
          {user && user.role === 'admin' && (
            <li>
              <Button
                variant="ghost"
                className={`w-full justify-start px-4 py-3 rounded-lg transition-colors ${
                  location.startsWith('/app/admin')
                    ? "bg-white text-[#209d50] hover:bg-gray-100"
                    : "text-white hover:bg-green-600"
                }`}
                onClick={() => setAdminExpanded(!adminExpanded)}
              >
                <Users className="w-5 h-5 mr-3" />
                <span className="font-body font-medium flex-1 text-left">Admin Dashboard</span>
                {adminExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
              
              {/* Admin Sub-items */}
              {adminExpanded && (
                <ul className="mt-2 ml-4 space-y-1">
                  {adminSubItems.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const isSubActive = location === subItem.path;
                    
                    return (
                      <li key={subItem.path}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`w-full justify-start px-3 py-2 rounded-md transition-colors ${
                            isSubActive
                              ? "bg-white text-[#209d50] hover:bg-gray-100"
                              : "text-white/80 hover:bg-green-600 hover:text-white"
                          }`}
                          onClick={() => navigate(subItem.path)}
                        >
                          <SubIcon className="w-4 h-4 mr-2" />
                          <span className="font-body text-sm">{subItem.label}</span>
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          )}
        </ul>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-green-600">
        <div className="flex items-center space-x-3 mb-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user?.profileImageUrl || ''} alt={user?.firstName || 'User'} />
            <AvatarFallback className="bg-white text-[#209d50]">
              {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || ''}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              {user?.firstName || 'User'} {user?.lastName || ''}
            </p>
            <p className="text-xs text-green-100">{user?.email || ''}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-white hover:bg-green-600"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </nav>
  );
}
