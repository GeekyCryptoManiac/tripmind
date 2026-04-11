/**
 * UserContext — JWT Auth
 *
 * Replaces the UUID guest-identity flow with real email/password auth.
 *
 * Token storage:
 *   localStorage['tripmind_access_token']   — short-lived (30 min)
 *   localStorage['tripmind_refresh_token']  — long-lived (7 days)
 *   localStorage['tripmind_user']           — cached user object
 *
 * On mount:
 *   1. Read tokens from localStorage
 *   2. If access token found, attach it to axios and fetch /api/auth/me
 *      to confirm it's still valid and get fresh user data
 *   3. If /api/auth/me fails (expired), the axios interceptor in api.ts
 *      will automatically attempt a refresh before we even see the error
 *   4. If everything fails, clear tokens and set isAuthenticated = false
 *
 * The login() and register() functions are called from AuthPage.
 * The logout() function clears all state and redirects to /auth.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { apiService, setAuthToken, clearAuthToken } from '../services/api';
import type { User } from '../types';

// ── Types ─────────────────────────────────────────────────────

interface UserContextType {
  user: User | null;
  userId: number | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────

const UserContext = createContext<UserContextType | undefined>(undefined);

// ── Storage helpers ───────────────────────────────────────────

const KEYS = {
  access:  'tripmind_access_token',
  refresh: 'tripmind_refresh_token',
  user:    'tripmind_user',
} as const;

function saveSession(accessToken: string, refreshToken: string, user: User): void {
  localStorage.setItem(KEYS.access, accessToken);
  localStorage.setItem(KEYS.refresh, refreshToken);
  localStorage.setItem(KEYS.user, JSON.stringify(user));
}

function clearSession(): void {
  localStorage.removeItem(KEYS.access);
  localStorage.removeItem(KEYS.refresh);
  localStorage.removeItem(KEYS.user);
  // Also clean up legacy guest keys from the old flow
  localStorage.removeItem('tripmind_user_id');
  localStorage.removeItem('tripmind_guest_id');
}

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(KEYS.user);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

// ── Provider ──────────────────────────────────────────────────

export function UserProvider({ children }: { children: ReactNode }) {
  // Seed UI immediately from localStorage so there's no flash
  const [user, setUser] = useState<User | null>(readCachedUser);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = user !== null;

  /**
   * Called by login() / register() in AuthPage after a successful API call.
   * Sets tokens in localStorage, attaches the Bearer header, and updates state.
   */
  const login = useCallback(
    (accessToken: string, refreshToken: string, userData: User) => {
      saveSession(accessToken, refreshToken, userData);
      setAuthToken(accessToken);
      setUser(userData);
    },
    []
  );

  /**
   * Clears all auth state and redirects to the login page.
   */
  const logout = useCallback(() => {
    clearSession();
    clearAuthToken();
    setUser(null);
    window.location.href = '/auth';
  }, []);

  /**
   * Re-fetch the current user from /api/auth/me.
   * Useful after profile updates. The axios interceptor handles
   * token refresh transparently if the access token has expired.
   */
  const refreshUser = useCallback(async () => {
    try {
      const fresh = await apiService.getMe();
      setUser(fresh);
      localStorage.setItem(KEYS.user, JSON.stringify(fresh));
    } catch {
      // If getMe fails even after the interceptor tried to refresh, log out
      logout();
    }
  }, [logout]);

  // ── Bootstrap on mount ──────────────────────────────────────
  useEffect(() => {
    const bootstrap = async () => {
      const accessToken = localStorage.getItem(KEYS.access);

      if (!accessToken) {
        // No token at all — not logged in
        setIsLoading(false);
        return;
      }

      // Attach token to axios so the first API call is authenticated
      setAuthToken(accessToken);

      try {
        // Verify the token is still valid and get fresh user data
        const fresh = await apiService.getMe();
        setUser(fresh);
        localStorage.setItem(KEYS.user, JSON.stringify(fresh));
      } catch {
        // getMe failed — the interceptor already tried a refresh.
        // If we're here, both tokens are dead. Clear and force login.
        clearSession();
        clearAuthToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        userId: user?.id ?? null,
        isLoading,
        isAuthenticated,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextType {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside UserProvider');
  return ctx;
}