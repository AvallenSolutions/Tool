import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BarChart3, FileText, Users, Settings, LogOut, Package, Shield, Building2, TestTube, UserPlus, Mail, MessageSquare, MessageCircle, ChevronDown, ChevronRight, Activity, Sparkles } from "lucide-react";
import avallenLogo from "@/assets/avallen-logo.png";

export default function Sidebar() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [adminExpanded, setAdminExpanded] = useState(false);
  const [reportsExpanded, setReportsExpanded] = useState(false);

  // Fetch company data to show company name in header
  const { data: company } = useQuery({
    queryKey: ["/api/company"],
    retry: false,
  });

  // Auto-expand Reports section when on any reports-related page
  useEffect(() => {
    if (location.startsWith('/app/reports')) {
      setReportsExpanded(true);
    }
  }, [location]);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const navItems = [
    { path: "/app/dashboard", label: "Dashboard", icon: BarChart3 },
    { path: "/app/company", label: "Company", icon: Building2 },
    { path: "/app/products", label: "Products", icon: Package },
    { path: "/app/greenwash-guardian", label: "GreenwashGuardian", icon: Shield },
    { path: "/app/supplier-network", label: "Supplier Network", icon: Users },
    { path: "/app/collaboration", label: "Collaboration Hub", icon: MessageSquare },
    { path: "/app/settings", label: "Settings", icon: Settings },
    { path: "/app/test", label: "Test Runner", icon: TestTube },
  ];

  const reportsSubItems = [
    { path: "/app/reports/create", label: "Create Reports", icon: Sparkles },
    { path: "/app/reports", label: "View Reports", icon: FileText },
  ];

  const adminSubItems = [
    { path: "/app/admin", label: "Overview", icon: BarChart3 },
    { path: "/app/admin/users", label: "User Management", icon: UserPlus },
    { path: "/app/admin/feedback", label: "Beta Feedback", icon: MessageCircle },
    { path: "/app/admin/lca-jobs", label: "LCA Monitoring", icon: Activity },
    { path: "/app/admin/analytics", label: "Performance Analytics", icon: Activity },
    { path: "/app/admin/messaging", label: "Messaging", icon: MessageSquare },
  ];

  return (
    <nav className="w-64 bg-[#209d50] border-r border-green-600 flex flex-col" id="sidebar-nav">
      {/* Company Logo */}
      <div className="p-6 border-b border-green-600">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-[#209d50] font-bold text-sm">
              {company?.name ? company.name.charAt(0).toUpperCase() : 'A'}
            </span>
          </div>
          <span className="text-xl font-headline text-white">
            {company?.name || 'Loading...'}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4">
        <ul className="space-y-2">
          {/* Dashboard */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-4 py-3 rounded-lg transition-colors ${
                location === "/app/dashboard"
                  ? "bg-white text-[#209d50] hover:bg-gray-100"
                  : "text-white hover:bg-green-600"
              }`}
              onClick={() => navigate("/app/dashboard")}
            >
              <BarChart3 className="w-5 h-5 mr-3" />
              <span className="font-body font-medium">Dashboard</span>
            </Button>
          </li>

          {/* Company */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-4 py-3 rounded-lg transition-colors ${
                location === "/app/company"
                  ? "bg-white text-[#209d50] hover:bg-gray-100"
                  : "text-white hover:bg-green-600"
              }`}
              onClick={() => navigate("/app/company")}
            >
              <Building2 className="w-5 h-5 mr-3" />
              <span className="font-body font-medium">Company</span>
            </Button>
          </li>

          {/* Products */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-4 py-3 rounded-lg transition-colors ${
                location === "/app/products"
                  ? "bg-white text-[#209d50] hover:bg-gray-100"
                  : "text-white hover:bg-green-600"
              }`}
              onClick={() => navigate("/app/products")}
            >
              <Package className="w-5 h-5 mr-3" />
              <span className="font-body font-medium">Products</span>
            </Button>
          </li>
          {/* Reports Section with Sub-items */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-4 py-3 rounded-lg transition-colors ${
                location.startsWith('/app/reports')
                  ? "bg-white text-[#209d50] hover:bg-gray-100"
                  : "text-white hover:bg-green-600"
              }`}
              onClick={() => setReportsExpanded(!reportsExpanded)}
            >
              <FileText className="w-5 h-5 mr-3" />
              <span className="font-body font-medium flex-1 text-left">Reports</span>
              {reportsExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
            
            {/* Reports Sub-items */}
            {reportsExpanded && (
              <ul className="mt-2 ml-4 space-y-1">
                {reportsSubItems.map((subItem) => {
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

          {/* GreenwashGuardian */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-4 py-3 rounded-lg transition-colors ${
                location === "/app/greenwash-guardian"
                  ? "bg-white text-[#209d50] hover:bg-gray-100"
                  : "text-white hover:bg-green-600"
              }`}
              onClick={() => navigate("/app/greenwash-guardian")}
            >
              <Shield className="w-5 h-5 mr-3" />
              <span className="font-body font-medium">GreenwashGuardian</span>
            </Button>
          </li>

          {/* Supplier Network */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-4 py-3 rounded-lg transition-colors ${
                location === "/app/supplier-network"
                  ? "bg-white text-[#209d50] hover:bg-gray-100"
                  : "text-white hover:bg-green-600"
              }`}
              onClick={() => navigate("/app/supplier-network")}
            >
              <Users className="w-5 h-5 mr-3" />
              <span className="font-body font-medium">Supplier Network</span>
            </Button>
          </li>

          {/* Collaboration Hub */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-4 py-3 rounded-lg transition-colors ${
                location === "/app/collaboration"
                  ? "bg-white text-[#209d50] hover:bg-gray-100"
                  : "text-white hover:bg-green-600"
              }`}
              onClick={() => navigate("/app/collaboration")}
            >
              <MessageSquare className="w-5 h-5 mr-3" />
              <span className="font-body font-medium">Collaboration Hub</span>
            </Button>
          </li>

          {/* Settings */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-4 py-3 rounded-lg transition-colors ${
                location === "/app/settings"
                  ? "bg-white text-[#209d50] hover:bg-gray-100"
                  : "text-white hover:bg-green-600"
              }`}
              onClick={() => navigate("/app/settings")}
            >
              <Settings className="w-5 h-5 mr-3" />
              <span className="font-body font-medium">Settings</span>
            </Button>
          </li>

          {/* Test Runner */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-4 py-3 rounded-lg transition-colors ${
                location === "/app/test"
                  ? "bg-white text-[#209d50] hover:bg-gray-100"
                  : "text-white hover:bg-green-600"
              }`}
              onClick={() => navigate("/app/test")}
            >
              <TestTube className="w-5 h-5 mr-3" />
              <span className="font-body font-medium">Test Runner</span>
            </Button>
          </li>
          
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
        
        {/* Avallen Solutions Branding */}
        <div className="flex items-center justify-center mt-4 pt-4 border-t border-green-600">
          <img 
            src={avallenLogo} 
            alt="Powered by Avallen Solutions" 
            className="h-12 w-auto opacity-80 hover:opacity-100 transition-opacity"
          />
        </div>
      </div>
    </nav>
  );
}
