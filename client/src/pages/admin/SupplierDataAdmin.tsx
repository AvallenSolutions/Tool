import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  UserPlus, 
  FileText, 
  Globe,
  Upload,
  AlertCircle
} from "lucide-react";
import { useLocation } from "wouter";

export default function SupplierDataAdmin() {
  const [, navigate] = useLocation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Data Management</h1>
          <p className="text-muted-foreground">
            Admin tools for managing supplier data and onboarding processes
          </p>
        </div>
        <Badge variant="secondary">Admin Only</Badge>
      </div>

      {/* Admin Notice */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <div>
              <h3 className="font-medium text-orange-800">Admin Access Required</h3>
              <p className="text-sm text-orange-700 mt-1">
                This section contains tools for supplier data management. Only administrators can access these features.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Manual Supplier Onboarding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Access the full supplier onboarding workflow with automated data extraction capabilities.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span>Web scraping from supplier URLs</span>
              </div>
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                <span>PDF document upload and AI extraction</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Manual form completion with verification</span>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/app/supplier-onboarding')}
              className="w-full"
            >
              Open Supplier Onboarding
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Supplier Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Review and verify supplier submissions from the management dashboard.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground mb-4">
              <div>• Review all pending supplier applications</div>
              <div>• Verify supplier information and credentials</div>
              <div>• Approve or reject supplier submissions</div>
              <div>• Manage supplier status and visibility</div>
            </div>
            <Button 
              variant="outline"
              onClick={() => navigate('/app/admin/suppliers')}
              className="w-full"
            >
              Go to Supplier Management
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Automated Data Extraction Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-3">Web Scraping Capabilities</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Extract product specifications from supplier websites</li>
                <li>• Parse material information and certifications</li>
                <li>• Capture pricing and availability data</li>
                <li>• Identify sustainability credentials</li>
                <li>• Extract contact and company information</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">PDF Analysis Features</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• AI-powered document analysis using Anthropic Claude</li>
                <li>• Extract product data from catalogs and spec sheets</li>
                <li>• Parse technical specifications and measurements</li>
                <li>• Identify compliance certifications</li>
                <li>• Extract LCA and environmental data</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Data Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <h4 className="font-medium">Data Collection</h4>
                <p className="text-sm text-muted-foreground">
                  Use URL scraping or PDF upload to automatically extract supplier product data
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <h4 className="font-medium">Human Verification</h4>
                <p className="text-sm text-muted-foreground">
                  Review and verify all auto-extracted data before saving to ensure accuracy
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <h4 className="font-medium">Database Integration</h4>
                <p className="text-sm text-muted-foreground">
                  Approved data is integrated into the verified supplier network for LCA calculations
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}