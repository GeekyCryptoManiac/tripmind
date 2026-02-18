/**
 * TripCard — Redesigned Week 7
 *
 * Layout: photo panel on top (Unsplash API), trip details below.
 * Status determines the coloured ring around the card, not the image.
 *
 * Image priority (in order):
 *   1. FUTURE: trip_metadata.cover_photo — user's own uploaded photo
 *      Uncomment the override line in fetchUnsplashPhoto() when photo upload is ready.
 *   2. Unsplash API random photo by destination keyword (cached per session)
 *   3. Status gradient fallback — if Unsplash fails to load
 *
 * Environment variable required:
 *   VITE_UNSPLASH_ACCESS_KEY — Unsplash API access key
 *
 * Used by:
 *   - TripsPage (list view)
 *   - ChatInterface (when agent creates a new trip)
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Trip } from '../types';
import type { TripPhase } from '../utils/tripStatus';

// ── Helpers ───────────────────────────────────────────────────

function formatDate(dateString: string | null): string {
  if (!dateString) return 'TBD';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return dateString; }
}

// ── Unsplash API integration ──────────────────────────────────

// Session-level cache: destination → { url, photographer, profileUrl }
const photoCache = new Map<string, { url: string; photographer: string; profileUrl: string }>();

interface UnsplashPhoto {
  url: string;
  photographer: string;
  profileUrl: string;
}

/** Fetch a random photo from Unsplash API for a destination.
 *  Cached per session to avoid redundant API calls. */
async function fetchUnsplashPhoto(trip: Trip): Promise<UnsplashPhoto | null> {
  // FUTURE: user-uploaded cover photo (uncomment when photo upload is implemented)
  // if (trip.trip_metadata?.cover_photo) {
  //   return { url: trip.trip_metadata.cover_photo, photographer: 'You', profileUrl: '#' };
  // }

  const destination = trip.destination.toLowerCase();
  
  // Check cache first
  if (photoCache.has(destination)) {
    return photoCache.get(destination)!;
  }

  // Call Unsplash API
  const accessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.warn('[TripCard] VITE_UNSPLASH_ACCESS_KEY not configured');
    return null;
  }

  try {
    const query = `${destination} travel landscape`;
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${accessKey}` } }
    );

    if (!res.ok) throw new Error(`Unsplash API error: ${res.status}`);

    const data = await res.json();
    const photo: UnsplashPhoto = {
      url: data.urls.regular,
      photographer: data.user.name,
      profileUrl: data.user.links.html,
    };

    // Cache it
    photoCache.set(destination, photo);
    return photo;
  } catch (err) {
    console.error('[TripCard] Unsplash fetch failed:', err);
    return null;
  }
}

/** Status → ring colour around the card */
const STATUS_RING: Record<string, string> = {
  planning:  'ring-2 ring-amber-400',
  booked:    'ring-2 ring-emerald-400',
  completed: 'ring-2 ring-brand-500',
};

/** Status → gradient used when image fails to load */
const STATUS_GRADIENT: Record<string, string> = {
  planning:  'from-amber-400  to-orange-500',
  booked:    'from-emerald-400 to-teal-500',
  completed: 'from-brand-400  to-brand-600',
};

/** Status badge config */
const STATUS_BADGE: Record<string, { dot: string; badge: string; label: string }> = {
  planning:  { dot: 'bg-amber-400',   badge: 'bg-amber-50  text-amber-700  ring-amber-200',   label: 'Planning'  },
  booked:    { dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: 'Booked'    },
  completed: { dot: 'bg-brand-500',   badge: 'bg-brand-50  text-brand-700  ring-brand-200',   label: 'Completed' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? {
    dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-600 ring-gray-200', label: status,
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Image panel ───────────────────────────────────────────────
// Handles Unsplash API fetch, load/error states, and attribution.
interface ImagePanelProps {
  trip: Trip;
  displayStatus: string;
}

function ImagePanel({ trip, displayStatus }: ImagePanelProps) {
  const [photo, setPhoto] = useState<UnsplashPhoto | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const gradient = STATUS_GRADIENT[displayStatus] ?? 'from-gray-400 to-gray-600';
  const initial = trip.destination.charAt(0).toUpperCase();

  // Fetch Unsplash photo on mount
  useEffect(() => {
    let cancelled = false;
    fetchUnsplashPhoto(trip).then((p) => {
      if (!cancelled) setPhoto(p);
    });
    return () => { cancelled = true; };
  }, [trip.id, trip.destination]);

  // Show gradient fallback when: loading, errored, or no photo returned
  // const showFallback = !photo || errored || !loaded;

  return (
    <div className="relative w-full h-44 overflow-hidden rounded-t-2xl">
      {/* Gradient fallback — always rendered underneath */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        <span className="font-display text-6xl text-white/30 select-none">{initial}</span>
      </div>

      {/* Unsplash image — fades in once loaded */}
      {photo && !errored && (
        <>
          <img
            src={photo.url}
            alt={trip.destination}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
          />
          {/* Attribution badge — required by Unsplash API terms */}
          {loaded && (
            <a
              href={`${photo.profileUrl}?utm_source=tripmind&utm_medium=referral`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm text-white text-xs hover:bg-black/60 transition-colors flex items-center gap-1"
            >
              📷 {photo.photographer}
            </a>
          )}
        </>
      )}

      {/* Bottom scrim — destination label always readable over photo */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />

      {/* Destination name overlaid on photo */}
      <div className="absolute bottom-0 inset-x-0 px-4 pb-3 flex items-end justify-between">
        <div>
          <h3 className="font-semibold text-white text-base leading-tight drop-shadow-sm">
            {trip.destination}
          </h3>
          {trip.duration_days && (
            <p className="text-white/70 text-xs mt-0.5">{trip.duration_days}-day trip</p>
          )}
        </div>
        {/* Status badge floated right, over the image */}
        <StatusBadge status={displayStatus} />
      </div>
    </div>
  );
}

// ── Detail cell ───────────────────────────────────────────────
function DetailCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-surface-bg rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-ink-tertiary mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-medium text-ink truncate">{value}</p>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────
interface TripCardProps {
  trip: Trip;
  onClick?: () => void;
  phase?: TripPhase; // Optional: use computed phase if provided, fallback to trip.status
}

export default function TripCard({ trip, onClick, phase }: TripCardProps) {
  // Use computed phase if provided, otherwise fallback to stored status
  const displayStatus = phase ?? trip.status;
  const ring = STATUS_RING[displayStatus] ?? 'ring-2 ring-gray-300';

  return (
    <motion.div
      onClick={onClick}
      whileHover={onClick ? { y: -3 } : undefined}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-shadow overflow-hidden ${ring} ${
        onClick ? 'cursor-pointer' : ''
      } group`}
    >
      {/* ── Photo panel ───────────────────────────────────── */}
      <ImagePanel trip={trip} displayStatus={displayStatus} />

      {/* ── Details body ──────────────────────────────────── */}
      <div className="p-5">
        <div className="grid grid-cols-2 gap-2.5">
          <DetailCell
            icon={
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            label="Dates"
            value={trip.start_date ? formatDate(trip.start_date) : 'Not set'}
          />
          <DetailCell
            icon={
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            label="Budget"
            value={trip.budget ? `$${trip.budget.toLocaleString()}` : 'Not set'}
          />
          {trip.end_date && (
            <DetailCell
              icon={
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              }
              label="Return"
              value={formatDate(trip.end_date)}
            />
          )}
          {trip.travelers_count > 0 && (
            <DetailCell
              icon={
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              label="Travelers"
              value={`${trip.travelers_count}`}
            />
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3.5 border-t border-surface-muted flex items-center justify-between">
          <span className="text-xs text-ink-tertiary">
            {trip.trip_metadata?.notes ? 'Has notes' : 'No notes yet'}
          </span>
          {onClick && (
            <span className="text-xs font-semibold text-ink group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
              View details
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}