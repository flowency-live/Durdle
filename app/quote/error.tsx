'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function QuoteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Quote flow error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Unable to process quote
          </h1>
          <p className="text-gray-600">
            We encountered an error while calculating your quote. Please try again.
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800 font-medium">
            {error.message || 'An unexpected error occurred'}
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={reset}
            className="w-full"
          >
            Start a new quote
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
            variant="hero-outline"
            className="w-full"
          >
            Return to home
          </Button>
        </div>
      </div>
    </div>
  );
}
