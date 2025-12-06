# REBRAND IMPLEMENTATION SPEC

**Feature**: The Dorset Transfer Company Rebrand
**Version**: 1.0
**Date**: December 4, 2025
**Status**: Ready for Implementation
**Estimated Duration**: 3-4 hours

---

## Overview

Complete rebrand from "Durdle" to "The Dorset Transfer Company" with new visual identity:
- New logo and wordmark
- Light mode color palette (navy, sage, gray, cream)
- Knockout Sumo typography for headings
- Professional, calm, trustworthy aesthetic

---

## New Brand Identity

### Brand Name
- **Previous**: Durdle
- **New**: The Dorset Transfer Company
- **Short name**: TDTC (for mobile, icons)
- **Domain**: Keep durdle.co.uk (brand recognition)

### Logo
- Horizontal wave icon (teal-navy gradient)
- Full wordmark: "THE DORSET TRANSFER COMPANY"
- Decorative lines and "Est. 2025"
- Beige/cream background

### Color Palette

**Primary Colors**:
```css
Navy (Primary):     #2b444c
Sage (Accent):      #b7d5b9
Gray (Secondary):   #a6a6a6
Cream (Background): #f5f1e8
White (Clean):      #ffffff
```

**Extended Palette** (shades for UI):
```css
Navy Dark:    #1a2428  (darker navy for depth)
Navy Light:   #3d5a64  (lighter navy for muted text)
Sage Dark:    #8fb894  (darker sage for better contrast)
Sage Light:   #d4e7d6  (lighter sage for subtle backgrounds)
Gray Dark:    #707070  (darker gray for text)
Gray Light:   #e5e5e5  (lighter gray for borders)
```

**Functional Colors**:
```css
Success:      #8fb894  (dark sage)
Warning:      #d4a574  (muted gold)
Error:        #c97064  (muted red)
Info:         #3d5a64  (light navy)
```

### Typography

**Headings**: Knockout HTF54-Sumo Regular
- Display: 64px - 120px (Hero titles)
- H1: 48px - 64px
- H2: 36px - 48px
- H3: 24px - 36px
- Letter spacing: -1px to -2px (tight, impactful)

**Body**: System font stack
- Body: 16px - 18px
- Small: 14px
- Tiny: 12px
- Line height: 1.6 (readable)

**Font Stack**:
```css
Headings: 'Knockout Sumo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
Body: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', sans-serif
```

---

## Accessibility Compliance

### Contrast Ratios (WCAG AA)

**Text on White/Cream**:
- Navy (#2b444c): 11:1 ✅ AAA
- Navy Light (#3d5a64): 7.8:1 ✅ AA
- Gray Dark (#707070): 4.6:1 ✅ AA
- Sage Dark (#8fb894): 3.2:1 ⚠️ Large text only (18px+)
- Sage (#b7d5b9): 1.8:1 ❌ Decorative only

**Text on Navy (#2b444c)**:
- White: 11:1 ✅ AAA
- Cream: 9.2:1 ✅ AAA
- Sage Light (#d4e7d6): 8.1:1 ✅ AAA

**Usage Guidelines**:
- Sage (#b7d5b9): Borders, backgrounds, decorative accents ONLY
- Sage Dark (#8fb894): Large headings (24px+), icons
- All body text: Navy or Navy Light on white/cream backgrounds

---

## Section Color Schemes

### Option A: Alternating Sections
```
Header:        White bg, navy text, sage accent
Hero:          Navy bg, white text
Features:      Cream bg, navy text
Journey:       White bg, navy text, sage accents
Testimonials:  Sage light bg, navy text
CTA:           Navy bg, white text
Footer:        Cream bg, navy text
```

### Option B: Minimal Dark Sections
```
Header:        White bg, navy text
Hero:          Cream bg, navy text (light, welcoming)
Features:      White bg, navy text
Journey:       Cream bg with white cards
Services:      White bg, navy text
CTA:           Navy bg, white text (only dark section)
Footer:        Cream bg, navy text
```

**Recommendation**: Option B - mostly light with one strong navy CTA section

---

## Component Updates

### Header
```
Background: White with subtle shadow
Logo: New wave + wordmark
Text: Navy (#2b444c)
Hover: Sage dark (#8fb894)
Border: Sage light (#d4e7d6)
```

### Hero Section
```
Background: Cream (#f5f1e8) or subtle gradient
Heading: Navy, Knockout Sumo
Body: Navy light (#3d5a64)
CTA Button: Navy bg, white text
Secondary CTA: White bg, navy text, sage border
```

### Cards
```
Background: White
Border: Sage light (#d4e7d6) or none (shadow)
Shadow: 0 4px 6px rgba(43, 68, 76, 0.1)
Hover: Lift shadow, sage border
```

### Buttons

**Primary**:
```css
Background: #2b444c (navy)
Text: white
Hover: #1a2428 (darker navy)
```

**Secondary**:
```css
Background: transparent
Border: 2px solid #2b444c
Text: #2b444c
Hover: #2b444c bg, white text
```

**Accent**:
```css
Background: #8fb894 (sage dark)
Text: white
Hover: #7da482 (darker)
```

### Form Inputs
```
Background: White
Border: #e5e5e5 (gray light)
Focus border: #2b444c (navy)
Label: #3d5a64 (navy light)
Placeholder: #a6a6a6 (gray)
```

---

## Tailwind Config Update

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
        navy: {
          DEFAULT: '#2b444c',
          dark: '#1a2428',
          light: '#3d5a64',
        },
        sage: {
          DEFAULT: '#b7d5b9',
          dark: '#8fb894',
          light: '#d4e7d6',
        },
        gray: {
          DEFAULT: '#a6a6a6',
          dark: '#707070',
          light: '#e5e5e5',
        },
        cream: '#f5f1e8',

        // Semantic colors
        background: '#ffffff',
        foreground: '#2b444c',
        card: '#ffffff',
        'card-foreground': '#2b444c',
        border: '#e5e5e5',
        input: '#e5e5e5',
        ring: '#2b444c',

        // Functional
        success: '#8fb894',
        warning: '#d4a574',
        error: '#c97064',
        info: '#3d5a64',
      },
      fontFamily: {
        knockout: ['Knockout Sumo', 'sans-serif'],
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      backgroundImage: {
        'gradient-navy-sage': 'linear-gradient(135deg, #2b444c 0%, #8fb894 100%)',
        'gradient-sage-cream': 'linear-gradient(135deg, #b7d5b9 0%, #f5f1e8 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## Font Installation

### Step 1: Add Font File
```
/app/fonts/
  - KnockoutHTF54-Sumo.woff2 (convert from provided file)
  - KnockoutHTF54-Sumo.woff
```

### Step 2: Update layout.tsx
```typescript
import localFont from "next/font/local";

const knockoutSumo = localFont({
  src: "./fonts/KnockoutHTF54-Sumo.woff2",
  variable: "--font-knockout",
  weight: "400",
  display: "swap",
});

// In <body>:
<body className={`${knockoutSumo.variable} antialiased`}>
```

### Step 3: Use in Components
```typescript
<h1 className="font-knockout text-5xl tracking-tight text-navy">
  The Dorset Transfer Company
</h1>
```

---

## Logo Integration

### Files Needed
1. **NewLogo.png** → `/public/dtc-logo.png` (main logo)
2. **NewLogo.svg** (if available) → `/public/dtc-logo.svg` (vector)
3. **Logo Icon Only** → `/public/dtc-icon.png` (wave only for favicon)

### Header Logo
```tsx
<div className="flex items-center gap-3">
  <Image
    src="/dtc-logo.png"
    alt="The Dorset Transfer Company"
    width={240}
    height={60}
    className="h-12 w-auto"
  />
</div>
```

### Favicon
- Extract wave icon from logo
- Generate favicon set (16x16, 32x32, etc.)
- Update manifest with new theme color (#2b444c)

---

## Migration Checklist

### Phase 1: Setup (30 mins)
- [ ] Update tailwind.config.ts with new colors
- [ ] Convert Knockout Sumo font to web formats (.woff2, .woff)
- [ ] Add font files to /app/fonts/
- [ ] Update layout.tsx with font configuration
- [ ] Save logo files to /public/
- [ ] Test font loading and color palette

### Phase 2: Core Components (1 hour)
- [ ] Update globals.css with new color variables
- [ ] Rebuild header with new logo and colors
- [ ] Update hero section (cream bg, navy text)
- [ ] Rebuild CTA buttons (navy primary, white secondary)
- [ ] Update footer with new branding

### Phase 3: Content Sections (1.5 hours)
- [ ] Journey narrative section (cream/white alternating)
- [ ] Features section (white bg, sage accents)
- [ ] Testimonials section (if added)
- [ ] Update all text colors (navy for headings, navy-light for body)
- [ ] Update all borders (sage-light)

### Phase 4: Polish (1 hour)
- [ ] Update image overlays (darker for light backgrounds)
- [ ] Adjust shadows (navy tint instead of black)
- [ ] Update hover states (sage-dark accents)
- [ ] Test responsive design
- [ ] Accessibility audit (contrast, keyboard nav)
- [ ] Update metadata (title, description, OG image)

---

## Before/After Comparison

### Current (Durdle)
- Dark mode aesthetic
- Vibrant teal (#14b8a6) + golden (#f59e0b)
- Energetic, modern, bold
- Poppins font

### New (The Dorset Transfer Company)
- Light mode aesthetic
- Muted navy (#2b444c) + sage (#b7d5b9)
- Professional, calm, trustworthy
- Knockout Sumo headings

### What Stays
- Layout structure (solid foundation)
- Component patterns (cards, grids, etc.)
- Animations and interactions
- Image-heavy sections
- Mobile-first approach

---

## Solid Color Section Ideas

### Navy Section (High Impact)
```tsx
<section className="bg-navy py-24">
  <div className="container mx-auto text-center">
    <h2 className="font-knockout text-5xl text-white mb-6">
      Ready to book your transfer?
    </h2>
    <p className="text-cream text-lg mb-8 max-w-2xl mx-auto">
      Professional, reliable transport across Dorset and beyond
    </p>
    <button className="bg-white text-navy px-8 py-4 rounded-lg font-semibold hover:bg-sage-light transition">
      Get Your Quote
    </button>
  </div>
</section>
```

### Sage Light Section (Subtle Accent)
```tsx
<section className="bg-sage-light py-24">
  <div className="container mx-auto">
    <h2 className="font-knockout text-4xl text-navy mb-12 text-center">
      What our customers say
    </h2>
    {/* Testimonial cards with white backgrounds */}
  </div>
</section>
```

### Cream Section (Warm, Welcoming)
```tsx
<section className="bg-cream py-24">
  <div className="container mx-auto">
    <div className="grid md:grid-cols-2 gap-12 items-center">
      <div>
        <h2 className="font-knockout text-5xl text-navy mb-6">
          From arrival to destination
        </h2>
        <p className="text-navy-light text-lg">
          Your journey through Dorset starts here
        </p>
      </div>
      <img src="..." className="rounded-2xl shadow-lg" />
    </div>
  </div>
</section>
```

---

## Success Criteria

- [ ] New logo displays correctly across all breakpoints
- [ ] Knockout Sumo font loads without FOUT (flash of unstyled text)
- [ ] All text meets WCAG AA contrast requirements
- [ ] Mobile navigation works with new branding
- [ ] Light mode feels cohesive and professional
- [ ] Site loads < 3 seconds on 3G
- [ ] Lighthouse accessibility score > 90
- [ ] Visual regression tests pass

---

## Rollback Plan

If issues arise:
1. Keep old site at `/v1` route
2. New site at root `/`
3. Can quickly swap back if needed
4. Git branch: `rebrand-dtc`

---

**Ready to implement! Start with Phase 1 (Setup).**
