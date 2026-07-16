"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SECURITY_QUESTIONS } from '@/constants';
import styles from './AuthModal.module.css';

type AuthView = 'login' | 'register' | 'find';
type FindStep = 'input-id' | 'verify-answer' | 'reset-password' | 'done';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, register } = useAuth();
  const [view, setView] = useState<AuthView>('login');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 로그인 폼
  const [loginId, setLoginId] = useState('');
  const [loginPwd, setLoginPwd] = useState('');

  // 회원가입 폼
  const [regId, setRegId] = useState('');
  const [regPwd, setRegPwd] = useState('');
  const [regPwdConfirm, setRegPwdConfirm] = useState('');
  const [regQ, setRegQ] = useState(SECURITY_QUESTIONS[0]);
  const [regA, setRegA] = useState('');

  // 비밀번호 찾기 폼
  const [findId, setFindId] = useState('');
  const [findQ, setFindQ] = useState('');
  const [findA, setFindA] = useState('');
  const [findNewPwd, setFindNewPwd] = useState('');
  const [findNewPwdConfirm, setFindNewPwdConfirm] = useState('');
  const [findStep, setFindStep] = useState<FindStep>('input-id');

  if (!isOpen) return null;

  const resetAll = () => {
    setError('');
    setView('login');
    setFindStep('input-id');
    setLoginId(''); setLoginPwd('');
    setRegId(''); setRegPwd(''); setRegPwdConfirm(''); setRegA('');
    setFindId(''); setFindQ(''); setFindA(''); setFindNewPwd(''); setFindNewPwdConfirm('');
  };

  const handleClose = () => { resetAll(); onClose(); };

  // ── 로그인 ──────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const result = await login(loginId.trim(), loginPwd);
    setIsSubmitting(false);
    if (result.error) { setError(result.error); return; }
    handleClose();
  };

  // ── 회원가입 ─────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (regPwd !== regPwdConfirm) { setError('비밀번호가 일치하지 않습니다.'); return; }
    if (!regA.trim()) { setError('보안 답변을 입력해주세요.'); return; }
    setIsSubmitting(true);
    const result = await register(regId.trim(), regPwd, regQ, regA.trim());
    setIsSubmitting(false);
    if (result.error) { setError(result.error); return; }
    handleClose();
  };

  // ── 비밀번호 찾기 ────────────────────────────────────────────
  const handleFindId = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const res = await fetch(`/api/auth/find-account?id=${encodeURIComponent(findId.trim())}`);
    const data = await res.json();
    setIsSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setFindQ(data.security_q);
    setFindStep('verify-answer');
  };

  const handleVerifyAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const res = await fetch('/api/auth/find-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: findId.trim(), security_a: findA.trim() }),
    });
    const data = await res.json();
    setIsSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setFindStep('reset-password');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (findNewPwd.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return; }
    if (findNewPwd !== findNewPwdConfirm) { setError('비밀번호가 일치하지 않습니다.'); return; }
    setIsSubmitting(true);
    const res = await fetch('/api/auth/find-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: findId.trim(), security_a: findA.trim(), new_password: findNewPwd }),
    });
    const data = await res.json();
    setIsSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setFindStep('done');
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className={styles.header}>
          <div className={styles.tabs}>
            <button
              id="auth-tab-login"
              className={`${styles.tab} ${view === 'login' ? styles.tabActive : ''}`}
              onClick={() => { setView('login'); setError(''); }}
            >로그인</button>
            <button
              id="auth-tab-register"
              className={`${styles.tab} ${view === 'register' ? styles.tabActive : ''}`}
              onClick={() => { setView('register'); setError(''); }}
            >회원가입</button>
          </div>
          <button id="auth-modal-close" className={styles.closeBtn} onClick={handleClose} aria-label="닫기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          {error && <div className={styles.errorBanner}>{error}</div>}

          {/* ── 로그인 폼 ── */}
          {view === 'login' && (
            <form className={styles.form} onSubmit={handleLogin}>
              <label className={styles.label}>아이디</label>
              <input id="login-id" className={styles.input} type="text" value={loginId}
                onChange={e => setLoginId(e.target.value)} placeholder="아이디를 입력하세요" required autoFocus />
              <label className={styles.label}>비밀번호</label>
              <input id="login-pwd" className={styles.input} type="password" value={loginPwd}
                onChange={e => setLoginPwd(e.target.value)} placeholder="비밀번호를 입력하세요" required />
              <button id="login-submit" className={styles.submitBtn} type="submit" disabled={isSubmitting}>
                {isSubmitting ? '로그인 중...' : '로그인'}
              </button>
              <button type="button" className={styles.linkBtn}
                onClick={() => { setView('find'); setError(''); setFindStep('input-id'); }}>
                비밀번호를 잊으셨나요?
              </button>
            </form>
          )}

          {/* ── 회원가입 폼 ── */}
          {view === 'register' && (
            <form className={styles.form} onSubmit={handleRegister}>
              <label className={styles.label}>아이디 <span className={styles.hint}>(4~20자)</span></label>
              <input id="reg-id" className={styles.input} type="text" value={regId}
                onChange={e => setRegId(e.target.value)} placeholder="사용할 아이디" required autoFocus minLength={3} maxLength={20} />
              <label className={styles.label}>비밀번호 <span className={styles.hint}>(6자 이상)</span></label>
              <input id="reg-pwd" className={styles.input} type="password" value={regPwd}
                onChange={e => setRegPwd(e.target.value)} placeholder="비밀번호" required minLength={6} />
              <label className={styles.label}>비밀번호 확인</label>
              <input id="reg-pwd-confirm" className={styles.input} type="password" value={regPwdConfirm}
                onChange={e => setRegPwdConfirm(e.target.value)} placeholder="비밀번호 재입력" required />
              <label className={styles.label}>비밀번호 찾기 질문</label>
              <select id="reg-security-q" className={styles.select} value={regQ} onChange={e => setRegQ(e.target.value)}>
                {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
              <label className={styles.label}>답변</label>
              <input id="reg-security-a" className={styles.input} type="text" value={regA}
                onChange={e => setRegA(e.target.value)} placeholder="보안 질문 답변" required />
              <button id="register-submit" className={styles.submitBtn} type="submit" disabled={isSubmitting}>
                {isSubmitting ? '가입 중...' : '회원가입'}
              </button>
            </form>
          )}

          {/* ── 비밀번호 찾기 ── */}
          {view === 'find' && (
            <div className={styles.findContainer}>
              <button className={styles.backBtn} onClick={() => { setView('login'); setError(''); setFindStep('input-id'); }}>
                ← 로그인으로
              </button>
              <h3 className={styles.findTitle}>비밀번호 찾기</h3>

              {findStep === 'input-id' && (
                <form className={styles.form} onSubmit={handleFindId}>
                  <label className={styles.label}>아이디</label>
                  <input id="find-id" className={styles.input} type="text" value={findId}
                    onChange={e => setFindId(e.target.value)} placeholder="가입한 아이디" required autoFocus />
                  <button id="find-id-submit" className={styles.submitBtn} type="submit" disabled={isSubmitting}>
                    {isSubmitting ? '확인 중...' : '다음'}
                  </button>
                </form>
              )}

              {findStep === 'verify-answer' && (
                <form className={styles.form} onSubmit={handleVerifyAnswer}>
                  <div className={styles.questionBox}>{findQ}</div>
                  <label className={styles.label}>답변</label>
                  <input id="find-answer" className={styles.input} type="text" value={findA}
                    onChange={e => setFindA(e.target.value)} placeholder="보안 질문 답변" required autoFocus />
                  <button id="find-answer-submit" className={styles.submitBtn} type="submit" disabled={isSubmitting}>
                    {isSubmitting ? '확인 중...' : '확인'}
                  </button>
                </form>
              )}

              {findStep === 'reset-password' && (
                <form className={styles.form} onSubmit={handleResetPassword}>
                  <label className={styles.label}>새 비밀번호 <span className={styles.hint}>(6자 이상)</span></label>
                  <input id="find-new-pwd" className={styles.input} type="password" value={findNewPwd}
                    onChange={e => setFindNewPwd(e.target.value)} placeholder="새 비밀번호" required minLength={6} autoFocus />
                  <label className={styles.label}>새 비밀번호 확인</label>
                  <input id="find-new-pwd-confirm" className={styles.input} type="password" value={findNewPwdConfirm}
                    onChange={e => setFindNewPwdConfirm(e.target.value)} placeholder="새 비밀번호 재입력" required />
                  <button id="find-reset-submit" className={styles.submitBtn} type="submit" disabled={isSubmitting}>
                    {isSubmitting ? '변경 중...' : '비밀번호 변경'}
                  </button>
                </form>
              )}

              {findStep === 'done' && (
                <div className={styles.doneBox}>
                  <div className={styles.doneIcon}>✓</div>
                  <p>비밀번호가 변경되었습니다.</p>
                  <button id="find-done-login" className={styles.submitBtn}
                    onClick={() => { setView('login'); setError(''); setFindStep('input-id'); }}>
                    로그인하기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
