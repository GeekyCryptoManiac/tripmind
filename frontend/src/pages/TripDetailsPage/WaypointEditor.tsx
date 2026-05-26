import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';
import type { Trip, Waypoint } from '../../types';
import CityAutocomplete from '../../components/CityAutocomplete';
import type { CityEntry } from '../../data/cities';

interface Props {
  trip:         Trip;
  onTripUpdate: (trip: Trip) => void;
}

// ── Small pieces ──────────────────────────────────────────────

function NodeDot({ filled }: { filled: boolean }) {
  return (
    <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 mt-1 ${
      filled ? 'bg-brand-600 border-brand-600' : 'bg-white border-brand-400'
    }`} />
  );
}

function Connector() {
  return <div className="w-px bg-brand-200 mx-auto" style={{ height: 28 }} />;
}

const inputCls = 'w-full px-3 py-1.5 bg-surface-bg border border-surface-muted rounded-lg text-xs text-ink placeholder-ink-tertiary focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition';

// ── Waypoint row ──────────────────────────────────────────────

function WaypointRow({
  waypoint,
  isFirst,
  isLast,
  canMoveUp,
  canMoveDown,
  tripStartDate,
  tripEndDate,
  activitiesCount,
  onMoveUp,
  onMoveDown,
  onDelete,
  onUpdateDates,
  onUpdateCity,
}: {
  waypoint:      Waypoint;
  isFirst:       boolean;
  isLast:        boolean;
  canMoveUp:     boolean;
  canMoveDown:   boolean;
  tripStartDate: string | null;
  tripEndDate:   string | null;
  onMoveUp:      () => void;
  onMoveDown:    () => void;
  onDelete:      () => void;
  activitiesCount: number;
  onUpdateDates: (arrival: string, departure: string) => Promise<void>;
  onUpdateCity:  (city: string, entry: CityEntry | null) => Promise<void>;
}) {
  const [panel,      setPanel]      = useState<'none' | 'dates' | 'city'>('none');
  const [arrival,    setArrival]    = useState(waypoint.arrival_date   ?? '');
  const [departure,  setDeparture]  = useState(waypoint.departure_date ?? '');
  const [cityVal,    setCityVal]    = useState(waypoint.city);
  const [cityEntry,  setCityEntry]  = useState<CityEntry | null>(null);
  const [saving,     setSaving]     = useState(false);

  // ── Date validation ───────────────────────────────────────────
  const dateError = (() => {
    if (arrival && tripStartDate && arrival < tripStartDate)
      return `Arrival cannot be before trip start (${tripStartDate})`;
    if (departure && tripEndDate && departure > tripEndDate)
      return `Departure cannot be after trip end (${tripEndDate})`;
    if (arrival && departure && departure < arrival)
      return 'Departure must be on or after arrival';
    return null;
  })();

  const handleSaveDates = async () => {
    if (dateError) return;
    setSaving(true);
    try { await onUpdateDates(arrival, departure); }
    finally { setSaving(false); setPanel('none'); }
  };

  const handleSaveCity = async () => {
    if (!cityVal.trim()) return;
    setSaving(true);
    try { await onUpdateCity(cityVal.trim(), cityEntry); }
    finally { setSaving(false); setPanel('none'); }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
    >
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center pt-1 flex-shrink-0" style={{ width: 14 }}>
          <NodeDot filled={isFirst || isLast} />
        </div>

        <div className="flex-1 bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm overflow-hidden">
          {/* Main row */}
          <div className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink truncate">{waypoint.city}</p>
              {waypoint.country && (
                <p className="text-xs text-ink-tertiary mt-0.5">{waypoint.country}</p>
              )}
              {(isFirst || isLast) && (
                <p className="text-xs text-ink-tertiary mt-0.5">
                  {isFirst ? 'Departure' : 'Destination'}
                </p>
              )}
              {(waypoint.arrival_date || waypoint.departure_date) && panel === 'none' && (
                <p className="text-xs text-ink-secondary mt-1">
                  {waypoint.arrival_date && `Arrive ${waypoint.arrival_date}`}
                  {waypoint.arrival_date && waypoint.departure_date && ' · '}
                  {waypoint.departure_date && `Depart ${waypoint.departure_date}`}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Edit city */}
              <button
                onClick={() => {
                  setCityVal(waypoint.city);
                  setCityEntry(null);
                  setPanel(p => p === 'city' ? 'none' : 'city');
                }}
                title="Edit city"
                className={`p-1.5 rounded-lg transition-colors ${
                  panel === 'city'
                    ? 'text-brand-600 bg-brand-50'
                    : 'text-ink-tertiary hover:text-brand-600 hover:bg-brand-50'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>

              {/* Edit dates */}
              <button
                onClick={() => setPanel(p => p === 'dates' ? 'none' : 'dates')}
                title="Edit dates"
                className={`p-1.5 rounded-lg transition-colors ${
                  panel === 'dates'
                    ? 'text-brand-600 bg-brand-50'
                    : 'text-ink-tertiary hover:text-brand-600 hover:bg-brand-50'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Reorder — all nodes except origin; delete only for middle stops */}
              {!isFirst && (
                <>
                  <button
                    onClick={onMoveUp}
                    disabled={!canMoveUp}
                    title="Move up"
                    className="p-1.5 text-ink-tertiary hover:text-ink hover:bg-surface-muted rounded-lg transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={onMoveDown}
                    disabled={!canMoveDown}
                    title="Move down"
                    className="p-1.5 text-ink-tertiary hover:text-ink hover:bg-surface-muted rounded-lg transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {!isLast && (
                    <button
                      onClick={onDelete}
                      title="Remove stop"
                      className="p-1.5 text-ink-tertiary hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Expandable panels */}
          <AnimatePresence>
            {panel === 'city' && (
              <motion.div
                key="city-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden border-t border-surface-muted"
              >
                <div className="px-4 py-3 space-y-3">
                  <label className="block text-xs text-ink-tertiary mb-1">Change city</label>
                  <CityAutocomplete
                    value={cityVal}
                    onChange={(c, e) => { setCityVal(c); setCityEntry(e); }}
                    placeholder="Search city…"
                    autoFocus
                  />

                  {/* Passive warning — visible as soon as a different city is chosen */}
                  {activitiesCount > 0 && cityVal.trim() !== waypoint.city && cityVal.trim().length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                      <p className="text-xs font-semibold text-amber-800 mb-0.5">Itinerary may become outdated</p>
                      <p className="text-xs text-amber-700">
                        This trip has <strong>{activitiesCount}</strong> planned{' '}
                        {activitiesCount === 1 ? 'activity' : 'activities'}. Changing this stop won't
                        update them automatically — consider regenerating the itinerary after saving.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setPanel('none')}
                      className="px-3 py-1.5 text-xs text-ink-secondary hover:text-ink transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveCity}
                      disabled={!cityVal.trim() || saving}
                      className="px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save city'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {panel === 'dates' && (
              <motion.div
                key="dates-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden border-t border-surface-muted"
              >
                <div className="px-4 py-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-ink-tertiary mb-1">Arrival date</label>
                      <input
                        type="date"
                        value={arrival}
                        min={tripStartDate ?? undefined}
                        max={tripEndDate ?? undefined}
                        onChange={e => setArrival(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-ink-tertiary mb-1">Departure date</label>
                      <input
                        type="date"
                        value={departure}
                        min={arrival || tripStartDate || undefined}
                        max={tripEndDate ?? undefined}
                        onChange={e => setDeparture(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                  {dateError && (
                    <p className="text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{dateError}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setPanel('none')} className="px-3 py-1.5 text-xs text-ink-secondary hover:text-ink transition-colors">Cancel</button>
                    <button
                      onClick={handleSaveDates}
                      disabled={saving || !!dateError}
                      className="px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving…' : 'Save dates'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ── Add stop form ─────────────────────────────────────────────

function AddStopForm({ onAdd, onCancel, tripStartDate, tripEndDate }: {
  onAdd:         (city: string, entry: CityEntry | null, arrival: string, departure: string) => Promise<void>;
  onCancel:      () => void;
  tripStartDate: string | null;
  tripEndDate:   string | null;
}) {
  const [city,      setCity]      = useState('');
  const [entry,     setEntry]     = useState<CityEntry | null>(null);
  const [arrival,   setArrival]   = useState('');
  const [departure, setDeparture] = useState('');
  const [adding,    setAdding]    = useState(false);

  const dateError = (() => {
    if (arrival && tripStartDate && arrival < tripStartDate)
      return `Arrival cannot be before trip start (${tripStartDate})`;
    if (departure && tripEndDate && departure > tripEndDate)
      return `Departure cannot be after trip end (${tripEndDate})`;
    if (arrival && departure && departure < arrival)
      return 'Departure must be on or after arrival';
    return null;
  })();

  const canSubmit = city.trim() && arrival && departure && !dateError;

  const handleAdd = async () => {
    if (!canSubmit || adding) return;
    setAdding(true);
    try { await onAdd(city.trim(), entry, arrival, departure); }
    finally { setAdding(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className="flex items-start gap-3"
    >
      <div className="flex-shrink-0 mt-2" style={{ width: 14 }}>
        <div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-brand-300" />
      </div>
      <div className="flex-1 bg-white rounded-2xl ring-1 ring-brand-200 shadow-sm p-4 space-y-3">
        <CityAutocomplete
          value={city}
          onChange={(c, e) => { setCity(c); setEntry(e); }}
          placeholder="Search city…"
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-ink-tertiary mb-1">
              Arrival date <span className="text-amber-500">*</span>
            </label>
            <input
              type="date"
              value={arrival}
              min={tripStartDate ?? undefined}
              max={tripEndDate ?? undefined}
              onChange={e => setArrival(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-ink-tertiary mb-1">
              Departure date <span className="text-amber-500">*</span>
            </label>
            <input
              type="date"
              value={departure}
              min={arrival || tripStartDate || undefined}
              max={tripEndDate ?? undefined}
              onChange={e => setDeparture(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {dateError && (
          <p className="text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{dateError}</p>
        )}

        {!dateError && (!arrival || !departure) && city.trim() && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            Arrival and departure dates are required to assign itinerary days to this stop.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs text-ink-secondary hover:text-ink transition-colors">Cancel</button>
          <button
            onClick={handleAdd}
            disabled={!canSubmit || adding}
            className="px-3 py-1.5 text-xs font-medium bg-ink text-white rounded-lg hover:bg-ink/80 transition-colors disabled:opacity-40"
          >
            {adding ? 'Adding…' : 'Add stop'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────

export default function WaypointEditor({ trip, onTripUpdate }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const waypoints = [...(trip.waypoints ?? [])].sort((a, b) => a.order_index - b.order_index);

  const patchTrip = (updated: Partial<Trip>) =>
    onTripUpdate({ ...trip, ...updated });

  // ── Add stop (always inserts before destination on backend) ──

  const handleAdd = async (city: string, cityEntry: CityEntry | null, arrival: string, departure: string) => {
    try {
      setError(null);
      await apiService.addWaypoint(trip.id, {
        city,
        country:        cityEntry?.country      ?? undefined,
        country_code:   cityEntry?.country_code ?? undefined,
        arrival_date:   arrival   || undefined,
        departure_date: departure || undefined,
      });
      // Refetch so order_indices are accurate after backend shift
      const refreshed = await apiService.getTrip(trip.id);
      onTripUpdate(refreshed);
      setShowAddForm(false);
    } catch {
      setError('Failed to add stop. Try again.');
    }
  };

  // ── Delete middle stop ────────────────────────────────────────

  const handleDelete = async (waypointId: number) => {
    try {
      setError(null);
      await apiService.deleteWaypoint(trip.id, waypointId);
      patchTrip({ waypoints: waypoints.filter(w => w.id !== waypointId) });
    } catch {
      setError('Failed to remove stop. Try again.');
    }
  };

  // ── Reorder middle stops ──────────────────────────────────────

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    // Never move to or past origin (index 0)
    if (swapIdx <= 0 || swapIdx >= waypoints.length) return;

    const reordered = [...waypoints];
    [reordered[index], reordered[swapIdx]] = [reordered[swapIdx], reordered[index]];
    const withNewIdx = reordered.map((w, i) => ({ ...w, order_index: i }));
    const newLast = withNewIdx[withNewIdx.length - 1];
    patchTrip({
      waypoints: withNewIdx,
      destination: newLast.city,
      country_code: newLast.country_code ?? trip.country_code,
    });

    try {
      setError(null);
      await Promise.all([
        apiService.updateWaypoint(trip.id, waypoints[index].id,   { order_index: swapIdx }),
        apiService.updateWaypoint(trip.id, waypoints[swapIdx].id, { order_index: index }),
      ]);
    } catch {
      patchTrip({ waypoints });
      setError('Failed to reorder stops. Try again.');
    }
  };

  // ── Update dates ──────────────────────────────────────────────

  const handleUpdateDates = async (waypoint: Waypoint, arrival: string, departure: string) => {
    const updated = await apiService.updateWaypoint(trip.id, waypoint.id, {
      arrival_date:   arrival   || undefined,
      departure_date: departure || undefined,
    });
    patchTrip({
      waypoints: waypoints.map(w => w.id === waypoint.id ? { ...w, ...updated } : w),
    });
  };

  // ── Update city (endpoint or middle stop) ─────────────────────

  const handleUpdateCity = async (waypoint: Waypoint, city: string, entry: CityEntry | null) => {
    const updated = await apiService.updateWaypoint(trip.id, waypoint.id, {
      city,
      country:      entry?.country      ?? undefined,
      country_code: entry?.country_code ?? undefined,
    });
    // Also sync trip.origin / trip.destination cache fields
    const isOrigin = waypoint.order_index === 0;
    const isDestination = waypoint.order_index === waypoints[waypoints.length - 1].order_index;
    patchTrip({
      ...(isOrigin      && { origin: city }),
      ...(isDestination && { destination: city, country_code: entry?.country_code ?? trip.country_code }),
      waypoints: waypoints.map(w => w.id === waypoint.id ? { ...w, ...updated } : w),
    });
  };

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl text-ink">Trip Route</h2>
        <p className="text-sm text-ink-secondary mt-1">
          Edit any city, add stops between your origin and destination.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 bg-rose-50 text-rose-700 text-sm rounded-xl ring-1 ring-rose-200">
          {error}
        </div>
      )}

      <div className="space-y-0">
        <AnimatePresence>
          {waypoints.map((wp, i) => {
            const isFirst     = i === 0;
            const isLast      = i === waypoints.length - 1;
            // Any non-origin node can move; clamp so nothing lands on index 0
            const canMoveUp   = !isFirst && i > 1;
            const canMoveDown = !isFirst && i < waypoints.length - 1;

            // Show "Add stop" slot between the second-to-last node and destination
            const showInsert = i === waypoints.length - 2;

            return (
              <div key={wp.id}>
                <WaypointRow
                  waypoint={wp}
                  isFirst={isFirst}
                  isLast={isLast}
                  canMoveUp={canMoveUp}
                  canMoveDown={canMoveDown}
                  tripStartDate={trip.start_date}
                  tripEndDate={trip.end_date}
                  activitiesCount={trip.activities.length}
                  onMoveUp={() => handleMove(i, 'up')}
                  onMoveDown={() => handleMove(i, 'down')}
                  onDelete={() => handleDelete(wp.id)}
                  onUpdateDates={(arrival, departure) => handleUpdateDates(wp, arrival, departure)}
                  onUpdateCity={(city, entry) => handleUpdateCity(wp, city, entry)}
                />

                {showInsert ? (
                  <AnimatePresence mode="wait">
                    {showAddForm ? (
                      <div key="form">
                        <div className="flex gap-3">
                          <div className="flex flex-col items-center flex-shrink-0" style={{ width: 14 }}>
                            <Connector />
                          </div>
                          <div />
                        </div>
                        <AddStopForm
                          onAdd={handleAdd}
                          onCancel={() => setShowAddForm(false)}
                          tripStartDate={trip.start_date}
                          tripEndDate={trip.end_date}
                        />
                        <div className="flex gap-3">
                          <div className="flex flex-col items-center flex-shrink-0" style={{ width: 14 }}>
                            <Connector />
                          </div>
                          <div />
                        </div>
                      </div>
                    ) : (
                      <div key="btn">
                        <div className="flex gap-3">
                          <div className="flex flex-col items-center flex-shrink-0" style={{ width: 14 }}>
                            <Connector />
                          </div>
                          <div />
                        </div>
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setShowAddForm(true)}
                          className="flex items-center gap-3 w-full group"
                        >
                          <div className="flex flex-col items-center flex-shrink-0" style={{ width: 14 }}>
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-surface-muted group-hover:border-brand-400 transition-colors flex items-center justify-center">
                              <span className="text-[8px] leading-none text-ink-tertiary group-hover:text-brand-500">+</span>
                            </div>
                          </div>
                          <span className="text-sm text-ink-tertiary group-hover:text-brand-600 transition-colors py-1">
                            Add stop
                          </span>
                        </motion.button>
                        <div className="flex gap-3">
                          <div className="flex flex-col items-center flex-shrink-0" style={{ width: 14 }}>
                            <Connector />
                          </div>
                          <div />
                        </div>
                      </div>
                    )}
                  </AnimatePresence>
                ) : (
                  !isLast && (
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 14 }}>
                        <Connector />
                      </div>
                      <div />
                    </div>
                  )
                )}
              </div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
