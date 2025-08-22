import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-lightest-gray via-white to-avallen-green/5">
      <Card className="w-full max-w-lg mx-4 bg-white border shadow-xl">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-50 rounded-full">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-slate-gray mb-4">Page Not Found</h1>
          
          <p className="text-lg text-gray-600 mb-6">
            Sorry, the page you're looking for doesn't exist or has been moved.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <Button className="bg-avallen-green hover:bg-avallen-green-light text-white px-6">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
            <Button variant="outline" onClick={() => window.history.back()} className="border-avallen-green text-avallen-green hover:bg-avallen-green/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Need help? Contact support at{' '}
              <a href="mailto:tim@avallen.solutions" className="text-avallen-green hover:underline font-medium">
                tim@avallen.solutions
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
