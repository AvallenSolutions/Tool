import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BarChart3, FileText, Users, Settings, LogOut, Package, Shield, Building2, TestTube, UserPlus, Mail, MessageSquare, MessageCircle, ChevronDown, ChevronRight, Activity, Sparkles, Target, Flag, Factory, Database, Globe, Upload, Rocket, Brain } from "lucide-react";
import avallenLogo from "@/assets/avallen-logo.png";

export default function Sidebar() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [adminExpanded, setAdminExpanded] = useState(false);
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [kpiGoalsExpanded, setKpiGoalsExpanded] = useState(false);
  const [supplierManagementExpanded, setSupplierManagementExpanded] = useState(false);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const scrollPosition = useRef<number>(0);
  const isNavigating = useRef<boolean>(false);

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

  // Auto-expand KPI & Goals section when on any KPI/Goals-related page
  useEffect(() => {
    if (location.startsWith('/app/kpis') || location.startsWith('/app/initiatives')) {
      setKpiGoalsExpanded(true);
    }
  }, [location]);

  // Auto-expand Admin section when on any admin-related page
  useEffect(() => {
    if (location.startsWith('/app/admin')) {
      setAdminExpanded(true);
    }
  }, [location]);

  // Auto-expand Supplier Management section when on any supplier management page
  useEffect(() => {
    if (location.startsWith('/app/admin/supplier-management')) {
      setSupplierManagementExpanded(true);
    }
  }, [location]);

  // Store scroll position whenever we're in supplier management
  useEffect(() => {
    const handleScroll = () => {
      if (location.startsWith('/app/admin/supplier-management') && navContainerRef.current && !isNavigating.current) {
        scrollPosition.current = navContainerRef.current.scrollTop;
      }
    };

    const container = navContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [location]);

  // Handle supplier management navigation without scroll reset
  const handleSupplierNavigation = (path: string) => {
    // Store current position
    if (navContainerRef.current) {
      scrollPosition.current = navContainerRef.current.scrollTop;
    }
    
    isNavigating.current = true;
    
    // Prevent any scrolling during navigation
    if (navContainerRef.current) {
      navContainerRef.current.style.overflowY = 'hidden';
    }
    
    navigate(path);
    
    // Restore scrolling and position after navigation
    setTimeout(() => {
      if (navContainerRef.current) {
        navContainerRef.current.style.overflowY = 'auto';
        navContainerRef.current.scrollTop = scrollPosition.current;
      }
      isNavigating.current = false;
    }, 100);
  };

  // Restore scroll position after navigation - more aggressive approach
  useEffect(() => {
    if (location.startsWith('/app/admin/supplier-management') && scrollPosition.current > 0 && isNavigating.current) {
      const restoreScroll = () => {
        if (navContainerRef.current) {
          navContainerRef.current.scrollTop = scrollPosition.current;
        }
      };
      
      // Immediate restoration
      restoreScroll();
      
      // Multiple restoration attempts with different timings
      requestAnimationFrame(restoreScroll);
      setTimeout(restoreScroll, 1);
      setTimeout(restoreScroll, 5);
      setTimeout(restoreScroll, 10);
      setTimeout(restoreScroll, 50);
      setTimeout(restoreScroll, 100);
      setTimeout(restoreScroll, 200);
    }
  }, [location]);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const navItems = [
    { path: "/app/dashboard", label: "Dashboard", icon: BarChart3 },
    { path: "/app/company", label: "Company", icon: Building2 },
    { path: "/app/products", label: "Products", icon: Package },
    { path: "/app/report-builder", label: "Report Builder", icon: FileText },
    { path: "/app/insights", label: "AI Insights", icon: Brain },
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

  const kpiGoalsSubItems = [
    { path: "/app/kpis", label: "KPIs", icon: BarChart3 },
    { path: "/app/initiatives", label: "SMART Goals", icon: Flag },
  ];

  const adminSubItems = [
    { path: "/app/admin", label: "Overview", icon: BarChart3 },
    { path: "/app/admin/users", label: "User Management", icon: UserPlus },
    { path: "/app/admin/feedback", label: "Beta Feedback", icon: MessageCircle },
    { path: "/app/admin/lca-jobs", label: "LCA Monitoring", icon: Activity },
    { path: "/app/admin/analytics", label: "Performance Analytics", icon: Activity },
    { path: "/app/admin/messaging", label: "Messaging", icon: MessageSquare },
  ];

  const supplierManagementSubItems = [
    { path: "/app/admin/supplier-management/overview", label: "Overview", icon: BarChart3 },
    { path: "/app/admin/supplier-management/suppliers", label: "Suppliers", icon: Building2 },
    { path: "/app/admin/supplier-management/products", label: "Products", icon: Package },
    { path: "/app/admin/supplier-management/data-extraction", label: "Data Extraction", icon: Globe },
    { path: "/app/admin/supplier-management/onboarding", label: "Onboarding", icon: UserPlus },
  ];

  return (
    <nav className="w-64 flex flex-col relative" id="sidebar-nav">
      {/* Header-level section - solid green to match header left edge */}
      <div className="bg-green-500 p-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-green-600 font-bold text-sm">
              {company?.name ? company.name.charAt(0).toUpperCase() : 'A'}
            </span>
          </div>
          <span className="text-xl font-headline text-white font-bold">
            {company?.name || 'Loading...'}
          </span>
        </div>
      </div>

      {/* Navigation - gradient starts here */}
      <div 
        ref={navContainerRef} 
        className="flex-1 p-4 overflow-y-auto bg-gradient-to-b from-green-500 to-blue-600 scrollbar-hide" 
        style={{ 
          scrollBehavior: 'auto',
          overflowBehavior: 'contain',
          scrollbarGutter: 'stable',
          overflowAnchor: 'auto'
        }}
      >
        <ul className="space-y-2">
          {/* Dashboard */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-4 py-3 rounded-lg transition-colors ${
                location === "/app/dashboard"
                  ? "bg-white text-green-600 hover:bg-gray-100 shadow-lg"
                  : "text-white hover:bg-white/10"
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
                  ? "bg-white text-green-600 hover:bg-gray-100 shadow-lg"
                  : "text-white hover:bg-white/10"
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
                  ? "bg-white text-green-600 hover:bg-gray-100 shadow-lg"
                  : "text-white hover:bg-white/10"
              }`}
              onClick={() => navigate("/app/products")}
            >
              <Package className="w-5 h-5 mr-3" />
              <span className="font-body font-medium">Products</span>
            </Button>
          </li>
          {/* KPIs & Goals Section with Sub-items */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-4 py-3 rounded-lg transition-colors ${
                location.startsWith('/app/facility-updates') || location.startsWith('/app/kpis') || location.startsWith('/app/initiatives')
                  ? "bg-white text-green-600 hover:bg-gray-100 shadow-lg"
                  : "text-white hover:bg-white/10"
              }`}
              onClick={() => setKpiGoalsExpanded(!kpiGoalsExpanded)}
            >
              <Factory className="w-5 h-5 mr-3" />
              <span className="font-body font-medium flex-1 text-left">KPIs & Goals</span>
              {kpiGoalsExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
            
            {/* KPI & Goals Sub-items */}
            {kpiGoalsExpanded && (
              <ul className="mt-2 ml-4 space-y-1">
                {kpiGoalsSubItems.map((subItem) => {
                  const SubIcon = subItem.icon;
                  const isSubActive = location === subItem.path;
                  
                  return (
                    <li key={subItem.path}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`w-full justify-start px-3 py-2 rounded-md transition-colors ${
                          isSubActive
                            ? "bg-white text-green-600 hover:bg-gray-100 shadow-lg"
                            : "text-white/80 hover:bg-white/10 hover:text-white"
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

          {/* Reports Section with Sub-items */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-4 py-3 rounded-lg transition-colors ${
                location.startsWith('/app/reports')
                  ? "bg-white text-green-600 hover:bg-gray-100 shadow-lg"
                  : "text-white hover:bg-white/10"
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
                            ? "bg-white text-green-600 hover:bg-gray-100 shadow-lg"
                            : "text-white/80 hover:bg-white/10 hover:text-white"
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
                  ? "bg-white text-green-600 hover:bg-gray-100 shadow-lg"
                  : "text-white hover:bg-white/10"
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
                  ? "bg-white text-green-600 hover:bg-gray-100 shadow-lg"
                  : "text-white hover:bg-white/10"
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
                  ? "bg-white text-green-600 hover:bg-gray-100 shadow-lg"
                  : "text-white hover:bg-white/10"
              }`}
              onClick={() => navigate("/app/collaboration")}
            >
              <MessageSquare className="w-5 h-5 mr-3" />
              <span className="font-body font-medium">Collaboration Hub</span>
            </Button>
          </li>

          {/* Coming Soon */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-4 py-3 rounded-lg transition-colors ${
                location === "/app/coming-soon"
                  ? "bg-white text-green-600 hover:bg-gray-100 shadow-lg"
                  : "text-white hover:bg-white/10"
              }`}
              onClick={() => navigate("/app/coming-soon")}
            >
              <Rocket className="w-5 h-5 mr-3" />
              <span className="font-body font-medium">Coming Soon...</span>
            </Button>
          </li>

          {/* Settings */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-4 py-3 rounded-lg transition-colors ${
                location === "/app/settings"
                  ? "bg-white text-green-600 hover:bg-gray-100 shadow-lg"
                  : "text-white hover:bg-white/10"
              }`}
              onClick={() => navigate("/app/settings")}
            >
              <Settings className="w-5 h-5 mr-3" />
              <span className="font-body font-medium">Settings</span>
            </Button>
          </li>
          
          {/* Admin Section */}
          {user && user.role === 'admin' && (
            <li>
              <Button
                variant="ghost"
                className={`w-full justify-start px-4 py-3 rounded-lg transition-colors ${
                  location.startsWith('/app/admin')
                    ? "bg-white text-green-600 hover:bg-gray-100 shadow-lg"
                    : "text-white hover:bg-white/10"
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
                              ? "bg-white text-green-600 font-semibold hover:bg-gray-100 border border-green-200 shadow-lg"
                              : "text-white/80 hover:bg-white/10 hover:text-white"
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

          {/* Supplier Management Section with Sub-items (Admin Only) */}
          {user && user.role === 'admin' && (
            <li>
              <Button
                variant="ghost"
                className={`w-full justify-start px-4 py-3 rounded-lg transition-colors ${
                  location.startsWith('/app/admin/supplier-management')
                    ? "bg-white text-green-600 hover:bg-gray-100 shadow-lg"
                    : "text-white hover:bg-white/10"
                }`}
                onClick={() => setSupplierManagementExpanded(!supplierManagementExpanded)}
              >
                <Building2 className="w-5 h-5 mr-3" />
                <span className="font-body font-medium flex-1 text-left">Supplier Management</span>
                {supplierManagementExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
              
              {/* Supplier Management Sub-items */}
              {supplierManagementExpanded && (
                <ul className="mt-2 ml-4 space-y-1">
                  {supplierManagementSubItems.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const isSubActive = location === subItem.path;
                    
                    return (
                      <li key={subItem.path}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`w-full justify-start px-3 py-2 rounded-md transition-colors ${
                            isSubActive
                              ? "bg-white text-green-600 font-semibold hover:bg-gray-100 border border-green-200 shadow-lg"
                              : "text-white/80 hover:bg-white/10 hover:text-white"
                          }`}
                          onClick={() => handleSupplierNavigation(subItem.path)}
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
        
        {/* Avallen Solutions Branding */}
        <div className="flex items-center justify-center mt-6 pt-4 border-t border-white/20">
          <img 
            src={avallenLogo} 
            alt="Powered by Avallen Solutions" 
            className="h-25 w-auto opacity-80 hover:opacity-100 transition-opacity"
          />
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 bg-blue-600">
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
          className="w-full justify-start text-white hover:bg-white/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </nav>
  );
}
