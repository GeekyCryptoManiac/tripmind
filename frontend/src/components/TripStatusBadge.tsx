/**
 * TripStatusBadge — single shared source for trip status/phase badges.
 *
 * Consolidates what used to be three independent implementations:
 *   - TripDetailsHero.tsx's STATUS_CONFIG + local StatusBadge
 *   - TripSummaryCard.tsx's STATUS_CONFIG + local StatusBadge
 *     (byte-for-byte identical to TripDetailsHero.tsx's copy)
 *   - TripCard.tsx's STATUS_GRADIENT + STATUS_BADGE + local StatusBadge
 *
 * Accepts either a TripStatus value (planning/booked/ongoing/completed/
 * cancelled — the backend field, see types/index.ts) or a TripPhase value
 * (planning/pre-trip/active/completed — the computed, date-based display
 * state, see utils/tripStatus.ts) and resolves both through the same
 * status.* tokens, so every status/phase indicator in the app agrees.
 *
 * 'active' intentionally maps to ink, not marigold — the Navbar's
 * "+ New Trip" CTA already owns marigold and is visible on every screen
 * this badge can appear alongside. Same decision StatusBanner.tsx made.
 *
 * Any status string not recognized below (including trip.status values
 * this app doesn't otherwise expect) falls back to a flat ink/terrain
 * treatment — never gray, and defined once here instead of being
 * re-duplicated per call site.
 */

export interface TripStatusStyle {
  label: string;
  /** bg-* class for the small indicator dot */
  dot: string;
  /** full className for the pill background/text/ring */
  badge: string;
  /**
   * Full background className for TripCard's image-fallback panel.
   * booked/completed are flat, solid status.* colors (no gradient) —
   * they're the two statuses with an unambiguous single brand color.
   * The others use a two-tone gradient since they don't have one
   * definitive color on their own.
   */
  background: string;
}

const BADGE_CLASS = 'bg-terrain text-inkText ring-card-border';

const STATUS_STYLES: Record<string, TripStatusStyle> = {
  planning: {
    label: 'Planning',
    dot: 'bg-status-planning-text',
    badge: BADGE_CLASS,
    background: 'bg-gradient-to-br from-sage to-ink',
  },
  'pre-trip': {
    label: 'Pre-Trip',
    dot: 'bg-status-planning-text',
    badge: BADGE_CLASS,
    background: 'bg-gradient-to-br from-sage to-ink',
  },
  booked: {
    label: 'Booked',
    dot: 'bg-status-booked-text',
    badge: BADGE_CLASS,
    background: 'bg-status-booked-bg',
  },
  ongoing: {
    label: 'Ongoing',
    dot: 'bg-status-ongoing-text',
    badge: BADGE_CLASS,
    background: 'bg-gradient-to-br from-status-ongoing-bg to-status-ongoing-text',
  },
  active: {
    label: 'Active',
    dot: 'bg-ink',
    badge: BADGE_CLASS,
    background: 'bg-gradient-to-br from-ink/60 to-ink',
  },
  completed: {
    label: 'Completed',
    dot: 'bg-status-completed-text',
    badge: BADGE_CLASS,
    background: 'bg-status-completed-bg',
  },
  cancelled: {
    label: 'Cancelled',
    dot: 'bg-status-cancelled-text',
    badge: BADGE_CLASS,
    background: 'bg-gradient-to-br from-status-cancelled-bg to-status-cancelled-text',
  },
};

// Unrecognized status — flat ink/terrain, never gray.
const DEFAULT_DOT = 'bg-ink';
const DEFAULT_BACKGROUND = 'bg-gradient-to-br from-terrain to-ink';

export function getTripStatusStyle(status: string): TripStatusStyle {
  return (
    STATUS_STYLES[status] ?? {
      label: status,
      dot: DEFAULT_DOT,
      badge: BADGE_CLASS,
      background: DEFAULT_BACKGROUND,
    }
  );
}

export default function TripStatusBadge({ status }: { status: string }) {
  const cfg = getTripStatusStyle(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
