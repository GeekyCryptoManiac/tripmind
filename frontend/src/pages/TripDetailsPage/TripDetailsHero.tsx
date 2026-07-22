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
import TripStatusBadge from '../../components/TripStatusBadge';

interface TripDetailsHeroProps {
  trip: Trip;
  phase: TripPhase;
  onBack: () => void;
  onTripUpdate?: (trip: Trip) => void;
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

  // Hero stat row — same "$" + toLocaleString budget convention used
  // everywhere else in the app (TripSummaryCard, OverviewTab, TripCard);
  // no currency-aware or abbreviated ("k") formatting exists anywhere in
  // the codebase to match instead. Null budget falls back to "—" rather
  // than the sidebar's full "No budget set" sentence, since this is a
  // compact stat slot, not a sentence-length label.
  const activitiesCount = trip.activities.length;
  const checkedInCount = trip.activities.filter((a) => a.checked_in_at).length;
  const budgetDisplay = trip.budget ? `$${trip.budget.toLocaleString()}` : '—';

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
    <div className="relative w-full overflow-hidden group/hero" style={{ minHeight: '300px' }}>

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
        // Cartographic placeholder
        <>
          <div className="absolute inset-0 bg-ink" />
          <div className="absolute inset-0 carto-grid opacity-30 pointer-events-none" />
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
            className={`flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-inkText text-xs font-semibold rounded-xl ring-1 ring-black/10 hover:bg-white transition-colors shadow-sm cursor-pointer ${isUploading || isDeleting ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <CameraIcon />
            {isUploading ? 'Uploading…' : 'Change'}
          </label>
          <button
            onClick={handleDelete}
            disabled={isDeleting || isUploading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-poppy text-xs font-semibold rounded-xl ring-1 ring-black/10 hover:bg-white transition-colors shadow-sm disabled:opacity-60"
          >
            <TrashIcon />
            {isDeleting ? 'Removing…' : 'Remove'}
          </button>
        </div>
      )}

      {/* ── Upload CTA (shown only when no photo yet) ─────── */}
      {!photoUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-ink/60 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 ring-1 ring-cream/20">
            <div className="text-sage">
              <CameraIcon />
            </div>
          </div>
          <p className="text-cream/70 text-sm font-medium">Add Your Trip Photos</p>
          <label
            htmlFor={`photo-upload-${trip.id}`}
            className={`mt-3 px-4 py-2 bg-ink/40 backdrop-blur-sm text-cream text-xs font-semibold rounded-xl ring-1 ring-cream/20 hover:bg-ink/60 transition-colors shadow-sm cursor-pointer ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}
          >
            {isUploading ? 'Uploading…' : '+ Upload Photo'}
          </label>
        </div>
      )}

      {/* ── Error banner ─────────────────────────────────── */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-poppy-tint border border-poppy/30 text-poppy text-xs font-medium px-4 py-2 rounded-xl shadow-sm">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button onClick={() => setError(null)} className="ml-1 hover:text-poppy/70">✕</button>
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
              <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-sage drop-shadow-sm mb-1">
                {routeLabel}
              </p>
            )}
            <h1 className="font-display text-[2rem] drop-shadow-sm text-cream">
              {trip.destination}
            </h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <TripStatusBadge status={phase} />
              <span className="text-sm font-medium drop-shadow-sm text-cream/70">
                {formatDateShort(trip.start_date)}
                {trip.end_date && ` – ${formatDateShort(trip.end_date)}`}
                {endYear && `, ${endYear}`}
              </span>
            </div>

            {/* Stat row — reuses the same bottom gradient overlay as the rest of
                this block, so it stays legible against both an uploaded photo
                and the ink placeholder background without any extra handling. */}
            <div className="flex items-center gap-6 mt-3">
              <div>
                <p className="font-display text-2xl font-semibold text-marigold leading-none drop-shadow-sm">
                  {activitiesCount}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-cream/60 mt-1">
                  Activities
                </p>
              </div>
              <div>
                <p className="font-display text-2xl font-semibold text-marigold leading-none drop-shadow-sm">
                  {budgetDisplay}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-cream/60 mt-1">
                  Budgeted
                </p>
              </div>
              <div>
                <p className="font-display text-2xl font-semibold text-marigold leading-none drop-shadow-sm">
                  {checkedInCount}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-cream/60 mt-1">
                  Checked In
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onBack}
            className="pointer-events-auto font-mono text-[10px] tracking-[0.1em] uppercase text-sage hover:text-cream transition-colors flex items-center gap-1 bg-ink/40 backdrop-blur-sm px-3 py-1.5 rounded-xl ring-1 ring-cream/10"
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
