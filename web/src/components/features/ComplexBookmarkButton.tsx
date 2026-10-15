"use client";

import React, { useState } from 'react';
import { BookmarkFolder } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import BookmarkModal from '@/components/ui/BookmarkModal';
import AuthModal from '@/components/ui/AuthModal';
import { BOOKMARK_PRESET_COLORS } from '@/constants';
import { useFeedback } from '@/components/ui/Feedback';

interface ComplexBookmarkButtonProps {
  complexId: number;
  complexName: string;
  className?: string;
}

// 단지 상세 페이지(서버 컴포넌트)용 저장 버튼. 지도 화면과 같은 BookmarkModal을 쓰고, 저장 후 AuthContext를 새로고침해 상태를 맞춘다.
export default function ComplexBookmarkButton({ complexId, complexName, className }: ComplexBookmarkButtonProps) {
  const { member, bookmarkFolders, bookmarkItems, refresh } = useAuth();
  const { showToast } = useFeedback();
  const [authOpen, setAuthOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [addedFolders, setAddedFolders] = useState<BookmarkFolder[]>([]);
  const [pendingFolder, setPendingFolder] = useState<Promise<Response> | null>(null);

  const isBookmarked = bookmarkItems.some((item) => item.complexId === complexId);
  const folders = [...bookmarkFolders, ...addedFolders.filter((f) => !bookmarkFolders.some((b) => b.id === f.id))];

  const request = async (method: 'POST' | 'DELETE', path: string, body: object) => {
    const res = await fetch(`/api/member/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (!res?.ok) showToast('저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    await refresh();
  };

  const handleClick = () => {
    if (!member) { setAuthOpen(true); return; }
    if (isBookmarked) { request('DELETE', 'bookmark-items', { complex_id: complexId }); return; }
    setModalOpen(true);
  };

  const handleAddFolder = (name: string, customColor?: string): string => {
    const id = `folder_${Date.now()}`;
    const color = customColor || BOOKMARK_PRESET_COLORS[folders.length % BOOKMARK_PRESET_COLORS.length];
    setAddedFolders((prev) => [...prev, { id, name, color, createdAt: new Date().toISOString() }]);
    setPendingFolder(fetch('/api/member/bookmark-folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, color }),
    }));
    return id;
  };

  const handleSave = async (folderId: string, memo: string) => {
    setModalOpen(false);
    // 방금 만든 폴더가 서버에 먼저 생성된 뒤 단지를 넣는다.
    await pendingFolder?.catch(() => null);
    await request('POST', 'bookmark-items', { complex_id: complexId, folder_id: folderId, memo });
  };

  return (
    <>
      <button type="button" className={className} onClick={handleClick} aria-pressed={isBookmarked}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill={isBookmarked ? 'var(--color-warning-text)' : 'none'} stroke={isBookmarked ? 'var(--color-warning-text)' : 'currentColor'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
        {isBookmarked ? '저장됨' : '단지 저장'}
      </button>
      <BookmarkModal
        key={modalOpen ? 'open' : 'closed'}
        isOpen={modalOpen}
        complexId={complexId}
        complexName={complexName}
        folders={folders}
        bookmarkItems={bookmarkItems}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onRemove={() => { setModalOpen(false); request('DELETE', 'bookmark-items', { complex_id: complexId }); }}
        onAddFolder={handleAddFolder}
      />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
