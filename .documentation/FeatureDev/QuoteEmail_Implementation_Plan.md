# QUOTE-003: Email Quote to Customer - Implementation Plan

**Feature ID**: QUOTE-003
**Priority**: High
**Category**: Fullstack (Frontend + Backend)
**Created**: December 8, 2025
**Status**: Approved - Ready for Development

---

## Executive Summary

Enable customers to save, share, and retrieve quotes via email with magic link access. Includes branded share modal, quote retrieval system, and abandoned booking tracking for analytics.

---

## CEO Design Decisions (Q&A Results)

| Question | Decision |
|----------|----------|
| Share UI | Custom branded modal (NOT just navigator.share) |
| Magic Link | Yes - unique URL that retrieves quote without login |
| Abandoned Booking | Track for REPORTING ONLY - NO reminder emails |
| Price on Retrieval (>48h) | Regenerate quote, show NEW price only + "refreshed" message |
| Marketing Consent | Optional checkbox - store email only if checked |
| Branding | Dorset Transfer Company logo, colors, footer |
| Edit Quote | NO - Customer creates new quote instead (simpler UX) |

**Critical GDPR Note**: User explicitly stated abandoned cart emails are against GDPR and personally dislikes them. System will track abandonment for internal reporting only - NEVER send reminder emails.

---

## User Stories

### US-1: Share Quote via Modal
**As a** customer who received a quote
**I want to** share it via email, WhatsApp, or copy link
**So that** I can save it or send it to others for approval

### US-2: Retrieve Quote via Magic Link
**As a** customer who received a quote link
**I want to** click it and see my quote details
**So that** I can continue with booking without re-entering details

### US-3: Abandoned Quote Tracking
**As an** admin
**I want to** see which quotes were abandoned vs converted
**So that** I can understand conversion rates and pricing effectiveness

---

## Feature Components

### 1. Quote Result Page - Share Button

**Location**: Quote result page (after price displayed)

**UI Elements**:
```
[Get Quote] button clicked → Quote result shows price

Below the price:
┌─────────────────────────────────────────────┐
│  Your Quote: £127.50                        │
│  Valid for 48 hours                         │
│                                             │
│  [Book Now]  [Save & Share]                 │
└─────────────────────────────────────────────┘
```

### 2. Custom Branded Share Modal

**Triggered by**: "Save & Share" button click

```
┌─────────────────────────────────────────────────────────┐
│  [Dorset Transfer Company Logo]                    [X]  │
│                                                         │
│  Save Your Quote                                        │
│  ─────────────────                                      │
│                                                         │
│  Quote Reference: DTC-2025-ABC123                       │
│  Route: Bournemouth → Heathrow Airport                  │
│  Price: £127.50 (valid 48 hours)                        │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Email address                                   │    │
│  │ [your@email.com                              ]  │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  [ ] Send me offers and updates (optional)              │
│                                                         │
│  [Send to My Email]                                     │
│                                                         │
│  ─── or share via ───                                   │
│                                                         │
│  [WhatsApp]  [Copy Link]  [Share...]                    │
│                                                         │
│  ───────────────────────────────────────────────────    │
│  Questions? Call 01onal-number                          │
│  www.dorsettransfers.co.uk                              │
└─────────────────────────────────────────────────────────┘
```

**Share Options**:
- **Send to My Email**: Sends branded HTML email with magic link
- **WhatsApp**: Opens WhatsApp with pre-filled message + link
- **Copy Link**: Copies magic link to clipboard with toast confirmation
- **Share...**: Native share sheet (navigator.share fallback)

### 3. Magic Link System

**Link Format**: `https://dorsettransfers.co.uk/quote/{quoteId}?token={magicToken}`

**Token Properties**:
- 64-character random string (crypto.randomUUID + additional entropy)
- Stored in DynamoDB with quote
- No expiry on token itself (quote validity handles expiry)

**Security**:
- Token is single-use for booking (invalidated after payment)
- Token allows viewing quote unlimited times
- No PII in URL

### 4. Quote Retrieval Page

**Route**: `/quote/[quoteId]`

**Scenario A: Valid Quote (<48 hours old)**
```
┌─────────────────────────────────────────────────────────┐
│  [Dorset Transfer Company Logo]                         │
│                                                         │
│  Your Saved Quote                                       │
│  ─────────────────                                      │
│                                                         │
│  Reference: DTC-2025-ABC123                             │
│                                                         │
│  From: 123 High Street, Bournemouth                     │
│  To: Heathrow Airport Terminal 5                        │
│  Date: 15 January 2025, 09:00                          │
│  Passengers: 2                                          │
│  Vehicle: Executive Saloon                              │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │             Total: £127.50                      │    │
│  │       Quote valid until: 10 Dec 2025, 14:30     │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  [Continue to Booking]                                  │
│                                                         │
│  Need to change details? [Get a new quote]              │
└─────────────────────────────────────────────────────────┘
```

**Scenario B: Expired Quote (>48 hours old)**
```
┌─────────────────────────────────────────────────────────┐
│  [Dorset Transfer Company Logo]                         │
│                                                         │
│  Quote Refreshed                                        │
│  ───────────────                                        │
│                                                         │
│  ⓘ Your original quote has expired. We've              │
│    recalculated the price for the same journey.         │
│                                                         │
│  Reference: DTC-2025-ABC123 (refreshed)                 │
│                                                         │
│  From: 123 High Street, Bournemouth                     │
│  To: Heathrow Airport Terminal 5                        │
│  Date: 15 January 2025, 09:00                          │
│  Passengers: 2                                          │
│  Vehicle: Executive Saloon                              │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │             Total: £135.00                      │    │
│  │       Quote valid until: 10 Dec 2025, 14:30     │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  [Continue to Booking]                                  │
│                                                         │
│  Need to change details? [Get a new quote]              │
└─────────────────────────────────────────────────────────┘
```

**Note**: No "previous price was X" comparison shown - just the new price with explanation message.

### 5. Email Template (AWS SES)

**Subject**: Your Dorset Transfer Quote - Reference {quoteRef}

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Branded styles - Dorset Transfer Company colors */
  </style>
</head>
<body>
  <div class="header">
    <img src="logo.png" alt="Dorset Transfer Company" />
  </div>

  <div class="content">
    <h1>Your Quote is Ready</h1>

    <div class="quote-summary">
      <p><strong>Reference:</strong> DTC-2025-ABC123</p>
      <p><strong>Route:</strong> Bournemouth → Heathrow Airport</p>
      <p><strong>Date:</strong> 15 January 2025 at 09:00</p>
      <p><strong>Price:</strong> £127.50</p>
      <p><strong>Valid until:</strong> 10 December 2025, 14:30</p>
    </div>

    <a href="{magicLink}" class="cta-button">View Quote & Book</a>

    <p class="note">
      This quote is valid for 48 hours. After that, we'll
      recalculate the price based on current rates.
    </p>
  </div>

  <div class="footer">
    <p>Dorset Transfer Company</p>
    <p>Phone: 01onal-number</p>
    <p>Email: bookings@dorsettransfers.co.uk</p>
    <p>www.dorsettransfers.co.uk</p>
  </div>
</body>
</html>
```

### 6. Abandoned Quote Tracking (Reporting Only)

**IMPORTANT**: NO automated emails. Internal analytics only.

**Tracking Events**:
```typescript
enum QuoteEvent {
  CREATED = 'created',           // Quote generated
  SHARED = 'shared',             // Share modal opened
  EMAIL_SENT = 'email_sent',     // Email with magic link sent
  LINK_COPIED = 'link_copied',   // Magic link copied
  RETRIEVED = 'retrieved',       // Quote viewed via magic link
  BOOKING_STARTED = 'booking_started',  // Clicked "Continue to Booking"
  BOOKING_COMPLETED = 'booking_completed', // Payment successful
  EXPIRED = 'expired'            // 48h passed without booking
}
```

**Admin Dashboard View**:
```
Quote Funnel (Last 30 Days)
───────────────────────────
Quotes Generated:     542
Quotes Shared:        234  (43%)
Quotes Retrieved:     156  (29%)
Bookings Started:      89  (16%)
Bookings Completed:    67  (12%)

Abandoned at Quote:   475  (88%)
Abandoned at Booking:  22  (4%)
```

---

## Technical Implementation

### Backend Components

#### 1. DynamoDB Schema Updates

**Table**: `durdle-quotes-dev`

**Additional Attributes**:
```typescript
interface QuoteRecord {
  // Existing fields...
  quoteId: string;
  tenantId: string;
  route: RouteDetails;
  price: number;
  createdAt: string;
  expiresAt: string;

  // NEW fields for QUOTE-003
  magicToken: string;           // 64-char random token
  customerEmail?: string;       // Only if provided
  marketingConsent?: boolean;   // Only if checkbox checked
  status: 'active' | 'expired' | 'converted';
  events: QuoteEvent[];         // Tracking events array
}

interface QuoteEvent {
  type: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
```

#### 2. New API Endpoints

**POST /api/quotes/{quoteId}/share**
```typescript
// Request
{
  email?: string;              // Optional - only if sending email
  marketingConsent?: boolean;  // Only matters if email provided
  shareMethod: 'email' | 'link' | 'whatsapp';
}

// Response
{
  success: true;
  magicLink: string;
  quoteRef: string;
}
```

**GET /api/quotes/{quoteId}?token={magicToken}**
```typescript
// Response (valid quote)
{
  quote: {
    quoteRef: string;
    route: RouteDetails;
    price: number;
    validUntil: string;
    isRefreshed: false;
  }
}

// Response (expired quote - auto-regenerated)
{
  quote: {
    quoteRef: string;
    route: RouteDetails;
    price: number;           // NEW price
    validUntil: string;      // NEW expiry
    isRefreshed: true;       // Flag for UI message
  }
}
```

#### 3. Lambda Functions

**Modify**: `quotes-manager`
- Add `shareQuote` handler
- Add `getQuoteByToken` handler
- Add quote regeneration logic for expired quotes
- Add event tracking to existing quote operations

**New**: `email-sender` (or add to existing Lambda)
- AWS SES integration
- HTML email template rendering
- Rate limiting (prevent spam)

### Frontend Components

#### 1. Share Modal Component

**File**: `components/quotes/ShareQuoteModal.tsx`

```typescript
interface ShareQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: {
    quoteId: string;
    quoteRef: string;
    route: RouteDetails;
    price: number;
    validUntil: string;
  };
}
```

**Features**:
- Email input with validation
- Marketing consent checkbox (unchecked by default)
- Share via WhatsApp (deep link)
- Copy link with toast notification
- Native share fallback

#### 2. Quote Retrieval Page

**File**: `app/quote/[quoteId]/page.tsx`

**Features**:
- Fetch quote by ID + token from URL
- Handle valid vs expired (refreshed) quotes
- Display appropriate messaging
- "Continue to Booking" flow
- "Get a new quote" link

#### 3. Email Input with Consent

**Pattern**:
```tsx
<div className="email-section">
  <Input
    type="email"
    placeholder="your@email.com"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />

  <label className="consent-checkbox">
    <input
      type="checkbox"
      checked={marketingConsent}
      onChange={(e) => setMarketingConsent(e.target.checked)}
    />
    <span>Send me offers and updates (optional)</span>
  </label>
</div>
```

---

## AWS SES Setup

### Prerequisites
1. Verify sender domain in SES (dorsettransfers.co.uk)
2. Move out of SES sandbox (if not already)
3. Create email template in SES

### Email Template
```json
{
  "TemplateName": "QuoteEmail",
  "SubjectPart": "Your Dorset Transfer Quote - Reference {{quoteRef}}",
  "HtmlPart": "<!-- HTML from section 5 above -->",
  "TextPart": "Your quote reference: {{quoteRef}}\n\nRoute: {{pickupAddress}} to {{dropoffAddress}}\nDate: {{journeyDate}}\nPrice: £{{price}}\n\nView your quote: {{magicLink}}\n\nThis quote is valid for 48 hours."
}
```

---

## Data Privacy & GDPR

### Email Storage Rules
- **Without consent checkbox**: Email NOT stored (used only to send single email)
- **With consent checkbox**: Email stored in `durdle-customers-dev` table with `marketingConsent: true`

### Quote Data Retention
- Active quotes: Retained until converted or 90 days
- Converted quotes: Retained 7 years (tax records)
- Abandoned quotes: Anonymized after 90 days

### No Abandoned Cart Emails
**CRITICAL**: The system will NEVER send reminder emails for abandoned quotes. This was explicitly requested by CEO as both a GDPR concern and personal preference.

Tracking is for internal reporting only:
- Conversion funnel metrics
- Pricing effectiveness analysis
- No customer-facing automation

---

## Testing Scenarios

### Happy Path
1. Customer gets quote
2. Clicks "Save & Share"
3. Enters email, clicks "Send to My Email"
4. Receives email with magic link
5. Clicks link, sees quote
6. Clicks "Continue to Booking"
7. Completes payment

### Expired Quote Path
1. Customer gets quote
2. Shares via WhatsApp
3. Recipient clicks link 3 days later
4. System regenerates quote with current pricing
5. UI shows "Quote Refreshed" message with new price
6. Recipient can book at new price

### Analytics Path
1. Admin opens dashboard
2. Sees quote funnel metrics
3. Identifies drop-off points
4. No ability to email abandoned customers (by design)

---

## Implementation Order

### Phase 1: Backend (3-4 days)
1. Add magic token generation to quotes-manager
2. Add quote retrieval endpoint with token validation
3. Add quote regeneration for expired quotes
4. Add event tracking to DynamoDB
5. Set up AWS SES template

### Phase 2: Frontend (3-4 days)
1. Create ShareQuoteModal component
2. Add "Save & Share" button to quote result
3. Create quote retrieval page `/quote/[quoteId]`
4. Handle refreshed quote UI state
5. Add copy-to-clipboard with toast

### Phase 3: Email (2 days)
1. Create email-sender Lambda (or add to existing)
2. HTML email template with branding
3. Test email delivery

### Phase 4: Analytics (2 days)
1. Add events to quote funnel
2. Create admin dashboard view
3. Export capability for reporting

---

## Dependencies

- AWS SES verified domain
- Dorset Transfer Company logo (high-res PNG)
- Brand color codes
- Contact information for email footer

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Share modal open rate | >20% of quotes |
| Email send success rate | >99% |
| Magic link click rate | >50% of emails |
| Conversion from retrieved quotes | >30% |

---

## Out of Scope

- Edit quote functionality (customer creates new quote instead)
- Abandoned cart reminder emails (explicitly excluded)
- SMS quote delivery (future consideration)
- Multi-recipient sharing (one email at a time)

---

**Document Status**: Approved - Ready for Development
**Approved By**: CEO (via Q&A session)
**Last Updated**: December 8, 2025
