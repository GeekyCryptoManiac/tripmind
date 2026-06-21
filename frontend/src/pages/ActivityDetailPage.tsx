/**
 * ActivityDetailPage — Activity diary, checkin, media, and navigation.
 *
 * Temporal states (computed from trip.start_date + activity.day, never from DB status):
 *   'after'  — activity date < today  → visited layout
 *   'today'  — activity date = today  → on-the-day layout
 *   'before' — activity date > today  → pre-visit layout
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiService } from '../services/api';
import type { Activity, ActivityMedia, Trip } from '../types';

// ─────────────────────────────────────────────────────────────
// Types / helpers
// ─────────────────────────────────────────────────────────────

type TemporalState = 'before' | 'today' | 'after';

function toUTCMidnight(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function computeTemporalState(tripStartDate: string | null, activityDay: number): TemporalState {
  if (!tripStartDate) return 'before';
  const start = toUTCMidnight(tripStartDate);
  const actMs = start.getTime() + (activityDay - 1) * 86_400_000;
  const actDate = new Date(actMs);
  actDate.setUTCHours(0, 0, 0, 0);

  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  if (actDate < today) return 'after';
  if (actDate.getTime() === today.getTime()) return 'today';
  return 'before';
}

function formatDate(tripStartDate: string | null, day: number): string {
  if (!tripStartDate) return `Day ${day}`;
  const start = toUTCMidnight(tripStartDate);
  const d = new Date(start.getTime() + (day - 1) * 86_400_000);
  return d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatCheckinTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ─────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────

const ChevronLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);
const ChevronDownIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);
const MapPinIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const ClockIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const CameraIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const ClipboardIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
  </svg>
);
const ExternalLinkIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);
const LightbulbIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
  </svg>
);
const DocumentIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// Activity type icons
const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  activity: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  dining: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  ),
  flight: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    </svg>
  ),
  hotel: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  transport: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 animate-pulse">
      <div className="h-4 w-24 bg-card-border rounded" />
      <div className="h-8 w-3/4 bg-card-border rounded" />
      <div className="h-4 w-1/2 bg-terrain rounded" />
      <div className="h-40 bg-terrain/40 rounded-2xl" />
      <div className="h-28 bg-terrain/40 rounded-2xl" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared sections
// ─────────────────────────────────────────────────────────────

function DescriptionBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 200;
  return (
    <div>
      <p className={`text-sm text-ink leading-relaxed ${!expanded && long ? 'line-clamp-3' : ''}`}>
        {text}
      </p>
      {long && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-forest font-medium mt-1 hover:underline"
        >
          {expanded ? 'See less' : 'See more'}
        </button>
      )}
    </div>
  );
}

function NotesSection({
  localNotes,
  saveStatus,
  onChange,
}: {
  localNotes: string;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  onChange: (v: string) => void;
}) {
  return (
    <section className="bg-parchment rounded-2xl border border-card-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-sage">Your notes</h3>
        {saveStatus === 'saving' && (
          <span className="text-xs text-sage animate-pulse">Saving…</span>
        )}
        {saveStatus === 'saved' && (
          <span className="text-xs text-emerald-600 font-medium">✓ Saved</span>
        )}
        {saveStatus === 'error' && (
          <span className="text-xs text-red-500">Failed to save</span>
        )}
      </div>
      <textarea
        value={localNotes}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Jot down memories, tips, or things you want to remember…"
        rows={4}
        className="w-full bg-terrain/20 border border-card-border rounded-xl p-3 text-sm text-ink placeholder-sage focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent focus:bg-parchment resize-none transition-colors"
      />
    </section>
  );
}

function BookingSection({
  activity,
  copiedRef,
  onCopyRef,
}: {
  activity: Activity;
  copiedRef: boolean;
  onCopyRef: () => void;
}) {
  const docs = (activity.media ?? []).filter((m) => m.media_type === 'document');

  if (!activity.booking_ref && !activity.booking_url && docs.length === 0) return null;

  return (
    <section className="bg-parchment rounded-2xl border border-card-border p-5 space-y-3">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-sage">Booking & tickets</h3>

      {activity.booking_ref && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-sage font-mono">Ref:</span>
          <span className="font-mono text-sm text-ink font-medium">{activity.booking_ref}</span>
          <button
            onClick={onCopyRef}
            className="p-1 text-sage hover:text-forest transition-colors"
            title="Copy reference"
          >
            {copiedRef ? (
              <CheckCircleIcon />
            ) : (
              <ClipboardIcon />
            )}
          </button>
          {copiedRef && <span className="text-xs text-emerald-600">Copied!</span>}
        </div>
      )}

      {activity.booking_url && (
        <a
          href={activity.booking_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-forest hover:text-forest/80 font-medium transition-colors"
        >
          <ExternalLinkIcon />
          Confirmation link
        </a>
      )}

      {docs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {docs.map((doc) => (
            <a
              key={doc.id}
              href={doc.storage_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-terrain/40 border border-card-border rounded-lg text-xs text-forest hover:bg-terrain transition-colors"
            >
              <DocumentIcon />
              {doc.filename ?? 'Document'}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function ExpensesSection() {
  return (
    <section className="bg-parchment rounded-2xl border border-card-border p-5">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-sage mb-3">
        Expenses at this stop
      </h3>
      <div className="text-center py-4 text-sage text-sm">
        No expenses recorded at this stop.
      </div>
    </section>
  );
}

function PhotosSection({
  activity,
  emptyDashed,
}: {
  activity: Activity;
  emptyDashed?: boolean;
}) {
  const photos = (activity.media ?? []).filter((m) => m.media_type === 'photo');

  if (emptyDashed || photos.length === 0) {
    return (
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-sage">Photos</h3>
        </div>
        <div className="border-2 border-dashed border-card-border rounded-2xl py-10 flex flex-col items-center gap-2 text-sage">
          <CameraIcon />
          <p className="text-sm">No photos yet</p>
          <p className="text-xs text-ink-tertiary">Add photos after your visit</p>
        </div>
      </section>
    );
  }

  const visible = photos.slice(0, 3);
  const overflow = photos.length - 3;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-sage">Photos</h3>
        {photos.length > 3 && (
          <span className="text-xs text-forest font-medium cursor-pointer hover:underline">
            View all in gallery →
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {visible.map((photo) => (
          <div key={photo.id} className="relative" style={{ height: '90px' }}>
            <img
              src={photo.storage_url}
              alt={photo.caption ?? photo.filename ?? 'Photo'}
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
        ))}
        {/* +N overflow tile */}
        {overflow > 0 && (
          <div
            className="bg-terrain/60 rounded-xl flex items-center justify-center text-sm font-semibold text-forest cursor-pointer"
            style={{ height: '90px' }}
          >
            +{overflow}
          </div>
        )}
        {/* Add button */}
        <div
          className="border-2 border-dashed border-card-border rounded-xl flex items-center justify-center text-sage hover:text-forest hover:border-forest transition-colors cursor-pointer"
          style={{ height: '90px' }}
          title="Add photo"
        >
          <PlusIcon />
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// After-visit layout header
// ─────────────────────────────────────────────────────────────

function AfterHeader({ activity, trip }: { activity: Activity; trip: Trip }) {
  const typeLabel = activity.type.charAt(0).toUpperCase() + activity.type.slice(1);
  const mapsUrl = activity.location
    ? `https://maps.google.com/?q=${encodeURIComponent(activity.location)}`
    : null;

  return (
    <div className="bg-parchment border border-card-border rounded-2xl p-5 space-y-3">
      {/* Visited badge + date */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-terrain text-[#3B6150] text-xs font-semibold rounded-full border border-card-border">
          <CheckCircleIcon />
          Visited
        </span>
        <span className="text-xs text-sage font-mono">{formatDate(trip.start_date, activity.day)}</span>
      </div>

      {/* Serif title */}
      <h1 className="font-display text-3xl text-ink leading-tight">{activity.title}</h1>

      {/* Type + time */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-sage">
        {activity.time && (
          <span className="flex items-center gap-1">
            <ClockIcon />
            {activity.time}
          </span>
        )}
        <span className="px-2 py-0.5 bg-terrain rounded-full text-xs text-forest font-medium border border-card-border">
          {typeLabel}
        </span>
      </div>

      {/* Location (tappable) + weather pill */}
      {activity.location && (
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={mapsUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-forest hover:underline"
          >
            <MapPinIcon />
            {activity.location}
          </a>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-terrain/40 border border-card-border rounded-full text-xs text-sage">
            ☀️ -- °C
          </span>
        </div>
      )}

      {/* Inline description + ai_tip */}
      {(activity.description || activity.ai_tip) && (
        <>
          <div className="border-t border-card-border" />
          {activity.description && <DescriptionBlock text={activity.description} />}
          {activity.ai_tip && (
            <div className="flex items-start gap-2.5 border-l-4 border-amber-400 pl-3 py-1.5 bg-amber-50/70 rounded-r-lg">
              <LightbulbIcon />
              <p className="text-sm text-amber-900 leading-relaxed">{activity.ai_tip}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Before/today layout header card
// ─────────────────────────────────────────────────────────────

function BeforeHeader({
  activity,
  trip,
  temporalState,
  isCheckingIn,
  onCheckin,
}: {
  activity: Activity;
  trip: Trip;
  temporalState: TemporalState;
  isCheckingIn: boolean;
  onCheckin: () => void;
}) {
  const typeLabel = activity.type.charAt(0).toUpperCase() + activity.type.slice(1);
  const isToday = temporalState === 'today';
  const alreadyCheckedIn = Boolean(activity.checked_in_at);
  const mapsUrl = activity.location
    ? `https://maps.google.com/?q=${encodeURIComponent(activity.location)}`
    : null;

  return (
    <div className="bg-parchment border border-card-border rounded-2xl p-5 space-y-4">
      {/* Icon + title row */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-forest rounded-full flex items-center justify-center text-parchment flex-shrink-0 shadow-md">
          {ACTIVITY_ICONS[activity.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-ink leading-tight">{activity.title}</h1>
            <span className="px-2 py-0.5 bg-terrain rounded-full text-xs text-forest font-medium border border-card-border">
              {typeLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-sage">
            <span className="font-mono text-xs">{formatDate(trip.start_date, activity.day)}</span>
            {activity.time && (
              <span className="flex items-center gap-1">
                <ClockIcon />
                {activity.time}
              </span>
            )}
          </div>
          {/* Location (tappable) + weather pill */}
          {activity.location && (
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <a
                href={mapsUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-forest hover:underline"
              >
                <MapPinIcon />
                {activity.location}
              </a>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-terrain/40 border border-card-border rounded-full text-xs text-sage">
                ☀️ -- °C
              </span>
            </div>
          )}
        </div>
      </div>

      {/* I'm here button */}
      {alreadyCheckedIn ? (
        <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
          <CheckCircleIcon />
          Checked in at {formatCheckinTime(activity.checked_in_at!)}
        </div>
      ) : (
        <button
          onClick={onCheckin}
          disabled={!isToday || isCheckingIn}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            isToday
              ? 'bg-forest text-parchment hover:bg-forest/80'
              : 'bg-terrain/40 text-sage cursor-not-allowed border border-card-border'
          }`}
          title={!isToday ? 'Available on the day of your visit' : undefined}
        >
          {isCheckingIn ? (
            <div className="w-4 h-4 border-2 border-parchment/30 border-t-parchment rounded-full animate-spin" />
          ) : (
            <>
              I'm here
              {isToday ? ' →' : ' (not yet)'}
            </>
          )}
        </button>
      )}

      {/* Inline description + ai_tip */}
      {(activity.description || activity.ai_tip) && (
        <>
          <div className="border-t border-card-border" />
          {activity.description && <DescriptionBlock text={activity.description} />}
          {activity.ai_tip && (
            <div className="flex items-start gap-2.5 border-l-4 border-amber-400 pl-3 py-1.5 bg-amber-50/70 rounded-r-lg">
              <LightbulbIcon />
              <p className="text-sm text-amber-900 leading-relaxed">{activity.ai_tip}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Prev / Next navigation
// ─────────────────────────────────────────────────────────────

function PrevStrip({ activity, tripId }: { activity: Activity; tripId: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/trips/${tripId}/activities/${activity.id}`)}
      className="w-full flex items-center gap-3 px-4 py-3 bg-parchment border border-card-border rounded-2xl hover:bg-terrain/20 transition-colors text-left"
    >
      <ChevronLeftIcon />
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-sage">Previous</p>
        <p className="text-sm font-medium text-ink truncate">{activity.title}</p>
      </div>
    </button>
  );
}

function NextCard({ activity, tripId }: { activity: Activity; tripId: string }) {
  const navigate = useNavigate();
  const typeLabel = activity.type.charAt(0).toUpperCase() + activity.type.slice(1);

  return (
    <button
      onClick={() => navigate(`/trips/${tripId}/activities/${activity.id}`)}
      className="w-full bg-parchment border border-card-border rounded-2xl p-5 hover:bg-terrain/20 transition-colors text-left space-y-2"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-sage">Next stop</p>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-forest/10 rounded-full flex items-center justify-center text-forest flex-shrink-0">
          {ACTIVITY_ICONS[activity.type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-ink truncate">{activity.title}</p>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-sage">
            {activity.time && <span>{activity.time}</span>}
            <span className="px-1.5 py-0.5 bg-terrain rounded-full text-forest border border-card-border">
              {typeLabel}
            </span>
          </div>
        </div>
      </div>
      {/* Bouncing chevron */}
      <div className="flex justify-center pt-1">
        <motion.div
          className="text-sage"
          animate={{ y: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
        >
          <ChevronDownIcon />
        </motion.div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────

export default function ActivityDetailPage() {
  const { tripId, activityId } = useParams<{ tripId: string; activityId: string }>();
  const navigate = useNavigate();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [localNotes, setLocalNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [copiedRef, setCopiedRef] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedNotesRef = useRef<string | null>(null);

  const numTripId = parseInt(tripId ?? '0');
  const numActId  = parseInt(activityId ?? '0');

  // ── Fetch ────────────────────────────────────────────────
  useEffect(() => {
    if (!tripId || !activityId) { navigate('/trips'); return; }

    const load = async () => {
      try {
        setIsLoading(true);
        const [actData, tripData] = await Promise.all([
          apiService.getActivityDetail(numTripId, numActId),
          apiService.getTrip(numTripId),
        ]);
        setActivity(actData);
        setTrip(tripData);
        initializedNotesRef.current = actData.notes ?? '';
        setLocalNotes(actData.notes ?? '');
      } catch {
        setError('Could not load this activity. It may have been deleted or moved.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [tripId, activityId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Notes autosave (1.5 s debounce) ──────────────────────
  useEffect(() => {
    if (initializedNotesRef.current === null) return;
    if (localNotes === initializedNotesRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await apiService.patchActivity(numTripId, numActId, { notes: localNotes });
        initializedNotesRef.current = localNotes;
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    }, 1500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [localNotes]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Checkin handler ───────────────────────────────────────
  const handleCheckin = async () => {
    if (isCheckingIn || !activity) return;
    setIsCheckingIn(true);
    try {
      const updated = await apiService.checkInActivity(numTripId, numActId);
      setActivity(updated);
    } catch (err) {
      console.error('[ActivityDetailPage] Checkin failed:', err);
    } finally {
      setIsCheckingIn(false);
    }
  };

  // ── Copy booking ref ──────────────────────────────────────
  const handleCopyRef = () => {
    if (!activity?.booking_ref) return;
    navigator.clipboard.writeText(activity.booking_ref).then(() => {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    });
  };

  // ── Derived ───────────────────────────────────────────────
  const temporalState: TemporalState =
    activity && trip ? computeTemporalState(trip.start_date, activity.day) : 'before';

  const sortedActivities = trip
    ? [...trip.activities].sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return (a.time ?? '').localeCompare(b.time ?? '');
      })
    : [];

  const currentIndex  = sortedActivities.findIndex((a) => a.id === numActId);
  const prevActivity  = currentIndex > 0 ? sortedActivities[currentIndex - 1] : null;
  const nextActivity  = currentIndex < sortedActivities.length - 1 ? sortedActivities[currentIndex + 1] : null;

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  if (isLoading) return <Skeleton />;

  if (error || !activity || !trip || !tripId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <p className="text-amber-800 font-medium mb-4">{error ?? 'Activity not found'}</p>
          <button
            onClick={() => navigate(`/trips/${tripId}`)}
            className="text-forest hover:text-forest/80 text-sm font-medium"
          >
            ← Back to trip
          </button>
        </div>
      </div>
    );
  }

  const isAfterState  = temporalState === 'after';

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: '#E2DED7' }}>
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* ── Back button ───────────────────────────────── */}
        <button
          onClick={() => navigate(`/trips/${tripId}`)}
          className="flex items-center gap-1.5 text-sm text-sage hover:text-forest transition-colors font-medium"
        >
          <ChevronLeftIcon />
          Back to {trip.destination}
        </button>

        {/* ── Previous activity strip ──────────────────── */}
        {prevActivity && (
          <PrevStrip activity={prevActivity} tripId={tripId} />
        )}

        {/* ── Main layout — temporal-state dependent ───── */}
        {isAfterState ? (
          /* ── AFTER VISIT ─────────────────────────────── */
          <>
            <AfterHeader activity={activity} trip={trip} />

            <PhotosSection activity={activity} />

            <NotesSection
              localNotes={localNotes}
              saveStatus={saveStatus}
              onChange={setLocalNotes}
            />

            <BookingSection
              activity={activity}
              copiedRef={copiedRef}
              onCopyRef={handleCopyRef}
            />

            <ExpensesSection />
          </>
        ) : (
          /* ── BEFORE / ON THE DAY ─────────────────────── */
          <>
            <BeforeHeader
              activity={activity}
              trip={trip}
              temporalState={temporalState}
              isCheckingIn={isCheckingIn}
              onCheckin={handleCheckin}
            />

            <PhotosSection activity={activity} emptyDashed />

            <NotesSection
              localNotes={localNotes}
              saveStatus={saveStatus}
              onChange={setLocalNotes}
            />

            <BookingSection
              activity={activity}
              copiedRef={copiedRef}
              onCopyRef={handleCopyRef}
            />

            <ExpensesSection />
          </>
        )}

        {/* ── Next activity card ────────────────────────── */}
        {nextActivity && (
          <NextCard activity={nextActivity} tripId={tripId} />
        )}

      </div>
    </div>
  );
}
