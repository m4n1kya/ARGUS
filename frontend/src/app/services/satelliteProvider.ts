// Sentinel Hub WMS/WMTS service integration
export interface SatelliteLayerConfig {
  url: string;
  layers: string;
  attribution: string;
  maxZoom: number;
}

export interface SatelliteMetadata {
  provider: string;
  acquisitionDate: Date | null;
  status: 'CURRENT' | 'OLDER' | 'UNAVAILABLE' | 'FETCHING';
  daysOld: number | null;
}

const INSTANCE_ID = process.env.NEXT_PUBLIC_COPERNICUS_INSTANCE_ID;
const LAYER = process.env.NEXT_PUBLIC_COPERNICUS_LAYER || 'TRUE_COLOR';

// The Sentinel Hub WMS endpoint
const WMS_URL = `https://sh.dataspace.copernicus.eu/ogc/wms/${INSTANCE_ID}`;

export const getSatelliteLayerConfig = (timeRangeStart?: string, timeRangeEnd?: string): SatelliteLayerConfig => {
  let url = WMS_URL;
  if (timeRangeStart && timeRangeEnd) {
    url += `?TIME=${timeRangeStart}/${timeRangeEnd}`;
  }
  
  return {
    url,
    layers: LAYER,
    attribution: '&copy; <a href="https://dataspace.copernicus.eu">Copernicus Sentinel Data</a>',
    maxZoom: 16
  };
};

export class CopernicusSentinelProvider {
  // A basic dynamic time window: 7 days ago to today
  static getDynamicTimeRange(): { start: string, end: string } {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    
    // Format YYYY-MM-DD
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }
  
  // WFS (Web Feature Service) can be used to query actual acquisition metadata from Sentinel Hub
  static async getLatestAcquisitionMetadata(bbox: [number, number, number, number]): Promise<SatelliteMetadata> {
    if (!INSTANCE_ID) {
      return { provider: 'Copernicus', acquisitionDate: null, status: 'UNAVAILABLE', daysOld: null };
    }
    
    // BBOX format for WFS is minLng,minLat,maxLng,maxLat
    const [minLng, minLat, maxLng, maxLat] = bbox;
    const { start, end } = this.getDynamicTimeRange();
    
    const wfsUrl = `https://sh.dataspace.copernicus.eu/ogc/wfs/${INSTANCE_ID}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=S2L2A&BBOX=${minLng},${minLat},${maxLng},${maxLat}&TIME=${start}/${end}&MAXFEATURES=1&OUTPUTFORMAT=application/json`;

    try {
      const response = await fetch(wfsUrl);
      if (!response.ok) throw new Error("WFS query failed");
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        // Sentinel Hub WFS returns feature properties including 'date'
        const props = data.features[0].properties;
        const acqDate = new Date(props.date);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - acqDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          provider: 'Copernicus Sentinel-2',
          acquisitionDate: acqDate,
          status: diffDays <= 3 ? 'CURRENT' : 'OLDER',
          daysOld: diffDays
        };
      }
      
      return { provider: 'Copernicus Sentinel-2', acquisitionDate: null, status: 'UNAVAILABLE', daysOld: null };
    } catch (e) {
      // Silently fail if WFS is unsupported for this instance/region, fallback to UNAVAILABLE
      return { provider: 'Copernicus Sentinel-2', acquisitionDate: null, status: 'UNAVAILABLE', daysOld: null };
    }
  }
}
