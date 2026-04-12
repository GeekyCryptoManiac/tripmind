/**
 * API Service — Normalized Schema
 * ==================================
 *
 * Key changes from the original:
 *
 *   1. Auth methods (register, login, refresh, getMe) added
 *   2. Bearer token interceptor (setAuthToken / clearAuthToken)
 *   3. Activity endpoints now return ActivityResponse (not full Trip)
 *   4. Expense, Checklist, SavedTravel each have full CRUD
 *   5. saveTravelItem now posts to /travel/save with { type, data }
 *   6. deleteTrip is now wired (was missing a handler before)
 *   7. 401 refresh interceptor — silently refreshes expired access tokens
 */

import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type {
  User,
  UserCreate,
  Trip,
  Activity,
  ActivityCreateRequest,
  ActivityUpdateRequest,
  Expense,
  ExpenseCreateRequest,
  ExpenseUpdateRequest,
  ChecklistItem,
  ChecklistItemCreateRequest,
  ChecklistItemUpdateRequest,
  SavedTravel,
  TravelSaveRequest,
  TravelSuggestRequest,
  TravelSuggestResponse,
  TravelAlert,
  Recommendation,
  ChatRequest,
  ChatResponse,
  AuthRegisterRequest,
  AuthLoginRequest,
  AuthTokenResponse,
} from '../types';

// ── Axios instance ────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 90_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Token helpers (called by UserContext) ─────────────────────

export function setAuthToken(token: string): void {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export function clearAuthToken(): void {
  delete api.defaults.headers.common['Authorization'];
}

// ── Silent token refresh ──────────────────────────────────────

let isRefreshing = false;
let failedQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token!));
  failedQueue = [];
}

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

api.interceptors.response.use(
  r => r,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;

    if (error.response?.status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        original.headers['Authorization'] = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing    = true;

    const refreshToken = localStorage.getItem('tripmind_refresh_token');
    if (!refreshToken) {
      isRefreshing = false;
      processQueue(error, null);
      window.location.href = '/auth';
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post<AuthTokenResponse>(
        `${api.defaults.baseURL}/api/auth/refresh`,
        { refresh_token: refreshToken }
      );
      localStorage.setItem('tripmind_access_token',  data.access_token);
      localStorage.setItem('tripmind_refresh_token', data.refresh_token);
      setAuthToken(data.access_token);
      original.headers['Authorization'] = `Bearer ${data.access_token}`;
      processQueue(null, data.access_token);
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      localStorage.removeItem('tripmind_access_token');
      localStorage.removeItem('tripmind_refresh_token');
      clearAuthToken();
      window.location.href = '/auth';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ── Request logger ────────────────────────────────────────────

api.interceptors.request.use(config => {
  console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// ═════════════════════════════════════════════════════════════
// API service
// ═════════════════════════════════════════════════════════════

export const apiService = {

  // ── Auth ──────────────────────────────────────────────────

  async register(data: AuthRegisterRequest): Promise<AuthTokenResponse> {
    return (await api.post<AuthTokenResponse>('/api/auth/register', data)).data;
  },

  async login(data: AuthLoginRequest): Promise<AuthTokenResponse> {
    return (await api.post<AuthTokenResponse>('/api/auth/login', data)).data;
  },

  async getMe(): Promise<User> {
    return (await api.get<User>('/api/auth/me')).data;
  },

  // ── Health ─────────────────────────────────────────────────

  async healthCheck() {
    return (await api.get('/health')).data;
  },

  // ── Legacy user creation (guest flow, deprecated) ─────────

  async createUser(userData: UserCreate): Promise<User> {
    return (await api.post<User>('/api/users', userData)).data;
  },

  // ── Chat ───────────────────────────────────────────────────

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    return (await api.post<ChatResponse>('/api/chat', request)).data;
  },

  // ── Trips ──────────────────────────────────────────────────

  async getUserTrips(userId: number): Promise<Trip[]> {
    return (
      await api.get<{ trips: Trip[]; total: number }>(`/api/users/${userId}/trips`)
    ).data.trips;
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

  // ── Activities ─────────────────────────────────────────────
  // NOTE: These now return ActivityResponse, not the full Trip.
  // Update any component that was using the Trip return value.

  async addActivity(tripId: number, data: ActivityCreateRequest): Promise<Activity> {
    return (await api.post<Activity>(`/api/trips/${tripId}/activities`, data)).data;
  },

  async updateActivity(
    tripId: number,
    activityId: number,
    data: ActivityUpdateRequest
  ): Promise<Activity> {
    return (
      await api.patch<Activity>(`/api/trips/${tripId}/activities/${activityId}`, data)
    ).data;
  },

  async deleteActivity(tripId: number, activityId: number): Promise<void> {
    await api.delete(`/api/trips/${tripId}/activities/${activityId}`);
  },

  // ── Expenses ───────────────────────────────────────────────

  async addExpense(tripId: number, data: ExpenseCreateRequest): Promise<Expense> {
    return (await api.post<Expense>(`/api/trips/${tripId}/expenses`, data)).data;
  },

  async updateExpense(
    tripId: number,
    expenseId: number,
    data: ExpenseUpdateRequest
  ): Promise<Expense> {
    return (
      await api.patch<Expense>(`/api/trips/${tripId}/expenses/${expenseId}`, data)
    ).data;
  },

  async deleteExpense(tripId: number, expenseId: number): Promise<void> {
    await api.delete(`/api/trips/${tripId}/expenses/${expenseId}`);
  },

  // ── Checklist ──────────────────────────────────────────────

  async addChecklistItem(
    tripId: number,
    data: ChecklistItemCreateRequest
  ): Promise<ChecklistItem> {
    return (await api.post<ChecklistItem>(`/api/trips/${tripId}/checklist`, data)).data;
  },

  async updateChecklistItem(
    tripId: number,
    itemId: number,
    data: ChecklistItemUpdateRequest
  ): Promise<ChecklistItem> {
    return (
      await api.patch<ChecklistItem>(`/api/trips/${tripId}/checklist/${itemId}`, data)
    ).data;
  },

  async deleteChecklistItem(tripId: number, itemId: number): Promise<void> {
    await api.delete(`/api/trips/${tripId}/checklist/${itemId}`);
  },

  // ── Saved travel ───────────────────────────────────────────

  /**
   * Save one AI suggestion to the DB.
   * data is the full suggestion object from suggestTravel().
   */
  async saveTravelItem(tripId: number, request: TravelSaveRequest): Promise<SavedTravel> {
    return (
      await api.post<SavedTravel>(`/api/trips/${tripId}/travel/save`, request)
    ).data;
  },

  async deleteSavedTravel(tripId: number, itemId: number): Promise<void> {
    await api.delete(`/api/trips/${tripId}/travel/${itemId}`);
  },

  // ── Travel AI suggestions (not persisted) ─────────────────

  async suggestTravel(
    tripId: number,
    request: TravelSuggestRequest
  ): Promise<TravelSuggestResponse> {
    return (
      await api.post<TravelSuggestResponse>(`/api/trips/${tripId}/travel/suggest`, request)
    ).data;
  },

  // ── Overview AI panels ─────────────────────────────────────

  async getOverviewAlerts(tripId: number): Promise<{ alerts: TravelAlert[] }> {
    return (
      await api.post<{ alerts: TravelAlert[] }>(`/api/trips/${tripId}/overview/alerts`)
    ).data;
  },

  async getOverviewRecommendations(
    tripId: number
  ): Promise<{ recommendations: Recommendation[] }> {
    return (
      await api.post<{ recommendations: Recommendation[] }>(
        `/api/trips/${tripId}/overview/recommendations`
      )
    ).data;
  },
};

export default api;