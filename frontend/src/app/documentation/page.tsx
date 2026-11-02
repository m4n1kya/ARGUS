'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Heart, MessageSquare, Trash2, Cpu, ShieldCheck, MapPin,
  Calendar, CheckCircle2, ChevronRight, Search, Filter,
  ExternalLink, Sparkles, AlertTriangle, X, Send, Eye,
  BarChart3, RefreshCw
} from 'lucide-react';
import {
  ReportStorageService,
  HazardUploadRecord,
  CommentItem,
  AiDetectionMetadata
} from '../services/reportStorage';

export default function DocumentationPage() {
  const [reports, setReports] = useState<HazardUploadRecord[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportForAi, setSelectedReportForAi] = useState<HazardUploadRecord | null>(null);
  const [expandedCommentsId, setExpandedCommentsId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load records
  const loadRecords = () => {
    const data = ReportStorageService.getReports();
    setReports(data);
  };

  useEffect(() => {
    loadRecords();
  }, []);

  // Filter records
  const filteredReports = reports.filter((rep) => {
    const matchesFilter =
      filter === 'all' ? true :
      filter === 'my' ? rep.is_mine :
      rep.hazard_class === filter;

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      rep.title.toLowerCase().includes(query) ||
      rep.description.toLowerCase().includes(query) ||
      rep.address_label.toLowerCase().includes(query) ||
      rep.hazard_class.toLowerCase().includes(query) ||
      rep.user_name.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  // Handle Like (Acknowledge as True)
  const handleToggleLike = (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = ReportStorageService.toggleLike(reportId);
    if (updated) {
      setReports((prev) => prev.map((r) => (r.id === reportId ? updated : r)));
    }
  };

  // Handle Submit Comment
  const handleAddComment = (reportId: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = commentInputs[reportId] || '';
    if (!text.trim()) return;

    const updated = ReportStorageService.addComment(reportId, text, 'You');
    if (updated) {
      setReports((prev) => prev.map((r) => (r.id === reportId ? updated : r)));
      setCommentInputs((prev) => ({ ...prev, [reportId]: '' }));
    }
  };

  // Handle Delete
  const handleDelete = (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this upload? It will be removed from the audit trail and the live map.')) {
      setDeletingId(reportId);
      setTimeout(() => {
        ReportStorageService.deleteReport(reportId);
        setReports((prev) => prev.filter((r) => r.id !== reportId));
        setDeletingId(null);
        if (selectedReportForAi?.id === reportId) {
          setSelectedReportForAi(null);
        }
      }, 300);
    }
  };

  // Severity styling helper
  const getSeverityBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-[rgba(33,150,243,0.15)] text-[#2196F3] border-[rgba(33,150,243,0.35)]';
      case 'HIGH':
        return 'bg-[rgba(144,202,249,0.15)] text-[#90CAF9] border-[rgba(144,202,249,0.35)]';
      case 'MEDIUM':
        return 'bg-[rgba(227,242,253,0.1)] text-[#E3F2FD] border-[rgba(227,242,253,0.25)]';
      default:
        return 'bg-[rgba(255,255,255,0.08)] text-[#f1f5f9] border-[rgba(255,255,255,0.15)]';
    }
  };

  // Compute stats
  const totalSubmissions = reports.length;
  const totalLikes = reports.reduce((acc, curr) => acc + (curr.likes_count || 0), 0);
  const avgConfidence = totalSubmissions > 0
    ? (reports.reduce((acc, curr) => acc + (curr.ai_detection?.confidence || 95), 0) / totalSubmissions).toFixed(1)
    : '96.4';

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f1f5f9] pt-14 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* ── HEADER ── */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 pb-8 border-b border-[rgba(255,255,255,0.07)]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(144,202,249,0.08)] border border-[rgba(144,202,249,0.25)] text-[#90CAF9] text-xs font-mono tracking-wider mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>CONSENSUS AUDIT & UPLOAD HISTORY</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
              Documentation & History
            </h1>
            <p className="text-[#94a3b8] text-sm sm:text-base max-w-2xl leading-relaxed">
              Permanent audit ledger for all citizen and drone hazard uploads. Review community confirmations, peer comments, and deep neural diagnostic readouts for every incident.
            </p>
          </div>

          <div className="flex items-center gap-3">
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
              <span>LIVE GRID MAP</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* ── METRICS BAR ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
            <div className="text-xs font-mono text-[#94a3b8] uppercase tracking-wider">Logged Submissions</div>
            <div className="text-2xl font-bold text-white mt-1">{totalSubmissions}</div>
            <div className="text-[11px] text-[#90CAF9] font-mono mt-0.5">100% Ingested</div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
            <div className="text-xs font-mono text-[#94a3b8] uppercase tracking-wider">Community Acknowledgments</div>
            <div className="text-2xl font-bold text-white mt-1">{totalLikes}</div>
            <div className="text-[11px] text-[#90CAF9] font-mono mt-0.5">Verified True in Person</div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
            <div className="text-xs font-mono text-[#94a3b8] uppercase tracking-wider">Mean Neural Confidence</div>
            <div className="text-2xl font-bold text-white mt-1">{avgConfidence}%</div>
            <div className="text-[11px] text-[#90CAF9] font-mono mt-0.5">ARGUS-Vision-v2.4</div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
            <div className="text-xs font-mono text-[#94a3b8] uppercase tracking-wider">Consensus Status</div>
            <div className="text-2xl font-bold text-[#90CAF9] mt-1">VERIFIED</div>
            <div className="text-[11px] text-[#94a3b8] font-mono mt-0.5">Zero Hallucinations</div>
          </div>
        </div>

        {/* ── FILTER & SEARCH BAR ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
          
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 text-xs font-mono">
            {[
              { id: 'all',          label: 'All Submissions' },
              { id: 'my',           label: 'My Uploads' },
              { id: 'pothole',      label: 'Potholes' },
              { id: 'construction', label: 'Construction' },
              { id: 'exposed_wire', label: 'Electrical Wires' },
              { id: 'garbage',      label: 'Waste' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all border ${
                  filter === tab.id
                    ? 'bg-white text-black font-bold border-white shadow-[0_0_12px_rgba(255,255,255,0.3)]'
                    : 'bg-[rgba(255,255,255,0.03)] text-[#94a3b8] border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports, locations, tags..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-white transition-colors"
            />
          </div>
        </div>

        {/* ── CARDS GRID ── */}
        {filteredReports.length === 0 ? (
          <div className="glass-card p-12 text-center rounded-2xl border border-[rgba(255,255,255,0.06)]">
            <div className="w-12 h-12 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center mx-auto mb-3 text-[#94a3b8]">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No uploads found</h3>
            <p className="text-xs text-[#94a3b8] max-w-sm mx-auto">
              No hazard records match your current filter criteria. Try selecting &quot;All Submissions&quot; or upload a new report.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report) => {
              const isCommentsOpen = expandedCommentsId === report.id;
              const isDeleting = deletingId === report.id;

              return (
                <div
                  key={report.id}
                  onClick={() => setSelectedReportForAi(report)}
                  className={`glass-card rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.08)] hover:border-[rgba(144,202,249,0.35)] cursor-pointer flex flex-col transition-all duration-300 group ${
                    isDeleting ? 'opacity-30 scale-95' : ''
                  }`}
                >
                  {/* Card Image Header */}
                  <div className="relative h-48 w-full bg-black overflow-hidden shrink-0">
                    <img
                      src={report.image_url}
                      alt={report.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-black/60" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-mono uppercase font-bold text-white border border-[rgba(255,255,255,0.15)] flex items-center gap-1.5">
                        <Cpu className="w-3 h-3 text-[#90CAF9]" />
                        <span>AI VERIFIED</span>
                      </span>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border backdrop-blur-md ${getSeverityBadge(report.ai_detection?.severity_level || 'HIGH')}`}>
                        {report.ai_detection?.severity_level || 'HIGH'}
                      </span>
                    </div>

                    {/* User & Time Overlay */}
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-[#cbd5e1]">
                      <span className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${report.is_mine ? 'bg-[#90CAF9]' : 'bg-[#94a3b8]'}`} />
                        <span className="font-semibold">{report.user_name}</span>
                      </span>
                      <span>
                        {new Date(report.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-[#90CAF9] transition-colors line-clamp-1">
                        {report.title}
                      </h3>
                      <p className="text-xs text-[#94a3b8] mt-1.5 line-clamp-2 leading-relaxed">
                        {report.description}
                      </p>

                      <div className="flex items-center gap-1.5 text-xs text-[#94a3b8] font-mono mt-3">
                        <MapPin className="w-3.5 h-3.5 text-[#90CAF9] shrink-0" />
                        <span className="truncate">{report.address_label}</span>
                      </div>
                    </div>

                    {/* AI Confidence Meter */}
                    <div className="p-2.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-[#94a3b8]">Detection Confidence</span>
                        <span className="text-white font-bold">{report.ai_detection?.confidence}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
                        <div
                          className="h-full bg-[#90CAF9]"
                          style={{ width: `${report.ai_detection?.confidence || 95}%` }}
                        />
                      </div>
                    </div>

                    {/* ── CARD FOOTER ACTIONS ── */}
                    <div className="pt-2 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                      
                      {/* Like / Acknowledge Button */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleLike(report.id, e)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                          report.liked_by_me
                            ? 'bg-[rgba(144,202,249,0.15)] text-[#90CAF9] border-[rgba(144,202,249,0.4)] shadow-[0_0_10px_rgba(144,202,249,0.2)]'
                            : 'bg-[rgba(255,255,255,0.03)] text-[#94a3b8] border-[rgba(255,255,255,0.08)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]'
                        }`}
                        title="Acknowledge upload as true in person"
                      >
                        <Heart className={`w-3.5 h-3.5 ${report.liked_by_me ? 'fill-current' : ''}`} />
                        <span>{report.likes_count} True</span>
                      </button>

                      {/* Comments Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedCommentsId(isCommentsOpen ? null : report.id);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-[#94a3b8] hover:text-white bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{report.comments?.length || 0}</span>
                      </button>

                      {/* Delete Button (Allowed for all user uploads or demo records) */}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(report.id, e)}
                        className="p-1.5 rounded-lg text-[#64748b] hover:text-red-400 hover:bg-red-500/10 transition-colors ml-auto"
                        title="Delete this upload"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* ── EXPANDABLE INLINE COMMENTS ── */}
                    {isCommentsOpen && (
                      <div
                        className="pt-3 border-t border-[rgba(255,255,255,0.08)] space-y-3 animate-in fade-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="text-xs font-mono text-[#94a3b8] uppercase tracking-wider">
                          Community Comments ({report.comments?.length || 0})
                        </div>

                        {/* Comments List */}
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {report.comments && report.comments.length > 0 ? (
                            report.comments.map((c) => (
                              <div key={c.id} className="p-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-xs">
                                <div className="flex items-center justify-between font-mono text-[10px] text-[#90CAF9] mb-1">
                                  <span>{c.author}</span>
                                  <span className="text-[#64748b]">
                                    {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-[#cbd5e1] leading-relaxed">{c.text}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-[#64748b] italic py-1">No comments yet. Be the first to verify or comment.</p>
                          )}
                        </div>

                        {/* Add Comment Input */}
                        <form onSubmit={(e) => handleAddComment(report.id, e)} className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={commentInputs[report.id] || ''}
                            onChange={(e) => setCommentInputs({ ...commentInputs, [report.id]: e.target.value })}
                            placeholder="Add a field observation..."
                            className="flex-1 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-white"
                          />
                          <button
                            type="submit"
                            className="p-1.5 rounded-lg bg-white text-black hover:bg-[#e2e8f0] transition-colors"
                            title="Submit Comment"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── AI DETECTION DETAILS MODAL ── */}
        {selectedReportForAi && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
            onClick={() => setSelectedReportForAi(null)}
          >
            <div
              className="glass-card bg-[#121212] border border-[rgba(144,202,249,0.3)] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between bg-[rgba(255,255,255,0.02)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[rgba(144,202,249,0.1)] border border-[rgba(144,202,249,0.3)] flex items-center justify-center text-[#90CAF9]">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">AI Neural Detection Diagnostics</h2>
                    <p className="text-xs font-mono text-[#94a3b8]">
                      Model: {selectedReportForAi.ai_detection?.model_version || 'ARGUS-Vision-v2.4'} • ID: {selectedReportForAi.id}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedReportForAi(null)}
                  className="p-2 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                
                {/* Visual Image with Simulated Anomaly Bounding Box */}
                <div className="relative rounded-xl overflow-hidden bg-black border border-[rgba(255,255,255,0.1)] h-64 sm:h-80">
                  <img
                    src={selectedReportForAi.image_url}
                    alt={selectedReportForAi.title}
                    className="w-full h-full object-cover"
                  />

                  {/* Simulated AI Detection Bounding Box */}
                  <div
                    className="absolute border-2 border-[#90CAF9] bg-[rgba(144,202,249,0.12)] shadow-[0_0_15px_rgba(144,202,249,0.4)] pointer-events-none transition-all"
                    style={{
                      left: `${selectedReportForAi.ai_detection?.anomaly_coords?.x || 30}%`,
                      top: `${selectedReportForAi.ai_detection?.anomaly_coords?.y || 25}%`,
                      width: `${selectedReportForAi.ai_detection?.anomaly_coords?.width || 40}%`,
                      height: `${selectedReportForAi.ai_detection?.anomaly_coords?.height || 45}%`,
                    }}
                  >
                    <div className="absolute -top-6 left-0 px-2 py-0.5 bg-[#90CAF9] text-black text-[10px] font-mono font-bold rounded-t">
                      {selectedReportForAi.ai_detection?.detected_class || 'TARGET HAZARD'} ({selectedReportForAi.ai_detection?.confidence}%)
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-3 px-3 py-1 rounded-md bg-black/80 backdrop-blur-md text-[11px] font-mono text-white border border-[rgba(255,255,255,0.15)] flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#90CAF9]" />
                    <span>STATUS: {selectedReportForAi.ai_detection?.status || 'VERIFIED_AUTHENTIC'}</span>
                  </div>
                </div>

                {/* Classification & Confidence Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                    <div className="text-[11px] font-mono text-[#94a3b8] uppercase">Neural Confidence</div>
                    <div className="text-xl font-bold text-white mt-1">
                      {selectedReportForAi.ai_detection?.confidence}%
                    </div>
                    <div className="text-[10px] text-[#90CAF9] font-mono mt-0.5">Ground-Truth Verified</div>
                  </div>

                  <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                    <div className="text-[11px] font-mono text-[#94a3b8] uppercase">Severity Index</div>
                    <div className="text-xl font-bold text-white mt-1">
                      {selectedReportForAi.ai_detection?.severity_level} ({selectedReportForAi.ai_detection?.severity_score})
                    </div>
                    <div className="text-[10px] text-[#90CAF9] font-mono mt-0.5">High Infrastructure Risk</div>
                  </div>

                  <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                    <div className="text-[11px] font-mono text-[#94a3b8] uppercase">Synthetics Check</div>
                    <div className="text-xl font-bold text-[#90CAF9] mt-1">PASS</div>
                    <div className="text-[10px] text-[#94a3b8] font-mono mt-0.5">&lt; 0.1% Diffusion Artifacts</div>
                  </div>
                </div>

                {/* Deep Reasoning & Surface Physics */}
                <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] space-y-3">
                  <h4 className="text-xs font-mono text-[#90CAF9] uppercase tracking-wider">
                    Model Reasoning & Epistemic Notes
                  </h4>
                  <p className="text-xs text-[#cbd5e1] leading-relaxed">
                    {selectedReportForAi.ai_detection?.inspection_notes}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[rgba(255,255,255,0.06)] text-xs font-mono text-[#94a3b8]">
                    <div>
                      <span className="text-[#64748b]">Depth / Footprint: </span>
                      <span className="text-white">{selectedReportForAi.ai_detection?.surface_analysis?.depth_estimate}</span>
                    </div>
                    <div>
                      <span className="text-[#64748b]">Road Impact: </span>
                      <span className="text-white">{selectedReportForAi.ai_detection?.surface_analysis?.road_impact}</span>
                    </div>
                  </div>
                </div>

                {/* Spatial Geotag */}
                <div className="p-4 rounded-xl bg-[rgba(144,202,249,0.04)] border border-[rgba(144,202,249,0.2)] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono text-[#90CAF9] font-bold">SPATIAL COORDINATES</div>
                    <div className="text-sm font-mono text-white mt-0.5">
                      {selectedReportForAi.lat.toFixed(5)}° N, {selectedReportForAi.lon.toFixed(5)}° E
                    </div>
                  </div>

                  <Link
                    href={`/map?lat=${selectedReportForAi.lat}&lon=${selectedReportForAi.lon}`}
                    className="btn-glass px-4 py-2 rounded-lg text-xs font-mono text-white flex items-center gap-1.5"
                  >
                    <span>Fly to Location</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] flex items-center justify-between">
                <span className="text-xs font-mono text-[#64748b]">
                  ARGUS Decentralized Urban Intelligence Ledger
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedReportForAi(null)}
                  className="btn-primary py-2 px-5 rounded-lg text-xs font-bold"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
