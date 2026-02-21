/**
 * TravelTab — Redesigned Week 7/8
 *
 * Visual updates:
 *   - Emojis replaced with SVG icons
 *   - Brand blue instead of bright blue
 *   - Surface-muted borders instead of gray
 *   - Ink color scale for text
 *   - Warm CTA buttons matching design system
 */

import type { Trip } from '../../types';
import type { TravelSubTab } from './helpers';

interface TravelTabProps {
  trip: Trip;
  activeSubTab: TravelSubTab;
  onSubTabChange: (tab: TravelSubTab) => void;
}

// ── SVG Icons ─────────────────────────────────────────────────
const FlightIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
  </svg>
);

const HotelIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const TransportIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const SearchIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const PlusIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 4v16m8-8H4" />
  </svg>
);

export default function TravelTab({
  trip,
  activeSubTab,
  onSubTabChange,
}: TravelTabProps) {
  // Tab configuration
  const tabs = [
    { key: 'flights' as const, label: 'Flights', Icon: FlightIcon },
    { key: 'hotels' as const, label: 'Hotels', Icon: HotelIcon },
    { key: 'transport' as const, label: 'Transport', Icon: TransportIcon },
  ];

  const activeTab = tabs.find((t) => t.key === activeSubTab)!;

  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm overflow-hidden">
      
      {/* Sub-tab bar */}
      <div className="flex border-b border-surface-muted">
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => onSubTabChange(key)}
            className={`
              flex-1 px-4 py-3 text-sm font-medium transition-colors
              flex items-center justify-center gap-2
              ${
                activeSubTab === key
                  ? 'bg-brand-50 text-brand-700 border-b-2 border-brand-600'
                  : 'text-ink-secondary hover:text-ink hover:bg-surface-bg'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Sub-tab content — Empty state */}
      <div className="p-8 text-center">
        {/* Icon circle */}
        <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <activeTab.Icon className="w-8 h-8 text-brand-600" />
        </div>

        {/* Heading */}
        <h3 className="text-lg font-semibold text-ink mb-2">
          No{' '}
          {activeSubTab === 'flights'
            ? 'flights'
            : activeSubTab === 'hotels'
            ? 'hotels'
            : 'transport'}{' '}
          booked yet
        </h3>

        {/* Description */}
        <p className="text-ink-secondary text-sm mb-6">
          {activeSubTab === 'flights' &&
            `Find the best flights for your ${trip.destination} trip`}
          {activeSubTab === 'hotels' && 
            `Find accommodation in ${trip.destination}`}
          {activeSubTab === 'transport' && 
            `Plan local transport in ${trip.destination}`}
        </p>

        {/* CTAs */}
        <div className="flex justify-center gap-3">
          <button className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors flex items-center gap-2 shadow-sm">
            <SearchIcon />
            Find with AI
          </button>
          <button className="px-5 py-2.5 bg-white text-ink rounded-xl text-sm font-semibold ring-1 ring-surface-muted hover:bg-surface-bg transition-colors flex items-center gap-2">
            <PlusIcon />
            Add Manually
          </button>
        </div>
      </div>
    </div>
  );
}