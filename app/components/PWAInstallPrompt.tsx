'use client';

import { Download, X, Share } from 'lucide-react';
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandAlone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(isStandAlone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIOS(iOS);

    // Check if prompt was previously dismissed
    const dismissedAt = localStorage.getItem('pwa_install_dismissed');
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const now = new Date();
      const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);

      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // For Android/Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS, show custom prompt if not standalone
    if (iOS && !isStandAlone) {
      const shown = localStorage.getItem('ios_install_shown');
      if (!shown) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 5000); // Show after 5 seconds on iOS
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    } else if (isIOS) {
      localStorage.setItem('ios_install_shown', 'true');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_install_dismissed', new Date().toISOString());
  };

  if (!showPrompt || isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl border-2 border-sage-dark overflow-hidden animate-slide-up">
        <div className="relative">
          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>

          {/* Content */}
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-sage-dark/10 flex items-center justify-center flex-shrink-0">
                <Download className="w-6 h-6 text-sage-dark" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Install Durdle App
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {isIOS
                    ? 'Add to your home screen for quick access and a better experience'
                    : 'Install our app for faster access, offline support, and a native experience'}
                </p>

                {isIOS ? (
                  <div className="bg-sage-light/20 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-700 font-medium mb-2">To install:</p>
                    <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                      <li>
                        Tap the <Share className="inline w-4 h-4 mx-1" /> Share button below
                      </li>
                      <li>Select &ldquo;Add to Home Screen&rdquo;</li>
                      <li>Tap &ldquo;Add&rdquo;</li>
                    </ol>
                  </div>
                ) : (
                  <button
                    onClick={handleInstallClick}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-sage-dark text-white rounded-xl font-semibold hover:bg-sage-dark/90 transition-all shadow-lg active:scale-95"
                  >
                    <Download className="w-5 h-5" />
                    Install Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
