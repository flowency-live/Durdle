'use client';

import { Plane, Globe, Clock, Briefcase, ArrowRight } from 'lucide-react';
import Link from 'next/link';

import Header from '@/components/shared/Header';
import { buttonVariants } from '@/components/ui/button';

// Services data
const services = [
  {
    id: 'airports',
    icon: Plane,
    title: "Airports",
    tagline: "Stress-free airport transfers across the UK",
    description: "Start and end your trip smoothly with punctual, professional airport transport. We track your flight, manage timings carefully and ensure a relaxed journey to or from all major UK airports.",
    features: [
      "All major UK airports covered",
      "Real-time flight tracking",
      "1 hour free waiting time",
      "Meet & greet in arrivals",
      "Professional uniformed drivers",
    ],
    image: "https://images.unsplash.com/photo-1529074963764-98f45c47344b?w=1600&h=900&fit=crop",
    color: "sage",
  },
  {
    id: 'cruise',
    icon: Globe,
    title: "Cruise Terminals",
    tagline: "Seamless port transfers for cruise passengers",
    description: "Enjoy seamless travel to and from the UK's leading cruise and ferry terminals. We stay updated with sailing times, coordinate every detail, and provide a comfortable, stress-free transfer for the beginning or end of your journey.",
    features: [
      "Southampton, Portsmouth, Poole & more",
      "Live sailing time monitoring",
      "Luggage assistance available",
      "Flexible scheduling for delays",
      "Door-to-door service",
    ],
    image: "https://images.unsplash.com/photo-1548574505-5e239809ee19?w=1600&h=900&fit=crop",
    color: "navy",
  },
  {
    id: 'rail',
    icon: Clock,
    title: "Rail Connections",
    tagline: "Effortless connections to rail stations",
    description: "Connect effortlessly with major rail stations across the UK. We coordinate timings around your train schedule and provide a smooth, comfortable transfer to ensure your journey continues without stress or delay.",
    features: [
      "All major UK stations",
      "Timed to your train schedule",
      "First & last mile solutions",
      "Business & leisure travel",
      "Onward journey planning",
    ],
    image: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=1600&h=900&fit=crop",
    color: "sage",
  },
  {
    id: 'chauffeur',
    icon: Clock,
    title: "Chauffeurs by the Hour",
    tagline: "Flexibility and luxury on your schedule",
    description: "Perfect for occasions that demand flexibility, discretion and exceptional comfort. Whether you're attending a corporate event, hosting VIP guests, or simply require a luxury chauffeur in Dorset, we provide a tailored, premium experience designed around your schedule. Enjoy a professional driver, a high-end vehicle and complete freedom to travel wherever you need, for as long as you need.",
    features: [
      "Minimum 5-hour booking",
      "Professional, discreet drivers",
      "Executive vehicles",
      "Multi-stop itineraries",
      "Corporate events & weddings",
    ],
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1600&h=900&fit=crop",
    color: "navy",
  },
  {
    id: 'film',
    icon: Briefcase,
    title: "Film & TV Production",
    tagline: "Supporting Dorset's creative industries",
    description: "Dorset is home to some of the most stunning filming locations in the UK, from dramatic coastlines to beautiful countryside. If you are a Film or TV production company filming in Dorset, contact us today to discuss your filming schedule and discover how we can support your production with unit drivers, production transport and on-location crew movement.",
    features: [
      "Unit drivers available",
      "Production transport",
      "Crew movement logistics",
      "Location knowledge",
      "Flexible scheduling",
    ],
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1600&h=900&fit=crop",
    color: "sage",
  },
  {
    id: 'destinations',
    icon: Globe,
    title: "Popular UK Destinations",
    tagline: "Long-distance comfort anywhere in the UK",
    description: "Enjoy comfortable, stress-free long-distance travel from Dorset to popular UK destinations. Whether you're travelling for business meetings, leisure trips, airport connections or simply prefer a smooth door-to-door private transfer, we provide reliable, premium transport anywhere in the UK. Our long-distance chauffeur service ensures a relaxed journey, with professional drivers and modern vehicles designed for comfort over any distance.",
    features: [
      "Nationwide coverage",
      "Business & leisure travel",
      "Comfort over long distances",
      "Professional drivers",
      "Modern premium vehicles",
    ],
    image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1600&h=900&fit=crop",
    color: "navy",
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-background pt-20">
      <Header />

      {/* Hero Section */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-sage-light via-cream to-background">
        <div className="container px-4 md:px-6 mx-auto max-w-4xl text-center">
          <h1 className="font-playfair text-4xl md:text-5xl lg:text-6xl font-bold text-navy mb-6">
            Our Services
          </h1>
          <p className="text-lg md:text-xl text-navy-light max-w-2xl mx-auto">
            Premium transport solutions for every journey
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-12 md:py-20">
        <div className="container px-4 md:px-6 mx-auto max-w-6xl">
          <div className="space-y-16">
            {services.map((service, index) => (
              <div
                key={service.id}
                id={service.id}
                className={`grid md:grid-cols-2 gap-8 items-center ${
                  index % 2 === 1 ? 'md:flex-row-reverse' : ''
                }`}
              >
                {/* Image */}
                <div className={`relative h-64 md:h-96 rounded-3xl overflow-hidden shadow-xl ${
                  index % 2 === 1 ? 'md:order-2' : ''
                }`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className={`absolute top-4 left-4 w-12 h-12 rounded-xl ${
                    service.color === 'sage' ? 'bg-sage/90' : 'bg-navy/90'
                  } flex items-center justify-center`}>
                    <service.icon className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className={index % 2 === 1 ? 'md:order-1' : ''}>
                  <h2 className="font-playfair text-3xl md:text-4xl font-semibold text-foreground mb-2">
                    {service.title}
                  </h2>
                  <p className={`text-lg font-medium mb-4 ${
                    service.color === 'sage' ? 'text-sage-dark' : 'text-navy'
                  }`}>
                    {service.tagline}
                  </p>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    {service.description}
                  </p>

                  {/* Features */}
                  <ul className="space-y-2 mb-6">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          service.color === 'sage' ? 'bg-sage-dark' : 'bg-navy'
                        }`} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href="/quote"
                    className={buttonVariants({
                      variant: "hero-golden",
                      size: "default",
                      className: "group"
                    })}
                  >
                    Book This Service
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container px-4 md:px-6 mx-auto max-w-3xl text-center">
          <h2 className="font-playfair text-3xl md:text-4xl font-semibold text-foreground mb-4">
            Ready to book your transfer?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Get an instant quote or contact us to discuss your requirements
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/quote" className={buttonVariants({ variant: "hero-golden", size: "xl", className: "group" })}>
              Get a Quote
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/contact" className={buttonVariants({ variant: "outline-dark", size: "xl" })}>
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
