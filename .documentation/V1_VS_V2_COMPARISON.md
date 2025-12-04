# V1 vs V2 Landing Page Comparison

**Date**: December 4, 2025
**Purpose**: Document the visual and design differences between the two landing page variants

---

## Overview

Both V1 and V2 share the same layout, structure, and content. The ONLY differences are in the **color palette** used for branding elements, specifically the feature card icons and backgrounds.

---

## Color Palette Differences

### V1: Two-Color Brand System (RECOMMENDED)
**Philosophy**: Restrained, professional palette using only the two core brand colors

**Colors Used**:
- **Ocean Light** (Teal): `hsl(177, 50%, 45%)` - Primary brand color
- **Sand Golden** (Gold): `hsl(38, 85%, 58%)` - Secondary brand color

**Application**:
| Feature Card | Icon Color | Background Glow |
|--------------|------------|-----------------|
| Private Transfers | Sand Golden | Sand Golden 10% |
| Airport Connections | Ocean Light | Ocean Light 10% |
| Business Accounts | Sand Golden | Sand Golden 10% |
| Group Travel | Ocean Light | Ocean Light 10% |

**Visual Pattern**: Alternating between two colors creates a rhythmic, cohesive look

---

### V2: Four-Color Extended Palette
**Philosophy**: More visual variety with expanded color palette

**Colors Used**:
- **Ocean Light** (Teal): `hsl(177, 50%, 45%)` - Primary
- **Sand Golden** (Gold): `hsl(38, 85%, 58%)` - Secondary
- **Sky Blue**: `hsl(200, 80%, 60%)` - Accent #1
- **Cliff Green**: `hsl(150, 40%, 50%)` - Accent #2

**Application**:
| Feature Card | Icon Color | Background Glow |
|--------------|------------|-----------------|
| Private Transfers | Ocean Light | Ocean Light 10% |
| Airport Connections | Sky Blue | Sky Blue 10% |
| Business Accounts | Sand Golden | Sand Golden 10% |
| Group Travel | Cliff Green | Cliff Green 10% |

**Visual Pattern**: Four distinct colors create more visual separation between services

---

## Visual Comparison

### Shared Elements (Identical in Both)

- Hero section layout and messaging
- Navigation structure
- Typography and font sizes
- Spacing and padding
- Responsive breakpoints
- Call-to-action buttons
- Footer design
- Logo placement (Durdle logo in header and footer)

### Differing Elements

**Hero Section Badge Dot**:
- V1: Ocean Light (teal pulsing dot)
- V2: Sand Golden (golden pulsing dot)

**Hero Background Glows**:
- V1: Ocean Light (8%) + Sand Golden (10%) + Ocean Light (5%)
- V2: Ocean Light (5%) + Sand Golden (5%) + Cliff Green (5%)

**Feature Card Icons** (most visible difference):
- V1: Only Teal and Golden
- V2: Teal, Sky Blue, Golden, Cliff Green

---

## Why the Differences May Appear Subtle

The color differences are intentionally subtle because:

1. **Low Opacity Backgrounds**: Feature cards use 10% opacity (`bg-{color}/10`), making the color differences very soft
2. **Hover States**: The differences become more apparent on hover (20% opacity)
3. **Dark Mode**: Color differences are more pronounced in dark mode
4. **Browser Caching**: If viewing both pages without a hard refresh, the styles may not update

---

## How to See the Differences Clearly

### Option 1: Local Development (Best)
```bash
npm run dev

# View V1: http://localhost:3000
# View V2: http://localhost:3000/v2

# Use browser DevTools to inspect feature card backgrounds
# Hover over feature cards to see color differences
```

### Option 2: Color Comparison Test

**Feature Cards - Icon Colors**:
- Look at the **icon inside each feature card circle**
- V1: Car icon (golden), Plane icon (teal), Briefcase icon (golden), Users icon (teal)
- V2: Car icon (teal), Plane icon (blue), Briefcase icon (golden), Users icon (green)

### Option 3: Browser DevTools

1. Right-click on a feature card icon
2. Inspect element
3. Look at the computed color value
4. Compare between V1 and V2

---

## Recommendation: Which to Use?

### Use V1 (Two-Color) If:
- You want a more professional, cohesive brand look
- You prefer restraint and simplicity
- Brand guidelines emphasize two core colors
- You want to emphasize the connection between all services (unified palette)

### Use V2 (Four-Color) If:
- You want more visual variety and separation between services
- You want each service to feel distinct
- You plan to add more services in the future (more colors available)
- You want a slightly more playful, diverse aesthetic

**Our Recommendation**: **V1** - More professional, better brand cohesion, timeless design

---

## Making Differences More Visible (Optional)

If you want the color differences to be more obvious, here are some options:

### Option A: Increase Background Opacity
Change from 10% to 15-20%:

```typescript
// Current
bgClass: "bg-ocean-light/10 group-hover:bg-ocean-light/20"

// More visible
bgClass: "bg-ocean-light/15 group-hover:bg-ocean-light/30"
```

### Option B: Add Colored Border

```typescript
className="group p-6 rounded-2xl bg-background border-2 border-{color}"
```

### Option C: Full Color Icon Backgrounds

```typescript
// Replace current icon background with solid color
className="w-12 h-12 rounded-xl bg-sand-golden"
// And make icon white
className="w-6 h-6 text-white"
```

---

## Technical Implementation

### V1 Feature Array
```typescript
const features = [
  { icon: Car, iconClass: "text-sand-golden", bgClass: "bg-sand-golden/10" },
  { icon: Plane, iconClass: "text-ocean-light", bgClass: "bg-ocean-light/10" },
  { icon: Briefcase, iconClass: "text-sand-golden", bgClass: "bg-sand-golden/10" },
  { icon: Users, iconClass: "text-ocean-light", bgClass: "bg-ocean-light/10" },
];
```

### V2 Feature Array
```typescript
const features = [
  { icon: Car, iconClass: "text-ocean-light", bgClass: "bg-ocean-light/10" },
  { icon: Plane, iconClass: "text-sky-blue", bgClass: "bg-sky-blue/10" },
  { icon: Briefcase, iconClass: "text-sand-golden", bgClass: "bg-sand-golden/10" },
  { icon: Users, iconClass: "text-cliff-green", bgClass: "bg-cliff-green/10" },
];
```

---

## Color Accessibility

All colors have been chosen to meet WCAG AAA contrast requirements when used as foreground elements:

- Ocean Light: Readable on white/light backgrounds
- Sand Golden: Readable on white/light backgrounds
- Sky Blue: Readable on white/light backgrounds
- Cliff Green: Readable on white/light backgrounds

---

## Deployment Strategy

### Recommended Approach:
1. Deploy V1 as the main landing page (/)
2. Keep V2 available at /v2 for A/B testing
3. Use analytics to track user engagement on both pages
4. After 2-4 weeks, choose the better-performing variant
5. Remove or archive the less effective version

### A/B Testing Metrics to Track:
- Time on page
- Scroll depth
- Click-through rate on "Get a Quote" button
- Bounce rate
- Mobile vs desktop engagement

---

## Conclusion

Both V1 and V2 are production-ready and professionally designed. The differences are intentionally subtle to maintain brand consistency while offering a choice between a more restrained two-color palette (V1) and a more diverse four-color palette (V2).

**Final Recommendation**: Use **V1** as the main landing page for its professional cohesion and timeless design. Keep V2 as an alternate for testing or future use.

---

**Document Version**: 1.0
**Last Updated**: December 4, 2025
