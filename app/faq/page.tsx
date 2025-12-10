'use client';

import { ChevronDown, Check } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import Header from '@/components/shared/Header';
import { buttonVariants } from '@/components/ui/button';

// FAQ data organized by category
const faqCategories = [
  {
    title: "Booking & Services",
    faqs: [
      {
        question: "How do I book a transfer with The Dorset Transfer Company?",
        answer: "Booking your transfer is simple. You can reserve your journey online, by email, or by calling our team directly. Once confirmed, we'll send full booking details and your driver's information for a seamless travel experience."
      },
      {
        question: "Do you offer fixed pricing for Dorset transfers?",
        answer: "Yes - we have a range of fixed prices for popular destinations. The price we quote is the price you pay, with no hidden extras."
      },
      {
        question: "What areas do you cover across Dorset and the UK?",
        answer: "We provide private hire and transfer services throughout Dorset, including Blandford, Bournemouth, Christchurch, Dorchester, Poole, Swanage, Wareham, Weymouth and Wimborne and surrounding areas. We also cover all major UK airports, cruise and ferry ports, railway stations, hotels, and long-distance destinations nationwide."
      },
      {
        question: "Do you track flights, cruise sailings and train arrival times?",
        answer: "Yes - we use live tracking tools to monitor all flights, ship arrivals, and train schedules. If your arrival time changes, we adjust your pickup automatically to ensure a smooth, stress-free transfer."
      },
      {
        question: "What happens if my flight, ship or train is delayed?",
        answer: "We closely monitor your arrival and adjust your pickup time accordingly. For airport transfers, we include one hour of free waiting time, and we offer flexible waiting options for cruise, ferry and rail pickups."
      },
      {
        question: "What vehicle types do you offer for transfers in Dorset?",
        answer: "Our fleet includes: Sedan (Ford Mondeo or similar) - up to 3 passengers, 2 large suitcases + 2 small bags. Executive Sedan (Mercedes E-Class or similar) - up to 3 passengers, 2 large suitcases + 2 small bags. MPV (VW Caravelle or similar) - up to 6 passengers, 4-6 large suitcases + cabin bags. Executive MPV (Mercedes V-Class or similar) - up to 6 passengers, 5 large suitcases + 5 cabin bags."
      },
      {
        question: "Can you accommodate extra luggage or specialist equipment?",
        answer: "Yes. Our MPV and Executive MPV vehicles are perfect for passengers with additional luggage, cruise cases, sports equipment or bulky items. Just inform us when booking so we can allocate the right vehicle."
      },
      {
        question: "Do you provide child seats for Dorset transfers?",
        answer: "Child seats are available upon request for all journeys, including airport and long-distance travel. Please tell us your requirements when booking so we can fit the appropriate seat."
      },
      {
        question: "Are your drivers licensed, insured and DBS checked?",
        answer: "Yes - all drivers at The Dorset Transfer Company are fully licensed, DBS checked and commercially insured for private hire. Your safety, comfort and professionalism are always our priority."
      },
      {
        question: "Do you offer corporate accounts or business travel packages?",
        answer: "Yes. We provide tailored corporate accounts, monthly invoicing options, and priority bookings for companies and frequent travellers. Ideal for regular airport runs, staff travel and executive journeys."
      },
      {
        question: "Where will my driver meet me at the airport?",
        answer: "For all airport pickups, your driver will meet you in the arrivals hall at the designated meeting point, holding a clear name board. You'll also receive their contact details before landing."
      },
      {
        question: "How much waiting time is included in airport pickups?",
        answer: "Airport transfers include 1 hour of free waiting time after your flight lands. This allows plenty of time for passport control, baggage collection and unexpected delays."
      },
      {
        question: "Where do you pick up at cruise or ferry terminals?",
        answer: "We collect passengers from the official pickup zones at each UK cruise and ferry terminal. Your driver will confirm the exact location and meet you as you disembark for a smooth start to your transfer."
      },
      {
        question: "What if my cruise ship docks earlier or later than scheduled?",
        answer: "We monitor all live docking updates. Whether your cruise arrives ahead of schedule or is delayed, your driver will adjust their arrival time and meet you when you're ready."
      },
      {
        question: "Do you offer station-to-station transfers or onward journeys?",
        answer: "Yes - we provide transfers to and from all major UK railway stations. Whether you need a Dorset station transfer or an onward journey to a hotel, airport or cruise terminal, we'll get you there comfortably."
      },
    ]
  },
  {
    title: "General Policies",
    faqs: [
      {
        question: "What is your cancellation policy?",
        answer: "We offer fair and flexible cancellation terms. Most bookings cancelled with reasonable notice receive a full refund. Please refer to our cancellation policy or contact us for journey-specific details."
      },
      {
        question: "Can I request multiple stops or a customised route?",
        answer: "Yes - we can tailor any journey to your needs, including additional pickups, drop-offs or multi-stop itineraries. Simply let us know your requirements when booking."
      },
      {
        question: "Do you operate 24/7?",
        answer: "Yes, our Dorset transfer service operates 24 hours a day, 7 days a week - ideal for early flights, late arrivals and time-critical business travel."
      },
      {
        question: "How can I pay for my transfer?",
        answer: "We accept all major debit and credit cards and corporate invoicing for approved account holders. Payment can be made at the time of booking or securely in advance."
      },
      {
        question: "Can I receive a receipt or invoice for business expenses?",
        answer: "Yes. We provide digital receipts and fully itemised invoices for all journeys - perfect for expense claims and corporate travel records."
      },
      {
        question: "Do you offer meet-and-greet services?",
        answer: "Yes - professional meet-and-greet is included for airport arrivals and available upon request for ports and rail stations. Ideal for VIP guests and business clients."
      },
      {
        question: "Can I book a return transfer at the same time?",
        answer: "Of course. You can book both legs of your journey in advance, and return transfers may qualify for discounted pricing."
      },
      {
        question: "Do you offer long-distance or nationwide transfers?",
        answer: "Yes. We provide comfortable long-distance and cross-country travel, including business roadshows, intercity transfers and UK-wide corporate journeys."
      },
      {
        question: "How do I contact my driver on the day of travel?",
        answer: "You'll receive your driver's name, vehicle details and contact number before your pickup. You can reach them directly, or contact our support team 24/7 for assistance."
      },
      {
        question: "Can you accommodate special travel requests or accessibility needs?",
        answer: "Yes - we're happy to help with accessibility requirements, VIP arrangements, luggage support, or any bespoke requests. Simply let us know when booking so we can prepare the right vehicle and service."
      },
    ]
  }
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-center justify-between text-left hover:bg-muted/50 transition-colors px-4 -mx-4"
      >
        <span className="font-medium text-foreground pr-4">{question}</span>
        <ChevronDown className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="pb-5 px-4 -mx-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-sage-dark/10 flex items-center justify-center mt-0.5">
              <Check className="w-4 h-4 text-sage-dark" />
            </div>
            <p className="text-muted-foreground leading-relaxed">{answer}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background pt-20">
      <Header />

      {/* Hero Section */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-sage-light via-cream to-background">
        <div className="container px-4 md:px-6 mx-auto max-w-4xl text-center">
          <h1 className="font-playfair text-4xl md:text-5xl lg:text-6xl font-bold text-navy mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-lg md:text-xl text-navy-light max-w-2xl mx-auto">
            Everything you need to know about our transfer services
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-12 md:py-20">
        <div className="container px-4 md:px-6 mx-auto max-w-3xl">
          {faqCategories.map((category) => (
            <div key={category.title} className="mb-12">
              <h2 className="font-playfair text-2xl md:text-3xl font-semibold text-foreground mb-6 pb-2 border-b-2 border-sage-dark">
                {category.title}
              </h2>
              <div className="space-y-0">
                {category.faqs.map((faq) => (
                  <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
                ))}
              </div>
            </div>
          ))}

          {/* CTA */}
          <div className="mt-16 text-center bg-card rounded-3xl p-8 md:p-12">
            <h3 className="font-playfair text-2xl md:text-3xl font-semibold text-foreground mb-4">
              Still have questions?
            </h3>
            <p className="text-muted-foreground mb-6">
              Our team is here to help. Get in touch and we&apos;ll be happy to assist.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact" className={buttonVariants({ variant: "hero-golden", size: "xl" })}>
                Contact Us
              </Link>
              <Link href="/quote" className={buttonVariants({ variant: "outline-dark", size: "xl" })}>
                Get a Quote
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
