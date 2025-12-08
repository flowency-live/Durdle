'use client';

import { CreditCard, Lock, AlertCircle, Info } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';

export interface PaymentDetails {
  cardNumber: string;
  cardName: string;
  expiryDate: string;
  cvv: string;
}

interface PaymentFormProps {
  onSubmit: (details: PaymentDetails) => void;
  onBack: () => void;
  initialValues?: PaymentDetails;
}

export default function PaymentForm({ onSubmit, onBack, initialValues }: PaymentFormProps) {
  const [cardNumber, setCardNumber] = useState(initialValues?.cardNumber || '');
  const [cardName, setCardName] = useState(initialValues?.cardName || '');
  const [expiryDate, setExpiryDate] = useState(initialValues?.expiryDate || '');
  const [cvv, setCvv] = useState(initialValues?.cvv || '');
  const [errors, setErrors] = useState<Partial<PaymentDetails>>({});

  // Scroll to top when form appears
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(' ').substring(0, 19); // 16 digits + 3 spaces
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<PaymentDetails> = {};

    // Card number validation (basic)
    const cleanedCardNumber = cardNumber.replace(/\s/g, '');
    if (!cleanedCardNumber) {
      newErrors.cardNumber = 'Card number is required';
    } else if (!/^\d{16}$/.test(cleanedCardNumber)) {
      newErrors.cardNumber = 'Card number must be 16 digits';
    }

    // Card name validation
    if (!cardName.trim()) {
      newErrors.cardName = 'Cardholder name is required';
    } else if (cardName.trim().length < 3) {
      newErrors.cardName = 'Name must be at least 3 characters';
    }

    // Expiry date validation
    if (!expiryDate) {
      newErrors.expiryDate = 'Expiry date is required';
    } else if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
      newErrors.expiryDate = 'Invalid format (MM/YY)';
    } else {
      const [month, year] = expiryDate.split('/').map(Number);
      const now = new Date();
      const currentYear = now.getFullYear() % 100;
      const currentMonth = now.getMonth() + 1;

      if (month < 1 || month > 12) {
        newErrors.expiryDate = 'Invalid month';
      } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
        newErrors.expiryDate = 'Card has expired';
      }
    }

    // CVV validation
    if (!cvv) {
      newErrors.cvv = 'CVV is required';
    } else if (!/^\d{3,4}$/.test(cvv)) {
      newErrors.cvv = 'CVV must be 3 or 4 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit({
        cardNumber: cardNumber.trim(),
        cardName: cardName.trim(),
        expiryDate: expiryDate.trim(),
        cvv: cvv.trim()
      });
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
    if (errors.cardNumber) setErrors({ ...errors, cardNumber: undefined });
  };

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value);
    setExpiryDate(formatted);
    if (errors.expiryDate) setErrors({ ...errors, expiryDate: undefined });
  };

  return (
    <>
      <section className="pb-28 md:pb-12">
        <div className="container px-4 mx-auto max-w-2xl">
          <div className="bg-card rounded-3xl shadow-deep p-6 md:p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Lock className="w-6 h-6 text-sage-dark" />
              <h2 className="font-playfair text-2xl md:text-3xl font-bold text-foreground">
                Secure Payment
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter your payment details to confirm your booking
            </p>
          </div>

          {/* Important Notice */}
          <div className="mb-6 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">Payment Authorization Hold</p>
                <p className="text-xs">
                  Your card will be authorized but <strong>not charged</strong> until your transfer is completed.
                  The final amount may be adjusted based on actual distance, wait time, or other factors.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Card Number Input */}
            <div className="space-y-2">
              <label htmlFor="cardNumber" className="block text-sm font-medium text-foreground">
                Card Number *
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                </div>
                <input
                  id="cardNumber"
                  type="text"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border ${
                    errors.cardNumber ? 'border-error' : 'border-border'
                  } focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground`}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  autoFocus
                />
              </div>
              {errors.cardNumber && (
                <div className="flex items-center gap-1.5 text-error text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.cardNumber}</span>
                </div>
              )}
            </div>

            {/* Cardholder Name Input */}
            <div className="space-y-2">
              <label htmlFor="cardName" className="block text-sm font-medium text-foreground">
                Cardholder Name *
              </label>
              <input
                id="cardName"
                type="text"
                value={cardName}
                onChange={(e) => {
                  setCardName(e.target.value);
                  if (errors.cardName) setErrors({ ...errors, cardName: undefined });
                }}
                className={`w-full px-4 py-3 rounded-xl border ${
                  errors.cardName ? 'border-error' : 'border-border'
                } focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground`}
                placeholder="e.g., JOHN SMITH"
              />
              {errors.cardName && (
                <div className="flex items-center gap-1.5 text-error text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.cardName}</span>
                </div>
              )}
            </div>

            {/* Expiry Date and CVV Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Expiry Date */}
              <div className="space-y-2">
                <label htmlFor="expiryDate" className="block text-sm font-medium text-foreground">
                  Expiry Date *
                </label>
                <input
                  id="expiryDate"
                  type="text"
                  value={expiryDate}
                  onChange={handleExpiryDateChange}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    errors.expiryDate ? 'border-error' : 'border-border'
                  } focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground`}
                  placeholder="MM/YY"
                  maxLength={5}
                />
                {errors.expiryDate && (
                  <div className="flex items-center gap-1.5 text-error text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.expiryDate}</span>
                  </div>
                )}
              </div>

              {/* CVV */}
              <div className="space-y-2">
                <label htmlFor="cvv" className="block text-sm font-medium text-foreground">
                  CVV *
                </label>
                <input
                  id="cvv"
                  type="text"
                  value={cvv}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setCvv(value);
                    if (errors.cvv) setErrors({ ...errors, cvv: undefined });
                  }}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    errors.cvv ? 'border-error' : 'border-border'
                  } focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground`}
                  placeholder="123"
                  maxLength={4}
                />
                {errors.cvv && (
                  <div className="flex items-center gap-1.5 text-error text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.cvv}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-sage-light/30 border border-sage-light rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-sage-dark flex-shrink-0 mt-0.5" />
                <div className="text-sm text-navy-light">
                  <p className="font-medium mb-1">Secure Transaction</p>
                  <p className="text-xs">
                    Your payment information is encrypted and secure. We never store your full card details.
                  </p>
                </div>
              </div>
            </div>

            {/* Mock Payment Warning */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900 dark:text-amber-100">
                  <p className="font-medium mb-1">Development Mode</p>
                  <p className="text-xs">
                    This is a mock payment form for demonstration purposes. No actual payment will be processed.
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
            Back to Details
          </Button>
          <Button
            type="submit"
            variant="hero-golden"
            size="xl"
            onClick={handleSubmit}
            className="flex-1"
          >
            Confirm Booking
          </Button>
        </div>
      </div>
    </div>
  </>
  );
}
