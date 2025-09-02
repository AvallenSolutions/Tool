import { Link } from "wouter";
import { Mail, MapPin, Phone, Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-light-gray mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Company Info */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-gray">Avallen Solutions</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Sterling House, Fulbourne Road, London, E17 4EE</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <a 
                  href="mailto:tim@avallen.solutions" 
                  className="text-avallen-green hover:underline"
                  data-testid="footer-email-link"
                >
                  tim@avallen.solutions
                </a>
              </div>
            </div>
          </div>

          {/* Legal Links */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-gray">Legal & Compliance</h3>
            <div className="space-y-2 text-sm">
              <Link 
                href="/app/privacy-policy" 
                className="flex items-center space-x-2 text-gray-600 hover:text-avallen-green transition-colors"
                data-testid="footer-privacy-link"
              >
                <Shield className="w-4 h-4" />
                <span>Privacy Policy</span>
              </Link>
              <Link 
                href="/app/terms-of-service" 
                className="flex items-center space-x-2 text-gray-600 hover:text-avallen-green transition-colors"
                data-testid="footer-terms-link"
              >
                <Shield className="w-4 h-4" />
                <span>Terms of Service</span>
              </Link>
              <div className="text-gray-500">
                <p>UK GDPR Compliant</p>
                <p>Last Updated: 01/09/2025</p>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-gray">Support</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>For technical support or questions about your sustainability data:</p>
              <a 
                href="mailto:tim@avallen.solutions?subject=Sustainability Tool Support" 
                className="text-avallen-green hover:underline"
                data-testid="footer-support-link"
              >
                Contact our Data Protection Officer
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-light-gray mt-6 pt-4">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
            <p>© 2025 Avallen Solutions Ltd. All rights reserved.</p>
            <p className="mt-2 sm:mt-0">Sustainability Tool - Pioneers Program</p>
          </div>
        </div>
      </div>
    </footer>
  );
}