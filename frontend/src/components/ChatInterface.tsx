/**
 * ChatInterface — Redesigned Week 7 (Qubi-inspired)
 *
 * Unified design for both general and trip chat.
 * Clean bubbles, spacious layout, lavender gradient background.
 *
 * Two modes (same UI, different context):
 *   - General: full-page, creates trips via agent
 *   - Trip: embedded in TripDetailsPage, trip-specific assistance
 */

import { useState, useRef, useEffect } from 'react';
import { getChatService } from '../services/chatService';
import type { ChatType, TripChatContext } from '../types/chat';
import TripCard from './TripCard';
import logoAsset from '../assets/tripMind_logo.png'; 

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// ── localStorage helpers ──────────────────────────────────────
function loadChatHistory(tripId: number): ChatMessage[] | null {
  try {
    const raw = localStorage.getItem(`chat_trip_${tripId}`);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : null;
  } catch {
    return null;
  }
}

function saveChatHistory(tripId: number, messages: ChatMessage[]): void {
  try {
    localStorage.setItem(`chat_trip_${tripId}`, JSON.stringify(messages));
  } catch {
    // Quota exceeded — fail silently
  }
}

interface ChatInterfaceProps {
  userId: number;
  chatType?: ChatType;
  tripId?: number;
  tripContext?: TripChatContext;
  embedded?: boolean;
}

// ── Markdown renderer ─────────────────────────────────────────
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
  // ── Initial greeting ────────────────────────────────────────
  const getInitialMessage = (): ChatMessage => {
    if (chatType === 'trip' && tripContext) {
      const { destination, origin, activitiesCount, waypointCities, durationDays, travelersCount } = tripContext;

      const routeParts = [origin, ...waypointCities, destination];
      const routeStr = routeParts.length > 2
        ? routeParts.join(' → ')
        : destination;

      let contextLine = '';
      if (durationDays) contextLine += `${durationDays}-day `;
      if (travelersCount > 1) contextLine += `trip for ${travelersCount} travellers`;
      else contextLine += 'trip';

      const itineraryLine = activitiesCount > 0
        ? `You have **${activitiesCount} activit${activitiesCount === 1 ? 'y' : 'ies'}** planned so far.`
        : "Your itinerary is empty — I can help you fill it in.";

      return {
        role: 'assistant',
        content: `Hi! I'm your AI assistant for your **${routeStr}** ${contextLine}. ${itineraryLine} Ask me anything — itinerary ideas, budget tips, flights, hotels, packing, or local advice.`,
        timestamp: new Date().toISOString(),
      };
    }
    return {
      role: 'assistant',
      content: "Hi! I'm your AI travel assistant. Tell me where you'd like to go and I'll help you plan the perfect trip!",
      timestamp: new Date().toISOString(),
    };
  };

  // ── Suggested prompts ───────────────────────────────────────
  const getSuggestedPrompts = (): string[] => {
    if (chatType !== 'trip' || !tripContext) return [];
    const { destination, activitiesCount, waypointCities, budget, durationDays } = tripContext;
    const stops = waypointCities.length > 0 ? waypointCities : [destination];
    const prompts: string[] = [];

    if (activitiesCount === 0) {
      prompts.push(`Build me a day-by-day itinerary for ${destination}`);
    } else {
      prompts.push(`Review my itinerary and suggest improvements`);
    }

    if (stops.length > 1) {
      prompts.push(`What's the best order to visit ${stops.join(', ')} and ${destination}?`);
    } else {
      prompts.push(`What are the must-see attractions in ${destination}?`);
    }

    if (budget) {
      prompts.push(`How can I make the most of my ${budget} budget?`);
    } else {
      prompts.push(`What's a realistic budget for this trip?`);
    }

    if (durationDays && durationDays <= 5) {
      prompts.push(`Give me a tight ${durationDays}-day plan for ${destination}`);
    } else {
      prompts.push(`What are the best local food experiences in ${destination}?`);
    }

    return prompts.slice(0, 4);
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (chatType === 'trip' && tripId) {
      const saved = loadChatHistory(tripId);
      if (saved && saved.length > 0) return saved;
    }
    return [getInitialMessage()];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastTripData, setLastTripData] = useState<any>(null);
  const [chipsDismissed, setChipsDismissed] = useState(() => {
    if (chatType !== 'trip' || !tripId) return false;
    const saved = loadChatHistory(tripId);
    return (saved?.length ?? 0) > 1;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chatService = getChatService(chatType);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Persist trip chat to localStorage on every update
  useEffect(() => {
    if (chatType === 'trip' && tripId) {
      saveChatHistory(tripId, messages);
    }
  }, [messages, chatType, tripId]);

  // ── Send ────────────────────────────────────────────────────
  const handleSendText = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setChipsDismissed(true);

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatService.sendMessage({
        user_id: userId,
        message: text,
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

  const handleSend = () => handleSendText(input);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Empty state ─────────────────────────────────────────────
  const showEmptyState = messages.length === 1 && !isLoading;

  return (
    <div className={`flex flex-col ${embedded ? 'h-full' : 'h-screen'} bg-gradient-to-br from-chat-bg to-purple-100`}>
      
      {/* ── Messages ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          
          {/* Empty state — centered welcome (full-page only) */}
          {showEmptyState && !embedded && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
              <div className="w-16 h-16 rounded-full bg-chat-avatar flex items-center justify-center mb-6">
                <img src={logoAsset} alt="TripMind AI" className="w-15 h-15 object-contain" />
              </div>
              <h1 className="text-4xl font-semibold text-ink mb-3">
                How can we <span className="text-purple-600">assist</span> you today?
              </h1>
              <p className="text-ink-secondary max-w-md leading-relaxed">
                {chatType === 'trip' && tripContext
                  ? `Get personalized help for your ${tripContext.destination} trip. Ask about itineraries, budgets, bookings, or anything else.`
                  : "Tell me where you'd like to go. I'll build your itinerary, manage your budget, and keep every detail organized."}
              </p>
            </div>
          )}

          {/* Message list — always rendered in embedded mode so it never shows blank */}
          {(!showEmptyState || embedded) && messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 mb-6 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold ${
                msg.role === 'user'
                  ? 'bg-purple-200 text-purple-800'
                  : 'bg-chat-avatar text-white'
              }`}>
                {msg.role === 'user' ? 'U' : <img 
                  src={logoAsset} 
                  alt="TripMind AI" 
                  
                />}
              </div>

              {/* Message bubble */}
              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[70%]`}>
                <div className={`rounded-2xl px-5 py-3 ${
                  msg.role === 'user'
                    ? 'bg-chat-user text-ink'
                    : 'bg-chat-ai text-ink shadow-sm ring-1 ring-black/5'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {renderMessageContent(msg.content)}
                  </p>
                </div>
                {/* Timestamp */}
                <p className="text-xs text-ink-tertiary mt-1.5 px-2">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                {/* Suggestion chips — shown below the first assistant message only */}
                {idx === 0 && msg.role === 'assistant' && !chipsDismissed && getSuggestedPrompts().length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {getSuggestedPrompts().map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleSendText(prompt)}
                        disabled={isLoading}
                        className="text-xs px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 hover:border-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-chat-avatar flex items-center justify-center flex-shrink-0">
                <span className="text-sm"><img 
                  src={logoAsset} 
                  alt="TripMind AI" 
                  className="w-15 h-15 object-contain" // Slightly smaller than the container for "breathing room"
                /></span>
              </div>
              <div className="bg-chat-ai rounded-2xl px-5 py-3 shadow-sm ring-1 ring-black/5">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-ink-tertiary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-ink-tertiary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-ink-tertiary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}

          {/* Trip card preview (general chat only) */}
          {lastTripData && chatType === 'general' && (
            <div className="flex justify-center mb-6">
              <TripCard trip={lastTripData} />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Input bar (fixed bottom) ───────────────────────── */}
      <div className="border-t border-purple-200 bg-white/80 backdrop-blur-md p-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          {/* Left icon button */}
          <button className="w-12 h-12 rounded-full bg-ink flex items-center justify-center flex-shrink-0 text-white hover:bg-ink/80 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>

          {/* Input */}
          <div className="flex-1 bg-chat-input rounded-full px-5 py-3 flex items-center gap-3 ring-1 ring-purple-200">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                chatType === 'trip' && tripContext
                  ? `Ask about your ${tripContext.destination} trip...`
                  : 'Type your prompt here'
              }
              className="flex-1 resize-none bg-transparent text-sm text-ink placeholder-ink-tertiary focus:outline-none"
              rows={1}
              disabled={isLoading}
            />
            
            {/* Microphone icon — commented out (not functioning) */}
            {/* <button className="text-ink-tertiary hover:text-ink transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button> */}
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="w-12 h-12 rounded-full bg-chat-send flex items-center justify-center flex-shrink-0 text-ink hover:bg-purple-400 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}