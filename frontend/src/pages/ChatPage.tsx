import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import ChatInterface from '../components/ChatInterface';
import type { Trip } from '../types';
import { apiService } from '../services/api';

export default function ChatPage() {
  const { userId, isLoading } = useUser();
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    if (!userId) return;
    apiService.getUserTrips(userId).then(setTrips).catch(() => {});
  }, [userId]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-parchment">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forest mx-auto mb-4"></div>
          <p className="text-sage">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if no user
  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen bg-parchment">
        <div className="bg-parchment border border-card-border p-8 rounded-2xl max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4 text-forest">Welcome to TripMind</h2>
          <p className="text-red-600 mb-6">Failed to load user. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  return <ChatInterface userId={userId} trips={trips} />;
}
