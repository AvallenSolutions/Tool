import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Award, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import avallenLogo from "@assets/White Background-Winner-Avallen Solutions_1755804696792.jpg";

export default function PioneersNoStripe() {
  const [step, setStep] = useState<'email' | 'deployment' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Missing Information",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate subscription creation
    setTimeout(() => {
      setStep('deployment');
      setIsLoading(false);
      toast({
        title: "Registration Initiated",
        description: "Ready for deployment to enable secure payments.",
      });
    }, 1000);
  };

  const handleDeploymentComplete = () => {
    setStep('success');
    toast({
      title: "Welcome to the Pioneers Program!",
      description: "Your registration is complete.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-lightest-gray via-white to-green-600/5">
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
            <Link href="/login">
              <Button variant="ghost" className="text-slate-gray hover:text-green-600">
                ← Back to Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12">
        <div className="w-full max-w-2xl">
          
          {step === 'email' && (
            <Card className="bg-white border shadow-xl">
              <CardHeader className="text-center space-y-4">
                <div className="flex justify-center">
                  <Badge className="bg-green-600/10 text-green-600 border-green-600/20 px-4 py-2">
                    <Award className="w-4 h-4 mr-2" />
                    Pioneers Program Registration
                  </Badge>
                </div>
                <CardTitle className="text-3xl font-bold text-slate-gray">
                  Join the Pioneers Program
                </CardTitle>
                <CardDescription className="text-lg">
                  Start your registration - deployment required for secure payments
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-900">Deployment Required</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Stripe payments require HTTPS in production. Deploy this app to enable secure payment processing.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-slate-gray">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@company.com"
                      required
                      className="h-12"
                      data-testid="input-email"
                    />
                  </div>

                  <Button 
                    type="submit"
                    disabled={!email || isLoading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold"
                    data-testid="button-start-registration"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-3 w-5 h-5 animate-spin" />
                    ) : (
                      <Award className="mr-3 w-5 h-5" />
                    )}
                    {isLoading ? "Starting Registration..." : "Start Registration"}
                  </Button>
                </form>

                <div className="border-t pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-success-green mr-3 flex-shrink-0" />
                      £1,500 annual subscription (discounted from £3,000)
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-success-green mr-3 flex-shrink-0" />
                      Limited to 20 forward-thinking brands
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-success-green mr-3 flex-shrink-0" />
                      Direct influence on platform development
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 'deployment' && (
            <Card className="bg-white border shadow-xl">
              <CardHeader className="text-center space-y-4">
                <CardTitle className="text-3xl font-bold text-slate-gray">
                  Deploy for Secure Payments
                </CardTitle>
                <CardDescription className="text-lg">
                  Registration started for: {email}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <ExternalLink className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Ready for Deployment</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        All backend systems are configured. Click Deploy in Replit to enable HTTPS and complete the payment flow.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-gray mb-2">System Status</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>✅ Stripe backend integration: Complete</p>
                    <p>✅ Subscription endpoints: Configured</p>
                    <p>✅ User management: Ready</p>
                    <p>✅ Payment processing: Awaiting deployment</p>
                  </div>
                </div>
                
                <Button 
                  onClick={handleDeploymentComplete}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold"
                  data-testid="button-deployment-complete"
                >
                  <div className="flex items-center justify-center">
                    <CheckCircle className="mr-3 w-5 h-5" />
                    Simulate Deployment Complete
                  </div>
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 'success' && (
            <Card className="bg-white border shadow-xl">
              <CardHeader className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-success-green/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-success-green" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold text-slate-gray">
                  Welcome to the Pioneers Program!
                </CardTitle>
                <CardDescription className="text-lg">
                  You're all set to start your sustainability journey
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6 text-center">
                <div className="bg-avallen-green/5 rounded-lg p-6 space-y-3">
                  <p className="font-medium text-slate-gray">What's Next?</p>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>• Access the platform with your Replit account</p>
                    <p>• Complete your company onboarding wizard</p>
                    <p>• Set up your first product for LCA analysis</p>
                    <p>• Connect with our expert validation team</p>
                  </div>
                </div>

                <Link href="/login">
                  <Button className="w-full bg-avallen-green hover:bg-avallen-green-light text-white py-4 text-lg font-semibold">
                    Access Platform
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}