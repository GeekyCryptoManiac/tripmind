/**
 * OverviewTab — Week 8 Session 2
 *
 * Added:
 *   - TravelAlertsPanel — live GPT-4 alerts with sessionStorage cache
 *   - AIRecommendationsPanel — live GPT-4 recommendations with sessionStorage cache
 *   Both panels follow the same pattern as TravelTab AI suggestions.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Trip, TravelAlert, Recommendation, AlertSeverity, AlertCategory, RecommendationCategory } from '../../types';
import type { TripPhase } from '../../utils/tripStatus';
import { apiService } from '../../services/api';
import { formatDate } from './helpers';
import PreTripChecklist from './PreTripChecklist';
import LiveToolsPanel from './LiveToolsPanel';
import ExpenseTracker from './ExpenseTracker';

interface OverviewTabProps {
  trip: Trip;
  phase: TripPhase;
  onTripUpdate: (updated: Trip) => void;
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
          className="w-2 h-2 rounded-full bg-ink-tertiary"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

// ── SVG Icons ─────────────────────────────────────────────────
const GlobeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CurrencyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

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

// ── Alert severity config ─────────────────────────────────────
const SEVERITY_STYLES: Record<AlertSeverity, { bg: string; border: string; icon: string; badge: string }> = {
  info:     { bg: 'bg-brand-50',   border: 'border-brand-200',   icon: 'text-brand-500',   badge: 'bg-brand-100 text-brand-700'   },
  warning:  { bg: 'bg-amber-50',   border: 'border-amber-200',   icon: 'text-amber-500',   badge: 'bg-amber-100 text-amber-700'   },
  critical: { bg: 'bg-rose-50',    border: 'border-rose-200',    icon: 'text-rose-500',     badge: 'bg-rose-100 text-rose-700'    },
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
const REC_STYLES: Record<RecommendationCategory, { bg: string; border: string; badge: string; label: string }> = {
  must_see:   { bg: 'bg-brand-50',   border: 'border-brand-200',   badge: 'bg-brand-100 text-brand-700',    label: 'Must See'    },
  food:       { bg: 'bg-amber-50',   border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700',    label: 'Food & Drink'},
  hidden_gem: { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700',label: 'Hidden Gem'  },
  practical:  { bg: 'bg-surface-muted', border: 'border-surface-muted', badge: 'bg-white text-ink-secondary', label: 'Practical' },
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

// ── Travel Alerts Panel ───────────────────────────────────────
function TravelAlertsPanel({ trip }: { trip: Trip }) {
  const cacheKey = `tripmind_alerts_${trip.id}`;
  const [alerts, setAlerts] = useState<TravelAlert[]>(() => getCached<TravelAlert[]>(cacheKey) ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(() => getCached<TravelAlert[]>(cacheKey) !== null);

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

  // Auto-fetch on first render if no cache
  useEffect(() => {
    if (!fetched && !loading) {
      fetchAlerts();
    }
  }, []);

  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-amber-600"><AlertIcon /></div>
          <h3 className="text-base font-semibold text-ink">Travel Alerts & News</h3>
        </div>
        <button
          onClick={() => fetchAlerts(true)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink hover:bg-surface-bg rounded-lg transition-colors disabled:opacity-40"
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
            <p className="text-sm text-ink-tertiary">Checking advisories for {trip.destination}…</p>
          </motion.div>
        ) : error ? (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700">{error}</p>
          </motion.div>
        ) : alerts.length > 0 ? (
          <motion.div key="alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="space-y-3">
            {alerts.map((alert) => {
              const styles = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info;
              return (
                <div key={alert.id} className={`${styles.bg} border ${styles.border} rounded-xl p-4`}>
                  <div className="flex items-start gap-3">
                    <div className={`${styles.icon} mt-0.5 flex-shrink-0`}>
                      <SeverityIcon severity={alert.severity} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-semibold text-ink">{alert.title}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles.badge}`}>
                          {CATEGORY_LABELS[alert.category] ?? alert.category}
                        </span>
                      </div>
                      <p className="text-sm text-ink-secondary leading-relaxed">{alert.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ── AI Recommendations Panel ──────────────────────────────────
function AIRecommendationsPanel({ trip }: { trip: Trip }) {
  const cacheKey = `tripmind_recommendations_${trip.id}`;
  const [recs, setRecs] = useState<Recommendation[]>(() => getCached<Recommendation[]>(cacheKey) ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(() => getCached<Recommendation[]>(cacheKey) !== null);

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
    <div className="bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-brand-600"><SparklesIcon /></div>
          <h3 className="text-base font-semibold text-ink">AI Recommendations</h3>
        </div>
        <button
          onClick={() => fetchRecs(true)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink hover:bg-surface-bg rounded-lg transition-colors disabled:opacity-40"
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
            <p className="text-sm text-ink-tertiary">Curating picks for {trip.destination}…</p>
          </motion.div>
        ) : error ? (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700">{error}</p>
          </motion.div>
        ) : recs.length > 0 ? (
          <motion.div key="recs" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recs.map((rec) => {
              const styles = REC_STYLES[rec.category] ?? REC_STYLES.practical;
              return (
                <div key={rec.id} className={`${styles.bg} border ${styles.border} rounded-xl p-4`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-ink leading-snug">{rec.title}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${styles.badge}`}>
                      {styles.label}
                    </span>
                  </div>
                  <p className="text-sm text-ink-secondary leading-relaxed mb-2">{rec.description}</p>
                  {rec.tip && (
                    <p className="text-xs text-ink-tertiary italic border-t border-black/[0.06] pt-2">
                      💡 {rec.tip}
                    </p>
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

// ── Main component ────────────────────────────────────────────
export default function OverviewTab({ trip, phase, onTripUpdate }: OverviewTabProps) {
  return (
    <div className="space-y-5">

      {phase === 'pre-trip' && (
        <PreTripChecklist trip={trip} onTripUpdate={onTripUpdate} />
      )}

      {phase === 'active' && (
        <LiveToolsPanel trip={trip} />
      )}

      {/* About This Trip */}
      <div className="bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm p-6">
        <h3 className="text-base font-semibold text-ink mb-2">About This Trip</h3>
        <p className="text-ink-secondary text-sm leading-relaxed">
          {trip.trip_metadata?.description ||
            `Your${trip.duration_days ? ` ${trip.duration_days}-day` : ''} adventure to ${
              trip.destination
            }. Use the tabs above to plan your itinerary, book travel, or chat with the AI assistant.`}
        </p>
      </div>

      {/* Key Details */}
      <div className="bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm p-6">
        <h3 className="text-base font-semibold text-ink mb-4">Key Details</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Destination', value: trip.destination, Icon: GlobeIcon },
            { label: 'Duration', value: trip.duration_days ? `${trip.duration_days} days` : 'Not set', Icon: ClockIcon },
            { label: 'Budget', value: trip.budget ? `$${trip.budget.toLocaleString()}` : 'Not set', Icon: CurrencyIcon },
            { label: 'Travelers', value: `${trip.travelers_count}`, Icon: UsersIcon },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="bg-surface-bg rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-ink-tertiary mb-1">
                <Icon />
                <p className="text-xs uppercase tracking-wide">{label}</p>
              </div>
              <p className="text-sm font-semibold text-ink">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Travel Dates */}
      <div className="bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="text-ink-tertiary"><CalendarIcon /></div>
          <h3 className="text-base font-semibold text-ink">Travel Dates</h3>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex-1 bg-surface-bg rounded-xl p-3 text-center">
            <p className="text-xs text-ink-tertiary uppercase mb-1">Departure</p>
            <p className="font-semibold text-ink">{formatDate(trip.start_date)}</p>
          </div>
          <svg className="w-5 h-5 text-ink-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          <div className="flex-1 bg-surface-bg rounded-xl p-3 text-center">
            <p className="text-xs text-ink-tertiary uppercase mb-1">Return</p>
            <p className="font-semibold text-ink">{formatDate(trip.end_date)}</p>
          </div>
        </div>
      </div>

      {/* Expense Tracker */}
      <ExpenseTracker trip={trip} onTripUpdate={onTripUpdate} />

      {/* Travel Alerts — live */}
      <TravelAlertsPanel trip={trip} />

      {/* AI Recommendations — live */}
      <AIRecommendationsPanel trip={trip} />

    </div>
  );
}