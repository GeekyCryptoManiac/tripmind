/**
 * TypeScript types matching backend Pydantic schemas
 *
 * Week 5 additions:
 *   - ChecklistItem  (Day 2: pre-trip checklist)
 *   - Expense        (Day 5: expense tracking)
 *   - TripMetadata updated with checklist? and expenses?
 *
 * Week 6 additions:
 *   - ChatHistoryMessage  (Day 5: chat memory)
 *   - ChatRequest updated with trip_id and chat_history
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

/**
 * A single message in the history sent to the backend.
 * No timestamp — the agent only needs role + content.
 */
export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  user_id: number;
  message: string;
  trip_id?: number;                         // For trip-specific chat context
  chat_history?: ChatHistoryMessage[];      // Full prior conversation, oldest first
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
  itinerary_config?: ItineraryConfig;
  notes?: string;
  description?: string;
  preferences?: string[];
  checklist?: ChecklistItem[];
  expenses?: Expense[];
}