import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import ProductDetailOld from "@/pages/product-detail";
import ProductEdit from "@/pages/product-edit";
import CreateEnhancedProduct from "@/pages/CreateEnhancedProduct";
import Reports from "@/pages/reports";

import Settings from "@/pages/settings";
import Company from "@/pages/Company";
import Onboarding from "@/pages/onboarding";
import SupplierPortal from "@/pages/SupplierPortal";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminDashboardMain from "@/pages/admin/EnhancedAdminDashboard";
import SupplierManagement from "@/pages/admin/SupplierManagement";
import UserManagement from "@/pages/admin/UserManagement";
import UserDetail from "@/pages/admin/UserDetail";
import PerformanceAnalytics from "@/pages/admin/PerformanceAnalytics";
import AdminMessagingPage from "@/pages/admin/AdminMessaging";
import AdminSupplierDetail from "@/pages/admin/SupplierDetail";
import SupplierEdit from "@/pages/admin/SupplierEdit";
import AdminProductManagement from "@/pages/admin/ProductManagement";
import LCAApprovals from "@/pages/admin/LCAApprovals";
import SupplierDataAdmin from "@/pages/admin/SupplierDataAdmin";
import SupplierDataExtraction from "@/pages/admin/SupplierDataExtraction";
import SupplierInvitations from "@/pages/admin/SupplierInvitations";
import SupplierNetwork from "@/pages/SupplierNetwork";
import SupplierDetail from "@/pages/SupplierDetail";
import ProductDetail from "@/pages/ProductDetail";
import SupplierProductDetailPage from "@/pages/SupplierProductDetail";
import SupplierOnboarding from "@/pages/SupplierOnboarding";
import SupplierRegistration from "@/pages/SupplierRegistration";
import ProductRegistration from "@/pages/ProductRegistration";
import Suppliers from "@/pages/suppliers";
import GreenwashGuardian from "@/pages/GreenwashGuardian";
import LCAPage from "@/pages/LCAPage";
import TestRunner from "@/pages/TestRunner";
import CollaborationHub from "@/pages/CollaborationHub";
import ProductLcaPage from "@/pages/ProductLcaPage";
import { KPIsPage } from "@/pages/kpis";
import CompanyStoryPage from "@/pages/story";

function SimpleTestComponent() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-green-600 mb-6">
          Drinks Sustainability Tool - Test Mode
        </h1>
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Application Status</h2>
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span>React App: Running</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span>Authentication: Bypassed (Development)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span>GreenwashGuardian AI: Ready</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => window.location.href = '/app/greenwash-guardian'}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Test GreenwashGuardian AI
            </button>
            <button 
              onClick={() => window.location.href = '/app/onboarding'}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Test New 5-Step Onboarding
            </button>
            <button 
              onClick={() => window.location.href = '/app/dashboard'}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
            <button 
              onClick={() => window.location.href = '/app/collaboration'}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Test Collaboration Dashboard
            </button>
            <button 
              onClick={() => window.location.href = '/app/company'}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Test Carbon Footprint Calculator
            </button>
            <button 
              onClick={() => window.location.href = '/app/kpis'}
              className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              KPI & Goal Management
            </button>
            <button 
              onClick={() => window.location.href = '/app/reports'}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
            >
              Sustainability Reports
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}

function Router() {
  // Simplified router that always shows the test component first
  return (
    <Switch>
      <Route path="/" component={SimpleTestComponent} />
      <Route path="/app/greenwash-guardian" component={GreenwashGuardian} />
      <Route path="/app/dashboard" component={Dashboard} />
      <Route path="/app/onboarding" component={Onboarding} />
      <Route path="/app/products" component={Products} />
      <Route path="/create-enhanced-product" component={CreateEnhancedProduct} />
      <Route path="/app/products/create/enhanced" component={CreateEnhancedProduct} />
      <Route path="/app/products/:id/enhanced" component={CreateEnhancedProduct} />
      <Route path="/app/products/:id/edit" component={ProductEdit} />
      <Route path="/app/products/:productId/lca" component={ProductLcaPage} />
      <Route path="/app/products/:id" component={ProductDetail} />
      <Route path="/app/reports" component={Reports} />
      <Route path="/app/supplier-network" component={SupplierNetwork} />
      <Route path="/app/supplier-network/supplier/:id" component={SupplierDetail} />
      <Route path="/app/supplier-network/product/:id" component={SupplierProductDetailPage} />
      <Route path="/app/supplier-onboarding" component={SupplierOnboarding} />
      <Route path="/app/supplier-registration" component={SupplierRegistration} />
      <Route path="/app/product-registration" component={ProductRegistration} />
      <Route path="/app/suppliers" component={Suppliers} />
      <Route path="/app/lca" component={LCAPage} />
      <Route path="/app/company" component={Company} />
      <Route path="/app/settings" component={Settings} />
      <Route path="/app/kpis" component={KPIsPage} />
      <Route path="/app/admin" component={AdminDashboardMain} />
      <Route path="/app/admin/suppliers/:id/edit" component={SupplierEdit} />
      <Route path="/app/admin/suppliers/:id" component={AdminSupplierDetail} />
      <Route path="/app/admin/suppliers" component={SupplierManagement} />
      <Route path="/app/admin/supplier-management" component={SupplierManagement} />
      <Route path="/app/admin/products" component={AdminProductManagement} />
      <Route path="/app/collaboration" component={CollaborationHub} />
      <Route path="/app/admin/product-management" component={AdminProductManagement} />
      <Route path="/app/admin/lca-approvals" component={LCAApprovals} />
      <Route path="/app/admin/supplier-data" component={SupplierDataAdmin} />
      <Route path="/app/admin/data-extraction" component={SupplierDataExtraction} />
      <Route path="/app/admin/invitations" component={SupplierInvitations} />
      <Route path="/app/admin/users/:companyId" component={UserDetail} />
      <Route path="/app/admin/users" component={UserManagement} />
      <Route path="/app/admin/analytics" component={PerformanceAnalytics} />
      <Route path="/app/admin/messaging" component={AdminMessagingPage} />
      <Route path="/app/story" component={CompanyStoryPage} />
      <Route path="/app/test" component={TestRunner} />
      <Route path="/supplier-portal/:token" component={SupplierPortal} />
      <Route path="/supplier-onboarding" component={SupplierOnboarding} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
