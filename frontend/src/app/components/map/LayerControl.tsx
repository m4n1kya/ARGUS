import { Layers as LayersIcon } from 'lucide-react';
import { useState } from 'react';

interface LayerControlProps {
  layers: {
    satellite: boolean;
    incidents: boolean;
    heatmap: boolean;
  };
  setLayers: (layers: any) => void;
}

export default function LayerControl({ layers, setLayers }: LayerControlProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="absolute top-6 right-4 z-[1000] font-sans">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-black transition-colors shadow-xl"
      >
        <LayersIcon className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 w-48 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-3 flex flex-col gap-1">
          <div className="text-[10px] font-mono tracking-widest text-white/40 uppercase mb-2 px-2">Map Layers</div>
          
          <label className="flex items-center gap-3 px-2 py-1.5 hover:bg-white/5 rounded cursor-pointer transition-colors">
            <input type="checkbox" className="accent-blue-500" checked={layers.satellite} onChange={() => toggleLayer('satellite')} />
            <span className="text-xs font-mono tracking-wider text-white/80">SATELLITE</span>
          </label>
          
          <label className="flex items-center gap-3 px-2 py-1.5 hover:bg-white/5 rounded cursor-pointer transition-colors">
            <input type="checkbox" className="accent-blue-500" checked={layers.incidents} onChange={() => toggleLayer('incidents')} />
            <span className="text-xs font-mono tracking-wider text-white/80">INCIDENTS</span>
          </label>

          <label className="flex items-center gap-3 px-2 py-1.5 hover:bg-white/5 rounded cursor-pointer transition-colors">
            <input type="checkbox" className="accent-blue-500" checked={layers.heatmap} onChange={() => toggleLayer('heatmap')} />
            <span className="text-xs font-mono tracking-wider text-white/80">HEATMAP</span>
          </label>
        </div>
      )}
    </div>
  );
}
