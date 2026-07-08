import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { db } from '@/lib/db';
import { formatMoney, formatTargetGroup } from '@/utils/formatters';
import styles from './complex.module.css';

export const revalidate = 3600; // 1시간 주기로 점진적 정적 재생성(ISR) 활성화

export async function generateStaticParams() {
  const complexes = db.prepare('SELECT id FROM complexes').all() as { id: number }[];
  return complexes.map((c) => ({
    complexId: String(c.id),
  }));
}

interface PageProps {
  params: Promise<{ complexId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { complexId } = await params;
  const compId = parseInt(complexId, 10);
  if (isNaN(compId)) return { title: '주택 단지 상세 정보 | PleaseHome' };

  try {
    const complex = db.prepare('SELECT name, address FROM complexes WHERE id = ?').get(compId) as any;
    if (!complex) return { title: '단지를 찾을 수 없습니다 | PleaseHome' };
    return {
      title: `${complex.name} - 청약 단지 상세 정보 및 평형별 임대 조건 | PleaseHome`,
      description: `${complex.address}에 위치한 ${complex.name}의 세부 평형별 임대보증금, 월세 정보 및 과거 청약 히스토리 모음입니다.`,
    };
  } catch {
    return { title: '주택 단지 상세 정보 | PleaseHome' };
  }
}

export default async function ComplexDetailPage({ params }: PageProps) {
  const { complexId } = await params;
  const compId = parseInt(complexId, 10);

  if (isNaN(compId)) {
    notFound();
  }

  let complex: any = null;
  let ann: any = null;
  let units: any[] = [];
  let historyList: any[] = [];

  try {
    // 1. 단지 기본 정보 조회
    complex = db.prepare('SELECT * FROM complexes WHERE id = ?').get(compId);
    if (!complex) {
      notFound();
    }

    // 2. 소속 공고 정보 조회
    if (complex.announcement_id) {
      ann = db.prepare('SELECT * FROM announcements WHERE id = ?').get(complex.announcement_id);
    }

    // 3. 단지 소속 평형 목록 조회
    units = db.prepare('SELECT * FROM housing_units WHERE complex_id = ? ORDER BY exclusive_area ASC').all(compId);

    // 4. 동일 단지(이름 또는 주소 일치)의 다른 공고 히스토리 조회
    historyList = db.prepare(`
      SELECT c.id as complex_id, c.announcement_id, a.title, a.subscription_type, a.institution
      FROM complexes c
      JOIN announcements a ON c.announcement_id = a.id
      WHERE c.name = ? AND c.address = ? AND c.id != ?
      ORDER BY a.id DESC
    `).all(complex.name, complex.address, compId);

  } catch (error) {
    console.error('DB fetch error in complex detail:', error);
    notFound();
  }

  return (
    <div className={styles.layout}>
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7402127086926987"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleSection}>
          {ann && <span className={styles.badge}>{ann.subscription_type}</span>}
          <h1 className={styles.title}>{complex.name}</h1>
          <p className={styles.address}>📍 {complex.address}</p>
          
          <div className={styles.docBtnContainer}>
            <Link href={`/?complex_id=${complex.id}`} className={styles.docBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
                <line x1="9" y1="3" x2="9" y2="18"></line>
                <line x1="15" y1="6" x2="15" y2="21"></line>
              </svg>
              지도로 돌아가기
            </Link>
            {ann && (
              <Link href={`/announcements/details/${ann.id}`} className={styles.docBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                공고 상세 열기
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className={styles.mainLayout}>
        {/* 왼쪽: 세부 평형 목록 */}
        <section className={styles.contentSection}>
          <h2 className={styles.sectionTitle}>📐 세부 공급 평형 정보</h2>
          {units.length === 0 ? (
            <div className={styles.noData}>등록된 세부 평형 정보가 없습니다.</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>전용면적</th>
                    <th>공급대상</th>
                    <th>공급 / 예비</th>
                    <th>임대보증금</th>
                    <th>월임대료</th>
                    <th>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((unit) => {
                    const hasCount = (unit.supply_count && unit.supply_count > 0) || (unit.reserve_count && unit.reserve_count > 0);
                    const countText = [
                      unit.supply_count > 0 ? `${unit.supply_count}호` : '0호',
                      unit.reserve_count > 0 ? ` / ${unit.reserve_count}호` : '0호'
                    ].filter(Boolean).join(' ');

                    return (
                      <tr key={unit.id}>
                        <td>
                          <strong>{unit.exclusive_area ? `${unit.exclusive_area} ㎡` : '-'}</strong>
                        </td>
                        <td>{formatTargetGroup(unit.target_group)}</td>
                        <td>{hasCount ? countText : '-'}</td>
                        <td>{formatMoney(unit.deposit)}</td>
                        <td>{formatMoney(unit.monthly_rent)}</td>
                        <td>
                          {unit.supply_type || ''}
                          {unit.income_group ? ` [${unit.income_group}]` : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 아래쪽: 동일 단지 다른 공고 히스토리 */}
        <section className={styles.historySection}>
          <h2 className={styles.sectionTitle}>🕒 동일 단지 청약 히스토리</h2>
          {historyList.length === 0 ? (
            <div className={styles.noHistory}>
              이전에 발표된 동일 단지의 다른 공고 내역이 없습니다.
            </div>
          ) : (
            <div className={styles.historyList}>
              {historyList.map((hist, idx) => (
                <div key={idx} className={styles.historyCard}>
                  <div className={styles.historyMeta}>
                    <span className={styles.historyBadge}>{hist.subscription_type}</span>
                    <span className={styles.historyInstitution}>{hist.institution}</span>
                  </div>
                  <h3 className={styles.historyTitle}>{hist.title}</h3>
                  <Link href={`/complexes/${hist.complex_id}`} className={styles.historyLink}>
                    당시 임대 조건 확인하기 →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      </div>
    </div>
  );
}
