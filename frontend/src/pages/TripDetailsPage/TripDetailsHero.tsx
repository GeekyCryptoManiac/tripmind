/**
 * TripDetailsHero — Photo Upload Support
 *
 * Two states:
 *   1. No photo — shows gradient background + camera upload CTA
 *   2. Has photo — photo fills the hero, hover reveals Change / Remove controls
 *
 * Photo URL is stored as a relative path (/uploads/filename) in cover_image_url.
 * The frontend prepends VITE_API_URL to construct the full src.
 */

import { useRef, useState } from 'react';
import { apiService } from '../../services/api';
import type { Trip } from '../../types';
import type { TripPhase } from '../../utils/tripStatus';
import { formatDateShort } from './helpers';

interface TripDetailsHeroProps {
  trip: Trip;
  phase: TripPhase;
  onBack: () => void;
  onTripUpdate?: (trip: Trip) => void;
}

// Status badge config
const STATUS_CONFIG = {
  planning:  { label: 'Planning',  dot: 'bg-amber-400',  badge: 'bg-amber-50  text-amber-700  ring-amber-200'  },
  booked:    { label: 'Booked',    dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  completed: { label: 'Completed', dot: 'bg-brand-500',   badge: 'bg-brand-50  text-brand-700  ring-brand-200'  },
} as const;

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? {
    label: status, dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-600 ring-gray-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

const CameraIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export default function TripDetailsHero({ trip, phase, onBack, onTripUpdate }: TripDetailsHeroProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const endYear = trip.end_date
    ? new Date(trip.end_date).getFullYear()
    : trip.start_date
    ? new Date(trip.start_date).getFullYear()
    : null;

  // Full route label from waypoints, e.g. "Singapore → Helsinki → Tallinn"
  const sortedWps = [...(trip.waypoints ?? [])].sort((a, b) => a.order_index - b.order_index);
  const routeLabel =
    sortedWps.length > 1
      ? sortedWps.map((w) => w.city).join(' → ')
      : trip.origin && trip.origin !== trip.destination
      ? `${trip.origin} → ${trip.destination}`
      : null;

  // Build absolute photo URL from the stored relative path
  const apiBase = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';
  const photoUrl = trip.cover_image_url ? `${apiBase}${trip.cover_image_url}` : null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      const updated = await apiService.uploadTripPhoto(trip.id, file);
      onTripUpdate?.(updated);
    } catch (err: unknown) {
      console.error('[TripDetailsHero] Photo upload failed:', err);
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? 'Upload failed — make sure the backend is running.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);
    try {
      const updated = await apiService.deleteTripPhoto(trip.id);
      onTripUpdate?.(updated);
    } catch (err: unknown) {
      console.error('[TripDetailsHero] Photo delete failed:', err);
      setError('Could not remove photo — please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative w-full overflow-hidden group/hero" style={{ minHeight: '260px' }}>

      {/* Hidden file input — use label htmlFor to trigger it reliably */}
      <input
        ref={fileInputRef}
        id={`photo-upload-${trip.id}`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Background layer ─────────────────────────────── */}
      {photoUrl ? (
        // Uploaded photo
        <img
          src={photoUrl}
          alt={trip.destination}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        // Gradient placeholder
        <>
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #f3f0ff 0%, #fef3c7 50%, #F7F5F2 100%)' }}
          />
          <div
            className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(232,228,248,0.6) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
        </>
      )}

      {/* ── Photo controls (visible on hover when photo exists) ── */}
      {photoUrl && (
        <div className="absolute inset-0 bg-black/0 group-hover/hero:bg-black/25 transition-all duration-300 pointer-events-none" />
      )}
      {photoUrl && (
        <div className="absolute top-4 right-16 flex gap-2 opacity-0 group-hover/hero:opacity-100 transition-opacity duration-200 z-10">
          <label
            htmlFor={`photo-upload-${trip.id}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-ink text-xs font-semibold rounded-xl ring-1 ring-black/10 hover:bg-white transition-colors shadow-sm cursor-pointer ${isUploading || isDeleting ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <CameraIcon />
            {isUploading ? 'Uploading…' : 'Change'}
          </label>
          <button
            onClick={handleDelete}
            disabled={isDeleting || isUploading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-red-600 text-xs font-semibold rounded-xl ring-1 ring-black/10 hover:bg-white transition-colors shadow-sm disabled:opacity-60"
          >
            <TrashIcon />
            {isDeleting ? 'Removing…' : 'Remove'}
          </button>
        </div>
      )}

      {/* ── Upload CTA (shown only when no photo yet) ─────── */}
      {!photoUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/40 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 ring-1 ring-white/50">
            <div className="text-ink-tertiary">
              <CameraIcon />
            </div>
          </div>
          <p className="text-ink-secondary text-sm font-medium">Add Your Trip Photos</p>
          <label
            htmlFor={`photo-upload-${trip.id}`}
            className={`mt-3 px-4 py-2 bg-white/60 backdrop-blur-sm text-ink text-xs font-semibold rounded-xl ring-1 ring-black/5 hover:bg-white/80 transition-colors shadow-sm cursor-pointer ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}
          >
            {isUploading ? 'Uploading…' : '+ Upload Photo'}
          </label>
        </div>
      )}

      {/* ── Error banner ─────────────────────────────────── */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-4 py-2 rounded-xl shadow-sm">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button onClick={() => setError(null)} className="ml-1 hover:text-red-900">✕</button>
        </div>
      )}

      {/* ── Bottom overlay — trip name + status + back ────── */}
      {/* pointer-events-none on the wrapper so the transparent top of the gradient
          doesn't block the upload CTA sitting behind it in the center of the hero.
          pointer-events-auto is restored on the Back button below. */}
      <div className="absolute bottom-0 left-0 right-0 px-6 py-5 bg-gradient-to-t from-black/40 to-transparent pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-end justify-between">
          <div>
            {routeLabel && (
              <p className={`text-sm font-medium drop-shadow-sm mb-1 ${photoUrl ? 'text-white/80' : 'text-ink-secondary/80'}`}>
                {routeLabel}
              </p>
            )}
            <h1 className={`font-display text-4xl drop-shadow-sm ${photoUrl ? 'text-white' : 'text-ink'}`}>
              {trip.destination}
            </h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <StatusBadge status={phase} />
              <span className={`text-sm font-medium drop-shadow-sm ${photoUrl ? 'text-white/80' : 'text-ink-secondary'}`}>
                {formatDateShort(trip.start_date)}
                {trip.end_date && ` – ${formatDateShort(trip.end_date)}`}
                {endYear && `, ${endYear}`}
              </span>
            </div>
          </div>
          <button
            onClick={onBack}
            className="pointer-events-auto text-ink-secondary text-sm font-medium hover:text-ink transition-colors flex items-center gap-1 bg-white/40 backdrop-blur-sm px-3 py-1.5 rounded-xl ring-1 ring-black/5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        </div>
      </div>

    </div>
  );
}
