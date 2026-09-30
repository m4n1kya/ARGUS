import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface UserLocationLayerProps {
  location: { lat: number, lon: number, accuracy: number, heading?: number | null } | null;
}

export default function UserLocationLayer({ location }: UserLocationLayerProps) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!map) return;

    if (location) {
      const latlng = new L.LatLng(location.lat, location.lon);

      if (!markerRef.current) {
        const icon = L.divIcon({
          html: `
            <div class="relative w-8 h-8 flex items-center justify-center">
              <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-50"></div>
              <div class="relative w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
              ${location.heading !== undefined && location.heading !== null ? `
                <div class="absolute w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-blue-500" style="top: -6px; transform: rotate(${location.heading}deg); transform-origin: 50% 20px;"></div>
              ` : ''}
            </div>
          `,
          className: 'custom-user-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        markerRef.current = L.marker(latlng, { icon, zIndexOffset: 1000 }).addTo(map);
        markerRef.current.bindTooltip("YOU ARE HERE", { direction: 'top', className: 'font-mono text-xs font-bold tracking-widest' });
      } else {
        markerRef.current.setLatLng(latlng);
      }

      if (!circleRef.current) {
        circleRef.current = L.circle(latlng, {
          radius: location.accuracy,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 1,
          dashArray: '4,4'
        }).addTo(map);
      } else {
        circleRef.current.setLatLng(latlng);
        circleRef.current.setRadius(location.accuracy);
      }
    } else {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      if (circleRef.current) {
        map.removeLayer(circleRef.current);
        circleRef.current = null;
      }
    }
  }, [map, location]);

  return null;
}
