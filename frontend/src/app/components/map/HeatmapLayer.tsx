import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { ArgusIncident } from '../../services/incidentAdapter';

export default function HeatmapLayer({ incidents }: { incidents: ArgusIncident[] }) {
  const map = useMap();
  const [heatLayer, setHeatLayer] = useState<any>(null);

  useEffect(() => {
    if (!map) return;

    // Convert incidents to heatmap data points [lat, lon, intensity]
    const data = incidents.map(inc => {
      let intensity = 0.2;
      if (inc.severity === 'MEDIUM') intensity = 0.5;
      if (inc.severity === 'HIGH') intensity = 0.8;
      if (inc.severity === 'CRITICAL') intensity = 1.0;
      return [inc.latitude, inc.longitude, intensity] as [number, number, number];
    });

    if (heatLayer) {
      heatLayer.setLatLngs(data);
    } else {
      // @ts-ignore - leaflet.heat adds L.heatLayer
      const newLayer = L.heatLayer(data, {
        radius: 25,
        blur: 15,
        maxZoom: 16,
        gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }
      }).addTo(map);
      setHeatLayer(newLayer);
    }

    return () => {
      if (heatLayer) {
        map.removeLayer(heatLayer);
      }
    };
  }, [map, incidents]);

  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      if (heatLayer && map) {
        map.removeLayer(heatLayer);
      }
    };
  }, [heatLayer, map]);

  return null;
}
