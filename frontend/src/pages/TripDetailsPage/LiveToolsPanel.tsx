/**
 * LiveToolsPanel
 *
 * Shown inside OverviewTab when phase === 'active'.
 * Three collapsible tool sections:
 *   1. 💱 Currency Converter — live rates from exchangerate-api.com,
 *                              falls back silently to static rates on failure
 *   2. 🆘 Emergency Contacts — hardcoded map by destination, tap to copy
 *   3. 📋 Quick Notes — compact notes pad, saves to trip_metadata.notes
 *
 * All frontend-only — no new backend endpoints needed.
 * Notes reuse the existing updateTrip endpoint (same as Week 4 auto-save).
 *
 * Week 6 Day 1: Currency constants + helpers extracted to src/utils/currency.ts
 * Week 6 Day 2: CurrencyConverter upgraded to fetch live rates on mount.
 *               Falls back silently to RATES_FROM_USD if fetch fails.
 *               Shows "🟢 Live rates" or "⚪ Estimated rates" label.
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';
import type { Trip } from '../../types';
import {
  RATES_FROM_USD,
  CURRENCY_LABELS,
  convert,
  guessCurrency,
  formatAmount,
} from '../../utils/currency';

// ─────────────────────────────────────────────────────────────
// EMERGENCY CONTACTS DATA
// ─────────────────────────────────────────────────────────────

interface EmergencyInfo {
  police: string;
  ambulance: string;
  fire: string;
  note?: string;
}

const EMERGENCY_MAP: Record<string, EmergencyInfo> = {
  japan:          { police: '110',   ambulance: '119',  fire: '119'  },
  korea:          { police: '112',   ambulance: '119',  fire: '119'  },
  thailand:       { police: '191',   ambulance: '1669', fire: '199'  },
  malaysia:       { police: '999',   ambulance: '999',  fire: '994'  },
  indonesia:      { police: '110',   ambulance: '118',  fire: '113'  },
  philippines:    { police: '117',   ambulance: '161',  fire: '160'  },
  vietnam:        { police: '113',   ambulance: '115',  fire: '114'  },
  australia:      { police: '000',   ambulance: '000',  fire: '000',  note: 'All emergencies: 000' },
  'new zealand':  { police: '111',   ambulance: '111',  fire: '111',  note: 'All emergencies: 111' },
  uk:             { police: '999',   ambulance: '999',  fire: '999',  note: 'All emergencies: 999 or 112' },
  france:         { police: '17',    ambulance: '15',   fire: '18',   note: 'EU single number: 112' },
  germany:        { police: '110',   ambulance: '112',  fire: '112'  },
  italy:          { police: '113',   ambulance: '118',  fire: '115',  note: 'EU single number: 112' },
  spain:          { police: '091',   ambulance: '112',  fire: '080',  note: 'EU single number: 112' },
  switzerland:    { police: '117',   ambulance: '144',  fire: '118'  },
  usa:            { police: '911',   ambulance: '911',  fire: '911',  note: 'All emergencies: 911' },
  canada:         { police: '911',   ambulance: '911',  fire: '911',  note: 'All emergencies: 911' },
  india:          { police: '100',   ambulance: '108',  fire: '101'  },
  uae:            { police: '999',   ambulance: '998',  fire: '997'  },
  'hong kong':    { police: '999',   ambulance: '999',  fire: '999',  note: 'All emergencies: 999' },
  taiwan:         { police: '110',   ambulance: '119',  fire: '119'  },
  turkey:         { police: '155',   ambulance: '112',  fire: '110'  },
  'south africa': { police: '10111', ambulance: '10177',fire: '10177'},
};

function getEmergencyInfo(destination: string): EmergencyInfo {
  const d = destination.toLowerCase();
  for (const [key, info] of Object.entries(EMERGENCY_MAP)) {
    if (d.includes(key)) return info;
  }
  return {
    police: '112',
    ambulance: '112',
    fire: '112',
    note: 'International emergency: 112 (works in most countries)',
  };
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

function ToolSection({
  icon,
  title,
  defaultOpen = false,
  children,
}: {
  icon: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <span className="text-base">{icon}</span>
          {title}
        </span>
        <span className={`text-gray-400 text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-5 pt-1 bg-white border-t border-gray-100">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CURRENCY CONVERTER
// ─────────────────────────────────────────────────────────────

function CurrencyConverter({ destination }: { destination: string }) {
  const [amount, setAmount]             = useState('100');
  const [fromCurrency, setFromCurrency] = useState('SGD');
  const [toCurrency, setToCurrency]     = useState(() => guessCurrency(destination));
  const [copied, setCopied]             = useState(false);

  // ── Live rate state ───────────────────────────────────────
  //
  // rates:        the table used for all conversions.
  //               Initialised to RATES_FROM_USD so conversions work
  //               immediately while the fetch is in-flight.
  //
  // ratesLive:    true  → fetch succeeded, showing "🟢 Live rates"
  //               false → using static fallback, showing "⚪ Estimated rates"
  //               Stays false until a successful fetch completes.
  //
  // ratesLoading: true only during the initial fetch — used to show
  //               the "Fetching rates…" pulse. Cleared by .finally().
  //
  // lastUpdated:  time string set on a successful fetch, shown in the label
  //               so the user knows how fresh the rates are.
  const [rates, setRates]               = useState<Record<string, number>>(RATES_FROM_USD);
  const [ratesLive, setRatesLive]       = useState(false);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [lastUpdated, setLastUpdated]   = useState<string | null>(null);

  useEffect(() => {
    // Free endpoint — no API key, no sign-up required.
    // Returns: { rates: { USD: 1, SGD: 1.35, JPY: 149, ... } }
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then((r) => {
        if (!r.ok) throw new Error('Non-2xx response');
        return r.json();
      })
      .then((data: { rates: Record<string, number> }) => {
        // Validate: must have a rates object with at least USD present
        if (data?.rates && typeof data.rates === 'object' && data.rates['USD']) {
          setRates(data.rates);
          setRatesLive(true);
          setLastUpdated(
            new Date().toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })
          );
        }
        // If shape is unexpected, fall through without setting ratesLive —
        // rates stays as RATES_FROM_USD (silent fallback)
      })
      .catch(() => {
        // Network error, CORS block, or non-OK response.
        // Do nothing — rates stays as RATES_FROM_USD, ratesLive stays false.
        // Intentionally no console.error — this is an expected fallback path.
      })
      .finally(() => {
        setRatesLoading(false);
      });
  }, []); // Run once on mount — no need to re-fetch during a session

  // ── Conversion ────────────────────────────────────────────
  const numericAmount = parseFloat(amount) || 0;
  // Pass the live rates table — `convert` accepts an optional rates arg
  // added in Day 1 specifically to support this upgrade
  const result = convert(numericAmount, fromCurrency, toCurrency, rates);

  const handleCopyResult = () => {
    navigator.clipboard.writeText(formatAmount(result, toCurrency));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const selectClass =
    'flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white';

  return (
    <div className="space-y-4 pt-2">
      {/* Amount input */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Amount</label>
        <input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          placeholder="100"
        />
      </div>

      {/* From / To row */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">From</label>
          <select
            value={fromCurrency}
            onChange={(e) => setFromCurrency(e.target.value)}
            className={selectClass}
          >
            {Object.keys(CURRENCY_LABELS).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => { setFromCurrency(toCurrency); setToCurrency(fromCurrency); }}
          className="mt-5 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
          title="Swap currencies"
        >
          ⇄
        </button>

        <div className="flex-1">
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">To</label>
          <select
            value={toCurrency}
            onChange={(e) => setToCurrency(e.target.value)}
            className={selectClass}
          >
            {Object.keys(CURRENCY_LABELS).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Result */}
      <div
        className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-blue-100 transition-colors"
        onClick={handleCopyResult}
        title="Click to copy"
      >
        <div>
          <p className="text-xs text-blue-500 font-medium mb-0.5">
            {formatAmount(numericAmount, fromCurrency)} {fromCurrency} =
          </p>
          <p className="text-2xl font-bold text-blue-700">
            {formatAmount(result, toCurrency)}{' '}
            <span className="text-base font-semibold">{toCurrency}</span>
          </p>
        </div>
        <span className="text-blue-400 text-sm">
          {copied ? '✓ Copied' : '📋'}
        </span>
      </div>

      {/* ── Rate freshness indicator ──────────────────────────
           Three states:
             Loading  → pulsing "Fetching rates…" (only briefly on mount)
             Live     → green dot + "Live rates" + timestamp
             Fallback → grey dot + "Estimated rates" (fetch failed silently)
      */}
      <div className="flex items-center justify-between">
        {ratesLoading ? (
          <span className="text-xs text-gray-400 animate-pulse">
            Fetching live rates…
          </span>
        ) : ratesLive ? (
          <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
            Live rates
            {lastUpdated && (
              <span className="text-gray-400 font-normal ml-0.5">
                · updated {lastUpdated}
              </span>
            )}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400" />
            Estimated rates
          </span>
        )}

        <p className="text-xs text-gray-400">
          Check your bank for exact rates.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EMERGENCY CONTACTS
// ─────────────────────────────────────────────────────────────

function EmergencyContacts({ destination }: { destination: string }) {
  const info = getEmergencyInfo(destination);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  const copyNumber = (number: string) => {
    navigator.clipboard.writeText(number);
    setCopiedNumber(number);
    setTimeout(() => setCopiedNumber(null), 1500);
  };

  const contacts = [
    { icon: '👮', label: 'Police',    number: info.police    },
    { icon: '🚑', label: 'Ambulance', number: info.ambulance },
    { icon: '🚒', label: 'Fire',      number: info.fire      },
  ];

  return (
    <div className="space-y-3 pt-2">
      {info.note && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          <p className="text-xs text-amber-700 font-medium">{info.note}</p>
        </div>
      )}

      {contacts.map(({ icon, label, number }) => (
        <button
          key={label}
          onClick={() => copyNumber(number)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-red-50 hover:border-red-200 border border-gray-200 rounded-xl transition-colors group"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{icon}</span>
            <div className="text-left">
              <p className="text-xs text-gray-400 font-medium">{label}</p>
              <p className="text-base font-bold text-gray-900 group-hover:text-red-700">
                {number}
              </p>
            </div>
          </div>
          <span className="text-xs text-gray-400 group-hover:text-red-500">
            {copiedNumber === number ? '✓ Copied' : 'Tap to copy'}
          </span>
        </button>
      ))}

      <p className="text-xs text-gray-400">
        Numbers for {destination}. Save them offline in case you lose data.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// QUICK NOTES
// ─────────────────────────────────────────────────────────────

function QuickNotes({ trip }: { trip: Trip }) {
  const [text, setText]         = useState(trip.trip_metadata?.notes ?? '');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (value: string) => {
    setText(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await apiService.updateTrip(trip.id, { notes: value });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    }, 1000);
  };

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500">Jot down quick thoughts, addresses, tips…</p>
        {saveStatus === 'saving' && <span className="text-xs text-gray-400 animate-pulse">Saving…</span>}
        {saveStatus === 'saved'  && <span className="text-xs text-green-600 font-medium">✓ Saved</span>}
        {saveStatus === 'error'  && <span className="text-xs text-red-500">Failed to save</span>}
      </div>
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="e.g. Hotel address: 123 Main St &#10;Restaurant tip: try the ramen near the station"
        rows={5}
        className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none transition-colors"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

interface LiveToolsPanelProps {
  trip: Trip;
}

export default function LiveToolsPanel({ trip }: LiveToolsPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-3"
    >
      {/* Header */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <h3 className="text-base font-semibold text-green-800 flex items-center gap-2 mb-0.5">
          <span>🛠️</span> Live Travel Tools
        </h3>
        <p className="text-xs text-green-700">
          You're in {trip.destination} right now — here are your on-the-ground essentials.
        </p>
      </div>

      {/* Tools */}
      <ToolSection icon="💱" title="Currency Converter" defaultOpen={true}>
        <CurrencyConverter destination={trip.destination} />
      </ToolSection>

      <ToolSection icon="🆘" title="Emergency Contacts" defaultOpen={false}>
        <EmergencyContacts destination={trip.destination} />
      </ToolSection>

      <ToolSection icon="📋" title="Quick Notes" defaultOpen={false}>
        <QuickNotes trip={trip} />
      </ToolSection>
    </motion.div>
  );
}