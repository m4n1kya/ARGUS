'use client';

import dynamic from 'next/dynamic';
import { AlertCircle, Trash2, HardHat, TreeDeciduous, Zap } from 'lucide-react';

const CesiumViewer = dynamic(() => import('../components/CesiumViewer'), {
  ssr: false,
  loading: () => <div className="h-screen w-full flex items-center justify-center bg-gray-900 text-white">Loading Command Centre Map...</div>
});

export default function MapPage() {
  return (
    <main className="min-h-screen bg-black relative">
      <div className="absolute top-0 left-0 z-10 p-4 md:p-6 w-full pointer-events-none mt-16">
        <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">Command Centre</h1>
        <p className="text-gray-200 mt-1 md:mt-2 font-medium text-sm md:text-base">Pilot Zone: VIT Bhopal University, Kotri Kalan</p>
        
        <div className="mt-4 md:mt-6 flex flex-wrap gap-2 pointer-events-auto">
          <span className="px-3 py-1.5 flex items-center gap-1.5 bg-red-500/80 text-white rounded-full text-xs font-semibold backdrop-blur-sm shadow-md transition-transform hover:scale-105 cursor-pointer">
            <AlertCircle className="w-3.5 h-3.5" /> Potholes
          </span>
          <span className="px-3 py-1.5 flex items-center gap-1.5 bg-yellow-500/80 text-white rounded-full text-xs font-semibold backdrop-blur-sm shadow-md transition-transform hover:scale-105 cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" /> Garbage
          </span>
          <span className="px-3 py-1.5 flex items-center gap-1.5 bg-orange-500/80 text-white rounded-full text-xs font-semibold backdrop-blur-sm shadow-md transition-transform hover:scale-105 cursor-pointer">
            <HardHat className="w-3.5 h-3.5" /> Construction
          </span>
          <span className="px-3 py-1.5 flex items-center gap-1.5 bg-green-600/80 text-white rounded-full text-xs font-semibold backdrop-blur-sm shadow-md transition-transform hover:scale-105 cursor-pointer">
            <TreeDeciduous className="w-3.5 h-3.5" /> Debris
          </span>
          <span className="px-3 py-1.5 flex items-center gap-1.5 bg-blue-500/80 text-white rounded-full text-xs font-semibold backdrop-blur-sm shadow-md transition-transform hover:scale-105 cursor-pointer">
            <Zap className="w-3.5 h-3.5" /> Exposed Wires
          </span>
        </div>
      </div>
      <CesiumViewer />
    </main>
  );
}
