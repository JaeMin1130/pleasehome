"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Member, BookmarkFolder, BookmarkItem } from '@/types';

interface FavoriteAnn { id: number; favoritedAt: string }
interface HiddenAnn { id: number; disabledAt: string }

interface AuthContextValue {
  member: Member | null;
  isLoading: boolean;
  // 💡 /api/auth/me 응답에 번들링된 로그인 회원의 개인화 데이터 (찜/숨김/북마크 초기 스냅샷)
  favoriteAnns: FavoriteAnn[];
  hiddenAnns: HiddenAnn[];
  bookmarkFolders: BookmarkFolder[];
  bookmarkItems: BookmarkItem[];
  login: (id: string, password: string) => Promise<{ error?: string }>;
  register: (id: string, password: string, security_q: string, security_a: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const EMPTY_FAVORITES: FavoriteAnn[] = [];
const EMPTY_HIDDEN: HiddenAnn[] = [];
const EMPTY_FOLDERS: BookmarkFolder[] = [];
const EMPTY_ITEMS: BookmarkItem[] = [];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteAnns, setFavoriteAnns] = useState<FavoriteAnn[]>(EMPTY_FAVORITES);
  const [hiddenAnns, setHiddenAnns] = useState<HiddenAnn[]>(EMPTY_HIDDEN);
  const [bookmarkFolders, setBookmarkFolders] = useState<BookmarkFolder[]>(EMPTY_FOLDERS);
  const [bookmarkItems, setBookmarkItems] = useState<BookmarkItem[]>(EMPTY_ITEMS);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setMember(data.member ?? null);
      setFavoriteAnns(
        Array.isArray(data.favorites)
          ? data.favorites.map((f: any) => ({ id: f.announcement_id, favoritedAt: f.favorited_at }))
          : EMPTY_FAVORITES
      );
      setHiddenAnns(
        Array.isArray(data.hidden_anns)
          ? data.hidden_anns.map((h: any) => ({ id: h.announcement_id, disabledAt: h.hidden_at }))
          : EMPTY_HIDDEN
      );
      setBookmarkFolders(
        Array.isArray(data.bookmark_folders)
          ? data.bookmark_folders.map((f: any) => ({ id: f.id, name: f.name, color: f.color, createdAt: f.created_at }))
          : EMPTY_FOLDERS
      );
      setBookmarkItems(
        Array.isArray(data.bookmark_items)
          ? data.bookmark_items.map((i: any) => ({ complexId: i.complex_id, folderId: i.folder_id, memo: i.memo ?? undefined, createdAt: i.created_at }))
          : EMPTY_ITEMS
      );
    } catch {
      setMember(null);
      setFavoriteAnns(EMPTY_FAVORITES);
      setHiddenAnns(EMPTY_HIDDEN);
      setBookmarkFolders(EMPTY_FOLDERS);
      setBookmarkItems(EMPTY_ITEMS);
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
    setFavoriteAnns(EMPTY_FAVORITES);
    setHiddenAnns(EMPTY_HIDDEN);
    setBookmarkFolders(EMPTY_FOLDERS);
    setBookmarkItems(EMPTY_ITEMS);
  };

  return (
    <AuthContext.Provider value={{ member, isLoading, favoriteAnns, hiddenAnns, bookmarkFolders, bookmarkItems, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
