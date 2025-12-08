'use client';

import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, Suspense } from 'react';

import { Button } from '@/components/ui/button';

import FeedbackButton from '../components/FeedbackButton';

import AllInputsStep from './components/AllInputsStep';
import BookingConfirmation from './components/BookingConfirmation';
import ContactDetailsForm, { ContactDetails } from './components/ContactDetailsForm';
import LoadingState from './components/LoadingState';
import PaymentForm, { PaymentDetails } from './components/PaymentForm';
import QuoteResult from './components/QuoteResult';
import VehicleComparisonGrid from './components/VehicleComparisonGrid';
import { calculateMultiVehicleQuote } from './lib/api';
import { Extras, JourneyType, QuoteResponse, Location, Waypoint, MultiVehicleQuoteResponse } from './lib/types';

type Step = 1 | 2;
type BookingStage = 'quote' | 'contact' | 'payment' | 'confirmation';

function QuotePageContent() {
  // Form state
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [pickupDate, setPickupDate] = useState<Date | null>(null);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [passengers, setPassengers] = useState(2);
  const [luggage, setLuggage] = useState(0);

  // Journey type & extras state
  const [journeyType, setJourneyType] = useState<JourneyType>('one-way');
  const [duration, setDuration] = useState(5); // Default to minimum 5 hours
  const [extras, setExtras] = useState<Extras>({ babySeats: 0, childSeats: 0 });

  // Transport details (airport/train station)
  const [flightNumber, setFlightNumber] = useState('');
  const [trainNumber, setTrainNumber] = useState('');

  // Step 2 state - multi-vehicle quote
  const [multiQuote, setMultiQuote] = useState<MultiVehicleQuoteResponse | null>(null);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  // UI state
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Booking flow state
  const [bookingStage, setBookingStage] = useState<BookingStage>('quote');
  const [contactDetails, setContactDetails] = useState<ContactDetails | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [bookingId, setBookingId] = useState<string>('');

  // Validation for Step 1
  const canProceedFromStep1 = () => {
    // For hourly: pickup, start time, end time, and minimum 5 hours required
    if (journeyType === 'hourly') {
      return (
        pickupLocation?.address.trim() !== '' &&
        pickupDate !== null &&
        endTime !== null &&
        duration >= 5
      );
    }
    // For round-trip: also require return date
    if (journeyType === 'round-trip') {
      return (
        pickupLocation?.address.trim() !== '' &&
        dropoffLocation?.address.trim() !== '' &&
        pickupDate !== null &&
        returnDate !== null
      );
    }
    // For one-way: pickup, dropoff, and date required
    return (
      pickupLocation?.address.trim() !== '' &&
      dropoffLocation?.address.trim() !== '' &&
      pickupDate !== null
    );
  };

  const handleNextStep = async () => {
    setError(null);

    if (currentStep === 1 && !canProceedFromStep1()) {
      setError('Please complete all required fields');
      return;
    }

    if (currentStep === 1) {
      // Fetch all vehicle quotes
      await fetchAllQuotes();
    }
  };

  const fetchAllQuotes = async () => {
    const isHourly = journeyType === 'hourly';

    // Validate required fields based on journey type
    if (!pickupLocation || !pickupDate) return;
    if (!isHourly && !dropoffLocation) return;

    setLoadingQuotes(true);
    setError(null);

    try {
      // Filter out empty waypoints
      const filteredWaypoints: Waypoint[] = waypoints.filter(w => {
        const hasValidAddress = w.address && w.address.trim().length > 0;
        const hasValidPlaceId = w.placeId && w.placeId.trim().length > 0;
        return hasValidAddress && hasValidPlaceId;
      });

      // Use compareMode API to get all vehicle prices in one call
      const response = await calculateMultiVehicleQuote({
        pickupLocation,
        dropoffLocation: isHourly ? undefined : dropoffLocation!,
        waypoints: filteredWaypoints.length > 0 ? filteredWaypoints : undefined,
        pickupTime: pickupDate.toISOString(),
        passengers,
        luggage,
        journeyType,
        durationHours: isHourly ? duration : undefined,
        extras: (extras.babySeats > 0 || extras.childSeats > 0) ? extras : undefined,
        compareMode: true,
      });

      setMultiQuote(response);
      setCurrentStep(2);
    } catch (err) {
      console.error('Error fetching quotes:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate quotes');
    } finally {
      setLoadingQuotes(false);
    }
  };

  const handlePreviousStep = () => {
    setError(null);
    setCurrentStep(1);
  };

  const handleVehicleSelect = (vehicleId: string, isReturn: boolean) => {
    if (!multiQuote) return;

    const vehiclePricing = multiQuote.vehicles[vehicleId as keyof typeof multiQuote.vehicles];
    if (!vehiclePricing) return;

    const priceInPence = isReturn ? vehiclePricing.return.price : vehiclePricing.oneWay.price;
    const displayPrice = isReturn ? vehiclePricing.return.displayPrice : vehiclePricing.oneWay.displayPrice;

    // Create the final quote response for the booking flow
    const finalQuote: QuoteResponse = {
      quoteId: multiQuote.quoteId || `quote-${Date.now()}`,
      status: multiQuote.status || 'valid',
      expiresAt: multiQuote.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      journey: {
        ...multiQuote.journey,
        route: { polyline: null },
      },
      pricing: {
        currency: 'GBP',
        breakdown: {
          baseFare: priceInPence,
          distanceCharge: 0,
          waitTimeCharge: 0,
          subtotal: priceInPence,
          tax: 0,
          total: priceInPence,
        },
        displayTotal: displayPrice,
      },
      vehicleType: vehicleId,
      pickupLocation: multiQuote.pickupLocation,
      dropoffLocation: multiQuote.dropoffLocation || multiQuote.pickupLocation,
      waypoints: multiQuote.waypoints,
      pickupTime: multiQuote.pickupTime,
      passengers: multiQuote.passengers,
      luggage: multiQuote.luggage,
      returnJourney: isReturn,
      createdAt: multiQuote.createdAt,
    };

    setQuote(finalQuote);
  };

  const handleNewQuote = () => {
    setQuote(null);
    setCurrentStep(1);
    setPickupLocation(null);
    setDropoffLocation(null);
    setWaypoints([]);
    setPickupDate(null);
    setReturnDate(null);
    setEndTime(null);
    setPassengers(2);
    setLuggage(0);
    setJourneyType('one-way');
    setDuration(5);
    setExtras({ babySeats: 0, childSeats: 0 });
    setFlightNumber('');
    setTrainNumber('');
    setMultiQuote(null);
    setError(null);
    setBookingStage('quote');
    setContactDetails(null);
    setPaymentDetails(null);
    setBookingId('');
  };

  // Booking flow handlers
  const handleConfirmBooking = () => {
    setBookingStage('contact');
  };

  const handleContactSubmit = (details: ContactDetails) => {
    setContactDetails(details);
    setBookingStage('payment');
  };

  const handleContactBack = () => {
    setBookingStage('quote');
  };

  const handlePaymentSubmit = (details: PaymentDetails) => {
    setPaymentDetails(details);
    const mockBookingId = `DTC-${Date.now().toString().slice(-8)}`;
    setBookingId(mockBookingId);
    setBookingStage('confirmation');
  };

  const handlePaymentBack = () => {
    setBookingStage('contact');
  };

  // Render booking confirmation
  if (bookingStage === 'confirmation' && quote && contactDetails && bookingId) {
    return (
      <BookingConfirmation
        quote={quote}
        contactDetails={contactDetails}
        bookingId={bookingId}
      />
    );
  }

  // Render payment form
  if (bookingStage === 'payment' && quote && contactDetails) {
    return (
      <PaymentForm
        onSubmit={handlePaymentSubmit}
        onBack={handlePaymentBack}
        initialValues={paymentDetails || undefined}
      />
    );
  }

  // Render contact details form
  if (bookingStage === 'contact' && quote) {
    return (
      <ContactDetailsForm
        onSubmit={handleContactSubmit}
        onBack={handleContactBack}
        initialValues={contactDetails || undefined}
      />
    );
  }

  // Render quote result
  if (quote) {
    return (
      <QuoteResult
        quote={quote}
        onNewQuote={handleNewQuote}
        onConfirmBooking={handleConfirmBooking}
      />
    );
  }

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
              <FeedbackButton />
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

      {/* Progress Indicator - Simplified 2 Steps */}
      <div className="bg-card border-b border-border py-4 md:py-6">
        <div className="container px-4 mx-auto max-w-3xl">
          <div className="flex items-center justify-center gap-4">
            {/* Step 1: Journey Details */}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                currentStep >= 1 ? 'bg-sage-dark text-white' : 'bg-muted text-muted-foreground'
              }`}>
                1
              </div>
              <span className={`text-sm font-medium ${currentStep >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                Journey Details
              </span>
            </div>

            {/* Connector */}
            <div className={`w-16 h-0.5 ${currentStep >= 2 ? 'bg-sage-dark' : 'bg-border'}`} />

            {/* Step 2: Choose Vehicle */}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                currentStep >= 2 ? 'bg-sage-dark text-white' : 'bg-muted text-muted-foreground'
              }`}>
                2
              </div>
              <span className={`text-sm font-medium ${currentStep >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
                Choose Vehicle
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <section className="py-6 md:py-12 pb-28 md:pb-12">
        <div className="container px-4 mx-auto max-w-2xl">
          {/* Letterhead Logo */}
          <div className="flex justify-center mb-6">
            <Image
              src="/dtc-letterhead-logo.png"
              alt="The Dorset Transfer Company"
              width={400}
              height={100}
              className="h-auto w-full max-w-[300px] md:max-w-[400px]"
              priority
            />
          </div>

          {/* Step 1: All Inputs */}
          {currentStep === 1 && (
            <AllInputsStep
              pickup={pickupLocation}
              dropoff={dropoffLocation}
              waypoints={waypoints}
              pickupDate={pickupDate}
              returnDate={returnDate}
              endTime={endTime}
              passengers={passengers}
              luggage={luggage}
              journeyType={journeyType}
              duration={duration}
              extras={extras}
              flightNumber={flightNumber}
              trainNumber={trainNumber}
              onPickupChange={setPickupLocation}
              onDropoffChange={setDropoffLocation}
              onWaypointsChange={setWaypoints}
              onDateChange={setPickupDate}
              onReturnDateChange={setReturnDate}
              onEndTimeChange={setEndTime}
              onPassengersChange={setPassengers}
              onLuggageChange={setLuggage}
              onJourneyTypeChange={setJourneyType}
              onDurationChange={setDuration}
              onExtrasChange={setExtras}
              onFlightNumberChange={setFlightNumber}
              onTrainNumberChange={setTrainNumber}
            />
          )}

          {/* Step 2: Vehicle Selection */}
          {currentStep === 2 && multiQuote && (
            <VehicleComparisonGrid
              multiQuote={multiQuote}
              passengers={passengers}
              onSelect={handleVehicleSelect}
            />
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-error/10 border border-error/20 rounded-xl">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}
        </div>
      </section>

      {/* Sticky Navigation Buttons */}
      <div className="fixed md:static bottom-0 left-0 right-0 z-40 bg-background border-t md:border-0 border-border p-4 md:p-0 shadow-lg md:shadow-none">
        <div className="container mx-auto max-w-2xl">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="default"
                size="xl"
                onClick={handlePreviousStep}
                className="w-auto px-6"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </Button>
            )}
            {currentStep === 1 && (
              <Button
                type="button"
                variant="hero-golden"
                size="xl"
                onClick={handleNextStep}
                disabled={!canProceedFromStep1() || loadingQuotes}
                className="flex-1"
              >
                {loadingQuotes ? 'Getting Quotes...' : 'See All Prices'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {loadingQuotes && <LoadingState />}
    </div>
  );
}

export default function QuotePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-sage-light border-t-sage-dark mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <QuotePageContent />
    </Suspense>
  );
}
