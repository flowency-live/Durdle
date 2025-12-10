'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#FBF7F0]">
      {/* Top sage bar */}
      <div className="h-1 bg-sage" />
      <div className="container px-4 md:px-6 mx-auto">
        {/* Main Footer Content */}
        <div className="py-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Company Info & Details - Left Side */}
          <div className="lg:col-span-5">
            <Image
              src="/dtc-letterhead-logo.png"
              alt="The Dorset Transfer Company"
              width={280}
              height={80}
              className="h-16 w-auto mb-6"
            />
            <div className="text-sm text-navy-light/70 space-y-1">
              <p>Company No: 16884513</p>
              <p className="pt-2">
                383 Verity Crescent, Poole<br />
                England, BH17 8TS
              </p>
            </div>
          </div>

          {/* Links - Right Side */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              {/* Navigation */}
              <div>
                <h4 className="font-semibold text-navy mb-4">Navigate</h4>
                <nav className="flex flex-col gap-3">
                  <Link href="/" className="text-sm text-navy-light hover:text-navy transition-colors">Home</Link>
                  <Link href="/services" className="text-sm text-navy-light hover:text-navy transition-colors">Services</Link>
                  <Link href="/pricing" className="text-sm text-navy-light hover:text-navy transition-colors">Pricing</Link>
                  <Link href="/quote" className="text-sm text-navy-light hover:text-navy transition-colors">Get a Quote</Link>
                </nav>
              </div>

              {/* Support */}
              <div>
                <h4 className="font-semibold text-navy mb-4">Support</h4>
                <nav className="flex flex-col gap-3">
                  <Link href="/faq" className="text-sm text-navy-light hover:text-navy transition-colors">FAQ</Link>
                  <Link href="/contact" className="text-sm text-navy-light hover:text-navy transition-colors">Contact</Link>
                  <Link href="/accessibility" className="text-sm text-navy-light hover:text-navy transition-colors">Accessibility</Link>
                </nav>
              </div>

              {/* Legal */}
              <div>
                <h4 className="font-semibold text-navy mb-4">Legal</h4>
                <nav className="flex flex-col gap-3">
                  <Link href="/terms" className="text-sm text-navy-light hover:text-navy transition-colors">Terms & Conditions</Link>
                  <Link href="/privacy" className="text-sm text-navy-light hover:text-navy transition-colors">Privacy Policy</Link>
                  <Link href="/cookies" className="text-sm text-navy-light hover:text-navy transition-colors">Cookie Policy</Link>
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="h-1 bg-sage" />
        <div className="py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-navy-light/70">
            &copy; 2025 The Dorset Transfer Company. All rights reserved.
          </p>
          <p className="text-xs text-navy-light/50">
            Licensed private hire operator
          </p>
        </div>
      </div>
    </footer>
  );
}
