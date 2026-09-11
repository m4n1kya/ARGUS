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
  
  useEffect(() => {
    // Isolate the global rem scaler to this page only
    document.documentElement.style.fontSize = '6.9444444444vw';
    return () => {
      document.documentElement.style.fontSize = '';
    };
  }, []);
  
  // Refs for animated elements
  const btnCircle = useRef(null);
  const header = useRef(null);
  const book = useRef(null);
  const open = useRef(null);
  const copy = useRef(null);
  const scrollToRows = useRef<HTMLSpanElement[]>([]);
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
        .fromTo(btnCircle.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: fourtyFrames, ease: customEaseIn}, 0)
        .fromTo(btnCircle.current, { scale: 0.417 }, { scale: 1, duration: fourtyFrames, ease: customEaseIn}, 0)
        .fromTo(header.current, {y: '-3.4722vw'}, {y: '0.0000vw', duration: fourtyFrames, ease: customEaseIn}, 0)
        .fromTo(eve.current, {x: '18.7500vw'}, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn}, 0)
        .fromTo(book.current, {y: '3.4722vw'}, {y: '0.0000vw', duration: fourtyFrames, ease: customEaseIn}, twoFrames)
        .fromTo(st_1.current, {x: '14.5833vw'}, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn}, twoFrames)
        .fromTo(a.current, {x: '-8.3333vw'}, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn}, twoFrames)
        .fromTo(ory.current, {x: '-22.2222vw'}, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn}, twoFrames)
        .fromTo(open.current, {y: '2.0833vw'}, {y: '0.0000vw', duration: fourtyFrames, ease: customEaseIn}, fourFrames)
        .fromTo(btnText.current, {y: '2.7778vw'}, {y: '0.0000vw', duration: fourtyFrames, ease: customEaseIn}, fourFrames)
        .fromTo(ry.current, {x: '-13.8889vw'}, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn}, fourFrames)
        .fromTo(reet.current, {x: '-21.5278vw'}, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn}, fourFrames)
        .fromTo(tells.current, {x: '29.8611vw'}, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn}, fourFrames)
        .fromTo(st_2.current, {x: '13.1944vw'}, { x: '0.0000vw', duration: fiftyFrames, ease: customEaseIn}, fourFrames)
        .fromTo(copy.current, {y: '2.7778vw'}, {y: '0.0000vw', duration: fourtyFrames, ease: customEaseIn}, sixFrames)
        .fromTo(scrollToRows.current, {y: '3.4722vw'}, {y: '0.0000vw', duration: fourtyFrames, ease: customEaseIn}, sixFrames)
        .fromTo('.floating-badge', {autoAlpha: 0, y: 20}, {autoAlpha: 1, y: 0, duration: 1.0, stagger: 0.1, ease: customEaseIn}, twoFrames);
  }, { scope: root });

  const addToScrollRefs = (el: HTMLSpanElement) => {
    if (el && !scrollToRows.current.includes(el)) {
      scrollToRows.current.push(el);
    }
  };

  return (
    <main className="landing-container" ref={root}>
      <header className="header" ref={header}>
        <div className="flex-wrapper">
          <div className="logo-wrap">
            <span className="btn-2 tracking-widest text-xl">ARGUS</span>
          </div>
          <ul className="header-menu">
            <li className="header-menu__item header-text-1 hover:text-white/70 transition-colors">
              <Link href="/map">Map</Link>
            </li>
            <li className="header-menu__item header-text-1 hover:text-white/70 transition-colors">
              <Link href="/report">Report</Link>
            </li>
            <li className="header-menu__item header-text-1 hover:text-white/70 transition-colors">Documentation</li>
            <li className="header-menu__item header-text-1 hover:text-white/70 transition-colors">System Status</li>
            <li className="header-menu__item header-text-1 hover:text-white/70 transition-colors">Command</li>
          </ul>
        </div>
      </header>
      
      <section className="hero">
        <video className="hero-video" autoPlay muted loop playsInline>
          <source src="https://cdn.zajno.com/dev/codepen/fossil/fossil.mp4" type="video/mp4"/>
        </video>
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
      
          <div className="copyright">
            <span className="desc-1" ref={copy}>2026 ARGUS SYSTEM ©</span>
          </div>
          
          <div className="scroll-to">
            <div className="scroll-to__row">
              <span className="desc-1" ref={addToScrollRefs}>Scroll to access</span>
            </div>
            <div className="scroll-to__row">
              <span className="desc-1" ref={addToScrollRefs}>surveillance feed</span>
            </div>
          </div>
          
          <Link href="/map" className="book-btn">
            <div className="book-btn__circle" ref={btnCircle}></div>
            <div className="btn-text">
              <span className="btn-1" ref={btnText}>
                MAP
              </span>
            </div>
          </Link>
        </div>
        
        {/* Aesthetic Floating Hazard Quick-Links */}
        <Link href="/map?hazard=garbage" className="floating-badge opacity-0 absolute top-[20%] right-[5%] px-[20px] py-[10px] bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-white/80 hover:text-white text-[12px] tracking-wider transition-all duration-300 flex items-center gap-2 font-sans z-10 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]">
          <span className="w-[10px] h-[10px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"></span> GARBAGE
        </Link>
        <Link href="/map?hazard=electrical" className="floating-badge opacity-0 absolute top-[30%] right-[5%] px-[20px] py-[10px] bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-white/80 hover:text-white text-[12px] tracking-wider transition-all duration-300 flex items-center gap-2 font-sans z-10 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]">
          <span className="w-[10px] h-[10px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"></span> WIRES
        </Link>
        
        <Link href="/map?hazard=potholes" className="floating-badge opacity-0 absolute bottom-[25%] left-[5%] px-[20px] py-[10px] bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-white/80 hover:text-white text-[12px] tracking-wider transition-all duration-300 flex items-center gap-2 font-sans z-10 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]">
          <span className="w-[10px] h-[10px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"></span> POTHOLES
        </Link>
        <Link href="/map?hazard=construction" className="floating-badge opacity-0 absolute bottom-[15%] left-[5%] px-[20px] py-[10px] bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-white/80 hover:text-white text-[12px] tracking-wider transition-all duration-300 flex items-center gap-2 font-sans z-10 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]">
          <span className="w-[10px] h-[10px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"></span> CONSTRUCTION
        </Link>
      </section>
    </main>
  );
}
