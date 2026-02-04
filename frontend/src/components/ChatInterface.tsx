/**
 * ChatInterface Component
 * 
 * Two modes:
 *   General (default) → full-page layout, real backend API, used by ChatPage
 *   Trip (embedded)   → compact layout, mock service, used inside TripDetailsPage
 * 
 * All new props are optional — ChatPage needs zero changes.
 */

import { useState, useRef, useEffect } from 'react';
import { getChatService } from '../services/chatService';
import type { ChatMessage } from '../types';
import type { ChatType, TripChatContext } from '../types/chat';
import TripCard from './TripCard';


interface ChatInterfaceProps {
  userId: number;
  chatType?: ChatType;           // 'general' | 'trip'  — default 'general'
  tripId?: number;               // Required when chatType === 'trip'
  tripContext?: TripChatContext;  // Passed to service for contextual responses
  embedded?: boolean;            // true → no header, h-full instead of h-screen
}

// ── Simple inline markdown renderer ──────────────────────────
// Converts **bold** to <strong> without dangerouslySetInnerHTML.
// Keeps everything else as plain text with newline support.
function renderMessageContent(text: string) {
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={lineIdx}>
        {parts.map((part, partIdx) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={partIdx}>{part.slice(2, -2)}</strong>
          ) : (
            <span key={partIdx}>{part}</span>
          )
        )}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    );
  });
}

export default function ChatInterface({
  userId,
  chatType = 'general',
  tripId,
  tripContext,
  embedded = false,
}: ChatInterfaceProps) {
  // ── Initial greeting depends on chat type ──────────────────
  const getInitialMessage = (): ChatMessage => {
    if (chatType === 'trip' && tripContext) {
      return {
        role: 'assistant',
        content: [
          `Hi! I'm your AI assistant for your **${tripContext.destination}** trip. 🌍`,
          '',
          'I can help you with:',
          `  • Planning your ${tripContext.durationDays ? tripContext.durationDays + '-day ' : ''}itinerary`,
          `  • Budget management${tripContext.budget ? ` ($${tripContext.budget.toLocaleString()} total)` : ''}`,
          '  • Flights & accommodation',
          '  • Packing & preparation',
          '',
          'What would you like to know?',
        ].join('\n'),
        timestamp: new Date().toISOString(),
      };
    }
    return {
      role: 'assistant',
      content: "Hi! I'm your AI travel assistant. Tell me where you'd like to go!",
      timestamp: new Date().toISOString(),
    };
  };

  const [messages, setMessages] = useState<ChatMessage[]>([getInitialMessage()]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastTripData, setLastTripData] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get the right service once (general → Real, trip → Mock while flag is on)
  const chatService = getChatService(chatType);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send ────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatService.sendMessage({
        user_id: userId,
        message: input,
        trip_id: tripId,
        tripContext,
        conversationHistory: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.message,
          timestamp: new Date().toISOString(),
        },
      ]);

      if (response.trip_data) {
        setLastTripData(response.trip_data);
      }
    } catch (error) {
      console.error('[ChatInterface] Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`flex flex-col ${embedded ? 'h-full' : 'h-screen'} bg-gray-50`}>
      {/* ── Header ──────────────────────────────────────────── */}
      {!embedded ? (
        // Full-page header (general chat)
        <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800">✈️ TripMind</h1>
          <p className="text-sm text-gray-600">AI Travel Planning Assistant</p>
        </div>
      ) : (
        // Compact context banner (trip chat, embedded)
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">💬</span>
            <p className="text-sm font-semibold text-blue-800">
              Trip Assistant — {tripContext?.destination}
            </p>
          </div>
          <span className="text-xs text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full font-medium">
            Trip-specific
          </span>
        </div>
      )}

      {/* ── Messages list ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-4 ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-800 shadow-sm border border-gray-200'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {renderMessageContent(msg.content)}
              </p>
              <p
                className={`text-xs mt-2 ${
                  msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                }`}
              >
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        {/* Trip card preview (general chat only — when agent creates a trip) */}
        {lastTripData && chatType === 'general' && (
          <div className="flex justify-center">
            <TripCard trip={lastTripData} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input bar ───────────────────────────────────────── */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              chatType === 'trip'
                ? `Ask about your ${tripContext?.destination || 'trip'}...`
                : 'Type your message... (Shift+Enter for new line)'
            }
            className="flex-1 resize-none border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">
          {embedded
            ? 'Try: "What\'s the best budget breakdown?" or "Help me plan my itinerary"'
            : 'Try: "Plan a 5-day trip to Tokyo in March with a $2000 budget"'}
        </p>
      </div>
    </div>
  );
}