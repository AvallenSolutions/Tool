import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Shield, Lock, Globe, ArrowRight, Leaf, Award, BarChart3, Users, FileText } from "lucide-react";
import { Link } from "wouter";
import { useState, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import avallenLogo from "@assets/White Background-Winner-Avallen Solutions_1755804696792.jpg";

export default function Login() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
  };

  const handleLogin = async () => {
    if (!captchaToken) {
      alert("Please complete the CAPTCHA verification.");
      return;
    }

    setIsLoading(true);
    try {
      // Verify CAPTCHA on the server before redirecting to login
      const response = await fetch('/api/verify-captcha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ captchaToken }),
      });

      const result = await response.json();

      if (result.success) {
        // Store verification in session and redirect to login
        window.location.href = "/api/login";
      } else {
        alert("CAPTCHA verification failed. Please try again.");
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
      }
    } catch (error) {
      console.error('CAPTCHA verification error:', error);
      alert("Verification failed. Please try again.");
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-lightest-gray via-white to-avallen-green/5">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-light-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/">
              <div className="flex items-center space-x-3 cursor-pointer">
                <img 
                  src={avallenLogo} 
                  alt="Avallen Solutions" 
                  className="h-10 w-auto"
                />
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
                      Pioneers Program
                    </Badge>
                  </div>
                  <CardTitle className="text-3xl font-bold text-slate-gray">
                    Join the Pioneers Program
                  </CardTitle>
                  <CardDescription className="text-lg">
                    An exclusive initiative for 20 forward-thinking brands to build more sustainable and resilient businesses
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
                        CAPTCHA verification and rate limiting protection
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Globe className="w-4 h-4 text-avallen-green mr-2" />
                        Your data is encrypted and protected
                      </div>
                    </div>
                  </div>

                  {/* CAPTCHA Verification */}
                  <div className="flex justify-center">
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"}
                      onChange={handleCaptchaChange}
                      theme="light"
                    />
                  </div>

                  {/* Login Button */}
                  <Button 
                    onClick={handleLogin}
                    disabled={!captchaToken || isLoading}
                    className="w-full bg-avallen-green hover:bg-avallen-green-light text-white py-6 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 bg-white rounded mr-3 flex items-center justify-center">
                        <span className="text-avallen-green font-bold text-sm">R</span>
                      </div>
                      {isLoading ? "Verifying..." : "Sign in with Replit"}
                      {!isLoading && <ArrowRight className="ml-3 w-5 h-5" />}
                    </div>
                  </Button>

                  {/* Account Help Section */}
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                      <span>Having trouble signing in?</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="text-xs text-gray-600">
                        <p className="font-medium text-gray-700 mb-2">Account Access Help:</p>
                        <div className="space-y-1 text-left">
                          <p>• Password reset is managed by Replit - visit <a href="https://replit.com/reset" target="_blank" rel="noopener noreferrer" className="text-avallen-green hover:underline font-medium">replit.com/reset</a></p>
                          <p>• Need a Replit account? <a href="https://replit.com/signup" target="_blank" rel="noopener noreferrer" className="text-avallen-green hover:underline font-medium">Sign up free</a></p>
                          <p>• For beta access support: <a href="mailto:tim@avallen.solutions" className="text-avallen-green hover:underline font-medium">tim@avallen.solutions</a></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="border-t pt-6">
                    <p className="text-sm font-medium text-slate-gray mb-4 text-center">
                      What's Included in the Pioneers Program:
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-success-green mr-3 flex-shrink-0" />
                        Complete sustainability mapping (Scope 1, 2, 3 emissions, water & waste)
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-success-green mr-3 flex-shrink-0" />
                        Centralised supply chain hub for supplier data management
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-success-green mr-3 flex-shrink-0" />
                        Strategic goal setting with KPIs and SMART goals tracking
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-success-green mr-3 flex-shrink-0" />
                        Professional, customisable sustainability reports with real-time data
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-success-green mr-3 flex-shrink-0" />
                        Anti-greenwashing assurance built with DMCC Act compliance
                      </div>
                    </div>
                  </div>

                  {/* Trust indicators */}
                  <div className="border-t pt-4">
                    <div className="flex justify-center items-center space-x-6 text-xs text-gray-500">
                      <div className="flex items-center">
                        <Shield className="w-3 h-3 mr-1 text-avallen-green" />
                        DEFRA 2024 Factors
                      </div>
                      <div className="flex items-center">
                        <Globe className="w-3 h-3 mr-1 text-avallen-green" />
                        OpenLCA Integration
                      </div>
                      <div className="flex items-center">
                        <Leaf className="w-3 h-3 mr-1 text-avallen-green" />
                        Beta Testing
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
                  Pioneers Program
                  <span className="text-avallen-green block">Lead Your Industry</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed mb-6">
                  The conversation around sustainability in the drinks industry is changing. With new government legislation, compliance is no longer optional. The time to get your house in order is now.
                </p>
                <p className="text-lg text-gray-600 leading-relaxed">
                  We've built Avallen Solutions to help you do just that - a simple, human-in-the-loop tool ensuring you're not just compliant, but a leader in your field.
                </p>
              </div>

              {/* Key Features */}
              <div className="space-y-4">
                <div className="flex items-start space-x-4 p-4 bg-white/60 rounded-lg border border-light-gray">
                  <div className="p-2 bg-avallen-green/10 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-avallen-green" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-gray">Complete Sustainability Mapping</h3>
                    <p className="text-sm text-gray-600">
                      Get a clear picture of your entire business's environmental footprint across all scopes
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-white/60 rounded-lg border border-light-gray">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-gray">DMCC Act Compliance</h3>
                    <p className="text-sm text-gray-600">
                      Built with the DMCC Act in mind, protecting you from scrutiny and potential fines
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-white/60 rounded-lg border border-light-gray">
                  <div className="p-2 bg-muted-gold/10 rounded-lg">
                    <Users className="w-5 h-5 text-muted-gold" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-gray">Direct Development Access</h3>
                    <p className="text-sm text-gray-600">
                      Shape future features like Biodiversity Tracker, B-Corp Tool & DRS Calculator
                    </p>
                  </div>
                </div>
              </div>

              {/* Pioneers program info */}
              <div className="bg-avallen-green/5 rounded-lg p-6 border border-avallen-green/20">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 bg-avallen-green rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">20</span>
                    </div>
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">1Y</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold text-slate-gray">Exclusive to 20 Forward-Thinking Brands</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  This isn't just a pilot; it's a partnership to help you build a more sustainable and resilient business with a full year of platform access at a discounted rate.
                </p>
                <p className="text-xs text-gray-500 italic">
                  On the horizon: Biodiversity Impact Tracker • B-Corp Submission Tool • DRS and EPR Cost Calculator • Multiple Global Reporting Standards
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}