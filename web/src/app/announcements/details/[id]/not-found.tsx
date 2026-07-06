import Link from 'next/link';
import styles from './detail.module.css';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${styles.notFound}`}>
        <h1>공고를 찾을 수 없습니다</h1>
        <p>존재하지 않거나 기한이 만료된 공고 정보입니다. URL을 다시 확인해 주시기 바랍니다.</p>
        <Link href="/" className={styles.docBtn}>
          메인 지도로 돌아가기
        </Link>
      </div>
    </div>
  );
}
