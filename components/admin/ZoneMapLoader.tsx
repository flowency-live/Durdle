'use client';

import dynamic from 'next/dynamic';
import { ComponentProps } from 'react';

// Dynamically import ZoneMap with SSR disabled (Leaflet doesn't support SSR)
const ZoneMap = dynamic(() => import('./ZoneMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center bg-gray-100 rounded-lg border border-gray-300" style={{ height: '400px' }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-500">Loading map...</p>
      </div>
    </div>
  ),
});

type ZoneMapProps = ComponentProps<typeof ZoneMap>;

export default function ZoneMapLoader(props: ZoneMapProps) {
  return <ZoneMap {...props} />;
}
