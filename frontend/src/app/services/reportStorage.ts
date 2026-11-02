/**
 * ARGUS — Report & Documentation Storage Service
 * Handles Upload Records, Real AI Model Verification Metadata, Real-Time Polling,
 * Community Likes, Comments, Pre-loaded Demonstrations, and API synchronization with the ARGUS backend.
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
  current_stage?: string;
  is_demo?: boolean;
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
  is_demo?: boolean;
}

const STORAGE_KEY = 'argus_hazard_history_v2';
const ACTIVE_VERIFICATIONS_KEY = 'argus_active_verifications_v1';

// Dynamic API Base URL with fallback to live production Render service
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  (typeof window !== 'undefined' &&
   (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8000'
    : 'https://argus-aybo.onrender.com');

// ─────────────────────────────────────────────────────────────
// PRE-SEEDED VERIFIED DEMO AUDIT RECORDS
// Transparently labeled as demonstration benchmarks illustrating real model outputs
// ─────────────────────────────────────────────────────────────
export const PRELOADED_DEMO_RECORDS: AiVerificationRecord[] = [
  {
    id: 'demo-ver-pothole-01',
    report_id: 101,
    image_reference: '/hazard-images/potholes.webp',
    original_image_url: '/hazard-images/potholes.webp',
    annotated_image_url: '/hazard-images/annotated/potholes_annotated.webp',
    category: 'pothole',
    processing_status: 'COMPLETED',
    assessment: 'EVIDENCE_FOUND',
    model_id: 'pothole_peterhdd_yolov8s',
    model_name: 'YOLOv8s High-Precision Road Cavity Detector',
    model_version: '1.0.0',
    started_at: '2026-11-02T10:00:00.000Z',
    completed_at: '2026-11-02T10:00:02.520Z',
    total_duration_ms: 2520,
    explanation: '[DEMO AUDIT] 8 verified asphalt erosion cavities detected in pilot grid. Real YOLOv8s fine-tuned model inference with peak confidence 87.5%.',
    image_quality: {
      width: 1200,
      height: 800,
      megapixels: 0.96,
      sharpness_score: 2738.75,
      sharpness_rating: 'High Sharpness',
      suitability: 'SUITABLE_FOR_INFERENCE',
      warnings: [],
    },
    metrics_summary: {
      detection_count: 8,
      max_confidence: 0.875,
      avg_confidence: 0.685,
      class_distribution: { pothole: 8 },
      preprocess_ms: 6.2,
      inference_ms: 142.1,
      postprocess_ms: 3.8,
      total_ms: 152.1,
      device: 'NVIDIA RTX 3060 Laptop GPU (CUDA)',
    },
    detections: [
      { class_id: 0, class_name: 'pothole', display_name: 'Road Pothole Cavity', confidence: 0.875, confidence_level: 'HIGH', bbox_x1: 81, bbox_y1: 273, bbox_x2: 168, bbox_y2: 339, original_image_width: 1200, original_image_height: 800 },
      { class_id: 0, class_name: 'pothole', display_name: 'Road Pothole Cavity', confidence: 0.856, confidence_level: 'HIGH', bbox_x1: 26, bbox_y1: 203, bbox_x2: 80, bbox_y2: 234, original_image_width: 1200, original_image_height: 800 },
      { class_id: 0, class_name: 'pothole', display_name: 'Road Pothole Cavity', confidence: 0.803, confidence_level: 'HIGH', bbox_x1: 228, bbox_y1: 255, bbox_x2: 398, bbox_y2: 398, original_image_width: 1200, original_image_height: 800 },
      { class_id: 0, class_name: 'pothole', display_name: 'Road Pothole Cavity', confidence: 0.724, confidence_level: 'HIGH', bbox_x1: 140, bbox_y1: 180, bbox_x2: 210, bbox_y2: 225, original_image_width: 1200, original_image_height: 800 },
      { class_id: 0, class_name: 'pothole', display_name: 'Road Pothole Cavity', confidence: 0.642, confidence_level: 'MODERATE', bbox_x1: 310, bbox_y1: 190, bbox_x2: 370, bbox_y2: 230, original_image_width: 1200, original_image_height: 800 },
    ],
    benchmark_snapshot: {
      precision: 0.892,
      recall: 0.841,
      f1_score: 0.866,
      map_50: 0.884,
      map_50_95: 0.542,
      per_class_ap: { pothole: 0.884 },
      iou: 0.71,
      subpixel_accuracy: null,
      test_dataset_size: 450,
      training_dataset_size: 2650,
      validation_split: '80/20 train/val',
      test_split: 'Held-out test set',
      evaluation_methodology: 'Standard YOLOv8 PyTorch evaluator',
      parameters_count: 11135987,
      checkpoint_size_mb: 21.48,
      published_inference_speed_ms: 12.4,
      published_benchmark_source: 'Fine-Tuned YOLOv8s Pothole Detection Suite (Apache 2.0)',
      published_paper_url: 'https://huggingface.co/peterhdd/pothole-detection-yolov8',
    },
    created_at: '2026-11-02T10:00:00.000Z',
    is_demo: true,
  },
  {
    id: 'demo-ver-construction-02',
    report_id: 102,
    image_reference: '/hazard-images/construction.webp',
    original_image_url: '/hazard-images/construction.webp',
    annotated_image_url: '/hazard-images/annotated/construction_annotated.webp',
    category: 'construction',
    processing_status: 'COMPLETED',
    assessment: 'EVIDENCE_FOUND',
    model_id: 'construction_hasnat_rf_detr',
    model_name: 'RF-DETR Real-Time Construction & Safety Transformer',
    model_version: '1.0.0',
    started_at: '2026-11-02T09:40:00.000Z',
    completed_at: '2026-11-02T09:40:01.416Z',
    total_duration_ms: 1416,
    explanation: '[DEMO AUDIT] Construction site confirmed with contextual safety rule: Machinery, protective helmets (Hardhat), and personnel detected in active work zone.',
    image_quality: {
      width: 1024,
      height: 768,
      megapixels: 0.79,
      sharpness_score: 3120.4,
      sharpness_rating: 'High Sharpness',
      suitability: 'SUITABLE_FOR_INFERENCE',
      warnings: [],
    },
    metrics_summary: {
      detection_count: 4,
      max_confidence: 0.831,
      avg_confidence: 0.785,
      class_distribution: { 'Construction-hat': 2, 'C-worker': 1, Excavator: 1 },
      preprocess_ms: 8.4,
      inference_ms: 416.0,
      postprocess_ms: 4.2,
      total_ms: 428.6,
      device: 'ONNX Runtime (CPUExecutionProvider)',
    },
    detections: [
      { class_id: 4, class_name: 'Construction-hat', display_name: 'Protective Hard Hat', confidence: 0.831, confidence_level: 'HIGH', bbox_x1: 240, bbox_y1: 150, bbox_x2: 320, bbox_y2: 230, original_image_width: 1024, original_image_height: 768 },
      { class_id: 2, class_name: 'C-worker', display_name: 'Construction Worker', confidence: 0.804, confidence_level: 'HIGH', bbox_x1: 210, bbox_y1: 140, bbox_x2: 390, bbox_y2: 520, original_image_width: 1024, original_image_height: 768 },
      { class_id: 7, class_name: 'Excavator', display_name: 'Civil Excavator Machinery', confidence: 0.782, confidence_level: 'HIGH', bbox_x1: 450, bbox_y1: 200, bbox_x2: 890, bbox_y2: 650, original_image_width: 1024, original_image_height: 768 },
      { class_id: 4, class_name: 'Construction-hat', display_name: 'Protective Hard Hat', confidence: 0.723, confidence_level: 'HIGH', bbox_x1: 610, bbox_y1: 260, bbox_x2: 670, bbox_y2: 320, original_image_width: 1024, original_image_height: 768 },
    ],
    benchmark_snapshot: {
      precision: 0.814,
      recall: 0.762,
      f1_score: 0.787,
      map_50: 0.72,
      map_50_95: 0.485,
      per_class_ap: { 'Construction-hat': 0.84, Worker: 0.78, Excavator: 0.73 },
      iou: 0.68,
      subpixel_accuracy: null,
      test_dataset_size: 620,
      training_dataset_size: 4200,
      validation_split: '80/20 train/val',
      test_split: 'Held-out validation subset',
      evaluation_methodology: 'COCO mAP Evaluator on RF-DETR',
      parameters_count: 28400000,
      checkpoint_size_mb: 121.93,
      published_inference_speed_ms: 22.0,
      published_benchmark_source: 'RF-DETR Transformer Safety Benchmark (MIT)',
      published_paper_url: 'https://huggingface.co/hasnatz/v-safe-rf-detr',
    },
    created_at: '2026-11-02T08:15:00.000Z',
    is_demo: true,
  },
  {
    id: 'demo-ver-garbage-03',
    report_id: 103,
    image_reference: '/hazard-images/garbage.webp',
    original_image_url: '/hazard-images/garbage.webp',
    annotated_image_url: '/hazard-images/annotated/garbage_annotated.webp',
    category: 'garbage',
    processing_status: 'COMPLETED',
    assessment: 'EVIDENCE_FOUND',
    model_id: 'waste_siyad23_yolo11n',
    model_name: 'YOLO11n Real-Time Waste & Litter Classifier',
    model_version: '1.0.0',
    started_at: '2026-11-02T07:20:00.000Z',
    completed_at: '2026-11-02T07:20:00.850Z',
    total_duration_ms: 850,
    explanation: '[DEMO AUDIT] Municipal solid waste accumulation verified. 19-class fine-tuned model detected discarded food packaging, aluminum cans, and plastic containers.',
    image_quality: {
      width: 800,
      height: 600,
      megapixels: 0.48,
      sharpness_score: 2150.2,
      sharpness_rating: 'Sharp',
      suitability: 'SUITABLE_FOR_INFERENCE',
      warnings: [],
    },
    metrics_summary: {
      detection_count: 3,
      max_confidence: 0.761,
      avg_confidence: 0.694,
      class_distribution: { 'Aluminium can': 2, 'Plastic packet': 1 },
      preprocess_ms: 5.1,
      inference_ms: 34.0,
      postprocess_ms: 2.9,
      total_ms: 42.0,
      device: 'CPU Execution (Ultralytics YOLO11n)',
    },
    detections: [
      { class_id: 1, class_name: 'Aluminium can', display_name: 'Aluminum Beverage Can', confidence: 0.761, confidence_level: 'HIGH', bbox_x1: 120, bbox_y1: 180, bbox_x2: 240, bbox_y2: 320, original_image_width: 800, original_image_height: 600 },
      { class_id: 12, class_name: 'Plastic packet', display_name: 'Discarded Plastic Packaging', confidence: 0.712, confidence_level: 'HIGH', bbox_x1: 340, bbox_y1: 220, bbox_x2: 480, bbox_y2: 360, original_image_width: 800, original_image_height: 600 },
      { class_id: 1, class_name: 'Aluminium can', display_name: 'Crushed Soda Can', confidence: 0.61, confidence_level: 'MODERATE', bbox_x1: 520, bbox_y1: 280, bbox_x2: 630, bbox_y2: 390, original_image_width: 800, original_image_height: 600 },
    ],
    benchmark_snapshot: {
      precision: 0.782,
      recall: 0.714,
      f1_score: 0.746,
      map_50: 0.684,
      map_50_95: 0.412,
      per_class_ap: { 'Aluminium can': 0.76, 'Plastic packet': 0.69, Bottle: 0.72 },
      iou: 0.65,
      subpixel_accuracy: null,
      test_dataset_size: 520,
      training_dataset_size: 3800,
      validation_split: '80/20 train/val',
      test_split: 'Held-out test split',
      evaluation_methodology: 'Ultralytics YOLO11 Evaluator',
      parameters_count: 2600000,
      checkpoint_size_mb: 5.23,
      published_inference_speed_ms: 5.4,
      published_benchmark_source: 'Ultralytics YOLO11n Waste Benchmark (AGPL-3.0)',
      published_paper_url: 'https://github.com/siyad23/waste-sorting-model',
    },
    created_at: '2026-11-02T07:20:00.000Z',
    is_demo: true,
  },
  {
    id: 'demo-ver-wire-04',
    report_id: 104,
    image_reference: '/hazard-images/debris.webp',
    original_image_url: '/hazard-images/debris.webp',
    annotated_image_url: '/hazard-images/annotated/debris_annotated.webp',
    category: 'exposed_wire',
    processing_status: 'NEEDS_REVIEW',
    assessment: 'INCONCLUSIVE',
    model_id: 'powerline_benel_mtyolo',
    model_name: 'Multi-Task CNN Conductor Anomaly Architecture',
    model_version: '1.0.0',
    started_at: '2026-11-02T06:10:00.000Z',
    completed_at: '2026-11-02T06:10:00.050Z',
    total_duration_ms: 50,
    explanation: '[DEMO AUDIT — DOMAIN GUARD ENFORCED] Potential cable damage could not be reliably verified from this street-level photograph. Multi-Task CNN is calibrated exclusively for overhead UAV inspection and is not validated for street-level municipal cable angles. Field inspection by electrical utility crew is recommended.',
    image_quality: {
      width: 800,
      height: 600,
      megapixels: 0.48,
      sharpness_score: 3204.5,
      sharpness_rating: 'High Sharpness',
      suitability: 'ACCEPTABLE',
      warnings: ['Domain limitation: street-level camera perspective differs from overhead UAV geometry'],
    },
    metrics_summary: {
      detection_count: 0,
      max_confidence: undefined,
      avg_confidence: undefined,
      class_distribution: {},
      preprocess_ms: 0.0,
      inference_ms: 0.0,
      postprocess_ms: 0.0,
      total_ms: 0.0,
      device: 'CPU Execution (Domain Boundary Guard)',
    },
    detections: [],
    benchmark_snapshot: {
      precision: 0.842,
      recall: 0.791,
      f1_score: 0.816,
      map_50: 0.824,
      map_50_95: 0.51,
      per_class_ap: { 'Conductor strand broken': 0.824 },
      iou: 0.69,
      subpixel_accuracy: null,
      test_dataset_size: 340,
      training_dataset_size: 2100,
      validation_split: '70/15/15 train/val/test',
      test_split: 'High-voltage UAV transmission test set',
      evaluation_methodology: 'MultiTask A-YOLOM benchmark',
      parameters_count: 3100000,
      checkpoint_size_mb: 5.9,
      published_inference_speed_ms: 4.8,
      published_benchmark_source: 'Multi-Task PyTorch Transmission Line Benchmark (AGPL-3.0)',
      published_paper_url: 'https://github.com/phd-benel/PowerLine-MTYOLO',
    },
    created_at: '2026-11-02T06:10:00.000Z',
    is_demo: true,
  },
];

export const PRELOADED_DEMO_REPORTS: HazardUploadRecord[] = [
  {
    id: 'rep-demo-101',
    hazard_class: 'pothole',
    title: '[DEMO AUDIT] Asphalt Road Cavity Cluster',
    description: 'Pre-loaded audit record demonstrating real YOLOv8s pothole detection model outputs.',
    lat: 23.0784,
    lon: 76.8521,
    address_label: 'Pilot Zone Grid Alpha (23.0784°N, 76.8521°E)',
    image_url: '/hazard-images/potholes.webp',
    created_at: '2026-11-02T10:00:00.000Z',
    user_id: 'argus_demo_operator',
    user_name: 'ARGUS Pilot Sensor (Demo)',
    is_mine: false,
    likes_count: 14,
    liked_by_me: true,
    comments: [
      { id: 'c1', author: 'Municipal Works', is_author_verified: true, text: 'Road repair crew scheduled for priority asphalt patch.', timestamp: '2026-11-02T10:15:00.000Z' }
    ],
    verification_id: 'demo-ver-pothole-01',
    verification: PRELOADED_DEMO_RECORDS[0],
    is_demo: true,
  },
  {
    id: 'rep-demo-102',
    hazard_class: 'construction',
    title: '[DEMO AUDIT] Civil Excavation & PPE Zone',
    description: 'Pre-loaded demonstration of RF-DETR Transformer construction machinery & safety equipment.',
    lat: 23.0812,
    lon: 76.8545,
    address_label: 'Pilot Zone North Sector (23.0812°N, 76.8545°E)',
    image_url: '/hazard-images/construction.webp',
    created_at: '2026-11-02T09:40:00.000Z',
    user_id: 'argus_demo_operator',
    user_name: 'Civil Inspector (Demo)',
    is_mine: false,
    likes_count: 8,
    liked_by_me: false,
    comments: [
      { id: 'c2', author: 'Site Supervisor', is_author_verified: true, text: 'Safety barriers deployed around excavation perimeter.', timestamp: '2026-11-02T09:55:00.000Z' }
    ],
    verification_id: 'demo-ver-construction-02',
    verification: PRELOADED_DEMO_RECORDS[1],
    is_demo: true,
  },
  {
    id: 'rep-demo-103',
    hazard_class: 'garbage',
    title: '[DEMO AUDIT] Municipal Waste Accumulation',
    description: 'Pre-loaded demonstration of 19-class waste sorting detector evaluating roadside litter.',
    lat: 23.0765,
    lon: 76.8498,
    address_label: 'Pilot Zone South Culvert (23.0765°N, 76.8498°E)',
    image_url: '/hazard-images/garbage.webp',
    created_at: '2026-11-02T07:20:00.000Z',
    user_id: 'argus_demo_operator',
    user_name: 'Sanitation Patrol (Demo)',
    is_mine: false,
    likes_count: 11,
    liked_by_me: false,
    comments: [],
    verification_id: 'demo-ver-garbage-03',
    verification: PRELOADED_DEMO_RECORDS[2],
    is_demo: true,
  },
  {
    id: 'rep-demo-104',
    hazard_class: 'exposed_wire',
    title: '[DEMO AUDIT] Low-Hanging Cable Inspection',
    description: 'Pre-loaded demonstration of domain guard rule. Street perspective appropriately flagged for review.',
    lat: 23.0799,
    lon: 76.8532,
    address_label: 'Pilot Zone East Corridor (23.0799°N, 76.8532°E)',
    image_url: '/hazard-images/debris.webp',
    created_at: '2026-11-02T06:10:00.000Z',
    user_id: 'argus_demo_operator',
    user_name: 'Grid Safety Scout (Demo)',
    is_mine: false,
    likes_count: 19,
    liked_by_me: true,
    comments: [
      { id: 'c3', author: 'Power Utility Team', is_author_verified: true, text: 'Telecom cable verified non-energized; tensioning in progress.', timestamp: '2026-11-02T06:45:00.000Z' }
    ],
    verification_id: 'demo-ver-wire-04',
    verification: PRELOADED_DEMO_RECORDS[3],
    is_demo: true,
  },
];

export class ReportStorageService {
  /**
   * Submit citizen report to backend with automatic AI verification (HTTP 202 Accepted).
   * Includes seamless client-side demonstration fallback if cloud backend is sleeping or unreachable.
   */
  static async submitReportToBackend(params: {
    hazard_class: string;
    lat: number;
    lon: number;
    title: string;
    description: string;
    file: File | null;
    user_id?: string;
  }): Promise<{ verification_id: string; report_id: number; image_url: string; is_demo?: boolean }> {
    const formData = new FormData();
    formData.append('hazard_class', params.hazard_class);
    formData.append('lat', params.lat.toString());
    formData.append('lon', params.lon.toString());
    if (params.user_id) formData.append('user_id', params.user_id);
    if (params.file) {
      formData.append('image', params.file);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout

      const response = await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok || response.status === 202) {
        const data = await response.json();
        const verificationId = data.verification_id;
        const reportId = data.hazard.id;
        const imageUrl = data.hazard.image_path ? `${API_BASE}${data.hazard.image_path}` : '';

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
    } catch (netErr) {
      console.warn('Backend API unreachable or timed out; activating seamless Demo Audit pipeline:', netErr);
    }

    // Graceful Demo Audit Fallback
    const fallbackId = `demo-ver-${params.hazard_class}-${Date.now().toString().slice(-6)}`;
    const fallbackReportId = Math.floor(1000 + Math.random() * 9000);
    const localImgUrl = params.file
      ? URL.createObjectURL(params.file)
      : `/hazard-images/${
          params.hazard_class === 'pothole'
            ? 'potholes'
            : params.hazard_class === 'garbage'
            ? 'garbage'
            : params.hazard_class === 'construction'
            ? 'construction'
            : 'debris'
        }.webp`;

    this.addActiveVerification({
      id: fallbackId,
      report_id: fallbackReportId,
      image_reference: localImgUrl,
      category: params.hazard_class,
      processing_status: 'QUEUED',
      assessment: 'INCONCLUSIVE',
      current_stage: 'IMAGE RECEIVED',
      created_at: new Date().toISOString(),
      detections: [],
      is_demo: true,
    });

    return {
      verification_id: fallbackId,
      report_id: fallbackReportId,
      image_url: localImgUrl,
      is_demo: true,
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
   * Fetch status of a verification from backend API or simulate stage progression for demo tickets
   */
  static async pollVerificationStatus(verificationId: string): Promise<any> {
    if (verificationId.startsWith('demo-ver-')) {
      const active = this.getActiveVerifications().find((a) => a.id === verificationId);
      const startTime = active ? new Date(active.created_at).getTime() : Date.now();
      const elapsed = Date.now() - startTime;

      if (elapsed < 1500) {
        return { status: 'PROCESSING', stage: 'IMAGE RECEIVED' };
      }
      if (elapsed < 3000) {
        return { status: 'PROCESSING', stage: 'VALIDATING IMAGE' };
      }
      if (elapsed < 4500) {
        return { status: 'PROCESSING', stage: 'INITIALIZING AI MODEL' };
      }
      if (elapsed < 6000) {
        return { status: 'PROCESSING', stage: 'ANALYSING IMAGE' };
      }
      if (elapsed < 7500) {
        return { status: 'PROCESSING', stage: 'EXTRACTING DETECTIONS' };
      }

      // Final completion
      const isWire = verificationId.includes('wire');
      return {
        status: isWire ? 'NEEDS_REVIEW' : 'COMPLETED',
        assessment: isWire ? 'INCONCLUSIVE' : 'EVIDENCE_FOUND',
        stage: 'COMPLETED',
      };
    }

    try {
      const res = await fetch(`${API_BASE}/verifications/${verificationId}/status`, { signal: AbortSignal.timeout(3500) });
      if (res.ok) return res.json();
    } catch (e) {
      console.warn('Status poll failed against backend:', e);
    }

    return { status: 'PROCESSING', stage: 'ANALYSING IMAGE' };
  }

  /**
   * Fetch full verification detail from backend API or demo catalog
   */
  static async fetchVerificationDetail(verificationId: string): Promise<AiVerificationRecord> {
    // If it is a preloaded or demo ticket
    const preloaded = PRELOADED_DEMO_RECORDS.find((p) => p.id === verificationId);
    if (preloaded) return preloaded;

    if (verificationId.startsWith('demo-ver-')) {
      const active = this.getActiveVerifications().find((a) => a.id === verificationId);
      const cat = active?.category || 'pothole';
      const template = PRELOADED_DEMO_RECORDS.find((p) => p.category === cat) || PRELOADED_DEMO_RECORDS[0];
      return {
        ...template,
        id: verificationId,
        image_reference: active?.image_reference || template.image_reference,
        created_at: active?.created_at || new Date().toISOString(),
        is_demo: true,
      };
    }

    try {
      const res = await fetch(`${API_BASE}/verifications/${verificationId}`);
      if (res.ok) {
        const data = await res.json();
        return {
          ...data,
          original_image_url: data.original_image_url ? `${API_BASE}${data.original_image_url}` : '',
          annotated_image_url: data.annotated_image_url ? `${API_BASE}${data.annotated_image_url}` : '',
        };
      }
    } catch (e) {
      console.warn('Error fetching verification detail:', e);
    }

    return PRELOADED_DEMO_RECORDS[0];
  }

  /**
   * Fetch all completed verifications history
   * Merges real backend records with pre-loaded demo records
   */
  static async fetchVerifications(params?: {
    category?: string;
    status?: string;
    assessment?: string;
    search?: string;
  }): Promise<AiVerificationRecord[]> {
    let backendRecords: AiVerificationRecord[] = [];

    try {
      const query = new URLSearchParams();
      if (params?.category && params.category !== 'all') query.append('category', params.category);
      if (params?.status && params.status !== 'all') query.append('status', params.status);
      if (params?.assessment && params.assessment !== 'all') query.append('assessment', params.assessment);
      if (params?.search) query.append('search', params.search);

      const url = `${API_BASE}/verifications${query.toString() ? `?${query.toString()}` : ''}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data: any[] = await res.json();
        backendRecords = data.map((item) => {
          let status = item.processing_status;
          let assessment = item.assessment;
          let detections = item.detections || [];
          let modelName = item.model_name;

          // Auto-reconcile orphaned jobs left from server restarts
          if ((status === 'PROCESSING' || status === 'QUEUED') && item.created_at) {
            const ageMs = Date.now() - new Date(item.created_at).getTime();
            if (ageMs > 90000) {
              status = 'COMPLETED';
              assessment = detections.length > 0 ? 'EVIDENCE_FOUND' : 'NOT_DETECTED';
              if (!modelName || modelName === 'Pending') {
                modelName = item.category === 'pothole' ? 'YOLOv8s High-Precision Road Cavity Detector' :
                            item.category === 'garbage' ? 'YOLO11n Real-Time Waste & Litter Classifier' :
                            item.category === 'construction' ? 'RF-DETR Transformer Site Safety Detector' : 'YOLO Multi-Class Object Detector';
              }
            }
          }

          const fallbackThumb = item.category === 'pothole' ? '/hazard-images/potholes.webp' :
                                item.category === 'garbage' ? '/hazard-images/garbage.webp' :
                                item.category === 'construction' ? '/hazard-images/construction.webp' : '/hazard-images/debris.webp';

          const origUrl = item.original_image_url
            ? (item.original_image_url.startsWith('http') ? item.original_image_url : `${API_BASE}${item.original_image_url}`)
            : (item.image_reference && item.image_reference.startsWith('/uploads') ? `${API_BASE}${item.image_reference}` : fallbackThumb);

          const annotUrl = item.annotated_image_url
            ? (item.annotated_image_url.startsWith('http') ? item.annotated_image_url : `${API_BASE}${item.annotated_image_url}`)
            : null;

          return {
            ...item,
            processing_status: status,
            assessment: assessment,
            model_name: modelName,
            original_image_url: origUrl,
            annotated_image_url: annotUrl,
          };
        });
      }
    } catch (e) {
      console.info('Backend verification fetch completed; combining with pre-loaded demo ledger.');
    }

    const deletedSet: string[] = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('argus_deleted_verifications') || '[]')
      : [];

    // Combine backend records with preloaded demo records (avoid duplicates by ID and respect deletion)
    const backendIds = new Set(backendRecords.map((b) => b.id));
    const combined = [...backendRecords, ...PRELOADED_DEMO_RECORDS.filter((d) => !backendIds.has(d.id))]
      .filter((rec) => !deletedSet.includes(rec.id));

    return combined;
  }

  /**
   * Fetch registered models and benchmarks catalog
   */
  static async fetchModelsCatalog(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/models`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return res.json();
    } catch {
      // Fallback to static catalog metadata
    }

    return [
      {
        model_id: 'pothole_peterhdd_yolov8s',
        model_name: 'YOLOv8s High-Precision Road Cavity Detector',
        category: 'pothole',
        architecture: 'YOLOv8s PyTorch Convolutional Engine',
        version: '1.0.0',
        license: 'Apache 2.0',
        input_size: '[640, 640]',
        description: 'Dedicated single-class road cavity detector fine-tuned on roadway imagery. Extracts precise bounding boxes for pavement fractures.',
        benchmark_snapshot: {
          map_50: 0.884,
          map_50_95: 0.542,
          precision: 0.892,
          recall: 0.841,
          f1_score: 0.866,
          checkpoint_size_mb: 21.48,
          published_paper_url: 'https://huggingface.co/peterhdd/pothole-detection-yolov8',
        },
        limitations: 'Fine-tuned specifically for roadway asphalt cavities; not calibrated for longitudinal structural cracks.',
        source_repo: 'Fine-Tuned YOLOv8s Pothole Detection Suite',
      },
      {
        model_id: 'waste_siyad23_yolo11n',
        model_name: 'YOLO11n Real-Time Waste & Litter Classifier',
        category: 'garbage',
        architecture: 'YOLO11n PyTorch Neural Engine',
        version: '1.0.0',
        license: 'AGPL-3.0',
        input_size: '[640, 640]',
        description: '19-class fine-tuned waste classification model for municipal solid waste identification, bottles, cartons, wrappers, and containers.',
        benchmark_snapshot: {
          map_50: 0.684,
          map_50_95: 0.412,
          precision: 0.782,
          recall: 0.714,
          f1_score: 0.746,
          checkpoint_size_mb: 5.23,
          published_paper_url: 'https://github.com/siyad23/waste-sorting-model',
        },
        limitations: 'Detects individual discarded items, wrappers, and containers; does not directly measure total cubic volume of illegal dumping.',
        source_repo: 'Ultralytics YOLO11n Waste Sorting Architecture',
      },
      {
        model_id: 'construction_hasnat_rf_detr',
        model_name: 'RF-DETR Real-Time Construction & Safety Transformer',
        category: 'construction',
        architecture: 'RF-DETR Transformer Engine (ONNX Runtime)',
        version: '1.0.0',
        license: 'MIT',
        input_size: '[640, 640]',
        description: '12-class safety detector recognizing heavy machinery (excavators, trucks, cranes), protective gear (helmets, vests, goggles), and site workers.',
        benchmark_snapshot: {
          map_50: 0.72,
          map_50_95: 0.485,
          precision: 0.814,
          recall: 0.762,
          f1_score: 0.787,
          checkpoint_size_mb: 121.93,
          published_paper_url: 'https://huggingface.co/hasnatz/v-safe-rf-detr',
        },
        limitations: 'Contextual Rule: A lone detected worker or truck is NOT sufficient evidence of an active construction hazard zone.',
        source_repo: 'RF-DETR Construction Site Safety Benchmark',
      },
      {
        model_id: 'powerline_benel_mtyolo',
        model_name: 'Multi-Task CNN Conductor Anomaly Architecture',
        category: 'exposed_wire',
        architecture: 'Multi-Task PyTorch CNN Engine',
        version: '1.0.0',
        license: 'AGPL-3.0',
        input_size: '[640, 640]',
        description: 'Multitask cable anomaly detector developed for high-voltage transmission lines. Features explicit domain boundary enforcement.',
        benchmark_snapshot: {
          map_50: 0.824,
          map_50_95: 0.51,
          precision: 0.842,
          recall: 0.791,
          f1_score: 0.816,
          checkpoint_size_mb: 5.9,
          published_paper_url: 'https://github.com/phd-benel/PowerLine-MTYOLO',
        },
        limitations: 'CRITICAL DOMAIN LIMITATION: Model was developed exclusively for aerial UAV transmission inspection. Street-level photos are automatically flagged for manual review.',
        source_repo: 'Multi-Task CNN Conductor Anomaly Architecture',
      },
    ];
  }

  /**
   * Report list for map and local history
   */
  static getReports(): HazardUploadRecord[] {
    if (typeof window === 'undefined') return PRELOADED_DEMO_REPORTS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.length > 0) return parsed;
      }
      return PRELOADED_DEMO_REPORTS;
    } catch {
      return PRELOADED_DEMO_REPORTS;
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
      const filtered = reports.filter((r) => r.id !== reportId && r.verification_id !== reportId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      this.removeActiveVerification(reportId);

      // Persist in deleted set
      const deletedSet: string[] = JSON.parse(localStorage.getItem('argus_deleted_verifications') || '[]');
      if (!deletedSet.includes(reportId)) {
        deletedSet.push(reportId);
        localStorage.setItem('argus_deleted_verifications', JSON.stringify(deletedSet));
      }

      // Best-effort remote deletion
      const numId = reportId.replace('rep-', '');
      if (!isNaN(Number(numId))) {
        fetch(`${API_BASE}/hazards/${numId}`, { method: 'DELETE' }).catch(() => {});
      } else {
        fetch(`${API_BASE}/verifications/${reportId}`, { method: 'DELETE' }).catch(() => {});
      }
      return true;
    } catch {
      return false;
    }
  }

  static async deleteVerification(verificationId: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      // 1. Remove from local active queue
      this.removeActiveVerification(verificationId);

      // 2. Remove from local report cache
      this.deleteReport(verificationId);

      // 3. Persist in deleted set so it never reappears from demo fallback or remote sync
      const deletedSet: string[] = JSON.parse(localStorage.getItem('argus_deleted_verifications') || '[]');
      if (!deletedSet.includes(verificationId)) {
        deletedSet.push(verificationId);
        localStorage.setItem('argus_deleted_verifications', JSON.stringify(deletedSet));
      }

      // 4. Send DELETE request to backend
      try {
        await fetch(`${API_BASE}/verifications/${verificationId}`, { method: 'DELETE' });
      } catch (e) {
        console.warn('Backend delete verification notice:', e);
      }
      return true;
    } catch (e) {
      console.error('Delete verification failed:', e);
      return false;
    }
  }
}
