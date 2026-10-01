'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { DEFAULT_MAP_PROVIDER } from '../../services/mapProvider';
import { IncidentAdapter, ArgusIncident } from '../../services/incidentAdapter';
import { GeocodeResult } from '../../services/geocodingProvider';

import IncidentLayer from './IncidentLayer';
import UserLocationLayer from './UserLocationLayer';
import HeatmapLayer from './HeatmapLayer';
import ManualMarkerLayer from './ManualMarkerLayer';
import IncidentPanel from './IncidentPanel';
import StreetInspectionViewer from './StreetInspectionViewer';
import {
  Navigation, Plus, MapPin, Layers as LayersIcon,
  Target, Search, Loader2, X
} from 'lucide-react';

// ── Fly-to controller ────────────────────────────────────────────────────────
function MapController({ flyTo }: { flyTo: GeocodeResult | null }) {
  const map = useMap();
  useEffect(() => {
    if (!flyTo) return;
    if (flyTo.bbox) {
      map.fitBounds([[flyTo.bbox[1], flyTo.bbox[0]], [flyTo.bbox[3], flyTo.bbox[2]]]);
    } else {
      map.flyTo([flyTo.latitude, flyTo.longitude], 15);
    }
  }, [flyTo, map]);
  return null;
}

// ── Inline SearchBar (no absolute-position issues inside map) ─────────────────
function InlineSearchBar({ onResultSelect }: { onResultSelect: (r: GeocodeResult) => void }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (query.length < 3) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        const mapped: GeocodeResult[] = data.map((d: any) => ({
          id: d.place_id,
          name: d.display_name,
          latitude: parseFloat(d.lat),
          longitude: parseFloat(d.lon),
          bbox: d.boundingbox ? [
            parseFloat(d.boundingbox[2]),
            parseFloat(d.boundingbox[0]),
            parseFloat(d.boundingbox[3]),
            parseFloat(d.boundingbox[1]),
          ] : undefined,
        }));
        setResults(mapped);
        setOpen(true);
      } catch { /* silent */ }
      setLoading(false);
    }, 500);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div ref={ref} className="relative w-72">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search location…"
          className="w-full bg-black/80 backdrop-blur-md border border-white/15 rounded-lg py-2 pl-9 pr-8 text-xs font-mono tracking-wide text-white placeholder-white/30 focus:outline-none focus:border-blue-500/60 shadow-xl"
          style={{ fontSize: '12px' }}
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
        </div>
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[2000]">
          {results.map(r => (
            <button
              key={r.id}
              onClick={() => { onResultSelect(r); setOpen(false); setQuery(''); }}
              className="w-full text-left px-3 py-2.5 hover:bg-white/10 border-b border-white/5 last:border-0 flex items-start gap-2.5 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
              <span className="text-[11px] font-mono text-white/75 leading-relaxed line-clamp-2">{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inline LayerControl ───────────────────────────────────────────────────────
function InlineLayerControl({ layers, setLayers }: { layers: any; setLayers: any }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (key: string) => setLayers((p: any) => ({ ...p, [key]: !p[key] }));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        title="Map Layers"
        className="w-9 h-9 bg-black/80 backdrop-blur-md border border-white/15 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-black/90 transition-colors shadow-xl"
      >
        <LayersIcon className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute top-11 right-0 w-44 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-2.5 flex flex-col gap-0.5">
          <div className="text-[9px] font-mono tracking-widest text-white/35 uppercase mb-1.5 px-1.5">Map Layers</div>
          {[
            { key: 'satellite', label: 'SATELLITE' },
            { key: 'incidents', label: 'INCIDENTS' },
            { key: 'heatmap',   label: 'HEATMAP'   },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2.5 px-1.5 py-1.5 hover:bg-white/5 rounded cursor-pointer transition-colors">
              <input type="checkbox" className="accent-blue-500 w-3 h-3" checked={layers[key]} onChange={() => toggle(key)} />
              <span className="text-[11px] font-mono tracking-wider text-white/75">{label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inline NearMe Control ─────────────────────────────────────────────────────
function InlineNearMeControl({ radius, setRadius, userLocation }: { radius: number | null; setRadius: any; userLocation: any }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const radii = [
    { label: '500 m', value: 500   },
    { label: '1 km',  value: 1000  },
    { label: '5 km',  value: 5000  },
    { label: '10 km', value: 10000 },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={!userLocation}
        title={!userLocation ? 'Enable location first' : 'Near Me'}
        className={`w-9 h-9 backdrop-blur-md border rounded-lg flex items-center justify-center transition-colors shadow-xl ${
          radius
            ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
            : userLocation
              ? 'bg-black/80 text-white/60 border-white/15 hover:text-white hover:bg-black/90'
              : 'bg-black/40 text-white/20 border-white/10 cursor-not-allowed'
        }`}
      >
        <Target className="w-4 h-4" />
      </button>

      {open && userLocation && (
        <div className="absolute top-11 right-0 w-32 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-2 flex flex-col gap-0.5">
          <div className="text-[9px] font-mono tracking-widest text-white/35 uppercase mb-1 text-center">RADIUS</div>
          <button onClick={() => { setRadius(null); setOpen(false); }} className={`px-2 py-1.5 rounded text-[11px] font-mono tracking-wider transition-colors ${radius === null ? 'bg-blue-500/20 text-blue-400' : 'text-white/55 hover:bg-white/5 hover:text-white'}`}>OFF</button>
          {radii.map(r => (
            <button key={r.value} onClick={() => { setRadius(r.value); setOpen(false); }} className={`px-2 py-1.5 rounded text-[11px] font-mono tracking-wider transition-colors ${radius === r.value ? 'bg-blue-500/20 text-blue-400' : 'text-white/55 hover:bg-white/5 hover:text-white'}`}>{r.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inline Status Bar ─────────────────────────────────────────────────────────
function InlineStatusBar({ isSatellite, locationStatus, incidentCount }: { isSatellite: boolean; locationStatus: string; incidentCount: number }) {
  const dot = (color: string) => <div className={`w-1.5 h-1.5 rounded-full ${color}`} />;

  const satNode = () => {
    if (isSatellite) return <span className="text-white/40">ESRI LIVE</span>;
    return <span className="text-white/30">OFF</span>;
  };

  const locNode = () => {
    if (locationStatus === 'ACTIVE') return <>{dot('bg-green-400 shadow-[0_0_5px_#4ade80]')}<span className="text-green-400">ACTIVE</span></>;
    if (locationStatus === 'OFF')    return <>{dot('bg-white/30')}<span className="text-white/40">OFF</span></>;
    return <>{dot('bg-red-400')}<span className="text-red-400">{locationStatus}</span></>;
  };

  const badge = (label: string, children: React.ReactNode) => (
    <div className="bg-black/70 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-md flex items-center gap-2 text-[9px] font-mono tracking-widest uppercase">
      <span className="text-white/35 font-bold">{label}</span>
      <span className="flex items-center gap-1.5">{children}</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-1 pointer-events-none">
      {badge('MAP',       <span className="text-green-400 flex items-center gap-1.5">{dot('bg-green-400 shadow-[0_0_4px_#4ade80]')}ONLINE</span>)}
      {badge('SAT',       satNode())}
      {badge('GPS',       locNode())}
      {badge('INCIDENTS', <span className="text-white/80">{incidentCount} LOADED</span>)}
    </div>
  );
}

// ── Main Map Component ────────────────────────────────────────────────────────
export default function ArgusLeafletMap() {
  const [incidents,        setIncidents]        = useState<ArgusIncident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<ArgusIncident | null>(null);
  const [inspectingStreet, setInspectingStreet] = useState<ArgusIncident | null>(null);

  const [userLocation,   setUserLocation]   = useState<{lat:number;lon:number;accuracy:number;heading?:number|null}|null>(null);
  const [locationStatus, setLocationStatus] = useState<'OFF'|'ACTIVE'|'DENIED'|'UNAVAILABLE'>('OFF');
  const watchIdRef = useRef<number | null>(null);

  const [layers,          setLayers]          = useState({ satellite: true, incidents: true, heatmap: false });
  const [isAddMode,       setIsAddMode]       = useState(false);
  const [nearMeRadius,    setNearMeRadius]    = useState<number | null>(null);
  const [flyToLocation,   setFlyToLocation]   = useState<GeocodeResult | null>(null);

  useEffect(() => {
    IncidentAdapter.fetchAllIncidents().then(setIncidents);
  }, []);

  const handleStartTracking = () => {
    if (!navigator.geolocation) { setLocationStatus('UNAVAILABLE'); return; }
    setLocationStatus('ACTIVE');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy, heading: pos.coords.heading });
        setFlyToLocation({ id: 'user', name: 'User', latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => setLocationStatus('DENIED'),
      { enableHighAccuracy: true }
    );
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy, heading: pos.coords.heading }),
      () => {},
      { enableHighAccuracy: true }
    );
  };

  const handleStopTracking = () => {
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    setLocationStatus('OFF');
    setUserLocation(null);
  };

  const handleIncidentCreated = (inc: ArgusIncident) => setIncidents(prev => [...prev, inc]);

  const filteredIncidents = incidents.filter(inc => {
    if (nearMeRadius && userLocation) {
      const dLat = (inc.latitude - userLocation.lat) * (Math.PI / 180);
      const dLon = (inc.longitude - userLocation.lon) * (Math.PI / 180);
      const a = Math.sin(dLat/2)**2 +
        Math.cos(userLocation.lat*(Math.PI/180))*Math.cos(inc.latitude*(Math.PI/180))*Math.sin(dLon/2)**2;
      const dist = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      if (dist > nearMeRadius) return false;
    }
    return true;
  });

  return (
    <div className="relative w-full h-full flex flex-col bg-black overflow-hidden">

      {/* ── TOP TOOLBAR ──────────────────────────────────────────────────── */}
      <div
        className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-4 py-2 gap-3 pointer-events-none"
        style={{ height: 52 }}
      >
        {/* Left: Search */}
        <div className="pointer-events-auto flex-shrink-0">
          <InlineSearchBar onResultSelect={setFlyToLocation} />
        </div>

        {/* Right: Layer stack + Near Me */}
        <div className="pointer-events-auto flex items-center gap-2 flex-shrink-0">
          <InlineNearMeControl radius={nearMeRadius} setRadius={setNearMeRadius} userLocation={userLocation} />
          <InlineLayerControl  layers={layers}        setLayers={setLayers} />
        </div>
      </div>

      {/* ── MAP CANVAS ───────────────────────────────────────────────────── */}
      <MapContainer
        center={[23.07551, 76.84978]}
        zoom={15}
        maxZoom={18}
        zoomControl={false}
        className="w-full h-full z-0"
        style={{ background: '#0a0a0a', flex: 1 }}
      >
        <ZoomControl position="bottomright" />
        <MapController flyTo={flyToLocation} />

        <TileLayer 
          url={layers.satellite ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : DEFAULT_MAP_PROVIDER.url} 
          attribution={layers.satellite ? 'Esri, Maxar, Earthstar Geographics' : DEFAULT_MAP_PROVIDER.attribution} 
          maxZoom={18} 
        />

        {userLocation      && <UserLocationLayer location={userLocation} />}
        {layers.incidents  && <IncidentLayer incidents={filteredIncidents} onIncidentSelect={setSelectedIncident} />}
        {layers.heatmap    && <HeatmapLayer incidents={incidents} />}
        <ManualMarkerLayer isAddMode={isAddMode} onExitAddMode={() => setIsAddMode(false)} onIncidentCreated={handleIncidentCreated} />
      </MapContainer>

      {/* ── BOTTOM-LEFT: Status Bar ───────────────────────────────────────── */}
      <div className="absolute bottom-8 left-4 z-[1000] pointer-events-none">
        <InlineStatusBar isSatellite={layers.satellite} locationStatus={locationStatus} incidentCount={incidents.length} />
      </div>

      {/* ── BOTTOM-RIGHT: Action Buttons ─────────────────────────────────── */}
      <div className="absolute bottom-8 right-14 z-[1000] flex items-center gap-2">
        <button
          onClick={locationStatus === 'ACTIVE' ? handleStopTracking : handleStartTracking}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-mono text-[10px] font-bold tracking-widest uppercase shadow-xl transition-colors backdrop-blur-md border ${
            locationStatus === 'ACTIVE'
              ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
              : 'bg-black/80 text-white/70 hover:text-white border-white/15 hover:bg-black/90'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          {locationStatus === 'ACTIVE' ? 'STOP' : 'MY LOCATION'}
        </button>

        <button
          onClick={() => { setIsAddMode(!isAddMode); setSelectedIncident(null); }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-mono text-[10px] font-bold tracking-widest uppercase shadow-xl transition-colors backdrop-blur-md border ${
            isAddMode
              ? 'bg-green-500/20 text-green-400 border-green-500/50'
              : 'bg-black/80 text-white/70 hover:text-white border-white/15 hover:bg-black/90'
          }`}
        >
          {isAddMode ? <MapPin className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {isAddMode ? 'CLICK TO PLACE' : 'ADD MARKER'}
        </button>
      </div>

      {/* ── Incident Detail Panel ─────────────────────────────────────────── */}
      <IncidentPanel
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onInspectStreet={setInspectingStreet}
        userLocation={userLocation}
      />

      {/* ── Street Viewer ─────────────────────────────────────────────────── */}
      {inspectingStreet && (
        <StreetInspectionViewer incident={inspectingStreet} onClose={() => setInspectingStreet(null)} />
      )}

      {/* Add Mode Banner */}
      {isAddMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] bg-green-500/10 backdrop-blur-md border border-green-500/40 text-green-400 font-mono text-[10px] tracking-widest uppercase px-4 py-2 rounded-full shadow-xl pointer-events-none animate-pulse">
          CLICK ANYWHERE ON MAP TO PLACE INCIDENT
        </div>
      )}
    </div>
  );
}
