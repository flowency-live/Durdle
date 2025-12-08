'use client';

import { User, Mail, Phone, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';

export interface ContactDetails {
  name: string;
  email: string;
  phone: string;
}

interface ContactDetailsFormProps {
  onSubmit: (details: ContactDetails) => void;
  onBack: () => void;
  initialValues?: ContactDetails;
}

export default function ContactDetailsForm({ onSubmit, onBack, initialValues }: ContactDetailsFormProps) {
  const [name, setName] = useState(initialValues?.name || '');
  const [email, setEmail] = useState(initialValues?.email || '');
  const [phone, setPhone] = useState(initialValues?.phone || '');
  const [errors, setErrors] = useState<Partial<ContactDetails>>({});

  // Scroll to top when form appears
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Partial<ContactDetails> = {};

    // Name validation
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\d\s\+\-\(\)]{10,}$/.test(phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim()
      });
    }
  };

  return (
    <>
      <section className="pb-28 md:pb-12">
        <div className="container px-4 mx-auto max-w-2xl">
          <div className="bg-card rounded-3xl shadow-deep p-6 md:p-8">
            {/* Header */}
            <div className="mb-8">
              <h2 className="font-playfair text-2xl md:text-3xl font-bold text-foreground mb-2">
                Lead Passenger Details
              </h2>
              <p className="text-sm text-muted-foreground">
                Please provide contact information for the person responsible for this booking
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Input */}
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-foreground">
                  Full Name *
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors({ ...errors, name: undefined });
                    }}
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border ${
                      errors.name ? 'border-error' : 'border-border'
                    } focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground`}
                    placeholder="e.g., John Smith"
                    autoFocus
                  />
                </div>
                {errors.name && (
                  <div className="flex items-center gap-1.5 text-error text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.name}</span>
                  </div>
                )}
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  Email Address *
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: undefined });
                    }}
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border ${
                      errors.email ? 'border-error' : 'border-border'
                    } focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground`}
                    placeholder="e.g., john.smith@example.com"
                  />
                </div>
                {errors.email && (
                  <div className="flex items-center gap-1.5 text-error text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.email}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Booking confirmation will be sent to this email
                </p>
              </div>

              {/* Phone Input */}
              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-medium text-foreground">
                  Phone Number *
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errors.phone) setErrors({ ...errors, phone: undefined });
                    }}
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border ${
                      errors.phone ? 'border-error' : 'border-border'
                    } focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground`}
                    placeholder="e.g., 07123 456789"
                  />
                </div>
                {errors.phone && (
                  <div className="flex items-center gap-1.5 text-error text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.phone}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Driver will contact you at this number if needed
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-sage-light/30 border border-sage-light rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-sage-dark flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-navy-light">
                    <p className="font-medium mb-1">Privacy & Security</p>
                    <p className="text-xs">
                      Your contact details are securely stored and will only be used for this booking.
                      We never share your information with third parties.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Sticky Navigation Buttons - Mobile Fixed, Desktop Inline */}
      <div className="fixed md:static bottom-0 left-0 right-0 z-40 bg-background border-t md:border-0 border-border p-4 md:p-0 shadow-lg md:shadow-none">
        <div className="container mx-auto max-w-2xl">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="default"
              size="xl"
              onClick={onBack}
              className="flex-1"
            >
              Back to Quote
            </Button>
            <Button
              type="submit"
              variant="hero-golden"
              size="xl"
              onClick={handleSubmit}
              className="flex-1"
            >
              Continue to Payment
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
