# Payment Processing & UK Compliance - COO Action Plan

**Document Owner:** Crispin (COO - Durdle Platform)
**Client:** Dorset Transfer Company
**Date Created:** December 5, 2025
**Status:** For Client Review & Collaboration
**Priority:** HIGH - Must address before payment processing launch

---

## Executive Summary

This document outlines the legal, compliance, and operational requirements for implementing payment processing on the Durdle platform. While Stripe integration handles most technical payment security (PCI DSS, SCA), there are critical UK-specific legal requirements that Dorset Transfer Company must address before launching online bookings with payment processing.

**Key Takeaway:** You CAN integrate with Stripe, but you MUST also address UK transport licensing, consumer rights, VAT, and business compliance requirements.

---

## Table of Contents

1. [Payment Processing - What Stripe Covers](#payment-processing---what-stripe-covers-the-easy-part)
2. [UK-Specific Legal Requirements](#uk-specific-legal-requirements-the-less-easy-part)
3. [Implementation Checklist](#implementation-checklist)
4. [Cost Analysis](#costs-beyond-stripe-fees)
5. [COO Recommendations](#coo-recommendations)
6. [Next Steps](#next-steps)

---

## Payment Processing - What Stripe Covers (The Easy Part)

### ✅ You CAN "just integrate with Stripe" for:

#### 1. PCI DSS Compliance
Your technical documentation correctly identifies **SAQ A** (simplest tier).

**What This Means:**
- Stripe handles all card data
- You never touch raw card numbers
- Annual self-assessment questionnaire required
- Your architecture (Stripe Elements in iframe) is correct

**Status:** ✅ Your planned approach is compliant

---

#### 2. Strong Customer Authentication (SCA)
UK/EU requirement since September 2021.

**What Stripe Provides:**
- Stripe automatically handles 3D Secure 2 (3DS2)
- Payment Intents API includes SCA compliance
- No additional work needed from you
- Customers see authentication challenge when required by their bank

**Status:** ✅ Automatic compliance via Stripe

---

#### 3. Payment Security

**Covered by Stripe:**
- Webhook signature verification (already in your checklist)
- TLS 1.2+ encryption (already enforced via AWS)
- Fraud detection via Stripe Radar (included)
- Tokenization of card data

**Status:** ✅ Technical security handled by Stripe + AWS

---

## UK-Specific Legal Requirements (The Less Easy Part)

### ⚠️ What You CANNOT Ignore

---

### 1. Payment Services Regulations 2017 (PSRs 2017)

**Your Risk Level:** 🟢 **LOW** (if using Stripe correctly)

#### Key Question
**Are you holding customer money, or is Stripe?**

#### ✅ Safe Approach: Payment on Booking Confirmation (Immediate Charge)
- Stripe processes payment
- Money goes directly to your business account
- No "holding period" = No PSR licensing required
- Customer pays → Service confirmed → Money in your account

#### ❌ Risky Approach (AVOID without legal advice)
- Taking payment upfront for future service (>7 days out)
- Holding deposits that can be refunded to a "wallet"
- Operating a "credit" or "wallet" system
- Acting as a payment intermediary between customer and drivers

#### 🎯 Recommendation
**Charge customers at time of booking confirmation, NOT weeks in advance.** This keeps you outside PSR licensing requirements.

**Implementation:**
- Customer completes booking → Immediate payment via Stripe → Service confirmed
- For advance bookings, charge at booking time (not service time)
- No holding accounts, no intermediary payment flows

---

### 2. Consumer Rights Act 2015 & Distance Selling Regulations

**Your Risk Level:** 🟡 **MEDIUM** (must implement)

#### 14-Day Cooling Off Period
**Applies to online bookings with an important exception:**

- ✅ **EXCEPTION:** Services with specific performance date (transport bookings)
- You must clearly state cancellation policy BEFORE payment
- Must honor cancellation requests according to your stated policy
- Standard practice: 48-hour cancellation window before journey

#### Required Disclosures (Must Display Pre-Booking)

**Before customer pays, you MUST show:**

| Required Information | Implementation |
|---------------------|----------------|
| Total price (including VAT) | Display on quote page + booking confirmation |
| Cancellation policy | Linked from booking page, checkbox required |
| Service description | Vehicle type, journey details, estimated time |
| Business identity | Company name, address, contact details (footer) |
| Payment provider | "Payments processed by Stripe" on payment page |

#### Action Items - Phase 2.5

**Legal Pages:**
- [ ] **Add Terms & Conditions page** covering:
  - Cancellation rights and deadlines
  - Refund policy (full/partial/none based on timing)
  - Service level agreement (on-time guarantee, etc.)
  - Dispute resolution process
  - PHV operator license number

- [ ] **Display T&Cs checkbox before payment**
  - Must be unchecked by default (pre-ticked boxes are illegal)
  - Link to full T&Cs (must be easily accessible)
  - Cannot proceed to payment without checking

- [ ] **Email booking confirmation within 24 hours**
  - Include T&Cs as attachment or link
  - Must include cancellation instructions
  - Store proof of delivery (for disputes)

---

### 3. Private Hire Vehicle (PHV) Licensing

**Your Risk Level:** 🔴 **HIGH** (business-critical)

#### ⚠️ THIS IS MORE IMPORTANT THAN PAYMENT PROCESSING COMPLIANCE

#### Legal Requirements

**Operator's License:**
- Dorset Transfer Company MUST hold a valid **PHV Operator License** from local authority (Dorset Council or Bournemouth, Christchurch & Poole Council)
- License must explicitly cover "online booking services" or "app-based bookings"
- License number must appear on all booking confirmations and receipts

**Driver & Vehicle Licensing:**
- All drivers must hold valid PHV driver license
- All vehicles must hold valid PHV vehicle license
- Cannot dispatch unlicensed driver/vehicle to any booking

**Public Liability Insurance:**
- Required by law (minimum £10M coverage)
- Must cover "hired services" and "online bookings"
- Some policies exclude app-based bookings - VERIFY THIS

#### Payment Processing Implications

**Council Requirements:**
- Some councils require operators to issue receipts with license number
- You must store driver/vehicle license numbers in database
- May need to provide transaction records to licensing authority upon request
- Failure to comply = license revocation + criminal prosecution

#### Action Items - URGENT (Before Any Launch)

**Business Verification:**
- [ ] **Verify Dorset Transfer Company holds valid PHV Operator License**
  - Obtain copy of license
  - Check expiry date
  - Confirm license covers online/app-based bookings
  - Add renewal reminder to calendar (90 days before expiry)

- [ ] **Obtain operator license number for display**
  - Add to website footer
  - Add to booking confirmations
  - Add to email receipts

- [ ] **Database schema additions** (durdle-main-table-dev):
  ```
  Booking record:
  - operatorLicenseNumber: string (e.g., "DTC-PHV-12345")
  - driverLicenseNumber: string (assigned driver)
  - vehicleLicenseNumber: string (assigned vehicle)
  - driverLicenseExpiry: string (ISO 8601)
  - vehicleLicenseExpiry: string (ISO 8601)
  ```

- [ ] **Compliance tracking system** (Phase 3):
  - Alert dispatcher if driver/vehicle license expiring <30 days
  - Block assignment of expired licenses
  - Monthly compliance report for licensing authority

**Insurance Verification:**
- [ ] **Ensure insurance covers online bookings**
  - Contact insurance provider
  - Request written confirmation that online/app bookings are covered
  - Some policies exclude "Uber-like" services - clarify this
  - Obtain updated certificate if needed

- [ ] **Verify coverage limits:**
  - Public Liability: Minimum £10M (legal requirement)
  - Employer's Liability: Minimum £5M (if employing drivers)
  - Professional Indemnity: Recommended £1M (for booking errors)

---

### 4. VAT Considerations

**Your Risk Level:** 🟡 **MEDIUM** (affects pricing)

#### VAT Registration Status

**Threshold:** £85,000 annual turnover (2024/25 tax year)

**Questions for Dorset Transfer Company:**
1. Is the company currently VAT registered?
2. What is the current annual turnover?
3. Projected turnover with online bookings?

#### VAT on Private Hire Transport

**Rate:** Standard rate (20%) applies to all private hire journeys

**Legal Requirement:**
- If VAT registered, MUST charge VAT on all bookings
- MUST display prices inclusive of VAT to consumers (B2C)
- Can show price breakdown: "£100.00 (includes £16.67 VAT)"

#### Stripe Integration - Important Notes

**What Stripe DOES NOT Do:**
- Stripe does NOT calculate VAT automatically
- Stripe does NOT file VAT returns
- Stripe does NOT provide MTD (Making Tax Digital) submissions

**What YOU Must Do:**
- Calculate VAT in your quote logic
- Add VAT to Stripe Payment Intent
- Store VAT breakdown in database
- Provide VAT data to accountant for filing

#### Action Items - Before Phase 2.5 Launch

**Immediate:**
- [ ] **Determine if Dorset Transfer Company is VAT registered**
  - If yes, obtain VAT registration number
  - If no, assess if close to £85k threshold
  - If approaching threshold, register proactively (can take 4-6 weeks)

**If VAT Registered:**
- [ ] **Add VAT calculation to quote logic**
  - Calculate quote price (excluding VAT)
  - Add 20% VAT
  - Total = quote price × 1.20
  - Example: £100 quote → £120 total (£100 + £20 VAT)

- [ ] **Update database schema** (durdle-main-table-dev):
  ```
  Quote/Booking record:
  - priceExcludingVat: number (pence)
  - vatRate: number (0.20 for standard rate)
  - vatAmount: number (pence, calculated)
  - totalIncludingVat: number (pence, = price + vatAmount)
  - vatRegistrationNumber: string (company VAT number)
  ```

- [ ] **Update frontend display:**
  - Show total price prominently
  - Show VAT breakdown in smaller text: "(includes £20.00 VAT)"
  - Invoice/receipt must show VAT breakdown clearly

- [ ] **Set up accounting integration** (Phase 3):
  - QuickBooks or Xero integration
  - Automatic VAT calculation for MTD compliance
  - Quarterly VAT return automation

**If NOT VAT Registered:**
- [ ] **Monitor turnover threshold**
  - Set alert at £70k turnover (buffer before £85k threshold)
  - Register immediately if threshold crossed
  - Retrospective VAT can be applied (risky)

---

### 5. Data Protection (GDPR) - Payment Data Specific

**Your Risk Level:** 🟢 **LOW** (mostly covered)

Your [SecurityCompliance.md](../SecurityCompliance.md) already covers general GDPR, but add these payment-specific considerations:

#### Payment Data Retention - What's Safe to Store

**✅ SAFE (Store Indefinitely):**
- Stripe Customer IDs (e.g., `cus_ABC123`)
- Stripe Payment Intent IDs (e.g., `pi_XYZ789`)
- Last 4 digits of card number (for customer reference: `**** 1234`)
- Card brand (Visa, Mastercard, Amex)
- Payment status (succeeded, failed, refunded)

**❌ NEVER STORE:**
- Full card numbers (16 digits)
- CVV/CVC security codes
- Card expiry dates (Stripe stores this, not you)
- 3D Secure authentication data

#### Right to Erasure - Financial Records Exception

**Special Rule:**
- Financial records MUST be kept **7 years** (UK tax law, Companies Act 2006)
- Overrides GDPR "right to be forgotten"
- Can anonymize customer data while keeping payment records

**Implementation:**
```
Customer requests deletion:
1. Anonymize personal data (name, email, phone)
2. Keep financial records (quoteId, amount, date, VAT)
3. Update customer record: name = "Deleted User [timestamp]"
4. Document deletion in audit log
5. Confirm deletion to customer (within 30 days)
```

#### Action Items - Phase 2.5

**Privacy Policy Updates:**
- [ ] **Add payment data section to Privacy Policy:**
  - What payment data we collect (last 4 digits, payment status)
  - How long we keep it (7 years for financial records)
  - Who we share it with (Stripe, accountant, HMRC if requested)
  - Right to erasure exception for financial records

- [ ] **Update data retention schedule:**
  - Payment records: 7 years (legal requirement)
  - Customer personal data: 3 years from last booking (your choice)
  - Anonymization after 3 years (keep financial data, delete PII)

---

### 6. Financial Conduct Authority (FCA) Regulations

**Your Risk Level:** 🟢 **VERY LOW** (exemption applies)

#### Consumer Credit License

**NOT Required if:**
- ✅ Payments taken immediately (not credit/installments)
- ✅ No "buy now, pay later" option
- ✅ No customer lending or credit facilities

**Status:** You are exempt - immediate payment model

#### E-Money License

**NOT Required:**
- Stripe holds the e-money license
- You are not holding customer funds
- You are not issuing e-money or digital wallets

**Status:** You are exempt - Stripe handles this

#### ⚠️ Red Flag to Avoid

**DO NOT implement these without FCA consultation:**
- Installment payments ("Pay in 3 installments")
- "Book now, pay later" schemes
- Customer credit accounts or wallets
- Subscription models with automatic renewals (different rules)

**Why:** These trigger Consumer Credit Act 1974 and require FCA authorization (£10k+ cost, 12-month application process)

---

## Implementation Checklist

### Phase 2.5 (Before "Get Quote" Goes Live)

#### 🔷 Stripe Integration Basics

**Technical Setup:**
- [ ] **Create Stripe account (UK entity)**
  - Sign up at stripe.com/gb
  - Complete business verification (2-3 days)
  - Add business bank account for payouts
  - Set payout schedule (daily recommended for cash flow)

- [ ] **Enable Payment Intents API**
  - This includes SCA (Strong Customer Authentication) automatically
  - Use Stripe API version 2023-10-16 or later
  - Test mode keys for development

- [ ] **Set up webhook endpoint for payment confirmation**
  - Endpoint: `https://api.durdle.co.uk/webhooks/stripe`
  - Events to subscribe:
    - `payment_intent.succeeded`
    - `payment_intent.payment_failed`
    - `charge.refunded`
    - `charge.dispute.created`
  - MUST verify webhook signatures (security requirement)

- [ ] **Test 3D Secure flow in test mode**
  - Use Stripe test cards: `4000002500003155` (3DS required)
  - Verify authentication challenge appears
  - Test successful and failed authentication
  - Test on mobile (different UX)

---

#### 🔷 Legal Pages

**Required Pages (Must Be Live Before Payment Launch):**

- [ ] **Terms & Conditions**
  - Cancellation rights and deadlines
  - Refund policy (timeline-based)
  - Service level commitments
  - Liability limitations
  - Dispute resolution process
  - Force majeure clause (weather, breakdowns)
  - PHV operator license number
  - Governing law (England & Wales)
  - Last updated date

- [ ] **Privacy Policy** (update existing)
  - Add payment data section:
    - What we collect (last 4 digits, payment status)
    - How we use it (booking confirmation, accounting, fraud prevention)
    - Who we share with (Stripe, accountant, HMRC upon request)
    - How long we keep it (7 years for financial records)
    - Your rights (access, rectification, erasure with exceptions)

- [ ] **Cookie Policy**
  - Stripe.js sets cookies for fraud detection
  - Required cookies for payment processing
  - Optional cookies for analytics (user consent required)
  - Cookie banner implementation

- [ ] **Refund Policy**
  - Clear timeline (e.g., "Full refund if cancelled >48 hours before journey")
  - Partial refund policy (e.g., "50% refund if cancelled 24-48 hours before")
  - No refund policy (e.g., "No refund if cancelled <24 hours before")
  - Refund processing time (7-10 working days standard)
  - Link from booking confirmation email

**Legal Review Recommendation:**
- Budget £500-1,000 for transport lawyer review of T&Cs
- Worth the investment to avoid disputes
- Especially important for liability limitations

---

#### 🔷 Booking Flow Changes

**User Experience Requirements:**

- [ ] **Add T&Cs checkbox before payment**
  - Position: Immediately before "Proceed to Payment" button
  - Text: "I have read and agree to the [Terms & Conditions] and [Refund Policy]"
  - MUST be unchecked by default (pre-ticked is illegal)
  - Cannot proceed without checking
  - Links must open in new tab

- [ ] **Display total price including VAT** (if applicable)
  - Large, clear font on quote page
  - Show breakdown: "Total: £120.00 (includes £20.00 VAT)"
  - Consistent currency format (£ symbol, 2 decimal places)

- [ ] **Show payment provider**
  - Text: "Secure payments processed by Stripe"
  - Stripe logo (use official brand assets)
  - Position: Above payment form

- [ ] **Email confirmation with receipt and T&Cs**
  - Send within 5 minutes of payment
  - Include:
    - Booking reference number
    - Journey details (pickup, dropoff, date, time)
    - Vehicle type
    - Total paid (with VAT breakdown)
    - Cancellation instructions
    - Contact details for queries
    - Link to T&Cs
    - PHV operator license number
  - Subject: "Booking Confirmation - [Booking Reference] - Dorset Transfer Company"

---

#### 🔷 Database Changes

**Add to `durdle-main-table-dev` (Booking Records):**

```
New Fields for Bookings:

Payment Data:
- stripePaymentIntentId: string (e.g., "pi_3ABC123...")
- stripeCustomerId: string (e.g., "cus_ABC123..." - for repeat customers)
- stripeCurrencyCode: string (always "gbp" for you)
- paymentStatus: string (pending | succeeded | failed | refunded)
- paymentMethod: string (card | google_pay | apple_pay)
- cardLast4: string (e.g., "1234" - for customer reference)
- cardBrand: string (visa | mastercard | amex)

VAT Data (if VAT registered):
- priceExcludingVat: number (pence)
- vatRate: number (0.20 for standard rate, 0 if not VAT registered)
- vatAmount: number (pence, calculated)
- totalIncludingVat: number (pence)
- vatRegistrationNumber: string (company VAT number, e.g., "GB123456789")

Compliance Data:
- operatorLicenseNumber: string (e.g., "BCP-PHV-12345")
- driverLicenseNumber: string (assigned when dispatched)
- vehicleLicenseNumber: string (assigned when dispatched)

Refund Data:
- refundStatus: string (none | requested | approved | processed)
- refundAmount: number (pence, can be partial)
- refundReason: string (customer cancellation | service issue | etc.)
- refundRequestedAt: string (ISO 8601)
- refundProcessedAt: string (ISO 8601)
- refundStripeId: string (Stripe refund ID for tracking)

Timestamps:
- paymentProcessedAt: string (ISO 8601)
- bookingConfirmedAt: string (ISO 8601)
```

**Implementation Note:**
Update Lambda functions that write to this table:
- `quotes-calculator-dev` (when converting quote to booking)
- New `bookings-create-dev` (Phase 3)
- New `bookings-process-payment-dev` (Phase 3)

---

### Phase 3 (Payment Processing Implementation)

#### 🔷 Stripe Payment Flow

**Architecture:**

```
1. Customer completes quote
   ↓
2. Frontend sends booking request to /api/bookings/create
   ↓
3. Lambda: bookings-create-dev
   - Validate quote (not expired)
   - Retrieve vehicle pricing
   - Calculate total (with VAT if applicable)
   - Create Stripe Payment Intent
   - Return client_secret to frontend
   ↓
4. Frontend: Stripe Elements
   - Customer enters card details
   - 3D Secure authentication (if required by bank)
   - Payment processed by Stripe
   ↓
5. Stripe sends webhook: payment_intent.succeeded
   ↓
6. Lambda: stripe-webhook-handler-dev
   - Verify webhook signature (CRITICAL for security)
   - Update booking status to "confirmed"
   - Assign to dispatcher queue
   - Send confirmation email to customer
   - Send notification to operations team
   ↓
7. Customer receives:
   - On-screen confirmation (immediate)
   - Email confirmation (within 5 minutes)
   - SMS confirmation (optional, Phase 3)
```

**Implementation Checklist:**

- [ ] **Create bookings-create Lambda**
  - Endpoint: `POST /v1/bookings`
  - Validates quote (checks expiry, quote exists)
  - Calculates final price (with VAT if applicable)
  - Creates Stripe Payment Intent
  - Stores booking record (status: "pending_payment")
  - Returns `client_secret` to frontend

- [ ] **Create stripe-webhook-handler Lambda**
  - Endpoint: `POST /webhooks/stripe` (API Gateway)
  - MUST verify Stripe webhook signature
  - Handles events:
    - `payment_intent.succeeded` → Confirm booking, send emails
    - `payment_intent.payment_failed` → Update status, notify customer
    - `charge.refunded` → Update refund status
    - `charge.dispute.created` → Alert operations team
  - Idempotent processing (handle duplicate webhooks)

- [ ] **Frontend: Stripe Elements integration**
  - Install `@stripe/stripe-js` and `@stripe/react-stripe-js`
  - Create payment form component
  - Handle 3D Secure authentication
  - Show loading state during payment
  - Handle success/failure states
  - Redirect to confirmation page on success

- [ ] **Email notification system**
  - Use AWS SES (Simple Email Service)
  - Templates:
    - Booking confirmation (customer)
    - New booking alert (operations)
    - Payment failed alert (customer + operations)
    - Refund processed (customer)
  - Store email delivery status for audit

---

#### 🔷 Refunds & Chargebacks

**Refund Policy Implementation:**

- [ ] **Implement refund logic** (within cancellation period)
  - Customer requests cancellation via booking management page
  - System checks cancellation deadline (e.g., 48 hours before journey)
  - If within policy:
    - Calculate refund amount (full or partial based on timeline)
    - Create Stripe refund via API
    - Update booking status to "cancelled"
    - Send refund confirmation email
  - If outside policy:
    - Notify customer of no-refund policy
    - Offer to reschedule (if applicable)

- [ ] **Handle Stripe chargeback webhooks**
  - Event: `charge.dispute.created`
  - Alert operations team immediately
  - Gather evidence (booking confirmation, T&Cs acceptance, service proof)
  - Respond to chargeback via Stripe Dashboard within 7 days
  - Track chargeback rate (>1% triggers Stripe review)

- [ ] **Store refund history in DynamoDB**
  - Audit trail for all refunds
  - Customer can view refund status in booking history
  - Operations team can generate refund reports

**Refund Lambda:**
- Endpoint: `POST /admin/bookings/{bookingId}/refund`
- Validates refund request (policy compliance)
- Calculates refund amount
- Creates Stripe refund
- Updates booking record
- Sends notifications

---

#### 🔷 Compliance Monitoring

**Ongoing Compliance Tasks:**

- [ ] **PCI DSS SAQ A completion (annually)**
  - Self-Assessment Questionnaire A
  - Complete via Stripe Dashboard or PCI Security Standards Council
  - 22 questions (simple yes/no)
  - Takes ~30 minutes
  - Due date: Anniversary of Stripe account activation
  - Store attestation of compliance (PDF)

- [ ] **Stripe compliance dashboard review (quarterly)**
  - Check for flagged transactions
  - Review chargeback rate (must be <1%)
  - Monitor fraud detection alerts
  - Update business information if changed
  - Verify payout account details

- [ ] **PHV license renewal tracking**
  - Add calendar reminder 90 days before expiry
  - Renew with local authority (Dorset Council/BCP Council)
  - Update license number in database if changed
  - Update website footer and email templates

- [ ] **Insurance renewal tracking**
  - Calendar reminder 60 days before expiry
  - Request updated certificate of insurance
  - Verify online bookings still covered
  - Store insurance certificate in secure location
  - Update operations team with new policy number

**Compliance Dashboard (Phase 3 Feature):**
- Centralized view of all compliance items
- Red/amber/green status indicators
- Automated reminders for renewals
- Document storage (licenses, insurance, PCI attestation)

---

## Costs (Beyond Stripe Fees)

### Detailed Cost Breakdown

| Item | Frequency | Cost (GBP) | Notes |
|------|-----------|------------|-------|
| **Payment Processing** |
| Stripe fees (UK cards) | Per transaction | 1.5% + 20p | £100 booking = £1.70 fee |
| Stripe fees (international cards) | Per transaction | 2.9% + 20p | £100 booking = £3.10 fee |
| Stripe payout fees | Per payout | Free | Daily payouts recommended |
| Currency conversion | Per transaction | +1% | If accepting non-GBP cards |
| **Compliance** |
| PCI DSS SAQ A | Annual | Free | Self-assessment (no auditor required) |
| PHV Operator License | Annual | £200-500 | Council-dependent (Dorset/BCP) |
| PHV Driver License (per driver) | Annual | £100-200 | Per driver, council-dependent |
| PHV Vehicle License (per vehicle) | Annual | £100-200 | Per vehicle, council-dependent |
| **Insurance** |
| Public Liability (£10M) | Annual | £500-2,000 | Depends on fleet size, claims history |
| Employer's Liability (£5M) | Annual | £300-800 | If employing drivers (not contractors) |
| Professional Indemnity (£1M) | Annual | £200-500 | Recommended for booking errors |
| **Legal** |
| T&Cs legal review | One-time | £500-1,500 | Transport lawyer, highly recommended |
| Privacy Policy legal review | One-time | £300-500 | Can be bundled with T&Cs |
| Ongoing legal advice | As needed | £150-300/hour | For disputes, regulatory changes |
| **Accounting** |
| Bookkeeping (VAT filing) | Monthly | £50-200 | More if VAT registered |
| Annual accounts | Annual | £500-1,500 | Statutory requirement (Companies House) |
| VAT returns | Quarterly | Included | Part of monthly bookkeeping |
| **Software** |
| Accounting software (Xero/QuickBooks) | Monthly | £25-50 | MTD compliance |
| Email service (AWS SES) | Per email | £0.10 per 1,000 | Booking confirmations |
| SMS notifications (AWS SNS) | Per SMS | £0.05 per SMS | Optional, Phase 3 |

### Example Scenario: 100 Bookings/Month

**Assumptions:**
- Average booking value: £80
- All UK cards (1.5% + 20p)
- VAT registered
- 3 drivers, 3 vehicles
- Monthly accounting service

**Monthly Costs:**
```
Stripe fees: 100 × (£80 × 1.5% + £0.20) = £140/month
Accounting: £150/month (VAT registered)
Software: £35/month
Insurance (amortized): £150/month
Licensing (amortized): £100/month
────────────────────────
TOTAL OPERATIONAL: ~£575/month

Revenue: 100 × £80 = £8,000/month
Payment fees as % of revenue: 1.75%
Total operational as % of revenue: 7.2%
```

**Scaling:** Most costs scale linearly with booking volume. Insurance and licensing costs are mostly fixed.

---

## COO Recommendations

### ✅ Yes, Integrate with Stripe - But With These Guardrails

#### 1. Immediate Payment Model
**Recommendation:** Charge customers at booking confirmation, NOT weeks in advance.

**Why:**
- Avoids Payment Services Regulations licensing (£10k+ cost)
- Reduces refund liability (no pre-payments sitting as liabilities)
- Better cash flow (money in account immediately)
- Simpler accounting (no deferred revenue)

**Implementation:**
- Quote → Customer selects journey → Immediate payment → Booking confirmed
- For advance bookings (e.g., airport transfer in 2 weeks), charge at booking time
- For account customers (Phase 3), use Stripe invoicing (not pre-charging)

---

#### 2. Legal Review - Essential Investment
**Recommendation:** Get a transport lawyer to review your T&Cs (£500-1,000 well spent).

**Why:**
- Transport law is complex (Consumer Rights Act + PHV regulations)
- Liability limitations must be carefully worded (can't exclude gross negligence)
- Cancellation policy affects refund obligations
- Generic templates don't cover PHV-specific requirements

**Action:**
- Find lawyer via Law Society (filter by Transport Law)
- Provide them with your draft T&Cs
- Ask for review + markup + final version
- Budget £500-1,000 (worth every penny)

---

#### 3. PHV License Priority - CRITICAL
**Recommendation:** Verify operator license is valid BEFORE launching any payment features.

**Why:**
- Operating without valid license = criminal offense
- Taking payments for unlicensed service = fraud risk
- Insurance invalid if operating outside license terms
- Reputational damage ("illegal taxi service" headlines)

**Action (URGENT):**
1. Contact Dorset Transfer Company owner
2. Request copy of current PHV Operator License
3. Verify expiry date (add 90-day renewal reminder)
4. Confirm license covers "online booking services"
5. If license doesn't cover online bookings, apply for variation (2-4 weeks)

---

#### 4. VAT Clarity - Required Before Pricing Launch
**Recommendation:** Determine VAT status NOW, before any pricing goes live.

**Why:**
- Displaying prices without VAT (when you're VAT registered) = illegal
- Charging incorrect VAT = HMRC penalties
- Customers expect final price shown (not "price + VAT at checkout")
- Harder to retrofit VAT later (customer complaints, database changes)

**Action (This Week):**
1. Ask Dorset Transfer Company: "Are you VAT registered?"
2. If yes: Obtain VAT registration number, implement VAT calculation
3. If no: Assess if approaching £85k threshold
4. If close to threshold: Register proactively (takes 4-6 weeks)

---

#### 5. Stripe Advanced Fraud Detection
**Recommendation:** Enable Stripe Radar (included in fees) from day one.

**Why:**
- Prevents fraudulent bookings (stolen cards)
- Reduces chargeback rate (>1% triggers Stripe review)
- Machine learning adapts to your business patterns
- No additional cost (included in 1.5% + 20p fee)

**Action:**
- Enable Radar in Stripe Dashboard (Settings → Radar)
- Set risk threshold: "Block high-risk payments"
- Review blocked payments weekly (may need to manually approve legitimate international cards)

---

### 🚫 Red Flags to Avoid

#### ❌ Don't Implement "Pay Later" or Installment Options
**Why:** Triggers Consumer Credit Act 1974 and requires FCA authorization.

**Cost to Comply:** £10,000+ application fee, 12-month approval process, ongoing regulatory reporting.

**Alternative:** Use Stripe Checkout with "Pay by bank account" (same-day payment, lower fees).

---

#### ❌ Don't Hold Payments for >24 Hours Before Service
**Why:** Triggers Payment Services Regulations 2017 (e-money license required).

**Cost to Comply:** £50,000+ application fee, 18-month approval process, minimum capital requirements.

**Alternative:** Charge at booking, refund if cancelled within policy.

---

#### ❌ Don't Process Payments Without Displaying T&Cs
**Why:** Violates Consumer Rights Act 2015 (up to £5,000 fine per violation).

**Risk:** Customer can dispute transaction, claim they didn't agree to terms.

**Implementation:** T&Cs checkbox (unchecked by default) required before payment.

---

#### ❌ Don't Skip Webhook Signature Verification
**Why:** Security vulnerability - attackers can fake payment confirmations.

**Risk:** Attacker sends fake webhook → Your system confirms booking → No actual payment received.

**Implementation:** MUST verify `Stripe-Signature` header on every webhook (Stripe provides library to do this).

---

## Next Steps

### Immediate Actions (This Week)

#### 🔴 Priority 1: Business Compliance Verification

**Owner:** Dorset Transfer Company (Client)

- [ ] **Verify PHV Operator License**
  - Obtain copy of license
  - Check expiry date
  - Confirm covers online bookings
  - Provide license number to Crispin (COO)

- [ ] **Verify VAT Registration Status**
  - Confirm if VAT registered (yes/no)
  - If yes, provide VAT registration number
  - If no, confirm annual turnover (check if approaching £85k)

- [ ] **Verify Insurance Coverage**
  - Contact insurance provider
  - Confirm online bookings are covered
  - Request updated certificate showing coverage
  - Provide certificate to Crispin (COO)

---

#### 🟡 Priority 2: Legal Documentation

**Owner:** Crispin (COO) with Client Input

- [ ] **Draft Terms & Conditions**
  - Use transport industry template as starting point
  - Customize for Dorset Transfer Company
  - Include: cancellation policy, refund policy, liability limitations, PHV license number
  - Send to transport lawyer for review (budget £500-1,000)

- [ ] **Update Privacy Policy**
  - Add payment data section
  - Add 7-year retention clause for financial records
  - Add Stripe as data processor

- [ ] **Create Refund Policy**
  - Define cancellation timelines (e.g., >48 hours = full refund)
  - Define partial refund policy (e.g., 24-48 hours = 50% refund)
  - Define no-refund scenarios (e.g., <24 hours or no-show)

---

#### 🟢 Priority 3: Technical Foundation

**Owner:** Crispin (COO) / Development Team

- [ ] **Read existing documentation**
  - Review [.documentation/SecurityCompliance.md](../SecurityCompliance.md) lines 110-127
  - Confirm Stripe architecture plan is sound

- [ ] **Set up Stripe test account**
  - Sign up at stripe.com/gb (test mode)
  - Complete business verification (can do in parallel with production)
  - Generate test API keys
  - Test Payment Intents API
  - Test 3D Secure authentication flow

---

### Short-Term Actions (Before Phase 2.5)

**Timeline:** 2-4 weeks

#### Development Tasks

- [ ] **Update database schema**
  - Add payment fields to durdle-main-table-dev
  - Add VAT fields (if applicable)
  - Add compliance fields (license numbers)
  - Test schema changes in dev environment

- [ ] **Create legal pages**
  - Build T&Cs page (awaiting lawyer review)
  - Build Privacy Policy page (updated)
  - Build Refund Policy page
  - Build Cookie Policy page
  - Add footer links to all pages

- [ ] **Update booking flow UI**
  - Add T&Cs checkbox before payment
  - Add "Payments processed by Stripe" text
  - Add VAT breakdown (if applicable)
  - Add price display (total including VAT)

- [ ] **Email confirmation system**
  - Design email template (booking confirmation)
  - Include all required information (journey details, T&Cs, refund policy, license number)
  - Set up AWS SES for sending
  - Test email delivery

---

### Medium-Term Actions (Phase 3)

**Timeline:** 4-8 weeks

#### Stripe Integration

- [ ] **Create production Stripe account**
  - Complete business verification (2-3 days)
  - Add business bank account
  - Enable Payment Intents API
  - Generate production API keys
  - Store keys in AWS Secrets Manager

- [ ] **Build payment Lambda functions**
  - `bookings-create-dev` (creates Payment Intent)
  - `stripe-webhook-handler-dev` (processes payment confirmations)
  - Test with Stripe test cards
  - Test 3D Secure flow
  - Test webhook delivery and signature verification

- [ ] **Frontend Stripe Elements integration**
  - Install Stripe.js libraries
  - Build payment form component
  - Handle authentication (3DS)
  - Handle success/error states
  - Test on multiple devices/browsers

- [ ] **Refund system**
  - Build admin refund interface
  - Implement cancellation logic
  - Connect to Stripe Refunds API
  - Test full refund
  - Test partial refund

---

### Long-Term Actions (Ongoing)

**Owner:** Crispin (COO)

#### Compliance Monitoring

- [ ] **Set up compliance calendar**
  - PHV license renewal (90 days before expiry)
  - Insurance renewal (60 days before expiry)
  - PCI DSS SAQ A (annual, on Stripe account anniversary)
  - VAT returns (quarterly, if applicable)
  - Annual accounts (Companies House deadline)

- [ ] **Quarterly compliance review**
  - Review Stripe dashboard (chargebacks, fraud alerts)
  - Review licensing status (drivers, vehicles)
  - Review insurance coverage
  - Review legal pages (ensure still accurate)

- [ ] **Annual legal review**
  - Review T&Cs with lawyer (regulatory changes)
  - Update Privacy Policy (GDPR updates)
  - Review insurance coverage (adequate limits)

---

## Document Control

**Version:** 1.0
**Date Created:** December 5, 2025
**Last Updated:** December 5, 2025
**Next Review:** Before Phase 2.5 launch (payment processing)

**Change Log:**
- v1.0 (2025-12-05): Initial document created for client review

**Distribution:**
- Dorset Transfer Company (Client)
- Crispin (COO - Durdle Platform)
- Development Team
- Legal Advisor (when appointed)

---

## Questions for Dorset Transfer Company

Please provide answers to these questions at your earliest convenience:

1. **PHV Licensing:**
   - Do you hold a valid PHV Operator License? (Yes/No)
   - If yes, what is the license number?
   - What is the expiry date?
   - Which council issued it? (Dorset Council / BCP Council / Other)
   - Does it explicitly cover "online booking services"? (Yes/No/Unsure)

2. **VAT Registration:**
   - Are you currently VAT registered? (Yes/No)
   - If yes, what is your VAT registration number?
   - If no, what is your current annual turnover? (approximate)
   - Do you expect turnover to exceed £85,000 with online bookings? (Yes/No/Unsure)

3. **Insurance:**
   - Do you have Public Liability insurance? (Yes/No)
   - What is the coverage limit? (£10M or other)
   - Does your policy explicitly cover "online bookings" or "app-based bookings"? (Yes/No/Unsure)
   - When is your policy renewal date?
   - Who is your insurance provider?

4. **Business Structure:**
   - Is Dorset Transfer Company a limited company or sole trader?
   - If limited company, what is the Companies House registration number?
   - Do you employ drivers, or are they contractors?

5. **Refund Policy Preferences:**
   - What cancellation notice period do you currently offer? (e.g., 48 hours)
   - Do you offer partial refunds for short-notice cancellations? (Yes/No)
   - What is your current policy for no-shows?

6. **Accounting:**
   - Do you have an accountant or bookkeeper? (Yes/No)
   - If yes, are they familiar with MTD (Making Tax Digital)? (Yes/No/Unsure)
   - What accounting software do you use, if any? (QuickBooks/Xero/Other/None)

---

## Resources & References

### Regulatory Bodies

- **Private Hire Vehicle Licensing:**
  - BCP Council (Bournemouth, Christchurch & Poole): https://www.bcpcouncil.gov.uk/licensing
  - Dorset Council: https://www.dorsetcouncil.gov.uk/business-licensing/private-hire-licensing

- **Data Protection:**
  - ICO (Information Commissioner's Office): https://ico.org.uk/
  - ICO Helpline: 0303 123 1113

- **Payment Compliance:**
  - Payment Systems Regulator: https://www.psr.org.uk/
  - FCA (Financial Conduct Authority): https://www.fca.org.uk/

- **VAT & Tax:**
  - HMRC VAT Helpline: 0300 200 3700
  - HMRC Making Tax Digital: https://www.gov.uk/making-tax-digital

### Stripe Resources

- **Stripe UK:** https://stripe.com/gb
- **Stripe Documentation:** https://stripe.com/docs
- **Stripe Compliance:** https://stripe.com/docs/security
- **Stripe Support:** https://support.stripe.com/

### Legal Resources

- **Law Society (Find a Solicitor):** https://solicitors.lawsociety.org.uk/
  - Filter by: Transport Law, Consumer Rights
- **Citizens Advice (Consumer Rights):** https://www.citizensadvice.org.uk/

### Internal Documentation

- [Security & Compliance Checklist](../SecurityCompliance.md)
- [Technical Architecture](../TechnicalArchitecture.md)
- [Durdle Platform Bible](../DURDLE_PLATFORM_BIBLE.md)
- [Database Schema](../DatabaseSchema.md)
- [API Specification](../APISpecification.md)

---

## Contact Information

**For Questions or Clarifications:**

**Crispin (COO - Durdle Platform)**
Role: Chief Operating Officer
Responsible for: Compliance, operations, payment processing implementation

**Development Team**
Responsible for: Technical implementation, AWS infrastructure, Stripe integration

**Dorset Transfer Company (Client)**
Responsible for: Business compliance verification, legal requirements, operational decisions

---

**END OF DOCUMENT**

---

*This document is for internal planning and client collaboration. It does not constitute legal advice. Consult with qualified legal and financial advisors before making business decisions.*
