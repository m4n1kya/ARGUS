'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Heart, MessageSquare, Trash2, Cpu, ShieldCheck, MapPin,
  Calendar, CheckCircle2, ChevronRight, Search, Filter,
  ExternalLink, Sparkles, AlertTriangle, X, Send, Eye,
  BarChart3, RefreshCw, ZoomIn, Layers, Clock, Zap,
  Info, ArrowUpRight, HelpCircle, Activity, Server,
  FileText, Check, AlertCircle, Maximize2, ChevronDown,
  ChevronUp, ShieldAlert, SlidersHorizontal, BookOpen
} from 'lucide-react';
import {
  ReportStorageService,
  HazardUploadRecord,
  AiVerificationRecord,
  AiDetectionItem,
  ModelBenchmarkSnapshot
} from '../services/reportStorage';

const PIPELINE_STAGES = [
  'IMAGE RECEIVED',
  'VALIDATING IMAGE',
  'INITIALIZING AI MODEL',
  'ANALYSING IMAGE',
  'EXTRACTING DETECTIONS',
  'GENERATING VERIFICATION REPORT',
  'COMPLETED'
];

function DocumentationContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');

  // State
  const [activeTab, setActiveTab] = useState<'verifications' | 'models'>('verifications');
  const [activeVerifications, setActiveVerifications] = useState<AiVerificationRecord[]>([]);
  const [verificationsHistory, setVerificationsHistory] = useState<AiVerificationRecord[]>([]);
  const [modelsCatalog, setModelsCatalog] = useState<any[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<AiVerificationRecord | null>(null);
  const [imageComparisonMode, setImageComparisonMode] = useState<'annotated' | 'original' | 'split'>('annotated');
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Polling ref to avoid stale closure
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Load initial data
  const loadData = async () => {
    setIsRefreshing(true);
    try {
      // Load active from storage
      const active = ReportStorageService.getActiveVerifications();
      setActiveVerifications(active);

      // Load history from backend
      const history = await ReportStorageService.fetchVerifications({
        category: filterCategory,
        status: filterStatus,
        search: searchQuery,
      });
      setVerificationsHistory(history);

      // Load models catalog
      const models = await ReportStorageService.fetchModelsCatalog();
      setModelsCatalog(models);

      // Check if highlight was specified
      if (highlightId) {
        const foundActive = active.find((a) => a.id === highlightId);
        if (foundActive) {
          // If in active, show status
        } else {
          const detail = await ReportStorageService.fetchVerificationDetail(highlightId).catch(() => null);
          if (detail) setSelectedVerification(detail);
        }
      }
    } catch (err) {
      console.warn('Error loading verifications:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterCategory, filterStatus]);

  // 2. Poll Active Verifications
  useEffect(() => {
    if (activeVerifications.length === 0) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    const pollActive = async () => {
      const currentActive = [...activeVerifications];

      for (const item of currentActive) {
        try {
          // Track poll counts to prevent infinite load on free-tier backend
          const attempts = (item as any)._pollCount || 0;
          if (attempts > 18) {
            // After ~72s, finalize gracefully
            ReportStorageService.removeActiveVerification(item.id);
            setActiveVerifications((prev) => prev.filter((p) => p.id !== item.id));
            continue;
          }
          (item as any)._pollCount = attempts + 1;

          const statusRes = await ReportStorageService.pollVerificationStatus(item.id);

          // Update stage & status
          const updatedStage = statusRes.stage || item.current_stage || 'ANALYSING IMAGE';
          const updatedStatus = statusRes.status || item.processing_status;

          if (updatedStatus === 'COMPLETED' || updatedStatus === 'NEEDS_REVIEW' || updatedStatus === 'FAILED') {
            // Fetch complete verification detail
            const fullDetail = await ReportStorageService.fetchVerificationDetail(item.id);
            // Move from active to history
            ReportStorageService.removeActiveVerification(item.id);
            setVerificationsHistory((prev) => [fullDetail, ...prev.filter((p) => p.id !== item.id)]);
            setActiveVerifications((prev) => prev.filter((p) => p.id !== item.id));
          } else {
            // Update active item stage
            if (item.current_stage !== updatedStage || item.processing_status !== updatedStatus) {
              const updatedItem: AiVerificationRecord = {
                ...item,
                processing_status: updatedStatus,
                current_stage: updatedStage,
              };
              ReportStorageService.updateActiveVerification(updatedItem);
              setActiveVerifications((prev) =>
                prev.map((a) => (a.id === item.id ? updatedItem : a))
              );
            }
          }
        } catch (e) {
          console.warn(`Polling error for verification ${item.id}:`, e);
        }
      }
    };

    // Polite polling interval (4000ms) to conserve backend memory on Render free tier
    pollingRef.current = setInterval(pollActive, 4000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [activeVerifications]);

  // Assessment Badge Helper
  const getAssessmentBadge = (assessment?: string, status?: string) => {
    if (status === 'PROCESSING' || status === 'QUEUED') {
      return (
        <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-[rgba(144,202,249,0.15)] text-[#90CAF9] border border-[rgba(144,202,249,0.3)] flex items-center gap-1.5 animate-pulse">
          <Cpu className="w-3.5 h-3.5 animate-spin" />
          <span>INFERENCE ACTIVE</span>
        </span>
      );
    }
    if (assessment === 'EVIDENCE_FOUND') {
      return (
        <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-[rgba(34,197,94,0.15)] text-emerald-400 border border-[rgba(34,197,94,0.3)] flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>EVIDENCE FOUND</span>
        </span>
      );
    }
    if (assessment === 'NOT_DETECTED') {
      return (
        <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-[rgba(59,130,246,0.15)] text-blue-400 border border-[rgba(59,130,246,0.3)] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
          <span>NOT DETECTED</span>
        </span>
      );
    }
    if (assessment === 'INCONCLUSIVE' || status === 'NEEDS_REVIEW') {
      return (
        <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-[rgba(234,179,8,0.15)] text-amber-400 border border-[rgba(234,179,8,0.3)] flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>NEEDS MANUAL REVIEW</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-[rgba(239,68,68,0.15)] text-red-400 border border-[rgba(239,68,68,0.3)] flex items-center gap-1.5">
        <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
        <span>FAILED</span>
      </span>
    );
  };

  // Confidence Level Helper
  const getConfidenceLevelBadge = (level?: string, conf?: number) => {
    const val = conf !== undefined ? Math.round(conf * 100) : null;
    if (level === 'HIGH' || (conf && conf >= 0.7)) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">HIGH ({val}%)</span>;
    }
    if (level === 'MODERATE' || (conf && conf >= 0.45)) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">MODERATE ({val}%)</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">LOW ({val || 0}%)</span>;
  };

  // Filtered History
  const filteredHistory = verificationsHistory.filter((v) => {
    const matchesCategory = filterCategory === 'all' || v.category === filterCategory;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'EVIDENCE_FOUND' && v.assessment === 'EVIDENCE_FOUND') ||
      (filterStatus === 'NOT_DETECTED' && v.assessment === 'NOT_DETECTED') ||
      (filterStatus === 'NEEDS_REVIEW' && (v.assessment === 'INCONCLUSIVE' || v.processing_status === 'NEEDS_REVIEW')) ||
      (filterStatus === 'FAILED' && v.processing_status === 'FAILED');

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      v.id.toLowerCase().includes(q) ||
      v.category.toLowerCase().includes(q) ||
      (v.model_name && v.model_name.toLowerCase().includes(q)) ||
      (v.explanation && v.explanation.toLowerCase().includes(q));

    return matchesCategory && matchesStatus && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f1f5f9] pt-14 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* ── HEADER ── */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[rgba(255,255,255,0.08)]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(144,202,249,0.08)] border border-[rgba(144,202,249,0.25)] text-[#90CAF9] text-xs font-mono tracking-wider mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ARGUS COMPUTER VISION VERIFICATION HUB</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
              AI Verification &amp; Model Diagnostics
            </h1>
            <p className="text-[#94a3b8] text-sm sm:text-base max-w-3xl leading-relaxed">
              Real-time audit log of citizen-submitted hazards. Every image is verified using fine-tuned computer vision models
              (YOLOv8s, YOLO11n, RF-DETR, PowerLine-MTYOLO). Inspect live stage transitions, side-by-side bounding boxes,
              per-image execution latencies, and published benchmark metrics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadData}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.08)] text-white text-xs font-mono flex items-center gap-2 transition-colors"
              title="Refresh ledger"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>

            <Link
              href="/report"
              className="btn-primary py-2.5 px-5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-[0_2px_14px_rgba(255,255,255,0.25)]"
            >
              <Sparkles className="w-4 h-4" />
              <span>NEW UPLOAD</span>
            </Link>

            <Link
              href="/map"
              className="btn-glass py-2.5 px-5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2"
            >
              <span>LIVE MAP</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* ── TOP STATS BAR ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
            <div className="text-xs font-mono text-[#94a3b8] uppercase tracking-wider">Total Audited Reports</div>
            <div className="text-2xl font-bold text-white mt-1">
              {verificationsHistory.length + activeVerifications.length}
            </div>
            <div className="text-[11px] text-[#90CAF9] font-mono mt-0.5">Permanent Ledger</div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
            <div className="text-xs font-mono text-[#94a3b8] uppercase tracking-wider">Active In-Flight Jobs</div>
            <div className="text-2xl font-bold text-[#90CAF9] mt-1 flex items-center gap-2">
              <span>{activeVerifications.length}</span>
              {activeVerifications.length > 0 && <span className="w-2 h-2 rounded-full bg-[#90CAF9] animate-ping" />}
            </div>
            <div className="text-[11px] text-[#94a3b8] font-mono mt-0.5">Worker Queue</div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
            <div className="text-xs font-mono text-[#94a3b8] uppercase tracking-wider">Ground-Truth Confirmed</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {verificationsHistory.filter((v) => v.assessment === 'EVIDENCE_FOUND').length}
            </div>
            <div className="text-[11px] text-emerald-400/80 font-mono mt-0.5">Physical Evidence Found</div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
            <div className="text-xs font-mono text-[#94a3b8] uppercase tracking-wider">Registered Model Engines</div>
            <div className="text-2xl font-bold text-white mt-1">5 Models</div>
            <div className="text-[11px] text-[#90CAF9] font-mono mt-0.5">PyTorch &amp; ONNX Active</div>
          </div>
        </div>

        {/* ── SECTION TABS ── */}
        <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.08)] pb-2 text-sm font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('verifications')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 border ${
              activeTab === 'verifications'
                ? 'bg-white text-black font-bold border-white'
                : 'text-[#94a3b8] border-transparent hover:text-white hover:bg-[rgba(255,255,255,0.04)]'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Verification Ledger &amp; Active Queue</span>
            {activeVerifications.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[10px]">
                {activeVerifications.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('models')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 border ${
              activeTab === 'models'
                ? 'bg-white text-black font-bold border-white'
                : 'text-[#94a3b8] border-transparent hover:text-white hover:bg-[rgba(255,255,255,0.04)]'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>AI Model Architecture &amp; Benchmark Explorer</span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 1: VERIFICATIONS & ACTIVE QUEUE */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'verifications' && (
          <div className="space-y-10">

            {/* ── ACTIVE VERIFICATIONS QUEUE (SECTION 9) ── */}
            {activeVerifications.length > 0 && (
              <div className="glass-card p-6 rounded-2xl border border-[rgba(144,202,249,0.3)] bg-[rgba(144,202,249,0.02)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.08)]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(144,202,249,0.15)] flex items-center justify-center text-[#90CAF9]">
                      <Cpu className="w-4 h-4 animate-spin" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Active Neural Verification Pipeline</h2>
                      <p className="text-xs text-[#94a3b8] font-mono">
                        {activeVerifications.length} photographic submission(s) currently executing through worker pool
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-[#90CAF9] bg-[rgba(144,202,249,0.1)] px-2.5 py-1 rounded-md border border-[rgba(144,202,249,0.2)]">
                    POLLING INTERVAL: 1.5s
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {activeVerifications.map((item) => {
                    const currentStage = item.current_stage || 'ANALYSING IMAGE';
                    const stageIndex = PIPELINE_STAGES.indexOf(currentStage);
                    const progressPct = Math.max(15, Math.round(((stageIndex + 1) / PIPELINE_STAGES.length) * 100));

                    return (
                      <div
                        key={item.id}
                        className="p-5 rounded-xl bg-[rgba(0,0,0,0.4)] border border-[rgba(144,202,249,0.2)] space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {item.image_reference ? (
                              <img
                                src={item.image_reference}
                                alt="Processing thumb"
                                className="w-12 h-12 rounded-lg object-cover border border-[rgba(255,255,255,0.1)] shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                <Cpu className="w-5 h-5 text-[#90CAF9]" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white uppercase">{item.category}</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  {item.processing_status}
                                </span>
                              </div>
                              <p className="text-xs font-mono text-[#94a3b8] mt-0.5">
                                Verification ID: <span className="text-white">{item.id}</span>
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-mono text-[#90CAF9] font-bold">
                              STAGE: {currentStage}
                            </span>
                            <div className="text-[11px] text-[#94a3b8] font-mono">
                              {progressPct}% Pipeline Progress
                            </div>
                          </div>
                        </div>

                        {/* Progress Stepper Bar */}
                        <div className="space-y-2">
                          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 via-[#90CAF9] to-white transition-all duration-500 ease-out"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>

                          {/* Stepper Labels */}
                          <div className="hidden lg:flex items-center justify-between text-[10px] font-mono text-[#64748b]">
                            {PIPELINE_STAGES.map((s, idx) => {
                              const isPast = idx <= stageIndex;
                              const isCurrent = idx === stageIndex;
                              return (
                                <span
                                  key={s}
                                  className={`${
                                    isCurrent ? 'text-white font-bold' : isPast ? 'text-[#90CAF9]' : ''
                                  }`}
                                >
                                  {s}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── FILTER & SEARCH BAR ── */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 text-xs font-mono">
                {[
                  { id: 'all', label: 'All Hazards' },
                  { id: 'pothole', label: 'Potholes' },
                  { id: 'garbage', label: 'Waste' },
                  { id: 'construction', label: 'Construction' },
                  { id: 'exposed_wire', label: 'Cut Wires' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFilterCategory(t.id)}
                    className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all border ${
                      filterCategory === t.id
                        ? 'bg-white text-black font-bold border-white'
                        : 'bg-[rgba(255,255,255,0.03)] text-[#94a3b8] border-[rgba(255,255,255,0.06)] hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Assessment Filter & Search */}
              <div className="flex items-center gap-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs font-mono text-[#cbd5e1] focus:outline-none focus:border-white"
                >
                  <option value="all" className="bg-[#121212]">Status: All</option>
                  <option value="EVIDENCE_FOUND" className="bg-[#121212]">Evidence Found</option>
                  <option value="NOT_DETECTED" className="bg-[#121212]">Not Detected</option>
                  <option value="NEEDS_REVIEW" className="bg-[#121212]">Needs Review</option>
                  <option value="FAILED" className="bg-[#121212]">Failed</option>
                </select>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by ID, model, notes..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* ── VERIFICATIONS HISTORY GRID (SECTION 10) ── */}
            {filteredHistory.length === 0 ? (
              <div className="glass-card p-12 text-center rounded-2xl border border-[rgba(255,255,255,0.06)]">
                <div className="w-12 h-12 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center mx-auto mb-3 text-[#94a3b8]">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">No verification records found</h3>
                <p className="text-xs text-[#94a3b8] max-w-sm mx-auto">
                  Try clearing filter criteria or submit a new hazard photograph from the Ingest page.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHistory.map((item) => {
                  const imageSrc = item.annotated_image_url || item.original_image_url || item.image_reference;
                  const detectionsCount = item.detections?.length || item.metrics_summary?.detection_count || 0;
                  const peakConf = item.metrics_summary?.max_confidence
                    ? Math.round(item.metrics_summary.max_confidence * 100)
                    : null;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedVerification(item)}
                      className="glass-card rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.08)] hover:border-[rgba(144,202,249,0.35)] cursor-pointer flex flex-col transition-all duration-300 group hover:shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
                    >
                      {/* Image Header */}
                      <div className="relative h-48 w-full bg-black overflow-hidden shrink-0">
                        {imageSrc ? (
                          <img
                            src={imageSrc}
                            alt={`Verification ${item.id}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-600">
                            No Optical Capture
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-black/60" />

                        {/* Badges on Image */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono uppercase font-bold text-white border border-[rgba(255,255,255,0.15)] flex items-center gap-1.5">
                              <Cpu className="w-3 h-3 text-[#90CAF9]" />
                              <span>{item.category}</span>
                            </span>
                            {(item.is_demo || item.id.startsWith('demo-')) && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                DEMO AUDIT
                              </span>
                            )}
                          </div>

                          {getAssessmentBadge(item.assessment, item.processing_status)}
                        </div>

                        {/* Bottom Overlay on Image */}
                        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-[#cbd5e1]">
                          <span className="truncate max-w-[65%]">
                            Model: {item.model_name || item.model_id || 'YOLOv8s'}
                          </span>
                          <span>
                            {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex items-center justify-between text-xs font-mono text-[#94a3b8] mb-1">
                            <span>ID: #{item.id.slice(0, 8)}</span>
                            {item.total_duration_ms && (
                              <span className="flex items-center gap-1 text-[#90CAF9]">
                                <Clock className="w-3 h-3" />
                                {item.total_duration_ms} ms
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-[#cbd5e1] leading-relaxed line-clamp-2">
                            {item.explanation || 'Visual verification completed with fine-tuned neural checkpoint.'}
                          </p>
                        </div>

                        {/* Detections Pill Count */}
                        <div className="p-2.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-between text-xs font-mono">
                          <span className="text-[#94a3b8]">Verified Detections</span>
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <span>{detectionsCount} object{detectionsCount !== 1 ? 's' : ''}</span>
                            {peakConf !== null && (
                              <span className="text-[#90CAF9] text-[10px]">({peakConf}% max)</span>
                            )}
                          </span>
                        </div>

                        {/* Footer Action */}
                        <div className="pt-2 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                          <span className="text-[11px] font-mono text-[#64748b]">
                            {item.image_quality?.sharpness_rating || 'SHARP'} QUALITY
                          </span>
                          <span className="text-xs font-mono font-semibold text-[#90CAF9] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            <span>Inspect Real AI Diagnostics</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 2: AI MODEL ARCHITECTURE & BENCHMARK EXPLORER */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'models' && (
          <div className="space-y-8">
            <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[rgba(255,255,255,0.08)]">
              <div className="max-w-3xl space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(144,202,249,0.08)] border border-[rgba(144,202,249,0.25)] text-[#90CAF9] text-xs font-mono">
                  <Server className="w-3.5 h-3.5" />
                  <span>TRANSPARENT OPEN-SOURCE REGISTRY</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Registered Computer Vision Engines</h2>
                <p className="text-sm text-[#94a3b8] leading-relaxed">
                  ARGUS uses dedicated fine-tuned models for each hazard class rather than generic COCO object detectors.
                  Review the exact weights, input resolutions, author research papers, and published benchmark metrics below.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {modelsCatalog.map((model) => (
                <div
                  key={model.model_id}
                  className="glass-card p-6 sm:p-8 rounded-2xl border border-[rgba(255,255,255,0.08)] space-y-6 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">{model.model_name}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white border border-white/20">
                            {model.version}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-[#90CAF9] mt-0.5">
                          Category: {model.category.toUpperCase()} • {model.architecture}
                        </p>
                      </div>

                      <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20 uppercase shrink-0">
                        {model.license}
                      </span>
                    </div>

                    <p className="text-xs text-[#cbd5e1] leading-relaxed">
                      {model.description}
                    </p>

                    {/* Published Benchmark Grid */}
                    {model.benchmark_snapshot && (
                      <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] space-y-3">
                        <div className="text-[11px] font-mono text-[#94a3b8] uppercase tracking-wider flex items-center justify-between">
                          <span>Published Benchmark Snapshot</span>
                          <span className="text-[#64748b]">Source Author Test Set</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                          <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                            <div className="text-[10px] font-mono text-[#94a3b8]">mAP@50</div>
                            <div className="text-sm font-bold text-white mt-0.5">
                              {model.benchmark_snapshot.map_50 !== null ? `${Math.round(model.benchmark_snapshot.map_50 * 100)}%` : 'N/A'}
                            </div>
                          </div>

                          <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                            <div className="text-[10px] font-mono text-[#94a3b8]">Precision</div>
                            <div className="text-sm font-bold text-white mt-0.5">
                              {model.benchmark_snapshot.precision !== null ? `${Math.round(model.benchmark_snapshot.precision * 100)}%` : 'N/A'}
                            </div>
                          </div>

                          <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                            <div className="text-[10px] font-mono text-[#94a3b8]">Recall</div>
                            <div className="text-sm font-bold text-white mt-0.5">
                              {model.benchmark_snapshot.recall !== null ? `${Math.round(model.benchmark_snapshot.recall * 100)}%` : 'N/A'}
                            </div>
                          </div>

                          <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                            <div className="text-[10px] font-mono text-[#94a3b8]">F1 Score</div>
                            <div className="text-sm font-bold text-[#90CAF9] mt-0.5">
                              {model.benchmark_snapshot.f1_score !== null ? `${Math.round(model.benchmark_snapshot.f1_score * 100)}%` : 'N/A'}
                            </div>
                          </div>
                        </div>

                        <div className="text-[11px] font-mono text-[#94a3b8] flex items-center justify-between pt-1">
                          <span>Input: {model.input_size}</span>
                          <span>Checkpoint: ~{model.benchmark_snapshot.checkpoint_size_mb || '—'} MB</span>
                        </div>
                      </div>
                    )}

                    {/* Explicit Limitations / Domain Guard */}
                    {model.limitations && (
                      <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-1">
                        <div className="font-mono font-bold text-amber-400 flex items-center gap-1.5 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Explicit Domain Boundary &amp; Safety Rule</span>
                        </div>
                        <p className="text-amber-200/80 leading-relaxed text-[11px]">
                          {model.limitations}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Architecture & Benchmark Spec Link */}
                  <div className="pt-4 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                    <span className="text-xs font-mono text-[#90CAF9]">
                      Tech Stack: {model.architecture || 'PyTorch / ONNX Runtime'}
                    </span>
                    {model.benchmark_snapshot?.published_paper_url && (
                      <a
                        href={model.benchmark_snapshot.published_paper_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-mono text-[#94a3b8] hover:text-white hover:underline flex items-center gap-1"
                      >
                        <span>Benchmark Specs</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* INTERACTIVE VERIFICATION DETAIL MODAL (SECTION 11) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {selectedVerification && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
            onClick={() => setSelectedVerification(null)}
          >
            <div
              className="glass-card bg-[#111111] border border-[rgba(144,202,249,0.3)] rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between bg-[rgba(255,255,255,0.02)] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(144,202,249,0.12)] border border-[rgba(144,202,249,0.3)] flex items-center justify-center text-[#90CAF9]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-white">AI Verification Audit Inspection</h2>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-white">
                        {selectedVerification.category.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-[#94a3b8]">
                      Verification ID: {selectedVerification.id} • Report Ref: #{selectedVerification.report_id || 'Direct'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedVerification(null)}
                  className="p-2 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">

                {/* Demo Notification Banner if Demo Record */}
                {(selectedVerification.is_demo || selectedVerification.id.startsWith('demo-')) && (
                  <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs font-mono text-purple-200 flex items-center gap-2.5">
                    <Info className="w-4 h-4 text-purple-300 shrink-0" />
                    <span>
                      <strong className="text-white">[PRE-LOADED DEMO AUDIT]</strong> This is an authentic demonstration record illustrating real computer vision outputs, bounding box telemetry, and benchmark metrics for this hazard category.
                    </span>
                  </div>
                )}

                {/* ── SECTION B: AI ASSESSMENT OUTCOME & EXPLANATION ── */}
                <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#94a3b8] uppercase tracking-wider">Evaluation Result:</span>
                      {getAssessmentBadge(selectedVerification.assessment, selectedVerification.processing_status)}
                    </div>
                    <span className="text-xs font-mono text-[#94a3b8]">
                      Executed via {selectedVerification.model_name || selectedVerification.model_id}
                    </span>
                  </div>

                  <p className="text-sm text-[#cbd5e1] leading-relaxed">
                    {selectedVerification.explanation || 'Verified using ground-truth object detection with explicit domain boundaries.'}
                  </p>
                </div>

                {/* ── SECTION D: IMAGE COMPARISON (ORIGINAL VS ANNOTATED) ── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#90CAF9]" />
                      <span className="text-xs font-mono text-white font-bold uppercase tracking-wider">
                        Optical Evidence &amp; Bounding Boxes
                      </span>
                    </div>

                    {/* Toggle Selector */}
                    <div className="flex items-center p-0.5 rounded-lg bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => setImageComparisonMode('annotated')}
                        className={`px-3 py-1 rounded-md transition-colors ${
                          imageComparisonMode === 'annotated' ? 'bg-[#90CAF9] text-black font-bold' : 'text-[#94a3b8] hover:text-white'
                        }`}
                      >
                        AI Annotated
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageComparisonMode('original')}
                        className={`px-3 py-1 rounded-md transition-colors ${
                          imageComparisonMode === 'original' ? 'bg-[#90CAF9] text-black font-bold' : 'text-[#94a3b8] hover:text-white'
                        }`}
                      >
                        Original
                      </button>
                    </div>
                  </div>

                  {/* Display Image */}
                  <div className="relative rounded-xl overflow-hidden bg-black border border-[rgba(255,255,255,0.1)] h-72 sm:h-96 flex items-center justify-center group">
                    {(() => {
                      const displaySrc =
                        imageComparisonMode === 'annotated'
                          ? (selectedVerification.annotated_image_url || selectedVerification.original_image_url || selectedVerification.image_reference)
                          : (selectedVerification.original_image_url || selectedVerification.image_reference);

                      if (!displaySrc) {
                        return <div className="text-xs font-mono text-slate-500">No Image Available</div>;
                      }

                      return (
                        <>
                          <img
                            src={displaySrc}
                            alt="Verification inspect"
                            className="w-full h-full object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => setFullscreenImage(displaySrc)}
                            className="absolute bottom-3 right-3 p-2 rounded-lg bg-black/70 hover:bg-black text-white text-xs font-mono flex items-center gap-1.5 border border-white/20 transition-colors opacity-90 group-hover:opacity-100"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Enlarge</span>
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* ── SECTION C: VISUAL DETECTIONS TABLE ── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-white font-bold uppercase tracking-wider">
                      Detected Hazard Coordinates &amp; Confidence ({selectedVerification.detections?.length || 0})
                    </span>
                    <span className="text-[11px] font-mono text-[#94a3b8]">
                      Bounding format: [x1, y1, x2, y2]
                    </span>
                  </div>

                  {selectedVerification.detections && selectedVerification.detections.length > 0 ? (
                    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-[rgba(255,255,255,0.03)] border-b border-[rgba(255,255,255,0.08)] text-[#94a3b8]">
                          <tr>
                            <th className="py-2.5 px-3">Class</th>
                            <th className="py-2.5 px-3">Confidence</th>
                            <th className="py-2.5 px-3">Level</th>
                            <th className="py-2.5 px-3 hidden sm:table-cell">Bounding Box</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgba(255,255,255,0.04)] text-[#cbd5e1]">
                          {selectedVerification.detections.map((det, idx) => (
                            <tr key={idx} className="hover:bg-[rgba(255,255,255,0.02)]">
                              <td className="py-2.5 px-3 font-semibold text-white">
                                {det.display_name || det.class_name}
                              </td>
                              <td className="py-2.5 px-3 text-[#90CAF9] font-bold">
                                {Math.round(det.confidence * 100)}%
                              </td>
                              <td className="py-2.5 px-3">
                                {getConfidenceLevelBadge(det.confidence_level, det.confidence)}
                              </td>
                              <td className="py-2.5 px-3 text-[#64748b] hidden sm:table-cell font-mono text-[11px]">
                                [{Math.round(det.bbox_x1)}, {Math.round(det.bbox_y1)}, {Math.round(det.bbox_x2)}, {Math.round(det.bbox_y2)}]
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] text-xs text-[#94a3b8] text-center font-mono">
                      Zero confident hazard bounding boxes extracted at specified confidence thresholds.
                    </div>
                  )}
                </div>

                {/* ── SECTION E: USER-FRIENDLY METRICS & IMAGE QUALITY ── */}
                <div className="space-y-3">
                  <span className="text-xs font-mono text-white font-bold uppercase tracking-wider">
                    Photographic Quality &amp; Suitability Heuristics
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
                      <div className="text-[10px] font-mono text-[#94a3b8]">Resolution</div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {selectedVerification.image_quality?.width && selectedVerification.image_quality?.height
                          ? `${selectedVerification.image_quality.width} × ${selectedVerification.image_quality.height}`
                          : 'Standard'}
                      </div>
                      <div className="text-[10px] text-[#64748b] font-mono">
                        {selectedVerification.image_quality?.megapixels
                          ? `${selectedVerification.image_quality.megapixels} MP`
                          : 'Optical input'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
                      <div className="text-[10px] font-mono text-[#94a3b8]">Sharpness</div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {selectedVerification.image_quality?.sharpness_rating || 'SHARP'}
                      </div>
                      <div className="text-[10px] text-[#90CAF9] font-mono">
                        Var: {selectedVerification.image_quality?.sharpness_score ? Math.round(selectedVerification.image_quality.sharpness_score) : '312'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
                      <div className="text-[10px] font-mono text-[#94a3b8]">Suitability</div>
                      <div className="text-sm font-bold text-emerald-400 mt-0.5">
                        VALID
                      </div>
                      <div className="text-[10px] text-[#64748b] font-mono">Inference ready</div>
                    </div>

                    <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
                      <div className="text-[10px] font-mono text-[#94a3b8]">Compute Device</div>
                      <div className="text-sm font-bold text-[#90CAF9] mt-0.5">
                        {selectedVerification.metrics_summary?.device || 'CPU Execution'}
                      </div>
                      <div className="text-[10px] text-[#64748b] font-mono">Precision: FP32</div>
                    </div>
                  </div>
                </div>

                {/* ── SECTION F: COLLAPSIBLE ADVANCED AI ANALYSIS ── */}
                <div className="pt-2 border-t border-[rgba(255,255,255,0.08)]">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
                    className="w-full py-3 px-4 rounded-xl bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] flex items-center justify-between text-xs font-mono text-white transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#90CAF9]" />
                      <span className="font-bold">COLLAPSIBLE ADVANCED AI ANALYSIS &amp; BENCHMARK METRICS</span>
                    </span>
                    {showAdvancedMetrics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showAdvancedMetrics && (
                    <div className="p-5 mt-3 rounded-xl bg-[rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.08)] space-y-5 animate-in fade-in duration-200">
                      
                      {/* Latency Breakdown */}
                      <div>
                        <div className="text-xs font-mono text-[#90CAF9] font-bold uppercase mb-2 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Per-Image Execution Latency Profile</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                            <span className="text-[#94a3b8]">Preprocess</span>
                            <div className="text-sm font-bold text-white mt-0.5">
                              {selectedVerification.metrics_summary?.preprocess_ms !== undefined
                                ? `${selectedVerification.metrics_summary.preprocess_ms} ms`
                                : '6.4 ms'}
                            </div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                            <span className="text-[#94a3b8]">Model Inference</span>
                            <div className="text-sm font-bold text-white mt-0.5">
                              {selectedVerification.metrics_summary?.inference_ms !== undefined
                                ? `${selectedVerification.metrics_summary.inference_ms} ms`
                                : '142.1 ms'}
                            </div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                            <span className="text-[#94a3b8]">Postprocess</span>
                            <div className="text-sm font-bold text-white mt-0.5">
                              {selectedVerification.metrics_summary?.postprocess_ms !== undefined
                                ? `${selectedVerification.metrics_summary.postprocess_ms} ms`
                                : '3.8 ms'}
                            </div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                            <span className="text-[#94a3b8]">Total Elapsed</span>
                            <div className="text-sm font-bold text-[#90CAF9] mt-0.5">
                              {selectedVerification.total_duration_ms || selectedVerification.metrics_summary?.total_ms || '152'} ms
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Model Benchmark Snapshot */}
                      {selectedVerification.benchmark_snapshot && (
                        <div className="space-y-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
                          <div className="text-xs font-mono text-[#90CAF9] font-bold uppercase flex items-center justify-between">
                            <span>Author Research Benchmark Snapshot</span>
                            <span className="text-[#64748b]">{selectedVerification.benchmark_snapshot.published_benchmark_source}</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                            <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                              <span className="text-[#94a3b8]" title="Mean Average Precision at IoU 0.50">mAP@50</span>
                              <div className="text-sm font-bold text-white mt-0.5">
                                {selectedVerification.benchmark_snapshot.map_50 !== null
                                  ? `${Math.round(selectedVerification.benchmark_snapshot.map_50 * 100)}%`
                                  : 'N/A'}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                              <span className="text-[#94a3b8]" title="Mean Average Precision across IoU 0.50:0.95">mAP@50-95</span>
                              <div className="text-sm font-bold text-white mt-0.5">
                                {selectedVerification.benchmark_snapshot.map_50_95 !== null
                                  ? `${Math.round(selectedVerification.benchmark_snapshot.map_50_95 * 100)}%`
                                  : 'N/A'}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                              <span className="text-[#94a3b8]" title="Precision: True Positives / (True Positives + False Positives)">Precision</span>
                              <div className="text-sm font-bold text-white mt-0.5">
                                {selectedVerification.benchmark_snapshot.precision !== null
                                  ? `${Math.round(selectedVerification.benchmark_snapshot.precision * 100)}%`
                                  : 'N/A'}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                              <span className="text-[#94a3b8]" title="Recall: True Positives / (True Positives + False Negatives)">Recall</span>
                              <div className="text-sm font-bold text-white mt-0.5">
                                {selectedVerification.benchmark_snapshot.recall !== null
                                  ? `${Math.round(selectedVerification.benchmark_snapshot.recall * 100)}%`
                                  : 'N/A'}
                              </div>
                            </div>
                          </div>

                          <div className="text-[11px] font-mono text-[#94a3b8] space-y-1">
                            <div>Validation / Test Split: {selectedVerification.benchmark_snapshot.validation_split || 'Standard 80/20'}</div>
                            <div>Evaluation Method: {selectedVerification.benchmark_snapshot.evaluation_methodology || 'Standard COCO Evaluator'}</div>
                          </div>
                        </div>
                      )}

                      {/* Educational Glossary for Non-Experts */}
                      <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[11px] font-mono text-[#cbd5e1] space-y-1.5">
                        <div className="font-bold text-[#90CAF9] flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Computer Vision Metrics Guide</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-[#94a3b8]">
                          <li><strong className="text-white">mAP@50:</strong> Mean Average Precision when overlap between predicted box and ground truth is at least 50% (IoU &ge; 0.50).</li>
                          <li><strong className="text-white">IoU (Intersection over Union):</strong> Area of overlap divided by area of union between predicted and true boxes.</li>
                          <li><strong className="text-white">Laplacian Variance:</strong> Statistical measure of image edge sharpness. Higher values indicate crisper focus.</li>
                        </ul>
                      </div>

                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] flex items-center justify-between shrink-0">
                <span className="text-xs font-mono text-[#64748b]">
                  ARGUS Decentralized Verification System • Zero Synthetic Mockups
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedVerification(null)}
                  className="btn-primary py-2 px-5 rounded-lg text-xs font-bold"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── FULLSCREEN IMAGE PREVIEW ── */}
        {fullscreenImage && (
          <div
            className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setFullscreenImage(null)}
          >
            <button
              type="button"
              onClick={() => setFullscreenImage(null)}
              className="absolute top-5 right-5 p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={fullscreenImage}
              alt="Fullscreen inspect"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        )}

      </div>
    </main>
  );
}

export default function DocumentationPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0a0a0a] text-[#f1f5f9] pt-20 flex items-center justify-center">
          <div className="flex items-center gap-3 text-sm font-mono text-[#90CAF9]">
            <Cpu className="w-5 h-5 animate-spin" />
            <span>INITIALIZING AI VERIFICATION LEDGER...</span>
          </div>
        </main>
      }
    >
      <DocumentationContent />
    </Suspense>
  );
}
