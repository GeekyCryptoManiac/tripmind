/**
 * ChatInterface Component
 * Main chat UI where users interact with the AI agent
 */

import { useState, useRef, useEffect } from 'react';
import { apiService } from '../services/api';
import type { ChatMessage, ChatResponse } from '../types';
import TripCard from './TripCard';

interface ChatInterfaceProps {
  userId: number;
}

export default function ChatInterface({ userId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m your AI travel assistant. Tell me where you\'d like to go!',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<ChatResponse | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    console.log('[Frontend] Sending message:', input);
    
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      console.log('[Frontend] Calling API...');
      const response = await apiService.sendMessage({
        user_id: userId,
        message: input,
      });

      console.log('[Frontend] Received response:', response);
      console.log('[Frontend] Response text:', response.message);  // Changed from response.response to response.message
      console.log('[Frontend] Trip data:', response.trip_data);

      const agentMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,  // Changed from response.response to response.message
        timestamp: new Date().toISOString(),
      };

      console.log('[Frontend] Adding agent message:', agentMessage);

      setMessages((prev) => {
        const newMessages = [...prev, agentMessage];
        console.log('[Frontend] New messages array:', newMessages);
        return newMessages;
      });
      
      setLastResponse(response);

    } catch (error) {
      console.error('[Frontend] Error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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

  console.log('[Frontend] Rendering with messages:', messages);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">
          ✈️ TripMind
        </h1>
        <p className="text-sm text-gray-600">AI Travel Planning Assistant</p>
      </div>

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
              <p className="whitespace-pre-wrap">{msg.content}</p>
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

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        {lastResponse?.trip_data && (
          <div className="flex justify-center">
            <TripCard trip={lastResponse.trip_data} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (Shift+Enter for new line)"
            className="flex-1 resize-none border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <p className="text-xs text-gray-500 text-center mt-2">
          Try: "Plan a 5-day trip to Tokyo in March with a $2000 budget"
        </p>
      </div>
    </div>
  );
}
