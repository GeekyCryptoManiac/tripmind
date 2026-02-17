/**

 * Chat Service Layer

 * 

 * MockChatService  → used for trip chat in Week 3 (no backend endpoint yet)

 * RealChatService  → used for general chat NOW, and trip chat in Week 5

 * getChatService() → factory that picks the right one based on config + chat type

 */

import type { IChatService, SendMessageRequest, SendMessageResponse } from '../types/chat';

import { generateMockTripResponse } from '../mocks/chatMessages';

import { apiService } from './api';

import { CONFIG } from '../config/config';

// ── Mock Service (trip chat, Week 3-4) ────────────────────────

class MockChatService implements IChatService {

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {

    // Simulate realistic network delay: 600–1400ms

    await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 800));

    const responseText = generateMockTripResponse(request.message, request.tripContext);

    return {

      message: responseText,

      action_taken: 'mock_response',

    };

  }

}

// ── Real Service (general chat NOW, trip chat in Week 5) ──────

class RealChatService implements IChatService {

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {

    const response = await apiService.sendMessage({

      user_id: request.user_id,

      message: request.message,

      // Pass trip_id if present (trip-specific chat context)

      ...(request.trip_id !== undefined && { trip_id: request.trip_id }),

      // Pass conversation history so the agent has memory across turns.

      // conversationHistory comes from ChatInterface's messages state —

      // strip timestamps since the backend only needs role + content.

      chat_history: (request.conversationHistory ?? []).map(({ role, content }) => ({

        role,

        content,

      })),

    });

    return response;

  }

}

// ── Factory ───────────────────────────────────────────────────

/**

 * Returns the correct service:

 *   general chat → RealChatService (always, backend is ready)

 *   trip chat    → MockChatService (while CONFIG.USE_MOCK_CHAT is true)

 *                → RealChatService (Week 5, flip the flag)

 */

export function getChatService(chatType: 'general' | 'trip'): IChatService {

  if (chatType === 'trip' && CONFIG.USE_MOCK_CHAT) {

    return new MockChatService();

  }

  return new RealChatService();

}