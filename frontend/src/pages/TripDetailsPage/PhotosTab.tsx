/**
 * PhotosTab — trip-wide photo gallery.
 *
 * Flattens every activity's photos into one chronological fan-carousel
 * stream (day, then sort_order, then time), reusing the same FanCarousel
 * mechanic as the per-activity gallery. Each photo's badge shows the
 * originating activity's title as attribution instead of a photo tag.
 */

import { useMemo, useState } from 'react';
import { FanCarousel, type FanCarouselItem } from '../../components/FanCarousel';
import type { Trip, Activity, ActivityMedia } from '../../types';

const CameraIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

function buildGalleryItems(activities: Activity[]): FanCarouselItem[] {
  const sorted = [...activities].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return (a.time ?? '').localeCompare(b.time ?? '');
  });

  const items: FanCarouselItem[] = [];
  for (const activity of sorted) {
    const photos = (activity.media ?? []).filter((m: ActivityMedia) => m.media_type === 'photo');
    for (const photo of photos) {
      items.push({
        id: photo.id,
        imageUrl: photo.presigned_url ?? photo.storage_url,
        alt: photo.caption ?? photo.filename,
        caption: photo.caption,
        badge: activity.title,
      });
    }
  }
  return items;
}

export default function PhotosTab({ trip }: { trip: Trip }) {
  const items = useMemo(() => buildGalleryItems(trip.activities), [trip.activities]);
  const [activeIndex, setActiveIndex] = useState(0);

  const clampedIndex = Math.min(activeIndex, Math.max(0, items.length - 1));

  return (
    <div className="rounded-2xl overflow-hidden ring-1 ring-black/[0.03] shadow-sm bg-ink">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4">
        <h3 className="font-mono text-[11px] tracking-[0.1em] uppercase text-cream/60">Trip Photos</h3>
        {items.length > 0 && (
          <span className="font-mono text-[11px] text-cream/50 tracking-[0.08em]">
            {clampedIndex + 1} / {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 text-cream/50 py-16 px-6 text-center">
          <CameraIcon />
          <p className="text-sm">No photos yet — check in to activities and add some along the way.</p>
        </div>
      ) : (
        <FanCarousel
          items={items}
          activeIndex={clampedIndex}
          onActiveIndexChange={setActiveIndex}
          stageClassName="h-[420px]"
        />
      )}
    </div>
  );
}
