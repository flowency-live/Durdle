'use client';

import { Plane, Clock, Briefcase, Globe, ArrowRight, KeyRound, Users, Luggage, ChevronLeft, ChevronRight, Check } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";

import { buttonVariants } from "@/components/ui/button";
import FeedbackButton from "./components/FeedbackButton";

// Vehicles data
const vehicles = [
  {
    id: 'sedan',
    name: 'Sedan',
    subtitle: 'Ford Mondeo or Similar',
    tagline: 'Smart, comfortable, and ideal for everyday travel.',
    passengers: 3,
    luggage: '2 large + 2 small',
    description: 'A refined and reliable option for solo travellers or small groups. Comfortable seating and generous boot space make it perfect for airport runs, rail connections and everyday point-to-point journeys.',
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=500&fit=crop',
  },
  {
    id: 'executive',
    name: 'Executive Sedan',
    subtitle: 'Mercedes E-Class or Similar',
    tagline: 'Business-class comfort for the modern professional.',
    passengers: 3,
    luggage: '2 large + 2 small',
    description: 'Designed for premium and corporate travel, the Executive Sedan offers a quiet, luxurious cabin and enhanced comfort. Ideal for business meetings, airport transfers and clients who appreciate a more elevated travel experience.',
    image: 'https://images.unsplash.com/photo-1563720360172-67b8f3dce741?w=800&h=500&fit=crop',
  },
  {
    id: 'mpv',
    name: 'MPV',
    subtitle: 'VW Caravelle or Similar',
    tagline: 'Spacious, versatile travel for families and groups.',
    passengers: 6,
    luggage: '4-6 large + cabin bags',
    description: 'A practical and flexible option for group travel or passengers with additional luggage. Ideal for cruise port transfers, family holidays, and journeys where extra space makes all the difference.',
    image: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&h=500&fit=crop',
  },
  {
    id: 'executive-mpv',
    name: 'Executive MPV',
    subtitle: 'Mercedes V-Class or Similar',
    tagline: 'Luxury group travel with premium space and style.',
    passengers: 6,
    luggage: '5 large + 5 cabin bags',
    description: 'Offering the perfect blend of capacity and sophistication, the Executive MPV provides first-class comfort for corporate groups, VIP guests, and premium leisure travellers. Spacious, elegant and designed for a seamless journey.',
    image: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&h=500&fit=crop',
  },
];

// Services carousel data
const services = [
  {
    id: 'airports',
    icon: Plane,
    title: "Airports",
    description: "Start and end your trip smoothly with punctual, professional airport transport. We track your flight, manage timings carefully and ensure a relaxed journey to or from all major UK airports.",
    image: "https://images.unsplash.com/photo-1529074963764-98f45c47344b?w=1600&h=900&fit=crop",
    color: "sage",
  },
  {
    id: 'cruise',
    icon: Globe,
    title: "Cruise Terminals",
    description: "Enjoy seamless travel to and from the UK's leading cruise and ferry terminals. We stay updated with sailing times, coordinate every detail, and provide a comfortable, stress-free transfer.",
    image: "https://images.unsplash.com/photo-1548574505-5e239809ee19?w=1600&h=900&fit=crop",
    color: "navy",
  },
  {
    id: 'rail',
    icon: Clock,
    title: "Rail Connections",
    description: "Connect effortlessly with major rail stations across the UK. We coordinate timings around your train schedule and provide a smooth, comfortable transfer to ensure your journey continues without stress.",
    image: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=1600&h=900&fit=crop",
    color: "sage",
  },
  {
    id: 'chauffeur',
    icon: Clock,
    title: "Chauffeurs by the Hour",
    description: "Perfect for occasions that demand flexibility, discretion and exceptional comfort. Whether attending a corporate event or hosting VIP guests, enjoy a professional driver and complete freedom to travel.",
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1600&h=900&fit=crop",
    color: "navy",
  },
  {
    id: 'film',
    icon: Briefcase,
    title: "Film & TV Production",
    description: "Dorset is home to stunning filming locations. Contact us to discuss your production schedule and discover how we can support with unit drivers, production transport and on-location crew movement.",
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1600&h=900&fit=crop",
    color: "sage",
  },
  {
    id: 'destinations',
    icon: Globe,
    title: "Popular UK Destinations",
    description: "Enjoy comfortable, stress-free long-distance travel from Dorset to popular UK destinations. Professional drivers and modern vehicles designed for comfort over any distance.",
    image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1600&h=900&fit=crop",
    color: "navy",
  },
];

// Why choose us features
const whyChooseUs = [
  {
    title: "Premium Comfort",
    description: "Travel in modern, well-maintained vehicles designed to provide a smooth, relaxing and refined journey every time.",
  },
  {
    title: "Professional, Trusted Drivers",
    description: "Our experienced, discreet drivers deliver the high standard of service that corporate clients and frequent travellers depend on.",
  },
  {
    title: "1 Hour Free Airport Waiting",
    description: "We monitor your flight in real time and include up to one hour of free waiting, ensuring a stress-free arrival even if delays occur.",
  },
  {
    title: "Discounted Return Bookings",
    description: "Save more when you book your outbound and return transfers together - perfect for regular travellers.",
  },
  {
    title: "Reliability You Can Count On",
    description: "Punctual arrivals, proactive communication and careful scheduling mean your journey always runs smoothly.",
  },
  {
    title: "Tailored Travel Experiences",
    description: "From bespoke routes to multi-stop itineraries, we adapt every journey to your exact needs.",
  },
  {
    title: "24/7 Availability",
    description: "Whether it's an early-morning airport run or a late-night pickup, our service operates around the clock.",
  },
  {
    title: "Local Knowledge, National Reach",
    description: "Based in Dorset with expert local insight - and providing dependable long-distance transfers across the UK.",
  },
];

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeService, setActiveService] = useState(0);
  const [activeVehicle, setActiveVehicle] = useState(0);

  // Auto-rotate services carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveService((prev) => (prev + 1) % services.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Vehicle carousel navigation
  const nextVehicle = () => setActiveVehicle((prev) => (prev + 1) % vehicles.length);
  const prevVehicle = () => setActiveVehicle((prev) => (prev - 1 + vehicles.length) % vehicles.length);

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
                href="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Home
              </a>
              <a
                href="#vehicles"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Vehicles
              </a>
              <a
                href="#services-carousel"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Services
              </a>
              <a
                href="/faq"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                FAQ
              </a>
              <a
                href="/pricing"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </a>
              <a
                href="/contact"
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
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  Home
                </a>
                <a
                  href="#vehicles"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  Vehicles
                </a>
                <a
                  href="#services-carousel"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  Services
                </a>
                <a
                  href="/faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  FAQ
                </a>
                <a
                  href="/pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  Pricing
                </a>
                <a
                  href="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  Contact
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
        {/* Hero Section */}
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
              <h1 className="animate-fade-up font-playfair text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-white mb-6">
                Your journey starts <span className="text-sage-light">here</span>
              </h1>

              <p className="animate-fade-up-delay-1 text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-10">
                Premium airport transfers, cruise terminal pickups, and corporate travel solutions.
              </p>

              <div className="animate-fade-up-delay-2 flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/quote" className={buttonVariants({ variant: "hero-golden", size: "xl" })}>
                  Quote
                </a>
                <a href="/contact" className={buttonVariants({ variant: "hero-outline", size: "xl" })}>
                  Contact
                </a>
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

        {/* Services Carousel Section */}
        <section id="services-carousel" className="relative bg-card overflow-hidden">
          <div className="container px-4 md:px-6 mx-auto py-24">
            <div className="max-w-5xl mx-auto">
              {/* Section Header */}
              <div className="text-center mb-12">
                <h2 className="font-playfair text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-4">
                  Every journey, <span className="text-gradient-navy-sage">handled</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Premium transport for every occasion
                </p>
              </div>

              {/* Carousel */}
              <div className="relative">
                {/* Main carousel image */}
                <div className="relative rounded-3xl overflow-hidden h-[400px] md:h-[500px]">
                  {services.map((service, index) => (
                    <div
                      key={service.id}
                      className={`absolute inset-0 transition-opacity duration-700 ${
                        index === activeService ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={service.image}
                        alt={service.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                      <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 px-6 text-center">
                        <div className="max-w-2xl">
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${service.color === 'sage' ? 'bg-sage/20 border-sage/30' : 'bg-navy/20 border-navy/30'} backdrop-blur-sm border mb-4`}>
                            <service.icon className={`w-5 h-5 ${service.color === 'sage' ? 'text-sage-dark' : 'text-navy'}`} />
                          </div>
                          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                            {service.title}
                          </h3>
                          <p className="text-muted-foreground text-lg">
                            {service.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Carousel indicators */}
                <div className="flex justify-center gap-3 mt-6">
                  {services.map((service, index) => (
                    <button
                      key={service.id}
                      onClick={() => setActiveService(index)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                        index === activeService
                          ? 'bg-sage text-white'
                          : 'bg-background border border-border text-muted-foreground hover:border-sage/50'
                      }`}
                    >
                      <service.icon className="w-4 h-4" />
                      <span className="text-sm font-medium hidden sm:inline">{service.title.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Vehicles Section */}
        <section id="vehicles" className="py-16 md:py-24 bg-background">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-playfair text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-4">
                Our <span className="text-gradient-navy-sage">Vehicles</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Premium vehicles for every journey
              </p>
            </div>

            {/* Vehicle Carousel */}
            <div className="relative max-w-5xl mx-auto">
              {/* Navigation Arrows */}
              <button
                onClick={prevVehicle}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-sage-light/20 transition-colors"
                aria-label="Previous vehicle"
              >
                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-navy-dark" />
              </button>
              <button
                onClick={nextVehicle}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-sage-light/20 transition-colors"
                aria-label="Next vehicle"
              >
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-navy-dark" />
              </button>

              {/* Vehicle Card */}
              <div className="bg-card rounded-3xl shadow-xl overflow-hidden">
                <div className="grid md:grid-cols-2">
                  {/* Image */}
                  <div className="relative h-64 md:h-80">
                    {vehicles.map((vehicle, index) => (
                      <div
                        key={vehicle.id}
                        className={`absolute inset-0 transition-opacity duration-500 ${
                          index === activeVehicle ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={vehicle.image}
                          alt={vehicle.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Details */}
                  <div className="p-6 md:p-8 flex flex-col justify-center">
                    {vehicles.map((vehicle, index) => (
                      <div
                        key={vehicle.id}
                        className={`transition-opacity duration-500 ${
                          index === activeVehicle ? 'opacity-100' : 'opacity-0 absolute'
                        }`}
                      >
                        <h3 className="font-playfair text-2xl md:text-3xl font-semibold text-foreground mb-1">
                          {vehicle.name}
                        </h3>
                        <p className="text-sm text-sage-dark font-medium mb-3">
                          {vehicle.subtitle}
                        </p>
                        <p className="text-muted-foreground italic mb-4">
                          {vehicle.tagline}
                        </p>

                        {/* Specs */}
                        <div className="flex gap-6 mb-4">
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-sage-dark" />
                            <span className="text-sm text-foreground">Up to {vehicle.passengers}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Luggage className="w-5 h-5 text-sage-dark" />
                            <span className="text-sm text-foreground">{vehicle.luggage}</span>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {vehicle.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dots Indicator */}
              <div className="flex justify-center gap-2 mt-6">
                {vehicles.map((vehicle, index) => (
                  <button
                    key={vehicle.id}
                    onClick={() => setActiveVehicle(index)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === activeVehicle
                        ? 'bg-sage-dark w-8'
                        : 'bg-sage-light hover:bg-sage'
                    }`}
                    aria-label={`View ${vehicle.name}`}
                  />
                ))}
              </div>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {whyChooseUs.map((feature) => (
                <div
                  key={feature.title}
                  className="p-6 rounded-2xl bg-background border border-border"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-sage-dark/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-sage-dark" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Corporate Partnership Section */}
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

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
          {/* Background Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/mercedes-e-class-bg.webp"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-navy-dark/75" />

          <div className="container px-4 md:px-6 relative z-10 mx-auto">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-playfair text-3xl md:text-4xl lg:text-5xl font-semibold text-white mb-6">
                Ready to <span className="text-sage-light">go</span>?
              </h2>
              <p className="text-lg text-white/80 mb-10 max-w-xl mx-auto">
                Get an instant quote for your airport transfer, or call us to discuss hourly hire and corporate accounts.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/quote" className={buttonVariants({ variant: "hero-golden", size: "xl", className: "group" })}>
                  Get a Quote
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
                <a href="/contact" className={buttonVariants({ variant: "hero-outline", size: "xl" })}>
                  Contact
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-navy-dark text-white">
        <div className="container px-4 md:px-6 mx-auto">
          {/* Main Footer Content */}
          <div className="py-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Company Info & Details - Left Side */}
            <div className="lg:col-span-5">
              <Image
                src="/dtc-logo-wave2.png"
                alt="The Dorset Transfer Company"
                width={80}
                height={80}
                className="h-16 w-auto mb-6"
              />
              <p className="text-white/80 leading-relaxed mb-6 max-w-sm">
                Premium transfer services across Dorset and the UK. Professional drivers, luxury vehicles, exceptional service.
              </p>
              <div className="text-sm text-white/60 space-y-1">
                <p className="font-medium text-white/80">The Dorset Transfer Company</p>
                <p>Company No: 16884513</p>
                <p className="pt-2">
                  383 Verity Crescent, Poole<br />
                  England, BH17 8TS
                </p>
              </div>
            </div>

            {/* Links - Right Side */}
            <div className="lg:col-span-7">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                {/* Navigation */}
                <div>
                  <h4 className="font-semibold text-sage-light mb-4">Navigate</h4>
                  <nav className="flex flex-col gap-3">
                    <a href="/" className="text-sm text-white/70 hover:text-white transition-colors">Home</a>
                    <a href="#services-carousel" className="text-sm text-white/70 hover:text-white transition-colors">Services</a>
                    <a href="#vehicles" className="text-sm text-white/70 hover:text-white transition-colors">Vehicles</a>
                    <a href="/pricing" className="text-sm text-white/70 hover:text-white transition-colors">Pricing</a>
                  </nav>
                </div>

                {/* Support */}
                <div>
                  <h4 className="font-semibold text-sage-light mb-4">Support</h4>
                  <nav className="flex flex-col gap-3">
                    <a href="/faq" className="text-sm text-white/70 hover:text-white transition-colors">FAQ</a>
                    <a href="/contact" className="text-sm text-white/70 hover:text-white transition-colors">Contact</a>
                    <a href="/accessibility" className="text-sm text-white/70 hover:text-white transition-colors">Accessibility</a>
                  </nav>
                </div>

                {/* Legal */}
                <div>
                  <h4 className="font-semibold text-sage-light mb-4">Legal</h4>
                  <nav className="flex flex-col gap-3">
                    <a href="/terms" className="text-sm text-white/70 hover:text-white transition-colors">Terms & Conditions</a>
                    <a href="/privacy" className="text-sm text-white/70 hover:text-white transition-colors">Privacy Policy</a>
                    <a href="/cookies" className="text-sm text-white/70 hover:text-white transition-colors">Cookie Policy</a>
                  </nav>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="py-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-white/50">
              &copy; 2025 The Dorset Transfer Company. All rights reserved.
            </p>
            <p className="text-xs text-white/40">
              Licensed private hire operator
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
