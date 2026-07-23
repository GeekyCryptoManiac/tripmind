/**
 * activityTypeStyles.ts
 *
 * Per-activity-type icon-circle colors for the Itinerary timeline
 * (ItineraryTab/ActivityCard.tsx).
 *
 * Same category-differentiation exception as OverviewTab.tsx's REC_STYLES
 * (see docs/DESIGN.md's "Documented exceptions" section) — this is
 * distinguishing 5 simultaneously-visible activity types from each other,
 * not conveying status/warning/success meaning, so it intentionally uses
 * raw hex rather than routing through ink/marigold/teal/sage/poppy. None
 * of these 5 hex values match or are meant to evoke any of those reserved
 * semantic tokens — do not "fix" this into semantic tokens for the same
 * reason REC_STYLES shouldn't be.
 */

import type { Activity } from '../types';

export const ACTIVITY_TYPE_COLORS: Record<Activity['type'], string> = {
  activity:  '#7D5A8C', // plum — general sightseeing
  dining:    '#9C5A3D', // clay — food & drink
  flight:    '#3E5C8A', // slate blue — air travel
  hotel:     '#A15C74', // dusty rose — lodging
  transport: '#7A6A56', // taupe — ground transport
};
