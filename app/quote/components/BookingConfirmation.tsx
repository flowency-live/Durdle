'use client';

import { CheckCircle, Calendar, MapPin, Users, Car, Mail, Phone, Download } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

import { QuoteResponse } from '../lib/types';

import { ContactDetails } from './ContactDetailsForm';

interface BookingConfirmationProps {
  quote: QuoteResponse;
  contactDetails: ContactDetails;
  bookingId: string;
}

export default function BookingConfirmation({ quote, contactDetails, bookingId }: BookingConfirmationProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const handleDownloadConfirmation = () => {
    // TODO: Implement PDF download functionality
    console.log('Download confirmation PDF');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border py-6">
        <div className="container px-4 mx-auto max-w-3xl">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="font-playfair text-3xl md:text-4xl font-bold text-foreground mb-2">
              Booking Confirmed!
            </h1>
            <p className="text-lg text-muted-foreground">
              Your transfer has been successfully booked
            </p>
          </div>
        </div>
      </header>

      {/* Confirmation Content */}
      <section className="py-12">
        <div className="container px-4 mx-auto max-w-3xl space-y-6">

          {/* Booking Reference */}
          <div className="bg-card rounded-3xl shadow-deep p-6 md:p-8">
            <div className="text-center mb-6">
              <p className="text-sm font-medium text-muted-foreground mb-2">Booking Reference</p>
              <p className="font-mono text-2xl md:text-3xl font-bold text-sage-dark tracking-wider">
                {bookingId}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Please keep this reference number for your records
              </p>
            </div>

            {/* Confirmation Email Notice */}
            <div className="bg-sage-light/30 border border-sage-light rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-sage-dark flex-shrink-0 mt-0.5" />
                <div className="text-sm text-navy-light">
                  <p className="font-medium mb-1">Confirmation Email Sent</p>
                  <p className="text-xs">
                    A detailed confirmation has been sent to <strong>{contactDetails.email}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Journey Details */}
          <div className="bg-card rounded-3xl shadow-deep p-6 md:p-8">
            <h2 className="font-playfair text-xl md:text-2xl font-semibold text-foreground mb-6">
              Journey Details
            </h2>

            <div className="space-y-4">
              {/* Date & Time */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-sage-dark/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-sage-dark" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pickup Date & Time</p>
                  <p className="text-base font-semibold text-foreground">
                    {formatDate(quote.pickupTime)}
                  </p>
                  <p className="text-base text-foreground">{formatTime(quote.pickupTime)}</p>
                </div>
              </div>

              {/* Locations */}
              <div className="border-t border-border pt-4">
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-10 h-10 rounded-full bg-sage-dark/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-sage-dark" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Pickup Location</p>
                    <p className="text-base text-foreground">{quote.pickupLocation.address}</p>
                  </div>
                </div>

                {quote.waypoints && quote.waypoints.length > 0 && (
                  <div className="ml-14 mb-3 pl-4 border-l-2 border-sage-light space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Stops</p>
                    {quote.waypoints.map((waypoint, index) => (
                      <div key={index} className="text-sm text-foreground">
                        <span className="font-medium">Stop {index + 1}:</span> {waypoint.address}
                        {waypoint.waitTime && (
                          <span className="text-muted-foreground ml-2">
                            (Wait: {waypoint.waitTime} min)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-navy-dark/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-navy-dark" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Dropoff Location</p>
                    <p className="text-base text-foreground">{quote.dropoffLocation.address}</p>
                  </div>
                </div>
              </div>

              {/* Vehicle & Passengers */}
              <div className="border-t border-border pt-4 grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Car className="w-5 h-5 text-sage-dark mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Vehicle</p>
                    <p className="text-base font-semibold text-foreground capitalize">{quote.vehicleType}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-sage-dark mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Passengers</p>
                    <p className="text-base font-semibold text-foreground">
                      {quote.passengers} {quote.passengers === 1 ? 'passenger' : 'passengers'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="bg-card rounded-3xl shadow-deep p-6 md:p-8">
            <h2 className="font-playfair text-xl md:text-2xl font-semibold text-foreground mb-6">
              Lead Passenger
            </h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="text-base font-semibold text-foreground">{contactDetails.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-base text-foreground">{contactDetails.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="text-base text-foreground">{contactDetails.phone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="bg-card rounded-3xl shadow-deep p-6 md:p-8">
            <h2 className="font-playfair text-xl md:text-2xl font-semibold text-foreground mb-6">
              Pricing Summary
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-base text-muted-foreground">Base Fare</span>
                <span className="text-base font-semibold text-foreground">
                  {formatCurrency(quote.pricing.breakdown.baseFare / 100)}
                </span>
              </div>

              {quote.pricing.breakdown.distanceCharge > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-base text-muted-foreground">
                    Distance ({quote.journey.distance.miles} miles)
                  </span>
                  <span className="text-base font-semibold text-foreground">
                    {formatCurrency(quote.pricing.breakdown.distanceCharge / 100)}
                  </span>
                </div>
              )}

              {quote.pricing.breakdown.waitTimeCharge > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-base text-muted-foreground">Wait Time</span>
                  <span className="text-base font-semibold text-foreground">
                    {formatCurrency(quote.pricing.breakdown.waitTimeCharge / 100)}
                  </span>
                </div>
              )}

              <div className="border-t border-border pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-foreground">Total</span>
                  <span className="text-2xl font-bold text-sage-dark">
                    {quote.pricing.displayTotal}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Final amount may vary based on actual distance and time
                </p>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-3xl p-6 md:p-8">
            <h2 className="font-playfair text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">
              What happens next?
            </h2>
            <ol className="space-y-3 text-sm text-blue-900 dark:text-blue-100">
              <li className="flex gap-3">
                <span className="font-semibold flex-shrink-0">1.</span>
                <span>You will receive a confirmation email with all booking details</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold flex-shrink-0">2.</span>
                <span>Your driver will be assigned and you&apos;ll receive their details 24 hours before pickup</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold flex-shrink-0">3.</span>
                <span>You can track your driver on the day of your journey</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold flex-shrink-0">4.</span>
                <span>Payment will be processed after your transfer is completed</span>
              </li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="hero-outline"
              size="xl"
              onClick={handleDownloadConfirmation}
              className="flex-1"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Confirmation
            </Button>
            <Link href="/" className="flex-1">
              <Button
                type="button"
                variant="hero-golden"
                size="xl"
                className="w-full"
              >
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
