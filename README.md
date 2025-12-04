# Durdle - Dorset Transfer Service

Professional transport booking platform for Dorset Transfer Company.

## Project Overview

Durdle (NOTS Platform) is a comprehensive transport management system built with Next.js 14, TypeScript, and Tailwind CSS. This repository contains the customer-facing website with a modern landing page showcasing transfer services across the Dorset region.

## Features

- **Responsive Landing Page**: Modern, professional design optimized for all devices
- **Two Design Variants**:
  - V1 (default): Two-color brand system (Teal + Golden)
  - V2 at `/v2`: Four-color expanded palette
- **Service Showcase**: Airport connections, private transfers, business accounts, group travel
- **Optimized Performance**: Static site generation with Next.js App Router
- **Production Ready**: Built for AWS Amplify deployment

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Icons**: Lucide React
- **Deployment**: AWS Amplify

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

View the alternate design at [http://localhost:3000/v2](http://localhost:3000/v2).

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run start
```

## Project Structure

```
Durdle/
├── app/
│   ├── page.tsx          # Main landing page (V1 - two-color)
│   ├── v2/page.tsx       # Alternate landing page (V2 - four-color)
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles and CSS variables
├── components/
│   └── ui/
│       └── button.tsx    # Reusable button component
├── lib/
│   └── utils.ts          # Utility functions (cn helper)
├── public/
│   └── images/
│       └── hero-bg.svg   # Hero background image
├── Documentation/        # Technical specs and architecture docs
├── amplify.yml          # AWS Amplify build configuration
└── tailwind.config.ts   # Tailwind configuration with custom theme
```

## Design System

### Brand Colors

- **Ocean Light**: `hsl(177, 50%, 45%)` - Primary teal from logo
- **Sand Golden**: `hsl(38, 85%, 58%)` - Primary golden from logo
- **Sky Blue**: `hsl(200, 80%, 60%)` - Accent blue (V2 only)
- **Cliff Green**: `hsl(150, 40%, 50%)` - Accent green (V2 only)

### Components

- Responsive header with navigation
- Hero section with gradient overlays
- Feature cards with hover effects
- Call-to-action section
- Footer with links

## Deployment

### AWS Amplify

This project is configured for AWS Amplify deployment:

1. Push code to GitHub
2. Connect repository to AWS Amplify
3. Amplify will automatically detect `amplify.yml` and deploy
4. Configure custom domain in Amplify console

The `amplify.yml` file handles:
- Dependency installation
- Production build
- Cache optimization

### Manual Deployment

```bash
npm run build
```

Deploy the `.next` folder to your hosting provider.

## Landing Page Variants

### V1 (Default) - Two-Color System
**Route**: `/`

Professional, brand-focused design using only teal and golden colors. More restrained and cohesive.

### V2 - Four-Color System
**Route**: `/v2`

Expanded palette with sky blue and cliff green accents. More visual variety in feature cards.

## Documentation

Comprehensive technical documentation is available in the `/Documentation` folder:

- Initial PRD
- Technical Architecture
- API Specification
- Database Schema
- User Stories
- Security & Compliance
- Deployment Runbook

## License

Private - Dorset Transfer Company

## Contact

For questions about this project, contact the development team.
