'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { AlertCircle, Trash2, HardHat, TreeDeciduous, Zap, ArrowLeft } from 'lucide-react';

const CesiumViewer = dynamic(() => import('../components/CesiumViewer'), {
  ssr: false,
  loading: () => <div className="h-screen w-full flex items-center justify-center bg-gray-900 text-white">Loading Command Centre Map...</div>
});

export default function MapPage() {
  return (
    <main className="h-screen w-full bg-black relative overflow-hidden">
      <div className="absolute top-0 left-0 z-10 p-4 md:p-6 w-full pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link href="/" className="bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-md transition-colors text-white flex-shrink-0">
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
          </Link>
          <h1 className="text-2xl md:text-4xl font-bold text-white drop-shadow-lg tracking-tight">Command Centre</h1>
        </div>
        <p className="text-gray-200 mt-2 font-medium text-xs md:text-base ml-12 md:ml-14 opacity-90">Pilot Zone: VIT Bhopal University, Kotri Kalan</p>
        
        <div className="mt-[16px] md:mt-[24px] flex flex-wrap gap-[8px] md:gap-[12px] pointer-events-auto ml-[48px] md:ml-[56px]">
          <div className="px-[12px] py-[6px] flex items-center justify-center gap-[6px] bg-red-500/80 text-white rounded-full text-[12px] font-semibold backdrop-blur-sm shadow-md transition-transform hover:scale-105 cursor-pointer whitespace-nowrap">
            <AlertCircle className="w-[14px] h-[14px] flex-shrink-0" /> <span>Potholes</span>
          </div>
          <div className="px-[12px] py-[6px] flex items-center justify-center gap-[6px] bg-yellow-500/80 text-white rounded-full text-[12px] font-semibold backdrop-blur-sm shadow-md transition-transform hover:scale-105 cursor-pointer whitespace-nowrap">
            <Trash2 className="w-[14px] h-[14px] flex-shrink-0" /> <span>Garbage</span>
          </div>
          <div className="px-[12px] py-[6px] flex items-center justify-center gap-[6px] bg-orange-500/80 text-white rounded-full text-[12px] font-semibold backdrop-blur-sm shadow-md transition-transform hover:scale-105 cursor-pointer whitespace-nowrap">
            <HardHat className="w-[14px] h-[14px] flex-shrink-0" /> <span>Construction</span>
          </div>
          <div className="px-[12px] py-[6px] flex items-center justify-center gap-[6px] bg-green-600/80 text-white rounded-full text-[12px] font-semibold backdrop-blur-sm shadow-md transition-transform hover:scale-105 cursor-pointer whitespace-nowrap">
            <TreeDeciduous className="w-[14px] h-[14px] flex-shrink-0" /> <span>Debris</span>
          </div>
          <div className="px-[12px] py-[6px] flex items-center justify-center gap-[6px] bg-blue-500/80 text-white rounded-full text-[12px] font-semibold backdrop-blur-sm shadow-md transition-transform hover:scale-105 cursor-pointer whitespace-nowrap">
            <Zap className="w-[14px] h-[14px] flex-shrink-0" /> <span>Exposed Wires</span>
          </div>
        </div>
      </div>
      <CesiumViewer />
    </main>
  );
}
