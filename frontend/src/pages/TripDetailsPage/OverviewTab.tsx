/**
 * OverviewTab — Round 1 Migration
 *
 * Changes:
 *   - Removed `trip.trip_metadata?.description` (trip_metadata dropped)
 *   - TravelAlertsPanel: seeds from `trip.ai_alerts` (DB-persisted) before sessionStorage
 *   - AIRecommendationsPanel: seeds from `trip.ai_recommendations` before sessionStorage
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Trip, TravelAlert, Recommendation, AlertSeverity, AlertCategory, RecommendationCategory, ActivityPrefill } from '../../types';
import type { TripPhase } from '../../utils/tripStatus';
import { apiService } from '../../services/api';
import { isRecommendationPlanned, findMatchedActivity } from '../../utils/recommendations';
import { getTotalSpentUSD } from '../../utils/currency';
import LiveToolsPanel from './LiveToolsPanel';
import ExpenseTracker from './ExpenseTracker';

interface OverviewTabProps {
  trip: Trip;
  phase: TripPhase;
  currentDay: number;
  onTripUpdate: (updated: Trip) => void;
  onOpenAddActivity: (day: number, prefill?: ActivityPrefill) => void;
}

// AI recommendations carry no day/date of their own — the "+ Add to Day X"
// action needs some default landing day, and there's nothing in the
// Recommendation shape to derive a better one from. Note: an activity's
// `day` cannot be edited after creation (ActivityUpdate has no `day`
// field), so a recommendation added here always lands on this fixed day —
// the user would need to delete and re-add to move it, same as any other
// manually-added activity today.
const RECOMMENDATION_DEFAULT_DAY = 1;

// Per the task spec: only `food` has an unambiguous activity-type mapping.
// must_see/hidden_gem/practical are deliberately left unmapped so the
// backend's existing `type` default ("activity") applies — inventing a
// forced mapping for those three wasn't part of the ask.
function categoryToActivityType(category: RecommendationCategory): 'dining' | undefined {
  return category === 'food' ? 'dining' : undefined;
}

// ── sessionStorage helpers ────────────────────────────────────
function getCached<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function clearCache(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {}
}

// ── Typing dots ───────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-sage"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

// ── SVG Icons ─────────────────────────────────────────────────
const AlertIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
  </svg>
);

// ── Alert severity config ─────────────────────────────────────
// warning/critical are a two-tier danger system on the same poppy token:
// warning stays within the light poppy-tint family, critical steps up to
// a solid poppy badge for clearly stronger emphasis.
const SEVERITY_STYLES: Record<AlertSeverity, { bg: string; border: string; icon: string; badge: string }> = {
  info:     { bg: 'bg-terrain/30',    border: 'border-card-border', icon: 'text-ink',    badge: 'bg-terrain text-ink' },
  warning:  { bg: 'bg-poppy-tint',    border: 'border-poppy/20',    icon: 'text-poppy/70', badge: 'bg-poppy-tint text-poppy' },
  critical: { bg: 'bg-poppy-tint',    border: 'border-poppy/40',    icon: 'text-poppy',    badge: 'bg-poppy text-cream' },
};

const CATEGORY_LABELS: Record<AlertCategory, string> = {
  safety:     'Safety',
  visa:       'Visa',
  health:     'Health',
  weather:    'Weather',
  local_laws: 'Local Laws',
  general:    'General',
};

// ── Recommendation category config ───────────────────────────
// These are AI recommendation categories (must_see/food/hidden_gem/practical),
// a conceptually separate system from expense.category even though 'food'
// appears in both — different domain (recommendations vs. logged spend), so
// this intentionally stays local rather than merging into categoryStyles.ts.
// Hues unchanged, just moved off raw Tailwind classes onto explicit hex.
const REC_STYLES: Record<RecommendationCategory, { bg: string; border: string; badge: string; label: string }> = {
  must_see:   { bg: 'bg-terrain/30', border: 'border-card-border', badge: 'bg-terrain text-ink', label: 'Must See' },
  food:       { bg: 'bg-[#FFFBEB]',  border: 'border-[#FDE68A]',   badge: 'bg-[#FEF3C7] text-[#B45309]', label: 'Food & Drink' },
  hidden_gem: { bg: 'bg-[#ECFDF5]',  border: 'border-[#A7F3D0]',   badge: 'bg-[#D1FAE5] text-[#047857]', label: 'Hidden Gem' },
  practical:  { bg: 'bg-terrain/20', border: 'border-card-border', badge: 'bg-terrain text-ink', label: 'Practical' },
};

// ── Alert severity icon ───────────────────────────────────────
function SeverityIcon({ severity }: { severity: AlertSeverity }) {
  if (severity === 'critical') {
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  }
  if (severity === 'warning') {
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  );
}

const ChevronDownIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

// ── Alert row — collapsible: label + one-line summary, expands on click
// for full detail. Left-border accent reuses SEVERITY_STYLES' existing
// `border`/`icon`/`badge` color values exactly as-is (just applied as a
// border-l-4 accent instead of an all-sides border) — no new severity
// colors introduced.
function AlertRow({ alert }: { alert: TravelAlert }) {
  const [expanded, setExpanded] = useState(false);
  const styles = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info;

  return (
    <div className={`${styles.bg} border-l-4 ${styles.border} rounded-r-lg`}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-start gap-3 p-4 text-left"
      >
        <div className={`${styles.icon} mt-0.5 flex-shrink-0`}>
          <SeverityIcon severity={alert.severity} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-sm font-semibold text-inkText">{alert.title}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles.badge}`}>
              {CATEGORY_LABELS[alert.category] ?? alert.category}
            </span>
          </div>
          {!expanded && (
            <p className="text-sm text-inkText-secondary leading-relaxed truncate">
              {alert.description}
            </p>
          )}
        </div>
        <div className={`flex-shrink-0 text-sage transition-transform ${expanded ? 'rotate-180' : ''}`}>
          <ChevronDownIcon />
        </div>
      </button>
      {expanded && (
        <div className="pl-[3.25rem] pr-4 pb-4 -mt-1">
          <p className="text-sm text-inkText-secondary leading-relaxed">{alert.description}</p>
        </div>
      )}
    </div>
  );
}

// ── Travel Alerts Panel ───────────────────────────────────────
function TravelAlertsPanel({ trip, phase }: { trip: Trip; phase: TripPhase }) {
  const cacheKey = `tagalong_alerts_${trip.id}`;

  // Seed priority: DB-persisted trip.ai_alerts → sessionStorage → empty
  const [alerts, setAlerts] = useState<TravelAlert[]>(() =>
    (trip.ai_alerts && trip.ai_alerts.length > 0)
      ? trip.ai_alerts
      : getCached<TravelAlert[]>(cacheKey) ?? []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(() =>
    (trip.ai_alerts != null && trip.ai_alerts.length > 0) ||
    getCached<TravelAlert[]>(cacheKey) !== null
  );

  const fetchAlerts = useCallback(async (refresh = false) => {
    if (refresh) clearCache(cacheKey);
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getOverviewAlerts(trip.id);
      setAlerts(data.alerts);
      setCache(cacheKey, data.alerts);
      setFetched(true);
    } catch {
      setError('Could not load travel alerts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [trip.id, cacheKey]);

  // Auto-fetch on first render if no data seeded
  useEffect(() => {
    if (!fetched && !loading) {
      fetchAlerts();
    }
  }, []);

  return (
    <div className="bg-cream rounded-2xl border border-card-border shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-marigold"><AlertIcon /></div>
          <h3 className="font-mono text-[11px] tracking-[0.1em] uppercase text-sage">
            {phase === 'active' ? 'Relevant Right Now' : 'Travel Alerts & News'}
          </h3>
        </div>
        <button
          onClick={() => fetchAlerts(true)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sage hover:text-ink hover:bg-terrain/20 rounded-lg transition-colors disabled:opacity-40"
        >
          <motion.span animate={loading ? { rotate: 360 } : { rotate: 0 }} transition={{ duration: 0.8, repeat: loading ? Infinity : 0, ease: 'linear' }}>
            <RefreshIcon />
          </motion.span>
          Refresh
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 py-2">
            <TypingDots />
            <p className="text-sm text-inkText-tertiary">Checking advisories for {trip.destination}…</p>
          </motion.div>
        ) : error ? (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-poppy-tint border border-poppy/30 rounded-xl p-4">
            <p className="text-sm text-poppy">{error}</p>
          </motion.div>
        ) : alerts.length > 0 ? (
          <motion.div key="alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="space-y-2">
            {alerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ── AI Recommendations Panel ──────────────────────────────────
function AIRecommendationsPanel({
  trip,
  phase,
  onOpenAddActivity,
}: {
  trip: Trip;
  phase: TripPhase;
  onOpenAddActivity: (day: number, prefill?: ActivityPrefill) => void;
}) {
  const cacheKey = `tagalong_recommendations_${trip.id}`;

  // Seed priority: DB-persisted trip.ai_recommendations → sessionStorage → empty
  const [recs, setRecs] = useState<Recommendation[]>(() =>
    (trip.ai_recommendations && trip.ai_recommendations.length > 0)
      ? trip.ai_recommendations
      : getCached<Recommendation[]>(cacheKey) ?? []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(() =>
    (trip.ai_recommendations != null && trip.ai_recommendations.length > 0) ||
    getCached<Recommendation[]>(cacheKey) !== null
  );

  const fetchRecs = useCallback(async (refresh = false) => {
    if (refresh) clearCache(cacheKey);
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getOverviewRecommendations(trip.id);
      setRecs(data.recommendations);
      setCache(cacheKey, data.recommendations);
      setFetched(true);
    } catch {
      setError('Could not load recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [trip.id, cacheKey]);

  useEffect(() => {
    if (!fetched && !loading) {
      fetchRecs();
    }
  }, []);

  return (
    <div className="bg-cream rounded-2xl border border-card-border shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-ink"><SparklesIcon /></div>
          <h3 className="font-mono text-[11px] tracking-[0.1em] uppercase text-sage">
            {phase === 'active' ? 'Nearby & Contextual' : 'AI Recommendations'}
          </h3>
        </div>
        <button
          onClick={() => fetchRecs(true)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sage hover:text-ink hover:bg-terrain/20 rounded-lg transition-colors disabled:opacity-40"
        >
          <motion.span animate={loading ? { rotate: 360 } : { rotate: 0 }} transition={{ duration: 0.8, repeat: loading ? Infinity : 0, ease: 'linear' }}>
            <RefreshIcon />
          </motion.span>
          Refresh
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 py-2">
            <TypingDots />
            <p className="text-sm text-inkText-tertiary">Curating picks for {trip.destination}…</p>
          </motion.div>
        ) : error ? (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-poppy-tint border border-poppy/30 rounded-xl p-4">
            <p className="text-sm text-poppy">{error}</p>
          </motion.div>
        ) : recs.length > 0 ? (
          <motion.div key="recs" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recs.map((rec) => {
              const styles = REC_STYLES[rec.category] ?? REC_STYLES.practical;
              const planned = isRecommendationPlanned(rec, trip.activities);
              return (
                <div key={rec.id} className={`${styles.bg} border ${styles.border} rounded-xl p-4`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-inkText leading-snug">{rec.title}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${styles.badge}`}>
                      {styles.label}
                    </span>
                  </div>
                  <p className="text-sm text-inkText-secondary leading-relaxed mb-2">{rec.description}</p>
                  {rec.tip && (
                    <p className="text-xs text-inkText-tertiary italic border-t border-black/[0.06] pt-2">
                      <span className="inline-flex items-start gap-1.5">
                        <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                            d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                        </svg>
                        {rec.tip}
                      </span>
                    </p>
                  )}

                  {/* Actionable: either already planned (exact-title match — see
                      docs/KNOWN_ISSUES.md for the limitations of this rule), or a
                      one-click add prefilled from this recommendation. Styling
                      note: teal-dashed, matching ai_tip's teal = Sherpa/AI-origin
                      convention from docs/DESIGN.md — this is AI-suggested content. */}
                  {planned ? (
                    <p className="mt-2 pt-2 border-t border-black/[0.06] text-xs font-medium text-sage">
                      ✓ Already planned
                    </p>
                  ) : (
                    <button
                      onClick={() =>
                        onOpenAddActivity(RECOMMENDATION_DEFAULT_DAY, {
                          title: rec.title,
                          type: categoryToActivityType(rec.category),
                          description: rec.description,
                          notes: rec.tip,
                        })
                      }
                      className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-teal bg-teal/[0.08] hover:bg-teal/[0.15] rounded-lg font-mono text-[9px] uppercase tracking-[0.1em] text-teal transition-colors"
                    >
                      <PlusIcon />
                      Add to Day {RECOMMENDATION_DEFAULT_DAY}
                    </button>
                  )}
                </div>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ── Completed-phase recap ──────────────────────────────────────
// "Visited" relies entirely on checked_in_at — a same-day, user-initiated
// confirmation on ActivityDetailPage that most first-time users won't know
// exists. This undercounts real visits (someone may have genuinely gone
// without ever tapping "I'm here"), so copy here is deliberately honest
// about that rather than declarative: "Not confirmed", never "Missed" or
// "Didn't visit". Consumes isRecommendationPlanned/findMatchedActivity and
// getTotalSpentUSD as-is — no changes to any of their matching/checked-in
// semantics, this only reads them.
function CompletedRecap({ trip }: { trip: Trip }) {
  const activitiesCount = trip.activities.length;
  const totalSpentUSD = getTotalSpentUSD(trip);

  const recommendations = trip.ai_recommendations ?? [];
  const plannedRecs = recommendations.filter((rec) => isRecommendationPlanned(rec, trip.activities));
  const followThrough = plannedRecs.map((rec) => ({
    rec,
    visited: Boolean(findMatchedActivity(rec, trip.activities)?.checked_in_at),
  }));
  const confirmedCount = followThrough.filter((item) => item.visited).length;
  const hasUnconfirmed = followThrough.some((item) => !item.visited);

  return (
    <>
      {/* Stat grid */}
      <div className="bg-cream rounded-2xl border border-card-border shadow-sm p-6">
        <h3 className="font-mono text-[11px] tracking-[0.1em] uppercase text-sage mb-4">Trip Recap</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-terrain/30 rounded-xl p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-sage mb-1">Activities</p>
            <p className="text-sm font-semibold text-ink">{activitiesCount}</p>
          </div>
          <div className="bg-terrain/30 rounded-xl p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-sage mb-1">Confirmed Visits</p>
            <p className="text-sm font-semibold text-ink">
              {confirmedCount} of {plannedRecs.length}
            </p>
          </div>
          <div className="bg-terrain/30 rounded-xl p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-sage mb-1">Total Spent</p>
            <p className="text-sm font-semibold text-ink">
              ${totalSpentUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Recommendation follow-through — omitted entirely if nothing was ever planned */}
      {followThrough.length > 0 && (
        <div className="bg-cream rounded-2xl border border-card-border shadow-sm p-6">
          <h3 className="font-mono text-[11px] tracking-[0.1em] uppercase text-sage mb-4">
            Recommendation Follow-Through
          </h3>
          <div className="space-y-2">
            {followThrough.map(({ rec, visited }) => (
              <div
                key={rec.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-card-border last:border-b-0"
              >
                <span className="text-sm text-ink truncate">{rec.title}</span>
                <span className={`text-xs font-medium flex-shrink-0 ${visited ? 'text-sage' : 'text-inkText-secondary'}`}>
                  {visited ? '✓ Visited' : 'Not confirmed'}
                </span>
              </div>
            ))}
          </div>
          {hasUnconfirmed && (
            <p className="text-xs text-inkText-tertiary mt-3 pt-3 border-t border-card-border">
              Check in during your next trip to track what you actually visited.
            </p>
          )}
        </div>
      )}
    </>
  );
}

// ── Main component ────────────────────────────────────────────
// Phase-aware restructure: Destination/Duration/Budget/Travelers ("Key
// Details") and Departure/Return ("Travel Dates") were removed entirely —
// both were confirmed duplicates of TripSummaryCard.tsx's sidebar rows.
// The static "About This Trip" block is replaced by phase-varying framing
// text using the same `phase` prop this component already received (no
// new phase-detection logic).
//
// `planning` now gets its own header framing, distinct from `pre-trip` —
// matching StatusBanner.tsx's precedent that 'planning' deserves different
// treatment (it renders nothing at all there, vs. a countdown banner for
// pre-trip). Overview still shows content for planning (Travel Alerts, AI
// Recommendations — unchanged), just with copy that doesn't assume dates
// are locked in or reference days-until-departure, since a planning-phase
// trip may not have real dates yet at all (getTripPhase() falls back to
// 'planning' specifically when start_date/end_date are unset).
export default function OverviewTab({ trip, phase, currentDay, onTripUpdate, onOpenAddActivity }: OverviewTabProps) {
  const isCompleted = phase === 'completed';

  return (
    <div className="space-y-5">

      {phase === 'active' && (
        <LiveToolsPanel trip={trip} />
      )}

      {/* Phase-aware header framing (replaces the old static "About This Trip") */}
      <div className="bg-cream rounded-2xl border border-card-border shadow-sm p-6">
        <h3 className="font-mono text-[11px] tracking-[0.1em] uppercase text-sage mb-2">
          {isCompleted
            ? 'Trip Complete'
            : phase === 'active'
            ? "You're Here"
            : phase === 'planning'
            ? 'Still Sketching?'
            : 'Are You Ready?'}
        </h3>
        <p className="text-inkText-secondary text-sm leading-relaxed">
          {isCompleted
            ? `Your${trip.duration_days ? ` ${trip.duration_days}-day` : ''} trip to ${trip.destination} has come to an end.`
            : phase === 'active'
            ? `Day ${currentDay}${trip.duration_days ? ` of ${trip.duration_days}` : ''} in ${trip.destination}. Check what's relevant right now below.`
            : phase === 'planning'
            ? `Your${trip.duration_days ? ` ${trip.duration_days}-day` : ''} trip to ${trip.destination} is still taking shape. Add dates, a budget, or travelers whenever you're ready.`
            : `Your${trip.duration_days ? ` ${trip.duration_days}-day` : ''} adventure to ${trip.destination} is coming up. Here's what to check before you go.`}
        </p>
      </div>

      {/* Expense Tracker */}
      <ExpenseTracker trip={trip} onTripUpdate={onTripUpdate} />

      {!isCompleted && (
        <>
          {/* Travel Alerts — live */}
          <TravelAlertsPanel trip={trip} phase={phase} />

          {/* AI Recommendations — live */}
          <AIRecommendationsPanel trip={trip} phase={phase} onOpenAddActivity={onOpenAddActivity} />
        </>
      )}

      {isCompleted && <CompletedRecap trip={trip} />}

    </div>
  );
}