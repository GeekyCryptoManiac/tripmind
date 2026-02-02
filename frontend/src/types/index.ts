/**
 * TypeScript types matching backend Pydantic schemas
 */

// User types
export interface User {
  id: number;
  email: string;
  full_name: string;
  created_at: string;
}

export interface UserCreate {
  email: string;
  full_name?: string;  // Make name optional since backend might not require it
}

// Trip types
export interface Trip {
  id: number;
  user_id: number;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;     // ADDED: Duration in days
  budget: number | null;
  travelers_count: number;          // ADDED: Number of travelers (default 1)
  status: string;                   // "planning" | "booked" | "completed"
  trip_metadata: Record<string, any>;
  created_at: string;
  updated_at: string | null;
}

// Chat types
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
  message: string;           // Changed from "response" to "message"
  action_taken: string;
  trip_data: Trip | null;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

// Map-specific types
export interface CountryData {
  countryCode: string;
  status: 'planning' | 'booked' | 'completed' | null;
  tripCount: number;
  trips: Trip[];
}

export interface CountryColorMap {
  [countryCode: string]: string;  // ISO country code -> hex color
}