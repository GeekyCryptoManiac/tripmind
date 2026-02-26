/**
 * TypeScript types matching backend Pydantic schemas
 *
 * Week 5: ChecklistItem, Expense, TripMetadata updates
 * Week 6: ChatHistoryMessage, ChatRequest updates
 * Week 8: Activity management, Transport type, travel AI suggestions
 */

// ── User types ────────────────────────────────────────────────
export interface User {
  id: number;
  email: string;
  full_name: string;
  created_at: string;
}

export interface UserCreate {
  email: string;
  full_name?: string;
}

// ── Trip types ────────────────────────────────────────────────
export interface Trip {
  id: number;
  user_id: number;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  budget: number | null;
  travelers_count: number;
  status: string;
  trip_metadata?: TripMetadata;
  created_at: string;
  updated_at: string | null;
}

// ── Chat types ────────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  user_id: number;
  message: string;
  trip_id?: number;
  chat_history?: ChatHistoryMessage[];
}

export interface ChatResponse {
  message: string;
  action_taken: string;
  trip_data: Trip | null;
}

// ── API Response types ────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

// ── Map-specific types ────────────────────────────────────────
export interface CountryData {
  countryCode: string;
  status: 'planning' | 'booked' | 'completed' | null;
  tripCount: number;
  trips: Trip[];
}

export interface CountryColorMap {
  [countryCode: string]: string;
}

// ── Itinerary types ───────────────────────────────────────────
export interface Activity {
  id: string;
  time: string;
  type: 'flight' | 'hotel' | 'activity' | 'dining' | 'transport';
  title: string;
  location?: string;
  description?: string;
  booking_ref?: string | null;
  notes?: string;
}

export interface ItineraryDay {
  day: number;
  date: string;
  title?: string;
  activities: Activity[];
}

// ── Booking Types ─────────────────────────────────────────────
export interface Flight {
  id: string;
  airline: string;
  flight_number: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  duration?: string;
  estimated_price?: number;
  currency?: string;
  cabin?: string;
  notes?: string;
  status: 'ai_suggested' | 'mock' | 'booked' | 'pending';
}

export interface Hotel {
  id: string;
  name: string;
  location: string;
  area?: string;
  star_rating?: number;
  price_per_night?: number;
  currency?: string;
  highlights?: string[];
  check_in?: string;
  check_out?: string;
  notes?: string;
  status: 'ai_suggested' | 'mock' | 'booked' | 'pending';
}

// ── Week 8: Transport type ────────────────────────────────────
export interface Transport {
  id: string;
  type: 'taxi' | 'train' | 'bus' | 'rental' | 'ferry' | 'other';
  title: string;
  description: string;
  estimated_cost?: number;
  cost_unit?: string;   // e.g. "per person total", "per day"
  currency?: string;
  duration?: string | null;
  pros?: string[];
  notes?: string;
  status: 'ai_suggested' | 'booked' | 'pending';
}

// ── Week 8: Travel AI suggestion types ───────────────────────
export type TravelSuggestType = 'flights' | 'hotels' | 'transport';

export interface TravelSuggestResponse {
  type: TravelSuggestType;
  flights?: Flight[];
  hotels?: Hotel[];
  transport?: Transport[];
}

// ── Itinerary Config ──────────────────────────────────────────
export interface ItineraryConfig {
  destination: string;
  duration_days: number;
  days_generated: number;
  total_trip_days: number;
  is_partial: boolean;
  generated_at: string;
  detail_level?: string;
}

// ── Week 5: Pre-Trip Checklist ────────────────────────────────
export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  checked_at?: string;
}

// ── Week 5: Expense Tracking ──────────────────────────────────
export interface Expense {
  id: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  description: string;
  date: string;
  created_at: string;
}

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'activities'
  | 'shopping'
  | 'accommodation'
  | 'other';

// ── Trip Metadata ─────────────────────────────────────────────
export interface TripMetadata {
  itinerary?: ItineraryDay[];
  flights?: Flight[];
  hotels?: Hotel[];
  transport?: Transport[];      // Week 8: local transport suggestions
  itinerary_config?: ItineraryConfig;
  notes?: string;
  description?: string;
  preferences?: string[];
  checklist?: ChecklistItem[];
  expenses?: Expense[];
}

// ── Week 8: Overview AI types ─────────────────────────────────

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertCategory = 'safety' | 'visa' | 'health' | 'weather' | 'local_laws' | 'general';
export type RecommendationCategory = 'must_see' | 'food' | 'hidden_gem' | 'practical';

export interface TravelAlert {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
}

export interface Recommendation {
  id: string;
  category: RecommendationCategory;
  title: string;
  description: string;
  tip?: string;
}