"use client";

import Link from 'next/link';
import styles from '../policy.module.css';

export default function PrivacyPolicy() {
  return (
    <div className={styles['policy-container']}>
      <Link href="/" className={styles['back-link']}>
        ← 메인 지도로 돌아가기
      </Link>

      <h1 className={styles['policy-title']}>
        개인정보처리방침
      </h1>

      <p className={styles['policy-intro']}>
        플리즈홈(이하 &apos;서비스&apos;)은 이용자의 개인정보를 소중히 다루며, 어떤 정보를 왜 수집하고 어떻게 보관·파기하는지 아래와 같이 안내합니다.
        공고 및 지도 조회는 회원가입 없이 이용할 수 있으며, 회원가입은 찜·숨김·저장 기능을 쓰려는 경우에만 필요합니다.
      </p>

      <section className={styles['policy-section']}>
        <h2 className={styles['section-title']}>1. 수집하는 개인정보 항목</h2>
        <p className={styles['section-content']}>
          ① 회원가입 시: 아이디, 비밀번호, 비밀번호 찾기용 보안 질문과 답변<br />
          ② 회원 기능 이용 시: 찜하거나 숨긴 공고, 저장한 단지와 저장 폴더 정보<br />
          ③ 서비스 이용 과정에서 자동 생성·수집되는 정보: 접속 IP 주소, 브라우저 정보, 접속 일시 등 접속 기록, 쿠키
        </p>
      </section>

      <section className={styles['policy-section']}>
        <h2 className={styles['section-title']}>2. 개인정보의 처리 목적</h2>
        <p className={styles['section-content']}>
          수집한 정보는 회원 식별 및 로그인 상태 유지, 비밀번호 재설정, 찜·숨김·저장 기능 제공, 서비스 오류 대응 및 이용 통계 분석, 광고 게재에만 이용합니다.
        </p>
      </section>

      <section className={styles['policy-section']}>
        <h2 className={styles['section-title']}>3. 개인정보의 보유 기간 및 파기</h2>
        <p className={styles['section-content']}>
          회원 정보와 회원 기능 이용 정보는 회원이 삭제(탈퇴)를 요청할 때까지 보유하며, 요청을 받으면 지체 없이 복구할 수 없는 방법으로 삭제합니다.
          접속 기록은 보안 및 장애 대응에 필요한 기간 동안만 보관한 뒤 삭제합니다.
        </p>
      </section>

      <section className={styles['policy-section']}>
        <h2 className={styles['section-title']}>4. 쿠키 및 브라우저 저장소 사용</h2>
        <p className={styles['section-content']}>
          서비스는 로그인 상태 유지를 위해 로그인 쿠키(유효기간 30일)를 사용하며, 화면 테마(라이트/다크) 설정은 이용자의 브라우저 저장소에만 보관합니다.
          이용자는 브라우저 설정에서 쿠키 저장을 거부할 수 있으나, 이 경우 로그인이 필요한 기능을 이용할 수 없습니다.
        </p>
      </section>

      <section className={styles['policy-section']}>
        <h2 className={styles['section-title']}>5. 외부 서비스 이용 및 맞춤형 광고</h2>
        <p className={styles['section-content']}>
          서비스는 개인정보를 제3자에게 판매하거나 제공하지 않습니다. 다만 아래 외부 서비스를 이용하며, 각 서비스는 자체 정책에 따라 쿠키 등으로 정보를 수집할 수 있습니다.<br />
          · Google Analytics: 방문 통계 분석<br />
          · Google AdSense: 광고 게재. 구글을 포함한 제3자 제공업체는 쿠키를 사용하여 이용자의 이전 방문 정보를 기반으로 광고를 게재합니다.
          이용자는 <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">구글 광고 설정</a>에서 맞춤형 광고를 해제할 수 있습니다.<br />
          · 네이버 지도: 지도 표시
        </p>
      </section>

      <section className={styles['policy-section']}>
        <h2 className={styles['section-title']}>6. 이용자의 권리</h2>
        <p className={styles['section-content']}>
          이용자는 언제든지 자신의 개인정보 열람, 정정, 삭제(회원 탈퇴), 처리 정지를 요청할 수 있습니다.
          비밀번호는 서비스 내 계정 설정에서 직접 변경할 수 있으며, 그 밖의 요청은 아래 문의처로 연락해 주시면 지체 없이 처리합니다.
        </p>
      </section>

      <section className={styles['policy-section']}>
        <h2 className={styles['section-title']}>7. 개인정보의 안전성 확보 조치</h2>
        <p className={styles['section-content']}>
          비밀번호는 복호화할 수 없는 단방향 암호화(해시)로 저장하며, 로그인 쿠키는 위·변조를 막기 위해 서명하고 스크립트에서 읽을 수 없도록(HttpOnly) 설정합니다.
          서비스와 이용자 간 통신은 HTTPS로 암호화됩니다.
        </p>
      </section>

      <section className={styles['policy-section']}>
        <h2 className={styles['section-title']}>8. 개인정보 보호책임자 및 문의처</h2>
        <p className={styles['section-content']}>
          개인정보 관련 문의, 삭제(회원 탈퇴) 요청, 불만 처리는 아래 연락처로 접수해 주시기 바랍니다.<br />
          이메일: <a href="mailto:ija06598@gmail.com">ija06598@gmail.com</a><br />
          본 방침이 변경되는 경우 이 페이지를 통해 공지합니다.
        </p>
      </section>

      <footer className={styles['policy-footer']}>
        시행일자: 2026년 10월 15일
      </footer>
    </div>
  );
}
