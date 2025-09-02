import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function PrivacyPolicy() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-lightest-gray">
      {/* Header */}
      <header className="bg-white border-b border-light-gray">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-slate-gray">Privacy Policy</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-3xl font-headline text-avallen-green">
              Privacy Policy for Avallen Solutions Sustainability Tool
            </CardTitle>
            <CardDescription className="text-lg">
              Last Updated: 01/09/2025
            </CardDescription>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-slate-gray mb-3">1. Introduction</h2>
                <p className="text-gray-700 leading-relaxed">
                  Welcome to the Avallen Solutions Sustainability Tool ("the Tool"), provided by Avallen 
                  Solutions Ltd ("we", "us", "our"). We are committed to protecting and respecting your privacy.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  This policy explains what personal data we collect from you, or that you provide to us, how it 
                  will be processed, and your rights in relation to that data. This policy applies to the data 
                  processed within our software-as-a-service platform.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  For the purpose of the UK General Data Protection Regulation (UK GDPR), the data controller 
                  is Avallen Solutions Ltd, of Sterling House, Fulbourne Road, London, E17 4EE.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-gray mb-3">2. The Data We Collect About You</h2>
                <p className="text-gray-700 leading-relaxed">
                  We collect and process various types of data to provide and improve our service, ensure 
                  security, and meet our legal obligations. The data we collect can be grouped as follows:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li><strong>Identity & Contact Data:</strong> This includes your first name, last name, email address, and 
                    job title when you register for an account on the Tool.</li>
                  <li><strong>Company Data:</strong> This includes information you upload about your organisation. While 
                    most of this is corporate data, it may include personal data where it relates to an 
                    identifiable individual. Specifically, this may include:
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li><strong>Social Metrics Data:</strong> Information related to your employees, such as headcount, 
                        diversity statistics, or data related to community investment initiatives. We strongly 
                        advise that you anonymise or aggregate this data wherever possible before inputting 
                        it into the Tool.</li>
                      <li><strong>Supplier Data:</strong> Contact details (such as name, email address, and phone number) 
                        for individuals at your supplier organisations, which you may upload to the "Supply 
                        Chain Hub".</li>
                    </ul>
                  </li>
                  <li><strong>Technical & Usage Data:</strong> This includes information about how you access and use the 
                    Tool, such as your IP address, browser type, time zone setting, and actions taken on the 
                    platform. This data is used to ensure the security and performance of our service.</li>
                  <li><strong>Marketing and Communications Data:</strong> This includes your preferences in receiving 
                    marketing from us and your communication preferences.</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  We do not knowingly collect any Special Categories of Personal Data about you (this 
                  includes details about your race or ethnicity, religious or philosophical beliefs, sex life, sexual 
                  orientation, political opinions, trade union membership, information about your health, and 
                  genetic and biometric data).
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-gray mb-3">3. How We Use Your Personal Data</h2>
                <p className="text-gray-700 leading-relaxed">
                  We use your personal data for the following purposes, based on a lawful basis for processing:
                </p>
                <ul className="list-disc pl-6 space-y-3 text-gray-700">
                  <li><strong>To Provide and Manage Your Account:</strong> We use your Identity and Contact Data to create 
                    and manage your user account, provide you with access to the Tool, and communicate 
                    with you about service updates.
                    <br /><em>Lawful Basis: Performance of a contract.</em></li>
                  <li><strong>To Power the Tool's Functionality:</strong> Your Company Data, including any embedded 
                    personal data, is processed by our "Analysis & Footprinting Engine" to perform Life Cycle 
                    Assessments (LCAs) and calculate your organisation's sustainability footprint, in line with 
                    ISO standards and the GHG Protocol.
                    <br /><em>Lawful Basis: Performance of a contract.</em></li>
                  <li><strong>To Improve Our Service:</strong> We analyse Technical & Usage Data to understand how our 
                    users interact with the Tool, allowing us to improve functionality, develop new features, 
                    and enhance the user experience.
                    <br /><em>Lawful Basis: Legitimate interests (to improve and develop our product).</em></li>
                  <li><strong>To Provide Customer Support:</strong> We may use your Identity, Contact, and Usage data to 
                    investigate and resolve any issues or queries you have.
                    <br /><em>Lawful Basis: Performance of a contract.</em></li>
                  <li><strong>To Ensure Security:</strong> We monitor usage to prevent fraudulent activity and to keep our 
                    platform and your data safe and secure.
                    <br /><em>Lawful Basis: Legitimate interests (to protect our business and your data).</em></li>
                  <li><strong>For Marketing:</strong> Where you have given your consent, we may use your Identity and 
                    Contact Data to send you information about our products, features, and offers. You can 
                    withdraw this consent at any time.
                    <br /><em>Lawful Basis: Consent.</em></li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-gray mb-3">4. Data Sharing and Third-Party Processors</h2>
                <p className="text-gray-700 leading-relaxed">
                  We do not sell your personal data. We may, however, share your data with trusted third-party 
                  service providers (known as "sub-processors") who help us to operate our business. These include:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li><strong>Core Functionality Providers:</strong> To perform the complex sustainability calculations, we 
                    share non-personally identifiable business and product data (such as bills of materials 
                    and production volumes) with our technical partners who operate the OpenLCA API, 
                    utilising the Ecoinvent database, and the ReCiPe and AWARE impact assessment 
                    methods. We do not share direct personal data like names or email addresses with these 
                    partners for calculation purposes.</li>
                  <li><strong>Cloud & Hosting Providers:</strong> We use third-party providers to host our platform and your data securely.</li>
                  <li><strong>Analytics Providers:</strong> We use providers to analyse usage of our platform.</li>
                  <li><strong>Customer Support & CRM Providers:</strong> We use platforms to manage customer communications.</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  We have Data Processing Agreements (DPAs) in place with all our sub-processors, ensuring 
                  they meet their obligations under UK GDPR and only process your data on our instructions.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-gray mb-3">5. International Data Transfers</h2>
                <p className="text-gray-700 leading-relaxed">
                  Some of our external third-party providers may be based outside the United Kingdom (UK). 
                  Whenever we transfer your personal data out of the UK, we ensure a similar degree of 
                  protection is afforded to it by ensuring at least one of the following safeguards is implemented:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>The country has been deemed to provide an adequate level of protection for personal 
                    data by the UK Government.</li>
                  <li>We use specific contracts approved for use in the UK which give personal data the same 
                    protection it has in the UK (such as the UK's International Data Transfer Agreement).</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  Please contact us if you want further information on the specific mechanism used by us when 
                  transferring your personal data out of the UK.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-gray mb-3">6. Data Security</h2>
                <p className="text-gray-700 leading-relaxed">
                  We have put in place appropriate technical and organisational security measures to prevent 
                  your personal data from being accidentally lost, used, or accessed in an unauthorised way. We 
                  limit access to your personal data to those employees and third parties who have a business 
                  need to know.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-gray mb-3">7. Data Retention</h2>
                <p className="text-gray-700 leading-relaxed">
                  We will only retain your personal data for as long as reasonably necessary to fulfil the 
                  purposes we collected it for, including for the purposes of satisfying any legal, regulatory, tax, 
                  accounting, or reporting requirements.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Typically, this means we will retain your data for as long as you have an active account with us. 
                  After you close your account, we may retain your data for a period of up to 6 years to 
                  resolve disputes or comply with legal obligations.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-gray mb-3">8. Your Legal Rights</h2>
                <p className="text-gray-700 leading-relaxed">
                  Under data protection law, you have rights including:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li><strong>Right of Access:</strong> To request a copy of the personal data we hold about you.</li>
                  <li><strong>Right to Rectification:</strong> To request correction of any inaccurate personal data.</li>
                  <li><strong>Right to Erasure:</strong> To request that we delete your personal data.</li>
                  <li><strong>Right to Restrict Processing:</strong> To request that we suspend the processing of your personal data.</li>
                  <li><strong>Right to Data Portability:</strong> To request the transfer of your personal data to you or a third party.</li>
                  <li><strong>Right to Object:</strong> To object to our processing of your personal data (e.g., for direct marketing).</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  To exercise any of these rights, please contact us at{" "}
                  <a href="mailto:tim@avallen.solutions" className="text-avallen-green hover:underline">
                    tim@avallen.solutions
                  </a>.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  You also have the right to make a complaint at any time to the Information Commissioner's 
                  Office (ICO), the UK supervisory authority for data protection issues ({" "}
                  <a href="https://www.ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-avallen-green hover:underline">
                    www.ico.org.uk
                  </a>).
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-gray mb-3">9. Changes to This Privacy Policy</h2>
                <p className="text-gray-700 leading-relaxed">
                  We may update this policy from time to time. We will notify you of any significant changes by 
                  email or through a notification on our platform.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-gray mb-3">10. Contact Us</h2>
                <p className="text-gray-700 leading-relaxed">
                  If you have any questions about this privacy policy or our privacy practices, please contact 
                  our Data Protection Officer at:
                </p>
                <div className="bg-lightest-gray p-4 rounded-lg">
                  <p className="text-gray-700">
                    <strong>Email:</strong>{" "}
                    <a href="mailto:tim@avallen.solutions" className="text-avallen-green hover:underline">
                      tim@avallen.solutions
                    </a>
                  </p>
                  <p className="text-gray-700">
                    <strong>Address:</strong> Avallen Solutions Ltd, Sterling House, Fulbourne Road, London, E17 4EE
                  </p>
                </div>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}