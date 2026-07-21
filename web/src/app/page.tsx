import Link from 'next/link';
import { db } from '@/lib/db';
import HomeClientLayout from '@/components/HomeClientLayout';
import { Announcement, Complex } from '@/types';

export const revalidate = 3600; // 1시간 주기 점진적 정적 재생성(ISR)

export default async function HomePage() {
  let announcements: Announcement[] = [];
  let complexes: Complex[] = [];

  try {
    const annRows = db.prepare('SELECT * FROM announcements ORDER BY id DESC').all() as any[];
    announcements = annRows.map((ann) => {
      const schedules = db.prepare('SELECT * FROM announcement_schedules WHERE announcement_id = ?').all(ann.id);
      const details = db.prepare('SELECT * FROM announcement_details WHERE announcement_id = ? ORDER BY sort_order ASC, id ASC').all(ann.id);
      const limits = db.prepare('SELECT * FROM announcement_limits WHERE announcement_id = ?').all(ann.id);
      return {
        ...ann,
        schedules,
        details,
        limits,
      };
    });

    complexes = db.prepare('SELECT * FROM complexes').all() as Complex[];
  } catch (error) {
    console.error('Failed to fetch initial SSR data in page.tsx:', error);
  }

  return (
    <>
      {/* 
        ========================================================================
        Googlebot / Google AdSense 크롤러를 위한 SSR 정적 SEO & 인덱싱 섹션
        - 초기 HTML 수신 시 텍스트 및 정적 <a href="..."> 링크를 포함하여 "가치가 별로 없는 콘텐츠" 판정 방지
        ========================================================================
      */}
      <section style={{ display: 'none' }} aria-hidden="false">
        <h1>전국 LH·SH·GH 공공임대주택 청약 지도 대시보드</h1>
        <p>
          플리즈홈(PleaseHome)은 LH 한국토지주택공사, SH 서울주택도시공사, GH 경기주택도시공사 등
          전국 공공기관에서 발행하는 행복주택, 국민임대, 영구임대, 매입임대, 청년안심주택의 최신 입주자 모집 공고를
          지도 기반으로 한눈에 분석하고 비교 검색할 수 있는 정보 제공 서비스입니다.
        </p>

        <h2>최신 공공임대주택 모집 공고 목록</h2>
        <ul>
          {announcements.slice(0, 30).map((ann) => (
            <li key={ann.id}>
              <Link href={`/announcements/details/${ann.id}`}>
                <strong>{ann.title}</strong> ({ann.institution} | {ann.subscription_type})
              </Link>
              <p>지역: {ann.region || '전국'}</p>
            </li>
          ))}
        </ul>

        <h2>주요 공공임대주택 단지 정보</h2>
        <ul>
          {complexes.slice(0, 30).map((comp) => (
            <li key={comp.id}>
              <Link href={`/complexes/${comp.id}`}>
                {comp.name} - {comp.address}
              </Link>
            </li>
          ))}
        </ul>

        <h2>이용 안내 및 자주 묻는 질문</h2>
        <div>
          <h3>공공임대주택 청약 신청 자격은 어떻게 되나요?</h3>
          <p>
            공공임대주택(행복주택, 국민임대 등)은 대학생, 청년, 신혼부부, 한부모가족, 고령자, 주거급여수급자 등
            세대 구성원 전원의 무주택 여부와 소득 및 자산 기준을 충족해야 신청할 수 있습니다.
          </p>
          <h3>모집 공고 상세 정보 확인 방법</h3>
          <p>
            지도의 마커를 클릭하거나 사이드바의 공고 목록에서 원하시는 단지를 선택하시면
            임대 보증금, 월 임대료, 전용 면적별 평형 및 공식 첨부 문서 공고문을 직접 확인하실 수 있습니다.
          </p>
        </div>
      </section>

      {/* 실시간 반응형 지도 대시보드 (클라이언트 컴포넌트) */}
      <HomeClientLayout initialAnnouncements={announcements} initialComplexes={complexes} />
    </>
  );
}
