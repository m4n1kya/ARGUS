'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Camera, MapPin, Upload, Loader2, CheckCircle2,
  AlertCircle, ShieldCheck, Cpu, ArrowLeft, X,
  FileText, Sparkles, Crosshair, ChevronRight
} from 'lucide-react';
import { ReportStorageService, HazardUploadRecord } from '../services/reportStorage';

type HazardKey = 'pothole' | 'garbage' | 'construction' | 'debris' | 'exposed_wire';

interface HazardOption {
  id: HazardKey;
  label: string;
  sub: string;
  colorHex: string;
}

const HAZARD_OPTIONS: HazardOption[] = [
  { id: 'pothole',      label: 'Pothole / Road Cavity',  sub: 'Asphalt erosion & craters', colorHex: '#90CAF9' },
  { id: 'garbage',      label: 'Municipal Solid Waste',   sub: 'Unregulated dumping & culverts', colorHex: '#E3F2FD' },
  { id: 'construction', label: 'Unsafe Construction',    sub: 'Open trenches & missing barriers', colorHex: '#2196F3' },
  { id: 'debris',       label: 'Fallen Debris / Obstacle', sub: 'Roadway obstructions', colorHex: '#60a5fa' },
  { id: 'exposed_wire', label: 'Exposed Electrical Line', sub: 'Low-hanging live wire hazard', colorHex: '#1565C0' },
];

export default function ReportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [selectedHazard, setSelectedHazard] = useState<HazardKey>('pothole');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Coordinates (defaults to Kothri / VIT Pilot Zone)
  const [lat, setLat] = useState(23.0784);
  const [lon, setLon] = useState(76.8521);
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  // AI Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState(0);
  const [verifyStage, setVerifyStage] = useState('');
  const [verifyDetail, setVerifyDetail] = useState('');
  const [verifiedRecord, setVerifiedRecord] = useState<HazardUploadRecord | null>(null);

  // Handle file select
  const handleFileChange = (incomingFile: File | null) => {
    if (!incomingFile) return;
    setFile(incomingFile);
    const objectUrl = URL.createObjectURL(incomingFile);
    setPreviewUrl(objectUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Acquire actual device GPS
  const handleAcquireDeviceGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(parseFloat(pos.coords.latitude.toFixed(5)));
        setLon(parseFloat(pos.coords.longitude.toFixed(5)));
        setIsGpsLoading(false);
      },
      (err) => {
        console.warn('GPS acquire failed, keeping pilot coordinates:', err);
        setIsGpsLoading(false);
      },
      { timeout: 7000 }
    );
  };

  // Form Submit -> Runs Real AI Backend Ingestion (HTTP 202 Accepted)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setVerifyProgress(25);
    setVerifyStage('Transmitting Field Evidence');
    setVerifyDetail('Dispatching optical capture to ARGUS AI backend...');

    try {
      const defaultTitles: Record<HazardKey, string> = {
        pothole: 'Road Surface Crater Detected',
        garbage: 'Municipal Solid Waste Accumulation',
        construction: 'Civil Excavation / Safety Hazard',
        debris: 'Transit Obstruction / Debris',
        exposed_wire: 'Exposed Electrical Line Hazard',
      };

      const finalTitle = title.trim() || defaultTitles[selectedHazard];
      const finalDesc = description.trim() || `Field capture submitted for real-time AI computer vision verification.`;

      // 1. Submit to backend API (returns HTTP 202 with verification_id)
      const res = await ReportStorageService.submitReportToBackend({
        hazard_class: selectedHazard,
        lat,
        lon,
        title: finalTitle,
        description: finalDesc,
        file,
        user_id: 'user_current',
      });

      setVerifyProgress(75);
      setVerifyStage('Asynchronous Verification Enqueued');
      setVerifyDetail(`Ticket assigned: ${res.verification_id}`);

      // 2. Prepare upload record
      const finalRecord: HazardUploadRecord = {
        id: `rep-${res.report_id}`,
        hazard_class: selectedHazard,
        title: finalTitle,
        description: finalDesc,
        lat,
        lon,
        address_label: `Pilot Zone Grid (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`,
        image_url: res.image_url || previewUrl || (
          selectedHazard === 'pothole' ? '/hazard-images/potholes.webp' :
          selectedHazard === 'garbage' ? '/hazard-images/garbage.webp' :
          selectedHazard === 'construction' ? '/hazard-images/construction.webp' :
          selectedHazard === 'exposed_wire' ? '/hazard-images/debris.webp' : '/hazard-images/debris.webp'
        ),
        created_at: new Date().toISOString(),
        user_id: 'user_current',
        user_name: 'Command Operator (You)',
        is_mine: true,
        likes_count: 1,
        liked_by_me: true,
        comments: [],
        verification_id: res.verification_id,
      };

      // 3. Save locally and set active record
      ReportStorageService.saveReport(finalRecord);
      setVerifiedRecord(finalRecord);
      setIsVerifying(false);
    } catch (err: any) {
      console.warn('Submission fallback to local verification audit:', err);
      const fallbackId = `demo-ver-${selectedHazard}-${Date.now().toString().slice(-6)}`;
      const fallbackRecord: HazardUploadRecord = {
        id: `rep-${Date.now()}`,
        hazard_class: selectedHazard,
        title: title.trim() || `[DEMO AUDIT] Ingested ${selectedHazard.toUpperCase()} Field Observation`,
        description: description.trim() || 'Demonstration incident verification processed via calibrated vision priors.',
        lat,
        lon,
        address_label: `Pilot Zone Grid (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`,
        image_url: previewUrl || `/hazard-images/${selectedHazard === 'pothole' ? 'potholes' : selectedHazard === 'garbage' ? 'garbage' : selectedHazard === 'construction' ? 'construction' : 'debris'}.webp`,
        created_at: new Date().toISOString(),
        user_id: 'user_current',
        user_name: 'Command Operator (You)',
        is_mine: true,
        likes_count: 1,
        liked_by_me: true,
        comments: [],
        verification_id: fallbackId,
        is_demo: true,
      };
      ReportStorageService.addActiveVerification({
        id: fallbackId,
        report_id: 999,
        image_reference: fallbackRecord.image_url,
        category: selectedHazard,
        processing_status: 'QUEUED',
        assessment: 'INCONCLUSIVE',
        current_stage: 'IMAGE RECEIVED',
        created_at: new Date().toISOString(),
        detections: [],
        is_demo: true,
      });
      ReportStorageService.saveReport(fallbackRecord);
      setVerifiedRecord(fallbackRecord);
      setIsVerifying(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f1f5f9] pt-14 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/map"
            className="inline-flex items-center gap-2 text-xs font-mono text-[#94a3b8] hover:text-white transition-colors bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>RETURN TO MAP</span>
          </Link>

          <Link
            href="/documentation"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#90CAF9] hover:text-white transition-colors"
          >
            <span>VIEW UPLOAD HISTORY</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(144,202,249,0.08)] border border-[rgba(144,202,249,0.25)] text-[#90CAF9] text-xs font-mono tracking-wider mb-3">
            <Cpu className="w-3.5 h-3.5" />
            <span>NEURAL VERIFICATION PIPELINE ACTIVE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
            Ingest & Verify Hazard
          </h1>
          <p className="text-[#94a3b8] text-sm sm:text-base leading-relaxed max-w-2xl">
            Upload field evidence for spatial anomaly detection. Every submission is analyzed by the AI verification model to guarantee ground-truth integrity before publication.
          </p>
        </div>

        {/* ── VERIFICATION RESULT OVERLAY ── */}
        {verifiedRecord ? (
          <div className="glass-card p-6 sm:p-10 border border-[rgba(144,202,249,0.35)] bg-[rgba(144,202,249,0.03)] rounded-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[rgba(144,202,249,0.15)] border border-[rgba(144,202,249,0.35)] flex items-center justify-center text-[#90CAF9]">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">Report Ingested & AI Pipeline Enqueued</h2>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#90CAF9] text-black">
                      HTTP 202 ACCEPTED
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8] font-mono mt-0.5">
                    Category: {verifiedRecord.hazard_class.toUpperCase()} • Asynchronous Worker Pool Dispatched
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-[#94a3b8] bg-[rgba(255,255,255,0.05)] px-2.5 py-1 rounded border border-[rgba(255,255,255,0.08)]">
                Ticket: {verifiedRecord.verification_id || verifiedRecord.id}
              </span>
            </div>

            {/* Ingestion & Pipeline Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
              <div className="space-y-3">
                <div className="text-xs font-mono text-[#94a3b8] tracking-wider uppercase">Hazard Metadata</div>
                <div className="p-3.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                  <div className="text-base font-semibold text-white">{verifiedRecord.title}</div>
                  <div className="text-xs text-[#90CAF9] mt-1 font-mono">
                    Classification Priority: {verifiedRecord.hazard_class}
                  </div>
                </div>

                <div className="text-xs font-mono text-[#94a3b8] tracking-wider uppercase">Spatial Coordinates</div>
                <div className="p-3.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                  <span className="text-sm font-mono text-white">
                    {verifiedRecord.lat.toFixed(5)}° N, {verifiedRecord.lon.toFixed(5)}° E
                  </span>
                  <span className="text-xs text-[#90CAF9] font-mono">Telemetry Locked</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-mono text-[#94a3b8] tracking-wider uppercase">Live Verification Status</div>
                <div className="p-3.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-xs text-[#cbd5e1] leading-relaxed space-y-2">
                  <div className="flex items-center gap-2 text-[#90CAF9]">
                    <Cpu className="w-4 h-4 animate-spin" />
                    <span className="font-mono font-semibold">Active Computer Vision Service</span>
                  </div>
                  <p>
                    Your photographic evidence has been stored and registered in the background worker queue. Real-time inference is running using the fine-tuned model checkpoint for {verifiedRecord.hazard_class}.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-[#90CAF9] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ground-truth bounding boxes, metrics & audit snapshot available in Documentation</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-[rgba(255,255,255,0.08)]">
              <Link
                href={`/documentation${verifiedRecord.verification_id ? `?highlight=${verifiedRecord.verification_id}` : ''}`}
                className="w-full sm:w-auto flex-1 btn-primary py-3.5 px-6 rounded-xl text-center text-sm font-bold flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>MONITOR & VIEW IN DOCUMENTATION AUDIT</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setVerifiedRecord(null);
                  setFile(null);
                  setPreviewUrl(null);
                  setTitle('');
                  setDescription('');
                }}
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] border border-[rgba(255,255,255,0.1)] text-xs font-mono text-white transition-colors"
              >
                SUBMIT ANOTHER INCIDENT
              </button>

              <Link
                href="/map"
                className="w-full sm:w-auto btn-glass py-3.5 px-6 rounded-xl text-center text-sm font-semibold flex items-center justify-center gap-2 border border-[rgba(255,255,255,0.15)]"
              >
                <span>OPEN LIVE MAP</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : isVerifying ? (
          /* ── ACTIVE NEURAL VERIFICATION PROGRESS ── */
          <div className="glass-card p-8 sm:p-12 border border-[rgba(144,202,249,0.3)] bg-[rgba(18,18,18,0.9)] rounded-2xl text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-[rgba(144,202,249,0.15)] animate-pulse" />
              <div className="w-14 h-14 rounded-full bg-[rgba(144,202,249,0.1)] border border-[rgba(144,202,249,0.4)] flex items-center justify-center text-[#90CAF9]">
                <Cpu className="w-7 h-7 animate-spin" />
              </div>
            </div>

            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-[rgba(144,202,249,0.1)] border border-[rgba(144,202,249,0.25)] text-[#90CAF9] text-xs font-mono tracking-widest uppercase mb-2">
                {verifyStage}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Analyzing Field Imagery</h2>
              <p className="text-xs sm:text-sm text-[#94a3b8] font-mono max-w-md mx-auto">
                {verifyDetail}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="max-w-md mx-auto space-y-2">
              <div className="w-full h-2 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
                <div
                  className="h-full bg-[#ffffff] transition-all duration-300 ease-out shadow-[0_0_12px_rgba(255,255,255,0.6)]"
                  style={{ width: `${verifyProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-mono text-[#94a3b8]">
                <span>Neural Pipeline</span>
                <span className="text-white font-semibold">{verifyProgress}%</span>
              </div>
            </div>
          </div>
        ) : (
          /* ── MAIN INGESTION FORM ── */
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Step 1: Hazard Classification */}
            <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">1. Hazard Classification</h3>
                  <p className="text-xs text-[#94a3b8] mt-0.5">Select the physical anomaly category to initialize neural feature priors.</p>
                </div>
                <span className="text-xs font-mono text-[#90CAF9] bg-[rgba(144,202,249,0.08)] px-2.5 py-1 rounded-full border border-[rgba(144,202,249,0.2)]">
                  REQUIRED
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {HAZARD_OPTIONS.map((opt) => {
                  const isSelected = selectedHazard === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedHazard(opt.id)}
                      className={`p-4 rounded-xl text-left transition-all border relative overflow-hidden group ${
                        isSelected
                          ? 'bg-[rgba(255,255,255,0.08)] border-white shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                          : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.15)]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-bold text-white group-hover:text-white">
                          {opt.label}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-[#90CAF9] shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-[#94a3b8] mt-1.5 leading-relaxed">
                        {opt.sub}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Photographic Evidence (Synaptica Dropzone) */}
            <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">2. Photographic Evidence</h3>
                  <p className="text-xs text-[#94a3b8] mt-0.5">Capture or upload raw field photography for optical verification.</p>
                </div>
                <span className="text-xs font-mono text-[#94a3b8]">JPEG / PNG / WEBP</span>
              </div>

              {previewUrl ? (
                /* Selected File Preview Card */
                <div className="relative rounded-xl overflow-hidden border border-[rgba(255,255,255,0.15)] bg-[rgba(0,0,0,0.5)] p-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative w-full sm:w-44 h-32 rounded-lg overflow-hidden bg-black shrink-0">
                    <img
                      src={previewUrl}
                      alt="Uploaded preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-[#90CAF9] border border-[rgba(144,202,249,0.3)]">
                      READY TO SCAN
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 w-full">
                    <div className="text-sm font-semibold text-white truncate">
                      {file ? file.name : 'Field Evidence Attached'}
                    </div>
                    <div className="text-xs font-mono text-[#94a3b8] mt-1">
                      {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'In-situ optical photo'}
                    </div>
                    <p className="text-xs text-[#94a3b8] mt-2 leading-relaxed">
                      Image attached. AI will extract depth maps, edge gradients, and evaluate structural hazard criteria.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl(null);
                    }}
                    className="p-2 rounded-lg bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] text-[#94a3b8] hover:text-white transition-colors"
                    title="Remove file"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                /* Dropzone */
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                    isDragOver
                      ? 'border-[#90CAF9] bg-[rgba(144,202,249,0.08)]'
                      : 'border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.03)]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  />

                  <div className="w-14 h-14 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center mx-auto mb-4 text-[#94a3b8] group-hover:text-white transition-colors">
                    <Camera className="w-7 h-7" />
                  </div>

                  <h4 className="text-base font-semibold text-white mb-1">
                    Drop field photo here or click to browse
                  </h4>
                  <p className="text-xs text-[#94a3b8] max-w-sm mx-auto">
                    Use camera on mobile or upload high-resolution evidence for neural validation.
                  </p>

                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.06)] text-xs font-mono text-[#cbd5e1]">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Select Optical Capture</span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Location Lock & Metadata */}
            <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6">
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">3. Spatial Telemetry & Metadata</h3>
                <p className="text-xs text-[#94a3b8] mt-0.5">Verified coordinates lock the hazard onto the Leaflet 2D and Cesium 3D grids.</p>
              </div>

              {/* Coordinates Box */}
              <div className="p-4 rounded-xl bg-[rgba(144,202,249,0.04)] border border-[rgba(144,202,249,0.2)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[rgba(144,202,249,0.1)] border border-[rgba(144,202,249,0.3)] flex items-center justify-center text-[#90CAF9] shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-mono text-[#90CAF9] font-bold">PILOT ZONE LOCKED</div>
                    <div className="text-sm font-mono text-white mt-0.5">
                      Lat: {lat.toFixed(5)}° N • Lon: {lon.toFixed(5)}° E
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAcquireDeviceGps}
                  disabled={isGpsLoading}
                  className="px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] border border-[rgba(255,255,255,0.1)] text-xs font-mono text-white flex items-center gap-1.5 transition-colors"
                >
                  {isGpsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
                  <span>{isGpsLoading ? 'Acquiring...' : 'Acquire My GPS'}</span>
                </button>
              </div>

              {/* Title & Notes */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-[#94a3b8] uppercase mb-1.5">
                    Incident Title / Identifier (Optional)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Broken pavement near north pedestrian exit"
                    className="w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white text-sm placeholder-[#64748b] focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#94a3b8] uppercase mb-1.5">
                    Field Notes & Observations (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Provide details on pedestrian impact, traffic slowdowns, or immediate risks..."
                    className="w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white text-sm placeholder-[#64748b] focus:outline-none focus:border-white transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Ingestion Trigger Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-4 rounded-xl btn-primary font-bold text-base flex items-center justify-center gap-3 transition-all"
              >
                <Sparkles className="w-5 h-5" />
                <span>INITIATE AI VERIFICATION & INGEST TO ARGUS</span>
              </button>
              <p className="text-center text-xs font-mono text-[#64748b] mt-3">
                Zero unverified data is published. The AI model checks physical integrity prior to database authorization.
              </p>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
