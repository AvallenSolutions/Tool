import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Building2, Leaf, Target, BarChart3 } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

export default function Company() {
  const [activeTab, setActiveTab] = useState("overview");

  // Calculate completion percentage (placeholder logic)
  const completionPercentage = 45;

  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Company" subtitle="Manage your environmental impact and sustainability data" />
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Progress Overview */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Environmental Data Collection</h3>
                  <p className="text-sm text-gray-600">Complete your sustainability profile to generate comprehensive reports</p>
                </div>
                <Badge variant="outline" className="px-3 py-1">
                  {completionPercentage}% Complete
                </Badge>
              </div>
              <Progress value={completionPercentage} className="w-full" />
            </CardContent>
          </Card>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="operations" className="flex items-center gap-2">
                <Leaf className="w-4 h-4" />
                Operations
              </TabsTrigger>
              <TabsTrigger value="goals" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Goals
              </TabsTrigger>
              <TabsTrigger value="impact" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Impact
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Company Overview</CardTitle>
                  <CardDescription>
                    Basic company information and environmental policy
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Company overview content will be implemented in Phase 2
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="operations">
              <Card>
                <CardHeader>
                  <CardTitle>Facility Operations</CardTitle>
                  <CardDescription>
                    Energy consumption, water usage, and waste management data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Operations data collection will be implemented in Phase 2
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="goals">
              <Card>
                <CardHeader>
                  <CardTitle>Sustainability Goals</CardTitle>
                  <CardDescription>
                    Carbon reduction targets and sustainability initiatives
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Goals management will be implemented in Phase 2
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="impact">
              <Card>
                <CardHeader>
                  <CardTitle>Environmental Impact Summary</CardTitle>
                  <CardDescription>
                    Visual overview of your company's environmental metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Impact visualization will be implemented in Phase 4
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}