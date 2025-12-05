'use client';

import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = 'Calculating your quote...' }: LoadingStateProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-xl p-8 max-w-sm mx-4 text-center">
        <Loader2 className="w-12 h-12 text-sage-dark animate-spin mx-auto mb-4" />
        <h3 className="font-playfair text-xl font-semibold text-foreground mb-2">
          {message}
        </h3>
        <p className="text-sm text-muted-foreground">
          This will only take a moment
        </p>
      </div>
    </div>
  );
}
