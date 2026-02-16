/**
 * TypeScript types matching backend Pydantic schemas
 *
 * Week 5 additions:
 *   - ChecklistItem  (Day 2: pre-trip checklist)
 *   - Expense        (Day 5: expense tracking)
 *   - TripMetadata updated with checklist? and expenses?
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
  status: string;                   // "planning" | "booked" | "completed"
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

export interface ChatRequest {
  user_id: number;
  message: string;
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
  from: string;
  to: string;
  departure: string;
  arrival: string;
  airline: string;
  flight_number: string;
  status: 'mock' | 'booked' | 'pending';
  notes?: string;
}

export interface Hotel {
  id: string;
  name: string;
  location: string;
  check_in: string;
  check_out: string;
  status: 'mock' | 'booked' | 'pending';
  notes?: string;
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
/**
 * Represents a single pre-trip checklist item.
 * Saved as an array in trip_metadata.checklist via updateTrip().
 */
export interface ChecklistItem {
  id: string;               // e.g. "passport", "flights", "insurance"
  label: string;            // Display text shown in the UI
  checked: boolean;
  checked_at?: string;      // ISO timestamp of when it was checked (optional)
}

// ── Week 5: Expense Tracking ──────────────────────────────────
/**
 * Represents a single expense entry.
 * Saved as an array in trip_metadata.expenses via updateTrip().
 */
export interface Expense {
  id: string;               // uuid or timestamp-based ID
  amount: number;
  currency: string;         // e.g. "SGD", "USD", "EUR"
  category: ExpenseCategory;
  description: string;
  date: string;             // YYYY-MM-DD — the day the expense occurred
  created_at: string;       // ISO timestamp of when it was logged
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
  itinerary_config?: ItineraryConfig;
  notes?: string;
  description?: string;
  preferences?: string[];
  checklist?: ChecklistItem[];       // Week 5 Day 2: pre-trip checklist
  expenses?: Expense[];              // Week 5 Day 5: expense tracking
}