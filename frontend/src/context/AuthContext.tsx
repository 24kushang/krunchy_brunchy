import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: 'SuperAdmin' | 'Admin';
  isActive: boolean;
}

interface AuthContextType {
  user: UserInfo | null;
  token: string | null;
  login: (token: string, user: UserInfo) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Verify token validity with backend
          const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${storedToken}` } });

          // Update user state with fresh data from server
          if (response.data) {
            const freshUser = {
              id: response.data.id,
              email: response.data.email,
              name: response.data.name,
              role: response.data.role,
              isActive: response.data.isActive };
            setUser(freshUser);
            localStorage.setItem('auth_user', JSON.stringify(freshUser));
          }
        } catch (error) {
          console.error('Failed to validate session token', error);
          // Token is invalid/expired
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (newToken: string, newUser: UserInfo) => {
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
