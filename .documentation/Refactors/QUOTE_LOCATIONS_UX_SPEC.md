# Quote Locations Step - UX Specification
## Condensed Single-Card Design (Uber Pattern)

**Document Version:** 1.0
**Date:** December 6, 2025
**Status:** Approved for Implementation

---

## Executive Summary

### Problem Statement
The current quote locations interface uses **two separate cards** with excessive vertical spacing, consuming too much mobile screen real estate. When the keyboard appears, users cannot see the full interface, creating a poor mobile UX.

**Current Issues:**
- Two separate bordered cards for Start and End locations
- 48px vertical gaps between cards (space-y-6 + p-6 padding)
- Progressive disclosure hides dropoff field until pickup is selected
- Visual connection lines add unnecessary height
- Interface doesn't fit in top half of mobile viewport
- Separate search experiences for each location field

### Solution
Implement a **condensed single-card design** following Uber's mobile pattern:
- Single card containing both pickup and destination fields
- Shared full-screen search interface for all location inputs
- Waypoints appear as additional rows within the same card
- Minimal padding optimized for mobile viewports
- Auto-focus flow for faster data entry
- Entire interface fits above mobile keyboard

### Success Criteria
- Quote locations card fits in **top 50% of mobile viewport** (above keyboard)
- Reduced vertical spacing by **~60%** (48px gaps → ~16px)
- Single unified card instead of 2-3 separate cards
- Faster user flow with auto-focus progression

---

## Current vs Desired State

### Current Implementation (Problems)

**File:** `app/quote/components/LocationStep.tsx`

```
┌─────────────────────────────────────┐
│  START LOCATION CARD (p-6)          │  ← 24px padding
│  ┌───────────────────────────────┐  │
│  │ 12 Bentside Rd, Disley...     │  │
│  └───────────────────────────────┘  │
│  [Use Current Location]             │
└─────────────────────────────────────┘
           ↓ (24px gap)
      ─────────── (8px line)
           ↓ (24px gap)
┌─────────────────────────────────────┐
│  END LOCATION CARD (p-6)            │  ← 24px padding
│  ┌───────────────────────────────┐  │
│  │ Enter End Location            │  │
│  └───────────────────────────────┘  │
│  [Use Current Location]             │
└─────────────────────────────────────┘
           ↓ (24px gap)
┌─────────────────────────────────────┐
│  + Add waypoints (optional)         │
└─────────────────────────────────────┘

TOTAL HEIGHT: ~380px
```

**Spacing Analysis:**
- Card padding: `p-6` = **24px** on all sides
- Vertical gaps: `space-y-6` = **24px** between elements
- Connection lines: **8px** height each
- **Total wasted space:** ~100px in gaps alone

**Code Example (Current):**
```tsx
// LocationStep.tsx line 64
<div className="space-y-6">  {/* 24px gaps */}

  {/* Start Location Card */}
  <div className="p-6 shadow-mobile border-2"> {/* 24px padding */}
    <LocationInput ... />
  </div>

  {/* Connection Line */}
  <div className="h-2 w-px bg-gray-300" /> {/* 8px */}

  {/* End Location Card */}
  <div className="p-6 shadow-mobile border-2"> {/* 24px padding */}
    <LocationInput ... />
  </div>

  {/* Waypoints Card */}
  <div className="p-6 shadow-mobile border-2/50">
    ...
  </div>
</div>
```

---

### Desired Implementation (Solution)

**Single Condensed Card Pattern (Uber-Style)**

```
┌─────────────────────────────────────┐
│  PLAN YOUR TRIP (p-4)               │  ← 16px padding
│                                     │
│  ● 12 Bentside Rd, Disley...    [↗]│  ← Pickup (8px below header)
│  ─────────────────────────────────  │  ← 1px divider
│  ○ Enter End Location          [↗]│  ← Destination (no gap)
│  ─────────────────────────────────  │
│  + Add waypoints                    │  ← Optional (8px below)
│                                     │
└─────────────────────────────────────┘
        ↓ (12px gap)
    [Continue Button]

TOTAL HEIGHT: ~180px (52% reduction)
```

**Spacing Target:**
- Card padding: `p-4` or `p-3` = **12-16px**
- Field spacing: `space-y-2` = **8px** between inputs
- Divider lines: **1px** border-bottom per field
- **Total height:** Fits in top 50% of 667px mobile viewport (iPhone SE)

**Code Example (Target):**
```tsx
// LocationStep.tsx (refactored)
<div className="p-4 shadow-mobile border-2 rounded-2xl bg-white">

  {/* Header */}
  <h3 className="text-sm font-semibold mb-3">Plan your trip</h3>

  {/* Pickup Field */}
  <div className="space-y-2">
    <LocationField
      type="pickup"
      value={pickup}
      placeholder="Pickup location"
      onFocus={() => openSearch('pickup')}
      icon="●"
    />

    <div className="border-b border-gray-200" />

    {/* Destination Field */}
    <LocationField
      type="destination"
      value={dropoff}
      placeholder="Where to?"
      onFocus={() => openSearch('destination')}
      icon="○"
    />

    {/* Waypoints (if any) */}
    {waypoints.map((waypoint, idx) => (
      <>
        <div className="border-b border-gray-200" />
        <LocationField
          type="waypoint"
          value={waypoint}
          onFocus={() => openSearch('waypoint', idx)}
          icon={idx + 1}
        />
      </>
    ))}

    {/* Add Waypoint Button */}
    <button className="text-sm text-gray-600 mt-2">
      + Add waypoints
    </button>
  </div>
</div>
```

**Visual Comparison:**

| Element | Current | Target | Savings |
|---------|---------|--------|---------|
| Card Padding | 24px | 12-16px | 8-12px per side |
| Vertical Gaps | 24px | 8px | 16px per gap |
| Connection Lines | 8px | 1px | 7px each |
| Number of Cards | 3 separate | 1 unified | ~60px borders/shadows |
| **Total Height** | **~380px** | **~180px** | **52% reduction** |

---

## Detailed Component Specifications

### 1. Single Card Container

**Component:** `LocationStep.tsx` (refactored)

**Layout Structure:**
```tsx
<div className="p-4 bg-white rounded-2xl border-2 border-gray-200 shadow-mobile">

  {/* Card Header */}
  <div className="mb-3">
    <h3 className="text-sm font-semibold text-gray-900">Plan your trip</h3>
  </div>

  {/* Location Fields Stack */}
  <div className="space-y-0">  {/* NO vertical spacing between fields */}

    {/* Each field is a row with bottom border divider */}
    {renderLocationFields()}

  </div>

  {/* Add Waypoint Button */}
  <button className="mt-3 text-sm text-gray-600">
    + Add waypoints along the way
  </button>

</div>
```

**Styling Requirements:**
- Card padding: `p-4` (16px) or `p-3` (12px) - **choose minimal**
- Border radius: Keep existing `rounded-2xl` (looks good)
- Shadow: Keep existing `shadow-mobile`
- Background: `bg-white`
- Border: `border-2 border-gray-200`

**Container Class:**
```tsx
className="p-4 bg-white rounded-2xl border-2 border-gray-200 shadow-mobile"
```

---

### 2. Condensed Location Field Component

**New Component:** `LocationField.tsx` (simplified from LocationInput)

**Purpose:** Display-only field that triggers full-screen search on tap

**Props:**
```typescript
interface LocationFieldProps {
  type: 'pickup' | 'destination' | 'waypoint'
  value: Location | null
  placeholder: string
  onFocus: () => void  // Opens full-screen search
  icon: string | number  // ●, ○, or waypoint number
  showCurrentLocationButton?: boolean
}
```

**Layout:**
```tsx
<div
  className="flex items-center gap-3 py-3 cursor-pointer"
  onClick={onFocus}
>
  {/* Icon (pickup=●, destination=○, waypoint=number) */}
  <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
    {type === 'pickup' && <span className="text-lg">●</span>}
    {type === 'destination' && <span className="text-lg">○</span>}
    {type === 'waypoint' && <span className="text-xs font-bold">{icon}</span>}
  </div>

  {/* Location Text or Placeholder */}
  <div className="flex-1 min-w-0">
    <p className={value ? "text-sm text-gray-900" : "text-sm text-gray-400"}>
      {value?.address || placeholder}
    </p>
  </div>

  {/* Current Location Button (optional) */}
  {showCurrentLocationButton && (
    <button className="flex-shrink-0 text-blue-600">
      <TargetIcon className="w-5 h-5" />
    </button>
  )}
</div>

{/* Bottom Border Divider (except last field) */}
{!isLast && <div className="border-b border-gray-200" />}
```

**Styling Details:**
- Vertical padding: `py-3` (12px) per field
- Icon size: `w-5 h-5` (20px)
- Gap between icon and text: `gap-3` (12px)
- Text size: `text-sm` (14px)
- Divider: `border-b border-gray-200` (1px)

**No More:**
- No input field rendered in condensed view
- No autocomplete dropdown in condensed view
- No separate cards
- No connection lines

---

### 3. Full-Screen Search Interface

**Component:** `LocationSearchView.tsx` (new or refactor LocationInput)

**Trigger:** When user taps any location field in condensed card

**Transition:** Full-screen modal/view slides up from bottom (mobile) or replaces step content

**Layout:**
```tsx
<div className="fixed inset-0 bg-white z-50 flex flex-col">

  {/* Header */}
  <div className="flex items-center gap-3 p-4 border-b">
    <button onClick={onClose}>
      <BackArrowIcon />
    </button>
    <h2 className="text-lg font-semibold">
      {activeField === 'pickup' ? 'Pickup Location' : 'Destination'}
    </h2>
  </div>

  {/* Search Input (auto-focused) */}
  <div className="p-4">
    <input
      ref={inputRef}
      type="text"
      value={query}
      onChange={handleSearch}
      placeholder="Search location..."
      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl"
      autoFocus
    />

    {/* Use Current Location Button */}
    <button className="mt-3 flex items-center gap-2 text-blue-600">
      <TargetIcon />
      <span>Use current location</span>
    </button>
  </div>

  {/* Search Results */}
  <div className="flex-1 overflow-y-auto">
    {results.map(result => (
      <button
        key={result.placeId}
        onClick={() => handleSelect(result)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50"
      >
        <LocationIcon />
        <div className="text-left">
          <p className="font-medium">{result.mainText}</p>
          <p className="text-sm text-gray-500">{result.secondaryText}</p>
        </div>
      </button>
    ))}
  </div>

</div>
```

**Visual Indicator for Active Field:**
When search opens, header shows which field is being filled:
- "Pickup Location" (if filling pickup)
- "Destination" (if filling dropoff)
- "Waypoint 1" (if filling first waypoint)

**Auto-Focus Behavior:**
- Input field is auto-focused on mount
- Keyboard appears immediately
- User can start typing without extra tap

---

### 4. Waypoint Integration

**Placement:** Waypoints appear as **additional rows between pickup and destination**

**Condensed Card with Waypoints:**
```
┌─────────────────────────────────────┐
│  PLAN YOUR TRIP                     │
│                                     │
│  ● 12 Bentside Rd, Disley      [↗] │  ← Pickup
│  ─────────────────────────────────  │
│  1  Bournemouth Pier           [×] │  ← Waypoint 1
│  ─────────────────────────────────  │
│  2  Durdle Door                [×] │  ← Waypoint 2
│  ─────────────────────────────────  │
│  ○ Weymouth Beach              [↗] │  ← Destination
│                                     │
│  + Add another stop                 │
└─────────────────────────────────────┘
```

**Waypoint Field Differences:**
- Icon: Number (1, 2, 3...) instead of ● or ○
- Delete button: [×] on right side to remove waypoint
- Order: Draggable (future enhancement)

**Add Waypoint Button:**
- Position: Below all location fields, inside card
- Action: Inserts new waypoint field **before destination**
- Auto-opens: Search view for new waypoint immediately

**Code:**
```tsx
{waypoints.map((waypoint, idx) => (
  <React.Fragment key={idx}>
    <LocationField
      type="waypoint"
      value={waypoint}
      placeholder={`Waypoint ${idx + 1}`}
      onFocus={() => openSearch('waypoint', idx)}
      icon={idx + 1}
    />
    <button
      onClick={() => removeWaypoint(idx)}
      className="absolute right-4"
    >
      ×
    </button>
    <div className="border-b border-gray-200" />
  </React.Fragment>
))}
```

---

## Interaction Flow Documentation

### Flow 1: First-Time User (Empty Form)

**Step 1: Initial State**
```
User sees condensed card:
┌─────────────────────┐
│ PLAN YOUR TRIP      │
│ ● Pickup location   │  ← Placeholder
│ ───────────────────  │
│ ○ Where to?         │  ← Placeholder
│ + Add waypoints     │
└─────────────────────┘
```

**Step 2: User Taps Pickup Field**
```
→ Full-screen search view appears
→ Header shows: "Pickup Location"
→ Input auto-focused, keyboard appears
→ User types: "Bent"
→ Autocomplete results appear:
   - 12 Bentside Rd, Disley, Stockport
   - Bentley Motors, Crewe
   - etc.
```

**Step 3: User Selects Pickup**
```
→ Search view closes
→ Returns to condensed card
→ Pickup field now populated:
┌─────────────────────┐
│ ● 12 Bentside Rd... │  ← Filled
│ ───────────────────  │
│ ○ Where to?         │  ← AUTO-FOCUSED (keyboard still up)
└─────────────────────┘

→ Destination search IMMEDIATELY opens
→ Header shows: "Destination"
→ User can start typing immediately
```

**Step 4: User Selects Destination**
```
→ Search view closes
→ Both fields now populated
→ Focus moves OUT of card (to Continue button)
┌─────────────────────┐
│ ● 12 Bentside Rd... │  ← Filled
│ ───────────────────  │
│ ○ Weymouth Beach    │  ← Filled
│ + Add waypoints     │
└─────────────────────┘

[Continue to Date & Time] ← Auto-enabled
```

**Total Taps Required:**
- Current: 5 taps (tap pickup card → type → select → tap dropoff card → type → select)
- New: 3 taps (tap pickup → select → type in auto-opened destination → select)

**Time Savings:** ~40% faster (2 fewer taps)

---

### Flow 2: Adding Waypoints

**Step 1: User Taps "+ Add waypoints"**
```
→ New waypoint field appears BETWEEN pickup and destination
→ Search view immediately opens for waypoint
→ Header shows: "Waypoint 1"

┌─────────────────────┐
│ ● 12 Bentside Rd... │
│ ───────────────────  │
│ 1  [SEARCH OPEN]    │  ← New waypoint
│ ───────────────────  │
│ ○ Weymouth Beach    │
│ + Add another stop  │
└─────────────────────┘
```

**Step 2: User Selects Waypoint Location**
```
→ Search closes
→ Waypoint populated
→ Delete [×] button appears

┌─────────────────────┐
│ ● 12 Bentside Rd... │
│ ───────────────────  │
│ 1  Bournemouth  [×] │  ← Can delete
│ ───────────────────  │
│ ○ Weymouth Beach    │
│ + Add another stop  │  ← Can add more
└─────────────────────┘
```

**Step 3: User Adds Second Waypoint**
```
→ Taps "+ Add another stop"
→ New field inserts BEFORE destination
→ Search opens immediately

┌─────────────────────┐
│ ● 12 Bentside Rd... │
│ ───────────────────  │
│ 1  Bournemouth  [×] │
│ ───────────────────  │
│ 2  [SEARCH OPEN]    │  ← Second waypoint
│ ───────────────────  │
│ ○ Weymouth Beach    │
│ + Add another stop  │
└─────────────────────┘
```

**Removing Waypoints:**
- User taps [×] button on waypoint
- Field removed with animation
- Waypoint numbers re-index (2 → 1, 3 → 2, etc.)

---

### Flow 3: Editing Existing Location

**User Taps Already-Filled Field:**
```
Current: ● 12 Bentside Rd, Disley, Stockport

→ Full-screen search opens
→ Input pre-filled with current address
→ User can edit or clear and search new location
→ Selecting new result replaces existing location
→ Tapping back/cancel keeps original location
```

---

### Flow 4: Using Current Location

**Option A: "Use Current Location" in Search View**
```
User opens search for any field
→ Taps "Use current location" button below input
→ Browser geolocation prompt appears
→ If allowed: Reverse geocode → populate field
→ Search view closes
→ Auto-focus next field (if applicable)
```

**Option B: Quick Button in Condensed Card (Optional)**
```
┌─────────────────────┐
│ ● Pickup location [↗]│  ← [↗] = current location button
│ ───────────────────   │
│ ○ Where to?      [↗]│
└─────────────────────┘

→ User taps [↗] button
→ Geolocation triggered immediately
→ Field populates without opening search
→ Auto-focus next field
```

**Recommendation:** Implement Option A first (simpler), add Option B if needed.

---

## Mobile Spacing Guidelines

### Target: Fit in Top 50% of Mobile Viewport

**Reference Device:** iPhone SE (smallest common screen)
- Viewport height: **667px**
- Top 50%: **334px**
- Keyboard height: ~300px

**When keyboard is up:**
- Available space: 667px - 300px = **367px**
- Need to fit: Progress bar (60px) + Card (180px) + Button (50px) = **290px**
- **Buffer:** 77px ✓ FITS COMFORTABLY

---

### Spacing Reduction Strategy

**FROM (Current):**
```scss
.location-card {
  padding: 1.5rem;        // 24px
  margin-bottom: 1.5rem;  // 24px
}

.space-y-6 > * + * {
  margin-top: 1.5rem;     // 24px
}
```

**TO (Target):**
```scss
.location-card {
  padding: 1rem;          // 16px (or 0.75rem = 12px)
  margin-bottom: 0.75rem; // 12px
}

.space-y-2 > * + * {
  margin-top: 0.5rem;     // 8px
}
```

**Specific Changes:**

| Element | Current Class | New Class | Savings |
|---------|---------------|-----------|---------|
| Card padding | `p-6` (24px) | `p-4` (16px) | 8px per side |
| Field vertical spacing | `space-y-6` (24px) | `space-y-2` (8px) | 16px per gap |
| Card bottom margin | `mb-6` (24px) | `mb-3` (12px) | 12px |
| Header margin | `mb-4` (16px) | `mb-3` (12px) | 4px |
| Connection lines | `h-2` (8px) | `border-b` (1px) | 7px each |

---

### Tailwind Class Mapping

**LocationStep Container:**
```tsx
// BEFORE
<div className="space-y-6">

// AFTER
<div className="space-y-3">  // 12px between card and button
```

**Single Card:**
```tsx
// BEFORE (multiple cards)
<div className="p-6 shadow-mobile border-2 rounded-2xl bg-white space-y-4">

// AFTER (single card)
<div className="p-4 shadow-mobile border-2 rounded-2xl bg-white">
  <h3 className="text-sm font-semibold mb-3">Plan your trip</h3>
  <div className="space-y-0">  // NO spacing - dividers handle visual separation
    {fields}
  </div>
</div>
```

**Location Field Row:**
```tsx
// Each field (NO wrapping div with margins)
<div className="py-3 flex items-center gap-3">  // 12px vertical padding
  {icon}
  {text}
  {action}
</div>
<div className="border-b border-gray-200" />  // 1px divider
```

---

### Responsive Considerations

**Mobile First (320px - 767px):**
- Use minimal padding: `p-3` or `p-4`
- Full-screen search view
- Stack all elements vertically
- Touch targets min 44px

**Tablet/Desktop (768px+):**
- Can increase padding slightly: `md:p-6`
- Search could be inline dropdown instead of full-screen
- Consider two-column layout (out of scope for Phase 1)

---

## Technical Implementation Notes

### Files to Modify

**1. app/quote/components/LocationStep.tsx**
- **Lines 64-190:** Entire component structure
- **Changes:**
  - Remove separate cards for pickup/dropoff
  - Remove connection line divs (lines 86-88, 112-116)
  - Remove progressive disclosure (dropoff always visible)
  - Implement single card with stacked fields
  - Add waypoint insertion logic (waypoints go BETWEEN pickup and destination)

**2. app/quote/components/LocationInput.tsx**
- **Refactor into TWO components:**

  **A. LocationField.tsx** (new - condensed display)
  - Props: `{ type, value, placeholder, onFocus, icon }`
  - Renders: Display-only field that triggers search
  - No autocomplete logic (handled by search view)

  **B. LocationSearchView.tsx** (new - full-screen search)
  - Props: `{ activeField, onSelect, onClose, initialValue }`
  - Contains: Input, autocomplete, results, current location
  - Handles: All search/selection logic
  - Transitions: Full-screen modal on mobile

**3. app/quote/page.tsx**
- **Lines 280-346:** Step rendering
- **Changes:**
  - May need to handle search view modal state
  - Or: LocationStep manages its own search state (preferred)

---

### State Management Considerations

**Current State (LocationStep props):**
```typescript
interface LocationStepProps {
  pickup: Location | null
  dropoff: Location | null
  waypoints: Waypoint[]
  onPickupChange: (location: Location) => void
  onDropoffChange: (location: Location) => void
  onWaypointsChange: (waypoints: Waypoint[]) => void
  errors?: { pickup?: string; dropoff?: string }
}
```

**No changes needed** - same state structure works for condensed design.

**Internal State (LocationStep manages):**
```typescript
const [searchOpen, setSearchOpen] = useState(false)
const [activeField, setActiveField] = useState<{
  type: 'pickup' | 'destination' | 'waypoint'
  index?: number  // for waypoints
} | null>(null)

function openSearch(type: string, index?: number) {
  setActiveField({ type, index })
  setSearchOpen(true)
}

function handleSearchSelect(location: Location) {
  if (activeField.type === 'pickup') {
    onPickupChange(location)
    // Auto-focus destination
    openSearch('destination')
  } else if (activeField.type === 'destination') {
    onDropoffChange(location)
    setSearchOpen(false)  // Done
  } else if (activeField.type === 'waypoint') {
    const updated = [...waypoints]
    updated[activeField.index!] = { ...location }
    onWaypointsChange(updated)
    setSearchOpen(false)
  }
}
```

---

### Progressive Disclosure Removal

**Current Behavior (REMOVE THIS):**
- Dropoff card only appears after pickup is selected
- Uses conditional rendering: `{pickup && <DropoffCard />}`

**New Behavior:**
- Both pickup and destination ALWAYS visible
- Both fields shown in condensed card from start
- User can fill in any order (though auto-focus encourages pickup → destination)

**Code Change:**
```tsx
// BEFORE (lines 84-109 in LocationStep.tsx)
{pickup && (
  <>
    <div className="h-2 w-px bg-gray-300 mx-auto" />
    <div className="p-6 ...">
      <LocationInput type="dropoff" ... />
    </div>
  </>
)}

// AFTER
// Destination is always rendered in single card (no conditional)
<LocationField
  type="destination"
  value={dropoff}
  placeholder="Where to?"
  onFocus={() => openSearch('destination')}
/>
```

---

### Auto-Focus Flow Implementation

**Key Behavior:** After selecting a location, automatically open search for next empty field.

**Logic:**
```typescript
function handleSearchSelect(location: Location) {
  if (activeField.type === 'pickup') {
    onPickupChange(location)

    // Auto-focus next empty field
    if (!dropoff) {
      // Open destination search immediately
      setTimeout(() => openSearch('destination'), 300)  // Smooth transition
    } else {
      setSearchOpen(false)
    }

  } else if (activeField.type === 'destination') {
    onDropoffChange(location)
    setSearchOpen(false)
    // Focus moves to Continue button (no more fields)

  } else if (activeField.type === 'waypoint') {
    const updated = [...waypoints]
    updated[activeField.index!] = { ...location }
    onWaypointsChange(updated)
    setSearchOpen(false)
  }
}
```

**Transition Timing:**
- Wait 300ms before auto-opening next search
- Allows user to see their selection update
- Smooth visual transition (close → reopen)

---

### Accessibility Considerations

**Keyboard Navigation:**
- Tab order: Pickup → Destination → Waypoint 1 → Waypoint 2 → Add Waypoint → Continue
- Enter/Space on field opens search
- Escape closes search without selection

**Screen Readers:**
- Announce field type: "Pickup location, button"
- Announce state: "Pickup location, 12 Bentside Road, button"
- Announce search opening: "Pickup location search, edit text"

**Touch Targets:**
- Minimum 44x44px tap area
- Field rows: `py-3` (12px) + text height (20px) + 12px = **44px** ✓

**Focus Management:**
- When search opens: Auto-focus input
- When search closes: Return focus to field that opened it
- After auto-focus: Announce new field to screen reader

---

## Reference Design Pattern

### Uber's Single-Card Approach

**Why This Pattern Works:**

1. **Cognitive Load:** One card = one task (plan route)
2. **Spatial Efficiency:** No wasted space on borders/shadows between cards
3. **Visual Hierarchy:** Dividers create separation without heavy borders
4. **Mobile Optimization:** Designed for thumb-friendly single-handed use
5. **Flow Efficiency:** Shared search interface reduces context switching

**Key Principles to Follow:**

✓ **Proximity:** Related fields grouped tightly together
✓ **Consistency:** Same search experience for all location inputs
✓ **Feedback:** Clear visual indication of active/filled states
✓ **Efficiency:** Minimize taps and transitions
✓ **Clarity:** Simple, uncluttered interface

**Visual Reference:**

Uber App Screenshot (provided):
- Single white card
- "Plan your trip" header
- Pickup and destination in same container
- Thin divider lines (not thick borders)
- Minimal padding
- Search results use same dropdown for both fields

**Apply These Patterns:**
- ✓ Single card container
- ✓ Shared search interface
- ✓ 1px dividers (not separate cards)
- ✓ Minimal padding (p-4 not p-6)
- ✓ Always show both fields (no progressive disclosure)

---

## Implementation Checklist

### Phase 1: Core Restructure

- [ ] Create `LocationField.tsx` component (display-only field)
- [ ] Create `LocationSearchView.tsx` component (full-screen search)
- [ ] Refactor `LocationStep.tsx`:
  - [ ] Remove separate cards (lines 66-109)
  - [ ] Implement single card container
  - [ ] Remove connection line divs
  - [ ] Remove progressive disclosure
  - [ ] Add search state management
- [ ] Implement field stacking with dividers (not separate cards)
- [ ] Update spacing classes (p-6 → p-4, space-y-6 → space-y-2)

### Phase 2: Search Integration

- [ ] Full-screen search modal/view
- [ ] Auto-focus input on search open
- [ ] Preserve existing autocomplete logic
- [ ] Handle search close/cancel
- [ ] Visual indicator for active field (header text)

### Phase 3: Auto-Focus Flow

- [ ] Implement auto-focus after pickup selection
- [ ] Destination search opens automatically
- [ ] Smooth transition timing (300ms delay)
- [ ] Handle case where destination already filled

### Phase 4: Waypoint Integration

- [ ] Waypoints insert BETWEEN pickup and destination
- [ ] Auto-open search when adding waypoint
- [ ] Delete waypoint button [×]
- [ ] Re-index waypoint numbers on delete
- [ ] Update "Add waypoints" button text when waypoints exist

### Phase 5: "Use Current Location" Integration

- [ ] Button in search view (below input)
- [ ] Trigger geolocation API
- [ ] Handle permission denied
- [ ] Reverse geocode coordinates
- [ ] Populate field and close search
- [ ] Optional: Quick button in condensed card [↗]

### Phase 6: Polish & Testing

- [ ] Mobile viewport testing (320px - 767px)
- [ ] Verify height fits in top 50% of iPhone SE (667px)
- [ ] Test with keyboard open
- [ ] Accessibility audit (keyboard nav, screen reader)
- [ ] Touch target verification (min 44px)
- [ ] Animation/transition polish

---

## Success Metrics

**Measure After Implementation:**

1. **Space Efficiency:**
   - Target: Card height ≤ 200px
   - Current: ~380px
   - **Goal: 47% reduction**

2. **User Flow Speed:**
   - Current: 5 taps to complete (pickup card → dropoff card → continue)
   - Target: 3 taps (pickup → dropoff auto-opens → continue)
   - **Goal: 40% faster**

3. **Mobile Usability:**
   - Entire card visible above keyboard ✓
   - Single-handed thumb reach ✓
   - No scrolling required ✓

4. **Visual Cleanliness:**
   - One card instead of 2-3 separate cards
   - Consistent visual weight (no heavy borders between fields)
   - Clear hierarchy without clutter

---

## Future Enhancements (Out of Scope for Phase 1)

- **Drag-to-Reorder Waypoints:** Reorder stops by dragging
- **Saved Locations:** Recent/favorite addresses
- **Return Trip Quick Add:** One tap to add return journey
- **Map View Integration:** Visual route preview in card
- **Smart Suggestions:** Based on booking history
- **Multi-Language Support:** Location search in multiple languages

---

## Questions for Developer

If any of the following are unclear, please ask BEFORE starting implementation:

1. **Search View Implementation:** Full-screen modal or inline slide-up?
2. **Auto-Focus Timing:** 300ms delay acceptable or prefer instant?
3. **Current Location Button:** In search only, or also quick button in card?
4. **Waypoint Limit:** Max number of waypoints allowed?
5. **Field Validation:** When to show errors (on blur, on submit, real-time)?

---

## Approval & Sign-Off

**Business Owner:** [Approved - December 6, 2025]
**Developer:** [Pending Review]
**Designer:** [N/A - Reference Design Provided]

**Next Steps:**
1. Developer reviews spec and asks clarifying questions
2. Estimate implementation time (suggest: 4-6 hours)
3. Begin Phase 1 (Core Restructure)
4. Review progress after Phase 2 completion

---

**Document End**
