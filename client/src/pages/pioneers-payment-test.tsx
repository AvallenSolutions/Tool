import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Award, Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import avallenLogo from "@assets/White Background-Winner-Avallen Solutions_1755804696792.jpg";

export default function PioneersPaymentTest() {
  const [step, setStep] = useState<'email' | 'payment' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
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

    try {
      // For demo purposes, simulate the subscription creation
      setTimeout(() => {
        setSubscriptionData({
          subscriptionId: 'sub_' + Math.random().toString(36).substr(2, 9),
          customerId: 'cus_' + Math.random().toString(36).substr(2, 9),
          clientSecret: 'pi_' + Math.random().toString(36).substr(2, 9) + '_secret_test'
        });
        setStep('payment');
        setIsLoading(false);
        toast({
          title: "Subscription Created",
          description: "Proceeding to payment step.",
        });
      }, 1500);
    } catch (error) {
      console.error('Subscription creation error:', error);
      toast({
        title: "Error",
        description: "Failed to create subscription. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleTestPayment = async () => {
    setIsLoading(true);
    
    // Simulate payment processing
    setTimeout(async () => {
      try {
        const response = await fetch('/api/pioneers/complete-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            subscriptionId: subscriptionData?.subscriptionId || 'test_sub_123',
            email 
          }),
        });

        const result = await response.json();

        if (result.success) {
          setStep('success');
          toast({
            title: "Welcome to the Pioneers Program!",
            description: "Your registration is complete.",
          });
        } else {
          toast({
            title: "Registration Issue",
            description: result.error || "Registration incomplete. Please contact support.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Registration completion error:', error);
        toast({
          title: "Registration Issue",
          description: "Registration incomplete. Please contact support.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }, 2000);
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
            <Link href="/login">
              <Button variant="ghost" className="text-slate-gray hover:text-avallen-green">
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
                  <Badge className="bg-avallen-green/10 text-avallen-green border-avallen-green/20 px-4 py-2">
                    <Award className="w-4 h-4 mr-2" />
                    Pioneers Program Registration
                  </Badge>
                </div>
                <CardTitle className="text-3xl font-bold text-slate-gray">
                  Join the Pioneers Program
                </CardTitle>
                <CardDescription className="text-lg">
                  Complete your registration to secure your spot in our exclusive program
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
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

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Demo Mode</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          CAPTCHA verification skipped for testing. In production, this step includes security verification.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit"
                    disabled={!email || isLoading}
                    className="w-full bg-avallen-green hover:bg-avallen-green-light text-white py-6 text-lg font-semibold"
                    data-testid="button-proceed-payment"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-3 w-5 h-5 animate-spin" />
                    ) : (
                      <CreditCard className="mr-3 w-5 h-5" />
                    )}
                    {isLoading ? "Creating Subscription..." : "Proceed to Payment"}
                  </Button>
                </form>

                <div className="border-t pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-success-green mr-3 flex-shrink-0" />
                      Full year access at discounted rate
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-success-green mr-3 flex-shrink-0" />
                      Direct line to development team
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-success-green mr-3 flex-shrink-0" />
                      Shape future platform features
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 'payment' && (
            <Card className="bg-white border shadow-xl">
              <CardHeader className="text-center space-y-4">
                <CardTitle className="text-3xl font-bold text-slate-gray">
                  Complete Your Registration
                </CardTitle>
                <CardDescription className="text-lg">
                  Payment step (Testing Mode)
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Development Mode</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Stripe.js integration is configured. In production, this would show the full Stripe payment form.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-gray mb-2">Billing Details</h3>
                  <p className="text-sm text-gray-600 mb-1">Email: {email}</p>
                  <p className="text-sm text-gray-600">Plan: Pioneers Program (Annual)</p>
                  <p className="text-sm text-gray-600">Subscription ID: {subscriptionData?.subscriptionId}</p>
                </div>

                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium mb-2">Payment Method</h4>
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Secure payment by Stripe (Test Mode)</span>
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={handleTestPayment}
                  disabled={isLoading}
                  className="w-full bg-avallen-green hover:bg-avallen-green-light text-white py-6 text-lg font-semibold"
                  data-testid="button-complete-payment"
                >
                  <div className="flex items-center justify-center">
                    {isLoading ? (
                      <Loader2 className="mr-3 w-5 h-5 animate-spin" />
                    ) : (
                      <CreditCard className="mr-3 w-5 h-5" />
                    )}
                    {isLoading ? "Processing..." : "Complete Registration (Test)"}
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
                  Your registration is complete. You can now access the platform.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6 text-center">
                <div className="bg-avallen-green/5 rounded-lg p-6 space-y-3">
                  <p className="font-medium text-slate-gray">What happens next?</p>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>• You'll receive a confirmation email with login instructions</p>
                    <p>• Access the platform using your Replit account</p>
                    <p>• Complete your company onboarding</p>
                    <p>• Start measuring your sustainability impact</p>
                  </div>
                </div>

                <Link href="/login">
                  <Button className="w-full bg-avallen-green hover:bg-avallen-green-light text-white py-4 text-lg font-semibold">
                    Continue to Platform
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