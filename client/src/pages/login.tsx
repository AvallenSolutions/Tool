import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Shield, Lock, Globe, ArrowRight, Leaf, Award, BarChart3, Users, FileText } from "lucide-react";
import { Link } from "wouter";

export default function Login() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-lightest-gray via-white to-avallen-green/5">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-light-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/">
              <div className="flex items-center space-x-3 cursor-pointer">
                <div className="w-10 h-10 bg-avallen-green rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <span className="text-2xl font-bold text-slate-gray">Avallen Solutions</span>
              </div>
            </Link>
            <Link href="/">
              <Button variant="ghost" className="text-slate-gray hover:text-avallen-green">
                ← Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12">
        <div className="w-full max-w-4xl">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            
            {/* Left Side - Login Form */}
            <div className="order-2 lg:order-1">
              <Card className="bg-white border shadow-xl">
                <CardHeader className="text-center space-y-4">
                  <div className="flex justify-center">
                    <Badge className="bg-avallen-green/10 text-avallen-green border-avallen-green/20 px-4 py-2">
                      <Award className="w-4 h-4 mr-2" />
                      Welcome Back
                    </Badge>
                  </div>
                  <CardTitle className="text-3xl font-bold text-slate-gray">
                    Sign In to Your Account
                  </CardTitle>
                  <CardDescription className="text-lg">
                    Access your sustainability dashboard and continue your environmental journey
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Security Features */}
                  <div className="bg-avallen-green/5 rounded-lg p-4 space-y-3">
                    <p className="font-medium text-slate-gray text-sm">🔒 Secure Authentication</p>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Shield className="w-4 h-4 text-avallen-green mr-2" />
                        Enterprise-grade security with OpenID Connect
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Lock className="w-4 h-4 text-avallen-green mr-2" />
                        Your data is encrypted and protected
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Globe className="w-4 h-4 text-avallen-green mr-2" />
                        Access from anywhere, anytime
                      </div>
                    </div>
                  </div>

                  {/* Login Button */}
                  <Button 
                    onClick={handleLogin}
                    className="w-full bg-avallen-green hover:bg-avallen-green-light text-white py-6 text-lg font-semibold"
                  >
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 bg-white rounded mr-3 flex items-center justify-center">
                        <span className="text-avallen-green font-bold text-sm">R</span>
                      </div>
                      Sign in with Replit
                      <ArrowRight className="ml-3 w-5 h-5" />
                    </div>
                  </Button>

                  {/* Features List */}
                  <div className="border-t pt-6">
                    <p className="text-sm font-medium text-slate-gray mb-4 text-center">
                      What you get with your account:
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-success-green mr-3 flex-shrink-0" />
                        Complete sustainability dashboard with real-time metrics
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-success-green mr-3 flex-shrink-0" />
                        ISO-compliant LCA calculations and PDF reporting
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-success-green mr-3 flex-shrink-0" />
                        Supplier collaboration and data collection tools
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-success-green mr-3 flex-shrink-0" />
                        Expert validation and sustainability support
                      </div>
                    </div>
                  </div>

                  {/* Trust indicators */}
                  <div className="border-t pt-4">
                    <div className="flex justify-center items-center space-x-6 text-xs text-gray-500">
                      <div className="flex items-center">
                        <Leaf className="w-3 h-3 mr-1 text-avallen-green" />
                        ISO 14040/14044
                      </div>
                      <div className="flex items-center">
                        <Shield className="w-3 h-3 mr-1 text-avallen-green" />
                        DEFRA 2024
                      </div>
                      <div className="flex items-center">
                        <Globe className="w-3 h-3 mr-1 text-avallen-green" />
                        OpenLCA
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Side - Benefits */}
            <div className="order-1 lg:order-2 space-y-6">
              <div className="text-center lg:text-left">
                <h1 className="text-4xl lg:text-5xl font-bold text-slate-gray mb-4">
                  Sustainability
                  <span className="text-avallen-green block">Made Simple</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Join leading drinks brands in creating transparent, 
                  data-driven sustainability reports that stakeholders trust.
                </p>
              </div>

              {/* Key Features */}
              <div className="space-y-4">
                <div className="flex items-start space-x-4 p-4 bg-white/60 rounded-lg border border-light-gray">
                  <div className="p-2 bg-avallen-green/10 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-avallen-green" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-gray">Real-Time Metrics</h3>
                    <p className="text-sm text-gray-600">
                      Track CO2e, water usage, and waste across your entire value chain
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-white/60 rounded-lg border border-light-gray">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-gray">Supplier Network</h3>
                    <p className="text-sm text-gray-600">
                      Collaborate seamlessly with your suppliers for accurate Scope 3 data
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-white/60 rounded-lg border border-light-gray">
                  <div className="p-2 bg-muted-gold/10 rounded-lg">
                    <FileText className="w-5 h-5 text-muted-gold" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-gray">Professional Reports</h3>
                    <p className="text-sm text-gray-600">
                      Generate stakeholder-ready PDF reports with authentic data
                    </p>
                  </div>
                </div>
              </div>

              {/* Social proof */}
              <div className="bg-avallen-green/5 rounded-lg p-6 border border-avallen-green/20">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 bg-avallen-green rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">A</span>
                    </div>
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">S</span>
                    </div>
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">F</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold text-slate-gray">Trusted by sustainability leaders</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 italic">
                  "Avallen Solutions transformed our sustainability reporting from weeks of work 
                  to minutes of automated insights."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}