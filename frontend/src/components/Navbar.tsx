/**
 * Navbar — Redesigned Week 7
 *
 * Behaviour (unchanged):
 *   - Homepage: fixed, transparent → solid on scroll
 *   - All other pages: solid always
 *
 * Visual language: matches TripsPage / HomePage tokens.
 *   - Solid state: warm white (surface-card) + subtle shadow
 *   - Transparent state: glass pill on the hero's soft background
 *   - Logo: small rounded square with display serif "T"
 *   - Active link: dark ink pill (matches CTA buttons elsewhere)
 */

import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoAsset from '../assets/tripMind_logo.png';

const NAV_LINKS = [
  { path: '/',      label: 'Home'     },
  { path: '/trips', label: 'My Trips' },
  { path: '/chat',  label: 'Chat'     },
] as const;

const Navbar: FC = () => {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    if (!isHomePage) { setScrolled(false); return; }
    const handleScroll = () => setScrolled(window.scrollY > 80);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

  const isTransparent = isHomePage && !scrolled;
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      className={[
        isHomePage ? 'fixed top-0 left-0 right-0 z-50' : 'relative',
        'transition-all duration-300',
        isTransparent
          ? 'bg-transparent'
          : 'bg-white/95 backdrop-blur-md border-b border-surface-muted shadow-card',
      ].join(' ')}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ──────────────────────────────────────── */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden transition-all duration-300 ${
                isTransparent
                  ? 'bg-white/20 ring-1 ring-white/30'
                  : 'bg-transparent' // Let the logo shine on the solid background
              }`}
            >
              <img 
                src={logoAsset} 
                alt="TripMind Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-display text-xl text-ink font-semibold">
              TripMind
            </span>
          </Link>

          {/* ── Nav links ─────────────────────────────────── */}
          <div className="flex items-center gap-1">
            {NAV_LINKS.map(({ path, label }) => {
              const active = isActive(path);
              if (isTransparent) {
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      active
                        ? 'bg-white/20 text-ink ring-2 ring-black/80'
                        : 'text-ink/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </Link>
                );
              }
              return (
                <Link
                  key={path}
                  to={path}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-ink text-ink'
                      : 'text-ink-secondary hover:text-ink hover:bg-surface-muted'
                  }`}
                >
                  {label}
                </Link>
              );
            })}

            {/* ── CTA button — always visible ─────────────── */}
            <Link
              to="/chat"
              className={`ml-3 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isTransparent
                  ? 'bg-white text-ink hover:bg-white/90'
                  : 'bg-ink text-ink hover:bg-ink/80'
              }`}
            >
              + New Trip
            </Link>
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;