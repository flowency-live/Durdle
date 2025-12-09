'use client';

import { Plane, Clock, Shield, Briefcase, Globe, ArrowRight, KeyRound, Ship, Train } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";

import { buttonVariants } from "@/components/ui/button";
import FeedbackButton from "../components/FeedbackButton";

// New service pillars based on reframe
const servicePillars = [
  {
    icon: Plane,
    title: "Airports, Stations & Ports",
    description:
      "Fixed-price transfers to all UK airports, rail stations, and cruise terminals. Southampton, Poole, Heathrow, Gatwick - we know the routes and the timings.",
    iconClass: "text-sage-dark",
    bgClass: "bg-sage/10 group-hover:bg-sage/20",
  },
  {
    icon: Clock,
    title: "Private Driver by the Hour",
    description:
      "Your personal driver for the day. Whether business or pleasure, enjoy the flexibility of hourly hire with a professional chauffeur.",
    iconClass: "text-navy",
    bgClass: "bg-navy/10 group-hover:bg-navy/20",
  },
  {
    icon: Briefcase,
    title: "Corporate & Trade Accounts",
    description:
      "Simplified invoicing for travel managers, hotels, and travel agents. Dedicated account management for your business travel needs.",
    iconClass: "text-sage-dark",
    bgClass: "bg-sage/10 group-hover:bg-sage/20",
  },
  {
    icon: Globe,
    title: "Onwards Travel Worldwide",
    description:
      "Through our global network, we can arrange your onwards journey at your destination - from London to Monaco, Dubai to Singapore.",
    iconClass: "text-navy",
    bgClass: "bg-navy/10 group-hover:bg-navy/20",
  },
];

// Destinations carousel data
const destinations = [
  {
    id: 'airports',
    icon: Plane,
    title: "Airport Transfers",
    description: "Heathrow, Gatwick, Bristol, Southampton and all major UK airports",
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600&h=900&fit=crop",
    color: "sage",
  },
  {
    id: 'cruise',
    icon: Ship,
    title: "Cruise Transfers",
    description: "Southampton and Poole - serving the world's leading cruise lines",
    image: "https://images.unsplash.com/photo-1548574505-5e239809ee19?w=1600&h=900&fit=crop",
    color: "navy",
  },
  {
    id: 'rail',
    icon: Train,
    title: "Rail Connections",
    description: "London Waterloo, Bournemouth, Southampton Central and beyond",
    image: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=1600&h=900&fit=crop",
    color: "sage",
  },
];

// Why choose us features
const whyChooseUs = [
  {
    title: "Premium Fleet",
    description: "Executive vehicles maintained to the highest standards. Travel in comfort and style.",
  },
  {
    title: "Professional Drivers",
    description: "Experienced, vetted chauffeurs who know the fastest routes. Always punctual, always courteous.",
  },
  {
    title: "Fixed Pricing",
    description: "Know your fare before you book. No surge pricing, no hidden fees, no surprises.",
  },
  {
    title: "Flight Monitoring",
    description: "We track your flight and adjust pickup time automatically. Early landing or delay - we're there.",
  },
];

export default function HomeV2() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDestination, setActiveDestination] = useState(0);

  // Auto-rotate carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveDestination((prev) => (prev + 1) % destinations.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-sage-light/50 shadow-sm">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <Image
                src="/dtc-logo-wave2.png"
                alt="The Dorset Transfer Company"
                width={80}
                height={80}
                className="h-16 w-auto"
              />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a
                href="#services"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Services
              </a>
              <a
                href="/pricing"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </a>
              <a
                href="#destinations"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Destinations
              </a>
              <a
                href="/contact"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact
              </a>
              <a
                href="/"
                className="text-xs font-medium text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                V1
              </a>
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              <FeedbackButton />
              <a
                href="/admin/login"
                className="p-2 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110"
                title="Admin Login"
              >
                <KeyRound className="w-5 h-5" />
              </a>
              <a href="/quote" className={buttonVariants({ variant: "hero-golden", size: "default" })}>
                Get a Quote
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-3 min-w-[60px] min-h-[60px] bg-transparent border-none outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-dark focus-visible:ring-offset-2 rounded menutoggle"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-menu"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              <div className={`icon-left ${mobileMenuOpen ? 'open' : ''}`} />
              <div className={`icon-right ${mobileMenuOpen ? 'open' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div id="mobile-navigation-menu" className="md:hidden border-t border-sage-light/50 bg-background/98 backdrop-blur-lg">
            <div className="container px-4 py-6 mx-auto">
              <nav className="flex flex-col gap-4">
                <a
                  href="#services"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  Services
                </a>
                <a
                  href="/pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  Pricing
                </a>
                <a
                  href="#destinations"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  Destinations
                </a>
                <a
                  href="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  Contact
                </a>
                <a
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium text-muted-foreground/60 hover:text-foreground transition-colors py-2"
                >
                  View V1 Site
                </a>
                <div className="border-t border-border pt-4 mt-2 flex flex-col gap-3">
                  <a href="/quote" className={buttonVariants({ variant: "hero-golden", size: "xl", className: "w-full" })}>
                    Get a Quote
                  </a>
                  <a
                    href="/admin/login"
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white shadow-lg transition-all"
                  >
                    <KeyRound className="w-5 h-5" />
                    <span className="font-medium">Admin Login</span>
                  </a>
                </div>
              </nav>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section - Reframed */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/images/hero-bg.jpg"
              alt="Premium Transfer Service"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="absolute inset-0 bg-gradient-hero-overlay" />

          {/* Soft gradient glows */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full bg-sage/8 blur-3xl" />
            <div className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full bg-navy/10 blur-3xl" />
            <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-sage/5 blur-3xl" />
          </div>

          <div className="container relative z-10 px-4 md:px-6 pt-20 mx-auto">
            <div className="max-w-4xl mx-auto text-center">
              <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm shadow-soft border border-white/20 mb-8">
                <span className="w-2 h-2 rounded-full bg-sage-light animate-pulse" />
                <span className="text-sm font-medium text-white/90">
                  Est. 2025 - Dorset&apos;s Premier Transfer Service
                </span>
              </div>

              <h1 className="animate-fade-up-delay-1 font-playfair text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-white mb-6">
                Your journey starts <span className="text-sage-light">here</span>
              </h1>

              <p className="animate-fade-up-delay-2 text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-10">
                Premium airport transfers, cruise terminal pickups, and corporate travel solutions. Personal service for discerning travellers.
              </p>

              <div className="animate-fade-up-delay-3 flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/quote" className={buttonVariants({ variant: "hero-golden", size: "xl" })}>
                  Get a Quote
                </a>
                <a href="/contact" className={buttonVariants({ variant: "hero-outline", size: "xl" })}>
                  Call Us
                </a>
              </div>

              {/* Key points - Updated */}
              <div className="animate-fade-up-delay-3 mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-center gap-3 text-white/80">
                  <Plane className="w-5 h-5 text-sage-light" />
                  <span className="text-sm font-medium">All UK airports covered</span>
                </div>
                <div className="flex items-center justify-center gap-3 text-white/80">
                  <Clock className="w-5 h-5 text-sage-light" />
                  <span className="text-sm font-medium">Flight tracking included</span>
                </div>
                <div className="flex items-center justify-center gap-3 text-white/80">
                  <Shield className="w-5 h-5 text-sage-light" />
                  <span className="text-sm font-medium">Licensed & insured</span>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0">
            <svg
              viewBox="0 0 1440 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-auto"
              preserveAspectRatio="none"
            >
              <path
                d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
                className="fill-card"
              />
            </svg>
          </div>
        </section>

        {/* Destinations Carousel Section */}
        <section id="destinations" className="relative bg-card overflow-hidden">
          <div className="container px-4 md:px-6 mx-auto py-24">
            <div className="max-w-5xl mx-auto">
              {/* Section Header */}
              <div className="text-center mb-12">
                <h2 className="font-playfair text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-4">
                  Where we&apos;ll take <span className="text-gradient-navy-sage">you</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Airports, cruise terminals, and rail stations across the UK
                </p>
              </div>

              {/* Carousel */}
              <div className="relative">
                {/* Main carousel image */}
                <div className="relative rounded-3xl overflow-hidden h-[400px] md:h-[500px]">
                  {destinations.map((dest, index) => (
                    <div
                      key={dest.id}
                      className={`absolute inset-0 transition-opacity duration-700 ${
                        index === activeDestination ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={dest.image}
                        alt={dest.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                      <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 px-6 text-center">
                        <div className="max-w-2xl">
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${dest.color === 'sage' ? 'bg-sage/20 border-sage/30' : 'bg-navy/20 border-navy/30'} backdrop-blur-sm border mb-4`}>
                            <dest.icon className={`w-5 h-5 ${dest.color === 'sage' ? 'text-sage-dark' : 'text-navy'}`} />
                          </div>
                          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                            {dest.title}
                          </h3>
                          <p className="text-muted-foreground text-lg">
                            {dest.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Carousel indicators */}
                <div className="flex justify-center gap-3 mt-6">
                  {destinations.map((dest, index) => (
                    <button
                      key={dest.id}
                      onClick={() => setActiveDestination(index)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                        index === activeDestination
                          ? 'bg-sage text-white'
                          : 'bg-background border border-border text-muted-foreground hover:border-sage/50'
                      }`}
                    >
                      <dest.icon className="w-4 h-4" />
                      <span className="text-sm font-medium hidden sm:inline">{dest.title.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Service Pillars Section */}
        <section id="services" className="py-24 bg-background">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-playfair text-3xl md:text-4xl font-semibold text-foreground mb-4">
                Our <span className="text-gradient-sage">services</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                From airport runs to worldwide connections - personal service for every journey.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {servicePillars.map((pillar, index) => (
                <div
                  key={pillar.title}
                  className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-card transition-all duration-300"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${pillar.bgClass} flex items-center justify-center mb-4 transition-colors`}
                  >
                    <pillar.icon className={`w-6 h-6 ${pillar.iconClass}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {pillar.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="py-24 bg-card">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-playfair text-3xl md:text-4xl font-semibold text-foreground mb-4">
                Why choose <span className="text-gradient-navy-sage">us</span>?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Professional service, transparent pricing, and local expertise.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {whyChooseUs.map((feature) => (
                <div
                  key={feature.title}
                  className="p-6 rounded-2xl bg-background border border-border"
                >
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Corporate Partnership Section - NEW */}
        <section className="py-24 bg-background">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="font-playfair text-3xl md:text-4xl font-semibold text-foreground mb-4">
                  Partner with <span className="text-gradient-sage">us</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Trusted by hotels, travel agents, and corporate travel managers across Dorset
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center p-8 rounded-2xl bg-card border border-border">
                  <div className="w-16 h-16 rounded-2xl bg-sage/10 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-sage-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">Hotels & Hospitality</h3>
                  <p className="text-muted-foreground">
                    Offer your guests a premium transfer experience. Easy booking, reliable service, your reputation protected.
                  </p>
                </div>

                <div className="text-center p-8 rounded-2xl bg-card border border-border">
                  <div className="w-16 h-16 rounded-2xl bg-navy/10 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">Travel Agents</h3>
                  <p className="text-muted-foreground">
                    Complete your travel packages with quality ground transport. Trade rates and simple invoicing.
                  </p>
                </div>

                <div className="text-center p-8 rounded-2xl bg-card border border-border">
                  <div className="w-16 h-16 rounded-2xl bg-sage/10 flex items-center justify-center mx-auto mb-6">
                    <Briefcase className="w-8 h-8 text-sage-dark" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">Corporate Travel</h3>
                  <p className="text-muted-foreground">
                    Streamlined booking for PAs and travel managers. Account management, consolidated billing, 24/7 support.
                  </p>
                </div>
              </div>

              <div className="text-center mt-12">
                <a href="/contact" className={buttonVariants({ variant: "default", size: "xl" })}>
                  Open a Business Account
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section - Updated */}
        <section className="py-24 bg-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-sage/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-navy/5 rounded-full blur-3xl" />

          <div className="container px-4 md:px-6 relative z-10 mx-auto">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-playfair text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-6">
                Ready to <span className="text-gradient-navy-sage">go</span>?
              </h2>
              <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
                Get an instant quote for your airport transfer, or call us to discuss hourly hire and corporate accounts.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/quote" className={buttonVariants({ variant: "hero-golden", size: "xl", className: "group" })}>
                  Get a Quote
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
                <a href="/contact" className={buttonVariants({ variant: "hero-outline", size: "xl" })}>
                  Call Us
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 bg-background border-t border-border">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center">
              <Image
                src="/dtc-logo-wave2.png"
                alt="The Dorset Transfer Company"
                width={45}
                height={45}
                className="h-8 w-auto"
              />
            </div>

            <nav className="flex gap-8">
              <a
                href="#services"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Services
              </a>
              <a
                href="#destinations"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Destinations
              </a>
              <a
                href="/contact"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact
              </a>
              <a
                href="#privacy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy
              </a>
            </nav>

            <p className="text-sm text-muted-foreground">
              &copy; 2025 The Dorset Transfer Company. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
