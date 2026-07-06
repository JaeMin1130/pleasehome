import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { formatMoney, formatTargetGroup, formatDateWithTime, superClean } from '@/utils/formatters';
import MarkdownViewer from '@/components/ui/MarkdownViewer';
import styles from './detail.module.css';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const annId = parseInt(id, 10);
  if (isNaN(annId)) return { title: '공고 상세 정보 | PleaseHome' };

  try {
    const ann = db.prepare('SELECT title, institution, subscription_type FROM announcements WHERE id = ?').get(annId) as any;
    if (!ann) return { title: '공고를 찾을 수 없습니다 | PleaseHome' };
    return {
      title: `${ann.title} - ${ann.institution} | PleaseHome`,
      description: `${ann.institution}에서 공급하는 ${ann.subscription_type} 청약 공고의 상세 입주 기준 및 신청 정보 가이드입니다.`,
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

  let ann: any = null;
  let schedules: any[] = [];
  let details: any[] = [];
  let limits: any[] = [];
  let complexes: any[] = [];
  let units: any[] = [];

  try {
    ann = db.prepare('SELECT * FROM announcements WHERE id = ?').get(annId);
    if (!ann) {
      notFound();
    }
    schedules = db.prepare('SELECT * FROM announcement_schedules WHERE announcement_id = ?').all(annId);
    details = db.prepare('SELECT * FROM announcement_details WHERE announcement_id = ? ORDER BY sort_order ASC, id ASC').all(annId);
    limits = db.prepare('SELECT * FROM announcement_limits WHERE announcement_id = ?').all(annId);
    complexes = db.prepare('SELECT * FROM complexes WHERE announcement_id = ?').all(annId);
    units = db.prepare('SELECT * FROM housing_units WHERE announcement_id = ?').all(annId);
  } catch (error) {
    console.error('DB fetch error in announcement detail:', error);
    notFound();
  }

  return (
    <div className={styles.container}>
      <article className={styles.card}>
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
          {ann.dtl_url && (
            <Link href={ann.dtl_url} target="_blank" rel="noopener noreferrer" className={styles.docBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              모집 공고 열기
            </Link>
          )}
        </div>

        <div className={styles.divider} />

        {/* 1. 신청 및 발표 일정 */}
        {schedules.length > 0 && (
          <section>
            <h2 className={styles.sectionTitle}>
              📅 신청 및 발표 일정
            </h2>
            <div className={styles.tableWrapper}>
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
          </section>
        )}

        {/* 2. 지원 조건 및 한도액 */}
        {limits.length > 0 && (
          <section>
            <h2 className={styles.sectionTitle}>
              💰 지원 조건 및 한도액
            </h2>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>신청 대상</th>
                    <th>최대 지원 한도액</th>
                    <th>임대보증금 비율</th>
                    <th>본인 부담</th>
                    <th>이자율(금리)</th>
                    <th>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {limits.map((lim) => (
                    <tr key={lim.id}>
                      <td><strong>{formatTargetGroup(lim.target_group)}</strong></td>
                      <td>{formatMoney(lim.max_support_amount)}</td>
                      <td>{lim.deposit_limit ? `${lim.deposit_limit}%` : '-'}</td>
                      <td>{lim.tenant_share ? `${lim.tenant_share}%` : '-'}</td>
                      <td>{lim.interest_rate ? `${lim.interest_rate}%` : '-'}</td>
                      <td>{lim.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 3. 소속 주택 단지 목록 요약 */}
        {complexes.length > 0 && (
          <section>
            <h2 className={styles.sectionTitle}>
              🏢 소속 주택 단지 목록
            </h2>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>주택 단지명</th>
                    <th>소재지 주소</th>
                    <th>공급 면적 범위</th>
                    <th>임대조건 범위</th>
                    <th>모집 규모</th>
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
                      totalSupply > 0 ? `${totalSupply}호` : '',
                      totalReserve > 0 ? `예비: ${totalReserve}호` : ''
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
          </section>
        )}

        {/* 4. 상세 세부 공고 정보 */}
        {details.length > 0 && (
          <section>
            <h2 className={styles.sectionTitle}>
              📝 세부 모집 조건 가이드
            </h2>
            {details.map((det) => {
              const lines = det.section_content ? det.section_content.split('\n') : [];
              const firstLine = lines[0] || '';
              const cleanTitle = superClean(det.section_title || '');
              const cleanFirstLine = superClean(firstLine);

              const finalContent = (cleanTitle === cleanFirstLine && cleanTitle !== '')
                ? lines.slice(1).join('\n')
                : det.section_content;

              return (
                <div key={det.id} className={styles.detailSection}>
                  <h3 className={styles.detailTitle}>{det.section_title}</h3>
                  <div className={styles.detailContent}>
                    <MarkdownViewer content={finalContent} />
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </article>
    </div>
  );
}
