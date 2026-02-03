/**
 * Chat-specific types — defines the contract between components and services.
 * We define these NOW so the mock matches exactly what the real backend will return later.
 */

export type ChatType = 'general' | 'trip';

/** Context object passed into trip-specific chat for contextual responses */
export interface TripChatContext {
  tripId: number;
  destination: string;
  status: string;
  budget: number | null;
  startDate: string | null;
  endDate: string | null;
  durationDays: number | null;
  travelersCount: number;
}

/** What we send TO the chat service */
export interface SendMessageRequest {
  user_id: number;
  message: string;
  trip_id?: number;
  tripContext?: TripChatContext;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/** What we get BACK from the chat service */
export interface SendMessageResponse {
  message: string;
  action_taken?: string;
  trip_data?: any;
}

/** The interface both Mock and Real services implement */
export interface IChatService {
  sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;
}