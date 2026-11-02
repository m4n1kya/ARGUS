'use client';

import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { CustomEase } from 'gsap/CustomEase';
import Link from 'next/link';
import Image from 'next/image';
import {
  Camera, MapPin, Loader2, CheckCircle2, ShieldCheck,
  Cpu, X, FileText, Sparkles, ChevronRight, Trash2,
  Clock, ArrowUpRight, Check, AlertCircle, ShieldAlert,
  Search, ZoomIn, Eye, Layers
} from 'lucide-react';
import {
  ReportStorageService,
  AiVerificationRecord
} from './services/reportStorage';
import './landing.scss';

gsap.registerPlugin(useGSAP, CustomEase);

type HazardFilter = 'all' | 'pothole' | 'garbage' | 'construction' | 'exposed_wire';

export default function Home() {
  const root = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Verifications ledger state
  const [verifications, setVerifications] = useState<AiVerificationRecord[]>([]);
  const [filterCategory, setFilterCategory] = useState<HazardFilter>('all');
  const [selectedVerification, setSelectedVerification] = useState<AiVerificationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((e) => console.log('Video autoplay prevented:', e));
    }
    loadVerifications();
  }, []);

  const loadVerifications = async () => {
    setIsLoading(true);
    try {
      const records = await ReportStorageService.fetchVerifications();
      setVerifications(records);
    } catch (err) {
      console.warn('Failed to fetch verifications for home ledger:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVerification = async (id: string) => {
    await ReportStorageService.deleteVerification(id);
    setVerifications((prev) => prev.filter((p) => p.id !== id));
    if (selectedVerification?.id === id) {
      setSelectedVerification(null);
    }
  };

  const scrollToLedger = (category?: HazardFilter) => {
    if (category) setFilterCategory(category);
    document.getElementById('documentation-showcase')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Filtered list for display
  const filteredRecords = verifications.filter((item) => {
    if (filterCategory === 'all') return true;
    return item.category === filterCategory;
  });

  // Refs for animated elements
  const book = useRef(null);
  const open = useRef(null);
  const btnText = useRef(null);
  const eve = useRef(null);
  const ry = useRef(null);
  const st_1 = useRef(null);
  const reet = useRef(null);
  const tells = useRef(null);
  const a = useRef(null);
  const st_2 = useRef(null);
  const ory = useRef(null);

  useGSAP(() => {
    const customEaseIn = CustomEase.create('custom-ease-in', '0.52, 0.00, 0.48, 1.00');
    const fourtyFrames = 1.3333333;
    const fiftyFrames = 1.66666;
    const twoFrames = 0.666666;
    const fourFrames = 0.133333;

    const timeline = gsap.timeline();
    timeline
      .fromTo(eve.current, { x: '18.7500vw' }, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn }, 0)
      .fromTo(book.current, { y: '3.4722vw' }, { y: '0.0000vw', duration: fourtyFrames, ease: customEaseIn }, twoFrames)
      .fromTo(st_1.current, { x: '14.5833vw' }, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn }, twoFrames)
      .fromTo(a.current, { x: '-8.3333vw' }, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn }, twoFrames)
      .fromTo(ory.current, { x: '-22.2222vw' }, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn }, twoFrames)
      .fromTo(open.current, { y: '2.0833vw' }, { y: '0.0000vw', duration: fourtyFrames, ease: customEaseIn }, fourFrames)
      .fromTo(btnText.current, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: fourtyFrames, ease: customEaseIn }, fourFrames)
      .fromTo(ry.current, { x: '-13.8889vw' }, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn }, fourFrames)
      .fromTo(reet.current, { x: '-21.5278vw' }, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn }, fourFrames)
      .fromTo(tells.current, { x: '29.8611vw' }, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn }, fourFrames)
      .fromTo(st_2.current, { x: '13.1944vw' }, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn }, fourFrames)
      .fromTo('.floating-badge', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 1.0, stagger: 0.1, ease: customEaseIn }, twoFrames);
  }, { scope: root });

  const getAssessmentBadge = (assessment: string, status: string) => {
    if (status === 'PROCESSING' || status === 'QUEUED') {
      return (
        <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin shrink-0" />
          <span>INFERENCE ACTIVE</span>
        </span>
      );
    }
    if (assessment === 'EVIDENCE_FOUND') {
      return (
        <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
          <Check className="w-3 h-3 shrink-0" />
          <span>EVIDENCE FOUND</span>
        </span>
      );
    }
    if (assessment === 'NOT_DETECTED') {
      return (
        <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>NOT DETECTED</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
        <ShieldAlert className="w-3 h-3 shrink-0" />
        <span>NEEDS REVIEW</span>
      </span>
    );
  };

  return (
    <main className="landing-container landing-page" ref={root} style={{ position: 'relative', background: 'transparent', overflowX: 'hidden' }}>
      
      {/* ── FIXED 3D ROTATING ROCK BACKGROUND (VISIBLE ACROSS HERO & SCROLL) ── */}
      <video ref={videoRef} className="hero-video" autoPlay muted loop playsInline preload="auto">
        <source src="https://cdn.zajno.com/dev/codepen/fossil/fossil.mp4" type="video/mp4" />
      </video>

      {/* ── HERO SECTION ── */}
      <section className="hero">
        {/* ARGUS — plain text top left */}
        <Link href="/" style={{
          position: 'absolute', top: 22, left: '4%', zIndex: 50,
          fontSize: 13, fontWeight: 700, letterSpacing: '0.35em',
          color: '#fff', textDecoration: 'none', fontFamily: 'monospace',
        }}>ARGUS</Link>

        {/* Floating bubble nav — centered (Strictly redirecting to actual pages) */}
        <div className="nav-menu-container" style={{
          position: 'absolute', top: 14, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, zIndex: 50, pointerEvents: 'none',
        }}>
          {[
            { label: 'Map',           href: '/map'           },
            { label: 'Report',        href: '/report'        },
            { label: 'Documentation', href: '/documentation' },
            { label: 'Status',        href: '/status'        },
            { label: 'Globe',         href: '/globe'         },
          ].map(({ label, href }) => (
            <Link key={label} href={href} className="nav-menu-item" style={{
              pointerEvents: 'auto',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: 'rgba(255,255,255,0.7)',
              textDecoration: 'none',
              letterSpacing: '0.04em',
              fontFamily: 'var(--font-geist-sans, sans-serif)',
              transition: 'all 0.2s',
            }}>{label}</Link>
          ))}
        </div>

        <div className="container">
          <div className="title-block">
            <div className="title-h1">
              <div className="title-row title-row-1">
                <div className="title-charts-cont" id="eve"><span ref={eve}>Eve</span></div>
                <div className="title-charts-cont" id="ry"><span ref={ry}>ry</span></div>
                <div className="title-charts-cont" id="st_1"><span ref={st_1}>st</span></div>
                <div className="title-charts-cont" id="reet"><span ref={reet}>reet</span></div>
              </div>
              <div className="title-row title-row-2">
                <div className="title-charts-cont" id="tells"><span ref={tells}>tells</span></div>
                <div className="title-charts-cont" id="a"><span ref={a}>a</span></div>
                <div className="title-charts-cont" id="st_2"><span ref={st_2}>st</span></div>
                <div className="title-charts-cont" id="ory"><span ref={ory}>ory</span></div>
              </div>
            </div>
            
            <div className="first-desc">
              <span className="desc-1" ref={book}>Real-time urban hazard detection</span>
            </div>
            <div className="second-desc">
              <span className="desc-1" ref={open}>WE ARE LIVE!</span>
            </div>
          </div>
      
          {/* Scroll Indicator Animation — Click to jump down to Documentation Showcase */}
          <div
            onClick={() => scrollToLedger()}
            style={{
              position: 'absolute', bottom: '4%', left: '50%', transform: 'translateX(-50%)',
              opacity: 0, animation: 'fade-in 1s ease 1.5s forwards', cursor: 'pointer', zIndex: 30
            }}
            title="Scroll down to Verification Ledger"
          >
            <div style={{ width: 14, height: 24, border: '1px solid rgba(255,255,255,0.3)', borderRadius: 99, display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
              <div style={{ width: 3, height: 3, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '50%', animation: 'scrolldown 1.5s infinite cubic-bezier(0.15, 0.41, 0.69, 0.94)' }} />
            </div>
            <style>{`
              @keyframes scrolldown {
                0% { transform: translateY(0); opacity: 1; }
                100% { transform: translateY(14px); opacity: 0; }
              }
              @keyframes fade-in {
                to { opacity: 1; }
              }
            `}</style>
          </div>
          
          <Link href="/map" className="book-btn">
            <div className="btn-text" style={{ overflow: 'visible', zIndex: 10, marginTop: '8px' }}>
              <div ref={btnText} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0' }}>
                <img src="/map-logo-new.png" alt="Map Logo" style={{ width: '100%', height: 'auto', objectFit: 'contain', transform: 'scale(2.2)', filter: 'grayscale(100%) brightness(0.8) contrast(1.2)' }} />
                <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.9)', fontFamily: 'monospace', marginTop: '0px', zIndex: 11 }}>MAP</span>
              </div>
            </div>
          </Link>
        </div>
        
        {/* ── LEFT COLUMN: POTHOLES + CONSTRUCTION ── */}
        <div style={{ position: 'absolute', left: '4%', bottom: '10%', display: 'flex', flexDirection: 'column', gap: 12, zIndex: 10 }}>
          <div
            onClick={() => scrollToLedger('pothole')}
            className="floating-badge hazard-card opacity-0"
            style={{ display: 'block', position: 'relative', width: '140px', height: '80px',
              borderRadius: 12, cursor: 'pointer', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
          >
            <Image src="/hazard-images/potholes.webp" alt="Potholes" fill sizes="(max-width: 768px) 130px, 200px"
              style={{ objectFit: 'cover', zIndex: 0 }} priority unoptimized />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)', zIndex: 1 }} />
            <span style={{ position: 'absolute', bottom: 8, left: 12, fontSize: 10, fontWeight: 700, letterSpacing: '0.25em',
              color: 'rgba(255,255,255,0.9)', fontFamily: 'monospace', textTransform: 'uppercase', zIndex: 2 }}>POTHOLES</span>
          </div>

          <div
            onClick={() => scrollToLedger('construction')}
            className="floating-badge hazard-card opacity-0"
            style={{ display: 'block', position: 'relative', width: '140px', height: '80px',
              borderRadius: 12, cursor: 'pointer', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
          >
            <Image src="/hazard-images/construction.webp" alt="Construction" fill sizes="(max-width: 768px) 130px, 200px"
              style={{ objectFit: 'cover', zIndex: 0 }} priority unoptimized />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)', zIndex: 1 }} />
            <span style={{ position: 'absolute', bottom: 8, left: 12, fontSize: 10, fontWeight: 700, letterSpacing: '0.25em',
              color: 'rgba(255,255,255,0.9)', fontFamily: 'monospace', textTransform: 'uppercase', zIndex: 2 }}>CONSTRUCTION</span>
          </div>
        </div>

        {/* ── RIGHT COLUMN: GARBAGE + WIRES ── */}
        <div style={{ position: 'absolute', right: '4%', top: '15%', display: 'flex', flexDirection: 'column', gap: 12, zIndex: 10 }}>
          <div
            onClick={() => scrollToLedger('garbage')}
            className="floating-badge hazard-card opacity-0"
            style={{ display: 'block', position: 'relative', width: '140px', height: '80px',
              borderRadius: 12, cursor: 'pointer', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
          >
            <Image src="/hazard-images/garbage.webp" alt="Garbage" fill sizes="(max-width: 768px) 130px, 200px"
              style={{ objectFit: 'cover', zIndex: 0 }} priority unoptimized />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)', zIndex: 1 }} />
            <span style={{ position: 'absolute', bottom: 8, left: 12, fontSize: 10, fontWeight: 700, letterSpacing: '0.25em',
              color: 'rgba(255,255,255,0.9)', fontFamily: 'monospace', textTransform: 'uppercase', zIndex: 2 }}>GARBAGE</span>
          </div>

          <div
            onClick={() => scrollToLedger('exposed_wire')}
            className="floating-badge hazard-card opacity-0"
            style={{ display: 'block', position: 'relative', width: '140px', height: '80px',
              borderRadius: 12, cursor: 'pointer', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
          >
            <Image src="/hazard-images/debris.webp" alt="Wires" fill sizes="(max-width: 768px) 130px, 200px"
              style={{ objectFit: 'cover', zIndex: 0 }} priority unoptimized />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)', zIndex: 1 }} />
            <span style={{ position: 'absolute', bottom: 8, left: 12, fontSize: 10, fontWeight: 700, letterSpacing: '0.25em',
              color: 'rgba(255,255,255,0.9)', fontFamily: 'monospace', textTransform: 'uppercase', zIndex: 2 }}>WIRES</span>
          </div>
        </div>
      </section>

      {/* ── SCROLLABLE DOCUMENTATION & AI EVIDENCE SHOWCASE ── */}
      <section id="documentation-showcase" className="landing-upload-section">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Section Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[rgba(144,202,249,0.1)] border border-[rgba(144,202,249,0.28)] text-[#90CAF9] text-xs font-mono tracking-wider">
              <Cpu className="w-3.5 h-3.5 shrink-0 text-[#90CAF9]" />
              <span>PHYSICAL CONSENSUS VERIFICATION LEDGER</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Real-Time Hazard Verifications &amp; Vision Audits
            </h2>
            <p className="text-[#94a3b8] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Explore ground-truth incident records verified by neural vision models (YOLOv8s, YOLO11n, RF-DETR).
              Inspect bounding boxes, confidence distributions, and spatial integrity proofs.
            </p>
          </div>

          {/* Filter Bar & Quick Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none text-xs font-mono">
              {[
                { id: 'all',          label: 'All Hazards' },
                { id: 'pothole',      label: 'Potholes' },
                { id: 'garbage',      label: 'Waste' },
                { id: 'construction', label: 'Construction' },
                { id: 'exposed_wire', label: 'Cut Wires' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterCategory(tab.id as HazardFilter)}
                  className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition-all border cursor-pointer ${
                    filterCategory === tab.id
                      ? 'bg-white text-black font-bold border-white'
                      : 'bg-white/5 text-[#94a3b8] border-white/10 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Link
              href="/report"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#90CAF9] text-black font-bold text-xs font-mono hover:bg-[#bce0fd] transition-all shadow-[0_2px_12px_rgba(144,202,249,0.3)] shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>REPORT NEW HAZARD</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            </Link>
          </div>

          {/* Cards Grid */}
          {isLoading ? (
            <div className="py-20 text-center space-y-4">
              <Loader2 className="w-8 h-8 text-[#90CAF9] animate-spin mx-auto" />
              <p className="text-xs font-mono text-[#94a3b8]">Loading verified computer vision records...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-16 text-center space-y-3 glass-card rounded-2xl border border-white/10">
              <p className="text-sm text-[#94a3b8]">No verification records matching this filter.</p>
              <button
                type="button"
                onClick={() => setFilterCategory('all')}
                className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-mono text-white transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecords.map((item) => {
                const imageSrc = item.annotated_image_url || item.original_image_url || item.image_reference || '/hazard-images/potholes.webp';
                const detectionsCount = item.detections?.length || item.metrics_summary?.detection_count || 0;
                const peakConf = item.metrics_summary?.max_confidence
                  ? Math.round(item.metrics_summary.max_confidence * 100)
                  : item.detections && item.detections[0] ? Math.round(item.detections[0].confidence * 100) : null;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedVerification(item)}
                    className="glass-card rounded-2xl overflow-hidden border border-white/10 hover:border-[#90CAF9]/40 cursor-pointer flex flex-col transition-all duration-300 group hover:shadow-[0_8px_32px_rgba(0,0,0,0.6)] bg-black/60 backdrop-blur-xl"
                  >
                    {/* Image Thumbnail */}
                    <div className="relative h-48 w-full bg-black overflow-hidden shrink-0">
                      <img
                        src={imageSrc}
                        alt={`Verification ${item.id}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-black/60" />

                      {/* Badges Overlay */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono uppercase font-bold text-white border border-white/15 flex items-center gap-1.5">
                            <Cpu className="w-3 h-3 text-[#90CAF9] shrink-0" />
                            <span>{item.category}</span>
                          </span>
                          {(item.is_demo || item.id.startsWith('demo-')) && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              DEMO AUDIT
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {getAssessmentBadge(item.assessment, item.processing_status)}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete verification #${item.id.slice(0, 8)}?`)) {
                                handleDeleteVerification(item.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-black/80 hover:bg-red-500/30 text-slate-400 hover:text-red-400 border border-white/15 hover:border-red-500/40 transition-colors cursor-pointer"
                            title="Delete Hazard Verification"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Info on Image */}
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-[#cbd5e1]">
                        <span className="truncate max-w-[65%]">
                          Model: {item.model_name || item.model_id || 'YOLOv8s'}
                        </span>
                        <span>
                          {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-xs font-mono text-[#94a3b8] mb-1">
                          <span>ID: #{item.id.slice(0, 8)}</span>
                          {item.total_duration_ms && (
                            <span className="flex items-center gap-1 text-[#90CAF9]">
                              <Clock className="w-3 h-3 shrink-0" />
                              {Math.round(item.total_duration_ms)} ms
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#cbd5e1] leading-relaxed line-clamp-2">
                          {item.explanation || 'Visual verification completed with neural vision engine.'}
                        </p>
                      </div>

                      {/* Detections Count Pill */}
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs font-mono">
                        <span className="text-[#94a3b8]">Verified Detections</span>
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <span>{detectionsCount} object{detectionsCount !== 1 ? 's' : ''}</span>
                          {peakConf !== null && (
                            <span className="text-[#90CAF9] text-[10px]">({peakConf}% max)</span>
                          )}
                        </span>
                      </div>

                      {/* Footer Link */}
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                        <span className="text-[11px] font-mono text-[#64748b]">
                          {item.image_quality?.sharpness_rating || 'SHARP'} QUALITY
                        </span>
                        <span className="text-xs font-mono font-semibold text-[#90CAF9] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          <span>Inspect AI Diagnostics</span>
                          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Ingestion CTA Banner */}
          <div className="p-8 rounded-2xl bg-black/60 border border-white/15 backdrop-blur-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-lg font-bold text-white">Need to verify a hazard in your community?</h3>
              <p className="text-xs text-[#94a3b8] max-w-xl">
                Submit field imagery directly to the ARGUS Neural Processing Pipeline. Every submission executes real neural vision models (YOLOv8s, YOLO11n, RF-DETR).
              </p>
            </div>
            <Link
              href="/report"
              className="py-3 px-6 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-[0_4px_20px_rgba(255,255,255,0.2)] shrink-0"
            >
              <span>SUBMIT REPORT NOW</span>
              <ArrowUpRight className="w-4 h-4 shrink-0" />
            </Link>
          </div>

        </div>
      </section>

      {/* ── MODAL INSPECTION DIALOG ── */}
      {selectedVerification && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setSelectedVerification(null)}
        >
          <div
            className="glass-card w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden border border-white/20 bg-[#0e1017] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[rgba(144,202,249,0.15)] border border-[rgba(144,202,249,0.3)] flex items-center justify-center text-[#90CAF9] shrink-0">
                  <ShieldCheck className="w-6 h-6 shrink-0" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      Physical Verification Audit #{selectedVerification.id.slice(0, 8)}
                    </h3>
                    {selectedVerification.is_demo && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        DEMO AUDIT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#94a3b8] font-mono">
                    Category: {selectedVerification.category.toUpperCase()} • Model: {selectedVerification.model_name || selectedVerification.model_id || 'YOLOv8s'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedVerification(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 shrink-0" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-6 space-y-6 overflow-y-auto">
              {/* Image Preview */}
              <div className="relative rounded-xl overflow-hidden bg-black border border-white/10 max-h-96 flex items-center justify-center">
                <img
                  src={selectedVerification.annotated_image_url || selectedVerification.original_image_url || selectedVerification.image_reference || '/hazard-images/potholes.webp'}
                  alt="Audit Preview"
                  className="w-full h-full object-contain max-h-96"
                />
              </div>

              {/* Detections Summary */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-[#90CAF9] uppercase tracking-wider">
                  Extracted Physical Consensus Bounding Boxes ({selectedVerification.detections?.length || 0})
                </h4>
                {selectedVerification.detections && selectedVerification.detections.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedVerification.detections.map((det, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-mono space-y-1">
                        <div className="flex items-center justify-between text-white font-bold">
                          <span>{det.display_name || det.class_name}</span>
                          <span className="text-[#90CAF9]">{Math.round(det.confidence * 100)}% Conf</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          BBox: [{Math.round(det.bbox_x1)}, {Math.round(det.bbox_y1)}] to [{Math.round(det.bbox_x2)}, {Math.round(det.bbox_y2)}]
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-mono">No target hazard classes detected in this optical capture.</p>
                )}
              </div>

              {/* Assessment Explanation */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="text-xs font-mono text-[#90CAF9] font-bold uppercase">Consensus Verification Verdict</div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedVerification.explanation || 'Visual verification completed with neural vision engine.'}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Permanently delete verification #${selectedVerification.id.slice(0, 8)}?`)) {
                    handleDeleteVerification(selectedVerification.id);
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Delete Incident</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedVerification(null)}
                className="px-5 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-mono font-bold transition-all"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
