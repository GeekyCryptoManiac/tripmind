import { useState, useRef, useEffect, useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CITIES from '../data/cities';
import type { CityEntry } from '../data/cities';

interface Props {
  value:        string;
  onChange:     (city: string, entry: CityEntry | null) => void;
  placeholder?: string;
  className?:   string;
  autoFocus?:   boolean;
  label?:       string;
}

const MAX_RESULTS = 8;

function highlight(text: string, query: string): string {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    text.slice(0, idx) +
    `<mark class="bg-brand-100 text-brand-800 rounded">${text.slice(idx, idx + query.length)}</mark>` +
    text.slice(idx + query.length)
  );
}

export default function CityAutocomplete({
  value,
  onChange,
  placeholder = 'Search city…',
  className   = '',
  autoFocus   = false,
  label,
}: Props) {
  const [query,    setQuery]    = useState(value);
  const [results,  setResults]  = useState<CityEntry[]>([]);
  const [open,     setOpen]     = useState(false);
  const [activeIdx,setActiveIdx]= useState(-1);
  const inputRef  = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLUListElement>(null);
  const id        = useId();

  // Keep local query in sync when value is reset externally (e.g. modal close)
  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) { setResults([]); setOpen(false); return; }

    const lower = q.toLowerCase();
    const matched = CITIES.filter(c =>
      c.city.toLowerCase().includes(lower) ||
      c.country.toLowerCase().includes(lower)
    ).slice(0, MAX_RESULTS);

    setResults(matched);
    setOpen(matched.length > 0);
    setActiveIdx(-1);
  }, [query]);

  const select = (entry: CityEntry) => {
    setQuery(entry.city);
    setOpen(false);
    setActiveIdx(-1);
    onChange(entry.city, entry);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && results[activeIdx]) select(results[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const item = listRef.current.children[activeIdx] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIdx]);

  const handleBlur = () => {
    // Delay so click on a result fires before blur closes the list
    setTimeout(() => setOpen(false), 150);
  };

  const inputClass = [
    'w-full px-4 py-2.5 bg-surface-bg border border-surface-muted rounded-xl',
    'text-sm text-ink placeholder-ink-tertiary',
    'focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition',
    className,
  ].join(' ');

  return (
    <div className="relative">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-ink-secondary uppercase tracking-wide mb-1.5"
        >
          {label}
        </label>
      )}

      <input
        id={id}
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          // If user clears or changes the text, clear the resolved entry
          if (e.target.value !== query) onChange(e.target.value, null);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => query.trim().length >= 1 && results.length > 0 && setOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={open ? `${id}-listbox` : undefined}
        aria-activedescendant={activeIdx >= 0 ? `${id}-opt-${activeIdx}` : undefined}
        className={inputClass}
      />

      <AnimatePresence>
        {open && (
          <motion.ul
            id={`${id}-listbox`}
            ref={listRef}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{    opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-modal ring-1 ring-black/8 overflow-hidden max-h-64 overflow-y-auto"
          >
            {results.map((entry, i) => (
              <li
                key={`${entry.city}-${entry.country_code}`}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === activeIdx}
                onMouseDown={() => select(entry)}
                onMouseEnter={() => setActiveIdx(i)}
                className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
                  i === activeIdx ? 'bg-brand-50' : 'hover:bg-surface-bg'
                }`}
              >
                <span
                  className="text-sm text-ink font-medium"
                  dangerouslySetInnerHTML={{ __html: highlight(entry.city, query.trim()) }}
                />
                <span className="text-xs text-ink-tertiary ml-3 flex-shrink-0">
                  {entry.country}
                </span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
