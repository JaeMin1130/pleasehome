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
  withdraw: (password: string) => Promise<{ error?: string }>;
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

  const submitAuth = async (path: string, body: object): Promise<{ error?: string }> => {
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error ?? '요청에 실패했습니다.' };
    } catch {
      // 게이트웨이 오류 페이지(HTML)·네트워크 끊김에서 예외가 새면 모달이 '로그인 중...'에 멈춘다
      return { error: '서버와 통신하지 못했습니다. 잠시 후 다시 시도해 주세요.' };
    }
    await refresh();
    return {};
  };

  const login = (id: string, password: string) =>
    submitAuth('/api/auth/login', { id, password });

  const register = (id: string, password: string, security_q: string, security_a: string) =>
    submitAuth('/api/auth/register', { id, password, security_q, security_a });

  const clearMemberState = () => {
    setMember(null);
    setFavoriteAnns(EMPTY_FAVORITES);
    setHiddenAnns(EMPTY_HIDDEN);
    setBookmarkFolders(EMPTY_FOLDERS);
    setBookmarkItems(EMPTY_ITEMS);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    clearMemberState();
  };

  // 서버가 회원·이용 데이터를 삭제하고 로그인 쿠키도 지우므로, 성공 시 화면 상태만 비운다
  const withdraw = async (password: string) => {
    const res = await fetch('/api/auth/account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: data.error ?? '탈퇴 처리에 실패했습니다.' };
    }
    clearMemberState();
    return {};
  };

  return (
    <AuthContext.Provider value={{ member, isLoading, favoriteAnns, hiddenAnns, bookmarkFolders, bookmarkItems, login, register, logout, withdraw, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
