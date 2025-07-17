import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Building, CreditCard, Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();

  const { data: company } = useQuery({
    queryKey: ["/api/company"],
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-lightest-gray flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-avallen-green border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Settings" subtitle="Manage your account and company settings" />
        <main className="flex-1 p-6 overflow-y-auto">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="company">Company</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card className="border-light-gray">
                <CardHeader>
                  <CardTitle className="flex items-center text-slate-gray">
                    <User className="w-5 h-5 mr-2" />
                    Profile Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={user?.profileImageUrl} alt={user?.firstName} />
                      <AvatarFallback className="bg-avallen-green text-white text-lg">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-gray">
                        {user?.firstName} {user?.lastName}
                      </h3>
                      <p className="text-gray-600">{user?.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={user?.firstName || ''}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={user?.lastName || ''}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <p className="text-sm text-gray-600">
                    Profile information is managed through your authentication provider and cannot be changed here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="company">
              <Card className="border-light-gray">
                <CardHeader>
                  <CardTitle className="flex items-center text-slate-gray">
                    <Building className="w-5 h-5 mr-2" />
                    Company Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={company?.name || ''}
                      placeholder="Enter company name"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="industry">Industry</Label>
                      <Input
                        id="industry"
                        value={company?.industry || ''}
                        placeholder="e.g., Alcoholic Beverages"
                      />
                    </div>
                    <div>
                      <Label htmlFor="size">Company Size</Label>
                      <Input
                        id="size"
                        value={company?.size || ''}
                        placeholder="e.g., Small, Medium, Large"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={company?.website || ''}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={company?.address || ''}
                      placeholder="Enter company address"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={company?.country || ''}
                        placeholder="Enter country"
                      />
                    </div>
                    <div>
                      <Label>Onboarding Status</Label>
                      <div className="mt-2">
                        <Badge className={company?.onboardingComplete ? "bg-success-green/20 text-success-green" : "bg-muted-gold/20 text-muted-gold"}>
                          {company?.onboardingComplete ? "Complete" : "In Progress"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Button className="bg-avallen-green hover:bg-avallen-green-light text-white">
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing">
              <Card className="border-light-gray">
                <CardHeader>
                  <CardTitle className="flex items-center text-slate-gray">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Billing & Subscription
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-lightest-gray rounded-lg">
                    <h3 className="font-semibold text-slate-gray mb-2">Current Plan</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-slate-gray">Professional</p>
                        <p className="text-gray-600">$299/month</p>
                      </div>
                      <Badge className="bg-success-green/20 text-success-green">Active</Badge>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-gray">Billing Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="billingName">Billing Name</Label>
                        <Input
                          id="billingName"
                          placeholder="Company name for billing"
                        />
                      </div>
                      <div>
                        <Label htmlFor="billingEmail">Billing Email</Label>
                        <Input
                          id="billingEmail"
                          type="email"
                          placeholder="billing@company.com"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-gray">Payment Method</h3>
                    <div className="p-4 border border-light-gray rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <CreditCard className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-slate-gray">•••• •••• •••• 4242</p>
                            <p className="text-sm text-gray-600">Expires 12/25</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Update
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button className="bg-avallen-green hover:bg-avallen-green-light text-white">
                      Update Billing
                    </Button>
                    <Button variant="outline" className="border-slate-gray text-slate-gray">
                      Download Invoice
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="account">
              <Card className="border-light-gray">
                <CardHeader>
                  <CardTitle className="flex items-center text-slate-gray">
                    <SettingsIcon className="w-5 h-5 mr-2" />
                    Account Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-gray">Preferences</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium text-slate-gray">Email Notifications</Label>
                          <p className="text-sm text-gray-600">Receive updates about your reports and account</p>
                        </div>
                        <input type="checkbox" className="toggle" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium text-slate-gray">Report Reminders</Label>
                          <p className="text-sm text-gray-600">Get reminded when it's time to generate reports</p>
                        </div>
                        <input type="checkbox" className="toggle" defaultChecked />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-gray">Account Actions</h3>
                    <div className="space-y-3">
                      <Button 
                        onClick={handleLogout}
                        variant="outline" 
                        className="border-slate-gray text-slate-gray"
                      >
                        Sign Out
                      </Button>
                      <Button 
                        variant="outline" 
                        className="border-error-red text-error-red hover:bg-error-red hover:text-white"
                      >
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
