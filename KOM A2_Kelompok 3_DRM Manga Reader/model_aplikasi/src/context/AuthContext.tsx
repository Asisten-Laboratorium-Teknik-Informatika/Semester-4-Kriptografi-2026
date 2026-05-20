import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { api, getStoredUser, setStoredUser } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    setUser(stored);
    setProfile(stored);
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const loggedIn = await api.login(email, password);
    setStoredUser(loggedIn);
    setUser(loggedIn);
    setProfile(loggedIn);
  };

  const register = async (email: string, password: string, displayName: string) => {
    const registered = await api.register(email, password, displayName);
    setStoredUser(registered);
    setUser(registered);
    setProfile(registered);
  };

  const logout = () => {
    setStoredUser(null);
    setUser(null);
    setProfile(null);
  };

  useEffect(() => {
    const refreshProfile = async () => {
      const stored = getStoredUser();
      if (!stored) return;
      try {
        const remoteProfile = await api.profile();
        setStoredUser(remoteProfile);
        setUser(remoteProfile);
        setProfile(remoteProfile);
      } catch {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setUser(stored);
          setProfile(stored);
          setLoading(false);
          return;
        }
        logout();
      }
      setLoading(false);
    };

    refreshProfile();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
