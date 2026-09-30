'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import Script from 'next/script';
import { AlertCircle, Trash2, HardHat, TreeDeciduous, Zap, ArrowLeft } from 'lucide-react';

const CesiumViewer = dynamic(() => import('../components/CesiumViewer'), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-full flex items-center justify-center bg-black text-white/40 text-[13px] tracking-[0.2em] uppercase font-mono">
      Initializing Command Centre...
    </div>
  ),
});

const HAZARD_FILTERS = [
  { key: 'pothole',      icon: AlertCircle,    label: 'POTHOLES'    },
  { key: 'garbage',      icon: Trash2,         label: 'GARBAGE'     },
  { key: 'construction', icon: HardHat,        label: 'CONSTRUCTION'},
  { key: 'debris',       icon: TreeDeciduous,  label: 'DEBRIS'      },
  { key: 'exposed_wire', icon: Zap,            label: 'EXP. WIRES'  },
];

export default function MapPage() {
  return (
    <main className="h-screen w-full bg-black relative overflow-hidden" style={{ paddingTop: 48 }}>
      <link href="https://cesium.com/downloads/cesiumjs/releases/1.114/Build/Cesium/Widgets/widgets.css" rel="stylesheet" />
      <Script src="https://cesium.com/downloads/cesiumjs/releases/1.114/Build/Cesium/Cesium.js" strategy="beforeInteractive" />
      
      {/* ── TOP HUD BAR ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          padding: '14px 20px 14px 20px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.78) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      >
        {/* Row 1 — Back + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'auto' }}>
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.6)',
              flexShrink: 0,
              transition: 'all 0.2s',
            }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </Link>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#fff',
                letterSpacing: '0.08em',
                fontFamily: 'var(--font-geist-sans, sans-serif)',
                lineHeight: 1,
              }}
            >
              COMMAND CENTRE
            </h1>
            <p
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-geist-mono, monospace)',
                lineHeight: 1,
              }}
            >
              PILOT ZONE · VIT Bhopal University, Kotri Kalan
            </p>
          </div>

          {/* Live indicator */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#4ade80',
                boxShadow: '0 0 6px #4ade80',
                animation: 'pulse 2s infinite',
              }}
            />
            <span
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.35)',
                letterSpacing: '0.2em',
                fontFamily: 'var(--font-geist-mono, monospace)',
                textTransform: 'uppercase',
              }}
            >
              LIVE
            </span>
          </div>
        </div>

        {/* Row 2 — Hazard Filter Chips */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 12,
            pointerEvents: 'auto',
          }}
        >
          {HAZARD_FILTERS.map(({ key, icon: Icon, label }) => (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
              cursor: 'pointer',
                transition: 'all 0.2s',
                userSelect: 'none',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.10)';
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.3)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            >
              <Icon style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.15em',
                  color: 'rgba(255,255,255,0.65)',
                  fontFamily: 'var(--font-geist-mono, monospace)',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── CESIUM GLOBE ── */}
      <CesiumViewer />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </main>
  );
}
