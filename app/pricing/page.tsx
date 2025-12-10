'use client';

import { MapPin, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import Header from '@/components/shared/Header';
import { buttonVariants } from '@/components/ui/button';

import { getFixedRoutes } from '../quote/lib/api';
import { FixedRoute } from '../quote/lib/types';

export default function PricingPage() {
  const [routes, setRoutes] = useState<FixedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRoutes() {
      try {
        const data = await getFixedRoutes();
        setRoutes(data.filter(r => r.active));
        setLoading(false);
      } catch {
        setError('Failed to load pricing information');
        setLoading(false);
      }
    }

    loadRoutes();
  }, []);

  // Group routes by departure location
  const groupedRoutes = routes.reduce((acc, route) => {
    const from = route.originName;
    if (!acc[from]) {
      acc[from] = [];
    }
    acc[from].push(route);
    return acc;
  }, {} as Record<string, FixedRoute[]>);

  return (
    <div className="min-h-screen bg-background pt-20">
      <Header />

      {/* Hero Section */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-sage-light via-cream to-background">
        <div className="container px-4 md:px-6 mx-auto max-w-4xl text-center">
          <h1 className="font-playfair text-4xl md:text-5xl lg:text-6xl font-bold text-navy mb-6">
            Our Pricing
          </h1>
          <p className="text-lg md:text-xl text-navy-light max-w-2xl mx-auto mb-8">
            Transparent, competitive rates across Dorset. No hidden fees, no surprises.
          </p>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-lg">
            <h2 className="font-playfair text-2xl md:text-3xl font-semibold text-navy mb-4">
              Why Choose Us?
            </h2>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div>
                <h3 className="font-semibold text-sage-dark mb-2">Most Competitive</h3>
                <p className="text-sm text-muted-foreground">
                  We offer the best rates in the Dorset area, guaranteed.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-sage-dark mb-2">Fixed Pricing</h3>
                <p className="text-sm text-muted-foreground">
                  Popular routes have fixed prices. No surge pricing, ever.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-sage-dark mb-2">Luxury Service</h3>
                <p className="text-sm text-muted-foreground">
                  Professional drivers, premium vehicles, exceptional service.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-12 md:py-20">
        <div className="container px-4 md:px-6 mx-auto max-w-6xl">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-sage-light border-t-sage-dark"></div>
              <p className="mt-4 text-muted-foreground">Loading pricing...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <div className="bg-error/10 border border-error/20 rounded-xl p-6 max-w-md mx-auto">
                <p className="text-error font-medium">{error}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Please try again later or{' '}
                  <Link href="/quote" className="text-sage-accessible hover:underline">
                    get a custom quote
                  </Link>
                </p>
              </div>
            </div>
          )}

          {!loading && !error && Object.keys(groupedRoutes).length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No fixed routes available at the moment.{' '}
                <Link href="/quote" className="text-sage-accessible hover:underline">
                  Get a custom quote
                </Link>
              </p>
            </div>
          )}

          {!loading && !error && Object.keys(groupedRoutes).map((fromLocation) => (
            <div key={fromLocation} className="mb-12">
              <h2 className="font-playfair text-2xl md:text-3xl font-semibold text-navy mb-6">
                From {fromLocation}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedRoutes[fromLocation].map((route) => (
                  <div
                    key={route.routeId}
                    className="bg-card rounded-2xl p-6 shadow-lg border-2 border-sage-light hover:border-sage transition-all hover:shadow-xl"
                  >
                    {/* Route Info */}
                    <div className="mb-4">
                      <div className="flex items-start gap-2 mb-3">
                        <MapPin className="w-5 h-5 text-sage-dark flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-semibold text-navy text-lg">
                            {route.destinationName}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{route.distance} miles</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {route.estimatedDuration} min
                        </span>
                      </div>
                    </div>

                    {/* Vehicle Type */}
                    <div className="mb-4 py-2 px-3 bg-sage-light/30 rounded-lg">
                      <p className="text-xs text-navy-light font-medium">
                        {route.vehicleName}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="mb-4">
                      <div className="text-3xl font-bold text-sage-dark">
                        £{(route.price / 100).toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">One-way journey</p>
                    </div>

                    {/* Book Now Button */}
                    <Link
                      href={`/quote?route=${route.routeId}`}
                      className={buttonVariants({
                        variant: "hero-golden",
                        size: "default",
                        className: "w-full group"
                      })}
                    >
                      Book Now
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Custom Quote CTA */}
          {!loading && !error && routes.length > 0 && (
            <div className="mt-12 bg-gradient-to-br from-navy to-navy-dark rounded-3xl p-8 md:p-12 text-center text-white">
              <h2 className="font-playfair text-3xl md:text-4xl font-bold mb-4">
                Don&apos;t see your route?
              </h2>
              <p className="text-lg text-cream mb-8 max-w-2xl mx-auto">
                We cover all of Dorset and beyond. Get a custom quote for any journey.
              </p>
              <Link
                href="/quote"
                className={buttonVariants({
                  variant: "hero-golden",
                  size: "xl",
                  className: "group"
                })}
              >
                Get Custom Quote
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
