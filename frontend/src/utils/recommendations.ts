/**
 * recommendations.ts
 *
 * Matching logic between AI recommendations (trip.ai_recommendations) and
 * already-planned itinerary activities (trip.activities), used to show
 * "✓ Already planned" on the Overview tab's recommendation cards. Also
 * reused by the Phase 3 completed-trip recap.
 *
 * Match rule: case-insensitive EXACT title match only — no fuzzy/partial
 * matching, no category/type cross-checking. A cosmetic rename of the
 * planned activity produces a false negative (safe/undercounting failure
 * mode — see docs/KNOWN_ISSUES.md for why this was chosen over ID-based
 * linking, which would fail in the opposite, worse direction).
 */

import type { Activity, Recommendation } from '../types';

export function isRecommendationPlanned(
  recommendation: Recommendation,
  activities: Activity[],
): boolean {
  const normalizedTitle = recommendation.title.trim().toLowerCase();
  return activities.some(
    (activity) => activity.title.trim().toLowerCase() === normalizedTitle,
  );
}

/**
 * Returns the activity a recommendation matches — same exact-title rule as
 * isRecommendationPlanned above, kept as an independent implementation
 * (not built on top of / refactored from isRecommendationPlanned) so that
 * function is left completely untouched per Phase 3's scope boundary.
 *
 * Used by the completed-phase recap, which needs the matched activity
 * itself (to check its checked_in_at), not just a yes/no match.
 */
export function findMatchedActivity(
  recommendation: Recommendation,
  activities: Activity[],
): Activity | null {
  const normalizedTitle = recommendation.title.trim().toLowerCase();
  return (
    activities.find(
      (activity) => activity.title.trim().toLowerCase() === normalizedTitle,
    ) ?? null
  );
}
