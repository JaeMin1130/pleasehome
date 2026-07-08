"use client";

import Link from 'next/link';
import Script from 'next/script';
import styles from '../policy.module.css';

export default function PrivacyPolicy() {
  return (
    <div className={styles['policy-container']}>
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7402127086926987"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      <Link href="/" className={styles['back-link']}>
        ← 메인 지도로 돌아가기
      </Link>
      
      <h1 className={styles['policy-title']}>
        개인정보처리방침
      </h1>

      <p className={styles['policy-intro']}>
        본 개인정보처리방침은 사용자가 본 서비스를 이용할 때 개인정보가 어떻게 관리되고 보호되는지 설명합니다. 본 서비스는 구글 애드센스 등 타사 광고 및 분석 도구를 활용할 수 있습니다.
      </p>

      <section className={styles['policy-section']}>
        <h2 className={styles['section-title']}>1. 수집하는 개인정보 항목</h2>
        <p className={styles['section-content']}>
          본 서비스는 기본적으로 회원가입 없이 이용이 가능하며, 사용자의 개인 식별 정보를 직접 수집하거나 저장하지 않습니다. 단, 서비스 최적화 및 광고 게재를 위해 쿠키(Cookie)나 접속 로그 정보가 자동 생성되어 수집될 수 있습니다.
        </p>
      </section>

      <section className={styles['policy-section']}>
        <h2 className={styles['section-title']}>2. 쿠키 및 타사 광고(구글 애드센스) 사용에 관한 안내</h2>
        <p className={styles['section-content']}>
          본 사이트는 사용자의 방문 기록을 분석하고 최적화된 맞춤형 광고를 제공하기 위해 쿠키를 사용합니다. 
          구글(Google)을 포함한 제3자 제공업체는 쿠키를 사용하여 사용자의 이전 방문 정보를 기반으로 광고를 게재합니다.
          사용자는 브라우저 설정에서 쿠키 제공을 거부할 수 있습니다.
        </p>
      </section>

      <section className={styles['policy-section']}>
        <h2 className={styles['section-title']}>3. 개인정보의 보호 및 문의</h2>
        <p className={styles['section-content']}>
          본 서비스는 사용자의 개인정보 안전성 확보를 위해 최선을 다하고 있습니다. 방침 변경 시 본 페이지를 통해 공지합니다. 문의 사항이 있으실 경우 개발자 연락처로 연락해 주시기 바랍니다.
        </p>
      </section>

      <footer className={styles['policy-footer']}>
        시행일자: 2026년 6월 16일
      </footer>
    </div>
  );
}
