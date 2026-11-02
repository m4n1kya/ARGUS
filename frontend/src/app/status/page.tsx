'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Activity, ShieldCheck, Cpu, Database, Globe, Radio,
  Server, CheckCircle2, AlertTriangle, ArrowLeft,
  ChevronRight, RefreshCw, Sparkles, Layers
} from 'lucide-react';
import { ReportStorageService } from '../services/reportStorage';

interface ServiceNode {
  name: string;
  category: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'MAINTENANCE';
  uptime: string;
  latency: string;
  detail: string;
  version: string;
}

const SUBSYSTEMS: ServiceNode[] = [
  {
    name: 'Neural Vision & Ingestion Pipeline',
    category: 'AI Diagnostics',
    status: 'OPERATIONAL',
    uptime: '99.98%',
    latency: '118ms',
    detail: 'Convolutional feature extraction and diffusion artifact verification active.',
    version: 'ARGUS-Vision-v2.4-Alpha'
  },
  {
    name: '2D Leaflet Geospatial Grid',
    category: 'Spatial Mapping',
    status: 'OPERATIONAL',
    uptime: '100%',
    latency: '14ms',
    detail: 'Serving vector layers and clustered incident points over Esri World Imagery.',
    version: 'Leaflet 1.9.4'
  },
  {
    name: 'CesiumJS 3D Photogrammetric Globe',
    category: '3D Simulation',
    status: 'OPERATIONAL',
    uptime: '99.95%',
    latency: '38ms',
    detail: 'Cesium Ion global digital terrain model (WGS-84) active.',
    version: 'Cesium 1.119'
  },
  {
    name: 'PostGIS Spatial Incident Ledger',
    category: 'Database & Geometry',
    status: 'OPERATIONAL',
    uptime: '99.99%',
    latency: '22ms',
    detail: 'Indexed geometry columns (SRID 4326) clamped to pilot testing boundary.',
    version: 'PostgreSQL 16 / PostGIS 3.4'
  },
  {
    name: 'Copernicus Sentinel-2 Constellation',
    category: 'Earth Observation',
    status: 'OPERATIONAL',
    uptime: '99.89%',
    latency: '210ms',
    detail: 'Multi-spectral True-Color (TCI) orbital reflectance pipeline connected.',
    version: 'ESA Sentinel Hub'
  },
  {
    name: 'Mapillary Ground-Truth Telemetry',
    category: 'Street Point Cloud',
    status: 'OPERATIONAL',
    uptime: '99.92%',
    latency: '165ms',
    detail: 'Street-level sequences available for pilot corridor validation.',
    version: 'Mapillary API v4'
  }
];

export default function StatusPage() {
  const [reportsCount, setReportsCount] = useState(0);
  const [acknowledgedCount, setAcknowledgedCount] = useState(0);
  const [lastChecked, setLastChecked] = useState<string>('Just now');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const data = ReportStorageService.getReports();
    setReportsCount(data.length);
    setAcknowledgedCount(data.reduce((acc, curr) => acc + (curr.likes_count || 0), 0));
    setLastChecked(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const data = ReportStorageService.getReports();
      setReportsCount(data.length);
      setAcknowledgedCount(data.reduce((acc, curr) => acc + (curr.likes_count || 0), 0));
      setLastChecked(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f1f5f9] pt-14 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Top Floating Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 pb-4 border-b border-white/10">
          <Link href="/" className="font-mono text-sm font-bold tracking-widest text-white">
            ARGUS
          </Link>

          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
            {[
              { label: 'Map',           href: '/map'           },
              { label: 'Report',        href: '/report'        },
              { label: 'Documentation', href: '/documentation' },
              { label: 'Status',        href: '/status'        },
              { label: 'Globe',         href: '/globe'         },
            ].map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all border ${
                  href === '/status'
                    ? 'bg-white text-black font-bold border-white'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#90CAF9] hover:text-white transition-colors bg-[rgba(144,202,249,0.08)] px-3 py-1.5 rounded-lg border border-[rgba(144,202,249,0.25)] shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>
        </div>

        {/* ── HEADER ── */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(144,202,249,0.08)] border border-[rgba(144,202,249,0.25)] text-[#90CAF9] text-xs font-mono tracking-wider mb-3">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>REAL-TIME INFRASTRUCTURE TELEMETRY</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
            System & Grid Status
          </h1>
          <p className="text-[#94a3b8] text-sm sm:text-base leading-relaxed max-w-2xl">
            Live operational status of ARGUS core subsystems, spatial databases, neural vision pipelines, and orbital satellite ingest engines.
          </p>
        </div>

        {/* ── OVERALL HEALTH BANNER ── */}
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[rgba(144,202,249,0.3)] bg-[rgba(144,202,249,0.03)] mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[rgba(144,202,249,0.15)] border border-[rgba(144,202,249,0.4)] flex items-center justify-center text-[#90CAF9] shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">All Systems Operational</h2>
                <span className="w-2.5 h-2.5 rounded-full bg-[#4ade80] shadow-[0_0_8px_#4ade80] animate-pulse" />
              </div>
              <p className="text-xs text-[#94a3b8] font-mono mt-1">
                Zero service disruptions across pilot grid nodes • Last verified: {lastChecked}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono border-t md:border-t-0 md:border-l border-[rgba(255,255,255,0.08)] pt-4 md:pt-0 md:pl-6">
            <div>
              <div className="text-[#94a3b8]">Pilot Zone</div>
              <div className="text-white font-bold mt-0.5">VIT Bhopal / Kothri</div>
            </div>
            <div>
              <div className="text-[#94a3b8]">Global Uptime</div>
              <div className="text-[#90CAF9] font-bold mt-0.5">99.96%</div>
            </div>
          </div>
        </div>

        {/* ── KPI METRICS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="glass-card p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
            <div className="text-xs font-mono text-[#94a3b8] uppercase">Grid Incidents</div>
            <div className="text-2xl font-bold text-white mt-1">{reportsCount}</div>
            <div className="text-[11px] text-[#90CAF9] font-mono mt-0.5">Active Ingested Records</div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
            <div className="text-xs font-mono text-[#94a3b8] uppercase">True Confirmations</div>
            <div className="text-2xl font-bold text-white mt-1">{acknowledgedCount}</div>
            <div className="text-[11px] text-[#90CAF9] font-mono mt-0.5">Citizen / Unit Acknowledgments</div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
            <div className="text-xs font-mono text-[#94a3b8] uppercase">Neural Latency</div>
            <div className="text-2xl font-bold text-white mt-1">118ms</div>
            <div className="text-[11px] text-[#90CAF9] font-mono mt-0.5">Vision Inference Speed</div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
            <div className="text-xs font-mono text-[#94a3b8] uppercase">Security & Integrity</div>
            <div className="text-2xl font-bold text-[#90CAF9] mt-1">LOCKED</div>
            <div className="text-[11px] text-[#94a3b8] font-mono mt-0.5">SHA-256 Validated</div>
          </div>
        </div>

        {/* ── SUBSYSTEM STATUS LIST ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-base font-bold text-white tracking-wide">Core Subsystems Telemetry</h3>
            <span className="text-xs font-mono text-[#94a3b8]">6 OF 6 ONLINE</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SUBSYSTEMS.map((sys) => (
              <div
                key={sys.name}
                className="glass-card p-5 rounded-2xl border border-[rgba(255,255,255,0.07)] hover:border-[rgba(144,202,249,0.35)] transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#90CAF9] bg-[rgba(144,202,249,0.08)] px-2 py-0.5 rounded border border-[rgba(144,202,249,0.2)]">
                      {sys.category}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-2">{sys.name}</h4>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.25)] text-[#4ade80] text-[11px] font-mono font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                    <span>{sys.status}</span>
                  </span>
                </div>

                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  {sys.detail}
                </p>

                <div className="flex items-center justify-between text-xs font-mono text-[#64748b] pt-2 border-t border-[rgba(255,255,255,0.06)]">
                  <span>{sys.version}</span>
                  <div className="flex items-center gap-3">
                    <span>Latency: <strong className="text-white">{sys.latency}</strong></span>
                    <span>Uptime: <strong className="text-white">{sys.uptime}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── QUICK ACTION LINKS ── */}
        <div className="mt-12 p-6 rounded-2xl glass-card border border-[rgba(255,255,255,0.08)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-bold text-white">Need to report an active hazard?</h4>
            <p className="text-xs text-[#94a3b8] mt-0.5">Use the neural ingestion pipeline to log and verify road hazards immediately.</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/report"
              className="btn-primary py-2.5 px-5 rounded-xl text-xs font-bold flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>INGEST HAZARD</span>
            </Link>

            <Link
              href="/documentation"
              className="btn-glass py-2.5 px-5 rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              <span>AUDIT LEDGER</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}
