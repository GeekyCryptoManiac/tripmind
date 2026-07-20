/**
 * FanCarousel — shared fan-spread photo stack.
 *
 * Cartographic Editorial gallery mechanic: center card full scale, ±1/±2
 * positions scaled down and rotated outward, clipped at the container
 * boundary. Used by both the per-activity gallery (ActivityGalleryPage)
 * and the trip-wide Photos tab — each supplies its own item list and an
 * optional `badge` per item (photo tag vs. originating activity title).
 */

import { motion, AnimatePresence } from 'framer-motion';

export interface FanCarouselItem {
  id: number;
  imageUrl: string;
  alt?: string | null;
  caption?: string | null;
  badge?: string | null;
}

// ─────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────

const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);
const ArrowRightIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

// ─────────────────────────────────────────────────────────────
// Fan card — position relative to active index drives scale/rotation
// ─────────────────────────────────────────────────────────────

const CARD_STYLE_BY_OFFSET: Record<number, { scale: number; rotate: number; x: number; z: number }> = {
  0:  { scale: 1,    rotate: 0,   x: 0,    z: 30 },
  1:  { scale: 0.8,  rotate: 8,   x: 90,   z: 20 },
  [-1]: { scale: 0.8, rotate: -8,  x: -90,  z: 20 },
  2:  { scale: 0.62, rotate: 16,  x: 150,  z: 10 },
  [-2]: { scale: 0.62, rotate: -16, x: -150, z: 10 },
};

function FanCard({
  item,
  offset,
  onSelect,
}: {
  item: FanCarouselItem;
  offset: number;
  onSelect: () => void;
}) {
  const style = CARD_STYLE_BY_OFFSET[offset];
  if (!style) return null;

  // Off-center cards jump straight to that photo and must not also
  // trigger the stage's tap-left/tap-right handler underneath them.
  const handleClick = (e: React.MouseEvent) => {
    if (offset === 0) return; // let the click bubble to the stage tap zones
    e.stopPropagation();
    onSelect();
  };

  return (
    <motion.div
      className="absolute top-1/2 left-1/2 w-64 h-80 -ml-32 -mt-40 rounded-2xl overflow-hidden shadow-2xl cursor-pointer"
      style={{ zIndex: style.z }}
      initial={false}
      animate={{
        x: style.x,
        scale: style.scale,
        rotate: style.rotate,
        opacity: 1,
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      onClick={handleClick}
    >
      <img
        src={item.imageUrl}
        alt={item.alt ?? 'Photo'}
        className="w-full h-full object-cover pointer-events-none select-none"
        draggable={false}
      />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Dot indicators — active dot stretches into a pill
// ─────────────────────────────────────────────────────────────

function DotIndicators({
  count,
  activeIndex,
  onSelect,
}: {
  count: number;
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          aria-label={`Go to photo ${i + 1}`}
          onClick={() => onSelect(i)}
          className="p-1"
        >
          <motion.span
            className="block h-1.5 rounded-full"
            style={{ backgroundColor: i === activeIndex ? '#B59054' : 'rgba(247,244,238,0.35)' }}
            animate={{ width: i === activeIndex ? 20 : 6 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FanCarousel
// ─────────────────────────────────────────────────────────────

export function FanCarousel({
  items,
  activeIndex,
  onActiveIndexChange,
  className = '',
  stageClassName = '',
}: {
  items: FanCarouselItem[];
  activeIndex: number;
  onActiveIndexChange: (i: number) => void;
  /** Applied to the outer wrapper — pass `flex-1` when the parent is a flex column that should let the stage grow. */
  className?: string;
  stageClassName?: string;
}) {
  const goPrev = () => onActiveIndexChange(Math.max(0, activeIndex - 1));
  const goNext = () => onActiveIndexChange(Math.min(items.length - 1, activeIndex + 1));
  const activeItem = items[activeIndex];

  return (
    <div className={`flex flex-col ${className}`}>
      {/* ── Fan stage ────────────────────────────────────────── */}
      {/* Tap-left-half / tap-right-half navigation on the stage itself —
          side cards stopPropagation to jump straight to that photo instead. */}
      <div
        className={`relative overflow-hidden cursor-pointer ${stageClassName}`}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const tappedLeft = e.clientX - rect.left < rect.width / 2;
          if (tappedLeft) goPrev(); else goNext();
        }}
      >
        {items.map((item, i) => {
          const offset = i - activeIndex;
          if (offset < -2 || offset > 2) return null;
          return (
            <FanCard
              key={item.id}
              item={item}
              offset={offset}
              onSelect={() => onActiveIndexChange(i)}
            />
          );
        })}

        {/* ── Arrow buttons ──────────────────────────────────── */}
        {activeIndex > 0 && (
          <button
            aria-label="Previous photo"
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-parchment/10 hover:bg-parchment/20 backdrop-blur-sm flex items-center justify-center text-parchment transition-colors"
          >
            <ArrowLeftIcon />
          </button>
        )}
        {activeIndex < items.length - 1 && (
          <button
            aria-label="Next photo"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-parchment/10 hover:bg-parchment/20 backdrop-blur-sm flex items-center justify-center text-parchment transition-colors"
          >
            <ArrowRightIcon />
          </button>
        )}
      </div>

      {/* ── Dots ─────────────────────────────────────────────── */}
      <div className="py-4">
        <DotIndicators count={items.length} activeIndex={activeIndex} onSelect={onActiveIndexChange} />
      </div>

      {/* ── Caption area ─────────────────────────────────────── */}
      <div className="max-w-md mx-auto w-full px-6 pb-6 min-h-[4.5rem]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeItem.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {activeItem.badge && (
              <span className="inline-block mb-1.5 px-2 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-[0.08em] text-gold border border-gold/40">
                {activeItem.badge}
              </span>
            )}
            {activeItem.caption && (
              <p className="font-display italic text-lg text-parchment/90 leading-snug">
                {activeItem.caption}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
