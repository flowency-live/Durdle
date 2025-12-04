# QUOTE WIZARD - FRONTEND IMPLEMENTATION SPEC

**Feature**: Customer Quote Request & Booking Flow
**Version**: 1.0
**Date**: December 4, 2025
**Status**: Ready for Implementation
**Developer**: Frontend Frank
**Estimated Duration**: 6-8 hours

---

## Table of Contents

1. [Overview](#overview)
2. [User Journey](#user-journey)
3. [Technical Architecture](#technical-architecture)
4. [UI/UX Design](#uiux-design)
5. [Component Structure](#component-structure)
6. [API Integration](#api-integration)
7. [Form Validation](#form-validation)
8. [Error Handling](#error-handling)
9. [Mobile Optimization](#mobile-optimization)
10. [Implementation Checklist](#implementation-checklist)

---

## Overview

### Goals

Build a mobile-first, conversion-optimized quote request wizard that:
- Collects journey details (pickup, dropoff, waypoints, date/time)
- Selects vehicle type and passenger count
- Calls backend API to generate instant quote
- Displays quote with route details
- Optionally shows route on static map after quote generation
- Guides user to booking confirmation (Phase 2)

### Success Metrics

- Form completion rate > 70%
- Quote generation time < 3 seconds
- Mobile usability score > 90
- Zero layout shift (CLS)
- Accessible (WCAG 2.1 AA)

### Out of Scope (Phase 2)

- Payment processing
- User authentication
- Booking confirmation
- Email/SMS notifications
- Quote retrieval by reference code

---

## User Journey

### Primary Flow

```
[Landing Page]
      ↓
   [Get Quote CTA]
      ↓
[Quote Wizard Page: /quote]
      ↓
[Step 1: Journey Details]
   - Pickup location (autocomplete)
   - Dropoff location (autocomplete)
   - Add waypoints (optional)
   - Pickup date & time
   - Return journey toggle
      ↓
[Step 2: Passengers & Vehicle]
   - Number of passengers
   - Vehicle type selection (cards)
   - Special requirements (textarea)
      ↓
[Step 3: Contact Details]
   - Name
   - Email
   - Phone
      ↓
[Loading: Calculating Quote]
   - Animated loading state
   - "Calculating best route..."
      ↓
[Quote Result]
   - Route summary (text + optional map)
   - Pricing breakdown
   - Vehicle details
   - Expires in 15 minutes timer
   - CTA: "Confirm Booking" (Phase 2)
```

### Alternative Flows

**Mobile-Optimized Single Page**:
- All fields visible on one long page
- Sections expand/collapse as user progresses
- Sticky "Get Quote" button at bottom
- Progressive validation as user scrolls

**Recommendation**: Start with single-page approach for MVP, easier on mobile.

---

## Technical Architecture

### Route Structure

```
app/
├── quote/
│   ├── page.tsx                 # Main quote wizard page
│   ├── components/
│   │   ├── LocationInput.tsx    # Location autocomplete
│   │   ├── DateTimePicker.tsx   # Date/time selection
│   │   ├── VehicleSelector.tsx  # Vehicle type cards
│   │   ├── WaypointManager.tsx  # Add/remove waypoints
│   │   ├── QuoteResult.tsx      # Display quote response
│   │   ├── RouteMap.tsx         # Static map display
│   │   └── LoadingState.tsx     # Quote calculation loader
│   ├── lib/
│   │   ├── api.ts               # API client functions
│   │   ├── types.ts             # TypeScript interfaces
│   │   └── validation.ts        # Form validation schemas
│   └── hooks/
│       ├── useQuoteForm.ts      # Form state management
│       └── useQuoteCalculator.ts # API call + loading states
```

### Technology Stack

- **Framework**: Next.js 14 App Router (Server Components + Client Components)
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod validation
- **State**: React useState + useReducer (no global state needed)
- **Date Picker**: react-datepicker (lightweight)
- **Maps**: Google Maps Static API (image-based, no JS SDK)
- **Autocomplete**: Google Places Autocomplete API (browser-side)

### Why These Choices?

- **React Hook Form**: Best performance for complex forms
- **Zod**: Type-safe validation that works with TypeScript
- **Static Maps**: No JS bundle bloat, just image URLs
- **Places Autocomplete**: Standard Google Maps integration

---

## UI/UX Design

### Design Principles

1. **Mobile-First**: Design for 375px width, scale up
2. **Progressive Disclosure**: Show fields as needed, hide complexity
3. **Instant Feedback**: Real-time validation, no surprises
4. **Clear Hierarchy**: Large touch targets (48px min), readable text (16px+)
5. **Trust Signals**: Lock icons, secure badges, clear pricing

### Visual Style

Match existing landing page:
- **Colors**: Ocean teal (#14b8a6), Sand golden (#f59e0b)
- **Typography**: Poppins for headings, system fonts for body
- **Spacing**: Generous padding (24px+), avoid cramped layouts
- **Shadows**: Subtle depth (shadow-lg), glassmorphism overlays
- **Animations**: Smooth transitions (300ms), loading spinners

### Layout Structure

```
┌─────────────────────────────────────────┐
│  [Header with Logo]                      │
├─────────────────────────────────────────┤
│                                          │
│  [Hero Section]                          │
│  "Get Your Instant Quote"                │
│  Subheading + benefits                   │
│                                          │
├─────────────────────────────────────────┤
│                                          │
│  [Form Card - White/Glass]               │
│                                          │
│  Journey Details                         │
│  ├─ Pickup Location [Input + Icon]      │
│  ├─ Dropoff Location [Input + Icon]     │
│  ├─ + Add Waypoint [Link]               │
│  ├─ Date [Calendar Icon]                │
│  └─ Time [Clock Icon]                   │
│                                          │
│  Passengers & Vehicle                    │
│  ├─ Passenger Count [Stepper]           │
│  └─ Vehicle Type [3 Cards]              │
│      ├─ Standard (1-4 pax)               │
│      ├─ Executive (1-4 pax)              │
│      └─ MPV (5-8 pax)                    │
│                                          │
│  Contact Details                         │
│  ├─ Name [Input]                         │
│  ├─ Email [Input]                        │
│  └─ Phone [Input]                        │
│                                          │
│  [CTA Button - Full Width]               │
│  "Get Instant Quote"                     │
│                                          │
└─────────────────────────────────────────┘
```

### Key Interactions

**Location Autocomplete**:
- Google Places API autocomplete dropdown
- UK bias (componentRestrictions: {country: 'uk'})
- Show place icon + formatted address
- Store place_id for backend validation

**Vehicle Selection**:
- 3 large cards with radio button behavior
- Icons: Car, Star (executive), Van
- Show capacity, features, price indicator
- Highlight selected with border + background

**Date/Time Picker**:
- Flatpickr or react-datepicker
- Minimum: Tomorrow (no same-day bookings for MVP)
- Time slots: 30-minute intervals, 6am-11pm
- Clear validation: "Pickup must be at least 24 hours from now"

**Waypoints**:
- "+ Add Stop" link below dropoff
- Expand to show additional location input
- Show route order: 1 → 2 → 3
- Limit: 3 waypoints max (API constraint)

---

## Component Structure

### 1. Main Page Component

**File**: `app/quote/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useQuoteCalculator } from './hooks/useQuoteCalculator';
import LocationInput from './components/LocationInput';
import DateTimePicker from './components/DateTimePicker';
import VehicleSelector from './components/VehicleSelector';
import WaypointManager from './components/WaypointManager';
import QuoteResult from './components/QuoteResult';
import LoadingState from './components/LoadingState';

export default function QuotePage() {
  const {
    formData,
    updateField,
    quote,
    loading,
    error,
    calculateQuote,
  } = useQuoteCalculator();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-card">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        {/* Logo + Back button */}
      </header>

      {/* Hero Section */}
      <section className="py-12 md:py-16">
        <div className="container px-4 mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold">
            Get Your Instant Quote
          </h1>
          <p className="text-lg text-muted-foreground mt-4">
            Professional transfers across Dorset and beyond
          </p>
        </div>
      </section>

      {/* Quote Form or Result */}
      {!quote ? (
        <section className="pb-24">
          <div className="container px-4 mx-auto max-w-2xl">
            <form onSubmit={calculateQuote} className="bg-card rounded-3xl shadow-xl p-6 md:p-8">
              {/* Form fields */}
            </form>
          </div>
        </section>
      ) : (
        <QuoteResult quote={quote} />
      )}

      {/* Loading Overlay */}
      {loading && <LoadingState />}
    </div>
  );
}
```

### 2. Location Input Component

**File**: `app/quote/components/LocationInput.tsx`

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';

interface LocationInputProps {
  label: string;
  value: string;
  onChange: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  error?: string;
}

export default function LocationInput({
  label,
  value,
  onChange,
  placeholder,
  error,
}: LocationInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    // Initialize Google Places Autocomplete
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'uk' },
      fields: ['address_components', 'formatted_address', 'place_id', 'geometry'],
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place) {
        onChange(place);
      }
    });
  }, [onChange]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          defaultValue={value}
          className={`w-full pl-12 pr-4 py-3 rounded-xl border ${
            error ? 'border-red-500' : 'border-border'
          } focus:outline-none focus:ring-2 focus:ring-ocean-light`}
        />
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
```

### 3. Vehicle Selector Component

**File**: `app/quote/components/VehicleSelector.tsx`

```typescript
'use client';

import { Car, Star, Users } from 'lucide-react';

interface VehicleSelectorProps {
  selected: 'standard' | 'executive' | 'minibus';
  onChange: (type: 'standard' | 'executive' | 'minibus') => void;
}

const vehicles = [
  {
    id: 'standard' as const,
    name: 'Standard',
    icon: Car,
    capacity: '1-4 passengers',
    features: ['Comfortable sedan', 'Air conditioning', 'Free WiFi'],
    priceIndicator: '£',
  },
  {
    id: 'executive' as const,
    name: 'Executive',
    icon: Star,
    capacity: '1-4 passengers',
    features: ['Luxury vehicle', 'Premium comfort', 'Complimentary water'],
    priceIndicator: '££',
  },
  {
    id: 'minibus' as const,
    name: 'MPV',
    icon: Users,
    capacity: '5-8 passengers',
    features: ['Spacious MPV', 'Extra luggage', 'Group travel'],
    priceIndicator: '££',
  },
];

export default function VehicleSelector({ selected, onChange }: VehicleSelectorProps) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-foreground">
        Select Vehicle Type
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {vehicles.map((vehicle) => {
          const Icon = vehicle.icon;
          const isSelected = selected === vehicle.id;

          return (
            <button
              key={vehicle.id}
              type="button"
              onClick={() => onChange(vehicle.id)}
              className={`relative p-6 rounded-2xl border-2 transition-all ${
                isSelected
                  ? 'border-ocean-light bg-ocean-light/10'
                  : 'border-border hover:border-ocean-light/50'
              }`}
            >
              {/* Radio indicator */}
              <div className="absolute top-4 right-4">
                <div className={`w-5 h-5 rounded-full border-2 ${
                  isSelected ? 'border-ocean-light bg-ocean-light' : 'border-border'
                }`}>
                  {isSelected && (
                    <div className="w-2 h-2 bg-white rounded-full m-auto mt-[5px]" />
                  )}
                </div>
              </div>

              {/* Icon */}
              <Icon className={`w-10 h-10 mb-4 ${
                isSelected ? 'text-ocean-light' : 'text-muted-foreground'
              }`} />

              {/* Details */}
              <h3 className="text-lg font-semibold text-foreground">
                {vehicle.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {vehicle.capacity}
              </p>
              <ul className="mt-4 space-y-2">
                {vehicle.features.map((feature, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="w-1 h-1 bg-ocean-light rounded-full" />
                    {feature}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm font-medium text-ocean-light">
                {vehicle.priceIndicator}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

### 4. Quote Result Component

**File**: `app/quote/components/QuoteResult.tsx`

```typescript
'use client';

import { Clock, MapPin, Car, Calendar } from 'lucide-react';
import RouteMap from './RouteMap';

interface QuoteResultProps {
  quote: {
    quoteId: string;
    journey: {
      distance: { miles: string; text: string };
      duration: { minutes: number; text: string };
    };
    pricing: {
      displayTotal: string;
      breakdown: {
        baseFare: number;
        distanceCharge: number;
        timeCharge: number;
        subtotal: number;
      };
    };
    pickupLocation: { address: string };
    dropoffLocation: { address: string };
    vehicleType: string;
    expiresAt: string;
  };
}

export default function QuoteResult({ quote }: QuoteResultProps) {
  return (
    <section className="pb-24">
      <div className="container px-4 mx-auto max-w-4xl">
        {/* Quote Card */}
        <div className="bg-card rounded-3xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-ocean-light to-sand-golden p-6 text-white">
            <h2 className="text-2xl md:text-3xl font-bold">Your Quote</h2>
            <p className="mt-2 opacity-90">Quote ID: {quote.quoteId}</p>
          </div>

          {/* Route Summary */}
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <MapPin className="w-6 h-6 text-ocean-light flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium text-foreground">{quote.pickupLocation.address}</p>
                <p className="text-sm text-muted-foreground mt-1">Pickup location</p>
              </div>
            </div>

            <div className="flex items-center gap-4 pl-10">
              <div className="h-8 w-0.5 bg-border" />
              <p className="text-sm text-muted-foreground">
                {quote.journey.distance.text} • {quote.journey.duration.text}
              </p>
            </div>

            <div className="flex items-start gap-4">
              <MapPin className="w-6 h-6 text-sand-golden flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium text-foreground">{quote.dropoffLocation.address}</p>
                <p className="text-sm text-muted-foreground mt-1">Dropoff location</p>
              </div>
            </div>
          </div>

          {/* Map */}
          <RouteMap
            origin={quote.pickupLocation.address}
            destination={quote.dropoffLocation.address}
          />

          {/* Pricing Breakdown */}
          <div className="p-6 border-t border-border">
            <h3 className="text-lg font-semibold mb-4">Price Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base fare</span>
                <span className="font-medium">£{(quote.pricing.breakdown.baseFare / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Distance charge</span>
                <span className="font-medium">£{(quote.pricing.breakdown.distanceCharge / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Time charge</span>
                <span className="font-medium">£{(quote.pricing.breakdown.timeCharge / 100).toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="text-lg font-bold text-foreground">Total</span>
                <span className="text-2xl font-bold text-ocean-light">{quote.pricing.displayTotal}</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="p-6 bg-muted/50">
            <button
              type="button"
              className="w-full py-4 bg-ocean-light text-white rounded-xl font-semibold text-lg hover:bg-ocean-light/90 transition-colors"
            >
              Confirm Booking (Coming Soon)
            </button>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Quote expires in 15 minutes
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
```

### 5. Route Map Component (Static)

**File**: `app/quote/components/RouteMap.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';

interface RouteMapProps {
  origin: string;
  destination: string;
  waypoints?: string[];
}

export default function RouteMap({ origin, destination, waypoints = [] }: RouteMapProps) {
  const [mapUrl, setMapUrl] = useState<string | null>(null);

  useEffect(() => {
    // Build Google Static Maps URL
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const size = '800x400';
    const markers = [
      `color:green|label:A|${encodeURIComponent(origin)}`,
      `color:red|label:B|${encodeURIComponent(destination)}`,
    ];

    let path = `path=color:0x14b8a6|weight:4|${encodeURIComponent(origin)}`;
    waypoints.forEach((wp) => {
      path += `|${encodeURIComponent(wp)}`;
    });
    path += `|${encodeURIComponent(destination)}`;

    const url = `https://maps.googleapis.com/maps/api/staticmap?size=${size}&markers=${markers.join('&markers=')}&${path}&key=${apiKey}`;
    setMapUrl(url);
  }, [origin, destination, waypoints]);

  if (!mapUrl) return null;

  return (
    <div className="relative w-full h-64 md:h-80 bg-muted">
      <img
        src={mapUrl}
        alt="Route map"
        className="w-full h-full object-cover"
      />
    </div>
  );
}
```

---

## API Integration

### Backend Endpoint

**URL**: `https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/v1/quotes`
**Method**: POST
**Status**: Deployed and working (Phase 1 complete)

### Request Format

```typescript
interface QuoteRequest {
  pickupLocation: {
    address: string;
    placeId?: string; // Optional for now
  };
  dropoffLocation: {
    address: string;
    placeId?: string;
  };
  waypoints?: Array<{
    address: string;
    placeId?: string;
  }>;
  pickupTime: string; // ISO 8601 format
  passengers: number; // 1-8
  vehicleType: 'standard' | 'executive' | 'minibus';
  returnJourney?: boolean;
  contactDetails?: {
    name: string;
    email: string;
    phone: string;
  };
}
```

### Response Format

```typescript
interface QuoteResponse {
  quoteId: string;
  status: 'valid' | 'expired';
  expiresAt: string;
  journey: {
    distance: {
      meters: number;
      miles: string;
      text: string;
    };
    duration: {
      seconds: number;
      minutes: number;
      text: string;
    };
    route: {
      polyline: string | null;
    };
  };
  pricing: {
    currency: 'GBP';
    breakdown: {
      baseFare: number; // pence
      distanceCharge: number;
      timeCharge: number;
      subtotal: number;
      tax: number;
      total: number;
    };
    displayTotal: string; // "£18.61"
  };
  vehicleType: string;
  pickupLocation: { address: string };
  dropoffLocation: { address: string };
  pickupTime: string;
  passengers: number;
  returnJourney: boolean;
  createdAt: string;
}
```

### API Client Function

**File**: `app/quote/lib/api.ts`

```typescript
export async function calculateQuote(request: QuoteRequest): Promise<QuoteResponse> {
  const response = await fetch(
    'https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/v1/quotes',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to calculate quote');
  }

  return response.json();
}
```

---

## Form Validation

### Validation Rules

**Pickup Location**:
- Required
- Must be valid UK address
- Cannot be same as dropoff

**Dropoff Location**:
- Required
- Must be valid UK address
- Cannot be same as pickup

**Pickup Date & Time**:
- Required
- Must be at least 24 hours from now
- Maximum 6 months in advance

**Passengers**:
- Required
- Min: 1, Max: 8
- Must match vehicle capacity

**Vehicle Type**:
- Required
- One of: standard, executive, minibus

**Contact Details** (optional for quote, required for booking):
- Name: 2-50 characters
- Email: Valid email format
- Phone: UK mobile format (07xxx or +447xxx)

### Zod Schema

**File**: `app/quote/lib/validation.ts`

```typescript
import { z } from 'zod';

export const quoteFormSchema = z.object({
  pickupLocation: z.object({
    address: z.string().min(1, 'Pickup location is required'),
    placeId: z.string().optional(),
  }),
  dropoffLocation: z.object({
    address: z.string().min(1, 'Dropoff location is required'),
    placeId: z.string().optional(),
  }),
  waypoints: z.array(
    z.object({
      address: z.string(),
      placeId: z.string().optional(),
    })
  ).max(3, 'Maximum 3 waypoints allowed').optional(),
  pickupTime: z.string().refine((date) => {
    const pickup = new Date(date);
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);
    return pickup >= tomorrow;
  }, 'Pickup must be at least 24 hours from now'),
  passengers: z.number().min(1).max(8),
  vehicleType: z.enum(['standard', 'executive', 'minibus']),
  returnJourney: z.boolean().optional(),
  contactDetails: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().regex(/^(\+44|0)7\d{9}$/, 'Invalid UK mobile number').optional(),
  }).optional(),
}).refine((data) => {
  // Ensure pickup and dropoff are different
  return data.pickupLocation.address !== data.dropoffLocation.address;
}, {
  message: 'Pickup and dropoff locations must be different',
  path: ['dropoffLocation'],
});

export type QuoteFormData = z.infer<typeof quoteFormSchema>;
```

---

## Error Handling

### Error Types

1. **Validation Errors**: Show inline below field
2. **Network Errors**: Show toast notification + retry button
3. **API Errors**: Parse error response, show specific message
4. **Rate Limiting**: Show "Too many requests, try again in X seconds"

### Error Messages

```typescript
const errorMessages = {
  INVALID_REQUEST: 'Please check your journey details and try again',
  ROUTE_NOT_FOUND: 'Unable to calculate route between these locations',
  LOCATION_INVALID: 'Please select a valid UK location',
  API_TIMEOUT: 'Request timed out. Please try again',
  NETWORK_ERROR: 'Connection error. Check your internet and try again',
  UNKNOWN_ERROR: 'Something went wrong. Please try again or contact support',
};
```

### Loading States

1. **Form Submission**: Disable button, show spinner
2. **API Call**: Full-screen overlay with animated loader
3. **Autocomplete**: Skeleton in dropdown while loading suggestions

---

## Mobile Optimization

### Touch Targets

- All interactive elements: 48px × 48px minimum
- Form inputs: 56px height (easy thumb reach)
- Buttons: 54px height, full width on mobile
- Spacing: 16px between fields (prevent mis-taps)

### Responsive Breakpoints

```css
/* Mobile-first approach */
.form-container {
  @apply w-full px-4;
}

@media (min-width: 640px) {
  .form-container {
    @apply px-6;
  }
}

@media (min-width: 768px) {
  .form-container {
    @apply max-w-2xl mx-auto;
  }
}

@media (min-width: 1024px) {
  .form-container {
    @apply max-w-4xl;
  }
}
```

### Performance Optimization

- Lazy load Google Maps scripts (only when needed)
- Debounce autocomplete queries (300ms)
- Optimistic UI updates (instant feedback)
- Prefetch quote endpoint on form mount
- Image optimization: next/image for all graphics

### Accessibility

- ARIA labels on all form inputs
- Keyboard navigation support (tab order)
- Focus indicators (2px ring)
- Error announcements (aria-live regions)
- Screen reader friendly error messages
- High contrast mode support

---

## Implementation Checklist

### Phase 1: Setup & Structure (1 hour)

- [ ] Create `/app/quote` directory structure
- [ ] Install dependencies: `react-hook-form`, `zod`, `@hookform/resolvers`, `react-datepicker`
- [ ] Set up TypeScript types in `lib/types.ts`
- [ ] Create Zod validation schema in `lib/validation.ts`
- [ ] Set up API client function in `lib/api.ts`
- [ ] Add Google Maps API key to `.env.local` (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)

### Phase 2: Components (3 hours)

- [ ] Build `LocationInput.tsx` with Places Autocomplete
- [ ] Build `DateTimePicker.tsx` with validation
- [ ] Build `VehicleSelector.tsx` with radio card behavior
- [ ] Build `WaypointManager.tsx` with add/remove functionality
- [ ] Build `PassengerCounter.tsx` with stepper UI
- [ ] Build `LoadingState.tsx` with animation
- [ ] Build `QuoteResult.tsx` with pricing breakdown

### Phase 3: Main Page Integration (2 hours)

- [ ] Build main `page.tsx` with form state management
- [ ] Integrate React Hook Form with Zod validation
- [ ] Wire up API call on form submit
- [ ] Handle loading, error, and success states
- [ ] Add form reset functionality

### Phase 4: Route Map (1 hour)

- [ ] Build `RouteMap.tsx` with Static Maps API
- [ ] Generate proper map URLs with markers and path
- [ ] Handle map loading states and errors
- [ ] Make map optional (show only after quote)

### Phase 5: Polish & Testing (1-2 hours)

- [ ] Test on real mobile devices (iPhone, Android)
- [ ] Fix any layout issues or touch target problems
- [ ] Add loading animations and transitions
- [ ] Test form validation edge cases
- [ ] Test API error scenarios
- [ ] Verify accessibility (keyboard nav, screen readers)
- [ ] Performance audit (Lighthouse score)

### Phase 6: Documentation & Handoff (30 mins)

- [ ] Update Platform Bible with quote page details
- [ ] Document API integration patterns
- [ ] Create user testing checklist
- [ ] Add TODO comments for Phase 2 features

---

## Next Steps (Phase 2)

After quote wizard is complete:

1. **Booking Confirmation Flow**: Convert quote to booking
2. **Payment Integration**: Stripe Payment Intent
3. **Quote Retrieval**: GET /v1/quotes/:quoteId endpoint
4. **Email Notifications**: Send quote confirmation
5. **User Accounts**: Optional login for booking history
6. **Admin Dashboard**: View and manage quotes/bookings

---

## Notes & Decisions

### Design Decisions

- **Single-page form**: Easier on mobile, better conversion than multi-step
- **Static map**: Avoid 300KB+ Google Maps JS bundle
- **Inline validation**: Better UX than submit-time errors
- **No quote saving**: 15-minute expiry, no local storage needed for MVP

### Technical Debt (to address later)

- Autocomplete API calls not debounced (can add if quota issues)
- No offline support (requires service worker)
- No form persistence (browser refresh loses data)
- No A/B testing framework (can add PostHog later)

### Open Questions

1. **Return journey UX**: Separate form or duplicate fields?
2. **Waypoints**: Show map preview as waypoints are added?
3. **Vehicle selection**: Show estimated price before calculation?
4. **Contact details**: Collect during quote or only at booking?

**Recommendation**: Start with simplest approach, iterate based on user feedback.

---

**Ready for implementation!** Start with Phase 1 (setup) and work through checklist sequentially.
