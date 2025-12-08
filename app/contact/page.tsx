'use client';

import { ArrowLeft, Phone, Mail, MapPin, Download } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

import { buttonVariants } from '@/components/ui/button';

export default function ContactPage() {
  const quoteUrl = 'https://durdle.co.uk/quote2';

  const contactInfo = {
    name: 'The Dorset Transfer Company',
    phone: '+44 1234 567890',
    email: 'bookings@durdle.co.uk',
    address: 'Dorset, United Kingdom',
  };

  const handleDownloadVCard = () => {
    const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${contactInfo.name}
TEL:${contactInfo.phone}
EMAIL:${contactInfo.email}
ADR:;;${contactInfo.address};;;;
URL:${quoteUrl}
END:VCARD`;

    const blob = new Blob([vCard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'durdle-contact.vcf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-sage-light/50 shadow-sm">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/dtc-logo-wave2.png"
                alt="The Dorset Transfer Company"
                width={60}
                height={60}
                className="h-10 md:h-12 w-auto"
              />
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Home</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12 md:py-20">
        <div className="container px-4 mx-auto max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Contact Us
            </h1>
            <p className="text-muted-foreground">
              Get in touch with The Dorset Transfer Company
            </p>
          </div>

          {/* Contact Card */}
          <div className="bg-card rounded-3xl shadow-xl overflow-hidden border-2 border-sage-light">
            {/* Header with Brand Colors */}
            <div className="bg-gradient-to-r from-sage-dark to-navy-dark p-6 text-center">
              <h2 className="text-xl font-bold text-white mb-1">
                {contactInfo.name}
              </h2>
              <p className="text-sage-light text-sm">
                Your Reliable Travel Partner
              </p>
            </div>

            {/* Contact Information */}
            <div className="p-6 space-y-4">
              <a
                href={`tel:${contactInfo.phone}`}
                className="flex items-center gap-4 p-4 bg-sage-light/10 rounded-xl hover:bg-sage-light/20 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-sage-dark/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-sage-dark" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Phone</p>
                  <p className="text-foreground font-semibold">
                    {contactInfo.phone}
                  </p>
                </div>
              </a>

              <a
                href={`mailto:${contactInfo.email}`}
                className="flex items-center gap-4 p-4 bg-sage-light/10 rounded-xl hover:bg-sage-light/20 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-sage-dark/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-sage-dark" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Email</p>
                  <p className="text-foreground font-semibold break-all">
                    {contactInfo.email}
                  </p>
                </div>
              </a>

              <div className="flex items-center gap-4 p-4 bg-sage-light/10 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-sage-dark/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-sage-dark" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Location</p>
                  <p className="text-foreground font-semibold">
                    {contactInfo.address}
                  </p>
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="px-6 pb-4">
              <div className="flex flex-col items-center p-4 bg-white rounded-xl">
                <p className="text-sm text-gray-600 font-medium mb-3">
                  Scan for Instant Quote
                </p>
                <div className="bg-white p-3 rounded-xl shadow border-2 border-sage-light">
                  <QRCodeSVG
                    value={quoteUrl}
                    size={120}
                    level="H"
                    includeMargin={false}
                    fgColor="#2C4A3E"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 pb-6 space-y-3">
              <button
                onClick={handleDownloadVCard}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-sage-dark text-white rounded-xl font-semibold hover:bg-sage-dark/90 transition-all shadow-lg active:scale-95"
              >
                <Download className="w-5 h-5" />
                Save Contact
              </button>

              <Link
                href="/quote2"
                className={buttonVariants({ variant: "hero-golden", size: "xl", className: "w-full" })}
              >
                Get a Quote Now
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
