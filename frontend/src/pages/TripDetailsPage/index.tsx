/**
 * TripDetailsPage - Orchestrator
 * 
 * Responsibilities:
 *   - Fetch trip data from API
 *   - Manage all page state (activeTab, notes, modals, etc.)
 *   - Notes auto-save logic (debounced)
 *   - Compose sub-components
 *   - Handle loading/error states
 * 
 * Sub-components:
 *   - TripDetailsHero
 *   - TripDetailsProgress
 *   - StatusBanner          ← Week 5: phase-aware banner
 *   - TripSummaryCard
 *   - OverviewTab
 *   - ItineraryTab
 *   - TravelTab
 *   - ChatInterface (inline - just a wrapper)
 *   - TripEditModal (already extracted)
 *
 * Week 5 changes:
 *   - Import useTripPhase from utils/tripStatus
 *   - Import StatusBanner
 *   - Compute { phase, daysUntil, currentDay } from trip
 *   - Render <StatusBanner> between progress bar and tab nav
 *   - Pass phase + currentDay down to OverviewTab + ItineraryTab (Days 2–3)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useUser } from '../../context/UserContext';
import { apiService } from '../../services/api';
import type { Trip } from '../../types';
import type { TripChatContext } from '../../types/chat';
import ChatInterface from '../../components/ChatInterface';
import TripEditModal from '../../components/TripEditModal';
import TripDetailsHero from './TripDetailsHero';
import TripDetailsProgress from './TripDetailsProgress';
import TripSummaryCard from './TripSummaryCard';
import OverviewTab from './OverviewTab';
import ItineraryTab from './ItineraryTab';
import TravelTab from './TravelTab';
// ── Week 5 additions ──────────────────────────────────────────
import StatusBanner from './StatusBanner';
import { useTripPhase } from '../../utils/tripStatus';
// ─────────────────────────────────────────────────────────────
import {
  type TabType,
  type TravelSubTab,
  getStatusStyles,
  getProgressTasks,
} from './helpers';

export default function TripDetailsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { userId } = useUser();

  // ── State ─────────────────────────────────────────────────
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [progressExpanded, setProgressExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [travelSubTab, setTravelSubTab] = useState<TravelSubTab>('flights');
  const [notes, setNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const menuRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitializedNotes = useRef(false);

  // ── Fetch trip on mount ─────────────────────────────────────
  useEffect(() => {
    if (!tripId) {
      navigate('/trips');
      return;
    }

    const fetchTrip = async () => {
      try {
        setIsLoading(true);
        const fetched = await apiService.getTrip(parseInt(tripId));
        setTrip(fetched);
        // Pre-fill notes from metadata if saved
        if (fetched.trip_metadata?.notes) {
          setNotes(fetched.trip_metadata.notes);
        }
        hasInitializedNotes.current = true;
      } catch (err) {
        console.error('Failed to fetch trip:', err);
        setError('Failed to load trip details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrip();
  }, [tripId, navigate]);

  // ── Close 3-dot menu on outside click ─────────────────────
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setMenuOpen(false);
    }
  }, []);

  useEffect(() => {
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen, handleClickOutside]);

  // ── Debounced auto-save for notes ─────────────────────────
  useEffect(() => {
    // Don't fire on the initial populate from the fetch
    if (!hasInitializedNotes.current) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await apiService.updateTrip(parseInt(tripId!), { notes });

        // Update local trip state so the progress bar ticks immediately
        setTrip((prev) =>
          prev ? { ...prev, trip_metadata: { ...prev.trip_metadata, notes } } : prev
        );

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000); // auto-clear after 2s
      } catch (err) {
        console.error('Failed to save notes:', err);
        setSaveStatus('error');
      }
    }, 1000);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [notes, tripId]);

  // ── Derived state ─────────────────────────────────────────
  const progressTasks = trip ? getProgressTasks(trip) : [];
  const completedCount = progressTasks.filter((t) => t.completed).length;
  const progressPct = trip ? Math.round((completedCount / progressTasks.length) * 100) : 0;

  const tripContext: TripChatContext | undefined = trip
    ? {
        tripId: trip.id,
        destination: trip.destination,
        status: trip.status,
        budget: trip.budget,
        startDate: trip.start_date,
        endDate: trip.end_date,
        durationDays: trip.duration_days,
        travelersCount: trip.travelers_count,
      }
    : undefined;

  // ── Loading state ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading trip details...</p>
        </div>
      </div>
    );
  }

  // ── Error / not found ─────────────────────────────────────
  if (error || !trip) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center max-w-md mx-auto">
          <p className="text-4xl mb-3">😕</p>
          <p className="text-red-800 font-medium mb-2">{error || 'Trip not found'}</p>
          <button
            onClick={() => navigate('/trips')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Back to Trips
          </button>
        </div>
      </div>
    );
  }

  // ── Resolved values ───────────────────────────────────────
  const statusStyles = getStatusStyles(trip.status);
  const statusLabel = trip.status.charAt(0).toUpperCase() + trip.status.slice(1);

  // Progress bar color: amber < 50%, blue 50–99%, green 100%
  const progressColor =
    progressPct === 100 ? '#16a34a' : progressPct >= 50 ? '#2563eb' : '#f59e0b';

  // Year for the date range display
  const endYear = trip.end_date
    ? new Date(trip.end_date).getFullYear()
    : trip.start_date
    ? new Date(trip.start_date).getFullYear()
    : null;

  // ── Week 5: Trip phase detection ──────────────────────────
  // Called here (after null guard) so trip is always a Trip object.
  // Passed down to StatusBanner; will also be passed to OverviewTab
  // (Day 2: checklist, Day 4: live tools) and ItineraryTab (Day 3: today-view).
  const { phase, daysUntil, currentDay } = useTripPhase(trip);
  // ─────────────────────────────────────────────────────────

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ══════════════════════════════════════════════════════
          HERO
          ══════════════════════════════════════════════════════ */}
      <TripDetailsHero trip={trip} onBack={() => navigate('/trips')} />

      {/* ══════════════════════════════════════════════════════
          PROGRESS BAR
          ══════════════════════════════════════════════════════ */}
      <TripDetailsProgress
        progressPct={progressPct}
        progressColor={progressColor}
        progressTasks={progressTasks}
        completedCount={completedCount}
        isExpanded={progressExpanded}
        onToggle={() => setProgressExpanded(!progressExpanded)}
      />

      {/* ══════════════════════════════════════════════════════
          STATUS BANNER (Week 5)
          Sits between the progress bar and the sticky tab nav.
          Returns null for 'planning' phase — no extra chrome.
          ══════════════════════════════════════════════════════ */}
      <StatusBanner
        phase={phase}
        daysUntil={daysUntil}
        currentDay={currentDay}
        totalDays={trip.duration_days ?? 1}
        destination={trip.destination}
      />

      {/* ══════════════════════════════════════════════════════
          TAB NAVIGATION — sticky + 3-dot menu
          ══════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            {/* Tabs */}
            <div className="flex gap-0.5">
              {(
                [
                  { key: 'overview', label: 'Overview', emoji: '📋' },
                  { key: 'itinerary', label: 'Itinerary', emoji: '📅' },
                  { key: 'travel', label: 'Travel', emoji: '✈️' },
                  { key: 'chat', label: 'Chat', emoji: '💬' },
                ] as const
              ).map(({ key, label, emoji }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>

            {/* 3-dot menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-xl leading-none"
              >
                ⋮
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-20">
                  <button
                    onClick={() => {
                      setEditModalOpen(true);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    ✏️ Edit Trip
                  </button>
                  <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    📤 Share Trip
                  </button>
                  <div className="border-t border-gray-100" />
                  <button className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    🗑️ Delete Trip
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MAIN BODY — two-column layout
          ══════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── LEFT: Tab content (scrollable) ─────────────── */}
          <div className="flex-1" style={{ minWidth: 0 }}>
            <AnimatePresence mode="wait">
              {/* ▸ OVERVIEW TAB ──────────────────────────────── */}
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {/*
                   * Week 5 Days 2 & 4: OverviewTab will receive phase prop
                   * to conditionally render PreTripChecklist and LiveToolsPanel.
                   * Adding it now so Day 2 only touches OverviewTab, not index.tsx.
                   */}
                  <OverviewTab trip={trip} phase={phase} onTripUpdate={setTrip} />
                </motion.div>
              )}

              {/* ▸ ITINERARY TAB ─────────────────────────────── */}
                {activeTab === 'itinerary' && (
                <motion.div
                    key="itinerary"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                >
                    {/*
                     * Week 5 Day 3: ItineraryTab will receive phase + currentDay
                     * to auto-select today's day and show the TODAY badge.
                     * Adding them now so Day 3 only touches ItineraryTab.
                     */}
                    <ItineraryTab
                    trip={trip}
                    notes={notes}
                    saveStatus={saveStatus}
                    onNotesChange={setNotes}
                    onTripUpdate={setTrip}
                    phase={phase}
                    currentDay={currentDay}
                    />
                </motion.div>
                )}

              {/* ▸ TRAVEL TAB ────────────────────────────────── */}
              {activeTab === 'travel' && (
                <motion.div
                  key="travel"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <TravelTab
                    trip={trip}
                    activeSubTab={travelSubTab}
                    onSubTabChange={setTravelSubTab}
                  />
                </motion.div>
              )}

              {/* ▸ CHAT TAB ──────────────────────────────────── */}
              {activeTab === 'chat' && (
                <motion.div
                  key="chat"
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                  style={{ height: '520px' }}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChatInterface
                    userId={userId!}
                    chatType="trip"
                    tripId={trip.id}
                    tripContext={tripContext}
                    embedded={true}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── RIGHT: Sticky summary card ─────────────────── */}
          <TripSummaryCard
            trip={trip}
            progressPct={progressPct}
            progressColor={progressColor}
            statusStyles={statusStyles}
            statusLabel={statusLabel}
            endYear={endYear}
            onChatClick={() => setActiveTab('chat')}
            onItineraryClick={() => setActiveTab('itinerary')}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          TRIP EDIT MODAL
          ══════════════════════════════════════════════════════ */}
      {trip && (
        <TripEditModal
          trip={trip}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSave={(updated) => {
            setTrip(updated);
            setEditModalOpen(false);
          }}
        />
      )}
    </div>
  );
}