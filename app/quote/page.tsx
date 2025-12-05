'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import LocationInput from './components/LocationInput';
import DateTimePicker from './components/DateTimePicker';
import VehicleSelector from './components/VehicleSelector';
import PassengerCounter from './components/PassengerCounter';
import LuggageCounter from './components/LuggageCounter';
import LoadingState from './components/LoadingState';
import QuoteResult from './components/QuoteResult';
import { calculateQuote } from './lib/api';
import { QuoteResponse, QuoteRequest, Location } from './lib/types';
import FeedbackButton from '../components/FeedbackButton';

type Step = 1 | 2 | 3;

export default function QuotePage() {
  const searchParams = useSearchParams();

  // Form state
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [pickupLocation, setPickupLocation] = useState<Location>({ address: '', placeId: '' });
  const [dropoffLocation, setDropoffLocation] = useState<Location>({ address: '', placeId: '' });
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
    return pickupLocation.address.trim() !== '' &&
           dropoffLocation.address.trim() !== '' &&
           pickupDate !== null;
  };

  const canProceedFromStep2 = () => {
    return vehicleType !== null;
  };

  const handleNextStep = () => {
    setError(null);

    if (currentStep === 1 && !canProceedFromStep1()) {
      setError('Please complete all journey details');
      return;
    }

    if (currentStep === 2 && !canProceedFromStep2()) {
      setError('Please select a vehicle type');
      return;
    }

    if (currentStep === 2) {
      handleSubmit();
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, 3) as Step);
    }
  };

  const handlePreviousStep = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1) as Step);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!pickupDate || !vehicleType) {
      setError('Please complete all required fields');
      return;
    }

    try {
      setLoading(true);

      const request: QuoteRequest = {
        pickupLocation,
        dropoffLocation,
        pickupTime: pickupDate.toISOString(),
        passengers,
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
    setPickupLocation({ address: '', placeId: '' });
    setDropoffLocation({ address: '', placeId: '' });
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
        <div className="container px-4 mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            {/* Step 1 */}
            <div className="flex items-center flex-1">
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-semibold ${
                currentStep >= 1 ? 'bg-sage-dark text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {currentStep > 1 ? <Check className="w-5 h-5" /> : '1'}
              </div>
              <div className="ml-2 hidden sm:block">
                <p className="text-xs md:text-sm font-medium text-foreground">Journey</p>
              </div>
            </div>

            {/* Connector */}
            <div className={`flex-1 h-0.5 mx-2 ${currentStep >= 2 ? 'bg-sage-dark' : 'bg-border'}`} />

            {/* Step 2 */}
            <div className="flex items-center flex-1">
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-semibold ${
                currentStep >= 2 ? 'bg-sage-dark text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {currentStep > 2 ? <Check className="w-5 h-5" /> : '2'}
              </div>
              <div className="ml-2 hidden sm:block">
                <p className="text-xs md:text-sm font-medium text-foreground">Vehicle</p>
              </div>
            </div>
          </div>

          {/* Mobile step labels */}
          <div className="sm:hidden mt-3 text-center">
            <p className="text-sm font-medium text-foreground">
              {currentStep === 1 && 'Journey Details'}
              {currentStep === 2 && 'Passengers & Vehicle'}
            </p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <section className="py-6 md:py-12">
        <div className="container px-4 mx-auto max-w-2xl">
          <div className="bg-card rounded-2xl md:rounded-3xl shadow-xl p-4 md:p-8 space-y-6 md:space-y-8">

            {/* Step 1: Journey Details */}
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

                <LocationInput
                  label="Pickup Location"
                  value={pickupLocation.address}
                  onSelect={(address, placeId) => setPickupLocation({ address, placeId })}
                  placeholder="e.g., Bournemouth Railway Station"
                  autoFocus
                />

                <LocationInput
                  label="Dropoff Location"
                  value={dropoffLocation.address}
                  onSelect={(address, placeId) => setDropoffLocation({ address, placeId })}
                  placeholder="e.g., Poole Harbour"
                />

                <DateTimePicker
                  selectedDate={pickupDate}
                  onChange={setPickupDate}
                />
              </div>
            )}

            {/* Step 2: Passengers & Vehicle */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-playfair text-xl md:text-2xl font-semibold text-foreground mb-2">
                    Choose your vehicle
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Select passengers, luggage, and vehicle type
                  </p>
                </div>

                <PassengerCounter
                  count={passengers}
                  onChange={setPassengers}
                />

                <LuggageCounter
                  count={luggage}
                  onChange={setLuggage}
                />

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
                  (currentStep === 2 && !canProceedFromStep2())
                }
                className="flex-1"
              >
                {currentStep === 2 ? (
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
