'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface VehiclePricing {
  vehicleId: string;
  name: string;
  description: string;
  baseFare: number;
  perMile: number;
  perMinute: number;
  returnDiscount: number;
  capacity: number;
}

const API_BASE = 'https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev';

export default function TestPricingPage() {
  const [vehicles, setVehicles] = useState<VehiclePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculator inputs
  const [calcVehicle, setCalcVehicle] = useState('');
  const [calcDistance, setCalcDistance] = useState('10');
  const [calcDuration, setCalcDuration] = useState('15');
  const [isReturnJourney, setIsReturnJourney] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  // Set default vehicle once loaded
  useEffect(() => {
    if (vehicles.length > 0 && !calcVehicle) {
      setCalcVehicle(vehicles[0].vehicleId);
    }
  }, [vehicles, calcVehicle]);

  const fetchVehicles = async () => {
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(`${API_BASE}/admin/pricing/vehicles`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch vehicles');

      const data = await response.json();
      setVehicles(data.vehicles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  const calculatePreview = () => {
    const vehicle = vehicles.find((v) => v.vehicleId === calcVehicle);
    if (!vehicle) return null;

    const distance = parseFloat(calcDistance) || 0;
    const duration = parseFloat(calcDuration) || 0;

    const baseFare = vehicle.baseFare;
    const distanceCharge = Math.round(distance * vehicle.perMile);
    const timeCharge = Math.round(duration * vehicle.perMinute);
    const subtotal = baseFare + distanceCharge + timeCharge;

    // Calculate return journey if applicable
    let returnSubtotal = 0;
    let returnDiscount = 0;
    if (isReturnJourney) {
      const discountPercent = vehicle.returnDiscount || 0;
      returnSubtotal = subtotal;
      returnDiscount = Math.round(subtotal * (discountPercent / 100));
    }

    const total = isReturnJourney ? subtotal + (returnSubtotal - returnDiscount) : subtotal;

    return {
      vehicle,
      baseFare,
      distanceCharge,
      timeCharge,
      subtotal,
      returnSubtotal,
      returnDiscount,
      total,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const preview = calculatePreview();

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Test Pricing Calculator</h2>
          <p className="text-gray-600">
            Preview how pricing is calculated based on current vehicle rates
          </p>
        </div>
        <Link
          href="/admin/vehicles-pricing"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Vehicles & Pricing
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button onClick={() => setError(null)} className="mt-2 text-sm text-red-600 hover:text-red-800">
            Dismiss
          </button>
        </div>
      )}

      {/* Calculator Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Pricing Calculator</h3>
        <p className="text-sm text-gray-600 mb-6">
          Enter journey details to see how the fare is calculated for each vehicle type.
        </p>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
            <select
              value={calcVehicle}
              onChange={(e) => setCalcVehicle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {vehicles.map((v) => (
                <option key={v.vehicleId} value={v.vehicleId}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Distance (miles)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={calcDistance}
              onChange={(e) => setCalcDistance(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
            <input
              type="number"
              step="1"
              min="0"
              value={calcDuration}
              onChange={(e) => setCalcDuration(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 w-full justify-center">
              <input
                type="checkbox"
                checked={isReturnJourney}
                onChange={(e) => setIsReturnJourney(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Return Journey</span>
            </label>
          </div>
        </div>

        {/* Results */}
        {preview && (
          <div className="bg-gray-50 rounded-lg p-6">
            {/* Vehicle Rates Info */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Current Rates for {preview.vehicle.name}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Base Fare:</span>{' '}
                  <span className="font-medium">£{(preview.vehicle.baseFare / 100).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Per Mile:</span>{' '}
                  <span className="font-medium">£{(preview.vehicle.perMile / 100).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Per Minute:</span>{' '}
                  <span className="font-medium">£{(preview.vehicle.perMinute / 100).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Return Discount:</span>{' '}
                  <span className="font-medium">{preview.vehicle.returnDiscount || 0}%</span>
                </div>
              </div>
            </div>

            {/* Calculation Breakdown */}
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Calculation Breakdown</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Base Fare</span>
                <span className="font-medium text-gray-900">£{(preview.baseFare / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Distance ({calcDistance} mi × £{(preview.vehicle.perMile / 100).toFixed(2)})
                </span>
                <span className="font-medium text-gray-900">£{(preview.distanceCharge / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Time ({calcDuration} min × £{(preview.vehicle.perMinute / 100).toFixed(2)})
                </span>
                <span className="font-medium text-gray-900">£{(preview.timeCharge / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                <span className="text-gray-700 font-medium">One-way Subtotal</span>
                <span className="font-semibold text-gray-900">£{(preview.subtotal / 100).toFixed(2)}</span>
              </div>

              {isReturnJourney && (
                <>
                  <div className="flex justify-between text-sm pt-2">
                    <span className="text-gray-600">Return Journey</span>
                    <span className="font-medium text-gray-900">£{(preview.returnSubtotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Return Discount ({preview.vehicle.returnDiscount || 0}%)</span>
                    <span className="font-medium">-£{(preview.returnDiscount / 100).toFixed(2)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-lg pt-3 border-t border-gray-300 mt-3">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-blue-600">£{(preview.total / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Test Scenarios */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Test Scenarios</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setCalcDistance('5');
                setCalcDuration('10');
                setIsReturnJourney(false);
              }}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
            >
              Short Trip (5mi/10min)
            </button>
            <button
              onClick={() => {
                setCalcDistance('15');
                setCalcDuration('25');
                setIsReturnJourney(false);
              }}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
            >
              Medium Trip (15mi/25min)
            </button>
            <button
              onClick={() => {
                setCalcDistance('30');
                setCalcDuration('45');
                setIsReturnJourney(false);
              }}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
            >
              Long Trip (30mi/45min)
            </button>
            <button
              onClick={() => {
                setCalcDistance('50');
                setCalcDuration('60');
                setIsReturnJourney(false);
              }}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
            >
              Airport (50mi/60min)
            </button>
            <button
              onClick={() => {
                setCalcDistance('10');
                setCalcDuration('15');
                setIsReturnJourney(true);
              }}
              className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200"
            >
              Return Journey Test
            </button>
          </div>
        </div>
      </div>

      {/* All Vehicles Comparison */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">All Vehicles Comparison</h3>
        <p className="text-sm text-gray-600 mb-4">
          Compare prices across all vehicle types for the current journey settings
        </p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Base
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Distance
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {vehicles.map((vehicle) => {
                const distance = parseFloat(calcDistance) || 0;
                const duration = parseFloat(calcDuration) || 0;
                const base = vehicle.baseFare;
                const dist = Math.round(distance * vehicle.perMile);
                const time = Math.round(duration * vehicle.perMinute);
                let total = base + dist + time;

                if (isReturnJourney) {
                  const returnTotal = total;
                  const discount = Math.round(returnTotal * ((vehicle.returnDiscount || 0) / 100));
                  total = total + (returnTotal - discount);
                }

                return (
                  <tr key={vehicle.vehicleId} className={vehicle.vehicleId === calcVehicle ? 'bg-blue-50' : ''}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{vehicle.name}</div>
                      <div className="text-xs text-gray-500">{vehicle.capacity} passengers</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      £{(base / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      £{(dist / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      £{(time / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className={`text-sm font-semibold ${vehicle.vehicleId === calcVehicle ? 'text-blue-600' : 'text-gray-900'}`}>
                        £{(total / 100).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
