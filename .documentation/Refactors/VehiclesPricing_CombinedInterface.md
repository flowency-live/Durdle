# Plan: Combined Vehicles & Pricing Admin Interface

## Overview

Merge `/admin/vehicles` and `/admin/pricing` into a single `/admin/vehicles-pricing` page called **"Vehicles & Pricing"**. The pricing calculator will be moved to its own `/admin/test-pricing` page.

---

## Current State Analysis

**Both pages share:**
- Same API endpoint: `GET/PUT /admin/pricing/vehicles`
- Same data structure: Vehicle includes all pricing fields
- Same authentication pattern
- Similar UI patterns (cards/tables with inline editing)

**Data Structure (unchanged):**
```typescript
interface Vehicle {
  vehicleId: string;
  name: string;
  description: string;
  capacity: number;
  features: string[];
  imageUrl: string;
  baseFare: number;        // pence
  perMile: number;         // pence
  perMinute: number;       // pence
  returnDiscount: number;  // percentage 0-100
  active: boolean;
}
```

---

## New Interface Design

### Page Layout: `/admin/vehicles-pricing`

```
+----------------------------------------------------------+
| Vehicles & Pricing                    [+ Add Vehicle]    |
| Manage your fleet and pricing                            |
+----------------------------------------------------------+
| [Test Pricing Calculator]                                |
+----------------------------------------------------------+
|                                                          |
| +------------------------------------------------------+ |
| | VEHICLE CARD                                         | |
| | +--------+  Name: Mercedes E-Class    [Edit Details] | |
| | | IMAGE  |  Capacity: 3 passengers                   | |
| | | 200x   |  Description: Executive sedan...          | |
| | +--------+  Features: [WiFi] [Leather] [Climate]     | |
| |                                                      | |
| | PRICING (always editable inline)                     | |
| | Base Fare: [£__35.00_] Per Mile: [£__2.50_]         | |
| | Per Minute: [£__0.45_] Return Discount: [__10_]%    | |
| |                                      [Save Pricing]  | |
| +------------------------------------------------------+ |
|                                                          |
| +------------------------------------------------------+ |
| | VEHICLE CARD 2...                                    | |
| +------------------------------------------------------+ |
+----------------------------------------------------------+
```

### Key Features:

1. **Vehicle Cards** - Each vehicle shown as a card with:
   - Image on left (with upload capability in edit mode)
   - Details in middle (name, capacity, description, features)
   - "Edit Details" button for full editing
   - Pricing section always visible at bottom

2. **Inline Pricing Editing** - Pricing fields are always editable without entering full edit mode:
   - Direct input fields for baseFare, perMile, perMinute, returnDiscount
   - Individual "Save Pricing" button per card
   - Currency formatting (show £, store pence)

3. **Edit Details Mode** - Clicking "Edit Details" expands to show:
   - Image upload
   - Name, description, capacity fields
   - Features management (add/remove)
   - "Save" and "Cancel" buttons

4. **Add New Vehicle** - Modal/drawer with:
   - **"Copy from existing vehicle"** dropdown at top
   - When selected, pre-fills ALL fields (including pricing)
   - User can then modify as needed
   - All vehicle details + pricing in one form

### Page: `/admin/test-pricing`

Simple page with just the pricing calculator:
- Vehicle dropdown
- Distance input
- Duration input
- Real-time calculation display
- Back button to return to Vehicles & Pricing

---

## Implementation Steps

### Step 1: Create new combined page structure
**Files to create:**
- `app/admin/vehicles-pricing/page.tsx` - Main combined page

### Step 2: Build VehicleCard component
**Create component with:**
- Image display section
- Details display section
- Always-visible pricing inputs
- Edit details toggle
- Individual save buttons

### Step 3: Build AddVehicleModal component
**Create modal with:**
- "Copy from" dropdown (optional)
- All vehicle fields in sections
- All pricing fields
- Create button

### Step 4: Create Test Pricing page
**Files to create:**
- `app/admin/test-pricing/page.tsx` - Calculator page

### Step 5: Update navigation
**Files to modify:**
- `app/admin/layout.tsx` - Update sidebar:
  - Remove "Vehicle Types" link
  - Remove "Variable Pricing" link
  - Add "Vehicles & Pricing" link
  - Add "Test Pricing" link

### Step 6: Remove old pages
**Files to delete (after new page confirmed working):**
- `app/admin/vehicles/page.tsx`
- `app/admin/pricing/page.tsx`

---

## API Impact

**No backend changes needed** - The existing `pricing-manager` Lambda already:
- Returns all vehicle data including pricing
- Accepts full vehicle updates
- Supports creating new vehicles with all fields

---

## Component Breakdown

### VehicleCard Props
```typescript
interface VehicleCardProps {
  vehicle: Vehicle;
  onUpdatePricing: (vehicleId: string, pricing: Partial<Vehicle>) => Promise<void>;
  onUpdateDetails: (vehicleId: string, details: Partial<Vehicle>) => Promise<void>;
  onUploadImage: (vehicleId: string, file: File) => Promise<string>;
  saving: boolean;
}
```

### AddVehicleModal Props
```typescript
interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (vehicle: Omit<Vehicle, 'vehicleId'>) => Promise<void>;
  existingVehicles: Vehicle[]; // For "copy from" dropdown
}
```

---

## UI/UX Improvements

1. **Inline pricing saves** - No need to enter edit mode just to change a price
2. **Copy pricing feature** - Speeds up adding similar vehicles
3. **Dedicated calculator page** - Cleaner main interface, calculator still accessible
4. **Visual hierarchy** - Clear separation between vehicle details and pricing

---

## File Changes Summary

| Action | File |
|--------|------|
| CREATE | `app/admin/vehicles-pricing/page.tsx` |
| CREATE | `app/admin/test-pricing/page.tsx` |
| MODIFY | `app/admin/layout.tsx` (navigation) |
| DELETE | `app/admin/vehicles/page.tsx` |
| DELETE | `app/admin/pricing/page.tsx` |

---

## Estimated Effort

- VehicleCard component: ~150 lines
- AddVehicleModal component: ~200 lines
- Main page: ~150 lines
- Test Pricing page: ~100 lines (mostly copy from existing)
- Navigation update: ~10 lines

**Total: ~600 lines of new code**, replacing ~500 lines of existing code.
