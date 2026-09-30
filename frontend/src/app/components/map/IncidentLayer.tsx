import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { ArgusIncident } from '../../services/incidentAdapter';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

interface IncidentLayerProps {
  incidents: ArgusIncident[];
  onIncidentSelect: (incident: ArgusIncident) => void;
}

export default function IncidentLayer({ incidents, onIncidentSelect }: IncidentLayerProps) {
  const map = useMap();
  const [clusterGroup, setClusterGroup] = useState<any>(null);

  useEffect(() => {
    if (!map) return;

    // Remove existing cluster group if any
    if (clusterGroup) {
      map.removeLayer(clusterGroup);
    }

    // @ts-ignore
    const cg = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      iconCreateFunction: function (cluster: any) {
        const childCount = cluster.getChildCount();
        let c = ' bg-blue-500/80';
        if (childCount > 10) c = ' bg-orange-500/80';
        if (childCount > 50) c = ' bg-red-500/80';

        return L.divIcon({
          html: `<div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-white/20 shadow-[0_0_15px_rgba(0,0,0,0.5)] ${c}"><span>${childCount}</span></div>`,
          className: 'custom-cluster-icon',
          iconSize: L.point(40, 40)
        });
      }
    });

    const markers = incidents.map(inc => {
      let colorClass = 'bg-blue-500'; // LOW
      let pulseColor = 'rgba(59, 130, 246, 0.5)';
      
      if (inc.severity === 'MEDIUM') {
        colorClass = 'bg-yellow-500';
        pulseColor = 'rgba(234, 179, 8, 0.5)';
      }
      if (inc.severity === 'HIGH') {
        colorClass = 'bg-orange-500';
        pulseColor = 'rgba(249, 115, 22, 0.5)';
      }
      if (inc.severity === 'CRITICAL') {
        colorClass = 'bg-red-500';
        pulseColor = 'rgba(239, 68, 68, 0.5)';
      }

      // Distinguish manual vs AI source
      const borderClass = inc.source === 'MANUAL' ? 'border-dashed border-2 border-white' : 'border-2 border-black';
      
      const iconHtml = `
        <div style="position: relative; width: 24px; height: 24px; display: flex; justify-content: center; align-items: center;">
          <div class="absolute inset-0 rounded-full animate-ping" style="background-color: ${pulseColor}; opacity: 0.7;"></div>
          <div class="relative w-4 h-4 rounded-full ${colorClass} ${borderClass} shadow-lg z-10"></div>
        </div>
      `;

      const icon = L.divIcon({
        html: iconHtml,
        className: 'custom-incident-icon',
        iconSize: L.point(24, 24),
        iconAnchor: [12, 12]
      });

      const marker = L.marker([inc.latitude, inc.longitude], { icon });
      
      marker.on('click', () => {
        onIncidentSelect(inc);
      });

      return marker;
    });

    cg.addLayers(markers);
    map.addLayer(cg);
    setClusterGroup(cg);

    return () => {
      if (cg && map) {
        map.removeLayer(cg);
      }
    };
  }, [map, incidents]);

  return null;
}
