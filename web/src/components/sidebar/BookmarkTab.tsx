"use client";

import React from 'react';
import { Announcement, BookmarkFolder, BookmarkItem, Complex } from '@/types';
import ComplexCard from '@/components/features/ComplexCard';
import styles from '../Sidebar.module.css';
import { BOOKMARK_PRESET_COLORS } from '@/constants';

interface BookmarkTabProps {
  sheetHeight: number | null;
  minHeight: number;
  touchHandlers: any;
  member: any;
  showNewFolderInput: boolean;
  setShowNewFolderInput: (show: boolean) => void;
  setAuthModalOpen: (open: boolean) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  selectedSidebarColor: string;
  setSelectedSidebarColor: (color: string) => void;
  onAddFolder: (name: string, color?: string) => string;
  bookmarkListRef: React.RefObject<HTMLDivElement | null>;
  bookmarkFolders: BookmarkFolder[];
  activeFolderIds: string[];
  setActiveFolderIds: (ids: string[]) => void;
  bookmarkItems: BookmarkItem[];
  allComplexes: Complex[];
  announcements: Announcement[];
  dragOverFolderId: string | null;
  setDragOverFolderId: (id: string | null) => void;
  draggingComplexId: number | null;
  setDraggingComplexId: (id: number | null) => void;
  onMoveBookmarkItem?: (complexId: number, targetFolderId: string) => void;
  editingFolderId: string | null;
  setEditingFolderId: (id: string | null) => void;
  editingFolderName: string;
  setEditingFolderName: (name: string) => void;
  handleSaveRename: (folderId: string) => void;
  activeComparisonFolderId: string | null;
  onToggleComparison: (folderId: string) => void;
  onRemoveFolder: (folderId: string) => void;
  onSelectAnnouncement: (id: number | null) => void;
  onSelectComplex: (complex: Complex) => void;
  onToggleBookmark: (complexId: number) => void;
  getAnnouncementStatus: (ann: Announcement) => any;
  onHoverComplex?: (id: number | null) => void;
}

export default function BookmarkTab({
  sheetHeight,
  minHeight,
  touchHandlers,
  member,
  showNewFolderInput,
  setShowNewFolderInput,
  setAuthModalOpen,
  newFolderName,
  setNewFolderName,
  selectedSidebarColor,
  setSelectedSidebarColor,
  onAddFolder,
  bookmarkListRef,
  bookmarkFolders,
  activeFolderIds,
  setActiveFolderIds,
  bookmarkItems,
  allComplexes,
  announcements,
  dragOverFolderId,
  setDragOverFolderId,
  draggingComplexId,
  setDraggingComplexId,
  onMoveBookmarkItem,
  editingFolderId,
  setEditingFolderId,
  editingFolderName,
  setEditingFolderName,
  handleSaveRename,
  activeComparisonFolderId,
  onToggleComparison,
  onRemoveFolder,
  onSelectAnnouncement,
  onSelectComplex,
  onToggleBookmark,
  getAnnouncementStatus,
  onHoverComplex,
}: BookmarkTabProps) {
  return (
    <div 
      className={styles['bookmark-panel-container']}
      style={{ 
        height: sheetHeight ? `${sheetHeight}px` : undefined,
        '--sheet-min-height': `${minHeight}px`
      } as React.CSSProperties}
      {...touchHandlers}
    >
      {/* 모바일 화면 전용 상단 드래그 핸들바 */}
      <div className={styles['drag-handle-bar']} />
      <div className={styles['bookmark-header']}>
        <h3 className={styles['bookmark-title']}>저장 목록</h3>
        {member && (
          <button 
            className="btn-outline-primary-mini"
            onClick={() => setShowNewFolderInput(!showNewFolderInput)}
          >
            {showNewFolderInput ? '취소' : '+ 폴더 추가'}
          </button>
        )}
      </div>

      {/* 게스트: 로그인 유도 뷰 */}
      {!member && (
        <div className={styles['guest-login-prompt']}>
          <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <p className={styles['guest-login-text']}>저장 기능은 로그인 후<br />이용하실 수 있습니다.</p>
          <button
            className={styles['guest-login-btn']}
            onClick={() => setAuthModalOpen(true)}
          >
            로그인하기
          </button>
        </div>
      )}

      {showNewFolderInput && (
        <div className={styles['sidebar-folder-add-container']}>
          <div className={styles['sidebar-folder-form-wrap']}>
            <input
              type="text"
              placeholder="새 폴더 이름..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              maxLength={15}
              className={styles['sidebar-folder-input']}
            />
            <button 
              className={styles['sidebar-folder-submit']}
              onClick={() => {
                if (newFolderName.trim()) {
                  onAddFolder(newFolderName.trim(), selectedSidebarColor);
                  setNewFolderName('');
                  setShowNewFolderInput(false);
                }
              }}
            >
              추가
            </button>
          </div>
          <div className={`color-picker-list ${styles['sidebar-color-picker']}`}>
            {BOOKMARK_PRESET_COLORS.map((color) => (
              <span
                key={color}
                className={`color-picker-item ${selectedSidebarColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedSidebarColor(color)}
                title="폴더 색상 선택"
              />
            ))}
          </div>
        </div>
      )}

      {member && (
        <div 
          ref={bookmarkListRef} 
          className={styles['folders-list-container']}
        >
        {bookmarkFolders.map((folder) => {
          const isExpanded = activeFolderIds.includes(folder.id);
          const folderItems = bookmarkItems.filter(item => item.folderId === folder.id);
          const folderCount = folderItems.length;
          const folderComplexes = allComplexes.filter(c => folderItems.map(i => i.complexId).includes(c.id));

          return (
            <div 
              key={folder.id} 
              id={`folder-card-${folder.id}`}
              className={`${styles['accordion-item']} ${isExpanded ? styles.active : ''} ${dragOverFolderId === folder.id ? styles['drag-over'] : ''}`}
              style={{
                ...(isExpanded ? { borderColor: folder.color } : {}),
                ...(dragOverFolderId === folder.id ? { borderColor: folder.color } : {})
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggingComplexId) {
                  const item = bookmarkItems.find(i => i.complexId === draggingComplexId);
                  if (item && item.folderId === folder.id) {
                    return;
                  }
                }
                if (dragOverFolderId !== folder.id) {
                  setDragOverFolderId(folder.id);
                }
              }}
              onDragLeave={() => {
                setDragOverFolderId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverFolderId(null);
                setDraggingComplexId(null);
                const complexIdStr = e.dataTransfer.getData("text/plain");
                const complexId = parseInt(complexIdStr, 10);
                if (!isNaN(complexId) && onMoveBookmarkItem) {
                  onMoveBookmarkItem(complexId, folder.id);
                }
              }}
            >
              {/* 💡 아코디언 헤더: 폴더 행 */}
              <div 
                className={`${styles['folder-card']} ${isExpanded ? styles.expanded : ''}`}
                onClick={() => {
                  if (isExpanded) {
                    setActiveFolderIds(activeFolderIds.filter(id => id !== folder.id));
                  } else {
                    setActiveFolderIds([...activeFolderIds, folder.id]);
                  }
                }}
              >
                <div className={styles['folder-info-left']}>
                  <span 
                    className={styles['folder-color-badge']} 
                    style={{ backgroundColor: folder.color }}
                  >
                    <svg viewBox="0 0 24 24" fill="var(--color-white)">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  </span>
                  {editingFolderId === folder.id ? (
                    <div className={styles['folder-rename-form']} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveRename(folder.id);
                          } else if (e.key === 'Escape') {
                            setEditingFolderId(null);
                          }
                        }}
                        className={styles['folder-rename-input']}
                        autoFocus
                        maxLength={15}
                      />
                      <button 
                        className={styles['folder-rename-save']}
                        onClick={() => handleSaveRename(folder.id)}
                        title="저장"
                      >
                        ✓
                      </button>
                      <button 
                        className={styles['folder-rename-cancel']}
                        onClick={() => setEditingFolderId(null)}
                        title="취소"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className={styles['folder-name-container']}>
                      <span className={styles['folder-card-name']}>{folder.name}</span>
                      {folder.id !== 'default' && (
                        <button
                          className={styles['folder-edit-btn']}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFolderId(folder.id);
                            setEditingFolderName(folder.name);
                          }}
                          title="폴더 이름 수정"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                  <span className={styles['folder-count-badge']}>{folderCount}</span>
                </div>
                <div className={styles['folder-info-right']} onClick={(e) => e.stopPropagation()}>
                  {/* 💡 폴더가 열려있고 저장 단지가 있을 때만 노출되는 콤팩트 비교 토글 버튼 */}
                  {isExpanded && folderCount > 0 && (
                    <button 
                      className={`btn-outline-primary-mini ${activeComparisonFolderId === folder.id ? 'active' : ''}`}
                      onClick={() => onToggleComparison(folder.id)}
                      title="상세 패널에서 단지 스펙 비교표를 엽니다"
                    >
                      {activeComparisonFolderId === folder.id ? '비교 표 닫기' : '단지 비교'}
                    </button>
                  )}

                  {folder.id !== 'default' && (
                    <button 
                      className={styles['folder-delete-btn']}
                      onClick={() => {
                        if (confirm(`'${folder.name}' 폴더를 삭제하시겠습니까? 안의 저장 단지들도 함께 해제됩니다.`)) {
                          onRemoveFolder(folder.id);
                          if (isExpanded) {
                            setActiveFolderIds(activeFolderIds.filter(id => id !== folder.id));
                          }
                        }
                      }}
                      title="폴더 삭제"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* 💡 아코디언 바디: 단지 목록 */}
              {isExpanded && (
                <div className={styles['accordion-body']}>
                  {folderCount === 0 ? (
                    <div className={styles['empty-bookmark-msg']}>
                      이 폴더에 저장된 단지가 없습니다.<br />지도에서 단지를 선택한 뒤 별표를 눌러 저장해 보세요.
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {folderComplexes.map((complex) => {
                          const item = bookmarkItems.find(i => i.complexId === complex.id);
                          const ann = announcements.find(a => a.id === complex.announcement_id);
                          return (
                            <div 
                              key={complex.id} 
                              className={`${styles['bookmark-card-wrapper']} ${draggingComplexId === complex.id ? styles.dragging : ''}`}
                              draggable={true}
                              onDragStart={(e) => {
                                e.dataTransfer.setData("text/plain", complex.id.toString());
                                setDraggingComplexId(complex.id);
                              }}
                              onDragEnd={() => {
                                setDraggingComplexId(null);
                              }}
                            >
                              <ComplexCard
                                complex={complex}
                                isActive={false}
                                onClick={() => {
                                  onSelectAnnouncement(complex.announcement_id);
                                  setTimeout(() => {
                                    onSelectComplex(complex);
                                  }, 100);
                                }}
                                isBookmarked={true}
                                onBookmarkToggle={() => onToggleBookmark(complex.id)}
                                announcementTitle={ann?.title}
                                announcementStatus={ann ? getAnnouncementStatus(ann) : undefined}
                                announcementInstitution={ann?.institution}
                                announcement={ann}
                                onMouseEnter={() => onHoverComplex?.(complex.id)}
                                onMouseLeave={() => onHoverComplex?.(null)}
                              />
                              {item?.memo && (
                                <div className={styles['bookmark-card-memo']}>
                                  <svg className={styles['memo-icon']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 20h9"></path>
                                    <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                  </svg>
                                  <span className={styles['memo-text']}>{item.memo}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}
