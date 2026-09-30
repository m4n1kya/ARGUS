import { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { CopernicusSentinelProvider, getSatelliteLayerConfig, SatelliteMetadata } from '../../services/satelliteProvider';

export default function SatelliteLayer({ onStatusChange }: { onStatusChange: (status: SatelliteMetadata) => void }) {
  const map = useMap();
  const layerRef = useRef<L.TileLayer.WMS | null>(null);
  
  // Throttle updates
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAndApplySatellite = async () => {
    const bounds = map.getBounds();
    // bounds: [minLng, minLat, maxLng, maxLat]
    const bbox: [number, number, number, number] = [
      bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()
    ];
    
    // Notify fetching state
    onStatusChange({ provider: 'Copernicus', acquisitionDate: null, status: 'FETCHING', daysOld: null });

    const metadata = await CopernicusSentinelProvider.getLatestAcquisitionMetadata(bbox);
    onStatusChange(metadata);

    // Regardless of metadata age (unless completely unavailable), we render the WMS layer
    // with the dynamic time range.
    if (metadata.status !== 'UNAVAILABLE') {
      const { start, end } = CopernicusSentinelProvider.getDynamicTimeRange();
      const config = getSatelliteLayerConfig(start, end);
      
      if (!layerRef.current) {
        layerRef.current = L.tileLayer.wms(config.url, {
          layers: config.layers,
          format: 'image/png',
          transparent: true,
          attribution: config.attribution,
          maxZoom: config.maxZoom,
          opacity: 0.9,
          className: 'satellite-wms-layer'
        }).addTo(map);
        // Ensure it's rendered below markers but above base map
        layerRef.current.setZIndex(5);
      } else {
        // Just update URL if it changed
        if ((layerRef.current as any)._url !== config.url) {
          layerRef.current.setUrl(config.url);
        }
      }
    } else {
      // If unavailable, optionally remove the layer if it exists
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    }
  };

  useEffect(() => {
    if (!map) return;
    
    // Initial fetch
    fetchAndApplySatellite();

    // Re-evaluate on move end (debounced)
    const handleMoveEnd = () => {
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
        fetchAndApplySatellite();
      }, 1000);
    };

    map.on('moveend', handleMoveEnd);

    return () => {
      map.off('moveend', handleMoveEnd);
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      if (layerRef.current && map) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map]);

  return null;
}
