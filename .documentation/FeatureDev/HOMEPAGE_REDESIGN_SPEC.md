# Homepage Redesign Specification

**Status**: IMPLEMENTATION COMPLETE (Phase 1-4)
**Created**: 2024-12-10
**Target**: Durdle Homepage (The Dorset Transfer Company)

---

## Existing Pages Reference

| Page | File | Description |
|------|------|-------------|
| Homepage | [app/page.tsx](../../app/page.tsx) | Main landing page - target of this redesign |
| Contact | [app/contact/page.tsx](../../app/contact/page.tsx) | Customer + Driver contact cards with QR codes |
| Pricing | [app/pricing/page.tsx](../../app/pricing/page.tsx) | Fixed routes pricing from API |
| Quote | [app/quote/page.tsx](../../app/quote/page.tsx) | Quote wizard |

---

## Table of Contents

1. [Navigation Bar](#1-navigation-bar)
2. [Hero Section](#2-hero-section)
3. [Vehicles Section (NEW)](#3-vehicles-section-new)
4. [Our Services Section](#4-our-services-section)
5. [Why Choose Us Section](#5-why-choose-us-section)
6. [FAQ Page (NEW)](#6-faq-page-new)
7. [Partner With Us Section](#7-partner-with-us-section)
8. [Ready To Go Section](#8-ready-to-go-section)
9. [Footer](#9-footer)
10. [Services Page (NEW)](#10-services-page-new)
11. [Image Assets Required](#11-image-assets-required)

---

## 1. Navigation Bar

### Current State (in [page.tsx:123-141](../../app/page.tsx#L123))
```
Services (anchor) | Pricing (/pricing) | Contact (/contact)
```

### Target State
```
HOME | VEHICLES | SERVICES | FAQ | PRICING | CONTACT
```

### Changes

| Nav Item | Action | Target |
|----------|--------|--------|
| HOME | ADD | `/` (homepage) |
| VEHICLES | ADD | `#vehicles` (anchor to new section) |
| SERVICES | KEEP | `#services` (anchor) or `/services` (new page) |
| FAQ | ADD | `/faq` (new page - too long for homepage) |
| PRICING | KEEP | `/pricing` (existing page) |
| CONTACT | KEEP | `/contact` (existing page) |

### Files to Modify
- [app/page.tsx](../../app/page.tsx) - Desktop nav (lines 123-141)
- [app/page.tsx](../../app/page.tsx) - Mobile nav (lines 174-198)

---

## 2. Hero Section

### Current State (in [page.tsx:219-296](../../app/page.tsx#L219))
- Badge: "Est. 2025 - Dorset's Premier Transfer Service"
- Headline: "Your journey starts here"
- Tagline: "Premium airport transfers, cruise terminal pickups, and corporate travel solutions. Personal service for discerning travellers."
- Buttons: "Get a Quote" + "Call Us"
- 3 Feature badges: UK airports, Flight tracking, Licensed & insured

### Changes

| Action | Element | Current | New |
|--------|---------|---------|-----|
| DELETE | Badge | "Est. 2025 - Dorset's Premier Transfer Service" | Remove entirely |
| KEEP | Headline | "Your journey starts here" | No change |
| AMEND | Tagline | "...Personal service for discerning travellers." | "Premium airport transfers, cruise terminal pickups, and corporate travel solutions." (remove last sentence) |
| AMEND | CTA Button 1 | "Get a Quote" | "Quote" |
| AMEND | CTA Button 2 | "Call Us" | "Contact" |
| DELETE | Feature badges | All 3 badges | Remove entirely |

### Files to Modify
- [app/page.tsx](../../app/page.tsx) lines 240-278

---

## 3. Vehicles Section (NEW)

### Layout
- **Screen-wide carousel** (thinner/compact height)
- **Anchor ID**: `#vehicles` (for nav link)
- Passenger and luggage counts displayed as **icons**

### Vehicle Cards

#### 3.1 Sedan
| Field | Value |
|-------|-------|
| Name | Sedan |
| Subtitle | Ford Mondeo or Similar |
| Tagline | Smart, comfortable, and ideal for everyday travel. |
| Passengers | Up to 3 (icon) |
| Luggage | 2 large suitcases + 2 small bags (icon) |
| Description | A refined and reliable option for solo travellers or small groups. Comfortable seating and generous boot space make it perfect for airport runs, rail connections and everyday point-to-point journeys. |

#### 3.2 Executive Sedan
| Field | Value |
|-------|-------|
| Name | Executive Sedan |
| Subtitle | Mercedes E-Class or Similar |
| Tagline | Business-class comfort for the modern professional. |
| Passengers | Up to 3 (icon) |
| Luggage | 2 large suitcases + 2 small bags (icon) |
| Description | Designed for premium and corporate travel, the Executive Sedan offers a quiet, luxurious cabin and enhanced comfort. Ideal for business meetings, airport transfers and clients who appreciate a more elevated travel experience. |

#### 3.3 MPV
| Field | Value |
|-------|-------|
| Name | MPV |
| Subtitle | VW Caravelle or Similar |
| Tagline | Spacious, versatile travel for families and groups. |
| Passengers | Up to 6 (icon) |
| Luggage | 4-6 large suitcases + cabin bags (icon) |
| Description | A practical and flexible option for group travel or passengers with additional luggage. Ideal for cruise port transfers, family holidays, and journeys where extra space makes all the difference. |

#### 3.4 Executive MPV
| Field | Value |
|-------|-------|
| Name | Executive MPV |
| Subtitle | Mercedes V-Class or Similar |
| Tagline | Luxury group travel with premium space and style. |
| Passengers | Up to 6 (icon) |
| Luggage | 5 large suitcases + 5 cabin bags (icon) |
| Description | Offering the perfect blend of capacity and sophistication, the Executive MPV provides first-class comfort for corporate groups, VIP guests, and premium leisure travellers. Spacious, elegant and designed for a seamless journey. |

---

## 4. Our Services Section

### Current State

There are TWO service sections on the homepage:

1. **"Every journey, handled" carousel** ([page.tsx:299-367](../../app/page.tsx#L299))
   - 3 rotating cards: Travel Transfers, Private Chauffeur, Corporate Transport
   - Full-height image carousel with auto-rotate

2. **"Our services" pillars** ([page.tsx:370-403](../../app/page.tsx#L370))
   - 4 boxes: Airports/Stations/Ports, Private Driver, Corporate, Onwards Worldwide
   - Grid layout with icons

### Changes

| Section | Action | Notes |
|---------|--------|-------|
| "Every journey, handled" carousel | **REPLACE** | Update to 6 new services with new copy |
| "Our services" 4-box grid | **DELETE** | Remove entirely |
| Section title | KEEP | Keep as "Every journey, handled" with subtitle "Premium transport for every occasion" |

### New Service Cards (Carousel - 6 items)

#### 4.1 Airports
> Start and end your trip smoothly with punctual, professional airport transport. We track your flight, manage timings carefully and ensure a relaxed journey to or from all major UK airports.

#### 4.2 Cruise Terminals
> Enjoy seamless travel to and from the UK's leading cruise and ferry terminals. We stay updated with sailing times, coordinate every detail, and provide a comfortable, stress-free transfer for the beginning or end of your journey.

#### 4.3 Rail Connections
> Connect effortlessly with major rail stations across the UK. We coordinate timings around your train schedule and provide a smooth, comfortable transfer to ensure your journey continues without stress or delay.

#### 4.4 Chauffeurs by the Hour
> Perfect for occasions that demand flexibility, discretion and exceptional comfort. Whether you're attending a corporate event, hosting VIP guests, or simply require a luxury chauffeur in Dorset, we provide a tailored, premium experience designed around your schedule. Enjoy a professional driver, a high-end vehicle and complete freedom to travel wherever you need, for as long as you need.

#### 4.5 Film & TV Production
> Dorset is home to some of the most stunning filming locations in the UK, from dramatic coastlines to beautiful countryside. If you are a Film or TV production company filming in Dorset contact us today to discuss your filming schedule and discover how we can support your production with unit drivers, production transport and on-location crew movement.

#### 4.6 Popular UK Destinations
> Enjoy comfortable, stress-free long-distance travel from Dorset to popular UK destinations. Whether you're travelling for business meetings, leisure trips, airport connections or simply prefer a smooth door-to-door private transfer, we provide reliable, premium transport anywhere in the UK. Our long-distance chauffeur service ensures a relaxed journey, with professional drivers and modern vehicles designed for comfort over any distance.

---

## 5. Why Choose Us Section

### Layout
- Section with checkmark icons
- Keep the star icon in heading

### Content

| Icon | Title | Description |
|------|-------|-------------|
| ✔ | Premium Comfort | Travel in modern, well-maintained vehicles designed to provide a smooth, relaxing and refined journey every time. |
| ✔ | Professional, Trusted Drivers | Our experienced, discreet drivers deliver the high standard of service that corporate clients and frequent travellers depend on. |
| ✔ | 1 Hour of Free Airport Waiting Time | We monitor your flight in real time and include up to one hour of free waiting, ensuring a stress-free arrival even if delays occur. |
| ✔ | Discounted Return Bookings | Save more when you book your outbound and return transfers together - perfect for regular travellers. |
| ✔ | Reliability You Can Count On | Punctual arrivals, proactive communication and careful scheduling mean your journey always runs smoothly. |
| ✔ | Tailored Travel Experiences | From bespoke routes to multi-stop itineraries, we adapt every journey to your exact needs. |
| ✔ | 24/7 Availability | Whether it's an early-morning airport run or a late-night pickup, our service operates around the clock. |
| ✔ | Local Knowledge, National Reach | Based in Dorset with expert local insight - and providing dependable long-distance transfers across the UK. |

---

## 6. FAQ Section (NEW)

### Layout
- **Anchor ID**: `#faq` (for nav link)
- Collapsible accordion style (recommended)
- Two categories: "Booking & Services" and "General Policies"

### Category 1: Booking & Services FAQs

**Q1: How do I book a transfer with The Dorset Transfer Company?**
> Booking your transfer is simple. You can reserve your journey online, by email, or by calling our team directly. Once confirmed, we'll send full booking details and your driver's information for a seamless travel experience.

**Q2: Do you offer fixed pricing for Dorset transfers?**
> Yes - we have a range of fixed prices for popular destinations. The price we quote is the price you pay, with no hidden extras.

**Q3: What areas do you cover across Dorset and the UK?**
> We provide private hire and transfer services throughout Dorset, including Blandford, Bournemouth, Christchurch, Dorchester, Poole, Swanage, Wareham, Weymouth and Wimborne and surrounding areas. We also cover all major UK airports, cruise and ferry ports, railway stations, hotels, and long-distance destinations nationwide.

**Q4: Do you track flights, cruise sailings and train arrival times?**
> Yes - we use live tracking tools to monitor all flights, ship arrivals, and train schedules. If your arrival time changes, we adjust your pickup automatically to ensure a smooth, stress-free transfer.

**Q5: What happens if my flight, ship or train is delayed?**
> We closely monitor your arrival and adjust your pickup time accordingly. For airport transfers, we include one hour of free waiting time, and we offer flexible waiting options for cruise, ferry and rail pickups.

**Q6: What vehicle types do you offer for transfers in Dorset?**
> Our fleet includes:
> - **Sedan** - Ford Mondeo or similar: Up to 3 passengers, 2 large suitcases + 2 small bags
> - **Executive Sedan** - Mercedes E-Class or similar: Up to 3 passengers, 2 large suitcases + 2 small bags
> - **MPV** - VW Caravelle or similar: Up to 6 passengers, 4-6 large suitcases + cabin bags
> - **Executive MPV** - Mercedes V-Class or similar: Up to 6 passengers, 5 large suitcases + 5 cabin bags

**Q7: Can you accommodate extra luggage or specialist equipment?**
> Yes. Our MPV and Executive MPV vehicles are perfect for passengers with additional luggage, cruise cases, sports equipment or bulky items. Just inform us when booking so we can allocate the right vehicle.

**Q8: Do you provide child seats for Dorset transfers?**
> Child seats are available upon request for all journeys, including airport and long-distance travel. Please tell us your requirements when booking so we can fit the appropriate seat.

**Q9: Are your drivers licensed, insured and DBS checked?**
> Yes - all drivers at The Dorset Transfer Company are fully licensed, DBS checked and commercially insured for private hire. Your safety, comfort and professionalism are always our priority.

**Q10: Do you offer corporate accounts or business travel packages?**
> Yes. We provide tailored corporate accounts, monthly invoicing options, and priority bookings for companies and frequent travellers. Ideal for regular airport runs, staff travel and executive journeys.

**Q11: Where will my driver meet me at the airport?**
> For all airport pickups, your driver will meet you in the arrivals hall at the designated meeting point, holding a clear name board. You'll also receive their contact details before landing.

**Q12: How much waiting time is included in airport pickups?**
> Airport transfers include 1 hour of free waiting time after your flight lands. This allows plenty of time for passport control, baggage collection and unexpected delays.

**Q13: Where do you pick up at cruise or ferry terminals?**
> We collect passengers from the official pickup zones at each UK cruise and ferry terminal. Your driver will confirm the exact location and meet you as you disembark for a smooth start to your transfer.

**Q14: What if my cruise ship docks earlier or later than scheduled?**
> We monitor all live docking updates. Whether your cruise arrives ahead of schedule or is delayed, your driver will adjust their arrival time and meet you when you're ready.

**Q15: Do you offer station-to-station transfers or onward journeys?**
> Yes - we provide transfers to and from all major UK railway stations. Whether you need a Dorset station transfer or an onward journey to a hotel, airport or cruise terminal, we'll get you there comfortably.

### Category 2: General Policies FAQs

**Q16: What is your cancellation policy?**
> We offer fair and flexible cancellation terms. Most bookings cancelled with reasonable notice receive a full refund. Please refer to our cancellation policy or contact us for journey-specific details.

**Q17: Can I request multiple stops or a customised route?**
> Yes - we can tailor any journey to your needs, including additional pickups, drop-offs or multi-stop itineraries. Simply let us know your requirements when booking.

**Q18: Do you operate 24/7?**
> Yes, our Dorset transfer service operates 24 hours a day, 7 days a week - ideal for early flights, late arrivals and time-critical business travel.

**Q19: How can I pay for my transfer?**
> We accept all major debit and credit cards and corporate invoicing for approved account holders. Payment can be made at the time of booking or securely in advance.

**Q20: Can I receive a receipt or invoice for business expenses?**
> Yes. We provide digital receipts and fully itemised invoices for all journeys - perfect for expense claims and corporate travel records.

**Q21: Do you offer meet-and-greet services?**
> Yes - professional meet-and-greet is included for airport arrivals and available upon request for ports and rail stations. Ideal for VIP guests and business clients.

**Q22: Can I book a return transfer at the same time?**
> Of course. You can book both legs of your journey in advance, and return transfers may qualify for discounted pricing.

**Q23: Do you offer long-distance or nationwide transfers?**
> Yes. We provide comfortable long-distance and cross-country travel, including business roadshows, intercity transfers and UK-wide corporate journeys.

**Q24: How do I contact my driver on the day of travel?**
> You'll receive your driver's name, vehicle details and contact number before your pickup. You can reach them directly, or contact our support team 24/7 for assistance.

**Q25: Can you accommodate special travel requests or accessibility needs?**
> Yes - we're happy to help with accessibility requirements, VIP arrangements, luggage support, or any bespoke requests. Simply let us know when booking so we can prepare the right vehicle and service.

---

## 7. Partner With Us Section

**Action**: KEEP AS IS

> Current section is "very good" - no changes required.

---

## 8. Ready To Go Section

### Current State ([page.tsx:494-517](../../app/page.tsx#L494))
- Title: "Ready to go?"
- Subtitle: "Get an instant quote for your airport transfer..."
- Buttons: "Get a Quote" + "Call Us" (hero-outline variant)
- Background: Soft gradient blobs

### Changes

| Action | Element | Notes |
|--------|---------|-------|
| KEEP | Section content | Text is good |
| **FIX** | "Call Us" button | **BUG**: White text on white/light background - invisible. Check `hero-outline` variant styling |
| ADD | Background image | Full-width black Mercedes E-Class image with opacity overlay so text remains legible |

### Background Image Spec
- **Subject**: Black Mercedes E-Class (UK variant - steering wheel on right)
- **Style**: Full-width background covering entire CTA section
- **Overlay**: Dark gradient overlay (e.g., `bg-black/60`) for text legibility
- **Source needed**: See [Image Assets Required](#11-image-assets-required)

---

## 9. Footer

### Current State ([page.tsx:521-560](../../app/page.tsx#L521))
- Logo
- 3 links: Services, Contact, Privacy
- Copyright text

### New Footer Design
Professional footer with company details and legal links.

### Company Details (Confirmed)
| Field | Value |
|-------|-------|
| Company Name | The Dorset Transfer Company |
| Registered Office | 383 Verity Crescent, Poole, England, BH17 8TS |
| Company Number | 16884513 |

### Footer Links

**Column 1: Navigation**
- Home
- Vehicles
- Services
- FAQ
- Pricing
- Contact

**Column 2: Legal**
- Terms & Conditions (needs page: `/terms`)
- Privacy Policy (needs page: `/privacy`)
- Cookie Policy (needs page: `/cookies`)
- Policies (needs page: `/policies`)
- Accessibility (needs page: `/accessibility`)
- Sitemap (needs page: `/sitemap`)

### Notes
- Legal pages need to be created (placeholder content initially)
- GDPR compliance for booking data collection

---

## 10. Services Page (NEW)

### Recommendation
Create a dedicated `/services` page with full cards for each of the 6 services.

- Homepage carousel acts as teaser (brief descriptions)
- Services page has expanded content, possibly with hero images per service

### File to Create
- `app/services/page.tsx`

### Content
Same 6 services as carousel, but with:
- Larger hero images per service
- Full copy (not truncated)
- CTA buttons linking to `/quote` or `/contact`

---

## 11. Image Assets Required

| Image | Description | Source |
|-------|-------------|--------|
| Mercedes E-Class (black, UK) | Ready to Go section background | **NEEDED** - Unsplash/stock |
| Sedan vehicle | Ford Mondeo or similar | Existing or source |
| Executive Sedan | Mercedes E-Class | Existing or source |
| MPV | VW Caravelle | Existing or source |
| Executive MPV | Mercedes V-Class | Existing or source |
| Service images (6) | Airports, Cruise, Rail, Chauffeur, Film/TV, Destinations | Existing carousel images or source |

### Suggested Free Sources (UK focus)
- [Unsplash](https://unsplash.com) - Search "mercedes uk", "luxury car uk"
- [Pexels](https://pexels.com) - Similar searches
- Must be: UK variant (right-hand drive), black preferred, professional setting

---

## 12. Implementation Plan

### Phase 1: Quick Wins (Homepage edits) - COMPLETED
1. [x] Navigation bar updates
2. [x] Hero section changes (delete badge, shorten tagline, rename buttons)
3. [x] Fix "Call Us" button visibility bug (added `outline-dark` variant)

### Phase 2: New Homepage Sections - COMPLETED
4. [x] Add Vehicles section (new carousel with 4 vehicles)
5. [x] Update Services carousel (6 services, deleted 4-box grid)
6. [x] Update Why Choose Us (8 items with checkmarks)

### Phase 3: Ready to Go + Footer - COMPLETED
7. [x] Add Mercedes background image to CTA section (E-class.webp)
8. [x] New footer with company details and legal links

### Phase 4: New Pages - COMPLETED
9. [x] Create `/faq` page (25 FAQs in accordion format)
10. [x] Create `/services` page (6 service cards with full descriptions)
11. [x] Create legal placeholder pages (`/terms`, `/privacy`, `/cookies`, `/accessibility`)

---

## Summary of All Clarifications (RESOLVED)

| Question | Answer |
|----------|--------|
| MPV capacity | 6 passengers, 4-6 large cases + cabin bags |
| PRICING nav link | Links to existing `/pricing` page |
| CONTACT nav link | Links to existing `/contact` page |
| Vehicles carousel | Full-width horizontal carousel with vehicle details |
| "Call Us" invisible | Bug - white text on light background |
| Car image | Source black Mercedes E-Class (UK variant) |
| Four boxes to delete | "Our services" 4-pillar grid section |
| Company details | Company #16884513, 383 Verity Crescent, Poole, BH17 8TS |

---

---

## 13. Implementation Summary (Dec 10, 2024)

### Completed Changes

**Homepage ([app/page.tsx](../../app/page.tsx))**
- Navigation: Added HOME, VEHICLES, FAQ links (desktop + mobile)
- Hero: Removed badge, shortened tagline, renamed buttons to "Quote" / "Contact"
- Hero: Removed 3 feature badges
- NEW: Vehicles section with carousel (4 vehicles)
- Services carousel: Updated to 6 services with new copy
- Deleted: "Our services" 4-box grid section
- Why Choose Us: Updated to 8 items with checkmark icons
- Footer: Complete redesign with company details, nav links, legal links

**New Pages Created**
- `/faq` ([app/faq/page.tsx](../../app/faq/page.tsx)) - 25 FAQs in collapsible accordion
- `/services` ([app/services/page.tsx](../../app/services/page.tsx)) - 6 service cards with full descriptions
- `/terms` ([app/terms/page.tsx](../../app/terms/page.tsx)) - Terms & Conditions
- `/privacy` ([app/privacy/page.tsx](../../app/privacy/page.tsx)) - Privacy Policy (UK GDPR compliant)
- `/cookies` ([app/cookies/page.tsx](../../app/cookies/page.tsx)) - Cookie Policy with tables
- `/accessibility` ([app/accessibility/page.tsx](../../app/accessibility/page.tsx)) - Accessibility statement

**Button Component ([components/ui/button.tsx](../../components/ui/button.tsx))**
- Added `outline-dark` variant for buttons on light backgrounds

### Pending Items
None - all items complete!

### Files Modified
- `app/page.tsx` - Main homepage
- `components/ui/button.tsx` - Button variants

### Files Created
- `app/faq/page.tsx` - FAQ page
- `app/services/page.tsx` - Services page
- `app/terms/page.tsx` - Terms & Conditions page
- `app/privacy/page.tsx` - Privacy Policy page
- `app/cookies/page.tsx` - Cookie Policy page
- `app/accessibility/page.tsx` - Accessibility page
