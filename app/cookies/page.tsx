'use client';

import Link from 'next/link';

import Header from '@/components/shared/Header';
import { buttonVariants } from '@/components/ui/button';

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-background pt-20">
      <Header />

      {/* Hero Section */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-sage-light via-cream to-background">
        <div className="container px-4 md:px-6 mx-auto max-w-4xl text-center">
          <h1 className="font-playfair text-4xl md:text-5xl lg:text-6xl font-bold text-navy mb-6">
            Cookie Policy
          </h1>
          <p className="text-lg md:text-xl text-navy-light max-w-2xl mx-auto">
            How we use cookies to improve your experience
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
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">What Are Cookies?</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and to provide information to website owners. Cookies help us remember your preferences, understand how you use our website, and improve your browsing experience.
                </p>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">How We Use Cookies</h2>
                <p className="text-muted-foreground leading-relaxed">
                  The Dorset Transfer Company uses cookies for several purposes. We use essential cookies to enable core website functionality, performance cookies to understand how visitors interact with our website, and functional cookies to remember your preferences.
                </p>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">Types of Cookies We Use</h2>

                <div className="space-y-6">
                  <div className="bg-card rounded-xl p-6">
                    <h3 className="font-semibold text-foreground mb-2">Essential Cookies</h3>
                    <p className="text-muted-foreground text-sm mb-3">
                      These cookies are necessary for the website to function and cannot be switched off.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 text-foreground">Cookie</th>
                            <th className="text-left py-2 text-foreground">Purpose</th>
                            <th className="text-left py-2 text-foreground">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          <tr className="border-b border-border/50">
                            <td className="py-2">session_id</td>
                            <td className="py-2">Maintains your session during booking</td>
                            <td className="py-2">Session</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2">csrf_token</td>
                            <td className="py-2">Security protection for forms</td>
                            <td className="py-2">Session</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-card rounded-xl p-6">
                    <h3 className="font-semibold text-foreground mb-2">Performance Cookies</h3>
                    <p className="text-muted-foreground text-sm mb-3">
                      These cookies help us understand how visitors interact with our website.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 text-foreground">Cookie</th>
                            <th className="text-left py-2 text-foreground">Purpose</th>
                            <th className="text-left py-2 text-foreground">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          <tr className="border-b border-border/50">
                            <td className="py-2">_ga</td>
                            <td className="py-2">Google Analytics - distinguishes users</td>
                            <td className="py-2">2 years</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2">_ga_*</td>
                            <td className="py-2">Google Analytics - maintains session state</td>
                            <td className="py-2">2 years</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-card rounded-xl p-6">
                    <h3 className="font-semibold text-foreground mb-2">Functional Cookies</h3>
                    <p className="text-muted-foreground text-sm mb-3">
                      These cookies enable enhanced functionality and personalisation.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 text-foreground">Cookie</th>
                            <th className="text-left py-2 text-foreground">Purpose</th>
                            <th className="text-left py-2 text-foreground">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          <tr className="border-b border-border/50">
                            <td className="py-2">cookie_consent</td>
                            <td className="py-2">Remembers your cookie preferences</td>
                            <td className="py-2">1 year</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2">recent_searches</td>
                            <td className="py-2">Stores recent quote searches</td>
                            <td className="py-2">30 days</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">Managing Cookies</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You can control and manage cookies in several ways. Most web browsers allow you to manage your cookie preferences through browser settings. You can:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Delete all cookies from your browser</li>
                  <li>Block all cookies from being set</li>
                  <li>Allow only certain cookies</li>
                  <li>Block third-party cookies</li>
                  <li>Clear cookies when you close your browser</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  Please note that blocking or deleting cookies may impact your experience on our website, and some features may not function properly.
                </p>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">Browser Settings</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Here are links to manage cookies in popular browsers:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><a href="https://support.google.com/chrome/answer/95647" className="text-sage-dark hover:underline" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
                  <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" className="text-sage-dark hover:underline" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
                  <li><a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" className="text-sage-dark hover:underline" target="_blank" rel="noopener noreferrer">Safari</a></li>
                  <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" className="text-sage-dark hover:underline" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
                </ul>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">Third-Party Cookies</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Some cookies on our website are set by third parties, such as Google Analytics. These third parties have their own privacy policies and may collect information about your online activities across different websites. We encourage you to review their privacy policies for more information.
                </p>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">Updates to This Policy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our data practices. When we make significant changes, we will notify you through a notice on our website.
                </p>
              </div>

              <div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-4">Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about our use of cookies, please contact us through our website or at our registered office: 383 Verity Crescent, Poole, England, BH17 8TS.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center bg-card rounded-3xl p-8 md:p-12">
            <h3 className="font-playfair text-2xl md:text-3xl font-semibold text-foreground mb-4">
              Ready to book your transfer?
            </h3>
            <p className="text-muted-foreground mb-6">
              Get an instant quote in seconds
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/quote" className={buttonVariants({ variant: "hero-golden", size: "xl" })}>
                Get a Quote
              </Link>
              <Link href="/" className={buttonVariants({ variant: "outline-dark", size: "xl" })}>
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
