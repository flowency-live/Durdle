'use client';

import { X, Copy, Mail, MessageCircle, Share2, Check, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/config/api';

import { QuoteResponse, MultiVehicleQuoteResponse, VehiclePricing } from '../lib/types';

interface ShareQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteData: QuoteResponse | MultiVehicleQuoteResponse;
  selectedVehicle?: string;
}

interface SaveQuoteResponse {
  quoteId: string;
  token: string;
  shareUrl: string;
  quote: object;
}

export default function ShareQuoteModal({
  isOpen,
  onClose,
  quoteData,
  selectedVehicle = 'standard',
}: ShareQuoteModalProps) {
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prepare quote data for saving
  const prepareQuoteForSave = () => {
    // Check if it's a multi-vehicle response
    if ('compareMode' in quoteData && quoteData.compareMode) {
      const vehicleData = quoteData.vehicles[selectedVehicle as keyof typeof quoteData.vehicles] as VehiclePricing;
      return {
        journey: quoteData.journey,
        pricing: vehicleData.oneWay,
        vehicleType: selectedVehicle,
        pickupLocation: quoteData.pickupLocation,
        dropoffLocation: quoteData.dropoffLocation,
        pickupTime: quoteData.pickupTime,
        passengers: quoteData.passengers,
        luggage: quoteData.luggage,
        waypoints: quoteData.waypoints,
        journeyType: quoteData.journeyType,
        durationHours: quoteData.durationHours,
      };
    }

    // Single vehicle response - cast to QuoteResponse since compareMode check failed
    const singleQuote = quoteData as QuoteResponse;
    return {
      journey: singleQuote.journey,
      pricing: singleQuote.pricing,
      vehicleType: singleQuote.vehicleType,
      pickupLocation: singleQuote.pickupLocation,
      dropoffLocation: singleQuote.dropoffLocation,
      pickupTime: singleQuote.pickupTime,
      passengers: singleQuote.passengers,
      luggage: singleQuote.luggage,
      waypoints: singleQuote.waypoints,
      returnJourney: singleQuote.returnJourney,
    };
  };

  // Auto-generate share link when modal opens
  useEffect(() => {
    if (isOpen && !shareUrl && !saving) {
      handleSaveQuote();
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShareUrl(null);
      setCopied(false);
      setError(null);
    }
  }, [isOpen]);

  const handleSaveQuote = async () => {
    setSaving(true);
    setError(null);

    try {
      const quoteToSave = prepareQuoteForSave();

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.quotesSave}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quote: quoteToSave }),
      });

      if (!response.ok) {
        throw new Error('Failed to save quote');
      }

      const data: SaveQuoteResponse = await response.json();
      setShareUrl(data.shareUrl);
    } catch (err) {
      console.error('Error saving quote:', err);
      setError('Failed to generate share link. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShareEmail = () => {
    if (!shareUrl) return;
    const subject = encodeURIComponent('Your Transfer Quote - Dorset Transfer Company');
    const body = encodeURIComponent(
      `Here's your transfer quote from Dorset Transfer Company:\n\n${shareUrl}\n\nThis quote includes all the journey details and pricing.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleShareWhatsApp = () => {
    if (!shareUrl) return;
    const text = encodeURIComponent(
      `Check out this transfer quote from Dorset Transfer Company: ${shareUrl}`
    );
    window.open(`https://wa.me/?text=${text}`);
  };

  const handleShareNative = async () => {
    if (!shareUrl || !navigator.share) return;

    try {
      await navigator.share({
        title: 'Transfer Quote - Dorset Transfer Company',
        text: 'Check out this transfer quote',
        url: shareUrl,
      });
    } catch (err) {
      // User cancelled or share failed
      console.error('Share failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Share Quote</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {saving ? (
            // Loading state
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-sage-dark mx-auto mb-4" />
              <p className="text-muted-foreground">Generating share link...</p>
            </div>
          ) : error ? (
            // Error state
            <div className="text-center py-4">
              <p className="text-red-500 mb-4">{error}</p>
              <Button
                onClick={handleSaveQuote}
                className="bg-sage-dark hover:bg-sage-dark/90 text-white"
              >
                Try Again
              </Button>
            </div>
          ) : shareUrl ? (
            // Share options
            <div>
              {/* Link display */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Share Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm text-foreground border border-border"
                  />
                  <Button
                    onClick={handleCopyLink}
                    className="px-3 bg-sage-dark hover:bg-sage-dark/90 text-white"
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {copied && (
                  <p className="text-sm text-green-600 mt-1">Link copied!</p>
                )}
              </div>

              {/* Share buttons */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Share via</p>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleShareEmail}
                    className="flex items-center justify-center gap-2 bg-navy-dark hover:bg-navy-dark/90 text-white"
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </Button>

                  <Button
                    onClick={handleShareWhatsApp}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </Button>
                </div>

                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <Button
                    onClick={handleShareNative}
                    className="w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    <Share2 className="w-4 h-4" />
                    More Options
                  </Button>
                )}
              </div>

              {/* Done button */}
              <Button
                onClick={onClose}
                className="w-full mt-6 bg-sage-dark hover:bg-sage-dark/90 text-white"
              >
                Done
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
