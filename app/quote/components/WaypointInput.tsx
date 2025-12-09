'use client';

import { Clock, Check, X } from 'lucide-react';
import { useState } from 'react';

import { Waypoint } from '../lib/types';

import LocationInput from './LocationInput';


interface WaypointInputProps {
  index: number;
  waypoint: Waypoint;
  onChange: (waypoint: Waypoint) => void;
  onRemove: () => void;
}

export default function WaypointInput({ index, waypoint, onChange, onRemove }: WaypointInputProps) {
  const [editingWaitTime, setEditingWaitTime] = useState(false);
  const [tempWaitTime, setTempWaitTime] = useState(waypoint.waitTime || 0);

  const handleLocationSelect = (address: string, placeId: string, locationType?: unknown, lat?: number, lng?: number) => {
    onChange({ ...waypoint, address, placeId, lat, lng });
  };

  const handleWaitTimeConfirm = () => {
    onChange({ ...waypoint, waitTime: tempWaitTime > 0 ? tempWaitTime : undefined });
    setEditingWaitTime(false);
  };

  const handleWaitTimeCancel = () => {
    setTempWaitTime(waypoint.waitTime || 0);
    setEditingWaitTime(false);
  };

  return (
    <div className="space-y-2">
      {/* Header with Remove Button */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Waypoint {index + 1}</span>
        <button
          type="button"
          onClick={onRemove}
          className="text-error hover:text-error/80 transition-colors p-1"
          aria-label="Remove waypoint"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Location Input */}
      <LocationInput
        value={waypoint.address}
        onSelect={handleLocationSelect}
        placeholder="Enter waypoint location"
        hideCurrentLocation={true}
      />

      {/* Wait Time Toggle/Display */}
      {!editingWaitTime && !waypoint.waitTime && (
        <button
          type="button"
          onClick={() => setEditingWaitTime(true)}
          className="text-xs text-sage-accessible hover:text-sage-accessible/80 transition-colors flex items-center gap-1"
        >
          <Clock className="w-3 h-3" />
          Add wait time
        </button>
      )}

      {!editingWaitTime && waypoint.waitTime && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Wait: {Math.floor(waypoint.waitTime / 60)}h {waypoint.waitTime % 60}m
          </span>
          <button
            type="button"
            onClick={() => {
              setTempWaitTime(waypoint.waitTime || 0);
              setEditingWaitTime(true);
            }}
            className="text-sage-accessible hover:text-sage-accessible/80 transition-colors"
          >
            Edit
          </button>
        </div>
      )}

      {/* Wait Time Input (Editing Mode) */}
      {editingWaitTime && (
        <div className="animate-fade-up space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="480"
              step="15"
              value={tempWaitTime}
              onChange={(e) => setTempWaitTime(parseInt(e.target.value) || 0)}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground"
              placeholder="0"
            />
            <span className="text-xs text-muted-foreground w-16">
              {tempWaitTime ? `${Math.floor(tempWaitTime / 60)}h ${tempWaitTime % 60}m` : '0m'}
            </span>
            <button
              type="button"
              onClick={handleWaitTimeConfirm}
              className="p-2 rounded-lg bg-sage-dark text-white hover:bg-sage-dark/90 transition-colors"
              aria-label="Confirm wait time"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleWaitTimeCancel}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Wait time in minutes (max 8 hours)
          </p>
        </div>
      )}
    </div>
  );
}
