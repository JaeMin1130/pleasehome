"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SECURITY_QUESTIONS } from '@/constants';
import RegionPicker from './RegionPicker';
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
  const [regRegions, setRegRegions] = useState('');

  // 비밀번호 찾기 폼
  const [findId, setFindId] = useState('');
  const [findQ, setFindQ] = useState('');
  const [findA, setFindA] = useState('');
  const [findNewPwd, setFindNewPwd] = useState('');
  const [findNewPwdConfirm, setFindNewPwdConfirm] = useState('');
  const [findStep, setFindStep] = useState<FindStep>('input-id');

  const resetAll = useCallback(() => {
    setError('');
    setFieldErrors({});
    setView('login');
    setFindStep('input-id');
    setLoginId(''); setLoginPwd('');
    setRegId(''); setRegPwd(''); setRegPwdConfirm(''); setRegA(''); setRegRegions('');
    setFindId(''); setFindQ(''); setFindA(''); setFindNewPwd(''); setFindNewPwdConfirm('');
  }, []);

  const handleClose = useCallback(() => { resetAll(); onClose(); }, [resetAll, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  // ── 로그인 ──────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const newFieldErrors: Record<string, string> = {};
    if (!loginId.trim()) newFieldErrors.loginId = '아이디를 입력해주세요.';
    if (!loginPwd) newFieldErrors.loginPwd = '비밀번호를 입력해주세요.';
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setError('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    const result = await login(loginId.trim(), loginPwd);
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    handleClose();
  };

  // ── 회원가입 ─────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const newFieldErrors: Record<string, string> = {};
    const idLen = regId.trim().length;
    if (idLen < 3 || idLen > 20) newFieldErrors.regId = '아이디는 3~20자로 입력해주세요.';
    if (regPwd.length < 3) newFieldErrors.regPwd = '비밀번호는 3자 이상이어야 합니다.';
    else if (regPwd !== regPwdConfirm) newFieldErrors.regPwdConfirm = '비밀번호가 일치하지 않습니다.';
    if (!regA.trim()) newFieldErrors.regA = '보안 답변을 입력해주세요.';

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      const firstError = Object.values(newFieldErrors)[0];
      setError(firstError);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    const result = await register(regId.trim(), regPwd, regQ, regA.trim(), regRegions);
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
      if (result.error.includes('아이디')) newFieldErrors.regId = result.error;
      setFieldErrors(newFieldErrors);
      return;
    }
    handleClose();
  };

  // ── 비밀번호 찾기 ────────────────────────────────────────────
  const handleFindId = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!findId.trim()) { setError('아이디를 입력해주세요.'); return; }
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
    if (!findA.trim()) { setError('보안 답변을 입력해주세요.'); return; }
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
    if (findNewPwd.length < 3) { setError('비밀번호는 3자 이상이어야 합니다.'); return; }
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
            <form className={styles.form} noValidate onSubmit={handleLogin}>
              <label className={styles.label}>아이디</label>
              <input id="login-id" className={`${styles.input} ${fieldErrors.loginId ? styles.inputError : ''}`} type="text" value={loginId}
                onChange={e => { setLoginId(e.target.value); if (fieldErrors.loginId) setFieldErrors(prev => ({ ...prev, loginId: '' })); }} placeholder="아이디를 입력하세요" required autoFocus />
              {fieldErrors.loginId && <span className={styles.fieldErrorText}>{fieldErrors.loginId}</span>}

              <label className={styles.label}>비밀번호</label>
              <input id="login-pwd" className={`${styles.input} ${fieldErrors.loginPwd ? styles.inputError : ''}`} type="password" value={loginPwd}
                onChange={e => { setLoginPwd(e.target.value); if (fieldErrors.loginPwd) setFieldErrors(prev => ({ ...prev, loginPwd: '' })); }} placeholder="비밀번호를 입력하세요" required />
              {fieldErrors.loginPwd && <span className={styles.fieldErrorText}>{fieldErrors.loginPwd}</span>}

              <button id="login-submit" className={styles.submitBtn} type="submit" disabled={isSubmitting}>
                {isSubmitting ? '로그인 중...' : '로그인'}
              </button>
              <button type="button" className={styles.linkBtn}
                onClick={() => { setView('find'); setError(''); setFieldErrors({}); setFindStep('input-id'); }}>
                비밀번호를 잊으셨나요?
              </button>
            </form>
          )}

          {/* ── 회원가입 폼 ── */}
          {view === 'register' && (
            <form className={styles.form} noValidate onSubmit={handleRegister}>
              <label className={styles.label}>아이디 <span className={styles.hint}>(3~20자)</span></label>
              <input id="reg-id" className={`${styles.input} ${fieldErrors.regId ? styles.inputError : ''}`} type="text" value={regId}
                onChange={e => { setRegId(e.target.value); if (fieldErrors.regId) setFieldErrors(prev => ({ ...prev, regId: '' })); }} placeholder="사용할 아이디" required autoFocus minLength={3} maxLength={20} />
              {fieldErrors.regId && <span className={styles.fieldErrorText}>{fieldErrors.regId}</span>}

              <label className={styles.label}>비밀번호 <span className={styles.hint}>(3자 이상)</span></label>
              <input id="reg-pwd" className={`${styles.input} ${fieldErrors.regPwd ? styles.inputError : ''}`} type="password" value={regPwd}
                onChange={e => { setRegPwd(e.target.value); if (fieldErrors.regPwd) setFieldErrors(prev => ({ ...prev, regPwd: '' })); }} placeholder="비밀번호" required minLength={3} />
              {fieldErrors.regPwd && <span className={styles.fieldErrorText}>{fieldErrors.regPwd}</span>}

              <label className={styles.label}>비밀번호 확인</label>
              <input id="reg-pwd-confirm" className={`${styles.input} ${fieldErrors.regPwdConfirm ? styles.inputError : ''}`} type="password" value={regPwdConfirm}
                onChange={e => { setRegPwdConfirm(e.target.value); if (fieldErrors.regPwdConfirm) setFieldErrors(prev => ({ ...prev, regPwdConfirm: '' })); }} placeholder="비밀번호 재입력" required />
              {fieldErrors.regPwdConfirm && <span className={styles.fieldErrorText}>{fieldErrors.regPwdConfirm}</span>}

              <label className={styles.label} htmlFor="reg-security-q">비밀번호 찾기 질문</label>
              <select id="reg-security-q" className={styles.select} value={regQ} onChange={e => setRegQ(e.target.value)}>
                {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
              </select>

              <label className={styles.label}>답변</label>
              <input id="reg-security-a" className={`${styles.input} ${fieldErrors.regA ? styles.inputError : ''}`} type="text" value={regA}
                onChange={e => { setRegA(e.target.value); if (fieldErrors.regA) setFieldErrors(prev => ({ ...prev, regA: '' })); }} placeholder="보안 질문 답변" required />
              {fieldErrors.regA && <span className={styles.fieldErrorText}>{fieldErrors.regA}</span>}

              <label className={styles.label}>관심 공고 지역 <span className={styles.hint}>(선택, 여러 개 가능)</span></label>
              <RegionPicker value={regRegions} onChange={setRegRegions} />
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
                <form className={styles.form} noValidate onSubmit={handleFindId}>
                  <label className={styles.label}>아이디</label>
                  <input id="find-id" className={styles.input} type="text" value={findId}
                    onChange={e => setFindId(e.target.value)} placeholder="가입한 아이디" required autoFocus />
                  <button id="find-id-submit" className={styles.submitBtn} type="submit" disabled={isSubmitting}>
                    {isSubmitting ? '확인 중...' : '다음'}
                  </button>
                </form>
              )}

              {findStep === 'verify-answer' && (
                <form className={styles.form} noValidate onSubmit={handleVerifyAnswer}>
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
                <form className={styles.form} noValidate onSubmit={handleResetPassword}>
                  <label className={styles.label}>새 비밀번호 <span className={styles.hint}>(3자 이상)</span></label>
                  <input id="find-new-pwd" className={styles.input} type="password" value={findNewPwd}
                    onChange={e => setFindNewPwd(e.target.value)} placeholder="새 비밀번호" required minLength={3} autoFocus />
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
