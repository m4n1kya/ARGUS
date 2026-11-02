/**
 * ARGUS — Report & Documentation Storage Service
 * Handles Upload Records, Real AI Model Verification Metadata, Real-Time Polling,
 * Community Likes, Comments, and API synchronization with the ARGUS backend.
 */

export interface CommentItem {
  id: string;
  author: string;
  is_author_verified: boolean;
  text: string;
  timestamp: string;
}

export interface AiDetectionItem {
  id?: number;
  class_id: number;
  class_name: string;
  display_name?: string;
  confidence: number;
  confidence_level?: 'HIGH' | 'MODERATE' | 'LOW';
  bbox_x1: number;
  bbox_y1: number;
  bbox_x2: number;
  bbox_y2: number;
  original_image_width: number;
  original_image_height: number;
}

export interface ImageQualityMetadata {
  width: number;
  height: number;
  megapixels: number;
  sharpness_score: number;
  sharpness_rating: string;
  suitability: string;
  warnings: string[];
}

export interface ModelBenchmarkSnapshot {
  precision: number | null;
  recall: number | null;
  f1_score: number | null;
  map_50: number | null;
  map_50_95: number | null;
  per_class_ap: Record<string, number> | null;
  iou: number | null;
  subpixel_accuracy: number | null;
  test_dataset_size: number | null;
  training_dataset_size: number | null;
  validation_split: string | null;
  test_split: string | null;
  evaluation_methodology: string | null;
  parameters_count: number | null;
  checkpoint_size_mb: number | null;
  published_inference_speed_ms: number | null;
  published_benchmark_source: string | null;
  published_paper_url: string | null;
}

export interface AiVerificationRecord {
  id: string; // verification_id
  report_id?: number;
  user_id?: string;
  image_reference: string;
  category: string;
  processing_status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'NEEDS_REVIEW' | 'FAILED';
  assessment: 'EVIDENCE_FOUND' | 'NOT_DETECTED' | 'INCONCLUSIVE';
  model_id?: string;
  model_name?: string;
  model_version?: string;
  started_at?: string;
  completed_at?: string;
  total_duration_ms?: number;
  error_code?: string;
  error_message?: string;
  explanation?: string;
  image_quality?: ImageQualityMetadata;
  metrics_summary?: {
    detection_count: number;
    max_confidence?: number;
    avg_confidence?: number;
    class_distribution?: Record<string, number>;
    preprocess_ms?: number;
    inference_ms?: number;
    postprocess_ms?: number;
    total_ms?: number;
    device?: string;
  };
  detections: AiDetectionItem[];
  benchmark_snapshot?: ModelBenchmarkSnapshot;
  original_image_url?: string;
  annotated_image_url?: string;
  created_at: string;
  updated_at?: string;
  // UI client tracking
  current_stage?: string;
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
  verification_id?: string;
  verification?: AiVerificationRecord;
  ai_detection?: any;
}

const STORAGE_KEY = 'argus_hazard_history_v2';
const ACTIVE_VERIFICATIONS_KEY = 'argus_active_verifications_v1';
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

export class ReportStorageService {
  /**
   * Submit citizen report to backend with automatic AI verification (HTTP 202 Accepted).
   */
  static async submitReportToBackend(params: {
    hazard_class: string;
    lat: number;
    lon: number;
    title: string;
    description: string;
    file: File | null;
    user_id?: string;
  }): Promise<{ verification_id: string; report_id: number; image_url: string }> {
    const formData = new FormData();
    formData.append('hazard_class', params.hazard_class);
    formData.append('lat', params.lat.toString());
    formData.append('lon', params.lon.toString());
    if (params.user_id) formData.append('user_id', params.user_id);
    if (params.file) {
      formData.append('image', params.file);
    }

    const response = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok && response.status !== 202) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Upload failed with status ${response.status}`);
    }

    const data = await response.json();
    const verificationId = data.verification_id;
    const reportId = data.hazard.id;
    const imageUrl = data.hazard.image_path ? `${API_BASE}${data.hazard.image_path}` : '';

    // Register into active verifications queue in localStorage
    this.addActiveVerification({
      id: verificationId,
      report_id: reportId,
      image_reference: imageUrl || (params.file ? URL.createObjectURL(params.file) : ''),
      category: params.hazard_class,
      processing_status: 'QUEUED',
      assessment: 'INCONCLUSIVE',
      current_stage: 'IMAGE RECEIVED',
      created_at: new Date().toISOString(),
      detections: [],
    });

    return {
      verification_id: verificationId,
      report_id: reportId,
      image_url: imageUrl,
    };
  }

  /**
   * Fetch active verifications from localStorage
   */
  static getActiveVerifications(): AiVerificationRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(ACTIVE_VERIFICATIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Add a new active verification record
   */
  static addActiveVerification(record: AiVerificationRecord): void {
    if (typeof window === 'undefined') return;
    try {
      const active = this.getActiveVerifications();
      const updated = [record, ...active.filter((r) => r.id !== record.id)];
      localStorage.setItem(ACTIVE_VERIFICATIONS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save active verification:', e);
    }
  }

  /**
   * Update active verification state
   */
  static updateActiveVerification(record: AiVerificationRecord): void {
    if (typeof window === 'undefined') return;
    try {
      const active = this.getActiveVerifications();
      const updated = active.map((r) => (r.id === record.id ? { ...r, ...record } : r));
      localStorage.setItem(ACTIVE_VERIFICATIONS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not update active verification:', e);
    }
  }

  /**
   * Remove from active queue (when completed or moved to history)
   */
  static removeActiveVerification(id: string): void {
    if (typeof window === 'undefined') return;
    try {
      const active = this.getActiveVerifications();
      const updated = active.filter((r) => r.id !== id);
      localStorage.setItem(ACTIVE_VERIFICATIONS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not remove active verification:', e);
    }
  }

  /**
   * Fetch status of a verification from backend API
   */
  static async pollVerificationStatus(verificationId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/verifications/${verificationId}/status`);
    if (!res.ok) throw new Error(`Status poll failed: ${res.status}`);
    return res.json();
  }

  /**
   * Fetch full verification detail from backend API
   */
  static async fetchVerificationDetail(verificationId: string): Promise<AiVerificationRecord> {
    const res = await fetch(`${API_BASE}/verifications/${verificationId}`);
    if (!res.ok) throw new Error(`Detail fetch failed: ${res.status}`);
    const data = await res.json();
    return {
      ...data,
      original_image_url: data.original_image_url ? `${API_BASE}${data.original_image_url}` : '',
      annotated_image_url: data.annotated_image_url ? `${API_BASE}${data.annotated_image_url}` : '',
    };
  }

  /**
   * Fetch all completed verifications history from backend API
   */
  static async fetchVerifications(params?: {
    category?: string;
    status?: string;
    assessment?: string;
    search?: string;
  }): Promise<AiVerificationRecord[]> {
    try {
      const query = new URLSearchParams();
      if (params?.category && params.category !== 'all') query.append('category', params.category);
      if (params?.status && params.status !== 'all') query.append('status', params.status);
      if (params?.assessment && params.assessment !== 'all') query.append('assessment', params.assessment);
      if (params?.search) query.append('search', params.search);

      const url = `${API_BASE}/verifications${query.toString() ? `?${query.toString()}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch verifications: ${res.status}`);
      const data: any[] = await res.json();

      return data.map((item) => ({
        ...item,
        original_image_url: item.original_image_url ? `${API_BASE}${item.original_image_url}` : '',
        annotated_image_url: item.annotated_image_url ? `${API_BASE}${item.annotated_image_url}` : '',
      }));
    } catch (e) {
      console.warn('Error fetching verifications from backend, returning local cache:', e);
      return [];
    }
  }

  /**
   * Fetch registered models and benchmarks catalog
   */
  static async fetchModelsCatalog(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/models`);
      if (!res.ok) throw new Error('Failed to fetch models');
      return res.json();
    } catch {
      return [];
    }
  }

  /**
   * Fetch model readiness and health
   */
  static async fetchModelHealth(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/models/health`);
      if (!res.ok) throw new Error('Failed to fetch model health');
      return res.json();
    } catch {
      return null;
    }
  }

  /**
   * Legacy report list (for backward compatibility)
   */
  static getReports(): HazardUploadRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static saveReport(report: HazardUploadRecord): void {
    if (typeof window === 'undefined') return;
    try {
      const current = this.getReports();
      const updated = [report, ...current.filter((r) => r.id !== report.id)];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save report:', e);
    }
  }

  static toggleLike(reportId: string): HazardUploadRecord | null {
    if (typeof window === 'undefined') return null;
    try {
      const reports = this.getReports();
      const idx = reports.findIndex((r) => r.id === reportId);
      if (idx === -1) return null;
      const target = reports[idx];
      const newLiked = !target.liked_by_me;
      const updated: HazardUploadRecord = {
        ...target,
        liked_by_me: newLiked,
        likes_count: newLiked ? target.likes_count + 1 : Math.max(0, target.likes_count - 1),
      };
      reports[idx] = updated;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
      return updated;
    } catch {
      return null;
    }
  }

  static deleteReport(reportId: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const reports = this.getReports();
      const filtered = reports.filter((r) => r.id !== reportId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  }
}
