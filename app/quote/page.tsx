'use client';

import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

import { Button } from '@/components/ui/button';

import FeedbackButton from '../components/FeedbackButton';

import BookingConfirmation from './components/BookingConfirmation';
import ContactDetailsForm, { ContactDetails } from './components/ContactDetailsForm';
import DateTimeStep from './components/DateTimeStep';
import LoadingState from './components/LoadingState';
import LocationStep from './components/LocationStep';
import LuggageCounter from './components/LuggageCounter';
import MapPreview from './components/MapPreview';
import PassengerCounter from './components/PassengerCounter';
import PaymentForm, { PaymentDetails } from './components/PaymentForm';
import QuoteResult from './components/QuoteResult';
import VehicleSelector from './components/VehicleSelector';
import { calculateQuote, getFixedRoutes } from './lib/api';
import { Extras, JourneyType, QuoteResponse, QuoteRequest, Location, Waypoint } from './lib/types';
import OptionalExtras from './components/OptionalExtras';


type Step = 1 | 2 | 3 | 4;
type BookingStage = 'quote' | 'contact' | 'payment' | 'confirmation';

function QuotePageContent() {
  const searchParams = useSearchParams();

  // Form state
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [pickupDate, setPickupDate] = useState<Date | null>(null);
  const [passengers, setPassengers] = useState(2);
  const [luggage, setLuggage] = useState(0);
  const [vehicleType, setVehicleType] = useState<string | null>(null);

  // UI state
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Booking flow state
  const [bookingStage, setBookingStage] = useState<BookingStage>('quote');
  const [contactDetails, setContactDetails] = useState<ContactDetails | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [bookingId, setBookingId] = useState<string>('');

  // Pre-fill locations from URL parameters (from fixed route pricing)
  useEffect(() => {
    const routeId = searchParams.get('route');

    if (routeId) {
      const loadFixedRoute = async () => {
        try {
          const routes = await getFixedRoutes();
          const route = routes.find(r => r.routeId === routeId);

          if (route) {
            setPickupLocation({
              address: route.originName,
              placeId: route.originPlaceId
            });
            setDropoffLocation({
              address: route.destinationName,
              placeId: route.destinationPlaceId
            });
            setCurrentStep(2); // Skip to date/time step
          }
        } catch (error) {
          console.error('Failed to load fixed route:', error);
        }
      };

      loadFixedRoute();
    }
  }, [searchParams]);

  // Validation
  const canProceedFromStep1 = () => {
    // Step 1: Locations (pickup and dropoff required)
    return pickupLocation?.address.trim() !== '' &&
           dropoffLocation?.address.trim() !== '';
  };

  const canProceedFromStep2 = () => {
    // Step 2: Date & Time
    return pickupDate !== null;
  };

  const canProceedFromStep3 = () => {
    // Step 3: Passengers & Luggage (always valid, has defaults)
    return true;
  };

  const canProceedFromStep4 = () => {
    // Step 4: Vehicle selection
    return vehicleType !== null;
  };

  const handleNextStep = () => {
    setError(null);

    if (currentStep === 1 && !canProceedFromStep1()) {
      setError('Please enter pickup and dropoff locations');
      return;
    }

    if (currentStep === 2 && !canProceedFromStep2()) {
      setError('Please select pickup date and time');
      return;
    }

    if (currentStep === 3 && !canProceedFromStep3()) {
      setError('Please enter passenger details');
      return;
    }

    if (currentStep === 4 && !canProceedFromStep4()) {
      setError('Please select a vehicle type');
      return;
    }

    if (currentStep === 4) {
      handleSubmit();
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, 4) as Step);
    }
  };

  const handlePreviousStep = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1) as Step);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!pickupLocation || !dropoffLocation || !pickupDate || !vehicleType) {
      setError('Please complete all required fields');
      return;
    }

    try {
      setLoading(true);

      // Filter out empty waypoints - must have either valid placeId OR valid address
      // Trim whitespace to catch edge cases like "   " (whitespace-only addresses)
      const filteredWaypoints: Waypoint[] = waypoints
        .filter(w => {
          const hasValidAddress = w.address && w.address.trim().length > 0;
          const hasValidPlaceId = w.placeId && w.placeId.trim().length > 0;
          return hasValidAddress && hasValidPlaceId; // Require BOTH for safety
        });

      const request: QuoteRequest = {
        pickupLocation,
        dropoffLocation,
        waypoints: filteredWaypoints.length > 0 ? filteredWaypoints : undefined,
        pickupTime: pickupDate.toISOString(),
        passengers,
        luggage,
        vehicleType: vehicleType as 'standard' | 'executive' | 'minibus',
      };

      console.log('Quote request:', request);

      const response = await calculateQuote(request);
      setQuote(response);
    } catch (err) {
      console.error('Quote calculation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate quote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewQuote = () => {
    setQuote(null);
    setCurrentStep(1);
    setPickupLocation(null);
    setDropoffLocation(null);
    setWaypoints([]);
    setPickupDate(null);
    setPassengers(2);
    setLuggage(0);
    setVehicleType(null);
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
    // Generate mock booking ID
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

      {/* Progress Indicator - Mobile Optimized */}
      <div className="bg-card border-b border-border py-4 md:py-6">
        <div className="container px-4 mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            {/* Step 1: Locations */}
            <div className="flex items-center">
              <div className={`w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center font-semibold text-xs md:text-sm ${
                currentStep >= 1 ? 'bg-sage-dark text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {currentStep > 1 ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : '1'}
              </div>
              <div className="ml-1.5 hidden lg:block">
                <p className="text-xs font-medium text-foreground">Locations</p>
              </div>
            </div>

            {/* Connector */}
            <div className={`flex-1 h-0.5 mx-1.5 md:mx-2 ${currentStep >= 2 ? 'bg-sage-dark' : 'bg-border'}`} />

            {/* Step 2: Date & Time */}
            <div className="flex items-center">
              <div className={`w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center font-semibold text-xs md:text-sm ${
                currentStep >= 2 ? 'bg-sage-dark text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {currentStep > 2 ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : '2'}
              </div>
              <div className="ml-1.5 hidden lg:block">
                <p className="text-xs font-medium text-foreground">Date & Time</p>
              </div>
            </div>

            {/* Connector */}
            <div className={`flex-1 h-0.5 mx-1.5 md:mx-2 ${currentStep >= 3 ? 'bg-sage-dark' : 'bg-border'}`} />

            {/* Step 3: Passengers */}
            <div className="flex items-center">
              <div className={`w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center font-semibold text-xs md:text-sm ${
                currentStep >= 3 ? 'bg-sage-dark text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {currentStep > 3 ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : '3'}
              </div>
              <div className="ml-1.5 hidden lg:block">
                <p className="text-xs font-medium text-foreground">Passengers</p>
              </div>
            </div>

            {/* Connector */}
            <div className={`flex-1 h-0.5 mx-1.5 md:mx-2 ${currentStep >= 4 ? 'bg-sage-dark' : 'bg-border'}`} />

            {/* Step 4: Vehicle */}
            <div className="flex items-center">
              <div className={`w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center font-semibold text-xs md:text-sm ${
                currentStep >= 4 ? 'bg-sage-dark text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {currentStep > 4 ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : '4'}
              </div>
              <div className="ml-1.5 hidden lg:block">
                <p className="text-xs font-medium text-foreground">Vehicle</p>
              </div>
            </div>
          </div>

          {/* Mobile step labels */}
          <div className="lg:hidden mt-3 text-center">
            <p className="text-sm font-medium text-foreground">
              {currentStep === 1 && 'Locations'}
              {currentStep === 2 && 'Date & Time'}
              {currentStep === 3 && 'Passengers & Luggage'}
              {currentStep === 4 && 'Choose Vehicle'}
            </p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <section className="py-6 md:py-12 pb-28 md:pb-12">
        <div className="container px-4 mx-auto max-w-2xl">
          {/* Map Preview - Shows route with all locations */}
          {pickupLocation && dropoffLocation && (
            <div className="mb-6 animate-fade-up">
              <MapPreview
                pickup={pickupLocation}
                dropoff={dropoffLocation}
                waypoints={waypoints}
                pickupTime={pickupDate}
              />
            </div>
          )}

          <div className="space-y-6">

            {/* Step 1: Locations */}
            {currentStep === 1 && (
              <LocationStep
                pickup={pickupLocation}
                dropoff={dropoffLocation}
                waypoints={waypoints}
                onPickupChange={setPickupLocation}
                onDropoffChange={setDropoffLocation}
                onWaypointsChange={setWaypoints}
              />
            )}

            {/* Step 2: Date & Time */}
            {currentStep === 2 && (
              <DateTimeStep
                selectedDate={pickupDate}
                onChange={setPickupDate}
              />
            )}

            {/* Step 3: Passengers & Luggage */}
            {currentStep === 3 && (
              <div className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light space-y-6">
                <PassengerCounter
                  count={passengers}
                  onChange={setPassengers}
                />

                <div className="border-t border-border pt-6">
                  <LuggageCounter
                    count={luggage}
                    onChange={setLuggage}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Vehicle Selection */}
            {currentStep === 4 && (
              <VehicleSelector
                selected={vehicleType}
                onChange={setVehicleType}
                passengers={passengers}
              />
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-error/10 border border-error/20 rounded-xl">
                <p className="text-sm text-error">{error}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sticky Navigation Buttons - Mobile Fixed, Desktop Inline */}
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
            <Button
              type="button"
              variant="hero-golden"
              size="xl"
              onClick={handleNextStep}
              disabled={
                (currentStep === 1 && !canProceedFromStep1()) ||
                (currentStep === 2 && !canProceedFromStep2()) ||
                (currentStep === 3 && !canProceedFromStep3()) ||
                (currentStep === 4 && !canProceedFromStep4())
              }
              className="flex-1"
            >
              {currentStep === 4 ? (
                <>Get Quote</>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && <LoadingState />}
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
