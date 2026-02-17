import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiService } from '../services/api';

interface User {
  id: number;
  email: string;
  full_name: string;
}

interface UserContextType {
  user: User | null;
  userId: number | null;
  isLoading: boolean;
  isGuest: boolean;                              // ← new: lets UI show "Sign up to save your trips"
  login: (userId: number, userData: User) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// ─── Guest identity helpers ───────────────────────────────────────────────────
// Stored in localStorage so the same guest persists across refreshes.
// When real auth is added, these keys stay — a logged-in user just overwrites them.

function getOrCreateGuestIdentity(): { email: string; full_name: string } {
  const stored = localStorage.getItem('tripmind_guest_id');
  if (stored) {
    return JSON.parse(stored);
  }
  const guestId = crypto.randomUUID();
  const identity = {
    email: `guest-${guestId}@tripmind.app`,
    full_name: 'Guest User',
  };
  localStorage.setItem('tripmind_guest_id', JSON.stringify(identity));
  return identity;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const initializeUser = async () => {
      // 1. Check if a real logged-in user is already stored
      const storedUserId = localStorage.getItem('tripmind_user_id');
      const storedUser = localStorage.getItem('tripmind_user');

      if (storedUserId && storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          // Mark as guest if the email looks like a guest email
          setIsGuest(parsed.email.endsWith('@tripmind.app'));
          setIsLoading(false);
          return;
        } catch {
          localStorage.removeItem('tripmind_user_id');
          localStorage.removeItem('tripmind_user');
        }
      }

      // 2. No stored user — create a guest account
      try {
        const identity = getOrCreateGuestIdentity();
        const newUser = await apiService.createUser(identity);

        const userData: User = {
          id: newUser.id,
          email: newUser.email,
          full_name: newUser.full_name,
        };

        setUser(userData);
        setIsGuest(true);
        localStorage.setItem('tripmind_user_id', newUser.id.toString());
        localStorage.setItem('tripmind_user', JSON.stringify(userData));
      } catch (error) {
        console.error('Failed to initialize guest user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

  // Called after real signup/login — clears guest flag
  const login = (userId: number, userData: User) => {
    setUser(userData);
    setIsGuest(false);
    localStorage.setItem('tripmind_user_id', userId.toString());
    localStorage.setItem('tripmind_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setIsGuest(false);
    localStorage.removeItem('tripmind_user_id');
    localStorage.removeItem('tripmind_user');
    // Note: we intentionally keep tripmind_guest_id so the same
    // guest account is reused if they don't sign up
  };

  return (
    <UserContext.Provider value={{ user, userId: user?.id || null, isLoading, isGuest, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used inside UserProvider');
  }
  return context;
}