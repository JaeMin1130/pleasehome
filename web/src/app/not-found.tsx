import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>페이지를 찾을 수 없습니다</h1>
        <p>존재하지 않거나 삭제된 페이지입니다. URL을 다시 확인해 주세요.</p>
        <Link href="/" className={styles.homeBtn}>
          메인 지도로 돌아가기
        </Link>
      </div>
    </div>
  );
}
