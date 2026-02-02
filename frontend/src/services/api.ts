/**
 * API Service - Centralized HTTP client for backend communication
 */

import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import type {
  User,
  UserCreate,
  ChatRequest,
  ChatResponse,
  Trip,
} from '../types';

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

api.interceptors.response.use(
  (response) => {
    console.log(`[API] Response ${response.status}:`, response.data);
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      console.error('[API] Error response:', error.response.data);
    } else if (error.request) {
      console.error('[API] No response received:', error.request);
    } else {
      console.error('[API] Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  },

  async createUser(userData: UserCreate): Promise<User> {
    const response = await api.post<User>('/api/users', userData);
    return response.data;
  },

  async getUser(userId: number): Promise<User> {
    const response = await api.get<User>(`/api/users/${userId}`);
    return response.data;
  },

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const response = await api.post<ChatResponse>('/api/chat', request);
    return response.data;
  },

  async getUserTrips(userId: number): Promise<Trip[]> {
    const response = await api.get<{ trips: Trip[]; total: number }>(
      `/api/users/${userId}/trips`
    );
    return response.data.trips;
  },

  async getTrip(tripId: number): Promise<Trip> {
    const response = await api.get<Trip>(`/api/trips/${tripId}`);
    return response.data;
  },

  async deleteTrip(tripId: number): Promise<void> {
    await api.delete(`/api/trips/${tripId}`);
  },
};

export default api;
