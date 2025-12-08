import { MapPin, Clock, Shield, Car, Users, Briefcase, Plane, ArrowRight } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Car,
    title: "Private Transfers",
    description: "Comfortable door-to-door service with professional drivers who know every corner of Dorset.",
    iconClass: "text-ocean-light",
    bgClass: "bg-ocean-light/10 group-hover:bg-ocean-light/20",
  },
  {
    icon: Plane,
    title: "Airport Connections",
    description: "Stress-free airport transfers to Bournemouth, Southampton, and all major London airports.",
    iconClass: "text-sky-blue",
    bgClass: "bg-sky-blue/10 group-hover:bg-sky-blue/20",
  },
  {
    icon: Briefcase,
    title: "Business Accounts",
    description: "Simplified invoicing and dedicated account management for corporate clients.",
    iconClass: "text-sand-golden",
    bgClass: "bg-sand-golden/10 group-hover:bg-sand-golden/20",
  },
  {
    icon: Users,
    title: "Group Travel",
    description: "Spacious vehicles for families, events, and group excursions along the Jurassic Coast.",
    iconClass: "text-cliff-green",
    bgClass: "bg-cliff-green/10 group-hover:bg-cliff-green/20",
  },
];

export default function V2() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Image
                src="/durdle-logo.png"
                alt="Durdle Logo"
                width={40}
                height={40}
                className="w-10 h-10"
              />
              <span className="font-bold text-xl text-foreground">Durdle</span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <a href="#services" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Services
              </a>
              <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                About
              </a>
              <a href="#contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </a>
            </nav>

            <Button variant="hero-golden" size="default">
              Book Now
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/images/hero-bg.svg"
              alt="Dorset Coast"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="absolute inset-0 bg-gradient-hero-overlay" />

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full bg-ocean-light/5 blur-3xl" />
            <div className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full bg-sand-golden/5 blur-3xl" />
            <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-cliff-green/5 blur-3xl" />
          </div>

          <div className="container relative z-10 px-4 md:px-6 pt-20 mx-auto">
            <div className="max-w-4xl mx-auto text-center">
              <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm shadow-soft border border-border mb-8">
                <span className="w-2 h-2 rounded-full bg-sand-golden animate-pulse" />
                <span className="text-sm font-medium text-muted-foreground">
                  Dorset&apos;s premier transfer service
                </span>
              </div>

              <h1 className="animate-fade-up-delay-1 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6">
                Travel Dorset with{" "}
                <span className="text-gradient-sand">confidence</span>
              </h1>

              <p className="animate-fade-up-delay-2 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                Reliable, modern transfers across the Dorset coast. From airport runs to
                business travel - we get you there on time, every time.
              </p>

              <div className="animate-fade-up-delay-3 flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="hero-golden" size="xl">
                  Get a Quote
                </Button>
                <Button variant="hero-outline" size="xl">
                  Learn More
                </Button>
              </div>

              <div className="animate-fade-up-delay-3 mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-center gap-3 text-muted-foreground">
                  <MapPin className="w-5 h-5 text-ocean-light" />
                  <span className="text-sm font-medium">All of Dorset covered</span>
                </div>
                <div className="flex items-center justify-center gap-3 text-muted-foreground">
                  <Clock className="w-5 h-5 text-sand-golden" />
                  <span className="text-sm font-medium">24/7 availability</span>
                </div>
                <div className="flex items-center justify-center gap-3 text-muted-foreground">
                  <Shield className="w-5 h-5 text-cliff-green" />
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

        {/* Features Section */}
        <section id="services" className="py-24 bg-card">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Why choose <span className="text-gradient-ocean">Durdle</span>?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We combine local expertise with modern technology to deliver
                transport that&apos;s reliable, transparent, and always on time.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="group p-6 rounded-2xl bg-background border border-border hover:border-primary/30 hover:shadow-card transition-all duration-300"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`w-12 h-12 rounded-xl ${feature.bgClass} flex items-center justify-center mb-4 transition-colors`}>
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
          <div className="absolute top-0 right-0 w-96 h-96 bg-ocean-light/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-sand-golden/5 rounded-full blur-3xl" />

          <div className="container px-4 md:px-6 relative z-10 mx-auto">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Ready to book your <span className="text-gradient-sand">next journey</span>?
              </h2>
              <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
                Get an instant quote in seconds. No hidden fees, no surprises - just
                reliable transport when you need it.
              </p>
              <Button variant="hero-golden" size="xl" className="group">
                Get Your Free Quote
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 bg-card border-t border-border">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/durdle-logo.png"
                alt="Durdle Logo"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <span className="font-bold text-xl text-foreground">Durdle</span>
            </div>

            <nav className="flex gap-8">
              <a href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                About
              </a>
              <a href="#services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Services
              </a>
              <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </a>
              <a href="#privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </a>
            </nav>

            <p className="text-sm text-muted-foreground">
              &copy; 2024 Durdle. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
