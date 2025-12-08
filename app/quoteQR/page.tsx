'use client';

import { Phone, Mail, MapPin, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function QuoteQRPage() {
  const quoteUrl = 'https://durdle.co.uk/quote';

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
    <div className="min-h-screen bg-gradient-to-br from-sage-light via-background to-navy-light flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main Card */}
        <div className="bg-card rounded-3xl shadow-2xl overflow-hidden border-2 border-sage">
          {/* Header with Brand Colors */}
          <div className="bg-gradient-to-r from-sage-dark to-navy-dark p-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">
              The Dorset Transfer Company
            </h1>
            <p className="text-sage-light text-sm">
              Your Reliable Transfer Partner
            </p>
          </div>

          {/* QR Code Section */}
          <div className="p-8 bg-white">
            <div className="flex flex-col items-center">
              <p className="text-gray-700 font-semibold mb-4 text-center">
                Scan for Instant Quote
              </p>
              <div className="bg-white p-6 rounded-2xl shadow-lg border-4 border-sage-light">
                <QRCodeSVG
                  value={quoteUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                  fgColor="#2C4A3E"
                />
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center">
                Points to: {quoteUrl}
              </p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="px-8 pb-6 space-y-4">
            <div className="flex items-center gap-4 p-4 bg-sage-light/10 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-sage-dark/10 flex items-center justify-center flex-shrink-0">
                <Phone className="w-6 h-6 text-sage-dark" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Phone</p>
                <a
                  href={`tel:${contactInfo.phone}`}
                  className="text-gray-900 font-semibold hover:text-sage-dark transition-colors"
                >
                  {contactInfo.phone}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-sage-light/10 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-sage-dark/10 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-sage-dark" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Email</p>
                <a
                  href={`mailto:${contactInfo.email}`}
                  className="text-gray-900 font-semibold hover:text-sage-dark transition-colors break-all"
                >
                  {contactInfo.email}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-sage-light/10 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-sage-dark/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-sage-dark" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Location</p>
                <p className="text-gray-900 font-semibold">
                  {contactInfo.address}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-8 pb-8 space-y-3">
            <button
              onClick={handleDownloadVCard}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-sage-dark text-white rounded-xl font-semibold hover:bg-sage-dark/90 transition-all shadow-lg active:scale-95"
            >
              <Download className="w-5 h-5" />
              Save Contact
            </button>

            <a
              href="/quote"
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-navy-dark text-white rounded-xl font-semibold hover:bg-navy-dark/90 transition-all shadow-lg active:scale-95"
            >
              Get a Quote Now
            </a>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Save this page or take a screenshot for easy access
        </p>
      </div>
    </div>
  );
}
