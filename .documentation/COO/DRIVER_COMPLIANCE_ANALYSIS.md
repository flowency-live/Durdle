# Driver & Vehicle Compliance Management - Platform Analysis

**Document Owner:** Crispin (COO - Durdle Platform)
**Client:** Dorset Transfer Company
**Date Created:** December 5, 2025
**Status:** Research & Recommendation
**Priority:** HIGH - Required before driver dispatch functionality

---

## Executive Summary

Driver and vehicle compliance is **more complex** than payment processing compliance. It involves:
- Personal Identifiable Information (PII) - GDPR high-risk
- Legal liability (dispatching unlicensed driver = criminal offense)
- Ongoing monitoring (licenses can be revoked mid-service)
- Multiple document types (8+ different checks)
- Regulatory reporting to licensing authorities

**Recommendation:** **DO NOT build this yourself.** Use existing compliance platforms and integrate via API. The liability and complexity are too high for a custom-built solution.

---

## Table of Contents

1. [Compliance Requirements Overview](#compliance-requirements-overview)
2. [Document Types Required](#document-types-required)
3. [Build vs Buy Analysis](#build-vs-buy-analysis)
4. [Existing Platform Options](#existing-platform-options)
5. [Recommended Architecture](#recommended-architecture)
6. [GDPR & Data Protection](#gdpr--data-protection)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Cost Analysis](#cost-analysis)

---

## Compliance Requirements Overview

### Legal Requirements for PHV Operators

**Your Legal Obligations (Under PHV Licensing):**

1. **Must NOT dispatch a driver/vehicle unless:**
   - Driver holds valid PHV driver license (from same authority)
   - Vehicle holds valid PHV vehicle license (from same authority)
   - Driver has valid UK driving license (not expired, not revoked)
   - Vehicle has valid MOT certificate (if >3 years old)
   - Vehicle has valid insurance (hire & reward coverage)
   - Driver has valid DBS check (Enhanced, <3 years old)
   - Driver has right to work in UK (immigration check)

2. **Must maintain records:**
   - Licensing authority can audit at any time
   - Must produce records within 7 days of request
   - Records must be accurate and up-to-date
   - Failure to maintain records = license revocation

3. **Ongoing monitoring:**
   - Driver license can be revoked (DUI, criminal conviction, complaints)
   - Insurance can lapse
   - MOT can fail (vehicle off road)
   - You must know about these events BEFORE dispatching

### Consequences of Non-Compliance

**If you dispatch an unlicensed/uninsured driver:**

| Violation | Consequence |
|-----------|-------------|
| Unlicensed driver | Criminal offense, fine up to £5,000, operator license revoked |
| No insurance | Criminal offense, fine up to £5,000, vehicle seized, operator license revoked |
| Expired MOT | Fine up to £1,000, vehicle off road |
| No DBS check | Safeguarding violation, operator license revoked, reputational damage |
| No right to work | Illegal employment, fine up to £20,000 per employee, criminal prosecution |

**Bottom Line:** This is **higher risk** than payment processing. You can survive a Stripe chargeback. You cannot survive dispatching an unlicensed driver who causes an accident.

---

## Document Types Required

### Per Driver (8 Documents)

| Document | Issuer | Validity | Renewal Frequency | PII Level | Verification Method |
|----------|--------|----------|-------------------|-----------|---------------------|
| **1. PHV Driver License** | Local council | 1-3 years | Annual/Triennial | HIGH (license no., address) | Manual check with council OR council API |
| **2. UK Driving License** | DVLA | 10 years (photo card) | 10 years | HIGH (license no., DOB, address) | DVLA API (ViewDrivingLicence) OR manual check |
| **3. DBS Certificate** | Disclosure & Barring Service | 3 years (recommended) | Every 3 years | VERY HIGH (criminal record) | Cannot be stored (view once only) |
| **4. Right to Work** | Home Office | Varies (passport/visa) | Ongoing | VERY HIGH (passport no., immigration status) | Home Office Online Checking Service |
| **5. Proof of Address** | Utility/bank | 3 months | As needed | MEDIUM (address) | Manual verification |
| **6. National Insurance Number** | HMRC | Lifetime | Never | HIGH (NI number) | Manual entry + payroll verification |
| **7. Professional Qualifications** | Various (e.g., NVQ) | Varies | Varies | LOW | Certificate verification |
| **8. Medical Certificate** | GP/Occupational Health | 5 years (or annually if >65) | 5 years | HIGH (medical conditions) | GP letter verification |

### Per Vehicle (4 Documents)

| Document | Issuer | Validity | Renewal Frequency | PII Level | Verification Method |
|----------|--------|----------|-------------------|-----------|---------------------|
| **1. PHV Vehicle License** | Local council | 1 year | Annual | MEDIUM (registration) | Manual check with council OR council API |
| **2. MOT Certificate** | DVSA (test center) | 1 year | Annual | LOW | DVSA MOT History API (free) |
| **3. Vehicle Insurance** | Insurance provider | 1 year | Annual | MEDIUM (policy no., registration) | AskMID API (Motor Insurance Database) |
| **4. V5C (Logbook)** | DVLA | Lifetime | On ownership change | MEDIUM (registration, keeper) | Manual verification |

**Total:** 12 document types per driver/vehicle combination

**Challenge:** If you have 10 drivers and 10 vehicles, that's **80+ documents** to track, with staggered expiry dates.

---

## Build vs Buy Analysis

### Option 1: Build It Yourself (NOT RECOMMENDED)

#### What You'd Need to Build

**Backend Infrastructure:**
1. **Document storage** (S3 with encryption)
2. **Document upload API** (presigned URLs, virus scanning)
3. **OCR/parsing** (extract license numbers, expiry dates from images)
4. **Expiry tracking** (database schema + cron jobs for alerts)
5. **Verification workflows** (admin approves each document)
6. **Audit trail** (who viewed what, when)
7. **GDPR compliance** (encryption, access controls, deletion workflows)

**External API Integrations:**
1. **DVLA API** (driving license verification) - £0.10-0.30 per check
2. **DVSA MOT API** (free, but rate-limited)
3. **AskMID API** (insurance verification) - £1-3 per check
4. **Home Office API** (right to work checks) - free but complex
5. **Council APIs** (PHV license verification) - varies by council, many don't have APIs

**Admin Interface:**
1. **Driver onboarding flow** (upload all documents)
2. **Document review interface** (approve/reject)
3. **Compliance dashboard** (expiry alerts, renewal reminders)
4. **Audit log viewer** (regulatory compliance)
5. **Reporting** (licensing authority audits)

**Ongoing Maintenance:**
1. **API changes** (DVLA, Home Office, councils)
2. **Regulatory changes** (new document requirements)
3. **Security patches** (document storage vulnerabilities)
4. **GDPR compliance** (data subject access requests, deletion requests)

#### Cost Estimate (Build Yourself)

| Item | Effort | Cost (Developer Time) |
|------|--------|----------------------|
| Initial development (3 months) | 480 hours | £48,000 (£100/hr) |
| External API integration | 80 hours | £8,000 |
| GDPR compliance implementation | 40 hours | £4,000 |
| Admin interface | 120 hours | £12,000 |
| Testing & QA | 80 hours | £8,000 |
| **Total Initial Cost** | **800 hours** | **£80,000** |
| **Ongoing Maintenance** | 40 hours/month | £4,000/month |

#### Risks (Build Yourself)

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|-----------|
| **Dispatch unlicensed driver** | License revocation, criminal prosecution | HIGH (manual process, human error) | Automated checks before dispatch |
| **GDPR breach** (leaked driver data) | ICO fine up to £17M, reputational damage | MEDIUM (complex security requirements) | Encryption, access controls, audits |
| **Failed audit** (licensing authority) | License suspension/revocation | HIGH (missing documents, poor record-keeping) | Comprehensive audit trail |
| **API downtime** (DVLA, Home Office) | Cannot verify drivers, operations halted | MEDIUM (third-party APIs unreliable) | Fallback to manual checks |
| **Outdated compliance** (regulatory changes) | Legal violations | MEDIUM (PHV regulations change) | Regular legal review (£££) |

**Verdict:** ❌ **DO NOT BUILD YOURSELF**
- Too complex, too risky, too expensive
- You are not a compliance platform, you are a transport booking platform
- Focus on core product, outsource compliance to specialists

---

### Option 2: Use Existing Compliance Platforms (RECOMMENDED)

#### Available Platforms (UK Transport Market)

**1. Passenger (by Passenger Technologies)**
**Website:** https://passenger.app/
**Status:** Leading platform, used by Uber, Bolt, Addison Lee

**Features:**
- Driver document management (all 12 types)
- Automated expiry tracking + SMS/email alerts
- Integration with DVLA, DVSA, Home Office APIs
- Right to work checks (immigration status)
- DBS application + tracking
- Vehicle compliance (MOT, insurance, PHV license)
- Audit-ready reporting for licensing authorities
- Mobile app for drivers (upload docs via phone)
- API for integration with dispatch systems

**Pricing:** £5-15 per driver per month (volume discounts)

**API:** Yes, RESTful API for checking driver compliance status

**GDPR:** ISO 27001 certified, GDPR compliant, UK data residency

**Pros:**
- Industry standard (recognized by licensing authorities)
- Handles all compliance types
- Automatic API checks (DVLA, DVSA, AskMID)
- Mobile app for driver self-service
- Reduces admin burden by ~80%

**Cons:**
- Monthly per-driver cost
- Lock-in (switching costs high)
- API dependency (if Passenger down, cannot verify compliance)

---

**2. iCabbi Compliance**
**Website:** https://www.icabbi.com/
**Status:** Established dispatch + compliance platform

**Features:**
- Full driver/vehicle compliance management
- Integrated with iCabbi dispatch system
- PHV license tracking
- DBS checks
- Insurance + MOT tracking
- Works with UK councils

**Pricing:** £3-10 per driver per month (part of iCabbi subscription)

**API:** Yes, but designed for iCabbi ecosystem

**Pros:**
- All-in-one (dispatch + compliance)
- Established relationship with UK councils
- Lower cost if using full iCabbi platform

**Cons:**
- Requires using iCabbi dispatch (you're building your own)
- Less flexible API for standalone use
- May not integrate well with custom platform

---

**3. CheckedSafe**
**Website:** https://checkedsafe.com/
**Status:** Compliance-focused, used by care sector + transport

**Features:**
- DBS checks (application + tracking)
- Right to work checks
- Document expiry tracking
- Training compliance (driver CPC, etc.)
- API for integration

**Pricing:** £2-8 per worker per month

**API:** Yes, RESTful API

**Pros:**
- Focused on compliance (not dispatch)
- Works across industries (transport, care, hospitality)
- Good for multi-industry platform
- Lower cost than Passenger

**Cons:**
- Less transport-specific (no council PHV license integration)
- Requires more manual council checks
- Smaller company (higher risk of shutdown)

---

**4. Onfido (Identity Verification)**
**Website:** https://onfido.com/
**Status:** Leading identity verification platform (used by Revolut, Monzo)

**Features:**
- Driving license verification (OCR + DVLA API)
- Passport verification
- Biometric face matching (selfie vs ID)
- Right to work checks
- AML (Anti-Money Laundering) checks
- Global coverage

**Pricing:** £1-5 per verification check (one-time)

**API:** Yes, comprehensive RESTful API

**Pros:**
- Best-in-class identity verification
- Real-time checks (seconds, not days)
- High accuracy (OCR + API verification)
- Used by major fintech companies
- Pay-per-check (no monthly fees)

**Cons:**
- Does NOT handle PHV license verification (councils not integrated)
- Does NOT track document expiry (one-time check only)
- Does NOT handle DBS checks (identity only)
- Requires building your own expiry tracking system

---

**5. Build Hybrid: Onfido + Custom Expiry Tracking**

**Architecture:**
- **Onfido:** Driver onboarding (verify identity, driving license, right to work)
- **Custom system:** Store expiry dates, track renewals, alert admins
- **Manual process:** PHV license verification (until council APIs available)
- **DVSA API:** MOT checks (free)
- **AskMID API:** Insurance checks (paid)

**Pros:**
- Lower ongoing cost (pay-per-check vs monthly subscription)
- Flexibility (own your data)
- Best-in-class identity verification
- Can switch providers later

**Cons:**
- Still requires building expiry tracking (medium complexity)
- Manual PHV license checks (admin burden)
- No DBS integration (must use DBS Update Service separately)
- Higher development effort than full-service platform

---

## Recommended Architecture

### Phase 1 (MVP) - Manual Process with Tracking

**Recommended for:** First 3-6 months, <20 drivers

**What to Build:**
1. **Document storage** (S3 + DynamoDB tracking)
2. **Basic expiry tracking** (alert admin 30 days before expiry)
3. **Manual verification workflow** (admin reviews and approves)

**Cost:** £2,000-5,000 development + £0/month ongoing

**Admin Process:**
1. Driver uploads documents via admin portal
2. Admin reviews each document manually
3. Admin enters expiry dates into system
4. System sends email alerts before expiry
5. Admin manually checks DVSA MOT API + AskMID (basic automation)

**Pros:**
- Low cost for MVP
- No vendor lock-in
- Full control

**Cons:**
- Manual admin burden (1-2 hours per driver onboarding)
- Human error risk (wrong expiry date entered)
- No real-time verification (documents could be fake)
- Doesn't scale beyond ~20 drivers

**Verdict:** ✅ **Good for MVP**, but plan to upgrade to Phase 2 within 6 months

---

### Phase 2 (Scale) - Hybrid Onfido + Custom Tracking

**Recommended for:** 20-100 drivers

**Architecture:**

```
Driver Onboarding:
1. Driver submits driving license photo via mobile
   ↓
2. Onfido API verifies license (OCR + DVLA check)
   ↓
3. System extracts expiry date automatically
   ↓
4. Driver submits PHV license photo
   ↓
5. Admin manually verifies PHV license with council (no API yet)
   ↓
6. System stores expiry dates in DynamoDB
   ↓
7. Cron job checks expiries daily, sends alerts

Vehicle Compliance:
1. Admin enters vehicle registration
   ↓
2. System calls DVSA MOT API (free, automated)
   ↓
3. System calls AskMID API (insurance check, paid)
   ↓
4. System stores MOT/insurance expiry dates
   ↓
5. Cron job checks expiries daily, sends alerts
```

**What to Build:**
1. **Onfido integration** (identity + driving license verification)
2. **DVSA MOT API integration** (free, automated vehicle checks)
3. **AskMID API integration** (insurance verification)
4. **Expiry tracking system** (DynamoDB + Lambda cron jobs)
5. **Alert system** (email/SMS to admin + driver 30 days before expiry)
6. **Dispatch blocker** (cannot assign expired driver/vehicle to booking)

**Cost:**
- Development: £10,000-15,000
- Onfido: £2-5 per driver verification (one-time)
- AskMID: £1-3 per insurance check (annual)
- AWS: £10-20/month (Lambda, DynamoDB, SES)

**Pros:**
- Automated identity verification (reduces fraud)
- Real-time driving license checks (DVLA API via Onfido)
- Automated MOT checks (free)
- Lower ongoing cost than Passenger (no monthly per-driver fees)
- Scalable to 100+ drivers

**Cons:**
- Still requires manual PHV license verification (admin time)
- No DBS integration (must use DBS Update Service separately)
- Development effort (2-3 weeks)

**Verdict:** ✅ **Best balance of cost, automation, and flexibility**

---

### Phase 3 (Enterprise) - Full Compliance Platform

**Recommended for:** 100+ drivers, multiple locations

**Solution:** Passenger or iCabbi Compliance

**Cost:** £5-15 per driver per month + integration effort (£5,000-10,000)

**What You Get:**
- Full automation (DVLA, DVSA, AskMID, Home Office APIs)
- PHV license tracking (partnerships with councils)
- DBS application + tracking
- Mobile app for drivers
- Audit-ready reporting
- 24/7 support

**Pros:**
- Zero admin burden (drivers manage own docs via app)
- Real-time compliance status (API integration)
- Licensing authority recognized (audit-ready)
- Reduces compliance staff costs (no need for compliance manager)

**Cons:**
- High ongoing cost (£1,500/month for 100 drivers)
- Vendor lock-in
- API dependency

**Verdict:** ✅ **Required at scale** (100+ drivers), but not needed for MVP

---

## GDPR & Data Protection

### Data Classification

| Data Type | Classification | Storage | Retention | Encryption | Access |
|-----------|----------------|---------|-----------|------------|--------|
| Driver name, DOB | PII (Personal) | DynamoDB | 7 years (financial records) | At rest + in transit | Admin + driver (self) |
| Driving license number | PII (Sensitive) | DynamoDB | 7 years | At rest + in transit | Admin only |
| Passport/visa | PII (Very Sensitive) | S3 (encrypted) | Duration of employment + 2 years | At rest + in transit + client-side | Admin only |
| DBS certificate | Special Category (Criminal) | CANNOT STORE | N/A (view once) | N/A | Admin (one-time view) |
| Medical certificate | Special Category (Health) | S3 (encrypted) | Duration of employment + 2 years | At rest + in transit | Admin only |
| National Insurance number | PII (Sensitive) | DynamoDB (encrypted field) | 7 years (tax records) | At rest + in transit | Admin only |
| Document images (license, insurance) | PII (Personal) | S3 (encrypted) | Duration of employment + 2 years | At rest + in transit | Admin + driver (self) |
| Vehicle registration | Non-PII | DynamoDB | 7 years | At rest (best practice) | Admin + driver |

### Legal Basis for Processing (GDPR Article 6)

| Data Type | Legal Basis | Justification |
|-----------|-------------|---------------|
| Driver license details | Legal obligation (Art. 6(1)(c)) | PHV licensing regulations require verification |
| Right to work checks | Legal obligation (Art. 6(1)(c)) | Immigration Act 2016 requires employer checks |
| DBS checks | Legal obligation (Art. 6(1)(c)) | PHV licensing regulations require DBS for drivers |
| Medical certificate | Legal obligation (Art. 6(1)(c)) | PHV licensing regulations require medical fitness |
| Insurance/MOT | Legal obligation (Art. 6(1)(c)) | Road Traffic Act 1988 requires insurance/MOT |
| Document images | Legitimate interests (Art. 6(1)(f)) | Audit trail for licensing authority compliance |

**Special Category Data (GDPR Article 9):**
- DBS certificate (criminal records): Art. 9(2)(b) - employment/social security law
- Medical certificate (health data): Art. 9(2)(b) - employment law

### GDPR Compliance Requirements

#### 1. Data Minimization
**Principle:** Only collect data you actually need.

**Implementation:**
- ❌ Do NOT store full DBS certificate (only record "DBS check passed on [date]")
- ❌ Do NOT store full passport images (only verify and record "Right to work confirmed on [date]")
- ✅ Store license numbers and expiry dates (needed for ongoing compliance)
- ✅ Store document images for audit trail (licensing authority requirement)

#### 2. Storage Limitation
**Principle:** Don't keep data longer than necessary.

**Implementation:**
| Data Type | Retention Period | Deletion Trigger |
|-----------|------------------|------------------|
| Employment records | 7 years after employment ends | Automatic deletion via DynamoDB TTL |
| Financial records | 7 years (HMRC requirement) | Manual review after 7 years |
| Document images | 2 years after employment ends | Automatic S3 lifecycle policy |
| DBS check result | Duration of employment + 2 years | Automatic deletion |
| Right to work check | Duration of employment + 2 years | Automatic deletion |

#### 3. Security Measures
**Required:**
- [x] Encryption at rest (S3 + DynamoDB)
- [x] Encryption in transit (TLS 1.2+)
- [x] Access controls (IAM roles, admin-only access)
- [x] Audit logging (who accessed what, when)
- [x] Secure document upload (presigned URLs, virus scanning)
- [ ] Pseudonymization (mask license numbers in logs)
- [ ] Regular security audits (annual penetration testing)

#### 4. Data Subject Rights
**Drivers can request:**

| Right | Implementation | Timeline |
|-------|----------------|----------|
| **Access** (copy of all data) | Lambda function exports all driver data to JSON | 30 days |
| **Rectification** (correct errors) | Admin portal allows driver to update personal details | Immediate |
| **Erasure** (right to be forgotten) | Deletion workflow (anonymize employment records, delete documents) | 30 days |
| **Portability** (data export) | JSON export of all driver data | 30 days |
| **Object** (opt-out of processing) | Cannot opt-out (legal obligation) | N/A |
| **Restrict processing** | Mark driver as "inactive" (no new bookings assigned) | Immediate |

**Exception:** Cannot fully delete employment records for 7 years (HMRC requirement). Can anonymize personal data while retaining financial records.

#### 5. Data Processor Agreements (DPAs)

**Required with:**
- **Onfido** (if using for identity verification) - processes driving license, passport data
- **Passenger** (if using for compliance) - processes all driver/vehicle data
- **AWS** (infrastructure provider) - stores all data
- **Email provider (SES)** - sends alerts with driver names
- **SMS provider (SNS)** - sends alerts with driver names

**DPA Must Include:**
- Data processing purpose and scope
- Data retention period
- Security measures
- Sub-processor list
- Data breach notification (within 24 hours)
- Data deletion on contract termination

**Note:** AWS provides standard DPA (AWS Customer Agreement). Onfido/Passenger provide DPAs on request.

#### 6. Privacy Policy Updates

**Add to Privacy Policy:**
```
Driver Compliance Data

We collect and process driver compliance information to fulfill our legal obligations
as a Private Hire Vehicle operator under [Local Authority] licensing regulations.

Data Collected:
- Driving license details (number, expiry date, license photo)
- PHV driver license details (number, expiry date)
- Right to work documentation (passport/visa number, expiry date)
- DBS check status (date checked, result)
- Vehicle compliance (MOT status, insurance details, PHV vehicle license)
- Medical fitness certificate (date, GP confirmation)

Legal Basis: Legal obligation (GDPR Article 6(1)(c))

Data Retention:
- Employment records: 7 years after employment ends (HMRC requirement)
- Document images: 2 years after employment ends (audit trail)
- DBS check status: Duration of employment only (cannot store certificate)

Sharing:
- Licensing authority (upon request for audit)
- Insurance provider (in event of accident claim)
- HMRC (for tax compliance)
- Data processors: AWS (hosting), [Onfido/Passenger] (verification)

Your Rights:
- Access your data (30-day response time)
- Correct errors in your data
- Request deletion (with 7-year financial record exception)
- Export your data (JSON format)

Contact: compliance@dorsettransfercompany.co.uk
```

---

## Implementation Roadmap

### Immediate (Phase 1 - MVP)

**Timeline:** 2-4 weeks
**Goal:** Manual compliance tracking for first 5-10 drivers

**Tasks:**
- [ ] Create DynamoDB table: `durdle-driver-compliance-dev`
  ```
  PK: DRIVER#{driverId}
  SK: DOC#{documentType}

  Attributes:
  - documentType: string (driving_license, phv_license, dbs_check, etc.)
  - documentUrl: string (S3 URL to document image)
  - licenseNumber: string (encrypted)
  - issueDate: string (ISO 8601)
  - expiryDate: string (ISO 8601)
  - status: string (valid | expiring_soon | expired | pending_review)
  - verifiedBy: string (admin username)
  - verifiedAt: string (ISO 8601)
  - notes: string (admin notes)
  ```

- [ ] Create S3 bucket: `durdle-driver-documents-dev`
  - Encryption: AES-256
  - Versioning: Enabled
  - Public access: Blocked
  - Lifecycle: Delete after 7 years
  - CORS: Admin portal only

- [ ] Create Lambda: `driver-documents-upload-dev`
  - Generate presigned URLs for document upload
  - Virus scanning (ClamAV or AWS Macie)
  - Store metadata in DynamoDB

- [ ] Create Lambda: `driver-compliance-check-dev`
  - Cron job (daily, 9am)
  - Query all drivers with documents expiring in 30 days
  - Send email alerts to admin + driver
  - Mark status as "expiring_soon"

- [ ] Admin portal page: `/admin/drivers`
  - List all drivers
  - View compliance status (color-coded: green/amber/red)
  - Upload documents
  - View document history

- [ ] Admin portal page: `/admin/drivers/[driverId]/compliance`
  - Full compliance checklist (8 documents per driver)
  - Upload interface
  - Manual verification (admin approves)
  - Expiry date tracking
  - Renewal reminders

**Cost:** £3,000-5,000 development + £0/month ongoing

---

### Short-Term (Phase 2 - Hybrid Automation)

**Timeline:** 6-12 weeks
**Goal:** Automated verification for driving license, MOT, insurance

**Tasks:**
- [ ] Integrate Onfido API
  - Driver submits license photo via mobile
  - Onfido verifies + extracts expiry date
  - Store result in DynamoDB
  - Cost: £2-5 per driver (one-time)

- [ ] Integrate DVSA MOT API
  - Admin enters vehicle registration
  - Lambda calls DVSA API automatically
  - Store MOT expiry date
  - Daily cron job checks MOT status
  - Cost: Free (rate-limited to 100 requests/hour)

- [ ] Integrate AskMID API (insurance verification)
  - Admin enters vehicle registration
  - Lambda calls AskMID API
  - Store insurance expiry date
  - Cost: £1-3 per check (annual)

- [ ] Implement dispatch blocker
  - Before assigning driver/vehicle to booking
  - Check compliance status in DynamoDB
  - If any document expired → Block assignment + alert admin
  - UI: Red warning banner "Driver license expired on [date]"

- [ ] SMS alerts (optional)
  - Send SMS to driver 7 days before expiry
  - Use AWS SNS (£0.05 per SMS)

**Cost:** £10,000-15,000 development + £50-100/month ongoing (API fees)

---

### Long-Term (Phase 3 - Full Automation)

**Timeline:** 6-12 months (when >50 drivers)
**Goal:** Zero-touch compliance management

**Options:**

**Option A: Integrate Passenger**
- API integration (4-6 weeks development)
- Driver onboarding via Passenger mobile app
- Automated verification (DVLA, DVSA, AskMID, Home Office)
- DBS application + tracking
- Cost: £5-15 per driver per month + £5,000 integration

**Option B: Continue with Hybrid (if cost-sensitive)**
- Add Home Office API integration (right to work checks)
- Add DBS Update Service integration
- Build mobile app for drivers (React Native)
- Cost: £20,000-30,000 development + £20-50/month ongoing

**Recommendation:** Option A (Passenger) if >50 drivers. Option B if cost-sensitive or want full control.

---

## Cost Analysis

### Total Cost of Ownership (3 Years)

**Scenario: 20 drivers, 15 vehicles**

#### Option 1: Build Everything Yourself
```
Year 1:
- Development: £80,000
- API fees (Onfido, AskMID): £1,000
- AWS infrastructure: £500
- Total Year 1: £81,500

Year 2-3:
- Maintenance: £48,000/year
- API fees: £1,000/year
- AWS infrastructure: £500/year
- Total Year 2-3: £99,000

3-Year Total: £180,500
Cost per driver per month: £250
```
**Verdict:** ❌ Too expensive

---

#### Option 2: Phase 1 (Manual) → Phase 2 (Hybrid)
```
Phase 1 (Months 1-6):
- Development: £5,000
- API fees: £0
- AWS infrastructure: £50
- Admin time: 20 hours/month × £30/hour × 6 months = £3,600
- Total Phase 1: £8,650

Phase 2 (Months 7-36):
- Development: £15,000
- Onfido: 20 drivers × £5 = £100 (one-time)
- AskMID: 15 vehicles × £3/year = £45/year
- AWS infrastructure: £50/month × 30 months = £1,500
- Admin time (reduced): 5 hours/month × £30/hour × 30 months = £4,500
- Total Phase 2: £21,145

3-Year Total: £29,795
Cost per driver per month: £41
```
**Verdict:** ✅ **Best value for MVP to scale**

---

#### Option 3: Passenger from Day 1
```
Year 1-3:
- Integration development: £10,000 (one-time)
- Passenger fees: 20 drivers × £10/month × 36 months = £7,200
- AWS infrastructure: £20/month × 36 months = £720
- Admin time (minimal): 1 hour/month × £30/hour × 36 months = £1,080

3-Year Total: £19,000
Cost per driver per month: £26
```
**Verdict:** ✅ **Best if >50 drivers from start**, but overkill for MVP

---

### Recommended Approach: Phased Investment

**Phase 1 (MVP):** Manual process (£8,650 over 6 months)
- Low risk, low cost, fast to implement
- Acceptable admin burden for <10 drivers

**Phase 2 (Scale):** Hybrid automation (£15,000 + £100/month)
- Reduce admin burden by 75%
- Scales to 50 drivers
- Pay-as-you-go API costs

**Phase 3 (Enterprise):** Passenger integration (£10,000 + £200/month for 20 drivers)
- Zero admin burden
- Required at scale (>50 drivers)

**3-Year Total:** £29,795 (assumes starting small, scaling up)

---

## COO Recommendation

### ✅ Recommended Strategy: Phased Approach

**Phase 1 (Now - 6 months):** Build basic manual tracking
- Store documents in S3
- Track expiry dates in DynamoDB
- Manual admin verification
- Email alerts for expiries
- **Cost:** £5,000 + 20 hours/month admin time
- **Good for:** First 10 drivers

**Phase 2 (6-12 months):** Add automated verification
- Integrate Onfido (driving license verification)
- Integrate DVSA MOT API (vehicle checks)
- Integrate AskMID (insurance checks)
- Automated expiry tracking + alerts
- **Cost:** £15,000 + £100/month
- **Good for:** 10-50 drivers

**Phase 3 (12+ months):** Migrate to Passenger (if scaling)
- Full compliance automation
- Driver mobile app
- DBS tracking
- Council PHV license integration
- **Cost:** £10,000 integration + £10/driver/month
- **Good for:** 50+ drivers

### Key Decision Points

**When to trigger Phase 2:**
- More than 10 active drivers
- Admin spending >20 hours/month on compliance
- Document expiries being missed (operational risk)

**When to trigger Phase 3:**
- More than 50 drivers
- Multiple vehicle types/locations
- Licensing authority audit risk (large operator)
- Admin team overwhelmed (>40 hours/month on compliance)

### What NOT to Do

❌ **Don't build full compliance platform yourself** (£80k+, too complex)
❌ **Don't ignore compliance** (license revocation risk)
❌ **Don't store DBS certificates** (GDPR violation + illegal)
❌ **Don't skip DVLA verification** (fake licenses are common)
❌ **Don't dispatch with expired documents** (criminal offense)

---

## Next Steps

### Immediate (This Week)

**Owner:** Crispin (COO)

- [ ] **Discuss with Dorset Transfer Company:**
  - How many drivers currently? (determines starting phase)
  - How are compliance documents currently tracked? (spreadsheet/paper/nothing?)
  - Who manages driver compliance today? (owner/admin/no one?)
  - What is current process when license expires? (reactive or proactive?)

- [ ] **Review current driver records:**
  - Do all drivers have valid PHV licenses? (audit risk)
  - Are expiry dates known and tracked?
  - Are any documents expired? (urgent fix needed)

- [ ] **Assess immediate risk:**
  - Any drivers with unknown expiry dates → URGENT: obtain and verify
  - Any vehicles with expired MOT/insurance → URGENT: off-road immediately

---

### Short-Term (2-4 Weeks)

**Owner:** Development Team

- [ ] **Implement Phase 1 (manual tracking):**
  - DynamoDB table for compliance tracking
  - S3 bucket for document storage
  - Admin portal for document upload
  - Basic expiry tracking (30-day email alerts)
  - Compliance dashboard (red/amber/green status)

- [ ] **Create compliance checklist template:**
  - 8 documents per driver
  - 4 documents per vehicle
  - Printable checklist for onboarding

---

### Medium-Term (3-6 Months)

**Owner:** Crispin (COO)

- [ ] **Evaluate Phase 2 triggers:**
  - Review admin time spent on compliance
  - Assess driver growth trajectory
  - Cost-benefit analysis of automation

- [ ] **If triggered, implement Phase 2:**
  - Onfido integration (driving license verification)
  - DVSA/AskMID integration (vehicle compliance)
  - Automated dispatch blocker

---

## Questions for Dorset Transfer Company

**Please answer these questions to inform implementation:**

1. **Current Driver Count:**
   - How many drivers do you currently have?
   - How many do you expect to have in 12 months?

2. **Current Compliance Process:**
   - How do you track driver/vehicle compliance today?
   - Who is responsible for checking expiry dates?
   - How often do you review compliance? (daily/weekly/monthly/never)

3. **Current Compliance Status:**
   - Do you have copies of all driver licenses on file?
   - Do you know all expiry dates?
   - Are any documents currently expired?
   - When was the last licensing authority audit?

4. **Risk Assessment:**
   - Have you ever dispatched a driver with expired documents? (honest answer, no judgment)
   - Have you ever had a compliance issue with licensing authority?
   - What is your biggest compliance concern?

5. **Budget:**
   - What monthly budget can you allocate for compliance management?
   - Would you prefer lower upfront cost (manual) or lower ongoing admin time (automated)?

6. **Admin Capacity:**
   - How many admin hours per week can be dedicated to compliance?
   - Do you have a dedicated compliance officer, or is it ad-hoc?

---

## References

### Regulatory Guidance

- **PHV Licensing:** https://www.gov.uk/private-hire-vehicle-licences
- **DBS Checks:** https://www.gov.uk/dbs-check-applicant-criminal-record
- **Right to Work:** https://www.gov.uk/prove-right-to-work
- **DVSA (MOT Checks):** https://www.gov.uk/check-mot-history
- **AskMID (Insurance):** https://ownvehicle.askmid.com/

### APIs & Platforms

- **DVLA ViewDrivingLicence API:** https://www.gov.uk/view-driving-licence
- **DVSA MOT History API:** https://dvsa.github.io/mot-history-api-documentation/
- **Home Office Right to Work:** https://www.gov.uk/employee-immigration-employment-status
- **Onfido:** https://onfido.com/
- **Passenger:** https://passenger.app/
- **iCabbi:** https://www.icabbi.com/
- **CheckedSafe:** https://checkedsafe.com/

### Internal Documentation

- [Security & Compliance](../SecurityCompliance.md)
- [COO Actions - Payment Processing](./COO_Actions.md)
- [Technical Architecture](../TechnicalArchitecture.md)
- [Database Schema](../DatabaseSchema.md)

---

**END OF DOCUMENT**

---

*This document represents research and recommendations. Consult with legal and compliance advisors before making final decisions on compliance management strategy.*
