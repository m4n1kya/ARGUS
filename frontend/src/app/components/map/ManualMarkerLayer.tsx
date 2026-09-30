import { useEffect, useState } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { IncidentAdapter, ArgusIncident } from '../../services/incidentAdapter';

interface ManualMarkerLayerProps {
  isAddMode: boolean;
  onExitAddMode: () => void;
  onIncidentCreated: (inc: ArgusIncident) => void;
}

export default function ManualMarkerLayer({ isAddMode, onExitAddMode, onIncidentCreated }: ManualMarkerLayerProps) {
  const map = useMap();
  const [draftLocation, setDraftLocation] = useState<{lat: number, lon: number} | null>(null);
  const [draftMarker, setDraftMarker] = useState<L.Marker | null>(null);

  useMapEvents({
    click(e) {
      if (isAddMode) {
        setDraftLocation({ lat: e.latlng.lat, lon: e.latlng.lng });
      }
    }
  });

  useEffect(() => {
    if (draftLocation) {
      if (draftMarker) {
        draftMarker.setLatLng([draftLocation.lat, draftLocation.lon]);
      } else {
        const icon = L.divIcon({
          html: `
            <div class="relative w-6 h-6 flex items-center justify-center">
              <div class="absolute inset-0 bg-white/30 rounded-full animate-ping"></div>
              <div class="relative w-4 h-4 bg-white border-2 border-black rounded-full shadow-lg"></div>
            </div>
          `,
          className: 'custom-draft-icon',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        const m = L.marker([draftLocation.lat, draftLocation.lon], { icon }).addTo(map);
        setDraftMarker(m);
      }
    } else {
      if (draftMarker) {
        map.removeLayer(draftMarker);
        setDraftMarker(null);
      }
    }
  }, [draftLocation, map]);

  useEffect(() => {
    if (!isAddMode) {
      setDraftLocation(null);
    }
  }, [isAddMode]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draftLocation) return;

    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as string;
    const desc = formData.get('desc') as string;

    const newInc = await IncidentAdapter.createManualMarker(draftLocation.lat, draftLocation.lon, type, desc);
    if (newInc) {
      onIncidentCreated(newInc);
    }
    
    setDraftLocation(null);
    onExitAddMode();
  };

  return (
    <>
      {draftLocation && (
        <div className="absolute top-20 right-4 w-72 bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-[2000] p-4 text-white font-sans">
          <h3 className="text-xs font-mono font-bold tracking-widest text-white/50 mb-4 border-b border-white/10 pb-2">ADD OBSERVATION</h3>
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Type</label>
              <select name="type" className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-white/30" required>
                <option value="pothole">Pothole</option>
                <option value="construction">Construction</option>
                <option value="garbage">Garbage</option>
                <option value="debris">Debris</option>
                <option value="exposed_wire">Exposed Wire</option>
              </select>
            </div>
            
            <div>
              <label className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Description</label>
              <textarea name="desc" className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-white/30 resize-none h-16" placeholder="Optional notes..."></textarea>
            </div>
            
            <div className="flex justify-between items-center mt-2">
              <span className="text-[9px] font-mono text-white/30">{draftLocation.lat.toFixed(5)}, {draftLocation.lon.toFixed(5)}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDraftLocation(null)} className="px-3 py-1.5 bg-transparent border border-white/20 rounded text-[10px] font-mono tracking-widest uppercase hover:bg-white/5">Cancel</button>
                <button type="submit" className="px-3 py-1.5 bg-white text-black rounded text-[10px] font-mono tracking-widest uppercase font-bold hover:bg-gray-200">Save</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
