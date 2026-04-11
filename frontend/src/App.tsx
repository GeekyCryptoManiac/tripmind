/**
 * App.tsx
 *
 * Auth routing changes:
 *   - /auth           → AuthPage (public, redirects to /trips if already logged in)
 *   - /               → protected
 *   - /trips          → protected
 *   - /trips/:tripId  → protected
 *   - /chat           → protected
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { UserProvider, useUser } from './context/UserContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import TripsPage from './pages/TripsPage';
import ChatPage from './pages/ChatPage';
import TripDetailsPage from './pages/TripDetailsPage';

// ── Auth guard for the /auth page itself ──────────────────────
// If the user is already authenticated and visits /auth,
// send them to /trips instead of showing the login form.
function AuthRoute() {
  const { isAuthenticated, isLoading } = useUser();

  if (isLoading) {
    // Let AuthPage handle the loading state — avoids a flash
    return <AuthPage />;
  }

  if (isAuthenticated) {
    return <Navigate to="/trips" replace />;
  }

  return <AuthPage />;
}

// ── Animated page wrapper ─────────────────────────────────────
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <Routes location={location}>
          {/* Public route — login/register */}
          <Route path="/auth" element={<AuthRoute />} />

          {/* Protected routes — require auth */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips"
            element={
              <ProtectedRoute>
                <TripsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/:tripId"
            element={
              <ProtectedRoute>
                <TripDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all → home (protected, will redirect to /auth if needed) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Navbar wrapper — hide on /auth ────────────────────────────
function AppShell() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/auth';

  return (
    <div className="min-h-screen bg-surface-bg">
      {!isAuthPage && <Navbar />}
      <AnimatedRoutes />
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <AppShell />
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;