'use client';

import Link from 'next/link';

import Header from '@/components/shared/Header';
import { buttonVariants } from '@/components/ui/button';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background pt-20">
      <Header />

      {/* Hero Section */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-sage-light via-cream to-background">
        <div className="container px-4 md:px-6 mx-auto max-w-4xl text-center">
          <h1 className="font-playfair text-4xl md:text-5xl lg:text-6xl font-bold text-navy mb-6">
            Privacy Policy
          </h1>
          <p className="text-lg md:text-xl text-navy-light max-w-2xl mx-auto">
            How we collect, use, and protect your personal information
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 md:py-20">
        <div className="container px-4 md:px-6 mx-auto max-w-3xl">
          <div className="prose prose-lg max-w-none">
            <p className="text-muted-foreground mb-8">
              Last updated: December 2024
            </p>

            <div className="space-y-8">
              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
                <p className="text-muted-foreground leading-relaxed">
                  The Dorset Transfer Company (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services or visit our website. We comply with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
                </p>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">2. Information We Collect</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We collect information that you provide directly to us when booking our services:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>Personal details:</strong> Name, email address, phone number</li>
                  <li><strong>Booking information:</strong> Pickup and drop-off addresses, travel dates and times</li>
                  <li><strong>Payment information:</strong> Card details (processed securely by our payment provider)</li>
                  <li><strong>Travel details:</strong> Flight numbers, cruise ship names, special requirements</li>
                  <li><strong>Communication records:</strong> Emails, phone calls, and messages with our team</li>
                </ul>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Process and fulfil your booking requests</li>
                  <li>Communicate with you about your transfers</li>
                  <li>Send booking confirmations and driver details</li>
                  <li>Track flights and sailings to adjust pickup times</li>
                  <li>Process payments and issue receipts</li>
                  <li>Respond to your enquiries and provide customer support</li>
                  <li>Improve our services and website</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">4. Legal Basis for Processing</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We process your personal data on the following legal bases:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>Contract:</strong> Processing necessary to perform our contract with you</li>
                  <li><strong>Legitimate interests:</strong> To operate and improve our business</li>
                  <li><strong>Legal obligation:</strong> To comply with applicable laws and regulations</li>
                  <li><strong>Consent:</strong> Where you have given explicit consent for marketing communications</li>
                </ul>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">5. Data Sharing</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We may share your information with:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>Our drivers:</strong> To facilitate your transfer (name, pickup location, contact number)</li>
                  <li><strong>Payment processors:</strong> To securely process your payments</li>
                  <li><strong>Flight tracking services:</strong> To monitor your arrival times</li>
                  <li><strong>Legal authorities:</strong> When required by law</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  We do not sell your personal information to third parties.
                </p>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">6. Data Security</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, alteration, disclosure, or destruction. This includes encryption of data in transit, secure storage systems, and restricted access to personal information.
                </p>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">7. Data Retention</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We retain your personal data for as long as necessary to fulfil the purposes for which it was collected, including to satisfy legal, accounting, or reporting requirements. Booking records are typically retained for 7 years for tax and legal compliance purposes.
                </p>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">8. Your Rights</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Under UK GDPR, you have the following rights:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
                  <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
                  <li><strong>Erasure:</strong> Request deletion of your data (subject to legal requirements)</li>
                  <li><strong>Restriction:</strong> Request limitation of processing</li>
                  <li><strong>Portability:</strong> Request transfer of your data to another provider</li>
                  <li><strong>Object:</strong> Object to processing based on legitimate interests</li>
                  <li><strong>Withdraw consent:</strong> Where processing is based on consent</li>
                </ul>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">9. Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  For any questions about this Privacy Policy or to exercise your rights, please contact us:
                </p>
                <div className="bg-card rounded-xl p-6 text-muted-foreground">
                  <p><strong>The Dorset Transfer Company</strong></p>
                  <p>383 Verity Crescent</p>
                  <p>Poole, England</p>
                  <p>BH17 8TS</p>
                  <p className="mt-4">Company No: 16884513</p>
                </div>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">10. Complaints</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you are not satisfied with how we handle your personal data, you have the right to lodge a complaint with the Information Commissioner&apos;s Office (ICO), the UK supervisory authority for data protection issues. Visit <a href="https://ico.org.uk" className="text-sage-dark hover:underline" target="_blank" rel="noopener noreferrer">ico.org.uk</a> for more information.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center bg-card rounded-3xl p-8 md:p-12">
            <h3 className="font-playfair text-2xl md:text-3xl font-semibold text-foreground mb-4">
              Questions about your data?
            </h3>
            <p className="text-muted-foreground mb-6">
              Contact us if you have any privacy concerns
            </p>
            <Link href="/contact" className={buttonVariants({ variant: "hero-golden", size: "xl" })}>
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
