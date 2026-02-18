/**
 * LiveToolsPanel — Redesigned Week 7
 *
 * Visual updates:
 *   - All emojis replaced with SVG icons
 *   - Emerald tones (matches "booked" status) instead of bright green
 *   - Brand blue for currency results instead of bright blue
 *   - Warm amber for emergency alerts instead of bright red
 *   - White cards with ring-1 ring-black/[0.03] borders
 *   - Inner cells use surface-bg
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

// ── Emergency contacts data (unchanged) ──────────────────────
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

// ── SVG Icons ─────────────────────────────────────────────────
const WrenchIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CurrencyIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
  </svg>
);

const ShieldIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const ClipboardIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const PoliceIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const AmbulanceIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 4v16m8-8H4" />
  </svg>
);

const FireIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
  </svg>
);

const SwapIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
  </svg>
);

const ChevronIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

// ── Collapsible section ───────────────────────────────────────
function ToolSection({
  Icon,
  title,
  defaultOpen = false,
  children,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white ring-1 ring-black/[0.03] rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-bg transition-colors"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold text-ink">
          <div className="text-ink-tertiary">
            <Icon />
          </div>
          {title}
        </span>
        <div className={`text-ink-tertiary transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <ChevronIcon />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-5 pt-1 border-t border-surface-muted">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Currency Converter ────────────────────────────────────────
function CurrencyConverter({ destination }: { destination: string }) {
  const [amount, setAmount] = useState('100');
  const [fromCurrency, setFromCurrency] = useState('SGD');
  const [toCurrency, setToCurrency] = useState(() => guessCurrency(destination));
  const [copied, setCopied] = useState(false);

  const [rates, setRates] = useState<Record<string, number>>(RATES_FROM_USD);
  const [ratesLive, setRatesLive] = useState(false);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then((r) => {
        if (!r.ok) throw new Error('Non-2xx response');
        return r.json();
      })
      .then((data: { rates: Record<string, number> }) => {
        if (data?.rates && typeof data.rates === 'object' && data.rates['USD']) {
          setRates(data.rates);
          setRatesLive(true);
          setLastUpdated(
            new Date().toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        setRatesLoading(false);
      });
  }, []);

  const numericAmount = parseFloat(amount) || 0;
  const result = convert(numericAmount, fromCurrency, toCurrency, rates);

  const handleCopyResult = () => {
    navigator.clipboard.writeText(formatAmount(result, toCurrency));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const selectClass =
    'flex-1 border border-surface-muted rounded-xl px-3 py-2 text-sm bg-surface-bg text-ink ' +
    'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white';

  return (
    <div className="space-y-4 pt-2">
      {/* Amount */}
      <div>
        <label className="text-xs font-medium text-ink-tertiary mb-1.5 block">Amount</label>
        <input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border border-surface-muted rounded-xl px-3 py-2.5 text-sm bg-surface-bg text-ink focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
          placeholder="100"
        />
      </div>

      {/* From / To */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-xs font-medium text-ink-tertiary mb-1.5 block">From</label>
          <select value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)} className={selectClass}>
            {Object.keys(CURRENCY_LABELS).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => { setFromCurrency(toCurrency); setToCurrency(fromCurrency); }}
          className="mt-5 p-2 text-ink-tertiary hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors"
          title="Swap currencies"
        >
          <SwapIcon />
        </button>

        <div className="flex-1">
          <label className="text-xs font-medium text-ink-tertiary mb-1.5 block">To</label>
          <select value={toCurrency} onChange={(e) => setToCurrency(e.target.value)} className={selectClass}>
            {Object.keys(CURRENCY_LABELS).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Result */}
      <div
        className="bg-brand-50 border border-brand-200 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-brand-100 transition-colors"
        onClick={handleCopyResult}
        title="Click to copy"
      >
        <div>
          <p className="text-xs text-brand-600 font-medium mb-0.5">
            {formatAmount(numericAmount, fromCurrency)} {fromCurrency} =
          </p>
          <p className="text-2xl font-bold text-brand-700">
            {formatAmount(result, toCurrency)}{' '}
            <span className="text-base font-semibold">{toCurrency}</span>
          </p>
        </div>
        <span className="text-brand-500 text-sm">
          {copied ? '✓ Copied' : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          )}
        </span>
      </div>

      {/* Rate indicator */}
      <div className="flex items-center justify-between">
        {ratesLoading ? (
          <span className="text-xs text-ink-tertiary animate-pulse">Fetching live rates…</span>
        ) : ratesLive ? (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Live rates
            {lastUpdated && (
              <span className="text-ink-tertiary font-normal ml-0.5">· updated {lastUpdated}</span>
            )}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-ink-tertiary">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-ink-tertiary" />
            Estimated rates
          </span>
        )}
        <p className="text-xs text-ink-tertiary">Check your bank for exact rates.</p>
      </div>
    </div>
  );
}

// ── Emergency Contacts ────────────────────────────────────────
function EmergencyContacts({ destination }: { destination: string }) {
  const info = getEmergencyInfo(destination);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  const copyNumber = (number: string) => {
    navigator.clipboard.writeText(number);
    setCopiedNumber(number);
    setTimeout(() => setCopiedNumber(null), 1500);
  };

  const contacts = [
    { Icon: PoliceIcon,    label: 'Police',    number: info.police    },
    { Icon: AmbulanceIcon, label: 'Ambulance', number: info.ambulance },
    { Icon: FireIcon,      label: 'Fire',      number: info.fire      },
  ];

  return (
    <div className="space-y-3 pt-2">
      {info.note && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <p className="text-xs text-amber-700 font-medium">{info.note}</p>
        </div>
      )}

      {contacts.map(({ Icon, label, number }) => (
        <button
          key={label}
          onClick={() => copyNumber(number)}
          className="w-full flex items-center justify-between px-4 py-3 bg-surface-bg hover:bg-amber-50 hover:border-amber-200 border border-surface-muted rounded-xl transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="text-ink-tertiary group-hover:text-amber-600">
              <Icon />
            </div>
            <div className="text-left">
              <p className="text-xs text-ink-tertiary font-medium">{label}</p>
              <p className="text-base font-bold text-ink group-hover:text-amber-800">
                {number}
              </p>
            </div>
          </div>
          <span className="text-xs text-ink-tertiary group-hover:text-amber-600">
            {copiedNumber === number ? '✓ Copied' : 'Tap to copy'}
          </span>
        </button>
      ))}

      <p className="text-xs text-ink-tertiary">
        Numbers for {destination}. Save them offline in case you lose data.
      </p>
    </div>
  );
}

// ── Quick Notes ───────────────────────────────────────────────
function QuickNotes({ trip }: { trip: Trip }) {
  const [text, setText] = useState(trip.trip_metadata?.notes ?? '');
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
        <p className="text-xs text-ink-tertiary">Jot down quick thoughts, addresses, tips…</p>
        {saveStatus === 'saving' && <span className="text-xs text-ink-tertiary animate-pulse">Saving…</span>}
        {saveStatus === 'saved'  && <span className="text-xs text-emerald-600 font-medium">✓ Saved</span>}
        {saveStatus === 'error'  && <span className="text-xs text-amber-600">Failed to save</span>}
      </div>
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="e.g. Hotel address: 123 Main St &#10;Restaurant tip: try the ramen near the station"
        rows={5}
        className="w-full border border-surface-muted rounded-xl p-3 text-sm text-ink bg-surface-bg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white resize-none transition-colors"
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
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
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-emerald-600">
            <WrenchIcon />
          </div>
          <h3 className="text-base font-semibold text-emerald-800">Live Travel Tools</h3>
        </div>
        <p className="text-xs text-emerald-700">
          You're in {trip.destination} right now — here are your on-the-ground essentials.
        </p>
      </div>

      {/* Tools */}
      <ToolSection Icon={CurrencyIcon} title="Currency Converter" defaultOpen={true}>
        <CurrencyConverter destination={trip.destination} />
      </ToolSection>

      <ToolSection Icon={ShieldIcon} title="Emergency Contacts" defaultOpen={false}>
        <EmergencyContacts destination={trip.destination} />
      </ToolSection>

      <ToolSection Icon={ClipboardIcon} title="Quick Notes" defaultOpen={false}>
        <QuickNotes trip={trip} />
      </ToolSection>
    </motion.div>
  );
}