/**
 * ActivityGalleryPage — Fan carousel gallery for an activity's photos.
 *
 * Reached from ActivityDetailPage's "View all in gallery" link, which
 * passes the already-fetched media/title via route state so presigned
 * URLs (1hr TTL) aren't re-requested unnecessarily. On a direct visit
 * (refresh, shared link) route state is absent, so we fall back to
 * fetching the activity ourselves.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../services/api';
import { FanCarousel, type FanCarouselItem } from '../components/FanCarousel';
import type { ActivityMedia } from '../types';

// ─────────────────────────────────────────────────────────────
// Route state contract — set by ActivityDetailPage's gallery link
// ─────────────────────────────────────────────────────────────

interface GalleryLocationState {
  photos?: ActivityMedia[];
  activityTitle?: string;
}

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

// `tag` isn't on ActivityMedia yet — reads undefined and stays hidden
// until a backend column exists; typed loosely so it lights up for free.
function toCarouselItem(photo: ActivityMedia): FanCarouselItem {
  return {
    id: photo.id,
    imageUrl: photo.presigned_url ?? photo.storage_url,
    alt: photo.caption ?? photo.filename,
    caption: photo.caption,
    badge: (photo as ActivityMedia & { tag?: string }).tag ?? null,
  };
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────

export default function ActivityGalleryPage() {
  const { tripId, activityId } = useParams<{ tripId: string; activityId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as GalleryLocationState | null;

  const [photos, setPhotos] = useState<ActivityMedia[] | null>(state?.photos ?? null);
  const [activityTitle, setActivityTitle] = useState<string | null>(state?.activityTitle ?? null);
  const [isLoading, setIsLoading] = useState(!state?.photos);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const numTripId = parseInt(tripId ?? '0');
  const numActId = parseInt(activityId ?? '0');

  // ── Fallback fetch — direct visit / refresh has no route state ──
  useEffect(() => {
    if (state?.photos) return;
    if (!tripId || !activityId) { navigate('/trips'); return; }

    const load = async () => {
      try {
        setIsLoading(true);
        const actData = await apiService.getActivityDetail(numTripId, numActId);
        setPhotos((actData.media ?? []).filter((m) => m.media_type === 'photo'));
        setActivityTitle(actData.title);
      } catch {
        setError('Could not load this gallery.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [tripId, activityId]); // eslint-disable-line react-hooks/exhaustive-deps

  const goBack = useCallback(() => {
    navigate(`/trips/${tripId}/activities/${activityId}`);
  }, [navigate, tripId, activityId]);

  // ── Keyboard nav ──────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setActiveIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setActiveIndex((i) => (photos ? Math.min(photos.length - 1, i + 1) : i));
      if (e.key === 'Escape') goBack();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [photos, goBack]);

  // ── Loading / error / empty ───────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1C2B24' }}>
        <div className="w-8 h-8 border-2 border-parchment/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !photos || !tripId || !activityId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ backgroundColor: '#1C2B24' }}>
        <p className="text-parchment/80">{error ?? 'Gallery not found.'}</p>
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-sm text-gold hover:text-gold/80 transition-colors font-medium"
        >
          <ChevronLeftIcon />
          Back to activity
        </button>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ backgroundColor: '#1C2B24' }}>
        <p className="text-parchment/80">No photos yet.</p>
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-sm text-gold hover:text-gold/80 transition-colors font-medium"
        >
          <ChevronLeftIcon />
          Back to activity
        </button>
      </div>
    );
  }

  const items = photos.map(toCarouselItem);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#1C2B24' }}>
      {/* ── Header / back nav ─────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-4 max-w-2xl mx-auto w-full">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-sm text-parchment/70 hover:text-parchment transition-colors font-medium"
        >
          <ChevronLeftIcon />
          Back{activityTitle ? ` to ${activityTitle}` : ''}
        </button>
        <span className="font-mono text-[11px] text-parchment/50 tracking-[0.08em]">
          {activeIndex + 1} / {photos.length}
        </span>
      </div>

      <FanCarousel
        items={items}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        className="flex-1"
        stageClassName="flex-1"
      />
    </div>
  );
}
