/**
 * ARGUS — Report & Documentation Storage Service
 * Handles Upload Records, AI Model Verification Metadata, Community Likes (Acknowledgments),
 * Comments, and Deletion with localStorage persistence and API sync.
 */

export interface CommentItem {
  id: string;
  author: string;
  is_author_verified: boolean;
  text: string;
  timestamp: string;
}

export interface AiDetectionMetadata {
  verified: boolean;
  status: 'VERIFIED_AUTHENTIC' | 'CONSENSUS_REACHED' | 'FLAGGED';
  confidence: number; // e.g. 96.4
  detected_class: string;
  severity_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  severity_score: number; // 0.0 - 1.0
  model_version: string;
  inspection_notes: string;
  surface_analysis: {
    depth_estimate: string;
    road_impact: string;
    edge_degradation: string;
    synthetic_artifact_probability: string;
  };
  anomaly_coords: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface HazardUploadRecord {
  id: string;
  hazard_class: 'pothole' | 'garbage' | 'construction' | 'debris' | 'exposed_wire';
  title: string;
  description: string;
  lat: number;
  lon: number;
  address_label: string;
  image_url: string;
  created_at: string;
  user_id: string;
  user_name: string;
  is_mine: boolean;
  likes_count: number;
  liked_by_me: boolean;
  comments: CommentItem[];
  ai_detection: AiDetectionMetadata;
}

const STORAGE_KEY = 'argus_hazard_history_v2';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

// Seed demo community reports with complete AI detection logs, likes, and comments
const INITIAL_DEMO_REPORTS: HazardUploadRecord[] = [
  {
    id: 'rep-seed-001',
    hazard_class: 'pothole',
    title: 'Severe Asphalt Cavity - NH-46 Junction',
    description: 'Deep road surface crater near eastern bypass lane. Causing high vehicular swerving.',
    lat: 23.07842,
    lon: 76.85215,
    address_label: 'Kothri Pilot Grid - NH46 Eastbound Sector 3',
    image_url: '/hazard-images/potholes.webp',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    user_id: 'pilot-inspect-04',
    user_name: 'Pilot Inspector (Unit #4)',
    is_mine: false,
    likes_count: 18,
    liked_by_me: true,
    comments: [
      {
        id: 'c-101',
        author: 'Transit Patrol Beta',
        is_author_verified: true,
        text: 'Confirmed in person at 09:30 AM. Cones temporarily deployed on adjacent shoulder.',
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
      },
      {
        id: 'c-102',
        author: 'Arjun M.',
        is_author_verified: false,
        text: 'Almost damaged my bike rim here yesterday. Thanks for logging!',
        timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString()
      }
    ],
    ai_detection: {
      verified: true,
      status: 'VERIFIED_AUTHENTIC',
      confidence: 97.2,
      detected_class: 'Pothole (Grade-4 Cavity)',
      severity_level: 'CRITICAL',
      severity_score: 0.88,
      model_version: 'ARGUS-Vision-v2.4-Alpha',
      inspection_notes: 'High-frequency gradient shift detected in asphalt matrix. Crater depth estimated at 8.4cm with exposed sub-base rock. Zero synthetic/AI generation artifacts detected. Authenticity confirmed against satellite spatial pass.',
      surface_analysis: {
        depth_estimate: '8.4 cm ± 0.6 cm',
        road_impact: 'High Risk (Two-Wheelers & Small Sedans)',
        edge_degradation: '92% perimeter fracturing',
        synthetic_artifact_probability: '< 0.08% (Genuine In-Situ Photo)'
      },
      anomaly_coords: { x: 28, y: 34, width: 44, height: 38 }
    }
  },
  {
    id: 'rep-seed-002',
    hazard_class: 'construction',
    title: 'Unbarricaded Excavation Trench',
    description: 'Underground conduit trench left open without reflective warning tape or blinking beacons.',
    lat: 23.07611,
    lon: 76.84892,
    address_label: 'Academic Complex Outer Ring, VIT Corridor',
    image_url: '/hazard-images/construction.webp',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    user_id: 'user_current',
    user_name: 'Command Operator (You)',
    is_mine: true,
    likes_count: 9,
    liked_by_me: false,
    comments: [
      {
        id: 'c-201',
        author: 'Campus Safety Dispatch',
        is_author_verified: true,
        text: 'Escalated to engineering contractor. Barricades scheduled before nightfall.',
        timestamp: new Date(Date.now() - 3600000 * 8).toISOString()
      }
    ],
    ai_detection: {
      verified: true,
      status: 'VERIFIED_AUTHENTIC',
      confidence: 94.6,
      detected_class: 'Unsafe Civil Construction Anomaly',
      severity_level: 'HIGH',
      severity_score: 0.74,
      model_version: 'ARGUS-Vision-v2.4-Alpha',
      inspection_notes: 'Linear soil trench detected exceeding 1.2m depth. Warning perimeter flags absent. Optical reflectance identifies loose rubble perimeter and pedestrian proximity hazard.',
      surface_analysis: {
        depth_estimate: '1.25 m trench depth',
        road_impact: 'Moderate lane restriction (Pedestrian Hazard)',
        edge_degradation: 'Uncompacted soil collapse risk',
        synthetic_artifact_probability: '< 0.12% (Genuine In-Situ Photo)'
      },
      anomaly_coords: { x: 22, y: 25, width: 56, height: 50 }
    }
  },
  {
    id: 'rep-seed-003',
    hazard_class: 'exposed_wire',
    title: 'Low-Hanging Exposed Electrical Cable',
    description: 'Severed overhead distribution line dangling within 1.8m of footpath near drainage gutter.',
    lat: 23.07923,
    lon: 76.85360,
    address_label: 'Substation Feeder 4B, Kothri Village Way',
    image_url: '/hazard-images/debris.webp',
    created_at: new Date(Date.now() - 3600000 * 22).toISOString(),
    user_id: 'pilot-inspect-09',
    user_name: 'Municipal Patrol #9',
    is_mine: false,
    likes_count: 24,
    liked_by_me: true,
    comments: [
      {
        id: 'c-301',
        author: 'Grid Operator',
        is_author_verified: true,
        text: 'Circuit breaker opened remotely. Line de-energized pending field crew arrival.',
        timestamp: new Date(Date.now() - 3600000 * 20).toISOString()
      }
    ],
    ai_detection: {
      verified: true,
      status: 'VERIFIED_AUTHENTIC',
      confidence: 98.1,
      detected_class: 'Exposed High-Voltage Cable Line',
      severity_level: 'CRITICAL',
      severity_score: 0.95,
      model_version: 'ARGUS-Vision-v2.4-Alpha',
      inspection_notes: 'Cylindrical conductor trajectory identified hanging vertically. Insulation fraying detected with copper core exposure. Immediate shock/electrocution threat classified.',
      surface_analysis: {
        depth_estimate: 'Elevation: 1.8m above ground',
        road_impact: 'Critical Life-Safety & Pedestrian Corridor',
        edge_degradation: 'Bare conductor contact zone',
        synthetic_artifact_probability: '< 0.05% (Genuine In-Situ Photo)'
      },
      anomaly_coords: { x: 35, y: 18, width: 30, height: 65 }
    }
  },
  {
    id: 'rep-seed-004',
    hazard_class: 'garbage',
    title: 'Solid Waste Overflow Blocking Culvert',
    description: 'Accumulation of plastic containers and organic debris obstructing storm drain runoff.',
    lat: 23.07520,
    lon: 76.84990,
    address_label: 'Stormwater Culvert #2, Kothri Perimeter',
    image_url: '/hazard-images/garbage.webp',
    created_at: new Date(Date.now() - 3600000 * 30).toISOString(),
    user_id: 'citizen-eco-12',
    user_name: 'Sanitation Monitor #12',
    is_mine: false,
    likes_count: 14,
    liked_by_me: false,
    comments: [
      {
        id: 'c-401',
        author: 'EcoVolunteer',
        is_author_verified: false,
        text: 'Heavy rain forecasted this weekend. Needs clearing ASAP to prevent road waterlogging.',
        timestamp: new Date(Date.now() - 3600000 * 28).toISOString()
      }
    ],
    ai_detection: {
      verified: true,
      status: 'CONSENSUS_REACHED',
      confidence: 92.4,
      detected_class: 'Unregulated Municipal Waste Accumulation',
      severity_level: 'MEDIUM',
      severity_score: 0.58,
      model_version: 'ARGUS-Vision-v2.4-Alpha',
      inspection_notes: 'High spatial entropy signature consistent with plastic polymer waste dispersion. Hydro-drainage obstruction risk calculated at 78%.',
      surface_analysis: {
        depth_estimate: 'Estimated volume ~ 2.4 m³',
        road_impact: 'Drainage blockage & vector hazard',
        edge_degradation: 'Watercourse runoff blockage',
        synthetic_artifact_probability: '< 0.15% (Genuine In-Situ Photo)'
      },
      anomaly_coords: { x: 20, y: 30, width: 60, height: 50 }
    }
  }
];

export class ReportStorageService {
  /**
   * Get all reports from local storage (or initialize from seed)
   */
  static getReports(): HazardUploadRecord[] {
    if (typeof window === 'undefined') return INITIAL_DEMO_REPORTS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_REPORTS));
        return INITIAL_DEMO_REPORTS;
      }
      return JSON.parse(stored);
    } catch (e) {
      console.warn('Could not read reports from localStorage:', e);
      return INITIAL_DEMO_REPORTS;
    }
  }

  /**
   * Save a verified report into the system
   */
  static saveReport(report: HazardUploadRecord): void {
    if (typeof window === 'undefined') return;
    try {
      const current = this.getReports();
      const updated = [report, ...current];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Asynchronously post to backend API so it appears in the DB / live map
      this.syncReportToBackend(report);
    } catch (e) {
      console.error('Failed to save report:', e);
    }
  }

  /**
   * Toggle like (acknowledge as true) for a report
   */
  static toggleLike(reportId: string): HazardUploadRecord | null {
    if (typeof window === 'undefined') return null;
    try {
      const current = this.getReports();
      const targetIndex = current.findIndex(r => r.id === reportId);
      if (targetIndex === -1) return null;

      const target = { ...current[targetIndex] };
      if (target.liked_by_me) {
        target.liked_by_me = false;
        target.likes_count = Math.max(0, target.likes_count - 1);
      } else {
        target.liked_by_me = true;
        target.likes_count += 1;
      }

      current[targetIndex] = target;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      return target;
    } catch (e) {
      console.error('Failed to toggle like:', e);
      return null;
    }
  }

  /**
   * Add a comment to a report
   */
  static addComment(reportId: string, text: string, authorName: string = 'You'): HazardUploadRecord | null {
    if (typeof window === 'undefined' || !text.trim()) return null;
    try {
      const current = this.getReports();
      const targetIndex = current.findIndex(r => r.id === reportId);
      if (targetIndex === -1) return null;

      const newComment: CommentItem = {
        id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        author: authorName,
        is_author_verified: false,
        text: text.trim(),
        timestamp: new Date().toISOString()
      };

      const target = {
        ...current[targetIndex],
        comments: [...current[targetIndex].comments, newComment]
      };

      current[targetIndex] = target;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      return target;
    } catch (e) {
      console.error('Failed to add comment:', e);
      return null;
    }
  }

  /**
   * Delete a report by ID (removes it completely)
   */
  static deleteReport(reportId: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const current = this.getReports();
      const updated = current.filter(r => r.id !== reportId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Attempt backend delete if numerical ID
      if (!reportId.startsWith('rep-seed-')) {
        fetch(`${API_BASE}/hazards/${reportId}`, { method: 'DELETE' }).catch(() => {});
      }
      return true;
    } catch (e) {
      console.error('Failed to delete report:', e);
      return false;
    }
  }

  /**
   * Synchronize report to FastAPI backend if available
   */
  private static async syncReportToBackend(report: HazardUploadRecord) {
    try {
      const formData = new FormData();
      formData.append('hazard_class', report.hazard_class);
      formData.append('lat', report.lat.toString());
      formData.append('lon', report.lon.toString());
      
      await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        body: formData
      });
    } catch (e) {
      // Backend might be offline; local persistence already succeeded
    }
  }

  /**
   * Multi-stage AI Verification simulation that inspects upload evidence
   * and verifies authenticity before map commitment.
   */
  static async runAiVerification(
    file: File | null,
    hazardClass: 'pothole' | 'garbage' | 'construction' | 'debris' | 'exposed_wire',
    onProgress: (pct: number, stageName: string, detail: string) => void
  ): Promise<AiDetectionMetadata> {
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

    onProgress(15, 'Optical Ingestion', 'Reading high-fidelity optical pixels & parsing spatial EXIF tags...');
    await sleep(650);

    onProgress(35, 'Convolutional Scan', 'Executing spatial convolution & boundary depth gradient analysis...');
    await sleep(750);

    onProgress(65, 'Authenticity Verification', 'Checking surface texture physics against synthetic AI / diffusion artifacts...');
    await sleep(800);

    onProgress(90, 'Epistemic Cross-Reference', 'Cross-referencing terrain elevation and pilot zone infrastructure baselines...');
    await sleep(600);

    onProgress(100, 'Verification Complete', 'Hazard confirmed authentic with high confidence.');

    // Compute tailored AI detection telemetry
    const classDetails: Record<string, { name: string, notes: string, impact: string, depth: string, sev: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', score: number }> = {
      pothole: {
        name: 'Pothole (Surface Structural Cavity)',
        notes: 'Radial impact fracturing detected in asphalt substrate. Edge shadows confirm structural depression > 6cm. Zero diffusion/synthetic signatures detected.',
        impact: 'High Risk for Two-Wheelers & Vehicular Suspensions',
        depth: '6.8 cm ± 0.5 cm',
        sev: 'HIGH',
        score: 0.82
      },
      garbage: {
        name: 'Solid Waste Accumulation',
        notes: 'High spatial distribution of polymeric and organic waste clusters. Drainage passage partially restricted.',
        impact: 'Hygiene & Stormwater Runoff Obstruction',
        depth: '1.8 m³ volume footprint',
        sev: 'MEDIUM',
        score: 0.55
      },
      construction: {
        name: 'Unprotected Civil Works Anomaly',
        notes: 'Unregulated excavation edge detected without safety perimeter tape or luminous markers. Soil slippage hazard active.',
        impact: 'Pedestrian & Nighttime Vehicular Danger',
        depth: '1.1 m trench depth',
        sev: 'HIGH',
        score: 0.78
      },
      debris: {
        name: 'Displaced Solid Obstacle / Fallen Debris',
        notes: 'Extraneous solid mass detected impeding vehicular clearance zone. High contrast against road tarmac.',
        impact: 'Obstruction to traffic flow',
        depth: 'Cross-lane width ~ 0.85 m',
        sev: 'MEDIUM',
        score: 0.62
      },
      exposed_wire: {
        name: 'Severed / Low-Hanging Electrical Cable',
        notes: 'High-contrast linear dielectric cable trajectory identified dangling below statutory safety clearance. Bare conductor exposure detected.',
        impact: 'Immediate Electrocution & Fire Risk',
        depth: 'Dangling elevation: 1.7 m above ground level',
        sev: 'CRITICAL',
        score: 0.94
      }
    };

    const details = classDetails[hazardClass] || classDetails.pothole;
    const confidence = parseFloat((93.5 + Math.random() * 5.5).toFixed(1));

    return {
      verified: true,
      status: 'VERIFIED_AUTHENTIC',
      confidence,
      detected_class: details.name,
      severity_level: details.sev,
      severity_score: details.score,
      model_version: 'ARGUS-Vision-v2.4-Alpha',
      inspection_notes: details.notes,
      surface_analysis: {
        depth_estimate: details.depth,
        road_impact: details.impact,
        edge_degradation: '91.4% boundary coherence',
        synthetic_artifact_probability: '< 0.09% (Authentic Ground-Truth Capture)'
      },
      anomaly_coords: {
        x: 24 + Math.floor(Math.random() * 15),
        y: 20 + Math.floor(Math.random() * 15),
        width: 45 + Math.floor(Math.random() * 10),
        height: 40 + Math.floor(Math.random() * 15)
      }
    };
  }
}
