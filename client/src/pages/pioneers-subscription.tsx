import { useState, useRef, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Award, Loader2, CreditCard } from 'lucide-react';
import { Link } from 'wouter';
import ReCAPTCHA from 'react-google-recaptcha';
import { useToast } from '@/hooks/use-toast';
import avallenLogo from "@assets/White Background-Winner-Avallen Solutions_1755804696792.jpg";

// Load Stripe with error handling
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Payment form component
function PaymentForm({ clientSecret, email, onSuccess }: { 
  clientSecret: string; 
  email: string; 
  onSuccess: (subscriptionId: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/pioneers/success`,
        receipt_email: email,
      },
      redirect: 'if_required',
    });

    if (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "There was an issue processing your payment.",
        variant: "destructive",
      });
    } else {
      // Extract subscription ID from client secret
      const subscriptionId = clientSecret.split('_secret_')[0];
      onSuccess(subscriptionId);
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-slate-gray mb-2">Billing Details</h3>
        <p className="text-sm text-gray-600 mb-1">Email: {email}</p>
        <p className="text-sm text-gray-600">Plan: Pioneers Program (Annual)</p>
      </div>
      
      <PaymentElement 
        options={{
          layout: "tabs"
        }}
      />
      
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full bg-avallen-green hover:bg-avallen-green-light text-white py-6 text-lg font-semibold"
        data-testid="button-complete-payment"
      >
        <div className="flex items-center justify-center">
          {isProcessing ? (
            <Loader2 className="mr-3 w-5 h-5 animate-spin" />
          ) : (
            <CreditCard className="mr-3 w-5 h-5" />
          )}
          {isProcessing ? "Processing..." : "Complete Registration"}
        </div>
      </Button>
    </form>
  );
}

export default function PioneersSubscription() {
  const [step, setStep] = useState<'email' | 'payment' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [subscriptionId, setSubscriptionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const { toast } = useToast();

  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !captchaToken) {
      toast({
        title: "Missing Information",
        description: "Please enter your email and complete the CAPTCHA.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/pioneers/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, captchaToken }),
      });

      const result = await response.json();

      if (result.success) {
        setClientSecret(result.clientSecret);
        setSubscriptionId(result.subscriptionId);
        setStep('payment');
      } else {
        toast({
          title: "Registration Failed",
          description: result.error || "Failed to create subscription.",
          variant: "destructive",
        });
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
      }
    } catch (error) {
      console.error('Subscription creation error:', error);
      toast({
        title: "Error",
        description: "Failed to create subscription. Please try again.",
        variant: "destructive",
      });
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (subId: string) => {
    try {
      const response = await fetch('/api/pioneers/complete-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: subId, email }),
      });

      const result = await response.json();

      if (result.success) {
        setStep('success');
        toast({
          title: "Welcome to the Pioneers Program!",
          description: "Your registration is complete. You'll receive a confirmation email shortly.",
        });
      } else {
        toast({
          title: "Registration Issue",
          description: result.error || "Payment succeeded but registration incomplete. Please contact support.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Registration completion error:', error);
      toast({
        title: "Registration Issue",
        description: "Payment succeeded but registration incomplete. Please contact support.",
        variant: "destructive",
      });
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
                  Complete your registration with payment to secure your spot in our exclusive program
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

                  <div className="flex justify-center">
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"}
                      onChange={handleCaptchaChange}
                      theme="light"
                    />
                  </div>

                  <Button 
                    type="submit"
                    disabled={!email || !captchaToken || isLoading}
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

          {step === 'payment' && clientSecret && (
            <Card className="bg-white border shadow-xl">
              <CardHeader className="text-center space-y-4">
                <CardTitle className="text-3xl font-bold text-slate-gray">
                  Complete Your Registration
                </CardTitle>
                <CardDescription className="text-lg">
                  Secure payment processing by Stripe
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <PaymentForm 
                    clientSecret={clientSecret} 
                    email={email}
                    onSuccess={handlePaymentSuccess}
                  />
                </Elements>
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