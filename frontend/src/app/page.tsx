'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { CustomEase } from 'gsap/CustomEase';
import Link from 'next/link';
import './landing.scss';

gsap.registerPlugin(useGSAP, CustomEase);

export default function Home() {
  const root = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(e => console.log("Video autoplay prevented:", e));
    }
  }, []);
  
  // font-size is now driven by .landing-page { font-size: 6.9444vw } in landing.scss
  
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
    const sixFrames = 0.2;

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
    <main className="landing-container landing-page" ref={root}>
      <section className="hero">
        <video ref={videoRef} className="hero-video" autoPlay muted loop playsInline>
          <source src="https://cdn.zajno.com/dev/codepen/fossil/fossil.mp4" type="video/mp4"/>
        </video>

        {/* ARGUS — plain text top left */}
        <Link href="/" style={{
          position: 'absolute', top: 22, left: 24, zIndex: 50,
          fontSize: 13, fontWeight: 700, letterSpacing: '0.35em',
          color: '#fff', textDecoration: 'none', fontFamily: 'monospace',
        }}>ARGUS</Link>

        {/* Floating bubble nav — centered */}
        <div style={{
          position: 'absolute', top: 14, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, zIndex: 50, pointerEvents: 'none',
        }}>
          {[
            { label: 'Map',           href: '/map'    },
            { label: 'Report',        href: '/report' },
            { label: 'Documentation', href: '#'       },
            { label: 'System Status', href: '#'       },
            { label: 'Command',       href: '#'       },
            { label: 'Globe',         href: '/globe'  },
          ].map(({ label, href }) => (
            <Link key={label} href={href} style={{
              pointerEvents: 'auto',
              padding: '7px 16px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              fontSize: 12,
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
      
          {/* Scroll Indicator Animation */}
          <div style={{ position: 'absolute', bottom: '4%', left: '50%', transform: 'translateX(-50%)', opacity: 0, animation: 'fade-in 1s ease 1.5s forwards' }}>
            <div style={{ width: 13, height: 22, border: '1px solid rgba(255,255,255,0.3)', borderRadius: 99, display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
              <div style={{ width: 3, height: 3, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '50%', animation: 'scrolldown 1.5s infinite cubic-bezier(0.15, 0.41, 0.69, 0.94)' }} />
            </div>
            <style>{`
              @keyframes scrolldown {
                0% { transform: translateY(0); opacity: 1; }
                100% { transform: translateY(12px); opacity: 0; }
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
        
        {/* ── LEFT COLUMN: POTHOLES (top) + CONSTRUCTION (bottom) ── */}
        <div style={{ position: 'absolute', left: '4%', bottom: '10%', display: 'flex', flexDirection: 'column', gap: 12, zIndex: 10 }}>
          <Link href="/globe?hazard=potholes" className="floating-badge opacity-0"
            style={{ width: 200, height: 112, display: 'block', position: 'relative',
              borderRadius: 12, cursor: 'pointer', textDecoration: 'none',
              transition: 'all 0.25s', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
          >
            <img src="/hazard-images/potholes.webp" alt="Potholes"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'absolute', top: 0, left: 0 }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />
            <span style={{ position: 'absolute', bottom: 8, left: 12, fontSize: 10, fontWeight: 700, letterSpacing: '0.25em',
              color: 'rgba(255,255,255,0.9)', fontFamily: 'monospace', textTransform: 'uppercase', zIndex: 2 }}>POTHOLES</span>
          </Link>

          <Link href="/globe?hazard=construction" className="floating-badge opacity-0"
            style={{ width: 200, height: 112, display: 'block', position: 'relative',
              borderRadius: 12, cursor: 'pointer', textDecoration: 'none',
              transition: 'all 0.25s', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
          >
            <img src="/hazard-images/construction.webp" alt="Construction"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'absolute', top: 0, left: 0 }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />
            <span style={{ position: 'absolute', bottom: 8, left: 12, fontSize: 10, fontWeight: 700, letterSpacing: '0.25em',
              color: 'rgba(255,255,255,0.9)', fontFamily: 'monospace', textTransform: 'uppercase', zIndex: 2 }}>CONSTRUCTION</span>
          </Link>
        </div>

        {/* ── RIGHT COLUMN: GARBAGE (top) + WIRES (bottom) ── */}
        <div style={{ position: 'absolute', right: '4%', top: '15%', display: 'flex', flexDirection: 'column', gap: 12, zIndex: 10 }}>
          <Link href="/globe?hazard=garbage" className="floating-badge opacity-0"
            style={{ width: 200, height: 112, display: 'block', position: 'relative',
              borderRadius: 12, cursor: 'pointer', textDecoration: 'none',
              transition: 'all 0.25s', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
          >
            <img src="/hazard-images/garbage.webp" alt="Garbage"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'absolute', top: 0, left: 0 }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />
            <span style={{ position: 'absolute', bottom: 8, left: 12, fontSize: 10, fontWeight: 700, letterSpacing: '0.25em',
              color: 'rgba(255,255,255,0.9)', fontFamily: 'monospace', textTransform: 'uppercase', zIndex: 2 }}>GARBAGE</span>
          </Link>

          <Link href="/globe?hazard=electrical" className="floating-badge opacity-0"
            style={{ width: 200, height: 112, display: 'block', position: 'relative',
              borderRadius: 12, cursor: 'pointer', textDecoration: 'none',
              transition: 'all 0.25s', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
          >
            <img src="/hazard-images/debris.webp" alt="Wires"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'absolute', top: 0, left: 0 }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />
            <span style={{ position: 'absolute', bottom: 8, left: 12, fontSize: 10, fontWeight: 700, letterSpacing: '0.25em',
              color: 'rgba(255,255,255,0.9)', fontFamily: 'monospace', textTransform: 'uppercase', zIndex: 2 }}>WIRES</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
