'use client';

import Link from 'next/link';

import Header from '@/components/shared/Header';
import { buttonVariants } from '@/components/ui/button';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background pt-20">
      <Header />

      {/* Hero Section */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-sage-light via-cream to-background">
        <div className="container px-4 md:px-6 mx-auto max-w-4xl text-center">
          <h1 className="font-playfair text-4xl md:text-5xl lg:text-6xl font-bold text-navy mb-6">
            Terms & Conditions
          </h1>
          <p className="text-lg md:text-xl text-navy-light max-w-2xl mx-auto">
            Please read these terms carefully before using our services
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
                  These Terms and Conditions govern your use of The Dorset Transfer Company&apos;s services. By booking a transfer with us, you agree to be bound by these terms. We are a licensed private hire operator providing premium transfer services across Dorset and the United Kingdom.
                </p>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">2. Booking & Confirmation</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  All bookings are subject to availability and confirmation. When you make a booking, you will receive a confirmation email containing your booking details, driver information, and pickup instructions. Please review this information carefully and contact us immediately if any details are incorrect.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to refuse or cancel any booking at our discretion, including but not limited to situations where passenger behaviour may pose a risk to safety.
                </p>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">3. Pricing & Payment</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  All prices quoted are in British Pounds (GBP) and include VAT where applicable. The price quoted at the time of booking is the price you will pay, with no hidden extras for standard journeys.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Additional charges may apply for: waiting time beyond the included allowance, additional stops not specified at booking, tolls or congestion charges, and cleaning fees for excessive soiling of vehicles.
                </p>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">4. Cancellation Policy</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We understand that plans can change. Our cancellation policy is as follows:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>More than 24 hours before pickup: Full refund</li>
                  <li>12-24 hours before pickup: 50% refund</li>
                  <li>Less than 12 hours before pickup: No refund</li>
                  <li>No-show without cancellation: No refund</li>
                </ul>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">5. Passenger Responsibilities</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Passengers are responsible for:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Providing accurate booking information including pickup address and contact details</li>
                  <li>Being ready at the agreed pickup time and location</li>
                  <li>Ensuring all luggage meets vehicle capacity limits</li>
                  <li>Behaving in a respectful manner towards drivers and other passengers</li>
                  <li>Complying with UK law regarding seatbelt use and child restraints</li>
                </ul>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">6. Waiting Time</h2>
                <p className="text-muted-foreground leading-relaxed">
                  For airport pickups, we include 1 hour of free waiting time from the actual flight landing time. For all other pickups, we include 15 minutes of free waiting time from the scheduled pickup time. Additional waiting time will be charged at our standard hourly rate.
                </p>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">7. Liability</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  The Dorset Transfer Company maintains comprehensive insurance for all vehicles and passengers. However, we cannot be held liable for:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Delays caused by traffic, weather, or other circumstances beyond our control</li>
                  <li>Missed flights, trains, or connections due to such delays</li>
                  <li>Loss or damage to personal belongings left in vehicles</li>
                  <li>Consequential losses arising from our services</li>
                </ul>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">8. Changes to Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to our website. Your continued use of our services following any changes constitutes acceptance of the new terms.
                </p>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">9. Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about these Terms and Conditions, please contact us through our website or at our registered office: 383 Verity Crescent, Poole, England, BH17 8TS.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center bg-card rounded-3xl p-8 md:p-12">
            <h3 className="font-playfair text-2xl md:text-3xl font-semibold text-foreground mb-4">
              Ready to book?
            </h3>
            <p className="text-muted-foreground mb-6">
              Get an instant quote for your transfer
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/quote" className={buttonVariants({ variant: "hero-golden", size: "xl" })}>
                Get a Quote
              </Link>
              <Link href="/contact" className={buttonVariants({ variant: "outline-dark", size: "xl" })}>
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
