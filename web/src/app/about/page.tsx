import Link from 'next/link';
import { Metadata } from 'next';
import styles from '../policy.module.css';

export const metadata: Metadata = {
  title: '서비스 소개 | 공공청약 지도',
  description: 'LH, SH, GH 공공임대주택 공고를 지도로 정리해 보여주는 공공청약 지도(플리즈홈)의 운영 목적, 데이터 출처, 데이터 가공 방식을 소개합니다.',
  alternates: { canonical: 'https://pleasehome.com/about' },
};

export default function AboutPage() {
  return (
    <div className={styles['policy-container']}>
      <Link href="/" className={styles['back-link']}>
        ← 메인 지도로 돌아가기
      </Link>

      <h1 className={styles['policy-title']}>
        공공청약 지도 소개
      </h1>

      <p className={styles['policy-intro']}>
        공공청약 지도(플리즈홈)는 LH, SH, GH 등 공공기관이 공시하는 임대주택 입주자 모집 공고를 한곳에 모아 지도 위에서 확인할 수 있게 만든 서비스입니다.
      </p>

      <section className={styles['policy-section']}>
        <h2 className={styles['section-title']}>왜 만들었나요</h2>
        <p className={styles['section-content']}>
          공공임대주택 공고는 기관마다 공고문 형식이 제각각이고, 신청 자격·보증금·월세 조건이 표와 텍스트에 흩어져 있어 한눈에 비교하기 어렵습니다. 여러 기관의 공고를 직접 찾아다니며 PDF를 열어보는 대신, 지역·전용면적·보증금·월세 조건으로 필터링해서 지도 위에서 바로 비교할 수 있도록 만들었습니다.
        </p>
      </section>

      <section className={styles['policy-section']}>
        <h2 className={styles['section-title']}>데이터는 어디서 가져오나요</h2>
        <p className={styles['section-content']}>
          공공데이터포털이 제공하는 LH 분양임대공고문 API, LH 공공주택 단지정보 API를 통해 공고 목록과 좌표 정보를 수집하고, 각 기관(LH, SH, GH 등)이 공식 게시한 첨부 공고문(PDF·Excel) 원문을 직접 내려받아 세부 조건을 추출합니다. 위경도 좌표가 누락된 신규 단지는 Geocoding API로 보정합니다.
        </p>
      </section>

      <section className={styles['policy-section']}>
        <h2 className={styles['section-title']}>데이터를 어떻게 검증하나요</h2>
        <p className={styles['section-content']}>
          공고문 원본 PDF·Excel에서 세대수, 임대 조건, 신청 일정을 추출한 뒤, 원문의 총 모집 세대수(공급+예비)와 추출된 유닛 데이터의 합계를 전수 대조하는 별도 검증 단계를 거친 데이터만 실제 서비스에 반영합니다. 검증을 통과하지 못한 공고는 노출되지 않습니다.
        </p>
      </section>

      <section className={styles['policy-section']}>
        <h2 className={styles['section-title']}>업데이트는 얼마나 자주 되나요</h2>
        <p className={styles['section-content']}>
          신규 공고와 정정 공고를 주기적으로 수집해 반영하며, 이미 게시된 공고도 일정이 지나거나 내용이 정정되면 같은 URL에서 최신 상태로 갱신됩니다. 다만 실제 접수 마감이나 최종 당첨자 발표 등은 반드시 해당 시행기관의 공식 채널(LH 청약플러스, SH 청약센터, GH 마이홈 등)에서 다시 확인하시기 바랍니다.
        </p>
      </section>

      <section className={styles['policy-section']}>
        <h2 className={styles['section-title']}>더 알아보기</h2>
        <p className={styles['section-content']}>
          데이터 이용 및 면책에 대한 자세한 내용은{' '}
          <Link href="/terms" className={styles['back-link']} style={{ display: 'inline', marginBottom: 0 }}>이용약관</Link>
          , 개인정보 처리에 대한 내용은{' '}
          <Link href="/privacy" className={styles['back-link']} style={{ display: 'inline', marginBottom: 0 }}>개인정보처리방침</Link>
          을 참고해 주세요.
        </p>
      </section>

      <footer className={styles['policy-footer']}>
        공공청약 지도 (플리즈홈)
      </footer>
    </div>
  );
}
