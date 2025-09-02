import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Building2, Shield, Scale } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-lightest-gray via-white to-avallen-green/5">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-light-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/app/dashboard">
              <Button variant="ghost" className="text-slate-gray hover:text-avallen-green">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-avallen-green" />
              <span className="text-lg font-semibold text-slate-gray">Terms of Service</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card className="bg-white border shadow-lg">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-avallen-green/10 rounded-full flex items-center justify-center">
                <Scale className="w-8 h-8 text-avallen-green" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-slate-gray">
              Terms of Service
            </CardTitle>
            <CardDescription className="text-lg">
              Avallen Solutions Sustainability Tool
            </CardDescription>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <p className="text-sm text-blue-700">
                <strong>Last Updated:</strong> 01/09/2025
              </p>
            </div>
          </CardHeader>

          <CardContent className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-amber-800 font-medium">
                <strong>PLEASE READ THESE TERMS OF SERVICE CAREFULLY.</strong> By accessing or using the Service, you agree to be bound by these terms. If you do not agree to all of these terms, do not use the service.
              </p>
            </div>

            <p className="text-gray-700">
              This is a legal agreement between you, the customer ("Customer", "you", "your"), and Avallen Solutions Ltd, a company registered in England and Wales with company number 15905045, whose registered office is at Sterling House, Fulbourne Road, London, E17 4EE ("we", "us", "our").
            </p>

            <section>
              <h2 className="text-xl font-bold text-slate-gray flex items-center gap-2 mb-3">
                <Building2 className="w-5 h-5 text-avallen-green" />
                1. The Service
              </h2>
              <div className="space-y-3 ml-7">
                <p><strong>1.1.</strong> We provide a Software-as-a-Service (SaaS) platform designed to help businesses manage, calculate, and report on their sustainability performance (the "Service").</p>
                <p><strong>1.2.</strong> The Service includes features for data collection, product and corporate footprint analysis (including carbon, water, biodiversity, and waste), Key Performance Indicator (KPI) tracking, and custom report generation, as described in more detail on our website.</p>
                <p><strong>1.3.</strong> We will provide the Service in accordance with these Terms and with reasonable skill and care.</p>
                <p><strong>1.4.</strong> We may update the Service from time to time. We will provide you with notice of any material changes.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-gray mb-3">2. User Accounts</h2>
              <div className="space-y-3">
                <p><strong>2.1.</strong> To use the Service, you must register for an account. You agree to provide accurate, current, and complete information during the registration process.</p>
                <p><strong>2.2.</strong> You are responsible for safeguarding your password and for all activities that occur under your account. You must notify us immediately of any unauthorised use of your account.</p>
                <p><strong>2.3.</strong> You are responsible for ensuring that your authorised users comply with these Terms. A breach of these Terms by an authorised user will be treated as a breach by you.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-gray mb-3">3. Subscriptions and Payment</h2>
              <div className="space-y-3">
                <p><strong>3.1. Fees:</strong> The Service is provided on a subscription basis. You agree to pay all applicable fees as set out on our pricing page or as otherwise agreed in writing ("Fees").</p>
                <p><strong>3.2. Billing:</strong> We will bill you in advance on a recurring basis (e.g., monthly or annually). All Fees are non-refundable, except as expressly stated in these Terms.</p>
                <p><strong>3.3. Payment:</strong> You must provide us with a valid payment method. You authorise us to charge this payment method for all Fees incurred.</p>
                <p><strong>3.4. Taxes:</strong> All Fees are exclusive of taxes, such as VAT, which you are responsible for paying.</p>
                <p><strong>3.5. Changes to Fees:</strong> We reserve the right to change the Fees at any time. We will provide you with at least 30 days' notice of any fee changes.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-gray mb-3">4. Customer Data</h2>
              <div className="space-y-3">
                <p><strong>4.1. Ownership:</strong> You retain all right, title, and interest in and to all data, information, and content that you upload to or input into the Service ("Customer Data").</p>
                <p><strong>4.2. Licence to Us:</strong> You grant us a worldwide, non-exclusive, royalty-free licence to use, process, reproduce, and display your Customer Data solely for the purpose of providing and improving the Service.</p>
                <p><strong>4.3. Data Protection:</strong> We will process any personal data contained within your Customer Data in accordance with our Data Processing Agreement (DPA), which is incorporated by reference into these Terms.</p>
                <p><strong>4.4. Responsibility:</strong> You are solely responsible for the accuracy, quality, and legality of your Customer Data and for ensuring you have all the necessary rights and consents to provide it to us.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-gray mb-3">5. Acceptable Use</h2>
              <p className="mb-3">You agree not to:</p>
              <div className="space-y-2 ml-4">
                <p><strong>a)</strong> Use the Service in any way that breaches any applicable local, national, or international law or regulation.</p>
                <p><strong>b)</strong> Attempt to copy, modify, duplicate, or create derivative works from any part of the Service.</p>
                <p><strong>c)</strong> Attempt to reverse-engineer, decompile, or disassemble any part of the Service.</p>
                <p><strong>d)</strong> Use the Service to store or transmit any material that is unlawful, harmful, or infringing.</p>
                <p><strong>e)</strong> Use the Service to knowingly introduce viruses, trojans, worms, or other material that is malicious or technologically harmful.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-gray mb-3">6. Intellectual Property</h2>
              <div className="space-y-3">
                <p><strong>6.1.</strong> We own all intellectual property rights in the Service and all its underlying software, technology, and content (excluding Customer Data).</p>
                <p><strong>6.2.</strong> We grant you a limited, non-exclusive, non-transferable, revocable licence to access and use the Service for your internal business purposes during the term of your subscription.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-gray mb-3">7. Confidentiality</h2>
              <div className="space-y-3">
                <p><strong>7.1.</strong> Each party agrees to treat all information disclosed by the other that is marked as confidential or that reasonably should be understood to be confidential ("Confidential Information") with the same degree of care as it uses for its own confidential information.</p>
                <p><strong>7.2.</strong> Neither party will use the other's Confidential Information for any purpose other than to exercise its rights and perform its obligations under these Terms.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-gray flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-avallen-green" />
                8. Warranties and Disclaimers
              </h2>
              <div className="space-y-3 ml-7">
                <p><strong>8.1. "As Is" Service:</strong> The Service is provided "as is" and "as available". We do not warrant that the Service will be uninterrupted, error-free, or completely secure.</p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p><strong>8.2. Data Disclaimer:</strong> You acknowledge that the Service is a data analysis tool, not a certified consultancy or verification body. The calculations, footprints, and reports generated by the Service are based on:</p>
                  <div className="ml-4 mt-2 space-y-1">
                    <p><strong>a)</strong> The quality and accuracy of the Customer Data you provide.</p>
                    <p><strong>b)</strong> Third-party life cycle inventory databases (Ecoinvent) and established methodologies (e.g., GHG Protocol, ReCiPe, AWARE).</p>
                  </div>
                </div>
                <p><strong>8.3.</strong> We make no warranty or representation as to the accuracy, completeness, or suitability of any report or calculation generated by the Service for any specific purpose (such as for formal audit, regulatory submission, or third-party certification). You are responsible for independently verifying the results.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-gray mb-3">9. Limitation of Liability</h2>
              <div className="space-y-3">
                <p><strong>9.1.</strong> Nothing in these Terms limits or excludes our liability for death or personal injury caused by our negligence, fraud, or any other liability that cannot be excluded by law.</p>
                <p><strong>9.2.</strong> To the maximum extent permitted by law, our total aggregate liability in contract, tort (including negligence), or otherwise, arising under or in connection with these Terms shall be limited to the total Fees paid by you during the 12 months immediately preceding the date on which the claim arose.</p>
                <p><strong>9.3.</strong> We shall not be liable for any loss of profits, loss of business, loss of data, or any indirect or consequential loss arising under or in connection with these Terms.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-gray mb-3">10. Term and Termination</h2>
              <div className="space-y-3">
                <p><strong>10.1.</strong> These Terms will remain in effect for the duration of your subscription.</p>
                <p><strong>10.2. Termination for Cause:</strong> Either party may terminate this agreement immediately if the other party commits a material breach of these Terms and fails to cure that breach within 30 days of receiving written notice.</p>
                <p><strong>10.3. Effect of Termination:</strong> Upon termination, your right to use the Service will cease immediately. We will, upon your request, make your Customer Data available for you to export for a period of 30 days, after which we may delete it.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-gray mb-3">11. General Provisions</h2>
              <div className="space-y-3">
                <p><strong>11.1. Governing Law:</strong> These Terms and any dispute or claim arising out of them shall be governed by and construed in accordance with the laws of England and Wales.</p>
                <p><strong>11.2. Jurisdiction:</strong> Each party irrevocably agrees that the courts of England and Wales shall have exclusive jurisdiction to settle any dispute or claim.</p>
                <p><strong>11.3. Entire Agreement:</strong> These Terms, together with the Data Processing Agreement and any order form, constitute the entire agreement between the parties.</p>
                <p><strong>11.4. Changes to Terms:</strong> We may modify these Terms at any time. We will provide you with at least 30 days' notice of any material changes. Your continued use of the Service after the changes become effective will constitute your acceptance of the new terms.</p>
                <p><strong>11.5. Contact:</strong> For any questions about these Terms, please contact us at <a href="mailto:tim@avallen.solutions" className="text-avallen-green hover:underline">tim@avallen.solutions</a>.</p>
              </div>
            </section>

            <div className="bg-avallen-green/5 border border-avallen-green/20 rounded-lg p-6 mt-8">
              <div className="flex items-center gap-3 mb-3">
                <Building2 className="w-6 h-6 text-avallen-green" />
                <h3 className="text-lg font-semibold text-slate-gray">Contact Information</h3>
              </div>
              <div className="space-y-2 text-gray-700">
                <p><strong>Avallen Solutions Ltd</strong></p>
                <p>Company Number: 15905045</p>
                <p>Sterling House, Fulbourne Road</p>
                <p>London, E17 4EE</p>
                <p>Email: <a href="mailto:tim@avallen.solutions" className="text-avallen-green hover:underline">tim@avallen.solutions</a></p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Dashboard */}
        <div className="text-center mt-8">
          <Link href="/app/dashboard">
            <Button className="bg-avallen-green hover:bg-avallen-green-light text-white px-8 py-2" data-testid="button-back-dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}