'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import GlobalNavbar from '../components/GlobalNavbar';

// Dynamically import the Leaflet map with SSR disabled to prevent 'window is not defined' errors
const ArgusMap = dynamic(() => import('../components/map/ArgusLeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      <div className="text-blue-500/50 font-mono text-xs tracking-widest uppercase">INITIALIZING GEOSPATIAL ENGINE...</div>
    </div>
  ),
});

export default function MapPage() {
  useEffect(() => {
    // The landing page sets a global root font-size for its vw-based layout system.
    // If the user navigated here from the home page via client-side routing,
    // that font-size can bleed through and break every element on this page.
    // We forcibly reset it on mount to guarantee a clean slate.
    document.documentElement.style.fontSize = '';
    document.documentElement.style.removeProperty('font-size');
  }, []);

  return (
    <main className="h-screen w-full bg-black relative overflow-hidden" style={{ paddingTop: 48 }}>
      <GlobalNavbar />
      <div className="absolute inset-0 top-[48px]">
        <ArgusMap />
      </div>
    </main>
  );
}
