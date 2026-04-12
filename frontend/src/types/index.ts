/**
 * TypeScript Types — Normalized Schema
 * ======================================
 *
 * Key change from the original design:
 *   BEFORE: Trip had trip_metadata: TripMetadata (one opaque blob)
 *   AFTER:  Trip has typed lists — activities, expenses, checklist_items,
 *           saved_travel — matching the new backend response schema exactly.
 *
 * The TripMetadata interface is kept as a deprecated alias so any
 * component that still reads trip_metadata won't immediately break.
 * Remove it once all components are updated.
 */

// ═════════════════════════════════════════════════════════════
// Auth
// ═════════════════════════════════════════════════════════════

export interface AuthRegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthTokenResponse {
  access_token:  string;
  refresh_token: string;
  token_type:    string;
  user:          User;
}

// ═════════════════════════════════════════════════════════════
// User
// ═════════════════════════════════════════════════════════════

export interface User {
  id:         number;
  email:      string;
  full_name:  string;
  created_at: string;
}

export interface UserCreate {
  email:      string;
  full_name?: string;
}

// ═════════════════════════════════════════════════════════════
// Activity  (was: TripMetadata.itinerary[].activities[])
// ═════════════════════════════════════════════════════════════

export type ActivityType = 'activity' | 'dining' | 'flight' | 'hotel' | 'transport';

export interface Activity {
  id:          number;           // integer PK — was a uuid string
  trip_id:     number;
  day:         number;           // 1-based day number
  time:        string | null;    // "HH:MM" — null for all-day items
  type:        ActivityType;
  title:       string;
  location:    string | null;
  description: string | null;
  notes:       string | null;
  booking_ref: string | null;
  sort_order:  number;
  created_at:  string;
}

export interface ActivityCreateRequest {
  day:         number;
  time?:       string;
  type:        ActivityType;
  title:       string;
  location?:   string;
  description?: string;
  notes?:      string;
  booking_ref?: string;
  sort_order?: number;
}

export interface ActivityUpdateRequest {
  time?:        string;
  type?:        ActivityType;
  title?:       string;
  location?:    string;
  description?: string;
  notes?:       string;
  booking_ref?: string;
  sort_order?:  number;
}

// ── Itinerary view helper — activities grouped by day ─────────
// Components that render the itinerary use this shape.
// Build it from Trip.activities with groupActivitiesByDay().
export interface ItineraryDay {
  day:        number;
  title?:     string;   // ← add this
  activities: Activity[];
}

// ═════════════════════════════════════════════════════════════
// Expense  (was: TripMetadata.expenses[])
// ═════════════════════════════════════════════════════════════

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'activities'
  | 'shopping'
  | 'accommodation'
  | 'other';

export interface Expense {
  id:          number;
  trip_id:     number;
  category:    string | null;
  description: string | null;
  amount:      number;           // Decimal from backend — safe as JS number for display
  currency:    string;
  date:        string | null;    // "YYYY-MM-DD"
  created_at:  string;
}

export interface ExpenseCreateRequest {
  category?:    string;
  description?: string;
  amount:       number;
  currency?:    string;
  date?:        string;
}

export interface ExpenseUpdateRequest {
  category?:    string;
  description?: string;
  amount?:      number;
  currency?:    string;
  date?:        string;
}

// ═════════════════════════════════════════════════════════════
// ChecklistItem  (was: TripMetadata.checklist[])
// ═════════════════════════════════════════════════════════════

export interface ChecklistItem {
  id:         number;
  trip_id:    number;
  text:       string;
  is_checked: boolean;
  sort_order: number;
  created_at: string;
}

export interface ChecklistItemCreateRequest {
  text:        string;
  sort_order?: number;
}

export interface ChecklistItemUpdateRequest {
  text?:       string;
  is_checked?: boolean;
  sort_order?: number;
}

// ═════════════════════════════════════════════════════════════
// SavedTravel  (was: TripMetadata.flights/hotels/transport[])
// ═════════════════════════════════════════════════════════════

export type TravelType = 'flight' | 'hotel' | 'transport';

export interface SavedTravel {
  id:         number;
  trip_id:    number;
  type:       TravelType;
  data:       Record<string, unknown>;   // full AI suggestion payload
  created_at: string;
}

export interface TravelSaveRequest {
  type: TravelType;
  data: Record<string, unknown>;
}
export interface TravelSuggestRequest {
  type:         TravelSuggestType;
  preferences?: string;
}

// ── AI suggestion shapes (not persisted — returned from /travel/suggest) ──

export type TravelSuggestType = TravelType;

export interface FlightSuggestion {
  id:              string;
  airline:         string;
  flight_number:   string;
  from:            string;
  to:              string;
  departure:       string;
  arrival:         string;
  duration:        string;
  estimated_price: number;
  currency:        string;
  cabin:           string;
  notes:           string;
  status:          'ai_suggested';
}

export interface HotelSuggestion {
  id:            string;
  name:          string;
  location:      string;
  area:          string;
  star_rating:   number;
  price_per_night: number;
  currency:      string;
  highlights:    string[];
  check_in:      string;
  check_out:     string;
  notes:         string;
  status:        'ai_suggested';
}

export interface TransportSuggestion {
  id:             string;
  type:           string;
  title:          string;
  description:    string;
  estimated_cost: number;
  cost_unit:      string;
  currency:       string;
  pros:           string[];
  notes:          string;
  status:         'ai_suggested';
}

export interface TravelSuggestResponse {
  type:       TravelSuggestType;
  flights?:   FlightSuggestion[];
  hotels?:    HotelSuggestion[];
  transport?: TransportSuggestion[];
}

// ═════════════════════════════════════════════════════════════
// Overview AI panels
// ═════════════════════════════════════════════════════════════

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertCategory = 'safety' | 'visa' | 'health' | 'weather' | 'local_laws' | 'general';
export type RecommendationCategory = 'must_see' | 'food' | 'hidden_gem' | 'practical';

export interface TravelAlert {
  id:          string;
  category:    AlertCategory;
  severity:    AlertSeverity;
  title:       string;
  description: string;
}

export interface Recommendation {
  id:          string;
  category:    RecommendationCategory;
  title:       string;
  description: string;
  tip:         string;
}

// ═════════════════════════════════════════════════════════════
// Trip
// ═════════════════════════════════════════════════════════════

export type TripStatus = 'planning' | 'booked' | 'ongoing' | 'completed' | 'cancelled';

export interface Trip {
  id:              number;
  user_id:         number;
  destination:     string;
  start_date:      string | null;
  end_date:        string | null;
  duration_days:   number | null;
  budget:          number | null;
  travelers_count: number;
  status:          TripStatus;

  // Promoted from trip_metadata — now proper typed fields
  notes:           string | null;
  cover_image_url: string | null;
  preferences:     string[];

  // Normalized relational lists — replaces trip_metadata blob
  activities:      Activity[];
  expenses:        Expense[];
  checklist_items: ChecklistItem[];
  saved_travel:    SavedTravel[];

  // AI caches — still untyped arrays (shapes vary, regenerated wholesale)
  ai_alerts:           TravelAlert[];
  ai_recommendations:  Recommendation[];

  created_at: string;
  updated_at: string | null;
}

// ═════════════════════════════════════════════════════════════
// Chat
// ═════════════════════════════════════════════════════════════

export interface ChatHistoryMessage {
  role:    'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message:      string;
  trip_id?:     number;
  chat_history?: ChatHistoryMessage[];
}

export interface ChatResponse {
  message:      string;
  action_taken: string;
  trip_data:    Trip | null;
}

// ═════════════════════════════════════════════════════════════
// Map
// ═════════════════════════════════════════════════════════════

export interface CountryData {
  countryCode: string;
  status:      TripStatus | null;
  tripCount:   number;
  trips:       Trip[];
}

export interface CountryColorMap {
  [countryCode: string]: string;
}

// ═════════════════════════════════════════════════════════════
// Utility helpers
// ═════════════════════════════════════════════════════════════

/**
 * Group a flat Activity[] into ItineraryDay[] for rendering.
 * Call this wherever you need the day-grouped view.
 *
 * Usage:
 *   const days = groupActivitiesByDay(trip.activities);
 */
export function groupActivitiesByDay(activities: Activity[]): ItineraryDay[] {
  const map = new Map<number, Activity[]>();

  for (const act of activities) {
    if (!map.has(act.day)) map.set(act.day, []);
    map.get(act.day)!.push(act);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([day, acts]) => ({
      day,
      activities: acts.sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return (a.time ?? '').localeCompare(b.time ?? '');
      }),
    }));
}

/**
 * Sum all expenses for a trip in a given currency.
 * Returns 0 if no matching expenses.
 */
export function sumExpenses(expenses: Expense[], currency = 'SGD'): number {
  return expenses
    .filter(e => e.currency === currency)
    .reduce((sum, e) => sum + Number(e.amount), 0);
}

// ═════════════════════════════════════════════════════════════
// Deprecated — kept for backward compat during component migration
// Remove once all components are updated to use Trip.activities etc.
// ═════════════════════════════════════════════════════════════

/** @deprecated Use Trip.activities, Trip.expenses, etc. directly */
export interface TripMetadata {
  itinerary?:    unknown[];
  flights?:      unknown[];
  hotels?:       unknown[];
  transport?:    unknown[];
  expenses?:     unknown[];
  checklist?:    unknown[];
  notes?:        string;
  preferences?:  string[];
  description?:  string;
}