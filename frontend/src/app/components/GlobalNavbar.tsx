'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { label: 'Map',           href: '/map'    },
  { label: 'Report',        href: '/report' },
  { label: 'Documentation', href: '#'       },
  { label: 'Status',        href: '#'       },
  { label: 'Globe',         href: '/globe'  },
];

export default function GlobalNavbar() {
  const [hovered, setHovered] = useState<string | null>(null);
  const pathname = usePathname();

  // Landing page has its own floating nav — hide the strip there
  if (pathname === '/') return null;

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 48,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 4vw',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.35em',
          color: '#fff',
          textDecoration: 'none',
          fontFamily: 'var(--font-geist-sans, sans-serif)',
          userSelect: 'none',
        }}
      >
        ARGUS
      </Link>

      {/* Nav links */}
      <ul style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 0, height: '100%',
        display: 'flex', alignItems: 'center', gap: 32, listStyle: 'none', margin: 0, padding: 0
      }}>
        {NAV_LINKS.map(({ label, href }) => (
          <li key={label}>
            <Link
              href={href}
              style={{
                fontSize: 13,
                color: hovered === label ? '#fff' : 'rgba(255,255,255,0.5)',
                textDecoration: 'none',
                letterSpacing: '0.02em',
                fontFamily: 'var(--font-geist-sans, sans-serif)',
                transition: 'color 0.2s',
              }}
              onMouseEnter={() => setHovered(label)}
              onMouseLeave={() => setHovered(null)}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Live indicator */}
      {(pathname === '/map' || pathname === '/globe') ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#4ade80',
            boxShadow: '0 0 6px #4ade80',
            display: 'inline-block',
            animation: 'argus-pulse 2s infinite',
          }} />
          <span style={{
            fontSize: 10,
            letterSpacing: '0.2em',
            color: 'rgba(255,255,255,0.3)',
            fontFamily: 'var(--font-geist-mono, monospace)',
            textTransform: 'uppercase',
          }}>LIVE</span>
        </div>
      ) : (
        <div style={{ width: 45 }} /> /* placeholder to keep flex alignment */
      )}

      <style>{`
        @keyframes argus-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.25; }
        }
      `}</style>
    </nav>
  );
}
