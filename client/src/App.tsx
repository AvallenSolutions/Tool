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
import ProductDetail from "@/pages/product-detail";
import ProductEdit from "@/pages/product-edit";
import CreateEnhancedProduct from "@/pages/CreateEnhancedProduct";
import Reports from "@/pages/reports";

import Settings from "@/pages/settings";
import Onboarding from "@/pages/onboarding";
import SupplierPortal from "@/pages/SupplierPortal";
import AdminDashboard from "@/pages/AdminDashboard";
import SupplierNetwork from "@/pages/SupplierNetwork";
import LCAPage from "@/pages/LCAPage";
import TestRunner from "@/pages/TestRunner";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/app/dashboard" component={Dashboard} />
          <Route path="/app/onboarding" component={Onboarding} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/app/dashboard" component={Dashboard} />
          <Route path="/app/products" component={Products} />
          <Route path="/app/products/create/enhanced" component={CreateEnhancedProduct} />
          <Route path="/app/products/:id/enhanced" component={CreateEnhancedProduct} />
          <Route path="/app/products/:id/edit" component={ProductEdit} />
          <Route path="/app/products/:id" component={ProductDetail} />
          <Route path="/app/reports" component={Reports} />

          <Route path="/app/supplier-network" component={SupplierNetwork} />
          <Route path="/app/lca" component={LCAPage} />
          <Route path="/app/settings" component={Settings} />
          <Route path="/app/admin" component={AdminDashboard} />
          <Route path="/app/test" component={TestRunner} />
          <Route path="/app/onboarding" component={Onboarding} />
        </>
      )}
      <Route path="/supplier-portal/:token" component={SupplierPortal} />
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
