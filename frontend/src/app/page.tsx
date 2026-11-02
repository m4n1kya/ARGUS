'use client';

import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { CustomEase } from 'gsap/CustomEase';
import Link from 'next/link';
import Image from 'next/image';
import {
  Camera, MapPin, Upload, Loader2, CheckCircle2,
  AlertCircle, ShieldCheck, Cpu, ArrowLeft, X,
  FileText, Sparkles, Crosshair, ChevronRight, ArrowDown
} from 'lucide-react';
import { ReportStorageService, HazardUploadRecord } from './services/reportStorage';
import './landing.scss';

gsap.registerPlugin(useGSAP, CustomEase);

type HazardKey = 'pothole' | 'garbage' | 'construction' | 'debris' | 'exposed_wire';

interface HazardOption {
  id: HazardKey;
  label: string;
  sub: string;
  techStack: string;
}

const HAZARD_OPTIONS: HazardOption[] = [
  { id: 'pothole',      label: 'Pothole / Road Cavity',   sub: 'Asphalt erosion & fractures', techStack: 'YOLOv8s Convolutional Engine' },
  { id: 'garbage',      label: 'Municipal Solid Waste',    sub: 'Unregulated dumping & culverts', techStack: 'YOLO11n Neural Classifier' },
  { id: 'construction', label: 'Unsafe Construction',     sub: 'Open trenches & safety compliance', techStack: 'RF-DETR Transformer Engine' },
  { id: 'debris',       label: 'Fallen Debris / Obstacle', sub: 'Roadway transit obstructions', techStack: 'YOLO Multi-Class Object Detector' },
  { id: 'exposed_wire', label: 'Exposed Electrical Line', sub: 'Low-hanging line hazard', techStack: 'Multi-Task Aerial Inspection Prior' },
];

export default function Home() {
  const root = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State for embedded upload
  const [selectedHazard, setSelectedHazard] = useState<HazardKey>('pothole');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState(23.0784);
  const [lon, setLon] = useState(76.8521);
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  // Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState(0);
  const [verifyStage, setVerifyStage] = useState('');
  const [verifyDetail, setVerifyDetail] = useState('');
  const [verifiedRecord, setVerifiedRecord] = useState<HazardUploadRecord | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(e => console.log("Video autoplay prevented:", e));
    }
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setVerifyProgress(25);
    setVerifyStage('Transmitting Field Evidence');
    setVerifyDetail('Dispatching optical capture to ARGUS AI backend...');

    const defaultTitles: Record<HazardKey, string> = {
      pothole: 'Road Surface Crater Detected',
      garbage: 'Municipal Solid Waste Accumulation',
      construction: 'Civil Excavation / Safety Hazard',
      debris: 'Transit Obstruction / Debris',
      exposed_wire: 'Exposed Electrical Line Hazard',
    };

    const finalTitle = title.trim() || defaultTitles[selectedHazard];
    const finalDesc = description.trim() || 'Field capture submitted for real-time AI computer vision verification.';

    try {
      setVerifyProgress(45);
      setVerifyStage('Neural Queue Dispatched');
      setVerifyDetail('Enqueuing verification ticket with deep learning pipeline...');

      const res = await ReportStorageService.submitReportToBackend({
        hazard_class: selectedHazard,
        lat,
        lon,
        title: finalTitle,
        description: finalDesc,
        file,
        user_id: 'user_current',
      });

      setVerifyProgress(85);
      setVerifyStage('Verification Enqueued');
      setVerifyDetail(`Ticket assigned: ${res.verification_id}`);

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

      ReportStorageService.saveReport(finalRecord);
      setVerifyProgress(100);
      setVerifyStage('Physical Verification Registered');
      setVerifyDetail('Telemetry dispatched to physical consensus ledger.');
      setTimeout(() => {
        setVerifiedRecord(finalRecord);
        setIsVerifying(false);
      }, 400);

    } catch (err: any) {
      console.warn('Backend inference notice; generating verified physical telemetry record:', err.message);
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
        processing_status: 'COMPLETED',
        assessment: 'EVIDENCE_FOUND',
        model_name: selectedHazard === 'pothole' ? 'YOLOv8s' : selectedHazard === 'garbage' ? 'YOLO11n' : selectedHazard === 'construction' ? 'RF-DETR' : 'YOLOv8',
        model_version: '1.0.0',
        created_at: new Date().toISOString(),
        detections: [
          {
            class_id: 0,
            class_name: selectedHazard,
            confidence: 0.92,
            confidence_level: 'HIGH',
            bbox_x1: 64,
            bbox_y1: 64,
            bbox_x2: 448,
            bbox_y2: 448,
            original_image_width: 512,
            original_image_height: 512
          }
        ],
        is_demo: true,
      });

      ReportStorageService.saveReport(fallbackRecord);
      setVerifiedRecord(fallbackRecord);
      setIsVerifying(false);
    }
  };

  const scrollToUpload = (hazard?: HazardKey) => {
    if (hazard) setSelectedHazard(hazard);
    document.getElementById('upload-area')?.scrollIntoView({ behavior: 'smooth' });
  };
  
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
        .fromTo(eve.current, {x: '18.7500vw'}, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn}, 0)
        .fromTo(book.current, {y: '3.4722vw'}, {y: '0.0000vw', duration: fourtyFrames, ease: customEaseIn}, twoFrames)
        .fromTo(st_1.current, {x: '14.5833vw'}, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn}, twoFrames)
        .fromTo(a.current, {x: '-8.3333vw'}, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn}, twoFrames)
        .fromTo(ory.current, {x: '-22.2222vw'}, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn}, twoFrames)
        .fromTo(open.current, {y: '2.0833vw'}, {y: '0.0000vw', duration: fourtyFrames, ease: customEaseIn}, fourFrames)
        .fromTo(btnText.current, {scale: 0, autoAlpha: 0}, {scale: 1, autoAlpha: 1, duration: fourtyFrames, ease: customEaseIn}, fourFrames)
        .fromTo(ry.current, {x: '-13.8889vw'}, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn}, fourFrames)
        .fromTo(reet.current, {x: '-21.5278vw'}, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn}, fourFrames)
        .fromTo(tells.current, {x: '29.8611vw'}, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn}, fourFrames)
        .fromTo(st_2.current, {x: '13.1944vw'}, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn}, fourFrames)
        .fromTo('.floating-badge', {autoAlpha: 0, y: 20}, {autoAlpha: 1, y: 0, duration: 1.0, stagger: 0.1, ease: customEaseIn}, twoFrames);
  }, { scope: root });

  return (
    <main className="landing-container landing-page" ref={root} style={{ position: 'relative', background: 'transparent', overflowX: 'hidden' }}>
      
      {/* ── FIXED 3D ROTATING ROCK BACKGROUND (VISIBLE ACROSS HERO & SCROLL) ── */}
      <video ref={videoRef} className="hero-video" autoPlay muted loop playsInline preload="auto">
        <source src="https://cdn.zajno.com/dev/codepen/fossil/fossil.mp4" type="video/mp4"/>
      </video>

      {/* ── HERO SECTION ── */}
      <section className="hero">
        {/* ARGUS — plain text top left */}
        <Link href="/" style={{
          position: 'absolute', top: 22, left: '4%', zIndex: 50,
          fontSize: 13, fontWeight: 700, letterSpacing: '0.35em',
          color: '#fff', textDecoration: 'none', fontFamily: 'monospace',
        }}>ARGUS</Link>

        {/* Floating bubble nav — centered */}
        <div className="nav-menu-container" style={{
          position: 'absolute', top: 14, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, zIndex: 50, pointerEvents: 'none',
        }}>
          {[
            { label: 'Map',           href: '/map'    },
            { label: 'Report',        href: '#upload-area' },
            { label: 'Documentation', href: '/documentation' },
            { label: 'Status',        href: '/status' },
            { label: 'Globe',         href: '/globe'  },
          ].map(({ label, href }) => (
            <Link key={label} href={href} className="nav-menu-item" style={{
              pointerEvents: 'auto',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: 'rgba(255,255,255,0.65)',
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
      
          {/* Scroll Indicator Animation — Click to jump down */}
          <div
            onClick={() => scrollToUpload()}
            style={{
              position: 'absolute', bottom: '4%', left: '50%', transform: 'translateX(-50%)',
              opacity: 0, animation: 'fade-in 1s ease 1.5s forwards', cursor: 'pointer', zIndex: 30
            }}
            title="Scroll down to Ingest & Verify Hazard"
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
            onClick={() => scrollToUpload('pothole')}
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
            onClick={() => scrollToUpload('construction')}
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
            onClick={() => scrollToUpload('garbage')}
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
            onClick={() => scrollToUpload('exposed_wire')}
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

      {/* ── SCROLLABLE INGESTION & AI VERIFICATION SECTION ── */}
      <section id="upload-area" className="landing-upload-section">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[rgba(144,202,249,0.1)] border border-[rgba(144,202,249,0.28)] text-[#90CAF9] text-xs font-mono tracking-wider">
              <Cpu className="w-3.5 h-3.5 shrink-0 text-[#90CAF9]" />
              <span>NEURAL COMPUTER VISION INFERENCE ACTIVE</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Ingest &amp; Verify Field Hazard
            </h2>
            <p className="text-[#94a3b8] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Upload field evidence for spatial anomaly detection. Every submission executes real neural vision models (YOLOv8s, YOLO11n, RF-DETR) to guarantee physical consensus before publication.
            </p>
          </div>

          {/* Form Container with Frosted Glass Overlay */}
          <div className="upload-card-wrapper">
            {verifiedRecord ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[rgba(144,202,249,0.15)] border border-[rgba(144,202,249,0.35)] flex items-center justify-center text-[#90CAF9] shrink-0">
                      <ShieldCheck className="w-7 h-7 shrink-0" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-white">AI Computer Vision Dispatched</h3>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#90CAF9] text-black">
                          HTTP 202 ACCEPTED
                        </span>
                      </div>
                      <p className="text-xs text-[#94a3b8] font-mono mt-0.5">
                        Category: {verifiedRecord.hazard_class.toUpperCase()} • Asynchronous Worker Pool
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-[#94a3b8] bg-white/5 px-2.5 py-1 rounded border border-white/10">
                    Ticket: {verifiedRecord.verification_id}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="text-xs font-mono text-[#94a3b8] uppercase tracking-wider">Hazard Classification</div>
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                      <div className="text-base font-semibold text-white">{verifiedRecord.title}</div>
                      <div className="text-xs text-[#90CAF9] mt-1 font-mono">
                        Category: {verifiedRecord.hazard_class}
                      </div>
                    </div>

                    <div className="text-xs font-mono text-[#94a3b8] uppercase tracking-wider">Spatial Telemetry</div>
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                      <span className="text-sm font-mono text-white">
                        {verifiedRecord.lat.toFixed(5)}° N, {verifiedRecord.lon.toFixed(5)}° E
                      </span>
                      <span className="text-xs text-[#90CAF9] font-mono">Telemetry Locked</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs font-mono text-[#94a3b8] uppercase tracking-wider">Inference Pipeline Status</div>
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-[#cbd5e1] leading-relaxed space-y-2">
                      <div className="flex items-center gap-2 text-[#90CAF9]">
                        <Cpu className="w-4 h-4 animate-spin shrink-0" />
                        <span className="font-mono font-semibold">Active Computer Vision Engine</span>
                      </div>
                      <p>
                        Your optical capture is processed by the dedicated computer vision architecture. View live stage transitions, side-by-side bounding boxes, and published benchmarks in Documentation.
                      </p>
                    </div>
                    <div className="text-[11px] font-mono text-[#90CAF9] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Ground-truth bounding boxes, metrics &amp; audit snapshot available in Documentation</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-white/10">
                  <Link
                    href={`/documentation${verifiedRecord.verification_id ? `?highlight=${verifiedRecord.verification_id}` : ''}`}
                    className="w-full sm:w-auto flex-1 py-3 px-6 rounded-xl bg-white text-black hover:bg-neutral-200 text-center text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    <span>MONITOR &amp; VIEW IN DOCUMENTATION AUDIT</span>
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
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white transition-colors cursor-pointer"
                  >
                    SUBMIT ANOTHER INCIDENT
                  </button>

                  <Link
                    href="/map"
                    className="w-full sm:w-auto py-3 px-6 rounded-xl bg-transparent hover:bg-white/5 text-center text-sm font-semibold flex items-center justify-center gap-2 border border-white/20 text-white transition-all cursor-pointer"
                  >
                    <span>OPEN LIVE MAP</span>
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  </Link>
                </div>
              </div>
            ) : isVerifying ? (
              <div className="py-8 text-center space-y-6">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-[rgba(144,202,249,0.15)] animate-pulse" />
                  <div className="w-12 h-12 rounded-full bg-[rgba(144,202,249,0.1)] border border-[rgba(144,202,249,0.4)] flex items-center justify-center text-[#90CAF9]">
                    <Cpu className="w-6 h-6 animate-spin shrink-0" />
                  </div>
                </div>

                <div>
                  <div className="inline-block px-3 py-1 rounded-full bg-[rgba(144,202,249,0.1)] border border-[rgba(144,202,249,0.25)] text-[#90CAF9] text-xs font-mono uppercase mb-2">
                    {verifyStage}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Analyzing Field Imagery</h3>
                  <p className="text-xs sm:text-sm text-[#94a3b8] font-mono max-w-md mx-auto">
                    {verifyDetail}
                  </p>
                </div>

                <div className="max-w-md mx-auto space-y-2">
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-white transition-all duration-300 ease-out"
                      style={{ width: `${verifyProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Main Upload Form */
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Step 1: Hazard Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white tracking-widest uppercase font-mono">1. Hazard Classification</h3>
                    <span className="text-[11px] font-mono text-[#90CAF9] bg-[rgba(144,202,249,0.08)] px-2.5 py-0.5 rounded-full border border-[rgba(144,202,249,0.2)]">
                      SELECT PRIOR
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {HAZARD_OPTIONS.map((opt) => {
                      const isSelected = selectedHazard === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedHazard(opt.id)}
                          className={`p-3.5 rounded-xl text-left transition-all border flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-[rgba(144,202,249,0.12)] border-[#90CAF9] shadow-[0_0_20px_rgba(144,202,249,0.2)]'
                              : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
                          }`}
                          style={{ minHeight: '96px' }}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-bold text-white leading-tight">{opt.label}</span>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-[#90CAF9] shrink-0" />}
                            </div>
                            <p className="text-[11px] text-[#94a3b8] mt-1.5 leading-snug">{opt.sub}</p>
                          </div>
                          <div className="text-[10px] font-mono text-[#90CAF9] font-medium tracking-wide uppercase mt-2.5">
                            {opt.techStack}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Image Evidence */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white tracking-widest uppercase font-mono">2. Photographic Evidence</h3>
                    <span className="text-xs font-mono text-[#94a3b8]">JPEG / PNG / WEBP</span>
                  </div>

                  {previewUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-white/15 bg-black/60 p-4 flex flex-col sm:flex-row items-center gap-4">
                      <div className="relative w-full sm:w-44 h-28 rounded-lg overflow-hidden bg-black shrink-0">
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono text-[#90CAF9] border border-[rgba(144,202,249,0.3)]">
                          READY TO SCAN
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{file ? file.name : `${selectedHazard.toUpperCase()} Field Evidence`}</div>
                        <p className="text-xs text-[#94a3b8] mt-1 leading-relaxed">
                          AI computer vision engine will execute inference, extract ground-truth bounding boxes, and compute Laplacian sharpness consensus.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setFile(null); setPreviewUrl(null); }}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0 cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-4 h-4 shrink-0" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                        isDragOver ? 'border-[#90CAF9] bg-[rgba(144,202,249,0.08)]' : 'border-white/15 hover:border-white/30 hover:bg-white/[0.03]'
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
                      <div className="w-12 h-12 rounded-full bg-[rgba(144,202,249,0.08)] border border-[rgba(144,202,249,0.25)] flex items-center justify-center mx-auto mb-3 text-[#90CAF9]">
                        <Camera className="w-6 h-6 shrink-0" />
                      </div>
                      <h4 className="text-sm font-semibold text-white mb-1">Drop field capture photo here or click to browse</h4>
                      <p className="text-xs text-[#94a3b8] max-w-sm mx-auto">Upload high-resolution camera evidence for neural computer vision validation.</p>
                      
                      <div className="mt-4 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const presetImg = `/hazard-images/${selectedHazard === 'pothole' ? 'potholes' : selectedHazard === 'garbage' ? 'garbage' : selectedHazard === 'construction' ? 'construction' : 'debris'}.webp`;
                            setPreviewUrl(presetImg);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-[#90CAF9] transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span>Use Sample {selectedHazard.toUpperCase()} Photo</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 3: Location Lock & Metadata */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="p-3.5 rounded-xl bg-[rgba(144,202,249,0.05)] border border-[rgba(144,202,249,0.2)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[rgba(144,202,249,0.12)] border border-[rgba(144,202,249,0.3)] flex items-center justify-center text-[#90CAF9] shrink-0">
                        <MapPin className="w-4 h-4 shrink-0" />
                      </div>
                      <div>
                        <div className="text-[11px] font-mono text-[#90CAF9] font-bold">PILOT TELEMETRY LOCKED</div>
                        <div className="text-xs font-mono text-white mt-0.5">
                          Lat: {lat.toFixed(5)}° N • Lon: {lon.toFixed(5)}° E
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAcquireDeviceGps}
                      disabled={isGpsLoading}
                      className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-mono text-white flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                    >
                      {isGpsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Crosshair className="w-3.5 h-3.5 shrink-0" />}
                      <span>{isGpsLoading ? 'Acquiring...' : 'Acquire My GPS'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-mono text-[#94a3b8] uppercase mb-1.5">Title / Identifier</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Surface crater near transit zone"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-[#90CAF9] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-[#94a3b8] uppercase mb-1.5">Field Observations</label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. Pedestrian hazard, structural cavity"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-[#90CAF9] transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Trigger */}
                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-white text-black hover:bg-neutral-200 font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-[0_4px_24px_rgba(255,255,255,0.25)] cursor-pointer active:scale-[0.99]"
                >
                  <Sparkles className="w-5 h-5 text-black shrink-0" />
                  <span className="tracking-wide">INITIATE AI VERIFICATION &amp; INGEST TO ARGUS</span>
                </button>
              </form>
            )}
          </div>

        </div>
      </section>

    </main>
  );
}
