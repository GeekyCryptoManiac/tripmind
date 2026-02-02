import { useUser } from '../context/UserContext';
import ChatInterface from '../components/ChatInterface';

export default function ChatPage() {
  const { userId, isLoading } = useUser();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if no user
  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Welcome to TripMind</h2>
          <p className="text-red-600 mb-6">Failed to load user. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  // Render chat interface with userId from context
  return <ChatInterface userId={userId} />;
}