'use client';

import { Phone, Mail, MapPin, Download, Car } from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

import Header from '@/components/shared/Header';
import { buttonVariants } from '@/components/ui/button';

export default function ContactPage() {
  const quoteUrl = 'https://durdle.co.uk/quote';
  const driversUrl = 'https://durdle.co.uk/drivers';

  const contactInfo = {
    name: 'The Dorset Transfer Company',
    phone: '+44 1234 567890',
    email: 'bookings@durdle.co.uk',
    driversEmail: 'drivers@durdle.co.uk',
    address: 'Dorset, United Kingdom',
  };

  const handleDownloadCustomerVCard = () => {
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
    a.download = 'durdle-bookings.vcf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadDriverVCard = () => {
    const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${contactInfo.name} - Driver Team
TEL:${contactInfo.phone}
EMAIL:${contactInfo.driversEmail}
ADR:;;${contactInfo.address};;;;
URL:${driversUrl}
END:VCARD`;

    const blob = new Blob([vCard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'durdle-drivers.vcf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background pt-20">
      <Header />

      {/* Main Content */}
      <main className="py-12 md:py-20">
        <div className="container px-4 mx-auto max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Card */}
            <div className="bg-card rounded-3xl shadow-xl overflow-hidden border-2 border-sage-light">
              {/* Header with Brand Colors */}
              <div className="bg-gradient-to-r from-sage-dark to-navy-dark p-6 text-center">
                <h2 className="text-xl font-bold text-white mb-1">
                  {contactInfo.name}
                </h2>
                <p className="text-sage-light text-sm">
                  Your Reliable Transfer Partner
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
                  onClick={handleDownloadCustomerVCard}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-sage-dark text-white rounded-xl font-semibold hover:bg-sage-dark/90 transition-all shadow-lg active:scale-95"
                >
                  <Download className="w-5 h-5" />
                  Save Contact
                </button>

                <Link
                  href="/quote"
                  className={buttonVariants({ variant: "hero-golden", size: "xl", className: "w-full" })}
                >
                  Get a Quote Now
                </Link>
              </div>
            </div>

            {/* Driver Onboarding Card */}
            <div className="bg-card rounded-3xl shadow-xl overflow-hidden border-2 border-amber-200">
              {/* Header with Amber/Copper Colors */}
              <div className="bg-gradient-to-r from-amber-600 to-amber-800 p-6 text-center">
                <h2 className="text-xl font-bold text-white mb-1">
                  Join Our Driver Team
                </h2>
                <p className="text-amber-200 text-sm">
                  Drive with The Dorset Transfer Company
                </p>
              </div>

              {/* Contact Information */}
              <div className="p-6 space-y-4">
                <a
                  href={`tel:${contactInfo.phone}`}
                  className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Phone</p>
                    <p className="text-foreground font-semibold">
                      {contactInfo.phone}
                    </p>
                  </div>
                </a>

                <a
                  href={`mailto:${contactInfo.driversEmail}`}
                  className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Email</p>
                    <p className="text-foreground font-semibold break-all">
                      {contactInfo.driversEmail}
                    </p>
                  </div>
                </a>

                <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Car className="w-6 h-6 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Opportunities</p>
                    <p className="text-foreground font-semibold">
                      Flexible hours, great pay
                    </p>
                  </div>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="px-6 pb-4">
                <div className="flex flex-col items-center p-4 bg-white rounded-xl">
                  <p className="text-sm text-gray-600 font-medium mb-3">
                    Scan to Apply
                  </p>
                  <div className="bg-white p-3 rounded-xl shadow border-2 border-amber-200">
                    <QRCodeSVG
                      value={driversUrl}
                      size={120}
                      level="H"
                      includeMargin={false}
                      fgColor="#B45309"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-6 pb-6 space-y-3">
                <button
                  onClick={handleDownloadDriverVCard}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-all shadow-lg active:scale-95"
                >
                  <Download className="w-5 h-5" />
                  Save Contact
                </button>

                <Link
                  href="/drivers"
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg active:scale-95"
                >
                  Apply to Drive
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
