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
  login: (userId: number, userData: User) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount, or create new user
  useEffect(() => {
    const initializeUser = async () => {
      const storedUserId = localStorage.getItem('tripmind_user_id');
      const storedUser = localStorage.getItem('tripmind_user');

      if (storedUserId && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setIsLoading(false);
          return;
        } catch (e) {
          console.error('Error parsing stored user:', e);
          localStorage.removeItem('tripmind_user_id');
          localStorage.removeItem('tripmind_user');
        }
      }

      // No user found, create a new demo user
      try {
        const newUser = await apiService.createUser({
          email: 'demo@tripmind.com',
          full_name: 'Demo User'  // ✅ ADD THIS LINE
        });
        
        const userData: User = {
          id: newUser.id,
          email: newUser.email,
          full_name: newUser.full_name
        };
        
        setUser(userData);
        localStorage.setItem('tripmind_user_id', newUser.id.toString());
        localStorage.setItem('tripmind_user', JSON.stringify(userData));
      } catch (error) {
        console.error('Failed to create user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

  const login = (userId: number, userData: User) => {
    setUser(userData);
    localStorage.setItem('tripmind_user_id', userId.toString());
    localStorage.setItem('tripmind_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('tripmind_user_id');
    localStorage.removeItem('tripmind_user');
  };

  return (
    <UserContext.Provider
      value={{
        user,
        userId: user?.id || null,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

// Custom hook to use the context
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}