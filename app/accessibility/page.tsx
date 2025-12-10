'use client';

import Link from 'next/link';

import Header from '@/components/shared/Header';
import { buttonVariants } from '@/components/ui/button';

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-background pt-20">
      <Header />

      {/* Hero Section */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-sage-light via-cream to-background">
        <div className="container px-4 md:px-6 mx-auto max-w-4xl text-center">
          <h1 className="font-playfair text-4xl md:text-5xl lg:text-6xl font-bold text-navy mb-6">
            Accessibility
          </h1>
          <p className="text-lg md:text-xl text-navy-light max-w-2xl mx-auto">
            Our commitment to making travel accessible for everyone
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 md:py-20">
        <div className="container px-4 md:px-6 mx-auto max-w-3xl">
          <div className="prose prose-lg max-w-none">
            <div className="space-y-8">
              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">Our Commitment</h2>
                <p className="text-muted-foreground leading-relaxed">
                  The Dorset Transfer Company is committed to ensuring that our services and website are accessible to all users, including those with disabilities. We believe that everyone deserves the opportunity to travel comfortably and with dignity, and we continuously work to improve the accessibility of our services.
                </p>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">Website Accessibility</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We strive to ensure our website meets Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards. Our accessibility features include:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Clear, readable text with sufficient colour contrast</li>
                  <li>Keyboard navigation support throughout the site</li>
                  <li>Alt text for images and meaningful link descriptions</li>
                  <li>Consistent and predictable navigation</li>
                  <li>Resizable text without loss of functionality</li>
                  <li>Clear form labels and error messages</li>
                  <li>Mobile-responsive design for all devices</li>
                </ul>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">Vehicle Accessibility</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We understand that passengers may have varying mobility and accessibility requirements. Our services can accommodate:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>Wheelchair users:</strong> Please contact us in advance to arrange a suitable vehicle with wheelchair accessibility</li>
                  <li><strong>Mobility aids:</strong> Walkers, crutches, and folding wheelchairs can be accommodated in our larger vehicles</li>
                  <li><strong>Assistance animals:</strong> Guide dogs and registered assistance animals are welcome in all our vehicles</li>
                  <li><strong>Step assistance:</strong> Our drivers are trained to provide assistance with vehicle entry and exit</li>
                </ul>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">Booking Assistance</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We offer multiple ways to book our services to ensure accessibility for all:
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-card rounded-xl p-6">
                    <h3 className="font-semibold text-foreground mb-2">Online Booking</h3>
                    <p className="text-sm text-muted-foreground">
                      Our website is designed to be accessible and easy to navigate. Use our online quote system 24/7.
                    </p>
                  </div>
                  <div className="bg-card rounded-xl p-6">
                    <h3 className="font-semibold text-foreground mb-2">Phone Booking</h3>
                    <p className="text-sm text-muted-foreground">
                      Call our team to discuss your requirements and make a booking over the phone.
                    </p>
                  </div>
                  <div className="bg-card rounded-xl p-6">
                    <h3 className="font-semibold text-foreground mb-2">Email</h3>
                    <p className="text-sm text-muted-foreground">
                      Email us with your travel requirements and we&apos;ll respond within 24 hours.
                    </p>
                  </div>
                  <div className="bg-card rounded-xl p-6">
                    <h3 className="font-semibold text-foreground mb-2">Contact Form</h3>
                    <p className="text-sm text-muted-foreground">
                      Use our accessible contact form to send us your booking request.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">Special Requirements</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  When booking, please let us know about any special requirements so we can ensure the best possible service. This may include:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Wheelchair accessibility needs</li>
                  <li>Assistance with luggage or mobility aids</li>
                  <li>Child car seats or booster seats</li>
                  <li>Assistance animals travelling with you</li>
                  <li>Extra time needed for boarding or alighting</li>
                  <li>Communication preferences (e.g., text vs. phone calls)</li>
                </ul>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">Driver Training</h2>
                <p className="text-muted-foreground leading-relaxed">
                  All our drivers receive training in disability awareness and are committed to providing respectful, patient, and helpful service to passengers with disabilities. They are trained to assist with boarding, luggage handling, and ensuring passenger comfort throughout the journey.
                </p>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">Feedback</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We are committed to continuously improving our accessibility. If you have experienced any accessibility issues with our website or services, or have suggestions for improvement, please contact us.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Your feedback helps us understand how we can better serve all our customers. We take all accessibility feedback seriously and will work to address any issues raised.
                </p>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  For accessibility enquiries or to discuss your specific requirements:
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
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">Ongoing Improvements</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Accessibility is an ongoing commitment. We regularly review and update our website and services to ensure they remain accessible. We also stay informed about new accessibility standards and best practices to continually improve our offerings.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center bg-card rounded-3xl p-8 md:p-12">
            <h3 className="font-playfair text-2xl md:text-3xl font-semibold text-foreground mb-4">
              Ready to travel with us?
            </h3>
            <p className="text-muted-foreground mb-6">
              Get in touch to discuss your requirements
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact" className={buttonVariants({ variant: "hero-golden", size: "xl" })}>
                Contact Us
              </Link>
              <Link href="/quote" className={buttonVariants({ variant: "outline-dark", size: "xl" })}>
                Get a Quote
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
