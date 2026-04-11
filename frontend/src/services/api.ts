/**
 * API Service — Centralized HTTP client
 *
 * Auth additions:
 *   - setAuthToken / clearAuthToken  — called by UserContext on login/logout
 *   - Request interceptor            — attaches Bearer token to every request
 *   - Response interceptor           — silently refreshes on 401, retries once
 *                                      redirects to /auth if refresh fails
 */

import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
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

// ── Auth types ────────────────────────────────────────────────

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
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

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

// ── Axios instance ────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 90000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Token management (called by UserContext) ──────────────────

export function setAuthToken(token: string): void {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export function clearAuthToken(): void {
  delete api.defaults.headers.common['Authorization'];
}

// ── Refresh state — prevents concurrent refresh storms ───────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

// ── Request interceptor — attach Bearer token ─────────────────

api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// ── Response interceptor — handle 401 + token refresh ────────

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

api.interceptors.response.use(
  (response) => {
    console.log(`[API] Response ${response.status}:`, response.data);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined;

    // Only attempt refresh once per request, and only on 401
    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      if (error.response) console.error('[API] Error response:', error.response.data);
      return Promise.reject(error);
    }

    // Queue additional requests that arrive while we're refreshing
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem('tripmind_refresh_token');

    if (!refreshToken) {
      isRefreshing = false;
      processQueue(error, null);
      // Not logged in — redirect to auth
      window.location.href = '/auth';
      return Promise.reject(error);
    }

    try {
      // Use plain axios (not the instance) to avoid recursive 401 handling
      const { data } = await axios.post<AuthTokenResponse>(
        `${api.defaults.baseURL}/api/auth/refresh`,
        { refresh_token: refreshToken }
      );

      // Persist new tokens
      localStorage.setItem('tripmind_access_token', data.access_token);
      localStorage.setItem('tripmind_refresh_token', data.refresh_token);

      // Update default header + this request's header
      setAuthToken(data.access_token);
      originalRequest.headers['Authorization'] = `Bearer ${data.access_token}`;

      processQueue(null, data.access_token);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Refresh failed — clear tokens and send user to login
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

// ── API service ───────────────────────────────────────────────

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

  // ── Legacy user creation (guest flow, kept for compatibility) ──

  async createUser(userData: UserCreate): Promise<User> {
    return (await api.post<User>('/api/users', userData)).data;
  },

  async getUser(userId: number): Promise<User> {
    return (await api.get<User>(`/api/users/${userId}`)).data;
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

  async addActivity(tripId: number, activity: ActivityCreateRequest): Promise<Trip> {
    return (await api.post<Trip>(`/api/trips/${tripId}/activities`, activity)).data;
  },

  async deleteActivity(tripId: number, activityId: string): Promise<Trip> {
    return (await api.delete<Trip>(`/api/trips/${tripId}/activities/${activityId}`)).data;
  },

  // ── Travel AI suggestions ──────────────────────────────────

  async suggestTravel(tripId: number, request: TravelSuggestRequest): Promise<TravelSuggestResponse> {
    return (
      await api.post<TravelSuggestResponse>(`/api/trips/${tripId}/travel/suggest`, request)
    ).data;
  },

  async saveTravelItem(tripId: number, request: TravelSaveRequest): Promise<Trip> {
    return (await api.post<Trip>(`/api/trips/${tripId}/travel/save`, request)).data;
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