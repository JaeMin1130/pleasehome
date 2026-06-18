"use client";

import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div style={{
      maxWidth: '800px',
      margin: '40px auto',
      padding: '24px',
      fontFamily: 'var(--font-family)',
      lineHeight: '1.7',
      backgroundColor: 'var(--bg-body)',
      color: 'var(--text-primary)'
    }}>
      <Link href="/" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        color: 'var(--primary)',
        textDecoration: 'none',
        fontWeight: 'var(--font-weight-semibold)',
        marginBottom: '24px'
      }}>
        ← 메인 지도로 돌아가기
      </Link>
      
      <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: '24px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
        서비스 이용약관
      </h1>

      <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
        본 약관은 사용자가 본 공공청약 지도 서비스를 이용함에 있어 필요한 조건과 규정을 정의합니다.
      </p>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', marginBottom: '12px', color: 'var(--text-primary)' }}>1. 서비스의 목적</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          본 서비스는 LH, SH 등 각 주택공사 시행 기관의 공공임대주택 모집 공고 정보를 지도 및 맞춤 조건 필터와 매칭하여 사용자에게 시각적 편의 정보 제공을 목적으로 운영됩니다.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', marginBottom: '12px', color: 'var(--text-primary)' }}>2. 정보의 면책 조항 (필독)</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          본 서비스가 제공하는 청약 일정, 보증금 및 월세 정보, 신청자격 등 모든 데이터는 공식 공고문 마크다운에서 기계 학습 및 자동 추출된 정형 데이터입니다. 
          따라서 실시간 정보 불일치나 누락이 있을 수 있으며, 어떠한 경우에도 법적 보증 자료로 활용될 수 없습니다. 실제 청약 접수 전에는 반드시 시행 기관의 공식 PDF 공고 자료를 확인하시기 바라며, 오기입 정보로 발생한 불이익에 대해 본 서비스는 일절 책임지지 않습니다.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', marginBottom: '12px', color: 'var(--text-primary)' }}>3. 서비스의 변경 및 중단</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          서비스 활성화 및 서버 운영 상태에 따라 공고 데이터 갱신 주기나 서비스 제공 기능이 예고 없이 수정되거나 일부 중단될 수 있습니다.
        </p>
      </section>

      <footer style={{ marginTop: '40px', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
        시행일자: 2026년 6월 16일
      </footer>
    </div>
  );
}
