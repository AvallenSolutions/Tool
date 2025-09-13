import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { useAuth } from "@/hooks/useAuth";
import { Suspense, lazy } from "react";
import { FeedbackWidget } from "@/components/FeedbackWidget";

// EAGER-LOADED: Essential pages for initial user flow
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Welcome from "@/pages/welcome";
import Dashboard from "@/pages/dashboard";

// LAZY-LOADED: Admin pages (highest priority for bundle splitting)
const AdminDashboardMain = lazy(() => import("@/pages/admin/EnhancedAdminDashboard"));
const SupplierManagement = lazy(() => import("@/pages/admin/SupplierManagement"));
const UserManagement = lazy(() => import("@/pages/admin/UserManagement"));
const UserDetail = lazy(() => import("@/pages/admin/UserDetail"));
const PerformanceAnalytics = lazy(() => import("@/pages/admin/PerformanceAnalytics"));
const AdminMessagingPage = lazy(() => import("@/pages/admin/AdminMessaging"));
const AdminSupplierDetail = lazy(() => import("@/pages/admin/SupplierDetail"));
const SupplierEdit = lazy(() => import("@/pages/admin/SupplierEdit"));
const AdminProductManagement = lazy(() => import("@/pages/admin/ProductManagement"));
const LCAApprovals = lazy(() => import("@/pages/admin/LCAApprovals"));
const LCAJobsMonitoring = lazy(() => import("@/pages/admin/LCAJobsMonitoring"));
const SupplierDataAdmin = lazy(() => import("@/pages/admin/SupplierDataAdmin"));
const SupplierDataExtraction = lazy(() => import("@/pages/admin/SupplierDataExtraction"));
const SupplierInvitations = lazy(() => import("@/pages/admin/SupplierInvitations"));
const FeedbackDashboard = lazy(() => import("@/pages/admin/FeedbackDashboard"));
const SupplierManagementOverview = lazy(() => import("@/pages/admin/supplier-management/SupplierManagementOverview"));
const CreateSupplierProduct = lazy(() => import("@/pages/admin/supplier-management/CreateSupplierProduct"));

// LAZY-LOADED: LCA and calculation pages (heavy computational components)
const LCAPage = lazy(() => import("@/pages/LCAPage"));
const ProductLcaPage = lazy(() => import("@/pages/ProductLcaPage"));
const Company = lazy(() => import("@/pages/Company"));

// LAZY-LOADED: Report builder and analytics (heavy components)
const Reports = lazy(() => import("@/pages/reports"));
const ReportsCreate = lazy(() => import("@/pages/reports-create"));
const ReportBuilder = lazy(() => import("@/pages/report-builder"));
const AIInsightsPage = lazy(() => import("@/pages/ai-insights"));
const KPIsPage = lazy(() => import("@/pages/kpis"));

// LAZY-LOADED: Product management
const Products = lazy(() => import("@/pages/products"));
const CreateEnhancedProduct = lazy(() => import("@/pages/CreateEnhancedProduct"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));

// LAZY-LOADED: Supplier network and management
const SupplierNetwork = lazy(() => import("@/pages/SupplierNetwork"));
const SupplierDetail = lazy(() => import("@/pages/SupplierDetail"));
const SupplierProductDetailPage = lazy(() => import("@/pages/SupplierProductDetail"));
const SupplierOnboarding = lazy(() => import("@/pages/SupplierOnboarding"));
const SupplierRegistration = lazy(() => import("@/pages/SupplierRegistration"));
const SupplierPortal = lazy(() => import("@/pages/SupplierPortal"));
const Suppliers = lazy(() => import("@/pages/suppliers"));

// LAZY-LOADED: Secondary pages
const Settings = lazy(() => import("@/pages/settings"));
const Onboarding = lazy(() => import("@/pages/onboarding"));
const ProductRegistration = lazy(() => import("@/pages/ProductRegistration"));
const GreenwashGuardian = lazy(() => import("@/pages/GreenwashGuardian"));
const TestRunner = lazy(() => import("@/pages/TestRunner"));
const CollaborationHub = lazy(() => import("@/pages/CollaborationHub"));
const InitiativesPage = lazy(() => import("@/pages/initiatives"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy-policy"));
const TermsOfService = lazy(() => import("@/pages/terms-of-service"));
const ComingSoon = lazy(() => import("@/pages/ComingSoon"));

// LAZY-LOADED: Pioneers subscription pages
const PioneersSubscriptionSimple = lazy(() => import("@/pages/pioneers-subscription-simple"));
const PioneersNoStripe = lazy(() => import("@/pages/pioneers-no-stripe"));
const PioneersPaymentTest = lazy(() => import("@/pages/pioneers-payment-test"));

// Loading fallback component for better UX
function PageLoadingFallback() {
  return (
    <div className="min-h-screen bg-lightest-gray flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin w-8 h-8 border-4 border-avallen-green border-t-transparent rounded-full" />
        <p className="text-muted-foreground">Loading page...</p>
      </div>
    </div>
  );
}

// Wrapper component for lazy-loaded routes
function LazyRoute({ component: Component, ...props }: { component: React.ComponentType<any> }) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Component {...props} />
    </Suspense>
  );
}

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
  // Optimized router with lazy loading for better performance
  return (
    <Switch>
      {/* EAGER-LOADED ROUTES: Essential user flow */}
      <Route path="/" component={SimpleTestComponent} />
      <Route path="/login" component={Login} />
      <Route path="/landing" component={Landing} />
      <Route path="/app/welcome" component={Welcome} />
      <Route path="/app/dashboard" component={Dashboard} />
      
      {/* LAZY-LOADED ROUTES: Admin pages (highest priority for bundle splitting) */}
      <Route path="/app/admin" component={(props) => <LazyRoute component={AdminDashboardMain} {...props} />} />
      <Route path="/app/admin/dashboard" component={(props) => <LazyRoute component={AdminDashboardMain} {...props} />} />
      <Route path="/app/admin/supplier-management/overview" component={(props) => <LazyRoute component={SupplierManagementOverview} {...props} />} />
      <Route path="/app/admin/supplier-management/suppliers" component={(props) => <LazyRoute component={SupplierManagement} {...props} />} />
      <Route path="/app/admin/supplier-management/products" component={(props) => <LazyRoute component={AdminProductManagement} {...props} />} />
      <Route path="/app/admin/supplier-management/products/create" component={(props) => <LazyRoute component={CreateSupplierProduct} {...props} />} />
      <Route path="/app/admin/supplier-management/data-extraction" component={(props) => <LazyRoute component={SupplierDataExtraction} {...props} />} />
      <Route path="/app/admin/supplier-management/onboarding" component={(props) => <LazyRoute component={SupplierRegistration} {...props} />} />
      <Route path="/app/admin/suppliers/:id/edit" component={(props) => <LazyRoute component={SupplierEdit} {...props} />} />
      <Route path="/app/admin/suppliers/:id" component={(props) => <LazyRoute component={AdminSupplierDetail} {...props} />} />
      <Route path="/app/admin/suppliers" component={(props) => <LazyRoute component={SupplierManagement} {...props} />} />
      <Route path="/app/admin/supplier-management" component={(props) => <LazyRoute component={SupplierManagement} {...props} />} />
      <Route path="/app/admin/products" component={(props) => <LazyRoute component={AdminProductManagement} {...props} />} />
      <Route path="/app/admin/product-management" component={(props) => <LazyRoute component={AdminProductManagement} {...props} />} />
      <Route path="/app/admin/lca-approvals" component={(props) => <LazyRoute component={LCAApprovals} {...props} />} />
      <Route path="/app/admin/lca-jobs" component={(props) => <LazyRoute component={LCAJobsMonitoring} {...props} />} />
      <Route path="/app/admin/supplier-data" component={(props) => <LazyRoute component={SupplierDataAdmin} {...props} />} />
      <Route path="/app/admin/data-extraction" component={(props) => <LazyRoute component={SupplierDataExtraction} {...props} />} />
      <Route path="/app/admin/invitations" component={(props) => <LazyRoute component={SupplierInvitations} {...props} />} />
      <Route path="/app/admin/feedback" component={(props) => <LazyRoute component={FeedbackDashboard} {...props} />} />
      <Route path="/app/admin/users/:companyId" component={(props) => <LazyRoute component={UserDetail} {...props} />} />
      <Route path="/app/admin/users" component={(props) => <LazyRoute component={UserManagement} {...props} />} />
      <Route path="/app/admin/analytics" component={(props) => <LazyRoute component={PerformanceAnalytics} {...props} />} />
      <Route path="/app/admin/messaging" component={(props) => <LazyRoute component={AdminMessagingPage} {...props} />} />
      
      {/* LAZY-LOADED ROUTES: LCA and calculation pages (heavy computational components) */}
      <Route path="/app/lca" component={(props) => <LazyRoute component={LCAPage} {...props} />} />
      <Route path="/app/products/:productId/lca" component={(props) => <LazyRoute component={ProductLcaPage} {...props} />} />
      <Route path="/app/company" component={(props) => <LazyRoute component={Company} {...props} />} />
      <Route path="/footprint" component={(props) => <LazyRoute component={Company} {...props} />} />
      
      {/* LAZY-LOADED ROUTES: Report builder and analytics (heavy components) */}
      <Route path="/app/reports" component={(props) => <LazyRoute component={Reports} {...props} />} />
      <Route path="/app/reports/create" component={(props) => <LazyRoute component={ReportsCreate} {...props} />} />
      <Route path="/app/report-builder" component={(props) => <LazyRoute component={ReportBuilder} {...props} />} />
      <Route path="/app/insights" component={(props) => <LazyRoute component={AIInsightsPage} {...props} />} />
      <Route path="/app/kpis" component={(props) => <LazyRoute component={KPIsPage} {...props} />} />
      
      {/* LAZY-LOADED ROUTES: Product management */}
      <Route path="/app/products" component={(props) => <LazyRoute component={Products} {...props} />} />
      <Route path="/create-enhanced-product" component={(props) => <LazyRoute component={CreateEnhancedProduct} {...props} />} />
      <Route path="/app/products/create/enhanced" component={(props) => <LazyRoute component={CreateEnhancedProduct} {...props} />} />
      <Route path="/app/products/:id/enhanced" component={(props) => <LazyRoute component={CreateEnhancedProduct} {...props} />} />
      <Route path="/app/products/:id" component={(props) => <LazyRoute component={ProductDetail} {...props} />} />
      
      {/* LAZY-LOADED ROUTES: Supplier network and management */}
      <Route path="/app/supplier-network" component={(props) => <LazyRoute component={SupplierNetwork} {...props} />} />
      <Route path="/app/supplier-network/supplier/:id" component={(props) => <LazyRoute component={SupplierDetail} {...props} />} />
      <Route path="/app/supplier-network/product/:id" component={(props) => <LazyRoute component={SupplierProductDetailPage} {...props} />} />
      <Route path="/app/supplier-onboarding" component={(props) => <LazyRoute component={SupplierOnboarding} {...props} />} />
      <Route path="/app/supplier-registration" component={(props) => <LazyRoute component={SupplierRegistration} {...props} />} />
      <Route path="/app/suppliers" component={(props) => <LazyRoute component={Suppliers} {...props} />} />
      <Route path="/supplier-portal/:token" component={(props) => <LazyRoute component={SupplierPortal} {...props} />} />
      <Route path="/supplier-onboarding" component={(props) => <LazyRoute component={SupplierOnboarding} {...props} />} />
      
      {/* LAZY-LOADED ROUTES: Secondary pages */}
      <Route path="/app/settings" component={(props) => <LazyRoute component={Settings} {...props} />} />
      <Route path="/app/onboarding" component={(props) => <LazyRoute component={Onboarding} {...props} />} />
      <Route path="/app/product-registration" component={(props) => <LazyRoute component={ProductRegistration} {...props} />} />
      <Route path="/app/greenwash-guardian" component={(props) => <LazyRoute component={GreenwashGuardian} {...props} />} />
      <Route path="/app/collaboration" component={(props) => <LazyRoute component={CollaborationHub} {...props} />} />
      <Route path="/app/initiatives" component={(props) => <LazyRoute component={InitiativesPage} {...props} />} />
      <Route path="/app/privacy-policy" component={(props) => <LazyRoute component={PrivacyPolicy} {...props} />} />
      <Route path="/app/terms-of-service" component={(props) => <LazyRoute component={TermsOfService} {...props} />} />
      <Route path="/app/coming-soon" component={(props) => <LazyRoute component={ComingSoon} {...props} />} />
      <Route path="/app/test" component={(props) => <LazyRoute component={TestRunner} {...props} />} />
      
      {/* LAZY-LOADED ROUTES: Pioneers subscription pages */}
      <Route path="/pioneers/register" component={(props) => <LazyRoute component={PioneersNoStripe} {...props} />} />
      <Route path="/pioneers/simple" component={(props) => <LazyRoute component={PioneersSubscriptionSimple} {...props} />} />
      <Route path="/pioneers/test" component={(props) => <LazyRoute component={PioneersPaymentTest} {...props} />} />
      
      {/* Redirects */}
      <Route path="/app/reports/guided" component={() => { window.location.replace('/app/reports'); return null; }} />
      <Route path="/app/story" component={() => { window.location.replace('/app/company'); return null; }} />
      
      {/* 404 - Keep eager loaded for instant feedback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
          <FeedbackWidget />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
