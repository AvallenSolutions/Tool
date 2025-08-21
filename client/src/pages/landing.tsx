import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, BarChart3, Users, FileText, Shield, Zap, Droplets, Trash2, Lock, ArrowRight, Globe, Leaf, Award } from "lucide-react";
import { Link } from "wouter";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-lightest-gray">
      {/* Header */}
      <header className="bg-white border-b border-light-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-avallen-green rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-2xl font-bold text-slate-gray">Avallen Solutions</span>
            </div>
            <Link href="/login">
              <Button className="bg-avallen-green hover:bg-avallen-green-light text-white">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <Badge className="bg-avallen-green/10 text-avallen-green border-avallen-green/20 px-4 py-2 text-sm font-medium">
              <Award className="w-4 h-4 mr-2" />
              Now in Paid Beta Program
            </Badge>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-slate-gray mb-6">
            Beta Test Our Sustainability Platform for
            <span className="text-avallen-green"> Drinks Brands</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Join our paid beta program to stress test our comprehensive sustainability platform 
            with real-world data and help shape the future of drinks industry reporting.
          </p>
          {/* Beta Program Indicators */}
          <div className="flex justify-center items-center space-x-8 mb-8 text-sm text-gray-500">
            <div className="flex items-center">
              <Shield className="w-4 h-4 mr-2 text-avallen-green" />
              DEFRA 2024 Factors
            </div>
            <div className="flex items-center">
              <Leaf className="w-4 h-4 mr-2 text-avallen-green" />
              OpenLCA Integration
            </div>
            <div className="flex items-center">
              <Globe className="w-4 h-4 mr-2 text-avallen-green" />
              Beta Testing Program
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button 
                size="lg" 
                className="bg-avallen-green hover:bg-avallen-green-light text-white px-8 py-3 text-lg w-full sm:w-auto"
              >
                Join Beta Program
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg"
              className="border-slate-gray text-slate-gray hover:bg-lightest-gray px-8 py-3 text-lg"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-gray mb-4">
              Help Us Perfect Our Sustainability Platform
            </h2>
            <p className="text-xl text-gray-600">
              Beta test our comprehensive tools and provide valuable feedback for real-world scenarios
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-light-gray">
              <CardHeader>
                <div className="p-3 bg-avallen-green/10 rounded-lg w-fit mb-4">
                  <BarChart3 className="w-6 h-6 text-avallen-green" />
                </div>
                <CardTitle className="text-slate-gray">Interactive Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Clean, simple visualizations of company-wide and SKU-level environmental impacts
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-light-gray">
              <CardHeader>
                <div className="p-3 bg-blue-100 rounded-lg w-fit mb-4">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-slate-gray">Supplier Collaboration</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Dedicated portal for contract manufacturers to submit data directly for accurate Scope 3 tracking
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-light-gray">
              <CardHeader>
                <div className="p-3 bg-muted-gold/10 rounded-lg w-fit mb-4">
                  <FileText className="w-6 h-6 text-muted-gold" />
                </div>
                <CardTitle className="text-slate-gray">Automated LCA Engine</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Scientifically credible calculations using server-hosted OpenLCA for carbon, water, and waste impact
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-light-gray">
              <CardHeader>
                <div className="p-3 bg-success-green/10 rounded-lg w-fit mb-4">
                  <Shield className="w-6 h-6 text-success-green" />
                </div>
                <CardTitle className="text-slate-gray">Expert Validation</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Human-in-the-loop validation with expert review by our sustainability team
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-light-gray">
              <CardHeader>
                <div className="p-3 bg-purple-100 rounded-lg w-fit mb-4">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle className="text-slate-gray">Guided Onboarding</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Gamified, step-by-step journey to simplify data collection for you and your suppliers
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-light-gray">
              <CardHeader>
                <div className="p-3 bg-red-100 rounded-lg w-fit mb-4">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle className="text-slate-gray">Comprehensive Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Track carbon emissions, water usage, and waste generation across your entire value chain
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-lightest-gray">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-gray mb-6">
                Why Choose Avallen Solutions?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                We understand the unique challenges SME drinks brands face. Limited budgets, 
                lack of expertise, and complex supply chains shouldn't prevent you from 
                operating sustainably.
              </p>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-success-green mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-slate-gray">Affordable & Accessible</h3>
                    <p className="text-gray-600">Tiered pricing based on your revenue, not complex per-user fees</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-success-green mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-slate-gray">Scientifically Credible</h3>
                    <p className="text-gray-600">Built on OpenLCA for industry-recognized, accurate results</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-success-green mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-slate-gray">Expert Support</h3>
                    <p className="text-gray-600">Our sustainability experts validate your reports for accuracy</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-success-green mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-slate-gray">Supplier Integration</h3>
                    <p className="text-gray-600">Easy collaboration with your supply chain partners</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-xl border border-light-gray">
              <h3 className="text-xl font-bold text-slate-gray mb-6">Track Your Impact</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-avallen-green/10 rounded-lg">
                  <Zap className="w-8 h-8 text-avallen-green mx-auto mb-2" />
                  <div className="text-2xl font-bold text-slate-gray">CO2e</div>
                  <div className="text-sm text-gray-600">Emissions</div>
                </div>
                <div className="p-4 bg-blue-100 rounded-lg">
                  <Droplets className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-slate-gray">Water</div>
                  <div className="text-sm text-gray-600">Usage</div>
                </div>
                <div className="p-4 bg-muted-gold/10 rounded-lg">
                  <Trash2 className="w-8 h-8 text-muted-gold mx-auto mb-2" />
                  <div className="text-2xl font-bold text-slate-gray">Waste</div>
                  <div className="text-sm text-gray-600">Generated</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-avallen-green">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Sustainability Reporting?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Join the brands already using Avallen Solutions to measure, manage, and report their environmental impact.
          </p>
          <Button 
            size="lg" 
            onClick={handleLogin}
            className="bg-white text-avallen-green hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
          >
            Start Your Free Trial
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-light-gray py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-avallen-green rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">A</span>
              </div>
              <span className="text-xl font-bold text-slate-gray">Avallen Solutions</span>
            </div>
            <div className="text-sm text-gray-600">
              © 2024 Avallen Solutions. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
