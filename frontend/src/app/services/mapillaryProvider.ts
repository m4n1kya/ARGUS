export interface StreetImage {
  id: string;
  latitude: number;
  longitude: number;
  capturedAt: Date | null;
  isPanorama: boolean;
  thumbnailUrl: string;
  sequenceId: string;
  compassAngle: number;
}

const ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPILLARY_ACCESS_TOKEN;

// Mapillary v4 API endpoints
const GRAPH_API = 'https://graph.mapillary.com';

// Cache to prevent duplicate queries for the same incident coordinate
const lookupCache = new Map<string, StreetImage | null>();

export class MapillaryProvider {
  /**
   * Search for the nearest image to a coordinate within a radius.
   * Mapillary uses a bounding box for search. We create a small bbox around the coordinate.
   */
  static async getNearestImage(lat: number, lon: number, radiusMeters = 50): Promise<StreetImage | null> {
    if (!ACCESS_TOKEN) {
      console.warn("Mapillary Access Token not configured.");
      return null;
    }

    const cacheKey = `${lat.toFixed(5)},${lon.toFixed(5)}`;
    if (lookupCache.has(cacheKey)) {
      return lookupCache.get(cacheKey) || null;
    }

    // Approx degrees per meter
    const dLat = radiusMeters / 111320;
    const dLon = radiusMeters / (40075000 * Math.cos(lat * Math.PI / 180) / 360);
    
    const minLng = lon - dLon;
    const maxLng = lon + dLon;
    const minLat = lat - dLat;
    const maxLat = lat + dLat;

    const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
    const fields = 'id,geometry,captured_at,is_pano,thumb_256_url,sequence,compass_angle';
    const url = `${GRAPH_API}/images?fields=${fields}&bbox=${bbox}&limit=5&access_token=${ACCESS_TOKEN}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Mapillary graph api error");
      const data = await res.json();
      
      if (data.data && data.data.length > 0) {
        // Find nearest (simplistic linear distance for small radius)
        let nearest = data.data[0];
        let minDist = Number.MAX_VALUE;
        
        for (const img of data.data) {
          const imgLon = img.geometry.coordinates[0];
          const imgLat = img.geometry.coordinates[1];
          const dist = Math.sqrt(Math.pow(imgLon - lon, 2) + Math.pow(imgLat - lat, 2));
          if (dist < minDist) {
            minDist = dist;
            nearest = img;
          }
        }
        
        const result: StreetImage = {
          id: nearest.id,
          longitude: nearest.geometry.coordinates[0],
          latitude: nearest.geometry.coordinates[1],
          capturedAt: nearest.captured_at ? new Date(nearest.captured_at) : null,
          isPanorama: nearest.is_pano || false,
          thumbnailUrl: nearest.thumb_256_url,
          sequenceId: nearest.sequence,
          compassAngle: nearest.compass_angle || 0
        };
        
        lookupCache.set(cacheKey, result);
        return result;
      }
      
      lookupCache.set(cacheKey, null);
      return null;
      
    } catch (e) {
      console.error("Mapillary lookup failed:", e);
      return null;
    }
  }
}
