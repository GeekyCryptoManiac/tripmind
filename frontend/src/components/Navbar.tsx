/**
 * Navbar — Redesigned Week 7 (FIXED)
 *
 * Behaviour (unchanged):
 *   - Homepage: fixed, transparent → solid on scroll
 *   - All other pages: solid always
 *
 * BUG FIX: Changed 'text-ink' to 'text-white' when bg-ink is applied.
 * Active links and CTA button now have visible white text on dark background.
 */

import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import logoAsset from '../assets/tripMind_logo.png';
import { useUser } from '../context/UserContext';
import NewTripModal from './NewTripModal';
import type { Trip } from '../types';

const NAV_LINKS = [
  { path: '/',      label: 'Home'     },
  { path: '/trips', label: 'My Trips' },
  { path: '/chat',  label: 'Chat'     },
] as const;

const Navbar: FC = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const { logout, isAuthenticated } = useUser();
  const [scrolled,      setScrolled]      = useState(false);
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTripCreated = (trip: Trip) => {
    setShowFormModal(false);
    navigate(`/trips/${trip.id}`);
  };

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
    <>
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
                  : 'bg-transparent'
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
                      ? 'bg-ink text-white'
                      : 'text-ink-secondary hover:text-ink hover:bg-surface-muted'
                  }`}
                >
                  {label}
                </Link>
              );
            })}

            {/* ── New Trip dropdown ─────────────────────────── */}
            <div className="relative ml-3" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isTransparent
                    ? 'bg-white text-ink hover:bg-white/90'
                    : 'bg-ink text-white hover:bg-ink/80'
                }`}
              >
                + New Trip
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0,  scale: 1    }}
                    exit={{    opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-modal ring-1 ring-black/8 overflow-hidden z-50"
                  >
                    <button
                      onClick={() => { setDropdownOpen(false); setShowFormModal(true); }}
                      className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-surface-bg transition-colors"
                    >
                      <span className="mt-0.5 text-base">📋</span>
                      <div>
                        <p className="text-sm font-semibold text-ink">Fill a form</p>
                        <p className="text-xs text-ink-tertiary mt-0.5">Set destination, dates & budget</p>
                      </div>
                    </button>

                    <div className="h-px bg-surface-muted mx-4" />

                    <Link
                      to="/chat"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-start gap-3 px-4 py-3.5 hover:bg-surface-bg transition-colors"
                    >
                      <span className="mt-0.5 text-base">✨</span>
                      <div>
                        <p className="text-sm font-semibold text-ink">Plan with AI</p>
                        <p className="text-xs text-ink-tertiary mt-0.5">Chat with TripMind to plan</p>
                      </div>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {isAuthenticated && (
              <button
                onClick={logout}
                className="ml-2 px-3 py-2 rounded-xl text-sm font-medium text-ink-secondary hover:text-ink hover:bg-surface-muted transition-colors"
              >
                Log out
              </button>
            )}

          </div>

        </div>
      </div>
    </nav>

    <NewTripModal
      isOpen={showFormModal}
      onClose={() => setShowFormModal(false)}
      onCreate={handleTripCreated}
    />
  </>
  );
};

export default Navbar;