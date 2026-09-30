export interface MapConfig {
  url: string;
  attribution: string;
  maxZoom: number;
}

// OpenStreetMap Standard Tile Layer
// Using HTTPS, respectful of OSM public tile usage policies
export const OSM_PROVIDER: MapConfig = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19
};

// Configured default provider
export const DEFAULT_MAP_PROVIDER = OSM_PROVIDER;
