"use client";

import React, { useState } from 'react';
import { BookmarkFolder, BookmarkItem } from '@/types';
import styles from './BookmarkModal.module.css';

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
    existingItem ? existingItem.folderId : (folders.length > 0 ? folders[0].id : 'default')
  );
  const [memo, setMemo] = useState<string>(existingItem?.memo || '');
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [showAddFolderInput, setShowAddFolderInput] = useState<boolean>(false);

  // 💡 새 폴더 추가 시 색상 선택을 위한 6가지 프리셋 지정
  const PRESET_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  const [selectedNewFolderColor, setSelectedNewFolderColor] = useState<string>(PRESET_COLORS[0]);

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
    onSave(selectedFolderId, memo);
  };

  return (
    <div className={styles['modal-backdrop']} onClick={onClose}>
      <div className={styles['modal-content']} onClick={(e) => e.stopPropagation()}>
        <div className={styles['modal-header']}>
          <h3 className={styles['modal-title']}>저장 및 메모 남기기</h3>
          <button className={styles['close-btn']} onClick={onClose}>✕</button>
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
                <div className={styles['color-picker-list']}>
                  {PRESET_COLORS.map((color) => (
                    <span
                      key={color}
                      className={`${styles['color-picker-item']} ${selectedNewFolderColor === color ? styles.active : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedNewFolderColor(color)}
                      title="폴더 색상 선택"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className={styles['folders-list']}>
              {folders.map((folder) => (
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
              ))}
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
