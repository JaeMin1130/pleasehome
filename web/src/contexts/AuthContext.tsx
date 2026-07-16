"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Member } from '@/types';

interface AuthContextValue {
  member: Member | null;
  isLoading: boolean;
  login: (id: string, password: string) => Promise<{ error?: string }>;
  register: (id: string, password: string, security_q: string, security_a: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setMember(data.member ?? null);
    } catch {
      setMember(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (id: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    await refresh();
    return {};
  };

  const register = async (id: string, password: string, security_q: string, security_a: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, password, security_q, security_a }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    await refresh();
    return {};
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setMember(null);
  };

  return (
    <AuthContext.Provider value={{ member, isLoading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
