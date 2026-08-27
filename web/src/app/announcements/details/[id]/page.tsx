import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { fetchAnnouncementDetails, fetchSitemapPaths } from '@/lib/api';
import { formatMoney, formatDateWithTime, superClean } from '@/utils/formatters';
import MarkdownViewer from '@/components/ui/MarkdownViewer';
import styles from './detail.module.css';
import OfficialAnnouncementLink from '@/components/features/OfficialAnnouncementLink';

export const revalidate = 3600; // 1시간 주기로 점진적 정적 재생성(ISR) 활성화

export async function generateStaticParams() {
  const { announcements } = await fetchSitemapPaths();
  return announcements.map((id: number) => ({
    id: String(id),
  }));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const annId = parseInt(id, 10);
  if (isNaN(annId)) return { title: '공고 상세 정보 | PleaseHome' };

  try {
    const data = await fetchAnnouncementDetails(annId);
    if (!data) return { title: '공고를 찾을 수 없습니다 | PleaseHome' };
    return {
      title: `${data.title} - ${data.institution} | PleaseHome`,
      description: `${data.institution}에서 공급하는 ${data.subscription_type} 청약 공고의 상세 입주 기준 및 신청 정보 가이드입니다.`,
    };
  } catch {
    return { title: '공고 상세 정보 | PleaseHome' };
  }
}

export default async function AnnouncementDetailPage({ params }: PageProps) {
  const { id } = await params;
  const annId = parseInt(id, 10);

  if (isNaN(annId)) {
    notFound();
  }

  const data = await fetchAnnouncementDetails(annId);
  if (!data) {
    notFound();
  }

  const ann = data;
  const schedules: any[] = data.schedules || [];
  const details: any[] = data.details || [];
  const complexes: any[] = data.complexes || [];
  const units: any[] = data.units || [];

  // 검색엔진용 JSON-LD (구조화 데이터) 생성
  const firstSchedule = schedules[0];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: ann.title,
    description: `${ann.institution}에서 공급하는 ${ann.subscription_type} 공고입니다.`,
    startDate: firstSchedule?.start_date || ann.created_at,
    endDate: firstSchedule?.end_date || undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: {
      '@type': 'VirtualLocation',
      url: `https://pleasehome.com/announcements/details/${ann.id}`,
    },
    organizer: {
      '@type': 'Organization',
      name: ann.institution,
    },
  };

  return (
    <div className={styles.layout}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7402127086926987"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleSection}>
            <span className={styles.badge}>{ann.subscription_type}</span>
            <h1 className={styles.title}>{ann.title}</h1>
            
            <div className={styles.metaInfo}>
              <span className={styles.metaItem}>
                <strong>기관:</strong> {ann.institution}
              </span>
              {ann.region && (
                <span className={styles.metaItem}>
                  <strong>관할 지역:</strong> {ann.region}
                </span>
              )}
            </div>

            <div className={styles.docBtnContainer}>
              <Link href={`/?announcement_id=${ann.id}`} className={styles.docBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
                  <line x1="9" y1="3" x2="9" y2="18"></line>
                  <line x1="15" y1="6" x2="15" y2="21"></line>
                </svg>
                지도로 돌아가기
              </Link>
              <OfficialAnnouncementLink institution={ann.institution} dtlUrl={ann.dtl_url} dtlUrlMob={ann.dtl_url_mob} className={styles.docBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                신청 페이지 열기
              </OfficialAnnouncementLink>
            </div>
          </div>
        </header>

        {/* 1. 신청 및 발표 일정 */}
        {schedules.length > 0 && (
          <section className={styles.detailSection}>
            <details className={styles.details} open>
              <summary className={styles.summary}>
                <span className={styles.summaryTitle}>
                  📅 신청 및 발표 일정
                </span>
                <span className={styles.toggleIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </span>
              </summary>
              <div className={styles.detailContent} style={{ borderTop: 'none' }}>
                <div className={styles.tableWrapper} style={{ marginBottom: 0 }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>일정 구분</th>
                        <th>기간 및 일시</th>
                        <th>비고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedules.map((sch) => (
                        <tr key={sch.id}>
                          <td><strong>{sch.schedule_type}</strong></td>
                          <td>
                            {sch.start_date || sch.end_date ? (
                              `${formatDateWithTime(sch.start_date)} ~ ${formatDateWithTime(sch.end_date)}`
                            ) : (
                              sch.raw_text || '-'
                            )}
                          </td>
                          <td>{sch.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          </section>
        )}

        {/* 2. 소속 주택 단지 목록 요약 */}
        {complexes.length > 0 && (
          <section className={styles.detailSection}>
            <details className={styles.details} open>
              <summary className={styles.summary}>
                <span className={styles.summaryTitle}>
                  🏢 소속 주택 단지 목록
                </span>
                <span className={styles.toggleIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </span>
              </summary>
              <div className={styles.detailContent} style={{ borderTop: 'none' }}>
                <div className={styles.tableWrapper} style={{ marginBottom: 0 }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>주택 단지명</th>
                        <th>소재지 주소</th>
                        <th>공급 면적 범위</th>
                        <th>임대조건 범위</th>
                        <th>공급 / 예비</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complexes.map((complex) => {
                        const complexUnits = units.filter((u) => u.complex_id === complex.id);
                        
                        // 공급/예비 세대수 합산
                        const totalSupply = complexUnits.reduce((sum, u) => sum + (u.supply_count || 0), 0);
                        const totalReserve = complexUnits.reduce((sum, u) => sum + (u.reserve_count || 0), 0);
                        const hasCount = totalSupply > 0 || totalReserve > 0;
                        
                        const countText = [
                          totalSupply > 0 ? `${totalSupply}호` : '0호',
                          totalReserve > 0 ? ` / ${totalReserve}호` : '0호'
                        ].filter(Boolean).join(' ');

                        // 면적 최소~최대 범위
                        const areas = complexUnits.map((u) => u.exclusive_area).filter(Boolean);
                        const minArea = areas.length > 0 ? Math.min(...areas) : 0;
                        const maxArea = areas.length > 0 ? Math.max(...areas) : 0;
                        const areaText = minArea === maxArea 
                          ? `${minArea} ㎡` 
                          : `${minArea} ㎡ ~ ${maxArea} ㎡`;

                        // 보증금 최소~최대 범위
                        const deposits = complexUnits.map((u) => u.deposit).filter(Boolean);
                        const minDeposit = deposits.length > 0 ? Math.min(...deposits) : 0;
                        const maxDeposit = deposits.length > 0 ? Math.max(...deposits) : 0;
                        const depositText = minDeposit === maxDeposit
                          ? formatMoney(minDeposit)
                          : `${formatMoney(minDeposit)} ~ ${formatMoney(maxDeposit)}`;

                        return (
                          <tr key={complex.id} className={styles.tableRow}>
                            <td>
                              <Link href={`/complexes/${complex.id}`} className={styles.complexLink}>
                                {complex.name}
                              </Link>
                            </td>
                            <td>{complex.address ? complex.address.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim() : '-'}</td>
                            <td>{areas.length > 0 ? areaText : '-'}</td>
                            <td>{deposits.length > 0 ? depositText : '-'}</td>
                            <td>{hasCount ? countText : '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          </section>
        )}

        {/* 4. 상세 세부 공고 정보 (개별 섹션으로 승격) */}
        {details.map((det) => {
          const lines = det.section_content ? det.section_content.split('\n') : [];
          const firstLine = lines[0] || '';
          const cleanTitle = superClean(det.section_title || '');
          const cleanFirstLine = superClean(firstLine);

          const finalContent = (cleanTitle === cleanFirstLine && cleanTitle !== '')
            ? lines.slice(1).join('\n')
            : det.section_content;

          // 타이틀명에 따른 매칭 이모지 선택
          const title = det.section_title || '';
          let emoji = '📝';
          if (title.includes('자격') || title.includes('요건')) emoji = '✅';
          else if (title.includes('소득') || title.includes('자산')) emoji = '💰';
          else if (title.includes('선정') || title.includes('배점')) emoji = '📊';
          else if (title.includes('임대') || title.includes('융자') || title.includes('혜택')) emoji = '🏠';
          else if (title.includes('방법') || title.includes('서류') || title.includes('제출')) emoji = '📄';
          else if (title.includes('특화') || title.includes('유의') || title.includes('주의')) emoji = '⚠️';

          return (
            <section key={det.id} className={styles.detailSection}>
              <details className={styles.details} open>
                <summary className={styles.summary}>
                  <span className={styles.summaryTitle}>
                    {emoji} {title}
                  </span>
                  <span className={styles.toggleIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </summary>
                <div className={styles.detailContent}>
                  <MarkdownViewer content={finalContent} />
                </div>
              </details>
            </section>
          );
        })}
      </div>
    </div>
  );
}
