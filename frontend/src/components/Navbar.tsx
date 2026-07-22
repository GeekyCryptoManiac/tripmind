/**
 * Navbar — Redesigned Week 7 (FIXED)
 *
 * Behaviour (unchanged):
 *   - Homepage: fixed, transparent → solid on scroll
 *   - All other pages: solid always
 *
 * BUG FIX: Changed 'text-inkText' to 'text-white' when bg-inkText is applied.
 * Active links and CTA button now have visible white text on dark background.
 */

import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import logoAsset from '../assets/tagalong_logo.png';
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
          // Dashed rather than solid — a quiet nod to the dashed-stitch line
          // already drawn into the tag-icon logo mark itself.
          : 'bg-ink border-b border-dashed border-cream/15',
      ].join(' ')}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ──────────────────────────────────────── */}
          {/* Tag-and-T icon mark + wordmark, tightened into one lockup unit
              rather than a generic tile-plus-label. The icon tile keeps a
              light backdrop in both nav states — needed because the mark's
              linework is drawn in `ink`, which would otherwise vanish against
              the solid `bg-ink` navbar. */}
          <Link to="/" className="flex items-center gap-2 group">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 transition-all duration-300 ${
                isTransparent
                  ? 'bg-white/20 ring-1 ring-white/30'
                  : 'bg-cream/90 ring-1 ring-cream/10'
              }`}
            >
              <img
                src={logoAsset}
                alt="Tagalong Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <span className={`font-display text-xl font-semibold ${isTransparent ? 'text-inkText' : 'text-cream'}`}>
              Tagalong
            </span>
          </Link>

          {/* ── Nav links ─────────────────────────────────── */}
          {isHomePage && !isAuthenticated ? (

            /* Public homepage — scroll links + auth buttons */
            <div className="flex items-center gap-1">
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className={`px-4 py-2 rounded-xl font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                  isTransparent ? 'text-ink/70 hover:text-ink' : 'text-sage hover:text-cream'
                }`}
              >
                How it works
              </button>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className={`px-4 py-2 rounded-xl font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                  isTransparent ? 'text-ink/70 hover:text-ink' : 'text-sage hover:text-cream'
                }`}
              >
                Features
              </button>
              <Link
                to="/auth"
                className={`ml-2 px-4 py-2 rounded-xl font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                  isTransparent ? 'text-ink/70 hover:text-ink' : 'text-sage hover:text-cream'
                }`}
              >
                Log in
              </Link>
              <Link
                to="/auth"
                className={`px-4 py-2 rounded-xl font-mono text-[10px] uppercase tracking-[0.1em] transition-all duration-200 ${
                  isTransparent
                    ? 'bg-ink text-cream hover:bg-ink/80'
                    : 'bg-marigold text-ink hover:bg-marigold/90'
                }`}
              >
                Sign up
              </Link>
            </div>

          ) : (

            /* Authenticated / non-homepage — full nav */
            <div className="flex items-center gap-1">
              {NAV_LINKS.filter(({ path }) => path !== '/').map(({ path, label }) => {
                const active = isActive(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`px-4 py-2 rounded-xl font-mono text-[11px] tracking-[0.1em] uppercase transition-all duration-200 ${
                      active
                        ? 'bg-ink/30 text-cream'
                        : 'text-sage hover:text-cream hover:bg-ink/20'
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
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-marigold text-ink hover:bg-marigold/90 transition-all duration-200"
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
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-inkText-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-inkText">Fill a form</p>
                          <p className="text-xs text-inkText-tertiary mt-0.5">Set destination, dates & budget</p>
                        </div>
                      </button>

                      <div className="h-px bg-surface-muted mx-4" />

                      <Link
                        to="/chat"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-start gap-3 px-4 py-3.5 hover:bg-surface-bg transition-colors"
                      >
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-inkText-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-inkText">Plan with AI</p>
                          <p className="text-xs text-inkText-tertiary mt-0.5">Chat with Sherpa to plan</p>
                        </div>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {isAuthenticated && (
                <button
                  onClick={logout}
                  className="ml-2 px-3 py-2 rounded-xl font-mono text-[11px] tracking-[0.1em] uppercase text-sage hover:text-cream hover:bg-ink/20 transition-colors"
                >
                  Log out
                </button>
              )}
            </div>

          )}

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