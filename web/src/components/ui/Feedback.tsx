"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import styles from './Feedback.module.css';

// 브라우저 기본 alert/confirm 대신 쓰는 토스트·확인 대화상자. layout에서 한 번 감싸고 useToast/useConfirm으로 호출한다.

type ToastAction = { label: string; onClick: () => void };
type ConfirmOptions = { title: string; message?: string; confirmLabel?: string; danger?: boolean };

interface FeedbackValue {
  showToast: (message: string, action?: ToastAction) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackValue | null>(null);

const TOAST_MS = 4000;

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string; action?: ToastAction } | null>(null);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const showToast = useCallback((message: string, action?: ToastAction) => {
    setToast({ id: Date.now(), message, action });
  }, []);

  const confirm = useCallback((options: ConfirmOptions) =>
    new Promise<boolean>((resolve) => setDialog({ ...options, resolve })), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const closeDialog = useCallback((ok: boolean) => {
    setDialog((current) => { current?.resolve(ok); return null; });
  }, []);

  useEffect(() => {
    if (!dialog) return;
    confirmBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDialog(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, closeDialog]);

  return (
    <FeedbackContext.Provider value={{ showToast, confirm }}>
      {children}
      {toast && (
        <div key={toast.id} className={styles.toast} role="status" aria-live="polite">
          <span>{toast.message}</span>
          {toast.action && (
            <button
              className={styles['toast-action']}
              onClick={() => { toast.action!.onClick(); setToast(null); }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
      {dialog && (
        <div className="modal-backdrop" onClick={() => closeDialog(false)}>
          <div
            className="modal-content"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles['confirm-body']}>
              <h3 id="confirm-title" className={styles['confirm-title']}>{dialog.title}</h3>
              {dialog.message && <p style={{ margin: 0 }}>{dialog.message}</p>}
            </div>
            <div className={styles['confirm-actions']}>
              <button className={styles['confirm-btn']} onClick={() => closeDialog(false)}>취소</button>
              <button
                ref={confirmBtnRef}
                className={`${styles['confirm-btn']} ${dialog.danger ? styles['confirm-btn-danger'] : styles['confirm-btn-primary']}`}
                onClick={() => closeDialog(true)}
              >
                {dialog.confirmLabel ?? '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used within FeedbackProvider');
  return ctx;
}
