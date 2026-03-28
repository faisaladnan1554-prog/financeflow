import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { authApi, tokenStore } from '../lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: verify stored token
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) { setLoading(false); return; }

    authApi.me()
      .then(u => setUser(u))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { token, user: u } = await authApi.login(email, password);
      tokenStore.set(token);
      setUser(u);
      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      return { ok: false, error: msg };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { token, user: u } = await authApi.register(name, email, password);
      tokenStore.set(token);
      setUser(u);
      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      return { ok: false, error: msg };
    }
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    authApi.updateProfile(updates).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
