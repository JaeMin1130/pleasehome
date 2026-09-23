import styles from './CatRunLoader.module.css';

interface CatRunLoaderProps {
  label?: string;
}

// 이루가 달리는 스프라이트 로더 (6프레임, docs/design/skeleton.jpg 원본에서 추출)
export default function CatRunLoader({ label }: CatRunLoaderProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.sprite} role="img" aria-label="로딩 중" />
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}
