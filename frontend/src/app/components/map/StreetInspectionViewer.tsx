import { useEffect, useRef, useState } from 'react';
import { Viewer } from 'mapillary-js';
import 'mapillary-js/dist/mapillary.css';
import { StreetImage, MapillaryProvider } from '../../services/mapillaryProvider';
import { ArgusIncident } from '../../services/incidentAdapter';
import { ArrowLeft, Loader2, Info } from 'lucide-react';

interface StreetInspectionViewerProps {
  incident: ArgusIncident;
  onClose: () => void;
}

export default function StreetInspectionViewer({ incident, onClose }: StreetInspectionViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [status, setStatus] = useState<'LOADING' | 'READY' | 'UNAVAILABLE'>('LOADING');
  const [streetImage, setStreetImage] = useState<StreetImage | null>(null);

  useEffect(() => {
    let active = true;

    const loadImagery = async () => {
      setStatus('LOADING');
      // Look for imagery within 50 meters
      const img = await MapillaryProvider.getNearestImage(incident.latitude, incident.longitude, 50);
      if (!active) return;
      
      if (img) {
        setStreetImage(img);
        setStatus('READY');
      } else {
        setStatus('UNAVAILABLE');
      }
    };

    loadImagery();

    return () => { active = false; };
  }, [incident]);

  useEffect(() => {
    if (status === 'READY' && streetImage && containerRef.current && !viewerRef.current) {
      viewerRef.current = new Viewer({
        accessToken: process.env.NEXT_PUBLIC_MAPILLARY_ACCESS_TOKEN!,
        container: containerRef.current,
        imageId: streetImage.id,
      });
    }

    return () => {
      if (viewerRef.current) {
        // MapillaryJS viewer clean up
        viewerRef.current.remove();
        viewerRef.current = null;
      }
    };
  }, [status, streetImage]);

  return (
    <div className="absolute top-0 left-0 bottom-0 w-[450px] bg-black border-r border-white/10 z-[2000] flex flex-col shadow-2xl transition-transform font-sans">
      
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center gap-4 bg-black/80 backdrop-blur-md">
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-sm font-bold tracking-widest text-white uppercase font-mono">STREET INSPECTION</h2>
          <div className="text-[10px] text-white/50 tracking-wider font-mono">ID: {incident.id}</div>
        </div>
      </div>

      {/* Mapillary Viewer Container */}
      <div className="flex-1 relative bg-black/90 flex flex-col">
        {status === 'LOADING' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-blue-400 font-mono tracking-widest text-xs z-10">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span>LOCATING IMAGERY...</span>
          </div>
        )}

        {status === 'UNAVAILABLE' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/50 font-mono text-center p-8 z-10">
            <Info className="w-12 h-12 text-white/20" />
            <div>
              <div className="text-sm tracking-widest font-bold text-white/80 mb-2">NO COVERAGE</div>
              <div className="text-xs leading-relaxed">Mapillary has no suitable street-level imagery within 50m of this incident coordinate.</div>
            </div>
            <button onClick={onClose} className="mt-4 px-4 py-2 border border-white/20 hover:bg-white/10 rounded tracking-widest text-xs transition-colors">
              RETURN TO MAP
            </button>
          </div>
        )}

        <div 
          ref={containerRef} 
          className="absolute inset-0 z-0" 
          style={{ opacity: status === 'READY' ? 1 : 0 }} 
        />
      </div>

      {/* Footer Info */}
      {status === 'READY' && streetImage && (
        <div className="p-4 border-t border-white/10 bg-black/80 backdrop-blur-md">
          <div className="flex justify-between items-center text-[10px] font-mono tracking-widest uppercase mb-2">
            <span className="text-white/50">Capture Date</span>
            <span className="text-white/90">{streetImage.capturedAt ? streetImage.capturedAt.toLocaleDateString() : 'UNKNOWN'}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono tracking-widest uppercase">
            <span className="text-white/50">Format</span>
            <span className="text-white/90">{streetImage.isPanorama ? '360° PANORAMA' : 'FLAT IMAGE'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
