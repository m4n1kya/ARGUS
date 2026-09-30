import { useState } from 'react';
import { Target } from 'lucide-react';

interface NearMeControlProps {
  radius: number | null;
  setRadius: (radius: number | null) => void;
  userLocation: { lat: number, lon: number } | null;
}

export default function NearMeControl({ radius, setRadius, userLocation }: NearMeControlProps) {
  const [isOpen, setIsOpen] = useState(false);

  const radii = [
    { label: '500 m', value: 500 },
    { label: '1 km', value: 1000 },
    { label: '5 km', value: 5000 },
    { label: '10 km', value: 10000 },
  ];

  return (
    <div className="absolute top-[4.5rem] right-4 z-[1000] font-sans">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={!userLocation}
        className={`w-10 h-10 backdrop-blur-md border border-white/10 rounded-lg flex items-center justify-center transition-colors shadow-xl ${
          radius 
            ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' 
            : userLocation 
              ? 'bg-black/80 text-white/70 hover:text-white hover:bg-black' 
              : 'bg-black/40 text-white/20 cursor-not-allowed'
        }`}
        title={!userLocation ? "Location required for Near Me mode" : "Near Me Mode"}
      >
        <Target className="w-5 h-5" />
      </button>

      {isOpen && userLocation && (
        <div className="absolute top-12 right-0 w-36 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-2 flex flex-col gap-1">
          <div className="text-[10px] font-mono tracking-widest text-white/40 uppercase mb-1 px-2 text-center">RADIUS</div>
          
          <button 
            onClick={() => { setRadius(null); setIsOpen(false); }}
            className={`px-2 py-1.5 rounded text-xs font-mono tracking-wider transition-colors ${radius === null ? 'bg-blue-500/20 text-blue-400' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
          >
            OFF
          </button>

          {radii.map((r) => (
            <button 
              key={r.value}
              onClick={() => { setRadius(r.value); setIsOpen(false); }}
              className={`px-2 py-1.5 rounded text-xs font-mono tracking-wider transition-colors ${radius === r.value ? 'bg-blue-500/20 text-blue-400' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
