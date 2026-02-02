import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import TripsPage from './pages/TripsPage';
import ChatPage from './pages/ChatPage';
import TripDetailsPage from './pages/TripDetailsPage';

// Separate component for the app content so we can use useUser hook
function AppContent() {
  const { userId, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing TripMind...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to initialize user. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/trips/:tripId" element={<TripDetailsPage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;