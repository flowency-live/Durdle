'use client';

import { useState } from "react";
import { MapPin, Clock, Shield, Car, Users, Briefcase, Plane, ArrowRight, KeyRound } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import Image from "next/image";
import FeedbackButton from "./components/FeedbackButton";

const features = [
  {
    icon: Car,
    title: "Private Transfers",
    description:
      "Comfortable door-to-door service with professional drivers who know every corner of Dorset.",
    iconClass: "text-sage-dark",
    bgClass: "bg-sage/10 group-hover:bg-sage/20",
  },
  {
    icon: Plane,
    title: "Airport Connections",
    description:
      "Stress-free airport transfers to Bournemouth, Southampton, and all major London airports.",
    iconClass: "text-navy",
    bgClass: "bg-navy/10 group-hover:bg-navy/20",
  },
  {
    icon: Briefcase,
    title: "Business Accounts",
    description:
      "Simplified invoicing and dedicated account management for corporate clients.",
    iconClass: "text-sage-dark",
    bgClass: "bg-sage/10 group-hover:bg-sage/20",
  },
  {
    icon: Users,
    title: "Group Travel",
    description:
      "Spacious vehicles for families, events, and group excursions along the Jurassic Coast.",
    iconClass: "text-navy",
    bgClass: "bg-navy/10 group-hover:bg-navy/20",
  },
];

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
                href="#about"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                About
              </a>
              <a
                href="/quoteQR"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact
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
                Get Quote
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
                  href="#about"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  About
                </a>
                <a
                  href="/quoteQR"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  Contact
                </a>
                <div className="border-t border-border pt-4 mt-2 flex flex-col gap-3">
                  <a href="/quote" className={buttonVariants({ variant: "hero-golden", size: "xl", className: "w-full" })}>
                    Get Quote
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
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/images/hero-bg.jpg"
              alt="Dorset Coast"
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
                Travel Dorset with <span className="text-sage-light">elegance</span>
              </h1>

              <p className="animate-fade-up-delay-2 text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-10">
                Reliable, comfortable transfers across the stunning Dorset coast. From airport runs to business travel - we get you there on time, every time.
              </p>

              <div className="animate-fade-up-delay-3 flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/quote" className={buttonVariants({ variant: "hero-golden", size: "xl" })}>
                  Get a Quote
                </a>
                <a href="#services" className={buttonVariants({ variant: "hero-outline", size: "xl" })}>
                  Learn More
                </a>
              </div>

              {/* Key points */}
              <div className="animate-fade-up-delay-3 mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-center gap-3 text-white/80">
                  <MapPin className="w-5 h-5 text-sage-light" />
                  <span className="text-sm font-medium">All of Dorset covered</span>
                </div>
                <div className="flex items-center justify-center gap-3 text-white/80">
                  <Clock className="w-5 h-5 text-sage-light" />
                  <span className="text-sm font-medium">24/7 availability</span>
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

        {/* Journey Narrative Section */}
        <section className="relative bg-background overflow-hidden">
          <div className="container px-4 md:px-6 mx-auto py-24">
            <div className="max-w-5xl mx-auto">
              {/* Section Header */}
              <div className="text-center mb-16">
                <h2 className="font-playfair text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-4">
                  From arrival to <span className="text-gradient-navy-sage">destination</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Your journey through Dorset starts the moment you arrive
                </p>
              </div>

              {/* Journey Steps */}
              <div className="space-y-12">
                {/* Step 1: Arrival */}
                <div className="group relative rounded-3xl overflow-hidden h-[400px] md:h-[500px]">
                  <Image
                    src="/images/dorset/Old-Harry-2-1600x840.jpg"
                    alt="Old Harry Rocks"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 px-6 text-center">
                    <div className="max-w-2xl">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sage/20 backdrop-blur-sm border border-sage/30 mb-4">
                        <span className="w-2 h-2 rounded-full bg-sage-dark" />
                        <span className="text-sm font-medium text-sage-dark">Step 1</span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                        We pick you up
                      </h3>
                      <p className="text-muted-foreground text-lg">
                        From busy airports to tranquil coastal destinations
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 2: Journey */}
                <div className="group relative rounded-3xl overflow-hidden h-[400px] md:h-[500px]">
                  <Image
                    src="/images/dorset/Lulworth-Cove-Jurassic-Coast-Dorset-1600x840.jpg"
                    alt="Lulworth Cove"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 px-6 text-center">
                    <div className="max-w-2xl">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-navy/20 backdrop-blur-sm border border-navy/30 mb-4">
                        <span className="w-2 h-2 rounded-full bg-navy" />
                        <span className="text-sm font-medium text-navy">Step 2</span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                        Relax and enjoy the ride
                      </h3>
                      <p className="text-muted-foreground text-lg">
                        Experience the stunning Jurassic Coast along the way
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 3: Destination */}
                <div className="group relative rounded-3xl overflow-hidden h-[400px] md:h-[500px]">
                  <Image
                    src="/images/dorset/Durdle-Door.jpg"
                    alt="Durdle Door"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 px-6 text-center">
                    <div className="max-w-2xl">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sage/20 backdrop-blur-sm border border-sage/30 mb-4">
                        <span className="w-2 h-2 rounded-full bg-sage-dark" />
                        <span className="text-sm font-medium text-sage-dark">Step 3</span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                        Arrive refreshed
                      </h3>
                      <p className="text-muted-foreground text-lg">
                        Ready to explore Dorset&apos;s iconic landmarks and hidden gems
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Destination Grid */}
              <div className="mt-16">
                <h3 className="text-2xl font-bold text-center text-foreground mb-8">
                  Where we&apos;ll take you
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="group relative rounded-2xl overflow-hidden h-[200px]">
                    <Image
                      src="/images/dorset/GettyImages-501549318-84b3e7bf4a3441708b5c555ac01db4ad.webp"
                      alt="Corfe Castle"
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="font-semibold text-foreground">Corfe Castle</p>
                    </div>
                  </div>
                  <div className="group relative rounded-2xl overflow-hidden h-[200px]">
                    <Image
                      src="/images/dorset/Visit-Shaftesbury.jpg"
                      alt="Shaftesbury"
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="font-semibold text-foreground">Shaftesbury</p>
                    </div>
                  </div>
                  <div className="group relative rounded-2xl overflow-hidden h-[200px] col-span-2 md:col-span-1">
                    <Image
                      src="/images/dorset/1440.jpg"
                      alt="Kingston Lacy"
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="font-semibold text-foreground">Kingston Lacy</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="services" className="py-24 bg-card">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-playfair text-3xl md:text-4xl font-semibold text-foreground mb-4">
                Why choose <span className="text-gradient-sage">us</span>?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We combine local expertise with modern technology to deliver transport that&apos;s
                reliable, transparent, and always on time.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="group p-6 rounded-2xl bg-background border border-border hover:border-primary/30 hover:shadow-card transition-all duration-300"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${feature.bgClass} flex items-center justify-center mb-4 transition-colors`}
                  >
                    <feature.icon className={`w-6 h-6 ${feature.iconClass}`} />
                  </div>
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

        {/* CTA Section */}
        <section className="py-24 bg-background relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-sage/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-navy/5 rounded-full blur-3xl" />

          <div className="container px-4 md:px-6 relative z-10 mx-auto">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-playfair text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-6">
                Ready to book your <span className="text-gradient-navy-sage">next journey</span>?
              </h2>
              <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
                Get an instant quote in seconds. No hidden fees, no surprises - just reliable
                transport when you need it.
              </p>
              <a href="/quote" className={buttonVariants({ variant: "hero-golden", size: "xl", className: "group" })}>
                Get Your Quote
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 bg-card border-t border-border">
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
                href="#about"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                About
              </a>
              <a
                href="#services"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Services
              </a>
              <a
                href="#contact"
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
              &copy; 2024 The Dorset Transfer Company. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
