/**
 * ProtectedRoute
 *
 * Wrap any route that requires authentication.
 * While the auth state is bootstrapping (isLoading), shows a spinner.
 * Once resolved: authenticated users see the page, others go to /auth.
 *
 * Usage in App.tsx:
 *   <Route path="/trips" element={<ProtectedRoute><TripsPage /></ProtectedRoute>} />
 */

import type { FC, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useUser();

  // Still verifying stored tokens — show a minimal spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          <p className="text-sm text-ink-secondary">Loading TripMind...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;