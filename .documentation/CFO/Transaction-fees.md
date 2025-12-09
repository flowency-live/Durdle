Durdle Pricing & Transaction Fee Architecture
Operational & Commercial Model for a Multi-Client Airport Transfer Booking Platform
1. Overview

Durdle is a backend booking, payment and dispatch engine for private airport transfer providers.
It powers:

Quote generation

Booking creation

Customer payments

Driver/vehicle allocation

Job completion tracking

White-label frontends per provider

This document outlines the commercial pricing model and the recommended technical mechanism for collecting Durdle’s per-transaction platform fee, configurable per client.

2. Pricing Model Summary

Durdle uses a hybrid pricing model combining:

Free white-label frontend

One-off setup/configuration day (chargeable)

Per-transaction platform fee (configurable per client)

Stripe as the payments processor

The platform fee is the primary recurring revenue stream and must be collected in a reliable, automated and compliant manner across multiple providers.

3. Recommended Fee Collection Method: Stripe Connect

The industry-standard approach for SaaS booking engines is to use Stripe Connect to collect platform fees automatically at the moment of customer payment.

This avoids invoicing, debt collection, reconciliation issues, and regulatory risk.

3.1 Why Stripe Connect

Deducts your fee instantly on each booking

Zero unpaid invoices

Providers receive their earnings net of your fee

Automated reconciliation

Fully compliant with UK financial regulations

Scales globally without changing model

Supports unique fee-per-provider configuration

3.2 What You Never Do

You never receive the full booking amount

You never hold client funds

You avoid FCA “payment institution” rules

You avoid trust account or safeguarding obligations

Stripe collects everything and distributes the money correctly.

4. Multi-Client Fee Configuration

Each provider on Durdle will operate as a Stripe Connected Account.

Durdle’s backend will store a per-client configuration value:

{
  "clientId": "provider_123",
  "platformFeePence": 100    // £1.00
}


This value can differ for each provider (e.g., £1.50 for high-touch clients, £0.50 for high-volume clients).

At booking time, Durdle will assign this value as the fee to Stripe:

"application_fee_amount": platformFeePence

5. Payment Flow Explained
5.1 Customer Payment

Customer submits booking

Stripe creates a charge against the customer

Full payment is received by Stripe

5.2 Automatic Funds Distribution

Stripe immediately:

Sends (booking total – platform fee) to the provider

Sends the platform fee to Durdle’s Stripe account

This occurs in real time with no manual work.

5.3 Refunds

If a refund occurs:

Stripe automatically returns the platform fee proportionally

No manual reconciliation required

6. Cost Effectiveness (UK Context)

Using Stripe Connect incurs:

Standard Stripe card fee: 1.5% + 20p (UK consumer cards)

Connect fee (~0.25%)

This is far cheaper than manual invoicing or reconciliation, especially at scale.

The extra per-transaction Connect cost is a few pennies—easily absorbed within a £1 platform fee.

7. VAT Treatment (UK)

If Durdle is VAT-registered:

Your £1 fee should be charged as £1 + VAT

Stripe can automatically include the VAT in the application fee

Providers receive a VAT-itemised receipt for the platform fee

Clean digital audit trail

Providers do not need to handle VAT on the customer booking amount on your behalf; your fee is separate.

8. Why Not Invoice Providers Instead?

You can invoice monthly based on usage, but this is strongly discouraged:

Providers often forget, delay, or dispute payments

You accumulate debtors and lose predictable revenue

Admin overhead increases

Hard to reconcile number of bookings vs expected fees

Cash flow becomes unpredictable

Creates friction during onboarding

Modern SaaS with per-transaction fees always deduct at source.

9. Technical Implementation Outline
9.1 Required Components

Stripe Connect (Standard or Express accounts)

Per-provider configuration table

API endpoint for creating charges with application_fee_amount

Webhooks for payment events

Refund logic that respects platform fees

9.2 Example Charge Payload
stripe.paymentIntents.create({
  amount: totalAmountPence,
  currency: "gbp",
  payment_method: paymentMethodId,
  confirm: true,
  application_fee_amount: platformFeePence,
  transfer_data: {
    destination: providerStripeAccountId
  }
});

10. Operational Benefits

Zero risk of unpaid fees

Predictable recurring income

Fully automated fee collection

Easy to onboard multiple clients

No manual debt chasing

No FCA regulatory burden

Immediate cash flow

Transparent reporting for all parties

11. Recommended Pricing Strategy
Base Setup

£X Setup / Configuration Day
(one day of implementation to configure pricing, service radius, destinations, email templates, branding, etc.)

Per-Booking Fee

Default: £1.00 per completed job

Configurable per client in 1p increments

Discounted rates for volume (optional)

12. Final Recommendation

For a multi-client private airport transfer SaaS engine like Durdle:

Use Stripe Connect.
Configure a per-provider platform fee.
Deduct it automatically at checkout.
Avoid invoicing at all costs.

This is the safest, most compliant, and most scalable approach in the UK and globally.