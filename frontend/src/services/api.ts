/**
 * API Service - Centralized HTTP client for backend communication
 *
 * Week 8 additions:
 *   - addActivity / deleteActivity  — manual itinerary management
 *   - suggestTravel                 — AI travel suggestions (flights/hotels/transport)
 *   - saveTravelItem                — persist one AI suggestion to trip_metadata
 */

import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import type {
  User,
  UserCreate,
  ChatRequest,
  ChatResponse,
  Trip,
  Activity,
  TravelSuggestResponse,
  TravelSuggestType,
  TravelAlert,
  Recommendation,
} from '../types';

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 90000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => { console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`); return config; },
  (error)  => { console.error('[API] Request error:', error); return Promise.reject(error); }
);

api.interceptors.response.use(
  (response) => { console.log(`[API] Response ${response.status}:`, response.data); return response; },
  (error: AxiosError) => {
    if (error.response)    console.error('[API] Error response:', error.response.data);
    else if (error.request) console.error('[API] No response:', error.request);
    else                   console.error('[API] Error:', error.message);
    return Promise.reject(error);
  }
);

// ── Request types ─────────────────────────────────────────────

export interface ActivityCreateRequest {
  day: number;
  time: string;
  type: Activity['type'];
  title: string;
  location?: string;
  description?: string;
  notes?: string;
}

export interface TravelSuggestRequest {
  type: TravelSuggestType;
  preferences?: string;
}

export interface TravelSaveRequest {
  type: TravelSuggestType;
  item: Record<string, unknown>;
}

// ── API service ───────────────────────────────────────────────

export const apiService = {
  async healthCheck() {
    return (await api.get('/health')).data;
  },

  async createUser(userData: UserCreate): Promise<User> {
    return (await api.post<User>('/api/users', userData)).data;
  },

  async getUser(userId: number): Promise<User> {
    return (await api.get<User>(`/api/users/${userId}`)).data;
  },

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    return (await api.post<ChatResponse>('/api/chat', request)).data;
  },

  async getUserTrips(userId: number): Promise<Trip[]> {
    return (await api.get<{ trips: Trip[]; total: number }>(`/api/users/${userId}/trips`)).data.trips;
  },

  async getTrip(tripId: number): Promise<Trip> {
    return (await api.get<Trip>(`/api/trips/${tripId}`)).data;
  },

  async updateTrip(tripId: number, updates: Record<string, unknown>): Promise<Trip> {
    return (await api.put<Trip>(`/api/trips/${tripId}`, updates)).data;
  },

  async deleteTrip(tripId: number): Promise<void> {
    await api.delete(`/api/trips/${tripId}`);
  },

  // ── Activity management ──────────────────────────────────

  /** Add a single activity to a trip day. Returns full updated Trip. */
  async addActivity(tripId: number, activity: ActivityCreateRequest): Promise<Trip> {
    return (await api.post<Trip>(`/api/trips/${tripId}/activities`, activity)).data;
  },

  /** Delete an activity by ID. Returns full updated Trip. */
  async deleteActivity(tripId: number, activityId: string): Promise<Trip> {
    return (await api.delete<Trip>(`/api/trips/${tripId}/activities/${activityId}`)).data;
  },

  // ── Travel AI suggestions ────────────────────────────────

  /**
   * Ask GPT-4 to suggest 3 flights / hotels / transport options.
   * Uses the trip's existing destination, dates and budget as context.
   * Returns structured suggestion objects — not persisted yet.
   */
  async suggestTravel(tripId: number, request: TravelSuggestRequest): Promise<TravelSuggestResponse> {
    return (
      await api.post<TravelSuggestResponse>(`/api/trips/${tripId}/travel/suggest`, request)
    ).data;
  },

  /**
   * Save one AI suggestion to trip_metadata.flights/hotels/transport.
   * Pass the exact object returned from suggestTravel.
   * Returns full updated Trip.
   */
  async saveTravelItem(tripId: number, request: TravelSaveRequest): Promise<Trip> {
    return (await api.post<Trip>(`/api/trips/${tripId}/travel/save`, request)).data;
  },
  // ── Overview AI panels ───────────────────────────────────

  /**
   * Generate GPT-4 travel alerts for the trip destination.
   * Not persisted — frontend caches in sessionStorage.
   */
  async getOverviewAlerts(tripId: number): Promise<{ alerts: TravelAlert[] }> {
    return (
      await api.post<{ alerts: TravelAlert[] }>(`/api/trips/${tripId}/overview/alerts`)
    ).data;
  },

  /**
   * Generate GPT-4 personalized recommendations for the trip.
   * Context-aware: uses destination, dates, budget, preferences.
   * Not persisted — frontend caches in sessionStorage.
   */
  async getOverviewRecommendations(tripId: number): Promise<{ recommendations: Recommendation[] }> {
    return (
      await api.post<{ recommendations: Recommendation[] }>(
        `/api/trips/${tripId}/overview/recommendations`
      )
    ).data;
  },
};

export default api;