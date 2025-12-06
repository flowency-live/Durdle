'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import LocationStep from './components/LocationStep';
import DateTimeStep from './components/DateTimeStep';
import MapPreview from './components/MapPreview';
import VehicleSelector from './components/VehicleSelector';
import PassengerCounter from './components/PassengerCounter';
import LuggageCounter from './components/LuggageCounter';
import LoadingState from './components/LoadingState';
import QuoteResult from './components/QuoteResult';
import { calculateQuote } from './lib/api';
import { QuoteResponse, QuoteRequest, Location, Waypoint } from './lib/types';
import FeedbackButton from '../components/FeedbackButton';

type Step = 1 | 2 | 3 | 4;

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

  // Pre-fill locations from URL parameters (from fixed route pricing)
  useEffect(() => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (from) {
      setPickupLocation({ address: from, placeId: '' });
    }
    if (to) {
      setDropoffLocation({ address: to, placeId: '' });
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

      // Convert waypoints to Location[] for API (remove wait time info for now)
      const waypointLocations: Location[] = waypoints
        .filter(w => w.address.trim() !== '')
        .map(({ address, placeId }) => ({ address, placeId }));

      const request: QuoteRequest = {
        pickupLocation,
        dropoffLocation,
        waypoints: waypointLocations.length > 0 ? waypointLocations : undefined,
        pickupTime: pickupDate.toISOString(),
        passengers,
        luggage,
        vehicleType: vehicleType as 'standard' | 'executive' | 'minibus',
      };

      const response = await calculateQuote(request);
      setQuote(response);
    } catch (err) {
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
  };

  if (quote) {
    return <QuoteResult quote={quote} onNewQuote={handleNewQuote} />;
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
      <section className="py-6 md:py-12">
        <div className="container px-4 mx-auto max-w-2xl">
          {/* Map Preview - Persistent across steps after locations selected */}
          {pickupLocation && dropoffLocation && (
            <div className="mb-6 animate-fade-up">
              <MapPreview
                pickup={pickupLocation}
                dropoff={dropoffLocation}
                waypoints={waypoints}
              />
            </div>
          )}

          <div className="bg-card rounded-2xl md:rounded-3xl shadow-deep p-4 md:p-8 space-y-6 md:space-y-8">

            {/* Step 1: Locations */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-playfair text-xl md:text-2xl font-semibold text-foreground mb-2">
                    Where are you going?
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Enter your pickup and dropoff locations
                  </p>
                </div>

                <LocationStep
                  pickup={pickupLocation}
                  dropoff={dropoffLocation}
                  waypoints={waypoints}
                  onPickupChange={setPickupLocation}
                  onDropoffChange={setDropoffLocation}
                  onWaypointsChange={setWaypoints}
                />
              </div>
            )}

            {/* Step 2: Date & Time */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-playfair text-xl md:text-2xl font-semibold text-foreground mb-2">
                    When do you need pickup?
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Select your preferred date and time
                  </p>
                </div>

                <DateTimeStep
                  selectedDate={pickupDate}
                  onChange={setPickupDate}
                />
              </div>
            )}

            {/* Step 3: Passengers & Luggage */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-playfair text-xl md:text-2xl font-semibold text-foreground mb-2">
                    How many passengers?
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Select passengers and luggage count
                  </p>
                </div>

                <div className="bg-card rounded-2xl p-6 shadow-mobile border-2 border-sage-light space-y-6">
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
              </div>
            )}

            {/* Step 4: Vehicle Selection */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-playfair text-xl md:text-2xl font-semibold text-foreground mb-2">
                    Choose your vehicle
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Select the vehicle that suits your needs
                  </p>
                </div>

                <VehicleSelector
                  selected={vehicleType}
                  onChange={setVehicleType}
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-error/10 border border-error/20 rounded-xl">
                <p className="text-sm text-error">{error}</p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-4">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="hero-outline"
                  size="xl"
                  onClick={handlePreviousStep}
                  className="flex-1"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">Back</span>
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
                    <span className="hidden sm:inline">Next</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

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
