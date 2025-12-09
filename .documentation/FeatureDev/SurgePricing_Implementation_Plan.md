# Surge Pricing Calendar - Implementation Plan

**Feature ID:** PRICING-002
**Priority:** P2 (HIGH)
**Effort:** M (1-2 weeks)
**Owner:** CTO
**Status:** Ready for Development
**Created:** December 8, 2025
**Type:** FULLSTACK (Admin UI + Backend + Quote Integration)

---

## Executive Summary

Add surge pricing functionality allowing admins to set price multipliers for specific dates/times (bank holidays, Christmas, school holidays, weekends). The surge is applied transparently at quote time.

**Business Value:**
- Revenue optimization during peak demand periods
- Prepare pricing strategy in advance (Christmas, New Year, Easter)
- Balance supply and demand (fewer drivers available = higher prices)
- Competitive with Uber/Bolt pricing models

**Technical Complexity:** Medium
- New DynamoDB table for surge rules
- Modify `quotes-calculator` to check surge rules
- Admin calendar UI for rule management
- Decision required on customer-facing messaging

---

## Design Decisions (CEO Input - Dec 8, 2025)

### Q1: How should admin set surge pricing?
**Decision:** Rule-First approach with stacking capability

Admin creates named rules (e.g., "Christmas Week", "Christmas Day") that can stack:
- Christmas Week: 1.5x
- Christmas Day (on top): 1.5x
- **Result: 1.5 × 1.5 = 2.25x**

Real-world example:
- August School Holidays: 1.25x (4 weeks)
- August Bank Holiday Monday: 1.5x (specific date)
- **Result: 1.25 × 1.5 = 1.875x**

---

### Q2: What rule types are needed?
**Decision:** All four types required
- [x] Specific dates (Dec 25, Dec 26)
- [x] Date ranges (Dec 20 - Jan 3)
- [x] Recurring day-of-week (every Friday, Saturday)
- [x] Time-of-day restrictions (evenings only 6pm-midnight)

---

### Q3: Multiplier options?
**Decision:** Both pre-defined AND custom

- Quick-select buttons: 1.1x, 1.25x, 1.5x, 1.75x, 2.0x
- Custom input: any value 1.0 - 3.0
- Combined/stacked result capped at 3.0x max

---

### Q4: When multiple rules overlap?
**Decision:** Stack multipliers with warning

- Rules STACK (multiply together)
- Admin sees warning: "Multiple rules apply - combined multiplier: 2.25x"
- Clear UI showing which rules contribute
- Final multiplier capped at 3.0x

---

### Q5: Pre-defined templates?
**Decision:** All ready to apply with one click

- [x] UK Bank Holidays 2025 (auto-add all 8 dates)
- [x] UK Bank Holidays 2026 (auto-add all 8 dates)
- [x] School Holidays - Dorset (council dates)
- [x] Christmas Period (Dec 20 - Jan 3)
- [x] Summer Peak (July/August weekends)

---

### Customer Visibility
**Decision:** Subtle "Peak period pricing" banner

- Quote response includes `isPeakPricing: boolean`
- Frontend shows amber banner: "Peak period pricing applies for this date"
- Does NOT show the multiplier amount
- Builds trust without feeling aggressive

---

## Work Breakdown

### Backend (3-4 days)

| Task | Description | Lambda |
|------|-------------|--------|
| B1 | Create DynamoDB table schema | N/A |
| B2 | Add surge CRUD endpoints | `pricing-manager` |
| B3 | Integrate surge check into quote calculation | `quotes-calculator` |
| B4 | Add structured logging for surge events | Both |

### Frontend - Admin Only (4-5 days)

| Task | Description | Page |
|------|-------------|------|
| F1 | Surge calendar page with month view | `/admin/pricing/surge` |
| F2 | Add/edit surge rule modal | Component |
| F3 | Bulk date selection (range picker) | Component |
| F4 | Pre-defined templates dropdown | Component |
| F5 | Visual indicators (color-coded dates) | Calendar |

### Frontend - Customer Quote (1 day)

| Task | Description | Page |
|------|-------------|------|
| F6 | Display "Peak period pricing" banner | Quote result |

---

## Backend Implementation

### DynamoDB Table: `durdle-surge-pricing-dev`

```
Table Name: durdle-surge-pricing-dev
Partition Key: PK (String)
Sort Key: SK (String)

Access Patterns:
1. Get all surge rules: PK = "SURGE", SK begins_with "RULE#"
2. Get rules for date range: GSI on startDate/endDate
3. Get rule by ID: PK = "SURGE", SK = "RULE#{ruleId}"
```

**Item Schema:**

```typescript
interface SurgeRule {
  PK: string;              // "SURGE"
  SK: string;              // "RULE#{ruleId}"
  ruleId: string;          // UUID

  // Rule definition
  name: string;            // "Christmas Period", "Bank Holiday Monday"
  ruleType: 'specific_dates' | 'day_of_week' | 'date_range';

  // For specific_dates: ["2025-12-25", "2025-12-26"]
  // For day_of_week: ["friday", "saturday", "sunday"]
  // For date_range: use startDate/endDate
  dates?: string[];
  daysOfWeek?: string[];
  startDate?: string;      // ISO date "2025-12-20"
  endDate?: string;        // ISO date "2026-01-03"

  // Time restriction (optional)
  startTime?: string;      // "18:00" (6pm onwards)
  endTime?: string;        // "23:59"

  // Multiplier
  multiplier: number;      // 1.25, 1.5, 2.0

  // Status
  isActive: boolean;

  // Metadata
  createdAt: string;
  createdBy: string;       // Admin username
  updatedAt: string;

  // GSI for date queries
  GSI1PK?: string;         // "ACTIVE" or "INACTIVE"
  GSI1SK?: string;         // startDate for range queries
}
```

**Example Rules:**

```json
// Christmas Period (date range)
{
  "PK": "SURGE",
  "SK": "RULE#abc123",
  "ruleId": "abc123",
  "name": "Christmas & New Year",
  "ruleType": "date_range",
  "startDate": "2025-12-20",
  "endDate": "2026-01-03",
  "multiplier": 1.5,
  "isActive": true
}

// Weekend evenings (recurring)
{
  "PK": "SURGE",
  "SK": "RULE#def456",
  "ruleId": "def456",
  "name": "Weekend Evenings",
  "ruleType": "day_of_week",
  "daysOfWeek": ["friday", "saturday"],
  "startTime": "18:00",
  "endTime": "23:59",
  "multiplier": 1.25,
  "isActive": true
}

// Specific bank holiday
{
  "PK": "SURGE",
  "SK": "RULE#ghi789",
  "ruleId": "ghi789",
  "name": "August Bank Holiday 2025",
  "ruleType": "specific_dates",
  "dates": ["2025-08-25"],
  "multiplier": 1.25,
  "isActive": true
}
```

---

### API Endpoints (pricing-manager Lambda)

**Add to existing `pricing-manager` Lambda:**

#### GET /admin/pricing/surge
List all surge rules.

```typescript
// Response
{
  "rules": SurgeRule[],
  "count": number
}
```

#### POST /admin/pricing/surge
Create new surge rule.

```typescript
// Request
{
  "name": "Christmas Period",
  "ruleType": "date_range",
  "startDate": "2025-12-20",
  "endDate": "2026-01-03",
  "multiplier": 1.5,
  "isActive": true
}

// Response
{
  "ruleId": "abc123",
  "message": "Surge rule created"
}
```

#### PUT /admin/pricing/surge/{ruleId}
Update existing rule.

#### DELETE /admin/pricing/surge/{ruleId}
Delete rule (soft delete - set isActive: false, or hard delete).

#### GET /admin/pricing/surge/preview?date={ISO_DATE}
Preview which rules apply for a given date (for testing).

```typescript
// Response
{
  "date": "2025-12-25",
  "applicableRules": [
    { "ruleId": "abc123", "name": "Christmas Period", "multiplier": 1.5 }
  ],
  "effectiveMultiplier": 1.5,  // Highest wins
  "isPeakPricing": true
}
```

---

### Quote Calculator Integration

**Modify `quotes-calculator` Lambda:**

```typescript
interface SurgeResult {
  combinedMultiplier: number;      // Final stacked multiplier (capped at 3.0)
  isPeakPricing: boolean;
  appliedRules: Array<{
    ruleId: string;
    name: string;
    multiplier: number;
  }>;
}

// New function: checkSurgePricing (STACKING logic)
async function checkSurgePricing(pickupDateTime: string): Promise<SurgeResult> {
  const pickupDate = new Date(pickupDateTime);
  const dayOfWeek = pickupDate.toLocaleDateString('en-GB', { weekday: 'long' }).toLowerCase();
  const dateString = pickupDate.toISOString().split('T')[0]; // "2025-12-25"
  const timeString = pickupDate.toTimeString().slice(0, 5);  // "14:30"

  // Query active surge rules
  const rules = await getSurgeRules(); // From DynamoDB

  const appliedRules: SurgeResult['appliedRules'] = [];

  for (const rule of rules) {
    if (!rule.isActive) continue;

    let matches = false;

    switch (rule.ruleType) {
      case 'specific_dates':
        matches = rule.dates?.includes(dateString) ?? false;
        break;

      case 'day_of_week':
        matches = rule.daysOfWeek?.includes(dayOfWeek) ?? false;
        break;

      case 'date_range':
        matches = dateString >= rule.startDate! && dateString <= rule.endDate!;
        break;
    }

    // Check time restriction if present
    if (matches && rule.startTime && rule.endTime) {
      matches = timeString >= rule.startTime && timeString <= rule.endTime;
    }

    // STACK all matching rules
    if (matches) {
      appliedRules.push({
        ruleId: rule.ruleId,
        name: rule.name,
        multiplier: rule.multiplier
      });
    }
  }

  // Calculate combined multiplier (multiply all together)
  let combinedMultiplier = appliedRules.reduce(
    (acc, rule) => acc * rule.multiplier,
    1.0
  );

  // Cap at 3.0x maximum
  const MAX_MULTIPLIER = 3.0;
  if (combinedMultiplier > MAX_MULTIPLIER) {
    combinedMultiplier = MAX_MULTIPLIER;
  }

  return {
    combinedMultiplier,
    isPeakPricing: combinedMultiplier > 1.0,
    appliedRules
  };
}

// Example: Christmas Day 2025
// Rules that match:
//   - "Christmas Week" (Dec 20-Jan 3): 1.5x
//   - "Christmas Day" (Dec 25): 1.5x
// Combined: 1.5 × 1.5 = 2.25x
```

**Modified Quote Response:**

```typescript
interface QuoteResponse {
  quoteId: string;
  totalPrice: number;              // AFTER surge applied
  basePriceBeforeSurge: number;    // For admin visibility
  surgeMultiplier: number;         // Combined multiplier (1.0, 1.5, 2.25, etc.)
  isPeakPricing: boolean;          // For frontend banner
  appliedSurgeRules?: Array<{      // For admin visibility only
    name: string;
    multiplier: number;
  }>;
  // ... existing fields
}
```

**Example Quote Response (Christmas Day):**
```json
{
  "quoteId": "DURDLE-abc123",
  "totalPrice": 112.50,
  "basePriceBeforeSurge": 50.00,
  "surgeMultiplier": 2.25,
  "isPeakPricing": true,
  "appliedSurgeRules": [
    { "name": "Christmas Week", "multiplier": 1.5 },
    { "name": "Christmas Day", "multiplier": 1.5 }
  ]
}
```

**Pricing Calculation Flow:**

```
1. Calculate base price (distance * rate + standing charge)
2. Check surge pricing for pickup date/time
3. Apply multiplier: finalPrice = basePrice * multiplier
4. Return quote with isPeakPricing flag
```

---

### Structured Logging

Add to `quotes-calculator`:

```typescript
// When surge is applied
logger.info({
  event: 'surge_pricing_applied',
  quoteId,
  pickupDate: dateString,
  pickupTime: timeString,
  ruleId: appliedRule.ruleId,
  ruleName: appliedRule.name,
  multiplier: highestMultiplier,
  basePriceBeforeSurge,
  finalPrice
});

// When no surge applies
logger.info({
  event: 'surge_pricing_checked',
  quoteId,
  pickupDate: dateString,
  result: 'no_surge_active'
});
```

---

## Frontend Implementation (Admin)

### Page: `/admin/pricing/surge`

**Layout:**

```
+--------------------------------------------------+
| Surge Pricing Calendar                    [+ Add Rule] |
+--------------------------------------------------+
| [< Dec 2025 >]                                   |
|                                                  |
| Mon  Tue  Wed  Thu  Fri  Sat  Sun               |
|  1    2    3    4   (5)  (6)   7                |
|  8    9   10   11  (12) (13)  14                |
| 15   16   17   18  (19) (20) [21]               |
| [22] [23] [24] [25] [26] [27] [28]              |
| [29] [30] [31]                                   |
|                                                  |
| Legend: ( ) = 1.25x    [ ] = 1.5x    { } = 2.0x |
+--------------------------------------------------+
| Active Rules                                     |
| +----------------------------------------------+ |
| | Christmas Period   | Dec 20 - Jan 3 | 1.5x | X |
| | Weekend Evenings   | Fri-Sat 6pm+   | 1.25x| X |
| +----------------------------------------------+ |
+--------------------------------------------------+
```

**Components:**

1. **Calendar View** (react-big-calendar or FullCalendar)
   - Month navigation
   - Click date to add/view rules
   - Color coding by multiplier level

2. **Add Rule Modal**
   - Name field
   - Rule type selector (Specific Dates / Day of Week / Date Range)
   - Date picker(s) or day checkboxes
   - Optional time range
   - Multiplier dropdown (1.25x, 1.5x, 1.75x, 2.0x)
   - Active toggle

3. **Rule List**
   - Table of all rules
   - Edit/Delete actions
   - Active/Inactive toggle

4. **Pre-defined Templates**
   - Button: "Apply UK Bank Holidays 2025"
   - Button: "Apply School Holidays (Dorset)"
   - Creates multiple rules at once

---

### Component: Add Surge Rule Modal

```tsx
interface AddSurgeRuleForm {
  name: string;
  ruleType: 'specific_dates' | 'day_of_week' | 'date_range';

  // Conditional fields
  specificDates?: Date[];           // For specific_dates
  daysOfWeek?: string[];            // For day_of_week
  dateRange?: { start: Date; end: Date }; // For date_range

  // Optional time restriction
  hasTimeRestriction: boolean;
  startTime?: string;
  endTime?: string;

  multiplier: number;
  isActive: boolean;
}
```

**Validation (Zod):**

```typescript
const surgeRuleSchema = z.object({
  name: z.string().min(3).max(100),
  ruleType: z.enum(['specific_dates', 'day_of_week', 'date_range']),

  specificDates: z.array(z.string()).optional(),
  daysOfWeek: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),

  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),

  multiplier: z.number().min(1.0).max(3.0),
  isActive: z.boolean()
}).refine(data => {
  // Validate that correct fields are provided for rule type
  if (data.ruleType === 'specific_dates') {
    return data.specificDates && data.specificDates.length > 0;
  }
  if (data.ruleType === 'day_of_week') {
    return data.daysOfWeek && data.daysOfWeek.length > 0;
  }
  if (data.ruleType === 'date_range') {
    return data.startDate && data.endDate;
  }
  return false;
}, { message: 'Invalid rule configuration' });
```

---

## Frontend Implementation (Customer)

### Quote Result Page

**When `isPeakPricing: true`:**

```tsx
{quote.isPeakPricing && (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
    <div className="flex items-center gap-2">
      <CalendarIcon className="h-5 w-5 text-amber-600" />
      <span className="text-amber-800 text-sm font-medium">
        Peak period pricing applies for this date
      </span>
    </div>
  </div>
)}
```

**Notes:**
- Subtle, not alarming
- Amber color (not red)
- No multiplier shown
- Appears above the price

---

## Testing Checklist

### Backend Tests

- [ ] Create surge rule (all three types)
- [ ] Update surge rule
- [ ] Delete surge rule
- [ ] List surge rules
- [ ] Preview endpoint returns correct rules for date
- [ ] Quote with no surge returns multiplier 1.0
- [ ] Quote with single rule applies correct multiplier
- [ ] Quote with multiple rules uses highest multiplier
- [ ] Time-restricted rule only applies within time window
- [ ] Inactive rule is ignored
- [ ] Future date rule doesn't affect past quotes

### Frontend Tests

- [ ] Calendar displays with correct color coding
- [ ] Add rule modal validates input
- [ ] Edit rule pre-fills form
- [ ] Delete rule with confirmation
- [ ] Template buttons create correct rules
- [ ] Customer quote shows peak pricing banner when applicable
- [ ] Customer quote hides banner when no surge

---

## Rollback Plan

If issues occur after deployment:

1. **Backend:** Add feature flag `SURGE_PRICING_ENABLED=false` to quotes-calculator
2. **Frontend:** Hide admin page behind feature flag
3. **Database:** Rules remain in DynamoDB but are not queried

```typescript
// In quotes-calculator
const SURGE_ENABLED = process.env.SURGE_PRICING_ENABLED !== 'false';

if (SURGE_ENABLED) {
  const surge = await checkSurgePricing(pickupDateTime);
  // Apply surge...
} else {
  // Skip surge check, multiplier = 1.0
}
```

---

## Timeline

| Day | Task | Owner |
|-----|------|-------|
| 1 | Create DynamoDB table, add to IAM policy | Backend |
| 2 | Implement CRUD endpoints in pricing-manager | Backend |
| 3 | Integrate surge check into quotes-calculator | Backend |
| 4 | Backend testing + deployment | Backend |
| 5-6 | Admin calendar page + rule modal | Frontend |
| 7-8 | Rule list, templates, visual polish | Frontend |
| 9 | Customer peak pricing banner | Frontend |
| 10 | E2E testing + bug fixes | Fullstack |

---

## Dependencies

- DynamoDB table must be created before Lambda code deployment
- IAM policy must include new table before testing
- `pricing-manager` changes must deploy before frontend can call new endpoints
- `quotes-calculator` changes deploy last (after testing surge rules exist)

---

## Pre-Defined Templates (Ready to Apply)

### UK Bank Holidays 2025
```javascript
const UK_BANK_HOLIDAYS_2025 = [
  { date: '2025-01-01', name: 'New Year\'s Day' },
  { date: '2025-04-18', name: 'Good Friday' },
  { date: '2025-04-21', name: 'Easter Monday' },
  { date: '2025-05-05', name: 'Early May Bank Holiday' },
  { date: '2025-05-26', name: 'Spring Bank Holiday' },
  { date: '2025-08-25', name: 'Summer Bank Holiday' },
  { date: '2025-12-25', name: 'Christmas Day' },
  { date: '2025-12-26', name: 'Boxing Day' }
];
```

### UK Bank Holidays 2026
```javascript
const UK_BANK_HOLIDAYS_2026 = [
  { date: '2026-01-01', name: 'New Year\'s Day' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-04-06', name: 'Easter Monday' },
  { date: '2026-05-04', name: 'Early May Bank Holiday' },
  { date: '2026-05-25', name: 'Spring Bank Holiday' },
  { date: '2026-08-31', name: 'Summer Bank Holiday' },
  { date: '2026-12-25', name: 'Christmas Day' },
  { date: '2026-12-28', name: 'Boxing Day (substitute)' }
];
```

### Dorset School Holidays 2025-2026
```javascript
const DORSET_SCHOOL_HOLIDAYS = [
  // Summer 2025
  { startDate: '2025-07-23', endDate: '2025-09-02', name: 'Summer Holiday 2025' },
  // October Half Term
  { startDate: '2025-10-27', endDate: '2025-10-31', name: 'October Half Term 2025' },
  // Christmas
  { startDate: '2025-12-22', endDate: '2026-01-02', name: 'Christmas Holiday 2025' },
  // February Half Term
  { startDate: '2026-02-16', endDate: '2026-02-20', name: 'February Half Term 2026' },
  // Easter
  { startDate: '2026-04-06', endDate: '2026-04-17', name: 'Easter Holiday 2026' },
  // May Half Term
  { startDate: '2026-05-25', endDate: '2026-05-29', name: 'May Half Term 2026' },
  // Summer 2026
  { startDate: '2026-07-22', endDate: '2026-09-01', name: 'Summer Holiday 2026' }
];
```

### Quick Templates
```javascript
const QUICK_TEMPLATES = {
  christmasPeriod: {
    name: 'Christmas & New Year Period',
    ruleType: 'date_range',
    startDate: '2025-12-20',
    endDate: '2026-01-03',
    multiplier: 1.5
  },
  summerWeekends: {
    name: 'Summer Weekend Peak',
    ruleType: 'day_of_week',
    daysOfWeek: ['friday', 'saturday', 'sunday'],
    startDate: '2025-07-01',  // Only active during summer
    endDate: '2025-08-31',
    multiplier: 1.25
  },
  weekendEvenings: {
    name: 'Weekend Evenings',
    ruleType: 'day_of_week',
    daysOfWeek: ['friday', 'saturday'],
    startTime: '18:00',
    endTime: '23:59',
    multiplier: 1.25
  }
};
```

---

## Admin UI - Stacking Warning

When multiple rules apply to a date, show clear warning:

```
+----------------------------------------------------------+
| ⚠️ Multiple surge rules apply to this date               |
|                                                          |
| Rules stacking for December 25, 2025:                    |
| ┌──────────────────────────────────┬────────────┐       |
| │ Christmas Week (Dec 20 - Jan 3)  │    1.5x    │       |
| │ Christmas Day                    │    1.5x    │       |
| ├──────────────────────────────────┼────────────┤       |
| │ Combined Multiplier              │    2.25x   │       |
| └──────────────────────────────────┴────────────┘       |
|                                                          |
| A £50 base fare would become £112.50                     |
+----------------------------------------------------------+
```

### Calendar Date Preview (Hover/Click)

When admin hovers or clicks a date on the calendar:

```
+-----------------------------------+
| December 25, 2025                 |
| Christmas Day                     |
|-----------------------------------|
| Active Rules:                     |
| • Christmas Week ........ 1.5x   |
| • Christmas Day ......... 1.5x   |
|-----------------------------------|
| Combined: 2.25x                   |
| (£50 base → £112.50)             |
+-----------------------------------+
| [Edit] [Add Rule]                 |
+-----------------------------------+
```

---

## Design Decisions Summary

| Question | Decision |
|----------|----------|
| How admin sets pricing? | Rule-first with stacking |
| Show surge to customer? | Yes, subtle "Peak period pricing" banner |
| Show multiplier to customer? | No, just the flag |
| Max multiplier allowed? | 3.0x (hard cap) |
| Rule overlap behavior? | **STACK** (multiply together) with warning |
| Store surge in quote record? | Yes, including all applied rules |
| Templates included? | UK Bank Hols 2025/2026, Dorset School Hols, Christmas, Summer |

---

**Document Status:** Ready for Development
**Approved By:** CTO
**Next Step:** Create DynamoDB table, begin backend implementation
