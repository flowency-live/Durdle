'use client';

import { MapPin, Crosshair, X } from 'lucide-react';
import { Location } from '../lib/types';

interface LocationFieldProps {
  type: 'pickup' | 'destination' | 'waypoint';
  value: Location | null;
  placeholder: string;
  onFocus: () => void;
  icon?: string | number;
  showCurrentLocationButton?: boolean;
  onUseCurrentLocation?: () => void;
  onRemove?: () => void;
  isLast?: boolean;
}

export default function LocationField({
  type,
  value,
  placeholder,
  onFocus,
  icon,
  showCurrentLocationButton = false,
  onUseCurrentLocation,
  onRemove,
  isLast = false
}: LocationFieldProps) {
  return (
    <>
      <div
        className="flex items-center gap-3 py-3 cursor-pointer hover:bg-muted/30 -mx-4 px-4 rounded-lg transition-colors"
        onClick={onFocus}
      >
        {/* Icon (pickup=●, destination=○, waypoint=number) */}
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
          {type === 'pickup' && (
            <div className="w-3 h-3 rounded-full bg-sage-dark"></div>
          )}
          {type === 'destination' && (
            <div className="w-3 h-3 rounded-full border-2 border-sage-dark"></div>
          )}
          {type === 'waypoint' && (
            <div className="w-5 h-5 rounded-full bg-sage-dark/20 flex items-center justify-center">
              <span className="text-xs font-bold text-sage-dark">{icon}</span>
            </div>
          )}
        </div>

        {/* Location Text or Placeholder */}
        <div className="flex-1 min-w-0">
          <p className={value ? "text-sm text-foreground truncate" : "text-sm text-muted-foreground"}>
            {value?.address || placeholder}
          </p>
        </div>

        {/* Current Location Button (optional) */}
        {showCurrentLocationButton && !value && onUseCurrentLocation && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUseCurrentLocation();
            }}
            className="flex-shrink-0 text-sage-dark hover:text-sage-dark/80 transition-colors p-1"
            title="Use current location"
          >
            <Crosshair className="w-5 h-5" />
          </button>
        )}

        {/* Remove Waypoint Button */}
        {type === 'waypoint' && onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="flex-shrink-0 text-muted-foreground hover:text-error transition-colors p-1"
            title="Remove waypoint"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Chevron indicator */}
        {!onRemove && (
          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </div>

      {/* Bottom Border Divider (except last field) */}
      {!isLast && <div className="border-b border-border"></div>}
    </>
  );
}
