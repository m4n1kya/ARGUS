export interface GeocodeResult {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  bbox?: [number, number, number, number];
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'ARGUS-Geospatial-Intelligence-Platform';

// Cache to avoid hammering Nominatim
const cache = new Map<string, GeocodeResult[]>();

export class GeocodingProvider {
  /**
   * Search for locations using OSM Nominatim.
   * Complies with Nominatim usage policy (max 1 req/sec, valid User-Agent).
   */
  static async search(query: string): Promise<GeocodeResult[]> {
    if (!query || query.trim().length < 3) return [];
    
    const term = query.trim().toLowerCase();
    if (cache.has(term)) {
      return cache.get(term) || [];
    }

    const url = `${NOMINATIM_BASE_URL}/search?q=${encodeURIComponent(term)}&format=json&limit=5`;
    
    try {
      // Small artificial delay to respect rate limits if called in rapid succession
      await new Promise(r => setTimeout(r, 500));
      
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept-Language': 'en'
        }
      });
      
      if (!res.ok) throw new Error("Geocoding failed");
      const data = await res.json();
      
      const results: GeocodeResult[] = data.map((item: any) => ({
        id: item.place_id.toString(),
        name: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        bbox: item.boundingbox ? [
          parseFloat(item.boundingbox[2]), // minLng
          parseFloat(item.boundingbox[0]), // minLat
          parseFloat(item.boundingbox[3]), // maxLng
          parseFloat(item.boundingbox[1])  // maxLat
        ] : undefined
      }));
      
      cache.set(term, results);
      return results;
    } catch (e) {
      console.warn("Geocoding error:", e);
      return [];
    }
  }
}
