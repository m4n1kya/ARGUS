import { ArgusIncident } from '../../services/incidentAdapter';
import { Camera, X, AlertTriangle, MapPin, Loader2, Navigation } from 'lucide-react';

interface IncidentPanelProps {
  incident: ArgusIncident | null;
  onClose: () => void;
  onInspectStreet: (incident: ArgusIncident) => void;
  userLocation: { lat: number, lon: number } | null;
}

export default function IncidentPanel({ incident, onClose, onInspectStreet, userLocation }: IncidentPanelProps) {
  if (!incident) return null;

  // Calculate distance if user location is available
  let distanceStr = null;
  if (userLocation) {
    const dLat = (incident.latitude - userLocation.lat) * (Math.PI / 180);
    const dLon = (incident.longitude - userLocation.lon) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(userLocation.lat * (Math.PI / 180)) * Math.cos(incident.latitude * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distMeters = Math.round(6371000 * c);
    
    if (distMeters < 1000) distanceStr = `${distMeters} m`;
    else distanceStr = `${(distMeters / 1000).toFixed(1)} km`;
  }

  let severityColor = 'text-blue-400';
  if (incident.severity === 'MEDIUM') severityColor = 'text-yellow-400';
  if (incident.severity === 'HIGH') severityColor = 'text-orange-400';
  if (incident.severity === 'CRITICAL') severityColor = 'text-red-400';

  return (
    <div className="absolute top-4 right-4 w-80 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-[1000] overflow-hidden flex flex-col font-sans">
      {/* Header */}
      <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${severityColor}`} />
          <span className="text-xs font-mono tracking-widest text-white font-bold">INCIDENT INTELLIGENCE</span>
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-4">
        
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest mb-1">Classification</div>
            <div className="text-lg font-bold text-white uppercase tracking-wider">{incident.type}</div>
          </div>
          <div className={`px-2 py-1 rounded text-[10px] font-bold font-mono tracking-wider ${
            incident.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
            incident.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' :
            incident.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
            'bg-blue-500/20 text-blue-400 border border-blue-500/50'
          }`}>
            {incident.severity}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest mb-1">Source</div>
            <div className="text-xs text-white/90 font-mono">{incident.source} {incident.source === 'AI' && `(${(incident.confidence * 100).toFixed(0)}%)`}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest mb-1">Detected</div>
            <div className="text-xs text-white/90 font-mono">{incident.timestamp.toLocaleDateString()}</div>
          </div>
          <div className="col-span-2">
            <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest mb-1">Coordinates</div>
            <div className="text-xs text-white/90 font-mono flex justify-between">
              <span>{incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}</span>
              {distanceStr && <span className="text-blue-400 flex items-center gap-1"><Navigation className="w-3 h-3"/> {distanceStr}</span>}
            </div>
          </div>
        </div>

        {/* Source Image */}
        <div>
          <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Camera className="w-3 h-3" /> Source Image
          </div>
          {incident.imageUrl ? (
            <div className="relative w-full h-32 rounded-lg overflow-hidden border border-white/10 bg-black/50">
              <img src={incident.imageUrl} alt="Incident source" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full h-16 rounded-lg border border-dashed border-white/20 bg-white/5 flex items-center justify-center text-xs font-mono text-white/30 tracking-widest">
              UNAVAILABLE
            </div>
          )}
        </div>

        {/* Actions */}
        <button 
          onClick={() => onInspectStreet(incident)}
          className="w-full py-2.5 mt-2 bg-white text-black font-bold text-xs tracking-widest uppercase rounded flex justify-center items-center gap-2 hover:bg-gray-200 transition-colors"
        >
          <MapPin className="w-4 h-4" /> Inspect Street
        </button>

      </div>
    </div>
  );
}
