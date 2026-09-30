export interface ArgusIncident {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  status: string;
  timestamp: Date;
  source: 'AI' | 'MANUAL';
  imageUrl: string | null;
  recurrenceCount: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://argus-aybo.onrender.com';

export class IncidentAdapter {
  static async fetchAllIncidents(): Promise<ArgusIncident[]> {
    try {
      const res = await fetch(`${API_BASE}/hazards`);
      if (!res.ok) throw new Error("Failed to fetch hazards");
      
      const rawHazards = await res.json();
      return rawHazards.map((h: any) => this.normalize(h));
    } catch (e) {
      // Silently fail if backend is down to avoid Next.js error overlay
      return [];
    }
  }
  
  static async fetchIncident(id: string): Promise<ArgusIncident | null> {
    try {
      const res = await fetch(`${API_BASE}/hazards/${id}`);
      if (!res.ok) return null;
      const data = await res.json();
      return this.normalize(data);
    } catch (e) {
      return null;
    }
  }

  static async createManualMarker(lat: number, lon: number, type: string, description: string): Promise<ArgusIncident | null> {
    // For manual markers, we could use the same endpoint, but we pass severity logic if backend supports it.
    // The current backend accepts form data.
    const formData = new FormData();
    formData.append('hazard_class', type);
    formData.append('lat', lat.toString());
    formData.append('lon', lon.toString());
    // In a real app we'd pass source='MANUAL', description, etc.
    
    try {
      const res = await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        const normalized = this.normalize(data);
        normalized.source = 'MANUAL'; // Override for local state
        return normalized;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  private static normalize(raw: any): ArgusIncident {
    // Calculate severity label based on score
    const score = raw.severity_score || raw.aurs_score || 0.5;
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (score >= 0.8) severity = 'CRITICAL';
    else if (score >= 0.6) severity = 'HIGH';
    else if (score >= 0.3) severity = 'MEDIUM';

    return {
      id: raw.id.toString(),
      latitude: raw.lat,
      longitude: raw.lon,
      type: raw.hazard_class,
      severity,
      confidence: raw.confidence || 0.8,
      status: raw.status || 'reported',
      timestamp: new Date(raw.created_at),
      source: 'AI', // Defaulting to AI from backend
      imageUrl: raw.image_path ? `${API_BASE}${raw.image_path}` : null,
      recurrenceCount: raw.recurrence_count || 1
    };
  }
}
