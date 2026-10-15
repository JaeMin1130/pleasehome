"use client";

import React, { useState } from 'react';
import { BookmarkFolder, BookmarkItem } from '@/types';
import styles from './BookmarkModal.module.css';
import { BOOKMARK_PRESET_COLORS } from '@/constants';

interface BookmarkModalProps {
  isOpen: boolean;
  complexId: number;
  complexName: string;
  folders: BookmarkFolder[];
  bookmarkItems: BookmarkItem[];
  onClose: () => void;
  onSave: (folderId: string, memo: string) => void;
  onRemove: () => void;
  onAddFolder: (name: string, color?: string) => string;
}

export default function BookmarkModal({
  isOpen,
  complexId,
  complexName,
  folders,
  bookmarkItems,
  onClose,
  onSave,
  onRemove,
  onAddFolder
}: BookmarkModalProps) {
  const existingItem = bookmarkItems.find(item => item.complexId === complexId);

  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    existingItem ? existingItem.folderId : (folders.length > 0 ? folders[0].id : '')
  );
  const [memo, setMemo] = useState<string>(existingItem?.memo || '');
  // 폴더가 하나도 없으면 이름이 채워진 입력창을 바로 열어, '완료' 한 번으로 폴더 생성과 저장이 끝나게 한다
  const [newFolderName, setNewFolderName] = useState<string>(folders.length === 0 ? '내 저장 단지' : '');
  const [showAddFolderInput, setShowAddFolderInput] = useState<boolean>(folders.length === 0);
  const [error, setError] = useState<string>('');

  // 💡 새 폴더 추가 시 색상 선택을 위한 6가지 프리셋 지정
  const [selectedNewFolderColor, setSelectedNewFolderColor] = useState<string>(BOOKMARK_PRESET_COLORS[0]);

  if (!isOpen) return null;

  const handleAddFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    // 선택한 프리셋 컬러를 전달하여 폴더 생성
    const addedId = onAddFolder(newFolderName.trim(), selectedNewFolderColor);
    setSelectedFolderId(addedId);
    setNewFolderName('');
    setShowAddFolderInput(false);
  };

  const handleSaveSubmit = () => {
    if (selectedFolderId) {
      onSave(selectedFolderId, memo);
      return;
    }
    if (newFolderName.trim()) {
      onSave(onAddFolder(newFolderName.trim(), selectedNewFolderColor), memo);
      return;
    }
    setError('저장할 폴더 이름을 입력해 주세요.');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className={styles['modal-header']}>
          <h3 className={styles['modal-title']}>저장 및 메모 남기기</h3>
          <button className={styles['close-btn']} onClick={onClose} aria-label="닫기">✕</button>
        </div>
        
        <div className={styles['modal-body']}>
          <div className={styles['complex-info']}>
            <span className={styles['complex-label']}>선택 단지</span>
            <span className={styles['complex-name']}>{complexName}</span>
          </div>

          <div className={styles['section']}>
            <div className={styles['section-header']}>
              <span className={styles['section-title']}>저장 폴더 선택</span>
              <button 
                className={styles['add-folder-toggle']}
                onClick={() => setShowAddFolderInput(!showAddFolderInput)}
              >
                {showAddFolderInput ? '취소' : '+ 새 폴더'}
              </button>
            </div>

            {showAddFolderInput && (
              <div className={styles['add-folder-form-container']}>
                <form onSubmit={handleAddFolderSubmit} className={styles['add-folder-form']}>
                  <input
                    type="text"
                    placeholder="폴더 이름 입력..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    maxLength={15}
                    className={styles['folder-input']}
                    autoFocus
                  />
                  <button type="submit" className={styles['folder-submit-btn']}>
                    추가
                  </button>
                </form>
                {/* 💡 폴더 신규 생성용 테마 컬러 피커 */}
                <div className="color-picker-list">
                  {BOOKMARK_PRESET_COLORS.map((color) => (
                    <span
                      key={color}
                      className={`color-picker-item ${selectedNewFolderColor === color ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedNewFolderColor(color)}
                      title="폴더 색상 선택"
                    />
                  ))}
                </div>
              </div>
            )}

            {error && <p role="alert" style={{ color: 'var(--color-dday)', fontSize: 'var(--font-size-sm)', margin: 'var(--spacing-xs) 0' }}>{error}</p>}
            <div className={styles['folders-list']}>
              {folders.length === 0 ? (
                <div style={{
                  padding: 'var(--spacing-md) 0',
                  color: 'var(--text-muted)',
                  fontSize: 'var(--font-size-sm)',
                  textAlign: 'center',
                  lineHeight: '1.5'
                }}>
                  첫 저장 폴더의 이름을 정하고 <strong>완료</strong>를 누르면 폴더를 만들고 바로 저장합니다.
                </div>
              ) : (
                folders.map((folder) => (
                  <label 
                    key={folder.id} 
                    className={`${styles['folder-item']} ${selectedFolderId === folder.id ? styles.active : ''}`}
                  >
                    <input
                      type="radio"
                      name="bookmark-folder"
                      value={folder.id}
                      checked={selectedFolderId === folder.id}
                      onChange={() => setSelectedFolderId(folder.id)}
                      className={styles['radio-input']}
                    />
                    <span 
                      className={styles['folder-color-dot']} 
                      style={{ backgroundColor: folder.color }}
                    />
                    <span className={styles['folder-name']}>{folder.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className={styles['section']}>
            <span className={styles['section-title']}>메모 남기기</span>
            <textarea
              placeholder="단지에 대한 메모를 남겨보세요. (예: 주차 여유, 보증금 조건 등)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              maxLength={200}
              className={styles['memo-textarea']}
            />
            <span className={styles['char-count']}>{memo.length}/200</span>
          </div>
        </div>

        <div className={styles['modal-footer']}>
          {existingItem && (
            <button 
              className={styles['remove-btn']} 
              onClick={() => {
                onRemove();
                onClose();
              }}
            >
              저장 해제
            </button>
          )}
          <div className={styles['right-buttons']}>
            <button className={styles['cancel-btn']} onClick={onClose}>취소</button>
            <button className={styles['save-btn']} onClick={handleSaveSubmit}>완료</button>
          </div>
        </div>
      </div>
    </div>
  );
}
