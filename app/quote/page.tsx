'use client';

import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, Suspense } from 'react';

import { Button } from '@/components/ui/button';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/config/api';

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
  const [returnToPickup, setReturnToPickup] = useState(true); // For hourly mode: return to pickup location

  // Handle journey type change with mode switching logic
  const handleJourneyTypeChange = (newType: JourneyType) => {
    // When switching to hourly mode, default to "return to pickup"
    if (newType === 'hourly') {
      setReturnToPickup(true);
    }
    setJourneyType(newType);
  };

  // Transport details (airport/train station)
  const [flightNumber, setFlightNumber] = useState('');
  const [trainNumber, setTrainNumber] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

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
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Validation for Step 1
  const canProceedFromStep1 = () => {
    // For hourly: pickup, start time, end time, and minimum 5 hours required
    // If not returning to pickup, also require dropoff
    if (journeyType === 'hourly') {
      const baseValid = pickupLocation?.address.trim() !== '' &&
        pickupDate !== null &&
        endTime !== null &&
        duration >= 5;

      // If returning to pickup, no dropoff needed
      if (returnToPickup) {
        return baseValid;
      }
      // If custom dropoff, require dropoff location
      return baseValid && dropoffLocation?.address.trim() !== '';
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
    // For hourly mode with custom dropoff, validate dropoff exists
    if (isHourly && !returnToPickup && !dropoffLocation) return;

    setLoadingQuotes(true);
    setError(null);

    try {
      // Filter out empty waypoints
      const filteredWaypoints: Waypoint[] = waypoints.filter(w => {
        const hasValidAddress = w.address && w.address.trim().length > 0;
        const hasValidPlaceId = w.placeId && w.placeId.trim().length > 0;
        return hasValidAddress && hasValidPlaceId;
      });

      // Map frontend journey type to backend API values
      // Frontend: 'one-way' | 'round-trip' | 'hourly'
      // Backend: 'one-way' | 'by-the-hour'
      const apiJourneyType = isHourly ? 'by-the-hour' : 'one-way';

      // Determine dropoff location for API:
      // - For hourly with "return to pickup": don't send dropoff (backend uses pickup as return point)
      // - For hourly with custom dropoff: send the custom dropoff
      // - For transfer modes: send the dropoff
      let apiDropoff: Location | undefined;
      if (isHourly) {
        apiDropoff = returnToPickup ? undefined : dropoffLocation!;
      } else {
        apiDropoff = dropoffLocation!;
      }

      // Use compareMode API to get all vehicle prices in one call
      const response = await calculateMultiVehicleQuote({
        pickupLocation,
        dropoffLocation: apiDropoff,
        waypoints: filteredWaypoints.length > 0 ? filteredWaypoints : undefined,
        pickupTime: pickupDate.toISOString(),
        passengers,
        luggage,
        journeyType: apiJourneyType,
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
      // Include vehicle details for display in QuoteResult
      vehicleDetails: {
        name: vehiclePricing.name,
        description: vehiclePricing.description,
        imageUrl: vehiclePricing.imageUrl,
        capacity: vehiclePricing.capacity,
        features: vehiclePricing.features,
      },
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
    setReturnToPickup(true);
    setFlightNumber('');
    setTrainNumber('');
    setSpecialRequests('');
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

  const handlePaymentSubmit = async (details: PaymentDetails) => {
    setPaymentDetails(details);
    setBookingLoading(true);
    setBookingError(null);

    try {
      if (!quote || !contactDetails) {
        throw new Error('Missing quote or contact details');
      }

      // Create booking via API
      const bookingData = {
        // quoteId is optional - may not exist if quote wasn't saved
        ...(quote.quoteId && { quoteId: quote.quoteId }),
        customerName: contactDetails.name,
        customerEmail: contactDetails.email,
        customerPhone: contactDetails.phone,
        pickupLocation: quote.pickupLocation,
        dropoffLocation: quote.dropoffLocation,
        waypoints: quote.waypoints,
        pickupTime: quote.pickupTime,
        passengers: quote.passengers,
        luggage: quote.luggage,
        vehicleType: quote.vehicleType,
        pricing: quote.pricing,
        journey: quote.journey,
        returnJourney: quote.returnJourney,
        paymentMethod: 'card',
        paymentStatus: 'pending', // Will be updated after Stripe integration
        specialRequests: '', // TODO: Add to ContactDetailsForm
      };

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.bookings}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create booking');
      }

      const data = await response.json();
      setBookingId(data.booking.bookingId);
      setBookingStage('confirmation');
    } catch (err) {
      console.error('Booking error:', err);
      setBookingError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setBookingLoading(false);
    }
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
      <div className="min-h-screen bg-background py-8">
        <div className="container px-4 mx-auto max-w-md">
          {bookingError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <p className="font-medium">Booking Error</p>
              <p className="text-sm mt-1">{bookingError}</p>
            </div>
          )}
          {bookingLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-dark mx-auto mb-4"></div>
              <p className="text-muted-foreground">Creating your booking...</p>
            </div>
          ) : (
            <PaymentForm
              onSubmit={handlePaymentSubmit}
              onBack={handlePaymentBack}
              initialValues={paymentDetails || undefined}
            />
          )}
        </div>
      </div>
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

  // Render quote result - wrapped in same layout with header
  if (quote) {
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

        <QuoteResult
          quote={quote}
          onNewQuote={handleNewQuote}
          onConfirmBooking={handleConfirmBooking}
        />
      </div>
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
              returnToPickup={returnToPickup}
              onPickupChange={setPickupLocation}
              onDropoffChange={setDropoffLocation}
              onWaypointsChange={setWaypoints}
              onDateChange={setPickupDate}
              onReturnDateChange={setReturnDate}
              onEndTimeChange={setEndTime}
              onPassengersChange={setPassengers}
              onLuggageChange={setLuggage}
              onJourneyTypeChange={handleJourneyTypeChange}
              onDurationChange={setDuration}
              onExtrasChange={setExtras}
              onFlightNumberChange={setFlightNumber}
              onTrainNumberChange={setTrainNumber}
              onReturnToPickupChange={setReturnToPickup}
              specialRequests={specialRequests}
              onSpecialRequestsChange={setSpecialRequests}
            />
          )}

          {/* Step 2: Vehicle Selection */}
          {currentStep === 2 && multiQuote && (
            <VehicleComparisonGrid
              multiQuote={multiQuote}
              passengers={passengers}
              journeyType={journeyType}
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
